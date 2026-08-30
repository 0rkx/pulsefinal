"""
PulseIQ — Federated Learning Orchestration (Flower + TensorFlow)
================================================================
Implements Federated Learning using Flower (flwr) for the TensorFlow
Bidirectional LSTM Burnout Predictor across multiple partitioned clients.

Key Responsibilities:
  1. Partition 30 synthetic employees into 3 disjoint client clusters.
  2. Maintain consistent feature normalization across all clients.
  3. Provide Flower NumPyClient implementation (local training & evaluation).
  4. Coordinate federated rounds using Federated Averaging (FedAvg).
  5. Save live training status & round-by-round metrics to JSON for UI inspection.
  6. Return aggregated global model weights to update the production global model.
"""

import json
import os
import time
import warnings
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import numpy as np

# Suppress TF & Flower noise
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
warnings.filterwarnings("ignore")

import flwr as fl
from flwr.common import (
    ndarrays_to_parameters,
    parameters_to_ndarrays,
)
from flwr.server.strategy import FedAvg

DATA_DIR = Path("pulseiq_data")
HISTORY_FILE = DATA_DIR / "federated_training_history.json"


def save_training_history(history_data: Dict):
    """Write federated training history atomically to JSON file."""
    DATA_DIR.mkdir(exist_ok=True)
    history_data["updated_at"] = datetime.utcnow().isoformat()
    try:
        temp_file = DATA_DIR / "federated_training_history.tmp"
        with open(temp_file, "w") as f:
            json.dump(history_data, f, indent=2)
        os.replace(temp_file, HISTORY_FILE)
    except Exception as e:
        print(f"  [WARN] Failed to write federated history: {e}")


def load_training_history() -> Optional[Dict]:
    """Read latest federated training history from JSON file."""
    if not HISTORY_FILE.exists():
        return None
    try:
        with open(HISTORY_FILE) as f:
            return json.load(f)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Client Partitioning & Data Preparation
# ---------------------------------------------------------------------------
def partition_employees(
    features_by_emp: Dict,
    scores_by_emp: Dict,
    num_clients: int = 3,
    window_size: int = 14,
    burnout_threshold: float = 0.5,
    val_ratio: float = 0.2,
    feat_means: np.ndarray = None,
    feat_stds: np.ndarray = None,
) -> Tuple[List[Dict], List[Tuple]]:
    """
    Partition employees into disjoint clients.
    Each client creates its own sliding windows from only its assigned employees.
    Applies consistent normalization across all clients.
    """
    sorted_eids = sorted(features_by_emp.keys())
    
    # Split employee IDs into num_clients disjoint partitions
    partitions = np.array_split(sorted_eids, num_clients)
    
    client_datasets = []
    all_metadata = []

    client_names = [
        "Client 1 (Platform & Core)",
        "Client 2 (Engineering Group A)",
        "Client 3 (Engineering Group B)"
    ]

    for client_idx, emp_ids in enumerate(partitions):
        emp_id_list = list(emp_ids)
        client_features_by_emp = {eid: features_by_emp[eid] for eid in emp_id_list}
        
        X_client = []
        y_client = []
        meta_client = []

        for eid in emp_id_list:
            days = client_features_by_emp[eid]
            days.sort(key=lambda d: d["day_index"])

            for i in range(window_size, len(days)):
                window = [days[j]["features"] for j in range(i - window_size, i)]
                target_date = days[i]["date"]

                bp = scores_by_emp.get(eid, {}).get(target_date, None)
                if bp is None:
                    continue

                X_client.append(window)
                y_client.append(1.0 if bp > burnout_threshold else 0.0)
                meta_client.append((eid, days[i]["name"], target_date, bp))

        X_arr = np.array(X_client, dtype=np.float32)
        y_arr = np.array(y_client, dtype=np.float32)

        # Consistent normalization using global parameters
        if len(X_arr) > 0 and feat_means is not None and feat_stds is not None:
            n_samples, n_steps, n_features = X_arr.shape
            X_flat = X_arr.reshape(-1, n_features)
            X_norm = (X_flat - feat_means) / feat_stds
            X_arr = X_norm.reshape(n_samples, n_steps, n_features)

        # Local train/val split per client
        if len(X_arr) > 0:
            indices = np.random.RandomState(42 + client_idx).permutation(len(X_arr))
            split = int(len(indices) * (1.0 - val_ratio))
            train_idx, val_idx = indices[:split], indices[split:]
            X_train, y_train = X_arr[train_idx], y_arr[train_idx]
            X_val, y_val = X_arr[val_idx], y_arr[val_idx]
        else:
            X_train, y_train = np.empty((0, window_size, len(feat_means))), np.empty((0,))
            X_val, y_val = np.empty((0, window_size, len(feat_means))), np.empty((0,))

        client_datasets.append({
            "client_id": f"Client_{client_idx}",
            "name": client_names[client_idx] if client_idx < len(client_names) else f"Client {client_idx + 1}",
            "client_idx": client_idx,
            "employees": emp_id_list,
            "num_employees": len(emp_id_list),
            "X_train": X_train,
            "y_train": y_train,
            "X_val": X_val,
            "y_val": y_val,
            "num_train_samples": len(X_train),
            "num_val_samples": len(X_val),
            "total_samples": len(X_arr),
        })
        all_metadata.extend(meta_client)

    return client_datasets, all_metadata


