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

export interface FederatedClientMetric {
    client_id: string;
    name: string;
    train_loss: number;
    train_accuracy: number;
    val_auc: number;
    val_loss: number;
    train_samples: number;
    val_samples: number;
}

export interface FederatedRound {
    round: number;
    train_loss: number;
    train_accuracy: number;
    val_auc: number;
    participating_clients: number;
    total_clients: number;
    client_metrics: Record<string, FederatedClientMetric>;
}

export interface FederatedClientInfo {
    client_id: string;
    name: string;
    employees: string[];
    num_employees: number;
    train_samples: number;
    val_samples: number;
}

export interface FederatedGlobalModelInfo {
    architecture: string;
    input_shape: number[];
    total_parameters?: number;
    final_val_auc?: number;
    final_train_loss?: number;
    final_train_accuracy?: number;
    aggregation_strategy?: string;
    model_path?: string;
}

export interface FederatedStatusResponse {
    status: 'not_started' | 'training' | 'completed' | 'failed';
    current_round: number;
    total_rounds: number;
    current_stage: string;
    local_epochs?: number;
    batch_size?: number;
    num_clients: number;
    clients: FederatedClientInfo[];
    rounds: FederatedRound[];
    global_model: FederatedGlobalModelInfo;
    updated_at?: string;
}

