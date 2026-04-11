export interface AppUser {
    id: string;
    role: 'manager' | 'employee';
    name: string;
    password?: string;
    managerId?: string;
}

export interface EmployeeStat {
    id: string;
    name: string;
    role: string;
    productivity: number;
    burnout: number;
    status: 'healthy' | 'critical';
    managerId: string;
    burnoutIndex: number;
    predictedBurnout: string;
    deepWorkIndex: number;
}

export interface Suggestion {
    id: number;
    task: string;
    from: string;
    to: string;
    reason: string;
    benefits: string[];
    status: 'pending' | 'accepted' | 'rejected' | string;
    managerId: string;
}

export interface EmployeeHistory {
    date: string;
    burnoutIndex: number;
    deepWorkIndex: number;
}
