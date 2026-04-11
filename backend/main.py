"""
PulseIQ — Pipeline Orchestrator (V5.0: Full ML Suite)
======================================================
Runs the full PulseIQ pipeline end-to-end in the correct order.

Usage:
  python main.py                  # full run (generate fresh data)
  python main.py --skip-generate  # skip data gen, use existing CSVs
  python main.py --skip-features  # skip feature aggregation
  python main.py --skip-ml        # skip advanced ML (LSTM, anomaly, etc.)
  python main.py --help

Steps:
  1. generate_data.py         — synthetic raw CSVs (Slack, Jira, Calendar, Git, Zoom)
  2. aggregate_features.py    — daily feature matrix (RoBERTa NLP + Git + Zoom)
  3. compute_baselines.py     — per-person median/MAD baselines
  4. compute_burnout.py       — behavioral burnout probability + sub-scores
  5. recommendations.py       — per-day action recommendations
  6. manager_insights.py      — manager dashboard + employee view
  7. time_series_analysis.py  — ARIMA forecasting + trend decomposition
  8. anomaly_detection.py     — Isolation Forest + pattern shift detection
  9. deep_learning_model.py   — TensorFlow LSTM sequential prediction
  10. predictive_ensemble.py  — ensemble combiner + narrative generation
  11. generate_report.py      — final summary CSV

Each step prints its own output. This script adds timing, error handling,
and a final summary table so you can see the whole run at a glance.
"""

