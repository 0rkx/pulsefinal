"""
PulseIQ Synthetic Data Generator (V4.0: Git & Zoom Update)
=========================================================
Generates Slack, Jira, Calendar, Git, and Zoom data.
"""

import csv
import random
from datetime import datetime, timedelta
from pathlib import Path

# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------
SEED = 42
random.seed(SEED)

START_DATE = datetime(2026, 2, 9)   # Monday
NUM_DAYS = 60
REORG_DAY = 30
OUTPUT_DIR = Path("pulseiq_data")
OUTPUT_DIR.mkdir(exist_ok=True)

REPOS = ["core-api", "frontend-main", "infra-terraform", "auth-service"]

# Jira realistic ticket pool
TICKET_IDS  = [f"TKT-{n}" for n in range(100, 140)]
STORY_POINT_OPTIONS = [1, 2, 3, 5, 8]

JIRA_EVENT_TYPES = ["comment", "status_change", "status_change", "status_change"]
JIRA_TRANSITIONS = {
    "To Do":        [("In Progress", False), ("In Progress", False), ("Done", True)],
    "In Progress":  [("In Progress", False), ("Done", True), ("Done", True), ("In Review", False)],
    "In Review":    [("Done", True), ("In Progress", False)],
    "Done":         [("Done", False)],
}

# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
def fmt_ts(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d %H:%M:%S")

def is_weekend(dt: datetime) -> bool:
    return dt.weekday() >= 5

def jitter_minutes(base_hour: int, base_minute: int = 0, spread: int = 30) -> tuple:
    minutes_offset = random.randint(-spread, spread)
    total = base_hour * 60 + base_minute + minutes_offset
    total = max(0, min(24 * 60 - 1, total))
    return divmod(total, 60)

def after_hours_ts(dt: datetime) -> datetime:
    h = random.randint(21, 23)
    m = random.randint(0, 59) if h < 23 else random.randint(0, 30)
    return dt.replace(hour=h, minute=m, second=random.randint(0, 59))

MESSAGE_TEMPLATES = {
    "positive":  {"work": ["Merged!", "Great catch.", "Looks good."],          "social": ["Coffee?", "Match tonight?"]},
    "neutral":   {"work": ["Checking.", "Updated ticket.", "Sync at 3?"],      "social": ["Lunch?", "Machine broken."]},
    "negative":  {"work": ["Stuck.", "Tooling sucks.", "Pushing deadline."],   "social": ["Too busy.", "Maybe later."]},
    "exhausted": {"work": ["Still on it.", "K.", "Not today."],                "social": ["No.", "Cant."]},
}

def pick_message_text(sentiment: float, channel: str) -> str:
    bucket = ("positive" if sentiment >= 0.7 else
              "neutral"  if sentiment >= 0.5 else
              "negative" if sentiment >= 0.3 else "exhausted")
    pool = "social" if channel in ("#random", "#general") else "work"
    return random.choice(MESSAGE_TEMPLATES[bucket][pool])

# ----------------------------------------------------------------------------
# Persona Definitions (Now including Git & Zoom)
# ----------------------------------------------------------------------------
def healthy_profile(day_idx, dt, emp, ctx):
    if is_weekend(dt):
        return dict(msg_count_work=0, msg_count_social=0, msg_count_dms=0, after_hours=False,
                    tickets_touched=0, meetings_count=0, git_commits=0, zoom_meetings=0, sentiment=0.7)
    return dict(
        msg_count_work=random.randint(5, 10), msg_count_social=random.randint(1, 3), msg_count_dms=random.randint(2, 5),
        after_hours=False, tickets_touched=random.randint(1, 3), meetings_count=random.randint(2, 4),
        git_commits=random.randint(2, 5), zoom_meetings=random.randint(1, 3), zoom_speaking_ratio=0.25, sentiment=0.75
    )

def priya_profile(day_idx, dt, emp, ctx):
    if day_idx < REORG_DAY: return healthy_profile(day_idx, dt, emp, ctx)
    intensity = min(1.0, (day_idx - REORG_DAY) / 30)
    return dict(
        msg_count_work=random.randint(3, 6), msg_count_social=0, msg_count_dms=2, after_hours=random.random() < (0.1 + 0.5 * intensity),
        tickets_touched=1, meetings_count=6, git_commits=1, zoom_meetings=random.randint(5, 7), zoom_speaking_ratio=0.1, sentiment=0.3
    )

def fragmented_lead_profile(day_idx, dt, emp, ctx):
    return dict(
        msg_count_work=25, msg_count_social=2, msg_count_dms=10, after_hours=random.random() < 0.3,
        tickets_touched=0, meetings_count=random.randint(8, 11), git_commits=random.randint(0, 1),
        zoom_meetings=random.randint(6, 9), zoom_speaking_ratio=0.4, sentiment=0.5
    )

def silent_struggler_profile(day_idx, dt, emp, ctx):
    intensity = min(1.0, day_idx / 60)
    return dict(
        msg_count_work=3, msg_count_social=0, msg_count_dms=1, after_hours=False,
        tickets_touched=5, meetings_count=1, git_commits=random.randint(1, 3),
        zoom_meetings=2, zoom_speaking_ratio=0.05, sentiment=0.4 # Low speaking ratio
    )

def weekend_warrior_profile(day_idx, dt, emp, ctx):
    if is_weekend(dt):
        return dict(msg_count_work=8, msg_count_social=0, msg_count_dms=4, after_hours=True,
                    tickets_touched=2, meetings_count=0, git_commits=random.randint(4, 7),
                    zoom_meetings=0, sentiment=0.5)
    return healthy_profile(day_idx, dt, emp, ctx)

PERSONA_FUNCS = {
    "healthy": healthy_profile, "priya": priya_profile, "fragmented_lead": fragmented_lead_profile,
    "weekend_warrior": weekend_warrior_profile, "silent_struggler": silent_struggler_profile
}

# ----------------------------------------------------------------------------
# Main Script
# ----------------------------------------------------------------------------
def main():
    employees = []
    planted = [
        ("Priya Sharma", "Platform", "priya"), ("Ishaan Verma", "Engineering", "fragmented_lead"),
        ("Vihaan Gupta", "Engineering", "weekend_warrior"), ("Saanvi Reddy", "Design", "silent_struggler"),
    ]
    for i, (name, team, persona) in enumerate(planted):
        employees.append({"employee_id": f"E{i+1:03d}", "name": name, "team": team, "persona": persona})
    for i in range(len(employees) + 1, 31):
        employees.append({"employee_id": f"E{i:03d}", "name": f"Employee {i}", "team": "Engineering", "persona": "healthy"})

    slack_f = open(OUTPUT_DIR / "slack_messages.csv",  "w", newline="")
    jira_f  = open(OUTPUT_DIR / "jira_events.csv",     "w", newline="")
    cal_f   = open(OUTPUT_DIR / "calendar_events.csv", "w", newline="")
    git_f   = open(OUTPUT_DIR / "git_commits.csv",     "w", newline="")
    zoom_f  = open(OUTPUT_DIR / "zoom_meetings.csv",    "w", newline="")

    slack_w, jira_w, cal_w, git_w, zoom_w = csv.writer(slack_f), csv.writer(jira_f), csv.writer(cal_f), csv.writer(git_f), csv.writer(zoom_f)

    # Headers
    slack_w.writerow(["message_id", "employee_id", "timestamp", "channel", "message_length", "is_dm", "recipient_id", "sentiment_score", "message_text"])
    jira_w.writerow(["employee_id", "timestamp", "ticket_id", "event_type", "story_points", "from_status", "to_status"])
    cal_w.writerow(["meeting_id", "employee_id", "date", "start_time", "end_time", "title", "attendee_count"])
    git_w.writerow(["employee_id", "timestamp", "repo", "lines_added", "lines_deleted"])
    zoom_w.writerow(["employee_id", "date", "duration_minutes", "speaking_seconds", "participant_count"])

    msg_idx = 0
    rng = random.Random(SEED)

    for day_idx in range(NUM_DAYS):
        dt = START_DATE + timedelta(days=day_idx)
        for emp in employees:
            profile = PERSONA_FUNCS.get(emp["persona"], healthy_profile)(day_idx, dt, emp, {})
            eid = emp["employee_id"]

            # Slack
            for i in range(profile["msg_count_work"] + profile["msg_count_social"] + profile["msg_count_dms"]):
                msg_idx += 1
                ts = after_hours_ts(dt) if profile["after_hours"] else dt.replace(hour=jitter_minutes(14)[0], minute=jitter_minutes(14)[1])
                slack_w.writerow([f"M{msg_idx:07d}", eid, fmt_ts(ts), "#work", 20, "false", "", profile["sentiment"], "Update."])

            # Jira
            for _ in range(profile["tickets_touched"]):
                jira_w.writerow([eid, fmt_ts(dt), rng.choice(TICKET_IDS), "status_change", 3, "To Do", "Done"])

            # Git Commits
            for _ in range(profile.get("git_commits", 0)):
                ts = after_hours_ts(dt) if profile["after_hours"] else dt.replace(hour=random.randint(9, 17))
                git_w.writerow([eid, fmt_ts(ts), rng.choice(REPOS), random.randint(10, 200), random.randint(1, 50)])

            # Zoom Meetings
            for _ in range(profile.get("zoom_meetings", 0)):
                duration = random.randint(15, 60)
                speaking = int(duration * 60 * profile.get("zoom_speaking_ratio", 0.2))
                zoom_w.writerow([eid, dt.strftime("%Y-%m-%d"), duration, speaking, random.randint(2, 10)])

    for f in [slack_f, jira_f, cal_f, git_f, zoom_f]: f.close()
    print(f"Success: Full V4.0 Data generated in {OUTPUT_DIR}")

if __name__ == "__main__":
    main()