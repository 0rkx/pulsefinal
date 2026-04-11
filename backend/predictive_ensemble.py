"""
PulseIQ — Predictive Ensemble Module
======================================
Combines outputs from all PulseIQ models into a single, unified
burnout risk assessment using ensemble learning.

Models Combined:
  1. Behavioral Engine (compute_burnout.py) — sub-score based probability
  2. Time-Series Analysis — ARIMA forecasts + trend signals
  3. Anomaly Detection — Isolation Forest + pattern shifts
  4. LSTM Deep Learning — sequential neural network predictions

Ensemble Strategy:
  - Weighted average of model outputs (weights tuned by reliability)
  - Confidence-weighted: models with higher confidence get more weight
  - Disagreement detection: flags when models disagree significantly
  - Final risk tier: CRITICAL, HIGH, MEDIUM, LOW, MINIMAL

Output: pulseiq_data/ensemble_predictions.csv
"""

import csv
import math
from collections import defaultdict
from pathlib import Path

import numpy as np

DATA_DIR = Path("pulseiq_data")

# Input files from each model
BEHAVIORAL_FILE  = DATA_DIR / "daily_scores.csv"
TIMESERIES_FILE  = DATA_DIR / "timeseries_forecasts.csv"
ANOMALY_FILE     = DATA_DIR / "anomaly_scores.csv"
LSTM_FILE        = DATA_DIR / "lstm_predictions.csv"
OUTPUT_FILE      = DATA_DIR / "ensemble_predictions.csv"
NARRATIVES_FILE  = DATA_DIR / "pulseiq_narratives.csv"

# Model weights (tuned based on typical model reliability)
MODEL_WEIGHTS = {
    "behavioral":   0.35,   # Primary engine — very reliable
    "timeseries":   0.20,   # Good for trend detection
    "anomaly":      0.15,   # Good for catching hidden issues
    "lstm":         0.30,   # Strong sequential pattern recognition
}

# ---------------------------------------------------------------------------
# Data Loaders
# ---------------------------------------------------------------------------
def load_behavioral():
    """Load behavioral engine scores keyed by (employee_id, date)."""
    data = {}
    path = BEHAVIORAL_FILE
    if not path.exists():
        return data
    with open(path) as f:
        for r in csv.DictReader(f):
            bp = r.get("burnout_probability", "")
            if bp and bp != "None":
                key = (r["employee_id"], r["date"])
                data[key] = {
                    "burnout_prob": float(bp),
                    "deep_work": float(r.get("deep_work_index", 0) or 0),
                    "fragmentation": float(r.get("fragmentation_score", 0) or 0),
                    "connection": float(r.get("connection_index", 0) or 0),
                    "recovery_debt": float(r.get("recovery_debt", 0) or 0),
                    "drivers": r.get("driving_factors", ""),
                    "name": r.get("name", ""),
                }
    return data

def load_timeseries():
    """Load time-series forecasts keyed by (employee_id, date)."""
    data = {}
    path = TIMESERIES_FILE
    if not path.exists():
        return data
    with open(path) as f:
        for r in csv.DictReader(f):
            key = (r["employee_id"], r["date"])
            data[key] = {
                "ewma_trend": float(r.get("ewma_trend", 0) or 0),
                "changepoint": r.get("changepoint_detected", "False") == "True",
                "volatility": float(r.get("rolling_volatility", 0) or 0),
                "trend_direction": r.get("trend_direction", ""),
            }
    return data

def load_anomaly():
    """Load anomaly scores keyed by (employee_id, date)."""
    data = {}
    path = ANOMALY_FILE
    if not path.exists():
        return data
    with open(path) as f:
        for r in csv.DictReader(f):
            key = (r["employee_id"], r["date"])
            data[key] = {
                "isolation_score": float(r.get("isolation_score", 0) or 0),
                "is_anomaly": r.get("is_anomaly", "False") == "True",
                "z_score_max": float(r.get("z_score_max", 0) or 0),
                "pattern_shift": float(r.get("pattern_shift_score", 0) or 0),
                "anomaly_feature": r.get("anomaly_features", ""),
            }
    return data

def load_lstm():
    """Load LSTM predictions keyed by (employee_id, date)."""
    data = {}
    path = LSTM_FILE
    if not path.exists():
        return data
    with open(path) as f:
        for r in csv.DictReader(f):
            key = (r["employee_id"], r["date"])
            data[key] = {
                "lstm_prob": float(r.get("lstm_burnout_prob", 0) or 0),
                "lstm_confidence": float(r.get("lstm_confidence", 0) or 0),
                "lstm_risk_class": r.get("lstm_risk_class", ""),
            }
    return data

