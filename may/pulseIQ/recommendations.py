"""
PulseIQ — Recommendations Engine (V4.0: ML Upgrade)
====================================================
Maps daily burnout signals to actionable recommendations.

Changes from V3.2:
  - driving_factors now come from SHAP feature names (from compute_burnout.py)
    rather than hardcoded sub-score labels. Extended driver → recommendation
    mapping covers the full ML_FEATURES set.
  - New signal categories added: git (after-hours commits, weekend commits,
    high churn), zoom (low speaking ratio), NLP (high stress score, high
    sentiment volatility).
  - All existing recommendations preserved; new ones added only for new signals.

Output format: IDENTICAL to V3.2
  columns: employee_id, date, recommendations
"""

import csv

INPUT_FILE  = "pulseiq_data/daily_scores.csv"
OUTPUT_FILE = "pulseiq_data/recommendations.csv"

# ---------------------------------------------------------------------------
# Driver → recommendation mapping
# Extended to cover SHAP-derived feature names from compute_burnout.py
# ---------------------------------------------------------------------------

# Each entry: (match_fn, recommendations_list)
# match_fn takes (factor_str, row_dict) and returns True/False
# Evaluated in order; multiple entries can match.

def _f(factors, row):
    """Shorthand: parsed factor list + numeric row values."""
    return factors, row

def generate_recommendations(row):
    recs = []

    # Safe parsing
    deep     = float(row.get("deep_work_index",    0) or 0)
    frag     = float(row.get("fragmentation_score", 0) or 0)
    recov    = float(row.get("recovery_debt",       0) or 0)
    burnout  = float(row.get("burnout_probability", 0) or 0)

    factors_raw = row.get("driving_factors", "") or ""
    factors     = set(factors_raw.split(",")) if factors_raw else set()

    # -------------------------------------------------------------------
    # 1. RECOVERY / FATIGUE
    # -------------------------------------------------------------------
    recovery_triggers = {
        "recovery_debt", "rest_deficit",
        "slack_msgs_after_hours", "after_hours_ratio",
        "git_commits_after_hours", "git_commits_weekend",
    }
    if (factors & recovery_triggers) or recov > 5:
        recs.append("⚠️ Recovery debt is high → reduce workload and take longer breaks")
        recs.append("💤 Avoid late-night work and prioritize sleep/recovery")
    if {"git_commits_after_hours", "git_commits_weekend"} & factors:
        recs.append("💻 After-hours / weekend commits detected → set a code-freeze boundary after 9pm")

    # -------------------------------------------------------------------
    # 2. FRAGMENTATION / INTERRUPTIONS
    # -------------------------------------------------------------------
    frag_triggers = {
        "fragmentation", "meeting_overload",
        "meetings_count", "meetings_back_to_back", "meetings_total_minutes",
        "slack_msgs_total", "slack_msgs_work_channels",
    }
    if (factors & frag_triggers) or frag > 60:
        recs.append("📵 High interruptions → block focus time and mute Slack during deep work")
        recs.append("📅 Reduce meetings or create no-meeting time windows")
    if {"zoom_meetings_count", "zoom_total_minutes"} & factors:
        recs.append("📹 High Zoom load → decline optional calls and suggest async updates")

    # -------------------------------------------------------------------
    # 3. DEEP WORK / FOCUS
    # -------------------------------------------------------------------
    deep_triggers = {
        "deep_work", "largest_focus_gap_minutes",
        "jira_story_points_closed", "git_lines_changed",
    }
    if factors & deep_triggers:
        recs.append("🧠 Low deep work → schedule 60–90 min uninterrupted focus sessions")
    elif deep > 70 and frag < 40:
        recs.append("🔥 Strong focus today → schedule your highest-impact work now")

    # -------------------------------------------------------------------
    # 4. SOCIAL / CONNECTION
    # -------------------------------------------------------------------
    connection_triggers = {
        "connection", "slack_avg_sentiment", "slack_distinct_dm_partners",
        "slack_msgs_social_channels",
    }
    if factors & connection_triggers:
        recs.append("🤝 Low collaboration signals → check in with your team or manager")
    if "zoom_speaking_ratio" in factors:
        recs.append("🎙️ Low Zoom participation → consider speaking up or requesting smaller calls")

    # -------------------------------------------------------------------
    # 5. NLP / SENTIMENT SIGNALS
    # -------------------------------------------------------------------
    if "slack_avg_stress_score" in factors:
        recs.append("😰 Elevated stress language in messages → talk to someone you trust")
    if "slack_sentiment_volatility" in factors:
        recs.append("📊 High mood instability detected → consider journaling or a break")
    if "slack_avg_sentiment" in factors and burnout < 0.5:
        # Sentiment dropped but burnout not critical yet — early warning
        recs.append("💬 Sentiment trending down → check in with manager proactively")

    # -------------------------------------------------------------------
    # 6. GIT CHURN
    # -------------------------------------------------------------------
    if {"git_lines_changed", "git_lines_added", "git_lines_deleted"} & factors:
        recs.append("⚙️ High code churn → verify if scope creep is adding unplanned work")

    # -------------------------------------------------------------------
    # 7. BURNOUT RISK
    # -------------------------------------------------------------------
    if burnout > 0.7:
        recs.append("🛑 High burnout risk → avoid overtime and reschedule non-critical work")
    elif burnout > 0.5:
        recs.append("⚠️ Rising burnout risk → take regular breaks and reduce intensity")

    # -------------------------------------------------------------------
    # 8. FORECAST
    # -------------------------------------------------------------------
    forecast = row.get("forecast_days_until_critical")
    if forecast and str(forecast) not in ("", "None"):
        try:
            days = int(float(forecast))
            if days <= 5:
                recs.append(f"⏳ Burnout risk escalating → critical threshold in ~{days} days")
        except (ValueError, TypeError):
            pass

    # -------------------------------------------------------------------
    # 9. DEFAULT
    # -------------------------------------------------------------------
    if not recs:
        recs.append("✅ Normal day → maintain current pace and schedule focus work")

    return recs


def main():
    with open(INPUT_FILE) as f:
        rows = list(csv.DictReader(f))

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["employee_id", "date", "recommendations"])

        for r in rows:
            recs = generate_recommendations(r)
            writer.writerow([r["employee_id"], r["date"], " • ".join(recs)])

    print(f"\nRecommendations saved → {OUTPUT_FILE}")


if __name__ == "__main__":
    main()