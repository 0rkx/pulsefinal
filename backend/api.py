import os
import pandas as pd
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any

app = FastAPI()

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
    'm1': { "id": 'm1', "role": 'manager', "name": 'Manager 1 (M1)', "password": 'password' },
    'm2': { "id": 'm2', "role": 'manager', "name": 'Manager 2 (M2)', "password": 'password' },
}

def get_employees_data():
    emp_df = load_csv("employees.csv")
    view_df = load_csv("manager_employees_view.csv")
    scores_df = load_csv("daily_scores.csv")
    
    if emp_df.empty or view_df.empty or scores_df.empty:
        return []

    # Get latest scores per employee
    latest_scores = scores_df.sort_values("date").groupby("employee_id").last().reset_index()
    
    merged = pd.merge(emp_df, view_df, on="employee_id", how="left")
    merged = pd.merge(merged, latest_scores, on="employee_id", how="left", suffixes=("", "_score"))
    
    employees = []
    
    for _, row in merged.iterrows():
        # Assign manager based on team
        manager_id = 'm1' if row.get("team") == "Engineering" else 'm2'
        
        # Calculate simulated productivity based on deep work and capacity
        cap = row.get("capacity_hours", 30)
        productivity = min(100, int((cap / 30.0) * 100))
        
        # Default predictions
        forecast = row.get("forecast_days_until_critical", "Stable")
        if pd.isna(forecast) or forecast == "":
            forecast = "Stable"
        elif isinstance(forecast, (int, float)):
            forecast = f"{int(forecast)} Days"
            
        b_prob = row.get("burnout_probability", 0.0)
        if pd.isna(b_prob):
            b_prob = 0.0
            
        status = 'critical' if row.get("risk_level") == "CRITICAL" else 'healthy'
            
        deep_idx = row.get("deep_work_index", 50)
        if pd.isna(deep_idx):
             deep_idx = 50
             
        # Create AppUser schema implicitly if querying users, but this is the EmployeeStat model
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
            "deepWorkIndex": int(deep_idx)
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
    user = users.get(username.lower())
    if not user:
        # Check by name matching if not found by ID
        for u in users.values():
            if username.lower() in u["name"].lower():
                return u
        return {"error": "User not found"}
    return user

@app.get("/api/employees")
def get_employees(manager_id: str = None):
    all_emps = get_employees_data()
    if manager_id:
        return [e for e in all_emps if e["managerId"] == manager_id]
    return all_emps

@app.get("/api/suggestions")
def get_suggestions(manager_id: str = None):
    recs_df = load_csv("recommendations.csv")
    if recs_df.empty:
        return []

    # Get latest recommendations per employee
    latest_recs = recs_df.sort_values("date").groupby("employee_id").last().reset_index()
    
    # We need to map recommendations to tasks.
    # The frontend expects: { id, task, from, to, reason, benefits, status, managerId }
    emps = get_employees_data()
    emp_map = {e["id"]: e for e in emps}
    
    suggestions = []
    sid = 1
    
    for _, row in latest_recs.iterrows():
        eid = row["employee_id"]
        emp = emp_map.get(eid)
        if not emp:
            continue
            
        if manager_id and emp["managerId"] != manager_id:
            continue
            
        recs_str = str(row.get("recommendations", ""))
        if "High burnout risk" in recs_str or "Critical" in recs_str or "critical" in recs_str:
            # Create a reallocation suggestion
            task_name = "Workload Reallocation"
            # Find a healthy employee under the same manager
            healthy_peers = [e for e in emps if e["managerId"] == emp["managerId"] and e["status"] == "healthy" and e["id"] != eid]
            to_name = healthy_peers[0]["name"] if healthy_peers else "Available Peer"
            
            suggestions.append({
                "id": sid,
                "task": task_name,
                "from": emp["name"],
                "to": to_name,
                "reason": f"{emp['name']} is showing high burnout markers.",
                "benefits": [f"Reduces risk for {emp['name']}", "Balances team load"],
                "status": "pending",
                "managerId": emp["managerId"]
            })
            sid += 1
            
        if "High interruptions" in recs_str or "fragmentation" in recs_str.lower():
            suggestions.append({
                "id": sid,
                "task": "Schedule Focus Blocks",
                "from": emp["name"],
                "to": "Calendar/System",
                "reason": "High fragmentation detected.",
                "benefits": ["Restores deep work", "Improves output"],
                "status": "pending",
                "managerId": emp["managerId"]
            })
            sid += 1

    return suggestions
