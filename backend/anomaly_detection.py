"""
PulseIQ — Anomaly Detection Module
====================================
Uses Isolation Forest and statistical methods to detect anomalous
behavioral patterns that may indicate hidden burnout, disengagement,
or sudden workload changes.

Techniques:
  - Isolation Forest (sklearn) for multivariate behavioral anomalies
  - Z-score based univariate anomaly detection per feature
  - Mahalanobis distance for correlated feature anomalies
  - Pattern-shift detection: sudden changes vs personal baseline

Output: pulseiq_data/anomaly_scores.csv
  columns: employee_id, date, isolation_score, is_anomaly,
           anomaly_features, z_score_max, mahalanobis_distance,
           pattern_shift_score
"""

import csv
import math
from collections import defaultdict
from pathlib import Path

import numpy as np

DATA_DIR    = Path("pulseiq_data")
INPUT_FILE  = DATA_DIR / "daily_features.csv"
OUTPUT_FILE = DATA_DIR / "anomaly_scores.csv"

# Features used for anomaly detection
ANOMALY_FEATURES = [
    "slack_msgs_total", "slack_msgs_after_hours", "slack_dms_sent",
    "slack_avg_sentiment", "slack_sentiment_volatility", "slack_avg_stress_score",
    "jira_events", "jira_tickets_closed", "jira_story_points_closed",
    "meetings_count", "meetings_total_minutes", "meetings_back_to_back",
    "largest_focus_gap_minutes",
    "git_commits_total", "git_lines_changed", "git_commits_after_hours",
    "zoom_meetings_count", "zoom_total_minutes", "zoom_speaking_ratio",
    "after_hours_ratio",
]

# ---------------------------------------------------------------------------
# Isolation Forest
# ---------------------------------------------------------------------------
def run_isolation_forest(feature_matrix, contamination=0.1):
    """
    Run Isolation Forest on the feature matrix.
    Returns anomaly scores (-1 for anomaly, 1 for normal) and decision scores.
    """
    try:
        from sklearn.ensemble import IsolationForest

        iso = IsolationForest(
            n_estimators=200,
            contamination=contamination,
            max_samples="auto",
            random_state=42,
            n_jobs=-1,
        )
        iso.fit(feature_matrix)
        predictions = iso.predict(feature_matrix)      # -1 = anomaly, 1 = normal
        scores = iso.decision_function(feature_matrix)  # Lower = more anomalous
        return predictions, scores
    except ImportError:
        print("  [WARN] scikit-learn not installed — skipping Isolation Forest")
        n = len(feature_matrix)
        return np.ones(n, dtype=int), np.zeros(n)

# ---------------------------------------------------------------------------
# Z-Score Anomaly Detection
# ---------------------------------------------------------------------------
def compute_zscore_anomalies(values_by_feature, threshold=2.5):
    """
    For each feature, compute z-scores across all observations.
    Returns the maximum absolute z-score per observation and which feature triggered it.
    """
    n = len(next(iter(values_by_feature.values())))
    max_zscores = [0.0] * n
    trigger_features = [""] * n

    for feat, values in values_by_feature.items():
        arr = np.array(values, dtype=float)
        mean = np.mean(arr)
        std = np.std(arr)
        if std < 1e-6:
            continue

        zscores = np.abs((arr - mean) / std)
        for i in range(n):
            if zscores[i] > max_zscores[i]:
                max_zscores[i] = float(zscores[i])
                trigger_features[i] = feat

    return max_zscores, trigger_features

# ---------------------------------------------------------------------------
# Mahalanobis Distance
# ---------------------------------------------------------------------------
def compute_mahalanobis(feature_matrix):
    """
    Compute Mahalanobis distance for each observation.
    Measures how far each point is from the multivariate mean,
    accounting for feature correlations.
    """
    try:
        mean = np.mean(feature_matrix, axis=0)
        # Covariance matrix with regularization to prevent singularity
        cov = np.cov(feature_matrix.T) + np.eye(feature_matrix.shape[1]) * 1e-6
        cov_inv = np.linalg.inv(cov)

        distances = []
        for row in feature_matrix:
            diff = row - mean
            d = float(np.sqrt(diff @ cov_inv @ diff))
            distances.append(round(d, 4))
        return distances
    except Exception:
        return [0.0] * len(feature_matrix)

