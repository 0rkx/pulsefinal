"""
PulseIQ — Time-Series Analysis Module
=======================================
Performs time-series decomposition, trend analysis, and ARIMA-based
burnout forecasting on per-employee daily burnout probability sequences.

Techniques:
  - Exponential Weighted Moving Average (EWMA) for trend smoothing
  - Seasonal decomposition to isolate weekly patterns
  - ARIMA(p,d,q) model for N-day burnout forecasting
  - Change-point detection via CUSUM (Cumulative Sum)
  - Rolling volatility computation for instability detection

Output: pulseiq_data/timeseries_forecasts.csv
  columns: employee_id, date, ewma_trend, weekly_seasonal,
           arima_forecast_7d, arima_forecast_14d,
           trend_direction, changepoint_detected,
           rolling_volatility
"""

import csv
import math
import warnings
from collections import defaultdict
from pathlib import Path

import numpy as np

DATA_DIR    = Path("pulseiq_data")
INPUT_FILE  = DATA_DIR / "daily_scores.csv"
OUTPUT_FILE = DATA_DIR / "timeseries_forecasts.csv"

# Suppress statsmodels convergence warnings
warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# EWMA (Exponential Weighted Moving Average)
# ---------------------------------------------------------------------------
def ewma(values, alpha=0.3):
    """Compute EWMA over a list of values. Higher alpha = more responsive."""
    if not values:
        return []
    result = [values[0]]
    for v in values[1:]:
        result.append(alpha * v + (1 - alpha) * result[-1])
    return result

# ---------------------------------------------------------------------------
# Seasonal Decomposition (additive, period=7 for weekly)
# ---------------------------------------------------------------------------
def seasonal_decompose(values, period=7):
    """
    Simple additive seasonal decomposition.
    Returns (trend, seasonal, residual) arrays.
    """
    n = len(values)
    if n < period * 2:
        return values[:], [0.0] * n, [0.0] * n

    # Trend via centered moving average
    trend = [None] * n
    half = period // 2
    for i in range(half, n - half):
        window = values[max(0, i - half):min(n, i + half + 1)]
        trend[i] = sum(window) / len(window)

    # Fill edges with nearest valid value
    first_valid = next(i for i in range(n) if trend[i] is not None)
    last_valid = next(i for i in range(n - 1, -1, -1) if trend[i] is not None)
    for i in range(first_valid):
        trend[i] = trend[first_valid]
    for i in range(last_valid + 1, n):
        trend[i] = trend[last_valid]

    # Detrended
    detrended = [values[i] - trend[i] for i in range(n)]

    # Seasonal component: average of detrended values at each period position
    seasonal = [0.0] * n
    for pos in range(period):
        cycle_vals = [detrended[i] for i in range(pos, n, period)]
        avg = sum(cycle_vals) / len(cycle_vals) if cycle_vals else 0.0
        for i in range(pos, n, period):
            seasonal[i] = avg

    # Residual
    residual = [values[i] - trend[i] - seasonal[i] for i in range(n)]

    return trend, seasonal, residual

# ---------------------------------------------------------------------------
# ARIMA Forecasting (simplified auto-regressive model)
# ---------------------------------------------------------------------------
def arima_forecast(values, steps=7):
    """
    Simplified ARIMA-like forecasting using statsmodels if available,
    otherwise falls back to exponential smoothing forecast.
    """
    if len(values) < 10:
        return [values[-1] if values else 0.0] * steps

    try:
        from statsmodels.tsa.arima.model import ARIMA
        # Use ARIMA(2,1,1) — common for bounded probability series
        model = ARIMA(values, order=(2, 1, 1))
        fitted = model.fit()
        forecast = fitted.forecast(steps=steps)
        # Clamp to [0, 1] since these are probabilities
        return [max(0.0, min(1.0, float(f))) for f in forecast]
    except Exception:
        # Fallback: exponential smoothing extrapolation
        ewma_vals = ewma(values, alpha=0.3)
        if len(ewma_vals) < 2:
            return [ewma_vals[-1]] * steps

        # Linear extrapolation from last few EWMA values
        recent = ewma_vals[-min(7, len(ewma_vals)):]
        if len(recent) < 2:
            return [recent[-1]] * steps

        slope = (recent[-1] - recent[0]) / len(recent)
        forecasts = []
        last_val = recent[-1]
        for i in range(steps):
            last_val = max(0.0, min(1.0, last_val + slope))
            forecasts.append(last_val)
        return forecasts

# ---------------------------------------------------------------------------
# CUSUM Change-Point Detection
# ---------------------------------------------------------------------------
def cusum_changepoint(values, threshold=0.15):
    """
    Detect change-points using CUSUM (Cumulative Sum) algorithm.
    Returns list of booleans indicating whether each point is a changepoint.
    """
    if len(values) < 5:
        return [False] * len(values)

    mean_val = sum(values) / len(values)
    s_pos = [0.0]  # Positive CUSUM
    s_neg = [0.0]  # Negative CUSUM
    changepoints = [False]

    for i in range(1, len(values)):
        s_pos.append(max(0, s_pos[-1] + (values[i] - mean_val) - threshold / 2))
        s_neg.append(min(0, s_neg[-1] + (values[i] - mean_val) + threshold / 2))

        # Change detected if CUSUM exceeds threshold
        is_change = s_pos[-1] > threshold or abs(s_neg[-1]) > threshold
        changepoints.append(is_change)

        # Reset after detection
        if is_change:
            s_pos[-1] = 0.0
            s_neg[-1] = 0.0

    return changepoints

