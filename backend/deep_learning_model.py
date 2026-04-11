"""
PulseIQ — Deep Learning Burnout Predictor (TensorFlow LSTM)
============================================================
Builds and trains a bidirectional LSTM neural network for sequential
burnout prediction using the daily feature time-series.

Architecture:
  - Input: sliding windows of daily features (window_size=14 days)
  - Layer 1: Bidirectional LSTM (64 units) — captures forward & backward temporal patterns
  - Layer 2: LSTM (32 units) — deeper temporal abstraction
  - Layer 3: Dense (16 units, ReLU) with Dropout (0.3)
  - Output: Dense (1 unit, sigmoid) — burnout probability [0, 1]

Training:
  - Loss: Binary crossentropy (burnout > 0.5 = positive class)
  - Optimizer: Adam with learning rate scheduling
  - Validation: 20% holdout with early stopping

Output: pulseiq_data/lstm_predictions.csv
  columns: employee_id, name, date, lstm_burnout_prob,
           lstm_confidence, lstm_risk_class
"""

import csv
import os
import warnings
from collections import defaultdict
from pathlib import Path

import numpy as np

DATA_DIR    = Path("pulseiq_data")
FEATURES_FILE = DATA_DIR / "daily_features.csv"
SCORES_FILE   = DATA_DIR / "daily_scores.csv"
OUTPUT_FILE   = DATA_DIR / "lstm_predictions.csv"
MODEL_DIR     = DATA_DIR / "models"

WINDOW_SIZE = 14  # Days of history per prediction
BATCH_SIZE  = 32
EPOCHS      = 50
BURNOUT_THRESHOLD = 0.5

# Features to feed into the LSTM
LSTM_FEATURES = [
    "slack_msgs_total", "slack_msgs_after_hours", "slack_msgs_weekend",
    "slack_msgs_work_channels", "slack_dms_sent",
    "slack_avg_sentiment", "slack_sentiment_volatility", "slack_avg_stress_score",
    "jira_events", "jira_distinct_tickets", "jira_tickets_closed",
    "jira_story_points_closed",
    "meetings_count", "meetings_total_minutes", "meetings_back_to_back",
    "largest_focus_gap_minutes",
    "after_hours_ratio", "social_msg_ratio",
    "git_commits_total", "git_lines_added", "git_lines_deleted",
    "git_lines_changed", "git_commits_after_hours", "git_commits_weekend",
    "zoom_meetings_count", "zoom_total_minutes",
    "zoom_speaking_seconds", "zoom_speaking_ratio",
]

# ---------------------------------------------------------------------------
# Data Preparation
# ---------------------------------------------------------------------------
def load_and_prepare_data():
    """Load features and scores, create windowed training data."""
    # Load features
    features_by_emp = defaultdict(list)
    with open(FEATURES_FILE) as f:
        for r in csv.DictReader(f):
            feat_vec = []
            for feat in LSTM_FEATURES:
                feat_vec.append(float(r.get(feat, 0) or 0))
            features_by_emp[r["employee_id"]].append({
                "features": feat_vec,
                "date": r["date"],
                "name": r["name"],
                "day_index": int(r["day_index"]),
            })

    # Load burnout scores as targets
    scores_by_emp = defaultdict(dict)
    with open(SCORES_FILE) as f:
        for r in csv.DictReader(f):
            bp = r.get("burnout_probability", "")
            if bp and bp != "None":
                scores_by_emp[r["employee_id"]][r["date"]] = float(bp)

    return features_by_emp, scores_by_emp

def create_windows(features_by_emp, scores_by_emp):
    """Create sliding window sequences for LSTM training."""
    X_windows = []
    y_targets = []
    metadata = []  # (employee_id, name, date)

    for eid, days in features_by_emp.items():
        # Sort by day_index
        days.sort(key=lambda d: d["day_index"])

        for i in range(WINDOW_SIZE, len(days)):
            window = [days[j]["features"] for j in range(i - WINDOW_SIZE, i)]
            target_date = days[i]["date"]

            # Get burnout score as target
            bp = scores_by_emp.get(eid, {}).get(target_date, None)
            if bp is None:
                continue

            X_windows.append(window)
            y_targets.append(1.0 if bp > BURNOUT_THRESHOLD else 0.0)
            metadata.append((eid, days[i]["name"], target_date, bp))

    return (
        np.array(X_windows, dtype=np.float32),
        np.array(y_targets, dtype=np.float32),
        metadata
    )

def normalize_features(X):
    """Per-feature standardization across the training set."""
    # Reshape to 2D for normalization
    n_samples, n_steps, n_features = X.shape
    X_flat = X.reshape(-1, n_features)

    means = np.mean(X_flat, axis=0)
    stds = np.std(X_flat, axis=0)
    stds[stds < 1e-6] = 1.0  # Prevent division by zero

    X_normalized = (X_flat - means) / stds
    return X_normalized.reshape(n_samples, n_steps, n_features), means, stds

# ---------------------------------------------------------------------------
# TensorFlow LSTM Model
# ---------------------------------------------------------------------------
def build_lstm_model(input_shape):
    """Build bidirectional LSTM model for burnout prediction."""
    import tensorflow as tf
    from tensorflow.keras import layers, models, callbacks

    model = models.Sequential([
        # Bidirectional LSTM captures both forward and backward temporal patterns
        layers.Bidirectional(
            layers.LSTM(64, return_sequences=True, dropout=0.2, recurrent_dropout=0.1),
            input_shape=input_shape
        ),

        # Second LSTM layer for deeper temporal abstraction
        layers.LSTM(32, dropout=0.2, recurrent_dropout=0.1),

        # Dense layers for final classification
        layers.Dense(16, activation="relu"),
        layers.Dropout(0.3),

        # Output: burnout probability
        layers.Dense(1, activation="sigmoid"),
    ])

    # Compile with Adam optimizer and binary crossentropy
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss="binary_crossentropy",
        metrics=["accuracy", tf.keras.metrics.AUC(name="auc")],
    )

    return model

