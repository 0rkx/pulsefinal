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
    status: 'healthy' | 'warning' | 'critical';
    managerId: string;
    burnoutIndex: number;
    predictedBurnout: string;
    deepWorkIndex: number;
    // V5.0 ML sub-scores
    fragmentationScore: number;
    connectionIndex: number;
    recoveryDebt: number;
    drivingFactors: string;
    // Ensemble predictions
    ensembleProb: number | null;
    ensembleConfidence: number | null;
    riskTier: string | null;
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
    fragmentationScore: number;
    connectionIndex: number;
    recoveryDebt: number;
}

export interface Anomaly {
    date: string;
    isolationScore: number;
    triggerFeature: string;
    zScoreMax: number;
    patternShift: number;
}

export interface Forecast {
    currentProb: number;
    ewmaCurrent: number;
    forecast7dAvg: number;
    forecast14dAvg: number;
    forecast7dMax: number;
    forecast14dMax: number;
    trendDirection: string;
    numChangepoints: number;
    avgVolatility: number;
}

export interface Narrative {
    employeeId: string;
    name: string;
    ensembleProb: number;
    riskTier: string;
    narrative: string;
}

export interface EnsembleSummary {
    distribution: Record<string, number>;
    averageConfidence: number;
    totalEmployees: number;
    modelsAvailable: string[];
}