# ---------------------------------------------------------------------------
# Ensemble Logic
# ---------------------------------------------------------------------------
def compute_ensemble_score(behavioral, timeseries, anomaly, lstm):
    """
    Combine model outputs into a single burnout probability.

    Strategy:
      1. Each model contributes a probability estimate
      2. Weights are adjusted by model confidence and availability
      3. Anomaly detection acts as a multiplier (amplifies risk if anomalies detected)
    """
    scores = {}
    weights = {}

    # Behavioral engine score
    if behavioral:
        scores["behavioral"] = behavioral["burnout_prob"]
        weights["behavioral"] = MODEL_WEIGHTS["behavioral"]

    # Time-series EWMA trend (convert to 0-1 probability-like scale)
    if timeseries:
        ts_score = timeseries["ewma_trend"]
        # Boost if trend is rising
        if timeseries["trend_direction"] in ("rising", "rising_fast"):
            ts_score *= 1.2
        scores["timeseries"] = min(1.0, max(0.0, ts_score))
        weights["timeseries"] = MODEL_WEIGHTS["timeseries"]

    # LSTM prediction
    if lstm:
        scores["lstm"] = lstm["lstm_prob"]
        # Weight by confidence — uncertain predictions get less weight
        confidence_factor = 0.5 + 0.5 * lstm["lstm_confidence"]
        weights["lstm"] = MODEL_WEIGHTS["lstm"] * confidence_factor

    # Normalize weights
    total_weight = sum(weights.values())
    if total_weight == 0:
        return 0.0, 0.0, {}, "MINIMAL"

    for k in weights:
        weights[k] /= total_weight

    # Weighted average
    ensemble_prob = sum(scores[k] * weights[k] for k in scores)

    # Anomaly amplifier: if anomalies are detected, boost the risk signal
    if anomaly and anomaly["is_anomaly"]:
        # Amplification factor based on pattern shift severity
        amp = 1.0 + min(0.3, anomaly["pattern_shift"] * 0.1)
        ensemble_prob = min(1.0, ensemble_prob * amp)

    # Changepoint boost: recent changepoint means instability
    if timeseries and timeseries.get("changepoint"):
        ensemble_prob = min(1.0, ensemble_prob * 1.1)

    # Confidence: how much do the models agree?
    if len(scores) >= 2:
        vals = list(scores.values())
        disagreement = max(vals) - min(vals)
        confidence = 1.0 - disagreement
    else:
        confidence = 0.5

    # Risk tier
    if ensemble_prob > 0.75:
        risk_tier = "CRITICAL"
    elif ensemble_prob > 0.55:
        risk_tier = "HIGH"
    elif ensemble_prob > 0.35:
        risk_tier = "MEDIUM"
    elif ensemble_prob > 0.15:
        risk_tier = "LOW"
    else:
        risk_tier = "MINIMAL"

    return round(ensemble_prob, 4), round(confidence, 4), scores, risk_tier