def train_model(X_train, y_train, X_val, y_val):
    """Train the LSTM model with early stopping and learning rate reduction."""
    import tensorflow as tf
    from tensorflow.keras import callbacks

    model = build_lstm_model(input_shape=(X_train.shape[1], X_train.shape[2]))

    # Callbacks for training optimization
    early_stop = callbacks.EarlyStopping(
        monitor="val_auc",
        patience=10,
        mode="max",
        restore_best_weights=True,
        verbose=1,
    )

    lr_scheduler = callbacks.ReduceLROnPlateau(
        monitor="val_loss",
        factor=0.5,
        patience=5,
        min_lr=1e-6,
        verbose=1,
    )

    # Class weights to handle imbalanced burnout/no-burnout classes
    n_pos = np.sum(y_train)
    n_neg = len(y_train) - n_pos
    if n_pos > 0 and n_neg > 0:
        class_weight = {0: n_pos / len(y_train), 1: n_neg / len(y_train)}
    else:
        class_weight = None

    print(f"\n  Training LSTM on {len(X_train)} samples, validating on {len(X_val)}...")
    print(f"  Class distribution: {int(n_pos)} burnout / {int(n_neg)} normal")

    # Suppress TF progress bars for cleaner output
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=[early_stop, lr_scheduler],
        class_weight=class_weight,
        verbose=0,  # Silent training
    )

    # Print final metrics
    val_metrics = model.evaluate(X_val, y_val, verbose=0)
    metric_names = model.metrics_names
    print(f"\n  LSTM Final Validation Metrics:")
    for name, val in zip(metric_names, val_metrics):
        print(f"    {name}: {val:.4f}")

    return model, history

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("Loading data for LSTM deep learning model...")

    # Suppress TF warnings
    os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
    warnings.filterwarnings("ignore")

    # Check TensorFlow availability
    try:
        import tensorflow as tf
        tf.get_logger().setLevel("ERROR")
        print(f"  TensorFlow {tf.__version__} ✓")
    except ImportError:
        print("  [WARN] TensorFlow not installed — skipping LSTM model")
        print("  Install with: pip install tensorflow")
        # Write empty output so downstream doesn't crash
        with open(OUTPUT_FILE, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["employee_id", "name", "date", "lstm_burnout_prob",
                        "lstm_confidence", "lstm_risk_class"])
        return

    # Load and prepare data
    features_by_emp, scores_by_emp = load_and_prepare_data()
    print(f"  {len(features_by_emp)} employees, {len(LSTM_FEATURES)} features")

    X, y, metadata = create_windows(features_by_emp, scores_by_emp)
    if len(X) == 0:
        print("  [WARN] Not enough data to create training windows")
        return

    print(f"  Created {len(X)} windows of size {WINDOW_SIZE}")

    # Normalize features
    X_norm, feat_means, feat_stds = normalize_features(X)

    # Train/validation split (80/20, shuffled)
    indices = np.random.RandomState(42).permutation(len(X_norm))
    split = int(len(indices) * 0.8)
    train_idx, val_idx = indices[:split], indices[split:]

    X_train, y_train = X_norm[train_idx], y[train_idx]
    X_val, y_val = X_norm[val_idx], y[val_idx]

    # Build and train model
    model, history = train_model(X_train, y_train, X_val, y_val)

    # Predict on ALL data (not just validation)
    print("\n  Generating predictions for all employees...")
    predictions = model.predict(X_norm, verbose=0).flatten()

    # Build output
    output = []
    for i in range(len(predictions)):
        eid, name, date, actual_bp = metadata[i]
        prob = float(predictions[i])

        # Confidence: how far from 0.5 (decision boundary)
        confidence = abs(prob - 0.5) * 2  # 0 = uncertain, 1 = very confident

        # Risk class
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

    # Write output
    if output:
        fieldnames = list(output[0].keys())
        with open(OUTPUT_FILE, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames)
            w.writeheader()
            w.writerows(output)

    # Save the model
    MODEL_DIR.mkdir(exist_ok=True)
    model_path = MODEL_DIR / "lstm_burnout_model.keras"
    try:
        model.save(str(model_path))
        print(f"\n  Model saved → {model_path}")
    except Exception as e:
        print(f"\n  [WARN] Could not save model: {e}")

    # Save normalization parameters for inference
    norm_path = MODEL_DIR / "lstm_normalization.npz"
    np.savez(str(norm_path), means=feat_means, stds=feat_stds)

    print(f"\n  LSTM predictions complete:")
    print(f"    Output → {OUTPUT_FILE}")
    print(f"    {len(output)} predictions generated")

    # Summary statistics
    probs = [o["lstm_burnout_prob"] for o in output]
    high_risk = sum(1 for p in probs if p > 0.7)
    medium_risk = sum(1 for p in probs if 0.5 < p <= 0.7)
    print(f"    HIGH risk: {high_risk}, MEDIUM risk: {medium_risk}")


if __name__ == "__main__":
    main()