# ---------------------------------------------------------------------------
# Flower Client Definition
# ---------------------------------------------------------------------------
class PulseIQFlowerClient(fl.client.NumPyClient):
    """Flower NumPyClient for local BiLSTM training and evaluation."""

    def __init__(
        self,
        client_id: str,
        name: str,
        model,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
        local_epochs: int = 3,
        batch_size: int = 32,
    ):
        self.client_id = client_id
        self.name = name
        self.model = model
        self.X_train = X_train
        self.y_train = y_train
        self.X_val = X_val
        self.y_val = y_val
        self.local_epochs = local_epochs
        self.batch_size = batch_size

    def get_parameters(self, config=None):
        return self.model.get_weights()

    def fit(self, parameters, config=None):
        # Update local model weights with aggregated global parameters
        self.model.set_weights(parameters)

        # Handle class imbalance in local partition
        n_pos = np.sum(self.y_train)
        n_neg = len(self.y_train) - n_pos
        if n_pos > 0 and n_neg > 0:
            class_weight = {0: float(n_pos / len(self.y_train)), 1: float(n_neg / len(self.y_train))}
        else:
            class_weight = None

        # Train locally
        history = self.model.fit(
            self.X_train,
            self.y_train,
            epochs=self.local_epochs,
            batch_size=self.batch_size,
            class_weight=class_weight,
            verbose=0,
        )

        loss = float(history.history.get("loss", [0.0])[-1])
        acc = float(history.history.get("accuracy", [0.0])[-1])
        auc = float(history.history.get("auc", [0.0])[-1])

        return (
            self.model.get_weights(),
            len(self.X_train),
            {"loss": loss, "accuracy": acc, "auc": auc, "client_id": self.client_id, "name": self.name},
        )

    def evaluate(self, parameters, config=None):
        self.model.set_weights(parameters)
        if len(self.X_val) == 0:
            return 0.0, 0, {"accuracy": 0.0, "auc": 0.0}

        metrics = self.model.evaluate(self.X_val, self.y_val, verbose=0)
        loss = float(metrics[0])
        acc = float(metrics[1]) if len(metrics) > 1 else 0.0
        auc = float(metrics[2]) if len(metrics) > 2 else 0.0

        return loss, len(self.X_val), {"accuracy": acc, "auc": auc, "client_id": self.client_id, "name": self.name}


# ---------------------------------------------------------------------------
# Custom Metric Aggregators
# ---------------------------------------------------------------------------
def weighted_average_fit_metrics(metrics: List[Tuple[int, Dict]]) -> Dict:
    total_examples = sum(num_examples for num_examples, _ in metrics)
    if total_examples == 0:
        return {}
    
    accuracies = [num_examples * m.get("accuracy", 0.0) for num_examples, m in metrics]
    losses = [num_examples * m.get("loss", 0.0) for num_examples, m in metrics]
    aucs = [num_examples * m.get("auc", 0.0) for num_examples, m in metrics]
    
    return {
        "accuracy": sum(accuracies) / total_examples,
        "loss": sum(losses) / total_examples,
        "auc": sum(aucs) / total_examples,
    }


def weighted_average_eval_metrics(metrics: List[Tuple[int, Dict]]) -> Dict:
    total_examples = sum(num_examples for num_examples, _ in metrics)
    if total_examples == 0:
        return {}
    
    accuracies = [num_examples * m.get("accuracy", 0.0) for num_examples, m in metrics]
    aucs = [num_examples * m.get("auc", 0.0) for num_examples, m in metrics]
    
    return {
        "accuracy": sum(accuracies) / total_examples,
        "auc": sum(aucs) / total_examples,
    }


