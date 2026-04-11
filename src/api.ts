import { AppUser, EmployeeStat, Suggestion, EmployeeHistory, Anomaly, Forecast, Narrative, EnsembleSummary } from './types';

const API_BASE = 'http://localhost:8000/api';

export async function loginApi(username: string): Promise<AppUser | null> {
    try {
        const res = await fetch(`${API_BASE}/login?username=${username}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.error ? null : data;
    } catch (e) {
        console.error("Login Error:", e);
        return null;
    }
}

export async function fetchEmployees(managerId?: string): Promise<EmployeeStat[]> {
    try {
        const url = managerId ? `${API_BASE}/employees?manager_id=${managerId}` : `${API_BASE}/employees`;
        const res = await fetch(url);
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error("Fetch Employees Error:", e);
        return [];
    }
}

export async function fetchSuggestions(managerId?: string): Promise<Suggestion[]> {
    try {
        const url = managerId ? `${API_BASE}/suggestions?manager_id=${managerId}` : `${API_BASE}/suggestions`;
        const res = await fetch(url);
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error("Fetch Suggestions Error:", e);
        return [];
    }
}

export async function fetchEmployeeHistory(employeeId: string): Promise<EmployeeHistory[]> {
    try {
        const url = `${API_BASE}/employees/${employeeId}/history`;
        const res = await fetch(url);
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error("Fetch Employee History Error:", e);
        return [];
    }
}

export async function fetchAnomalies(employeeId: string): Promise<Anomaly[]> {
    try {
        const res = await fetch(`${API_BASE}/employee/${employeeId}/anomalies`);
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error("Fetch Anomalies Error:", e);
        return [];
    }
}

export async function fetchForecast(employeeId: string): Promise<Forecast | null> {
    try {
        const res = await fetch(`${API_BASE}/employee/${employeeId}/forecast`);
        if (!res.ok) return null;
        const data = await res.json();
        // Backend returns {} if no forecast available
        if (!data || Object.keys(data).length === 0) return null;
        return data;
    } catch (e) {
        console.error("Fetch Forecast Error:", e);
        return null;
    }
}

export async function fetchNarratives(): Promise<Narrative[]> {
    try {
        const res = await fetch(`${API_BASE}/narratives`);
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error("Fetch Narratives Error:", e);
        return [];
    }
}

export async function fetchEnsembleSummary(): Promise<EnsembleSummary | null> {
    try {
        const res = await fetch(`${API_BASE}/ensemble/summary`);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error("Fetch Ensemble Summary Error:", e);
        return null;
    }
}

export async function askPulse(query: string, managerId?: string): Promise<string> {
    try {
        const res = await fetch(`${API_BASE}/llm/ask_pulse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, manager_id: managerId })
        });
        if (!res.ok) return "Sorry, I am offline right now.";
        const data = await res.json();
        return data.response || data.error || "No response generated.";
    } catch (e) {
        console.error("Ask Pulse Error:", e);
        return "An error occurred connecting to the intelligence server.";
    }
}
