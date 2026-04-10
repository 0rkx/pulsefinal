import csv
from collections import defaultdict

INPUT_FILE = "pulseiq_data/daily_scores.csv"
OUTPUT_FILE = "pulseiq_data/manager_dashboard.csv"
EMPLOYEE_OUTPUT = "pulseiq_data/manager_employees_view.csv"


def main():
    with open(INPUT_FILE) as f:
        rows = list(csv.DictReader(f))

    latest_by_emp = {}

    # -----------------------------
    # Get latest record per employee
    # -----------------------------
    for r in rows:
        eid = r["employee_id"]
        if eid not in latest_by_emp or r["date"] > latest_by_emp[eid]["date"]:
            latest_by_emp[eid] = r

    burnout_levels = []
    high_risk = 0
    medium_risk = 0
    low_risk = 0
    factors_count = defaultdict(int)

    high_risk_employees = []

    # -----------------------------
    # Aggregate metrics
    # -----------------------------
    for r in latest_by_emp.values():
        b = float(r["burnout_probability"] or 0)
        burnout_levels.append(b)

        if b > 0.7:
            high_risk += 1
            high_risk_employees.append(r["employee_id"])
        elif b > 0.5:
            medium_risk += 1
        else:
            low_risk += 1

        factors = r.get("driving_factors", "").split(",")
        for f in factors:
            if f:
                factors_count[f] += 1

    total_employees = len(latest_by_emp)
    avg_burnout = sum(burnout_levels) / total_employees if total_employees else 0
    system_health = round((1 - avg_burnout) * 100, 1)

    top_issues = sorted(factors_count.items(), key=lambda x: x[1], reverse=True)

    # -----------------------------
    # Alerts
    # -----------------------------
    alerts = []

    if high_risk > 0:
        alerts.append(f"{high_risk} employees at high burnout risk")

    if factors_count.get("fragmentation", 0) > total_employees * 0.4:
        alerts.append("High interruptions/meeting load across team")

    if factors_count.get("recovery_debt", 0) > total_employees * 0.3:
        alerts.append("Team not recovering adequately")

    # -----------------------------
    # Team Recommendations
    # -----------------------------
    team_recs = []

    if factors_count.get("fragmentation", 0) > total_employees * 0.4:
        team_recs.append("Reduce meetings across team")

    if factors_count.get("recovery_debt", 0) > total_employees * 0.3:
        team_recs.append("Encourage time off / recovery days")

    if high_risk > 0:
        team_recs.append("Rebalance workload for high-risk employees")

    if not team_recs:
        team_recs.append("Team operating normally")

    # -----------------------------
    # WRITE MANAGER DASHBOARD
    # -----------------------------
    with open(OUTPUT_FILE, "w", newline="") as f:
        writer = csv.writer(f)

        # Summary
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Total Employees", total_employees])
        writer.writerow(["System Health (%)", system_health])
        writer.writerow(["Avg Burnout", round(avg_burnout, 2)])
        writer.writerow(["High Risk Employees", high_risk])
        writer.writerow(["Medium Risk Employees", medium_risk])
        writer.writerow(["Low Risk Employees", low_risk])

        # Top Issues
        writer.writerow([])
        writer.writerow(["Top Issues", "Count"])
        for issue, count in top_issues[:5]:
            writer.writerow([issue, count])

        # Alerts
        writer.writerow([])
        writer.writerow(["Alerts"])
        for a in alerts:
            writer.writerow([a])

        # Team Recommendations
        writer.writerow([])
        writer.writerow(["Team Recommendations"])
        for r in team_recs:
            writer.writerow([r])

    print(f"Manager insights saved to {OUTPUT_FILE}")

    # -----------------------------
    # WRITE EMPLOYEE VIEW (for UI)
    # -----------------------------
    with open(EMPLOYEE_OUTPUT, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "employee_id",
            "name",
            "burnout_probability",
            "status",
            "capacity_hours",
            "risk_level"
        ])

        for r in latest_by_emp.values():
            b = float(r["burnout_probability"] or 0)

            if b > 0.7:
                risk = "CRITICAL"
                status = "Critical recovery debt"
                capacity = 2
            elif b > 0.5:
                risk = "WARNING"
                status = "Approaching limit"
                capacity = 12
            else:
                risk = "HEALTHY"
                status = "Ready for sprint"
                capacity = 30

            writer.writerow([
                r["employee_id"],
                r["name"],
                round(b, 2),
                status,
                capacity,
                risk
            ])

    print(f"Manager employee view saved to {EMPLOYEE_OUTPUT}")


if __name__ == "__main__":
    main()
