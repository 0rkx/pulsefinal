"""
PulseIQ — Step 4: Behavioral Burnout Engine (V4.3: Final Integrated Logic)
========================================================================
Combines:
  1. Original sub-score math (Deep Work, Fragmentation, Connection)
  2. V4.2 fixes (Rest Deficit reset, Rolling Recovery Index)
  3. Smoothed Burnout Probability (3-day SMA) and stable forecasting.
"""

import csv
import math
import statistics
from collections import defaultdict
from pathlib import Path

DATA_DIR            = Path("pulseiq_data")
FEATURES_FILE       = DATA_DIR / "daily_features.csv"
BASELINES_FILE      = DATA_DIR / "baselines.csv"
OUTPUT_FILE         = DATA_DIR / "daily_scores.csv"

BASELINE_DAYS      = 14
CRITICAL_THRESHOLD = 0.85

# ---------------------------------------------------------------------------
# Math Helpers
# ---------------------------------------------------------------------------
def robust_z(value, median, std_robust):
    if std_robust < 1e-6:
        return 0.0 if abs(value - median) < 1e-6 else (3.0 if value > median else -3.0)
    return (value - median) / std_robust

def linear_slope(values):
    n = len(values)
    if n < 2: return 0.0
    xs = list(range(n))
    mean_x, mean_y = sum(xs)/n, sum(values)/n
    num = sum((xs[i]-mean_x) * (values[i]-mean_y) for i in range(n))
    den = sum((xs[i]-mean_x)**2 for i in range(n))
    return num / den if den > 1e-9 else 0.0

def clamp(v, lo=0.0, hi=100.0):
    return max(lo, min(hi, v))

# ---------------------------------------------------------------------------
# Sub-Score Logic (Restored from V4.0)
# ---------------------------------------------------------------------------
def compute_deep_work(day, baseline):
    if day.get("is_weekend"): return 0.0
    def ratio(feat):
        med = baseline.get(feat, {}).get("median", 0)
        return min(2.0, day.get(feat, 0) / max(1.0, med))
    raw = (0.35 * ratio("largest_focus_gap_minutes") +
           0.35 * ratio("jira_story_points_closed") +
           0.30 * ratio("git_lines_changed"))
    return clamp(raw * 50)

def compute_fragmentation(day, baseline):
    if day.get("is_weekend"): return 0.0
    def z(feat):
        b = baseline.get(feat, {})
        return max(0.0, robust_z(day.get(feat, 0), b.get("median", 0), b.get("std_robust", 1.0)))
    z_sum = (0.40 * z("meetings_count") +
             0.30 * z("slack_msgs_total") +
             0.30 * z("zoom_meetings_count"))
    return clamp(50 * (1 + math.tanh(z_sum / 2.0)))

def compute_connection(day, baseline):
    if day.get("is_weekend"): return 0.0
    sent_med    = baseline.get("slack_avg_sentiment",       {}).get("median", 0.7)
    sent_score  = clamp(1.0 + (day.get("slack_avg_sentiment", 0) - sent_med) * 4.0, 0, 2)
    dm_med      = baseline.get("slack_distinct_dm_partners", {}).get("median", 3)
    dm_ratio    = min(2.0, day.get("slack_distinct_dm_partners", 0) / max(1, dm_med))
    speak_med   = baseline.get("zoom_speaking_ratio",        {}).get("median", 0)
    speak_score = (min(2.0, day.get("zoom_speaking_ratio", 0) / max(0.01, speak_med))
                   if speak_med > 0.01 else 1.0)
    return clamp((0.45 * sent_score + 0.30 * dm_ratio + 0.25 * speak_score) * 50)

# ---------------------------------------------------------------------------
# Core Metrics Fixes (Restored from V4.2)
# ---------------------------------------------------------------------------
def update_metrics(day, baseline, state):
    work_act = (day.get("slack_msgs_work_channels", 0) + day.get("jira_events", 0) +
                day.get("git_commits_after_hours", 0)  + day.get("git_commits_weekend", 0))

    if work_act > 0:
        state["consecutive_work_days"] += 1
    else:
        state["consecutive_work_days"] = 0

    is_quiet_day = 1.0 if work_act == 0 else 0.0
    state["activity_history"].append(is_quiet_day)
    if len(state["activity_history"]) > 7: state["activity_history"].pop(0)
    recovery_index = (sum(state["activity_history"]) / len(state["activity_history"])) * 100
    return float(state["consecutive_work_days"]), recovery_index

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    features = []
    with open(FEATURES_FILE) as f:
        for r in csv.DictReader(f):
            for k in r:
                if k not in ("employee_id", "name", "team", "persona", "date"):
                    r[k] = float(r[k] or 0)
            features.append(r)

    baselines = defaultdict(dict)
    with open(BASELINES_FILE) as f:
        for r in csv.DictReader(f):
            baselines[r["employee_id"]][r["feature"]] = {k: float(v) for k,v in r.items() if k not in ("employee_id", "feature", "scope")}

    output = []
    by_emp = defaultdict(list)
    for r in features: by_emp[r["employee_id"]].append(r)

    for eid, days in by_emp.items():
        state = {"consecutive_work_days": 0, "activity_history": []}
        sma_window = []
        all_probs_hist = []

        for day in days:
            rest_def, rec_idx = update_metrics(day, baselines[eid], state)
            dw   = compute_deep_work(day, baselines[eid])
            frag = compute_fragmentation(day, baselines[eid])
            conn = compute_connection(day, baselines[eid])

            if day["day_index"] >= BASELINE_DAYS:
                # Weighted probability calculation with re-anchored coefficients for realistic baseline
                score = (frag * 0.04) + (rest_def * 0.4) - (rec_idx * 0.04)
                raw_prob = 1.0 / (1.0 + math.exp(-(score - 2.5) / 1.5))

                sma_window.append(raw_prob)
                if len(sma_window) > 3: sma_window.pop(0)
                smoothed_prob = sum(sma_window) / len(sma_window)
                all_probs_hist.append(smoothed_prob)

                slope = linear_slope(all_probs_hist[-14:]) if len(all_probs_hist) >= 5 else 0
                days_to_crit = (CRITICAL_THRESHOLD - smoothed_prob) / slope if slope > 0.001 else None
                # Clamp: ensure time-to-burnout is always greater than -2
                if days_to_crit is not None and days_to_crit < -1:
                    days_to_crit = -1
            else:
                smoothed_prob, days_to_crit = None, None
                all_probs_hist.append(0.0)

            output.append({
                "employee_id": eid, "name": day["name"], "date": day["date"],
                "day_index": day["day_index"], "recovery_debt": rec_idx,
                "rest_deficit": rest_def, "burnout_probability": smoothed_prob,
                "forecast_days_until_critical": days_to_crit,
                "deep_work_index": dw, "fragmentation_score": frag, "connection_index": conn,
                "driving_factors": "fragmentation" if frag > 70 else ""
            })

    with open(OUTPUT_FILE, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=output[0].keys())
        writer.writeheader()
        writer.writerows(output)
    print(f"Success: Analysis complete (V4.3 - Sub-scores Restored).")

if __name__ == "__main__":
    main()
