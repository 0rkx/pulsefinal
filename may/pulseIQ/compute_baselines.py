"""
PulseIQ — Step 2: Per-Person Baselines (V4.0: ML Upgrade)
==========================================================
Reads daily_features.csv and computes a "normal" profile for each employee
using their first 14 days of data.

Changes from V3.2:
  - Added new feature sets to baseline:
      Git:  git_commits_total, git_lines_added, git_lines_deleted,
            git_lines_changed, git_distinct_repos,
            git_commits_after_hours (ALL_DAYS), git_commits_weekend (ALL_DAYS)
      NLP:  slack_sentiment_volatility, slack_avg_stress_score
      Zoom: zoom_meetings_count, zoom_total_minutes, zoom_speaking_seconds,
            zoom_speaking_ratio, zoom_avg_participants
  - data_sufficiency check now also counts git activity
  - Everything else (median+MAD, chronotype, output format) unchanged

Output format identical to V3.2: baselines.csv (long) + baselines_meta.csv.
"""

import csv
import statistics
from collections import defaultdict
from pathlib import Path

DATA_DIR    = Path("pulseiq_data")
INPUT_FILE  = DATA_DIR / "daily_features.csv"
OUTPUT_FILE = DATA_DIR / "baselines.csv"

BASELINE_DAYS = 14

# ---------------------------------------------------------------------------
# Feature scope classification
# ---------------------------------------------------------------------------
WORKDAY_ONLY_FEATURES = {
    # Slack
    "slack_msgs_total", "slack_msgs_work_channels", "slack_msgs_social_channels",
    "slack_dms_sent", "slack_distinct_channels", "slack_distinct_dm_partners",
    "slack_avg_sentiment", "slack_sentiment_volatility", "slack_avg_stress_score",
    # Jira
    "jira_events", "jira_distinct_tickets", "jira_tickets_closed",
    "jira_story_points_closed", "jira_comments",
    # Calendar
    "meetings_count", "meetings_total_minutes", "meetings_attendees_total",
    "meetings_back_to_back", "largest_focus_gap_minutes",
    # Derived
    "after_hours_ratio", "social_msg_ratio",
    # Git (workday baseline only — after_hours/weekend variants tracked separately)
    "git_commits_total", "git_lines_added", "git_lines_deleted",
    "git_lines_changed", "git_distinct_repos",
    # Zoom
    "zoom_meetings_count", "zoom_total_minutes", "zoom_speaking_seconds",
    "zoom_speaking_ratio", "zoom_avg_participants",
}

# Measured across ALL days because the signal IS the deviation from off-hours norm
ALL_DAYS_FEATURES = {
    "slack_msgs_after_hours",
    "slack_msgs_weekend",
    "git_commits_after_hours",
    "git_commits_weekend",
}

ALL_FEATURES = sorted(WORKDAY_ONLY_FEATURES | ALL_DAYS_FEATURES)

# ---------------------------------------------------------------------------
# Stats helpers (unchanged)
# ---------------------------------------------------------------------------
def median_absolute_deviation(values, med):
    if not values:
        return 0.0
    return statistics.median([abs(v - med) for v in values])

def safe_quantile(values, q):
    if not values:
        return 0.0
    s   = sorted(values)
    if len(s) == 1:
        return s[0]
    pos = q * (len(s) - 1)
    lo  = int(pos)
    hi  = min(lo + 1, len(s) - 1)
    return s[lo] * (1 - (pos - lo)) + s[hi] * (pos - lo)

