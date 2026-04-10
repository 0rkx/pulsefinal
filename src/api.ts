import { AppUser, EmployeeStat, Suggestion } from './types';

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