import argparse
import importlib
import sys
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Step registry
# ---------------------------------------------------------------------------
STEPS = [
    {
        "id":       "generate",
        "label":    "Generate synthetic data (Slack, Jira, Calendar, Git, Zoom)",
        "module":   "generate_data",
        "output":   "pulseiq_data/slack_messages.csv",
        "skip_flag": "skip_generate",
    },
    {
        "id":       "features",
        "label":    "Aggregate daily features (RoBERTa NLP + Git + Zoom)",
        "module":   "aggregate_features",
        "output":   "pulseiq_data/daily_features.csv",
        "skip_flag": "skip_features",
    },
    {
        "id":       "baselines",
        "label":    "Compute per-person baselines (median + MAD)",
        "module":   "compute_baselines",
        "output":   "pulseiq_data/baselines.csv",
        "skip_flag": None,
    },
    {
        "id":       "burnout",
        "label":    "Behavioral burnout engine (V4.3 sub-scores + SMA)",
        "module":   "compute_burnout",
        "output":   "pulseiq_data/daily_scores.csv",
        "skip_flag": None,
    },
    {
        "id":       "recommendations",
        "label":    "Generate per-day recommendations (9 categories)",
        "module":   "recommendations",
        "output":   "pulseiq_data/recommendations.csv",
        "skip_flag": None,
    },
    {
        "id":       "manager",
        "label":    "Generate manager insights + employee view",
        "module":   "manager_insights",
        "output":   "pulseiq_data/manager_dashboard.csv",
        "skip_flag": None,
    },
    {
        "id":       "ml_parallel",
        "label":    "Batch Parallel Model Training (TimeSeries, Anomaly, PyTorch LSTM)",
        "module":   "run_ml_parallel",
        "output":   "pulseiq_data/lstm_predictions.csv",
        "skip_flag": "skip_ml",
    },
    {
        "id":       "ensemble",
        "label":    "Predictive ensemble (weighted model combination)",
        "module":   "predictive_ensemble",
        "output":   "pulseiq_data/ensemble_predictions.csv",
        "skip_flag": "skip_ml",
    },
    {
        "id":       "report",
        "label":    "Generate summary report (crash-date forecasts)",
        "module":   "generate_report",
        "output":   "pulseiq_data/pulseiq_summary.csv",
        "skip_flag": None,
    },
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
BOLD  = "\033[1m"
GREEN = "\033[32m"
RED   = "\033[31m"
YELLOW= "\033[33m"
CYAN  = "\033[36m"
RESET = "\033[0m"

def _hr(char="─", width=70):
    print(char * width)

def _header(text):
    _hr()
    print(f"{BOLD}{CYAN}{text}{RESET}")
    _hr()

def _ok(label, elapsed):
    print(f"  {GREEN}✓{RESET}  {label:<50s}  {elapsed:5.1f}s")

def _skip(label):
    print(f"  {YELLOW}↩{RESET}  {label:<50s}  skipped")

def _fail(label, err):
    print(f"  {RED}✗{RESET}  {label:<50s}  FAILED")
    print(f"      {RED}{err}{RESET}")

def _file_size(path):
    p = Path(path)
    if not p.exists():
        return "—"
    b = p.stat().st_size
    if b >= 1_000_000:
        return f"{b/1_000_000:.1f} MB"
    if b >= 1_000:
        return f"{b/1_000:.0f} KB"
    return f"{b} B"

def run_step(module_name):
    """Import the module and call its main() function."""
    mod = importlib.import_module(module_name)
    importlib.reload(mod)   # ensure fresh state if run multiple times
    mod.main()

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="PulseIQ — end-to-end burnout detection pipeline (V5.0)"
    )
    parser.add_argument(
        "--skip-generate",  action="store_true",
        help="Skip data generation (use existing CSVs in pulseiq_data/)"
    )
    parser.add_argument(
        "--skip-features",  action="store_true",
        help="Skip feature aggregation (use existing daily_features.csv)"
    )
    parser.add_argument(
        "--skip-ml",  action="store_true",
        help="Skip advanced ML steps (time-series, anomaly, LSTM, ensemble)"
    )
    args = parser.parse_args()

    skip_map = {
        "skip_generate": args.skip_generate,
        "skip_features": args.skip_features,
        "skip_ml":       args.skip_ml,
    }

    _header("PulseIQ  —  Burnout Detection Pipeline  (V5.0: Full ML Suite)")

    results   = []   # (label, status, elapsed, output_path)
    wall_start = time.time()

    for step in STEPS:
        should_skip = step["skip_flag"] and skip_map.get(step["skip_flag"], False)

        print(f"\n{BOLD}[{step['id'].upper()}]{RESET}  {step['label']}")
        _hr("·")

        if should_skip:
            _skip(step["label"])
            results.append((step["label"], "skipped", 0, step["output"]))
            continue

        t0 = time.time()
        try:
            run_step(step["module"])
            elapsed = time.time() - t0
            _ok(step["label"], elapsed)
            results.append((step["label"], "ok", elapsed, step["output"]))
        except Exception as exc:
            elapsed = time.time() - t0
            _fail(step["label"], exc)
            results.append((step["label"], "failed", elapsed, step["output"]))

            # ML steps are optional — don't abort on their failure
            if step["skip_flag"] == "skip_ml":
                print(f"      {YELLOW}(ML step failed — continuing with remaining steps){RESET}")
                continue

            print(f"\n{RED}Pipeline aborted at step [{step['id']}].{RESET}")
            print("Fix the error above and re-run.  "
                  "Use --skip-generate / --skip-features / --skip-ml to resume.\n")
            sys.exit(1)

    wall_elapsed = time.time() - wall_start

    # ---------------------------------------------------------------------------
    # Final summary table
    # ---------------------------------------------------------------------------
    print()
    _header("Pipeline Complete")
    print(f"\n  {'Step':<55s}  {'Status':>8s}  {'Time':>7s}  {'Output file size':>16s}")
    print(f"  {'─'*55}  {'─'*8}  {'─'*7}  {'─'*16}")
    for label, status, elapsed, output in results:
        status_str = (
            f"{GREEN}ok{RESET}"      if status == "ok" else
            f"{YELLOW}skipped{RESET}" if status == "skipped" else
            f"{RED}FAILED{RESET}"
        )
        time_str = f"{elapsed:.1f}s" if status != "skipped" else "—"
        size_str = _file_size(output)
        print(f"  {label:<55s}  {status_str:>17s}  {time_str:>7s}  {size_str:>16s}")

    print(f"\n  {BOLD}Total wall time: {wall_elapsed:.1f}s{RESET}")

    # Show top-risk employees from the summary CSV
    summary_path = Path("pulseiq_data/pulseiq_summary.csv")
    if summary_path.exists():
        print(f"\n{BOLD}  Top 5 at-risk employees:{RESET}")
        try:
            import csv
            with open(summary_path) as f:
                rows = list(csv.DictReader(f))
            rows_sorted = sorted(
                rows,
                key=lambda r: float(r["Burnout Risk"].rstrip("%")),
                reverse=True,
            )
            print(f"  {'Name':<22s}  {'Burnout Risk':>13s}  {'Crash Date':>12s}  {'Fragmentation':>14s}")
            print(f"  {'─'*22}  {'─'*13}  {'─'*12}  {'─'*14}")
            for r in rows_sorted[:5]:
                print(f"  {r['Employee Name']:<22s}  {r['Burnout Risk']:>13s}  "
                      f"{r['Crash Date']:>12s}  {r['Fragmentation']:>14s}")
        except Exception as e:
            print(f"  (Could not parse summary: {e})")

    # Show ensemble risk distribution if available
    ensemble_path = Path("pulseiq_data/ensemble_predictions.csv")
    if ensemble_path.exists():
        try:
            import csv
            with open(ensemble_path) as f:
                rows = list(csv.DictReader(f))
            # Get latest per employee
            latest = {}
            for r in rows:
                eid = r["employee_id"]
                if eid not in latest or r["date"] > latest[eid]["date"]:
                    latest[eid] = r

            from collections import Counter
            tiers = Counter(r["risk_tier"] for r in latest.values())
            print(f"\n{BOLD}  Ensemble Risk Distribution:{RESET}")
            for tier in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "MINIMAL"]:
                count = tiers.get(tier, 0)
                bar = "█" * count
                print(f"    {tier:10s}  {count:3d}  {bar}")
        except Exception:
            pass

    print(f"\n  Output files in: {BOLD}pulseiq_data/{RESET}\n")
    _hr()


if __name__ == "__main__":
    main()
