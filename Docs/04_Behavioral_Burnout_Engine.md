# The Behavioral Burnout Engine (`compute_burnout.py`)

This file is the bedrock behavioral analysis system. It maps statistical deviations of employee workflow against their `baselines` to model cognitive load, rest deficit, and raw burnout scale.

## Normalization against Baselines
Each employee's history has a unique baseline (assessed by `compute_baselines.py` using robust statistics). For instance, 10 meetings a day might be standard for product managers, but highly anomalous for engineers. When calculating risk, metrics are normalized using a Robust Z-Score against their 14-day trailing behavior.
```python
# Robust Z-Score logic avoiding 0-division on uniform behavior 
def robust_z(value, median, std_robust):
    ...
    return (value - median) / std_robust
```

## Sub-Scores (The 3 Pillars of Burnout)

1. **Deep Work Index (0-100)**: Assesses meaningful output generation. Evaluates factors like Jira Story Points closed, Git Code diffs, and the Largest Focus Gap Minutes from their calendar. Evaluated as a ratio relative to their benchmark metric. 
2. **Fragmentation Score (0-100)**: High fragmentation destroys cognitive momentum. This aggregates meetings count, Slack total messages, and Zoom meetings by mapping Z-scores to a non-linear `tanh` function curve pushing maximum distraction asymptotically towards 100.
3. **Connection Index (0-100)**: Measures workplace social isolation. Driven heavily by NLP Slack Sentiments ratios, distinct DM partners (are they talking to peers or isolating?), and Zoom Speaking ratios.

## Rest Deficit & Trailing Probabilities
- `consecutive_work_days` tracks unrelenting strings of active contribution (logging after-hours commits, Jira actions).
- Combines the 3 pillars against the Rest Deficit and Recovery histories to form a raw mathematical `score`.
- Converts the score to a 0.0->1.0 probability range using a Sigmoid function.
- Smooths using a 3-Day Simple Moving Average (SMA) so a single bad day doesn't misclassify someone as burnt out.
- Generates a linear slope based projection line `forecast_days_until_critical` extrapolating when their SMA will hit the `0.85` critical zone.