# ---------------------------------------------------------------------------
# Narrative Generation
# ---------------------------------------------------------------------------
def generate_narrative(eid, behavioral, timeseries, anomaly, lstm, ensemble_prob, risk_tier):
    """Generate a human-readable narrative for each employee's risk assessment."""
    name = behavioral.get("name", eid) if behavioral else eid
    parts = []

    if risk_tier == "CRITICAL":
        parts.append(f"🔴 {name} is at CRITICAL burnout risk ({ensemble_prob:.0%}).")
    elif risk_tier == "HIGH":
        parts.append(f"🟠 {name} is at HIGH burnout risk ({ensemble_prob:.0%}).")
    elif risk_tier == "MEDIUM":
        parts.append(f"🟡 {name} shows MODERATE burnout signals ({ensemble_prob:.0%}).")
    else:
        parts.append(f"🟢 {name} is in a healthy range ({ensemble_prob:.0%}).")

    # Add behavioral insights
    if behavioral:
        if behavioral["fragmentation"] > 70:
            parts.append("High fragmentation from excessive meetings and interruptions.")
        if behavioral["connection"] < 30:
            parts.append("Social isolation detected — low collaboration signals.")
        if behavioral.get("drivers"):
            parts.append(f"Key drivers: {behavioral['drivers']}.")

    # Add time-series insights
    if timeseries:
        if timeseries["trend_direction"] in ("rising", "rising_fast"):
            parts.append("Burnout trajectory is RISING — early intervention recommended.")
        if timeseries["changepoint"]:
            parts.append("A behavioral change-point was recently detected.")
        if timeseries["volatility"] > 0.1:
            parts.append("High day-to-day burnout volatility indicates instability.")

    # Add anomaly insights
    if anomaly and anomaly["is_anomaly"]:
        feat = anomaly.get("anomaly_feature", "unknown")
        parts.append(f"Anomalous behavior detected (primary: {feat}).")

    # Add LSTM insights
    if lstm:
        if lstm["lstm_confidence"] > 0.7:
            parts.append(f"Deep learning model predicts {lstm['lstm_prob']:.0%} burnout risk (high confidence).")
        elif lstm["lstm_confidence"] < 0.3:
            parts.append("Neural network prediction is uncertain — more data may be needed.")

    return " ".join(parts)

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("Loading model outputs for ensemble combination...")

    behavioral = load_behavioral()
    timeseries = load_timeseries()
    anomaly    = load_anomaly()
    lstm       = load_lstm()

    print(f"  Behavioral: {len(behavioral):,} predictions")
    print(f"  Time-Series: {len(timeseries):,} forecasts")
    print(f"  Anomaly: {len(anomaly):,} scores")
    print(f"  LSTM: {len(lstm):,} predictions")

    # Get all unique (employee_id, date) keys
    all_keys = set()
    all_keys.update(behavioral.keys())
    all_keys.update(timeseries.keys())
    all_keys.update(anomaly.keys())
    all_keys.update(lstm.keys())

    output = []
    narratives = []
    emp_latest = {}  # Track latest prediction per employee for summary

    for key in sorted(all_keys):
        eid, date = key

        b = behavioral.get(key)
        t = timeseries.get(key)
        a = anomaly.get(key)
        l = lstm.get(key)

        ensemble_prob, confidence, model_scores, risk_tier = compute_ensemble_score(b, t, a, l)

        name = ""
        if b:
            name = b.get("name", "")
        elif l:
            name = l.get("name", "")

        row = {
            "employee_id":      eid,
            "name":             name,
            "date":             date,
            "ensemble_prob":    ensemble_prob,
            "confidence":       confidence,
            "risk_tier":        risk_tier,
            "behavioral_prob":  model_scores.get("behavioral", ""),
            "timeseries_prob":  model_scores.get("timeseries", ""),
            "lstm_prob":        model_scores.get("lstm", ""),
            "is_anomaly":       a["is_anomaly"] if a else False,
            "models_agree":     confidence > 0.6,
        }
        output.append(row)

        # Track latest per employee
        if eid not in emp_latest or date > emp_latest[eid]["date"]:
            emp_latest[eid] = row

    # Generate narratives for latest state of each employee
    for eid, latest in emp_latest.items():
        key = (eid, latest["date"])
        narrative = generate_narrative(
            eid,
            behavioral.get(key),
            timeseries.get(key),
            anomaly.get(key),
            lstm.get(key),
            latest["ensemble_prob"],
            latest["risk_tier"],
        )
        narratives.append({
            "employee_id": eid,
            "name": latest["name"],
            "ensemble_prob": latest["ensemble_prob"],
            "risk_tier": latest["risk_tier"],
            "narrative": narrative,
        })

    # Write ensemble predictions
    if output:
        fieldnames = list(output[0].keys())
        with open(OUTPUT_FILE, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames)
            w.writeheader()
            w.writerows(output)

    # Write narratives
    if narratives:
        with open(NARRATIVES_FILE, "w", newline="", encoding="utf-8") as f:
            fieldnames = list(narratives[0].keys())
            w = csv.DictWriter(f, fieldnames=fieldnames)
            w.writeheader()
            w.writerows(narratives)

    print(f"\n  Ensemble predictions complete:")
    print(f"    Predictions → {OUTPUT_FILE}")
    print(f"    Narratives  → {NARRATIVES_FILE}")
    print(f"    {len(output)} total predictions across {len(emp_latest)} employees")

    # Risk distribution summary
    risk_counts = defaultdict(int)
    for r in emp_latest.values():
        risk_counts[r["risk_tier"]] += 1

    print(f"\n  Latest Risk Distribution:")
    for tier in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "MINIMAL"]:
        count = risk_counts.get(tier, 0)
        bar = "█" * count
        print(f"    {tier:10s}  {count:3d}  {bar}")

    # Print top-risk employees
    critical = [(eid, r) for eid, r in emp_latest.items()
                if r["risk_tier"] in ("CRITICAL", "HIGH")]
    if critical:
        print(f"\n  ⚠️ Employees requiring immediate attention:")
        for eid, r in sorted(critical, key=lambda x: -x[1]["ensemble_prob"]):
            print(f"    {r['name']:20s}  {r['risk_tier']:10s}  "
                  f"ensemble={r['ensemble_prob']:.1%}  "
                  f"confidence={r['confidence']:.0%}")


if __name__ == "__main__":
    main()
