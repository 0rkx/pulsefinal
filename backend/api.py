"""
PulseIQ — FastAPI Backend (V5.0: Full ML Suite)
=================================================
Serves all PulseIQ data to the React frontend, including:
  - Employee burnout stats (V4.x sub-scores + ensemble predictions)
  - Time-series forecasts and trend directions
  - Anomaly detection alerts
  - LSTM deep learning predictions
  - Actionable recommendations and suggestions
  - Manager dashboard data
"""

import os
import pandas as pd
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any

app = FastAPI(
    title="PulseIQ API",
    description="Burnout Detection & Prediction Intelligence API",
    version="5.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = "pulseiq_data"

def load_csv(filename: str) -> pd.DataFrame:
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        return pd.read_csv(path)
    return pd.DataFrame()

# Managers map
MOCK_USERS = {
    'm1': { "id": 'm1', "role": 'manager', "name": 'Manager A (M1)', "password": 'password' },
    'm2': { "id": 'm2', "role": 'manager', "name": 'Manager B (M2)', "password": 'password' },
}

def get_employees_data():
    emp_df = load_csv("employees.csv")
    view_df = load_csv("manager_employees_view.csv")
    scores_df = load_csv("daily_scores.csv")
    ensemble_df = load_csv("ensemble_predictions.csv")

    if emp_df.empty or scores_df.empty:
        return []

    # Get latest scores per employee
    latest_scores = scores_df.sort_values("date").groupby("employee_id").last().reset_index()

    # Get latest ensemble predictions if available
    latest_ensemble = pd.DataFrame()
    if not ensemble_df.empty:
        latest_ensemble = ensemble_df.sort_values("date").groupby("employee_id").last().reset_index()

    merged = emp_df.copy()
    if not view_df.empty:
        merged = pd.merge(merged, view_df, on="employee_id", how="left")
    merged = pd.merge(merged, latest_scores, on="employee_id", how="left", suffixes=("", "_score"))

    if not latest_ensemble.empty:
        merged = pd.merge(merged, latest_ensemble[["employee_id", "ensemble_prob", "confidence", "risk_tier"]],
                          on="employee_id", how="left")

    employees = []

    for _, row in merged.iterrows():
        # Assign manager for a balanced split (Half to M1, Half to M2)
        try:
            emp_num = int(row["employee_id"].replace("E", ""))
            manager_id = 'm1' if emp_num <= 15 else 'm2'
        except:
            manager_id = 'm1' if row.get("team") == "Engineering" else 'm2'

        # Calculate simulated productivity based on deep work and capacity
        cap = row.get("capacity_hours", 30)
        if pd.isna(cap):
            cap = 30
        productivity = min(100, int((cap / 30.0) * 100))

        b_prob = row.get("burnout_probability", 0.0)
        if pd.isna(b_prob):
            b_prob = 0.0

        # Always read these so they're available for the employee dict later
        risk_level = row.get("risk_level", "")
        ensemble_tier = row.get("risk_tier", "")

        # Default predictions
        forecast_numeric = None
        
        # Tie Time-To-Burnout directly to Burnout Probability for consistency
        # based on threshold alignment bounds.
        # Critical threshold = 0.85
        # High Risk >= 0.70 (<= 30 hours)
        # Medium Risk >= 0.40 (<= 90 hours)
        if b_prob >= 0.85:
            forecast_numeric = 0.0
            forecast = "Burnout Already Reached"
        else:
            forecast_numeric = max(0.0, (0.85 - b_prob) * 200.0)
            forecast = f"{int(forecast_numeric)} Hours"

        # Determine status from forecast_days_until_critical so that the
        # risk tag is always consistent with the displayed time-to-burnout.
        # Thresholds: <=30 hours -> critical, <=90 hours -> warning, else healthy.
        # Fall back to risk_level / ensemble_tier only when no numeric forecast.
        if forecast_numeric is not None:
            if forecast_numeric < 0:
                status = 'critical'
            elif forecast_numeric <= 30:
                status = 'critical'
            elif forecast_numeric <= 90:
                status = 'warning'
            else:
                status = 'healthy'
        else:
            if risk_level == "CRITICAL" or ensemble_tier in ("CRITICAL", "HIGH"):
                status = 'critical'
            elif risk_level == "WARNING" or ensemble_tier == "MEDIUM":
                status = 'warning'
            else:
                status = 'healthy'

        deep_idx = row.get("deep_work_index", 50)
        if pd.isna(deep_idx):
            deep_idx = 50

        frag_score = row.get("fragmentation_score", 0)
        if pd.isna(frag_score):
            frag_score = 0

        conn_idx = row.get("connection_index", 50)
        if pd.isna(conn_idx):
            conn_idx = 50

        recovery = row.get("recovery_debt", 0)
        if pd.isna(recovery):
            recovery = 0

        # Ensemble probability (if available)
        ensemble_prob = row.get("ensemble_prob", None)
        if pd.isna(ensemble_prob) if isinstance(ensemble_prob, float) else ensemble_prob is None:
            ensemble_prob = None

        confidence = row.get("confidence", None)
        if pd.isna(confidence) if isinstance(confidence, float) else confidence is None:
            confidence = None

        drivers = row.get("driving_factors", "")
        if pd.isna(drivers):
            drivers = ""

        emp = {
            "id": row["employee_id"],
            "name": row["name"],
            "role": row.get("team", "Unknown Role"),
            "productivity": productivity,
            "burnout": int(b_prob * 100),
            "status": status,
            "managerId": manager_id,
            "burnoutIndex": round(b_prob * 10, 1),
            "predictedBurnout": str(forecast),
            "deepWorkIndex": int(deep_idx),
            "fragmentationScore": round(float(frag_score), 1),
            "connectionIndex": round(float(conn_idx), 1),
            "recoveryDebt": round(float(recovery), 1),
            "drivingFactors": str(drivers),
            "ensembleProb": round(float(ensemble_prob), 4) if ensemble_prob is not None else None,
            "ensembleConfidence": round(float(confidence), 4) if confidence is not None else None,
            "riskTier": str(ensemble_tier) if ensemble_tier else None,
        }
        employees.append(emp)

    return employees

@app.get("/api/users")
def get_users():
    users = list(MOCK_USERS.values())
    emp_data = get_employees_data()
    for e in emp_data:
        users.append({
            "id": e["id"],
            "role": "employee",
            "name": e["name"],
            "password": "password",
            "managerId": e["managerId"]
        })
    return {u["id"]: u for u in users}

@app.get("/api/login")
def login(username: str):
    users = get_users()
    target = username.lower()
    # Case-insensitive lookup for ID
    user = None
    for uid, udata in users.items():
        if uid.lower() == target:
            user = udata
            break

    if not user:
        # Check by name matching if not found by ID
        for u in users.values():
            if target in u["name"].lower():
                return u
        return {"error": "User not found"}
    return user

@app.get("/api/employees")
def get_employees(manager_id: str = None):
    all_emps = get_employees_data()
    if manager_id:
        return [e for e in all_emps if e["managerId"] == manager_id]
    return all_emps

@app.get("/api/employee/{employee_id}/history")
def get_employee_history(employee_id: str):
    """Get burnout probability history for a specific employee (for time-series charts)."""
    scores_df = load_csv("daily_scores.csv")
    if scores_df.empty:
        return []

    emp_scores = scores_df[scores_df["employee_id"] == employee_id].sort_values("date")

    history = []
    for _, row in emp_scores.iterrows():
        bp = row.get("burnout_probability")
        if pd.isna(bp):
            continue
        history.append({
            "date": row["date"],
            "burnoutProbability": round(float(bp), 4),
            "deepWorkIndex": float(row.get("deep_work_index", 0) or 0),
            "fragmentationScore": float(row.get("fragmentation_score", 0) or 0),
            "connectionIndex": float(row.get("connection_index", 0) or 0),
            "recoveryDebt": float(row.get("recovery_debt", 0) or 0),
        })
    return history

@app.get("/api/employee/{employee_id}/anomalies")
def get_employee_anomalies(employee_id: str):
    """Get anomaly detection results for a specific employee."""
    anomaly_df = load_csv("anomaly_scores.csv")
    if anomaly_df.empty:
        return []

    emp_anom = anomaly_df[anomaly_df["employee_id"] == employee_id].sort_values("date")
    anomalies = []
    for _, row in emp_anom.iterrows():
        if str(row.get("is_anomaly", "False")) == "True":
            anomalies.append({
                "date": row["date"],
                "isolationScore": float(row.get("isolation_score", 0) or 0),
                "triggerFeature": str(row.get("anomaly_features", "")),
                "zScoreMax": float(row.get("z_score_max", 0) or 0),
                "patternShift": float(row.get("pattern_shift_score", 0) or 0),
            })
    return anomalies

@app.get("/api/employee/{employee_id}/forecast")
def get_employee_forecast(employee_id: str):
    """Get time-series forecast for a specific employee."""
    ts_df = load_csv("timeseries_summary.csv")
    if ts_df.empty:
        return {}

    emp_row = ts_df[ts_df["employee_id"] == employee_id]
    if emp_row.empty:
        return {}

    row = emp_row.iloc[0]
    return {
        "currentProb": float(row.get("current_prob", 0) or 0),
        "ewmaCurrent": float(row.get("ewma_current", 0) or 0),
        "forecast7dAvg": float(row.get("forecast_7d_avg", 0) or 0),
        "forecast14dAvg": float(row.get("forecast_14d_avg", 0) or 0),
        "forecast7dMax": float(row.get("forecast_7d_max", 0) or 0),
        "forecast14dMax": float(row.get("forecast_14d_max", 0) or 0),
        "trendDirection": str(row.get("trend_direction", "")),
        "numChangepoints": int(row.get("num_changepoints", 0) or 0),
        "avgVolatility": float(row.get("avg_volatility", 0) or 0),
    }

@app.get("/api/narratives")
def get_narratives():
    """Get AI-generated risk narratives for all employees."""
    narr_df = load_csv("pulseiq_narratives.csv")
    if narr_df.empty:
        return []

    narratives = []
    for _, row in narr_df.iterrows():
        narratives.append({
            "employeeId": row.get("employee_id", ""),
            "name": row.get("name", ""),
            "ensembleProb": float(row.get("ensemble_prob", 0) or 0),
            "riskTier": row.get("risk_tier", ""),
            "narrative": row.get("narrative", ""),
        })
    return narratives

@app.get("/api/suggestions")
def get_suggestions(manager_id: str = None):
    recs_df = load_csv("recommendations.csv")
    if recs_df.empty:
        return []

    # Get latest recommendations per employee
    latest_recs = recs_df.sort_values("date").groupby("employee_id").last().reset_index()

    # The frontend expects: { id, task, from, to, reason, benefits, status, managerId }
    emps = get_employees_data()
    emp_map = {e["id"]: e for e in emps}

    suggestions = []
    sid = 1

    # ── Balanced allocation tracker ──
    # Tracks how many tasks have been assigned to each employee across all
    # suggestions so that work is spread evenly instead of piling on one person.
    assignment_count: dict = {}  # employee_id -> int

    def pick_balanced_peer(mgr_id: str, exclude_id: str) -> str:
        """Pick the healthy peer with the fewest current assignments.
        Ties are broken by lowest burnout so the healthiest person is preferred
        when assignment counts are equal."""
        peers = [
            e for e in emps
            if e["managerId"] == mgr_id
            and e["status"] == "healthy"
            and e["id"] != exclude_id
        ]
        if not peers:
            return "Available Peer"
        # Sort by (assignments so far, burnout %) so we round-robin across peers
        peers.sort(key=lambda e: (assignment_count.get(e["id"], 0), e.get("burnout", 100)))
        chosen = peers[0]
        assignment_count[chosen["id"]] = assignment_count.get(chosen["id"], 0) + 1
        return chosen["name"]

    for _, row in latest_recs.iterrows():
        eid = row["employee_id"]
        emp = emp_map.get(eid)
        if not emp:
            continue

        if manager_id and emp["managerId"] != manager_id:
            continue

        recs_str = str(row.get("recommendations", ""))
        if "High burnout risk" in recs_str or "Critical" in recs_str or "critical" in recs_str:
            to_name = pick_balanced_peer(emp["managerId"], eid)

            suggestions.append({
                "id": sid,
                "task": "Workload Reallocation",
                "from": emp["name"],
                "to": to_name,
                "reason": f"{emp['name']} is showing high burnout markers.",
                "benefits": [f"Reduces risk for {emp['name']}", "Balances team load"],
                "status": "pending",
                "managerId": emp["managerId"]
            })
            sid += 1

        if "High interruptions" in recs_str or "fragmentation" in recs_str.lower():
            to_peer = pick_balanced_peer(emp["managerId"], eid)
            suggestions.append({
                "id": sid,
                "task": "Schedule Focus Blocks",
                "from": emp["name"],
                "to": to_peer,
                "reason": "High fragmentation detected.",
                "benefits": ["Restores deep work", "Improves output"],
                "status": "pending",
                "managerId": emp["managerId"]
            })
            sid += 1

        if "After-hours" in recs_str or "weekend commits" in recs_str.lower():
            to_peer = pick_balanced_peer(emp["managerId"], eid)
            suggestions.append({
                "id": sid,
                "task": "Enforce Work-Life Boundary",
                "from": emp["name"],
                "to": to_peer,
                "reason": "After-hours/weekend work detected via Git and Slack.",
                "benefits": ["Prevents chronic fatigue", "Improves recovery"],
                "status": "pending",
                "managerId": emp["managerId"]
            })
            sid += 1

        if "Zoom" in recs_str or "speaking" in recs_str.lower():
            to_peer = pick_balanced_peer(emp["managerId"], eid)
            suggestions.append({
                "id": sid,
                "task": "Reduce Zoom Load",
                "from": emp["name"],
                "to": to_peer,
                "reason": "Excessive Zoom meetings or disengagement detected.",
                "benefits": ["Reduces meeting fatigue", "Improves focus time"],
                "status": "pending",
                "managerId": emp["managerId"]
            })
            sid += 1

    return suggestions

@app.get("/api/employees/{employee_id}/history")
def get_employee_history_simple(employee_id: str):
    """Get last 14 days of burnout/deep-work/sub-score history for frontend charts."""
    scores_df = load_csv("daily_scores.csv")
    if scores_df.empty:
        return []

    emp_scores = scores_df[scores_df["employee_id"] == employee_id]
    if emp_scores.empty:
        return []

    emp_scores = emp_scores.sort_values("date").tail(14)

    history = []
    for _, row in emp_scores.iterrows():
        b_prob = row.get("burnout_probability", 0.0)
        if pd.isna(b_prob):
            b_prob = 0.0

        deep = row.get("deep_work_index", 50)
        if pd.isna(deep):
            deep = 50

        frag = row.get("fragmentation_score", 0)
        if pd.isna(frag):
            frag = 0

        conn = row.get("connection_index", 50)
        if pd.isna(conn):
            conn = 50

        rec = row.get("recovery_debt", 0)
        if pd.isna(rec):
            rec = 0

        history.append({
            "date": row["date"],
            "burnoutIndex": round(b_prob * 10, 1),
            "deepWorkIndex": int(deep),
            "fragmentationScore": round(float(frag), 1),
            "connectionIndex": round(float(conn), 1),
            "recoveryDebt": round(float(rec), 1),
        })

    return history

@app.get("/api/ensemble/summary")
def get_ensemble_summary():
    """Get ensemble risk distribution summary."""
    ensemble_df = load_csv("ensemble_predictions.csv")
    if ensemble_df.empty:
        return {"distribution": {}, "models_available": []}

    latest = ensemble_df.sort_values("date").groupby("employee_id").last().reset_index()

    distribution = latest["risk_tier"].value_counts().to_dict()
    avg_confidence = float(latest["confidence"].mean()) if "confidence" in latest.columns else 0

    models = ["behavioral"]
    if "timeseries_prob" in latest.columns and latest["timeseries_prob"].notna().any():
        models.append("timeseries")
    if "lstm_prob" in latest.columns and latest["lstm_prob"].notna().any():
        models.append("lstm")
    if "is_anomaly" in latest.columns:
        models.append("anomaly")

    return {
        "distribution": distribution,
        "averageConfidence": round(avg_confidence, 4),
        "totalEmployees": len(latest),
        "modelsAvailable": models,
    }

@app.get("/api/health")
def health_check():
    """API health check showing available data files."""
    files = [
        "employees.csv", "daily_features.csv", "baselines.csv",
        "daily_scores.csv", "recommendations.csv", "manager_dashboard.csv",
        "timeseries_forecasts.csv", "anomaly_scores.csv",
        "lstm_predictions.csv", "ensemble_predictions.csv",
        "pulseiq_summary.csv", "pulseiq_narratives.csv",
    ]
    status = {}
    for f in files:
        path = os.path.join(DATA_DIR, f)
        status[f] = {
            "exists": os.path.exists(path),
            "size": os.path.getsize(path) if os.path.exists(path) else 0,
        }
    return {
        "status": "ok",
        "version": "5.0",
        "dataFiles": status,
    }