# ---------------------------------------------------------------------------
# Federated Learning Orchestration Loop (Flower FedAvg)
# ---------------------------------------------------------------------------
def train_federated(
    model_builder_fn,
    client_datasets: List[Dict],
    input_shape: Tuple[int, int],
    num_rounds: int = 5,
    local_epochs: int = 3,
    batch_size: int = 32,
    verbose: bool = True,
):
    """
    Executes Federated Learning using Flower's FedAvg aggregation strategy.
    Tracks state and writes live round-by-round metrics to federated_training_history.json.
    """
    num_clients = len(client_datasets)
    
    # Initialize history structure
    history_state = {
        "status": "training",
        "current_round": 0,
        "total_rounds": num_rounds,
        "current_stage": "initializing",
        "local_epochs": local_epochs,
        "batch_size": batch_size,
        "num_clients": num_clients,
        "clients": [
            {
                "client_id": c["client_id"],
                "name": c["name"],
                "employees": c["employees"],
                "num_employees": c["num_employees"],
                "train_samples": c["num_train_samples"],
                "val_samples": c["num_val_samples"],
            }
            for c in client_datasets
        ],
        "rounds": [],
        "global_model": {
            "architecture": "Bidirectional LSTM (64) → LSTM (32) → Dense (16) → Dropout (0.3) → Dense (1, Sigmoid)",
            "input_shape": list(input_shape),
            "aggregation_strategy": "FedAvg (Sample-Weighted Parameter Averaging)",
            "model_path": "pulseiq_data/models/lstm_burnout_model.keras",
        },
    }
    save_training_history(history_state)

    if verbose:
        print(f"\n  [Flower FL] Initializing Federated Learning with {num_clients} clients...")
        for c in client_datasets:
            print(f"    - {c['name']} ({c['client_id']}): {c['num_employees']} employees, "
                  f"{c['num_train_samples']} train samples, {c['num_val_samples']} val samples")

    # Instantiate the initial global model and extract starting weights
    global_model = model_builder_fn(input_shape=input_shape)
    global_weights = global_model.get_weights()
    total_params = int(global_model.count_params())
    history_state["global_model"]["total_parameters"] = total_params

    # Create Flower clients
    clients = []
    for c in client_datasets:
        local_model = model_builder_fn(input_shape=input_shape)
        client = PulseIQFlowerClient(
            client_id=c["client_id"],
            name=c["name"],
            model=local_model,
            X_train=c["X_train"],
            y_train=c["y_train"],
            X_val=c["X_val"],
            y_val=c["y_val"],
            local_epochs=local_epochs,
            batch_size=batch_size,
        )
        clients.append(client)

    initial_parameters = ndarrays_to_parameters(global_weights)
    strategy = FedAvg(
        fraction_fit=1.0,
        fraction_evaluate=1.0,
        min_fit_clients=num_clients,
        min_evaluate_clients=num_clients,
        min_available_clients=num_clients,
        initial_parameters=initial_parameters,
        fit_metrics_aggregation_fn=weighted_average_fit_metrics,
        evaluate_metrics_aggregation_fn=weighted_average_eval_metrics,
    )

    current_weights = global_weights
    
    if verbose:
        print(f"\n  [Flower FL] Starting Federated Training: {num_rounds} rounds, {local_epochs} local epochs/round")
        print(f"  {'Round':<8} | {'Avg Train Loss':<16} | {'Avg Train Acc':<14} | {'Avg Val AUC':<12} | {'Participating':<14}")
        print(f"  {'-'*72}")

    for round_num in range(1, num_rounds + 1):
        # Update state: starting local training
        history_state["current_round"] = round_num
        history_state["current_stage"] = "local_training"
        save_training_history(history_state)

        fit_results = []
        eval_results = []

        # 1. Local Training on each client
        for client in clients:
            weights_prime, num_examples, fit_metrics = client.fit(current_weights)
            fit_results.append((weights_prime, num_examples, fit_metrics))

        # Update state: FedAvg aggregation
        history_state["current_stage"] = "fedavg_aggregation"
        save_training_history(history_state)

        # 2. FedAvg Aggregation
        total_train_examples = sum(n for _, n, _ in fit_results)
        if total_train_examples > 0:
            new_weights = [
                np.zeros_like(w, dtype=np.float32) for w in current_weights
            ]
            for weights_k, n_k, _ in fit_results:
                weight_factor = n_k / total_train_examples
                for layer_idx, layer_weights in enumerate(weights_k):
                    new_weights[layer_idx] += layer_weights * weight_factor
            current_weights = new_weights

        # Update state: evaluation
        history_state["current_stage"] = "evaluating"
        save_training_history(history_state)

        # 3. Local Evaluation on each client with new global weights
        for client in clients:
            loss, num_val, eval_metrics = client.evaluate(current_weights)
            eval_results.append((loss, num_val, eval_metrics))

        # 4. Metrics Reporting
        avg_train_loss = float(np.mean([m["loss"] for _, _, m in fit_results]))
        avg_train_acc = float(np.mean([m["accuracy"] for _, _, m in fit_results]))
        avg_val_auc = float(np.mean([m["auc"] for _, _, m in eval_results if "auc" in m]))

        # Collect per-client metrics for this round
        client_metrics_dict = {}
        for (w_p, n_tr, f_m), (l_val, n_val, e_m) in zip(fit_results, eval_results):
            cid = f_m["client_id"]
            client_metrics_dict[cid] = {
                "client_id": cid,
                "name": f_m.get("name", cid),
                "train_loss": round(float(f_m.get("loss", 0.0)), 4),
                "train_accuracy": round(float(f_m.get("accuracy", 0.0)), 4),
                "val_auc": round(float(e_m.get("auc", 0.0)), 4),
                "val_loss": round(float(l_val), 4),
                "train_samples": n_tr,
                "val_samples": n_val,
            }

        round_record = {
            "round": round_num,
            "train_loss": round(avg_train_loss, 4),
            "train_accuracy": round(avg_train_acc, 4),
            "val_auc": round(avg_val_auc, 4),
            "participating_clients": len(fit_results),
            "total_clients": num_clients,
            "client_metrics": client_metrics_dict,
        }
        history_state["rounds"].append(round_record)
        save_training_history(history_state)

        if verbose:
            print(f"  Round {round_num:<2} | {avg_train_loss:<16.4f} | {avg_train_acc:<14.4f} | {avg_val_auc:<12.4f} | {len(fit_results)}/{num_clients} clients")

    # Set final aggregated weights onto global model
    global_model.set_weights(current_weights)
    history_state["status"] = "completed"
    history_state["current_stage"] = "completed"
    history_state["global_model"]["final_val_auc"] = round(avg_val_auc, 4)
    history_state["global_model"]["final_train_loss"] = round(avg_train_loss, 4)
    history_state["global_model"]["final_train_accuracy"] = round(avg_train_acc, 4)
    save_training_history(history_state)

    if verbose:
        print(f"\n  [Flower FL] Federated aggregation complete across {num_rounds} rounds.")
        print(f"  [Flower FL] Global model updated with final aggregated weights ✓")

    return global_model