# ---------------------------------------------------------------------------
# Pattern-Shift Detection (per-employee baseline comparison)
# ---------------------------------------------------------------------------
def compute_pattern_shift(emp_features, baseline_window=14):
    """
    Compare each day's feature vector to the employee's own baseline period.
    Higher scores indicate larger deviations from personal norm.
    """
    if len(emp_features) < baseline_window + 1:
        return [0.0] * len(emp_features)

    # Baseline: first N days
    baseline = np.array(emp_features[:baseline_window], dtype=float)
    baseline_mean = np.mean(baseline, axis=0)
    baseline_std = np.std(baseline, axis=0)
    baseline_std[baseline_std < 1e-6] = 1.0  # Prevent division by zero

    shifts = []
    for i, day_features in enumerate(emp_features):
        day_arr = np.array(day_features, dtype=float)
        # Normalized distance from personal baseline
        z_personal = np.abs((day_arr - baseline_mean) / baseline_std)
        shift_score = float(np.mean(z_personal))
        shifts.append(round(shift_score, 4))

    return shifts

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("Loading daily features for anomaly detection...")

    # Load data
    rows = []
    with open(INPUT_FILE) as f:
        for r in csv.DictReader(f):
            rows.append(r)

    print(f"  {len(rows):,} rows loaded")

    # Build feature matrix
    feature_matrix = []
    values_by_feature = defaultdict(list)
    row_meta = []  # (employee_id, date, name)

    for r in rows:
        feat_vec = []
        for feat in ANOMALY_FEATURES:
            val = float(r.get(feat, 0) or 0)
            feat_vec.append(val)
            values_by_feature[feat].append(val)
        feature_matrix.append(feat_vec)
        row_meta.append((r["employee_id"], r["date"], r["name"]))

    feature_matrix = np.array(feature_matrix, dtype=float)

    # Handle NaN/inf
    feature_matrix = np.nan_to_num(feature_matrix, nan=0.0, posinf=0.0, neginf=0.0)

    print("  Running Isolation Forest...")
    iso_predictions, iso_scores = run_isolation_forest(feature_matrix)

    print("  Computing Z-score anomalies...")
    max_zscores, z_trigger_features = compute_zscore_anomalies(values_by_feature)

    print("  Computing Mahalanobis distances...")
    mahal_distances = compute_mahalanobis(feature_matrix)

    # Pattern-shift per employee
    print("  Computing per-employee pattern shifts...")
    by_emp_idx = defaultdict(list)
    for i, (eid, date, name) in enumerate(row_meta):
        by_emp_idx[eid].append(i)

    pattern_shifts = [0.0] * len(rows)
    for eid, indices in by_emp_idx.items():
        emp_features = [feature_matrix[i].tolist() for i in indices]
        shifts = compute_pattern_shift(emp_features)
        for j, idx in enumerate(indices):
            pattern_shifts[idx] = shifts[j]

    # Build output
    output = []
    anomaly_count = 0
    for i in range(len(rows)):
        is_anomaly = iso_predictions[i] == -1
        if is_anomaly:
            anomaly_count += 1

        output.append({
            "employee_id":          row_meta[i][0],
            "name":                 row_meta[i][2],
            "date":                 row_meta[i][1],
            "isolation_score":      round(float(iso_scores[i]), 4),
            "is_anomaly":           is_anomaly,
            "anomaly_features":     z_trigger_features[i],
            "z_score_max":          round(max_zscores[i], 4),
            "mahalanobis_distance": mahal_distances[i],
            "pattern_shift_score":  pattern_shifts[i],
        })

    # Write output
    if output:
        fieldnames = list(output[0].keys())
        with open(OUTPUT_FILE, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames)
            w.writeheader()
            w.writerows(output)

    print(f"\n  Anomaly detection complete:")
    print(f"    Output → {OUTPUT_FILE}")
    print(f"    Total observations: {len(rows):,}")
    print(f"    Anomalies detected: {anomaly_count} ({anomaly_count/len(rows)*100:.1f}%)")

    # Top anomalous employees
    emp_anomaly_counts = defaultdict(int)
    emp_names = {}
    for o in output:
        if o["is_anomaly"]:
            emp_anomaly_counts[o["employee_id"]] += 1
            emp_names[o["employee_id"]] = o["name"]

    if emp_anomaly_counts:
        print(f"\n  Top 5 most anomalous employees:")
        for eid, count in sorted(emp_anomaly_counts.items(), key=lambda x: -x[1])[:5]:
            print(f"    {emp_names[eid]:20s}  {count} anomalous days")


if __name__ == "__main__":
    main()