# ---------------------------------------------------------------------------
# Rolling Volatility
# ---------------------------------------------------------------------------
def rolling_volatility(values, window=7):
    """Compute rolling standard deviation as a volatility measure."""
    result = []
    for i in range(len(values)):
        start = max(0, i - window + 1)
        w = values[start:i + 1]
        if len(w) < 2:
            result.append(0.0)
        else:
            mean = sum(w) / len(w)
            variance = sum((x - mean) ** 2 for x in w) / (len(w) - 1)
            result.append(math.sqrt(variance))
    return result

# ---------------------------------------------------------------------------
# Trend Direction Classification
# ---------------------------------------------------------------------------
def classify_trend(ewma_values, lookback=7):
    """
    Classify trend direction based on recent EWMA slope.
    Returns: 'rising', 'falling', 'stable', or 'volatile'
    """
    if len(ewma_values) < lookback:
        return "stable"

    recent = ewma_values[-lookback:]
    slope = (recent[-1] - recent[0]) / lookback

    if abs(slope) < 0.005:
        return "stable"
    elif slope > 0.02:
        return "rising_fast"
    elif slope > 0:
        return "rising"
    elif slope < -0.02:
        return "falling_fast"
    else:
        return "falling"

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("Loading daily scores for time-series analysis...")

    # Load data
    rows = []
    with open(INPUT_FILE) as f:
        for r in csv.DictReader(f):
            rows.append(r)

    # Group by employee
    by_emp = defaultdict(list)
    for r in rows:
        by_emp[r["employee_id"]].append(r)

    output = []
    forecast_summary = defaultdict(dict)

    for eid, emp_days in by_emp.items():
        # Extract burnout probability sequence (post-baseline only)
        probs = []
        dates = []
        for d in emp_days:
            bp = d.get("burnout_probability", "")
            if bp and bp != "None":
                probs.append(float(bp))
                dates.append(d["date"])
            else:
                probs.append(0.0)
                dates.append(d["date"])

        if not probs:
            continue

        np_probs = np.array(probs, dtype=float)

        # 1. EWMA trend
        ewma_trend = ewma(probs, alpha=0.3)

        # 2. Seasonal decomposition (weekly=7)
        trend, seasonal, residual = seasonal_decompose(probs, period=7)

        # 3. ARIMA forecast (7-day and 14-day)
        valid_probs = [p for p in probs if p > 0]
        if len(valid_probs) >= 10:
            forecast_7d = arima_forecast(valid_probs, steps=7)
            forecast_14d = arima_forecast(valid_probs, steps=14)
        else:
            forecast_7d = [probs[-1]] * 7
            forecast_14d = [probs[-1]] * 14

        # 4. Change-point detection
        changepoints = cusum_changepoint(probs, threshold=0.15)

        # 5. Rolling volatility
        volatility = rolling_volatility(probs, window=7)

        # 6. Trend direction
        trend_dir = classify_trend(ewma_trend, lookback=7)

        # Store per-day results
        for i in range(len(probs)):
            output.append({
                "employee_id":            eid,
                "name":                   emp_days[i]["name"],
                "date":                   dates[i],
                "burnout_probability":    round(probs[i], 4),
                "ewma_trend":             round(ewma_trend[i], 4),
                "weekly_seasonal":        round(seasonal[i], 4),
                "trend_residual":         round(residual[i], 4),
                "changepoint_detected":   changepoints[i],
                "rolling_volatility":     round(volatility[i], 4),
                "trend_direction":        trend_dir if i == len(probs) - 1 else "",
            })

        # Store forecast summary for this employee
        forecast_summary[eid] = {
            "name": emp_days[0]["name"],
            "current_prob": round(probs[-1], 4),
            "ewma_current": round(ewma_trend[-1], 4),
            "forecast_7d_avg": round(sum(forecast_7d) / len(forecast_7d), 4),
            "forecast_14d_avg": round(sum(forecast_14d) / len(forecast_14d), 4),
            "forecast_7d_max": round(max(forecast_7d), 4),
            "forecast_14d_max": round(max(forecast_14d), 4),
            "trend_direction": trend_dir,
            "num_changepoints": sum(changepoints),
            "avg_volatility": round(sum(volatility) / len(volatility), 4),
        }

    # Write per-day time-series output
    if output:
        fieldnames = list(output[0].keys())
        with open(OUTPUT_FILE, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames)
            w.writeheader()
            w.writerows(output)

    # Write forecast summary
    summary_path = DATA_DIR / "timeseries_summary.csv"
    if forecast_summary:
        fieldnames = ["employee_id"] + list(next(iter(forecast_summary.values())).keys())
        with open(summary_path, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames)
            w.writeheader()
            for eid, data in forecast_summary.items():
                w.writerow({"employee_id": eid, **data})

    print(f"  Time-series analysis complete:")
    print(f"    Per-day data  → {OUTPUT_FILE}")
    print(f"    Forecast summary → {summary_path}")
    print(f"    {len(by_emp)} employees analyzed")

    # Print top-risk forecast
    rising = [(eid, d) for eid, d in forecast_summary.items()
              if d["trend_direction"] in ("rising", "rising_fast")]
    if rising:
        print(f"\n  ⚠️ {len(rising)} employees with RISING burnout trend:")
        for eid, d in sorted(rising, key=lambda x: -x[1]["forecast_7d_avg"])[:5]:
            print(f"    {d['name']:20s}  current={d['current_prob']:.1%}  "
                  f"7d-forecast={d['forecast_7d_avg']:.1%}  "
                  f"14d-forecast={d['forecast_14d_avg']:.1%}")


if __name__ == "__main__":
    main()
