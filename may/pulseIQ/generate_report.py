"""
PulseIQ — Report Generator (V4.2: Terminal Fix)
==================================
Reads daily_scores.csv and writes pulseiq_summary.csv.
Ensures 'Fragmentation' is present for main.py to display.
"""
import pandas as pd
from datetime import timedelta
from pathlib import Path

DATA_DIR    = Path("pulseiq_data")
INPUT_FILE  = DATA_DIR / "daily_scores.csv"
OUTPUT_FILE = DATA_DIR / "pulseiq_summary.csv"

def main():
    if not INPUT_FILE.exists():
        print(f"[WARN] {INPUT_FILE} not found.")
        return

    df = pd.read_csv(INPUT_FILE)

    # Fill fragmentation_score with 0 if it's missing to avoid crashes
    if "fragmentation_score" not in df.columns:
        df["fragmentation_score"] = 0

    scored_df = df[df["burnout_probability"].notna()].copy()

    if scored_df.empty:
        print("[WARN] No post-baseline data found.")
        return

    # Get the latest state for each employee
    latest_df = scored_df.sort_values("day_index").groupby("employee_id").tail(1).copy()

    def calculate_crash_date(row):
        current_date = pd.to_datetime(row["date"])
        days_rem     = row["forecast_days_until_critical"]
        if row["burnout_probability"] >= 0.85:
            return current_date.strftime("%Y-%m-%d")
        if not pd.isna(days_rem) and days_rem > 0:
            return (current_date + timedelta(days=int(days_rem))).strftime("%Y-%m-%d")
        return "N/A"

    latest_df["forecasted_crash_date"] = latest_df.apply(calculate_crash_date, axis=1)

    # We include fragmentation_score specifically so main.py can parse it
    summary_df = latest_df[[
        "employee_id", "name", "fragmentation_score", "recovery_debt",
        "rest_deficit", "burnout_probability", "forecasted_crash_date"
    ]].copy()

    summary_df["burnout_probability"] = (summary_df["burnout_probability"] * 100).round(1).astype(str) + "%"

    # The columns MUST match what main.py expects for the terminal printout
    summary_df.columns = [
        "ID", "Employee Name", "Fragmentation", "Recovery Index",
        "Rest Deficit", "Burnout Risk", "Crash Date"
    ]

    summary_df.to_csv(OUTPUT_FILE, index=False)
    print(f"Success: V4.2 Summary Report generated → {OUTPUT_FILE}")

if __name__ == "__main__":
    main()