def compute_feature_baseline(values):
    if not values:
        return {"median": 0.0, "mad": 0.0, "std_robust": 0.0,
                "p25": 0.0, "p75": 0.0, "n_observations": 0}
    med = statistics.median(values)
    mad = median_absolute_deviation(values, med)
    return {
        "median":         round(med, 4),
        "mad":            round(mad, 4),
        "std_robust":     round(mad * 1.4826, 4),
        "p25":            round(safe_quantile(values, 0.25), 4),
        "p75":            round(safe_quantile(values, 0.75), 4),
        "n_observations": len(values),
    }

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print(f"Loading {INPUT_FILE}...")
    rows = list(csv.DictReader(open(INPUT_FILE)))
    print(f"  {len(rows):,} rows loaded")

    by_emp = defaultdict(list)
    for r in rows:
        by_emp[r["employee_id"]].append(r)
    for eid in by_emp:
        by_emp[eid].sort(key=lambda r: int(r["day_index"]))

    print(f"\nComputing baselines from first {BASELINE_DAYS} days per employee...")

    output_rows   = []
    employee_meta = {}

    for eid, emp_rows in by_emp.items():
        window = emp_rows[:BASELINE_DAYS]

        employee_meta[eid] = {
            "name":    window[0]["name"],
            "team":    window[0]["team"],
            "persona": window[0]["persona"],
        }

        # Chronotype: night owl if >15% baseline messages are after-hours
        msgs_total    = sum(int(r["slack_msgs_total"])       for r in window)
        msgs_aft_hrs  = sum(int(r["slack_msgs_after_hours"]) for r in window)
        aft_ratio     = msgs_aft_hrs / msgs_total if msgs_total else 0.0
        chronotype    = "night_owl" if aft_ratio > 0.15 else "standard"

        # Data sufficiency: how many baseline days had any activity
        active_days = sum(
            1 for r in window
            if (int(r["slack_msgs_total"]) > 0
                or int(r["jira_events"]) > 0
                or int(float(r.get("git_commits_total", 0))) > 0)
        )
        data_sufficiency = (
            "high"   if active_days >= 8 else
            "medium" if active_days >= 5 else
            "low"
        )

        employee_meta[eid].update({
            "chronotype":                  chronotype,
            "baseline_after_hours_ratio":  round(aft_ratio, 3),
            "active_days_in_baseline":     active_days,
            "data_sufficiency":            data_sufficiency,
        })

        # Per-feature baseline — skip features not present in the CSV
        available_cols = set(rows[0].keys()) if rows else set()

        for feat in ALL_FEATURES:
            if feat not in available_cols:
                # Feature column not yet in data (e.g. zoom not generated) —
                # write a zero baseline so downstream code doesn't KeyError
                output_rows.append({
                    "employee_id": eid, "feature": feat,
                    "scope": "workday_only" if feat in WORKDAY_ONLY_FEATURES else "all_days",
                    "median": 0.0, "mad": 0.0, "std_robust": 0.0,
                    "p25": 0.0, "p75": 0.0, "n_observations": 0,
                })
                continue

            if feat in WORKDAY_ONLY_FEATURES:
                vals = [float(r[feat]) for r in window if int(r["is_weekend"]) == 0]
            else:
                vals = [float(r[feat]) for r in window]

            stats = compute_feature_baseline(vals)
            output_rows.append({
                "employee_id": eid,
                "feature":     feat,
                "scope":       "workday_only" if feat in WORKDAY_ONLY_FEATURES else "all_days",
                **stats,
            })

    # Write baselines.csv (long format)
    fieldnames = [
        "employee_id", "feature", "scope",
        "median", "mad", "std_robust", "p25", "p75", "n_observations",
    ]
    with open(OUTPUT_FILE, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(output_rows)

    # Write baselines_meta.csv
    meta_path = DATA_DIR / "baselines_meta.csv"
    with open(meta_path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow([
            "employee_id", "name", "team", "persona",
            "chronotype", "baseline_after_hours_ratio",
            "active_days_in_baseline", "data_sufficiency",
        ])
        for eid, m in employee_meta.items():
            w.writerow([
                eid, m["name"], m["team"], m["persona"],
                m["chronotype"], m["baseline_after_hours_ratio"],
                m["active_days_in_baseline"], m["data_sufficiency"],
            ])

    print(f"\nWrote {len(output_rows):,} baseline rows → {OUTPUT_FILE}")
    print(f"  ({len(by_emp)} employees × {len(ALL_FEATURES)} features)")
    print(f"Wrote employee meta → {meta_path}")

    # Sanity print for planted personas
    print("\n--- Baselines for planted personas (key features only) ---")
    print(f"{'Persona':16s} {'Name':18s} {'AftHr%':>7s} {'Mtg/d':>6s} "
          f"{'StPts':>6s} {'Sent':>6s} {'GitCom':>7s} {'ZmMtgs':>7s} {'Chrono':>12s}")
    print("-" * 100)

    by_emp_feat = defaultdict(dict)
    for r in output_rows:
        by_emp_feat[r["employee_id"]][r["feature"]] = r

    for eid, m in employee_meta.items():
        if m["persona"] == "healthy":
            continue
        f    = by_emp_feat[eid]
        aft  = f.get("after_hours_ratio", {}).get("median", 0) * 100
        mtg  = f.get("meetings_count", {}).get("median", 0)
        sp   = f.get("jira_story_points_closed", {}).get("median", 0)
        sent = f.get("slack_avg_sentiment", {}).get("median", 0)
        gc   = f.get("git_commits_total", {}).get("median", 0)
        zm   = f.get("zoom_meetings_count", {}).get("median", 0)
        print(f"{m['persona']:16s} {m['name']:18s} {aft:>6.1f}% "
              f"{mtg:>6.1f} {sp:>6.1f} {sent:>6.2f} "
              f"{gc:>7.1f} {zm:>7.1f} {m['chronotype']:>12s}")

if __name__ == "__main__":
    main()