def run_full_federated_pipeline():
    """Entrypoint to execute the complete federated training pipeline and update predictions."""
    from deep_learning_model import (
        build_lstm_model,
        load_and_prepare_data,
        create_windows,
        normalize_features,
        WINDOW_SIZE,
        BATCH_SIZE,
        LSTM_FEATURES,
        OUTPUT_FILE,
        MODEL_DIR,
    )
    import csv

    features_by_emp, scores_by_emp = load_and_prepare_data()
    X_all, y_all, metadata = create_windows(features_by_emp, scores_by_emp)
    if len(X_all) == 0:
        return {"status": "failed", "error": "No features/scores found"}

    _, feat_means, feat_stds = normalize_features(X_all)

    client_datasets, _ = partition_employees(
        features_by_emp=features_by_emp,
        scores_by_emp=scores_by_emp,
        num_clients=3,
        window_size=WINDOW_SIZE,
        feat_means=feat_means,
        feat_stds=feat_stds,
    )

    model = train_federated(
        model_builder_fn=build_lstm_model,
        client_datasets=client_datasets,
        input_shape=(WINDOW_SIZE, len(LSTM_FEATURES)),
        num_rounds=5,
        local_epochs=3,
        batch_size=BATCH_SIZE,
        verbose=True,
    )

    # Predict across all 30 employees
    n_samples, n_steps, n_features = X_all.shape
    X_flat = X_all.reshape(-1, n_features)
    X_all_norm = ((X_flat - feat_means) / feat_stds).reshape(n_samples, n_steps, n_features)
    predictions = model.predict(X_all_norm, verbose=0).flatten()

    output = []
    for i in range(len(predictions)):
        eid, name, date, actual_bp = metadata[i]
        prob = float(predictions[i])
        confidence = abs(prob - 0.5) * 2
        if prob > 0.7:
            risk_class = "HIGH"
        elif prob > 0.5:
            risk_class = "MEDIUM"
        elif prob > 0.3:
            risk_class = "LOW"
        else:
            risk_class = "MINIMAL"

        output.append({
            "employee_id":      eid,
            "name":             name,
            "date":             date,
            "lstm_burnout_prob": round(prob, 4),
            "lstm_confidence":  round(confidence, 4),
            "lstm_risk_class":  risk_class,
            "actual_burnout":   round(actual_bp, 4),
        })

    if output:
        fieldnames = list(output[0].keys())
        with open(OUTPUT_FILE, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames)
            w.writeheader()
            w.writerows(output)

    MODEL_DIR.mkdir(exist_ok=True)
    model.save(str(MODEL_DIR / "lstm_burnout_model.keras"))
    np.savez(str(MODEL_DIR / "lstm_normalization.npz"), means=feat_means, stds=feat_stds)

    return {"status": "completed", "predictions_count": len(output)}
