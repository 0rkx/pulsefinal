import React, { useState, useEffect } from 'react';
import { AlertTriangle, User, Flame, Timer, Target, ArrowRight, Zap, TrendingUp, TrendingDown, Minus, Check, X, Brain, LineChart as LineChartIcon, Shield, Waves, Link2, BatteryCharging, Sparkles, BarChart3, Cpu } from 'lucide-react';
import { AppUser, EmployeeStat, Suggestion, EmployeeHistory, Anomaly, Forecast, Narrative, EnsembleSummary } from '../types';
import { fetchEmployees, fetchSuggestions, fetchEmployeeHistory, fetchAnomalies, fetchForecast, fetchNarratives, fetchEnsembleSummary } from '../api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- Helpers ---
function TrendIcon({ direction }: { direction: string }) {
    if (direction === 'rising') return <TrendingUp className="w-4 h-4 text-rose-400" />;
    if (direction === 'falling') return <TrendingDown className="w-4 h-4 text-emerald-400" />;
    return <Minus className="w-4 h-4 text-zinc-400" />;
}

function trendLabel(d: string) {
    if (d === 'rising') return 'Rising';
    if (d === 'falling') return 'Falling';
    return 'Stable';
}

function trendColor(d: string) {
    if (d === 'rising') return 'text-rose-400';
    if (d === 'falling') return 'text-emerald-400';
    return 'text-zinc-400';
}

function RiskBadge({ tier }: { tier: string | null | undefined }) {
    if (!tier) return null;
    const colors: Record<string, string> = {
        CRITICAL: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        MEDIUM: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        LOW: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        MINIMAL: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    };
    const cls = colors[tier] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>{tier}</span>;
}

function statusColor(status: string) {
    if (status === 'critical') return 'text-rose-400';
    if (status === 'warning') return 'text-amber-400';
    return 'text-emerald-400';
}

function statusBg(status: string) {
    if (status === 'critical') return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    if (status === 'warning') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
}

function statusLabel(status: string) {
    if (status === 'critical') return 'At Risk (Critical)';
    if (status === 'warning') return 'Elevated Risk';
    return 'Optimal Capacity';
}

// --- Distribution bar for ensemble summary ---
function DistributionBar({ distribution }: { distribution: Record<string, number> }) {
    const tiers = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL'];
    const tierColors: Record<string, string> = {
        CRITICAL: 'bg-rose-500',
        HIGH: 'bg-orange-500',
        MEDIUM: 'bg-amber-500',
        LOW: 'bg-emerald-500',
        MINIMAL: 'bg-sky-500',
    };
    const total = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;

    return (
        <div className="w-full">
            <div className="flex w-full h-3 rounded-full overflow-hidden bg-zinc-800">
                {tiers.map(t => {
                    const count = distribution[t] || 0;
                    if (count === 0) return null;
                    return (
                        <div
                            key={t}
                            className={`${tierColors[t]} transition-all duration-500`}
                            style={{ width: `${(count / total) * 100}%` }}
                            title={`${t}: ${count}`}
                        ></div>
                    );
                })}
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
                {tiers.map(t => {
                    const count = distribution[t] || 0;
                    if (count === 0) return null;
                    return (
                        <div key={t} className="flex items-center gap-1.5 text-xs text-zinc-400">
                            <div className={`w-2 h-2 rounded-full ${tierColors[t]}`}></div>
                            <span>{t}: <span className="text-zinc-200 font-medium">{count}</span></span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function ManagerDashboard({ user }: { user: AppUser }) {
    const [alertsDismissed, setAlertsDismissed] = useState(false);
    const [teamEmployees, setTeamEmployees] = useState<EmployeeStat[]>([]);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
    const [history, setHistory] = useState<EmployeeHistory[]>([]);
    const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
    const [forecast, setForecast] = useState<Forecast | null>(null);
    const [narrative, setNarrative] = useState<Narrative | null>(null);
    const [ensembleSummary, setEnsembleSummary] = useState<EnsembleSummary | null>(null);
    const [allNarratives, setAllNarratives] = useState<Narrative[]>([]);
    const [sortOrder, setSortOrder] = useState<'busy' | 'free'>('busy');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const [emps, suggs, esummary, narrs] = await Promise.all([
                fetchEmployees(user.id),
                fetchSuggestions(user.id),
                fetchEnsembleSummary(),
                fetchNarratives(),
            ]);
            setTeamEmployees(emps);
            setSuggestions(suggs);
            setEnsembleSummary(esummary);
            setAllNarratives(narrs);
            if (emps.length > 0) {
                setSelectedEmpId(emps[0].id);
            }
            setLoading(false);
        }
        loadData();
    }, [user.id]);

    // Load per-employee drill-down data when selection changes
    useEffect(() => {
        if (selectedEmpId) {
            Promise.all([
                fetchEmployeeHistory(selectedEmpId),
                fetchAnomalies(selectedEmpId),
                fetchForecast(selectedEmpId),
            ]).then(([hist, anom, fc]) => {
                setHistory(hist.length > 0 ? hist : [
                    { date: 'Mon', burnoutIndex: 2.0, deepWorkIndex: 80, fragmentationScore: 3, connectionIndex: 60, recoveryDebt: 1 },
                    { date: 'Tue', burnoutIndex: 2.5, deepWorkIndex: 75, fragmentationScore: 4, connectionIndex: 55, recoveryDebt: 1.5 },
                    { date: 'Wed', burnoutIndex: 3.5, deepWorkIndex: 60, fragmentationScore: 6, connectionIndex: 50, recoveryDebt: 2 },
                    { date: 'Thu', burnoutIndex: 3.2, deepWorkIndex: 70, fragmentationScore: 5, connectionIndex: 52, recoveryDebt: 1.8 },
                    { date: 'Fri', burnoutIndex: 4.1, deepWorkIndex: 50, fragmentationScore: 7, connectionIndex: 45, recoveryDebt: 3 },
                ]);
                setAnomalies(anom);
                setForecast(fc);

                const narr = allNarratives.find(n => n.employeeId.toLowerCase() === selectedEmpId.toLowerCase());
                setNarrative(narr || null);
            });
        }
    }, [selectedEmpId, allNarratives]);

    const handleSuggestionAction = (id: number, action: string) => {
        setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: action } : s));
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 text-zinc-500">
                <div className="w-8 h-8 border-4 border-zinc-800 border-t-emerald-500 rounded-full animate-spin"></div>
                <span className="ml-3">Loading Intelligence...</span>
            </div>
        );
    }

    const selectedEmp = teamEmployees.find(e => e.id === selectedEmpId);
    const criticalEmps = teamEmployees.filter(e => e.status === 'critical');
    const warningEmps = teamEmployees.filter(e => e.status === 'warning');

    const sortedEmployees = [...teamEmployees].sort((a, b) => {
        if (sortOrder === 'busy') {
            return b.burnout - a.burnout || ((b.fragmentationScore ?? 0) - (a.fragmentationScore ?? 0));
        } else {
            return a.burnout - b.burnout || ((a.fragmentationScore ?? 0) - (b.fragmentationScore ?? 0));
        }
    });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Critical/Warning Alerts */}
            {!alertsDismissed && (criticalEmps.length > 0 || warningEmps.length > 0) && (
                <div className="bg-rose-950/50 border border-rose-900/50 p-4 rounded-xl flex items-start justify-between shadow-lg shadow-rose-900/10">
                    <div className="flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5" />
                        <div>
                            <h3 className="text-rose-400 font-semibold">Burnout Risk Alerts</h3>
                            {criticalEmps.map(e => (
                                <p key={e.id} className="text-sm text-rose-300 mt-1">
                                    <span className="font-semibold">{e.name}</span> is at {e.burnout}% burnout risk
                                    {e.riskTier && <> (ensemble tier: <span className="font-semibold">{e.riskTier}</span>)</>}
                                    {e.drivingFactors && <> — factors: {e.drivingFactors.split(/[;,]/).map(s => s.trim()).filter(Boolean).slice(0, 2).join(', ')}</>}
                                </p>
                            ))}
                            {warningEmps.map(e => (
                                <p key={e.id} className="text-sm text-amber-300 mt-1">
                                    <span className="font-semibold">{e.name}</span> is at elevated risk ({e.burnout}%)
                                    {e.riskTier && <> — tier: {e.riskTier}</>}
                                </p>
                            ))}
                        </div>
                    </div>
                    <button onClick={() => setAlertsDismissed(true)} className="text-rose-500 hover:text-rose-300 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Ensemble Summary Panel */}
            {ensembleSummary && Object.keys(ensembleSummary.distribution || {}).length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-violet-400" /> Ensemble Intelligence Summary
                        </h2>
                        <div className="flex items-center gap-3">
                            {ensembleSummary.averageConfidence != null && (
                                <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                                    <Shield className="w-4 h-4 text-violet-400" />
                                    <span>Avg Confidence: <span className="text-violet-400 font-bold">{(ensembleSummary.averageConfidence * 100).toFixed(1)}%</span></span>
                                </div>
                            )}
                            {ensembleSummary.totalEmployees != null && (
                                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded font-medium">{ensembleSummary.totalEmployees} employees</span>
                            )}
                        </div>
                    </div>
                    <DistributionBar distribution={ensembleSummary.distribution} />
                    {(ensembleSummary.modelsAvailable || []).length > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                            <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                            <span className="text-xs text-zinc-500">Active models:</span>
                            {ensembleSummary.modelsAvailable.map(m => (
                                <span key={m} className="text-xs font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">{m}</span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Team Sidebar */}
                <div className="col-span-1 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <User className="w-5 h-5 text-zinc-400" /> Team Overview
                        </h2>
                        <select 
                            value={sortOrder} 
                            onChange={(e) => setSortOrder(e.target.value as 'busy' | 'free')}
                            className="bg-zinc-800 text-xs text-zinc-300 border border-zinc-700 rounded-md py-1 px-2 outline-none focus:border-zinc-500"
                        >
                            <option value="busy">Most Busy</option>
                            <option value="free">Most Free</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-3">
                        {sortedEmployees.map((emp) => (
                            <button
                                key={emp.id}
                                onClick={() => setSelectedEmpId(emp.id)}
                                className={`text-left p-4 rounded-xl border transition-all ${selectedEmpId === emp.id
                                    ? 'bg-zinc-800 border-zinc-600 shadow-md transform scale-[1.02]'
                                    : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/50'
                                    }`}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-lg">{emp.name}</span>
                                        <RiskBadge tier={emp.riskTier} />
                                    </div>
                                    {(emp.status === 'critical' || emp.status === 'warning') && (
                                        <span className="flex h-3 w-3 relative">
                                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${emp.status === 'critical' ? 'bg-rose-400' : 'bg-amber-400'} opacity-75`}></span>
                                            <span className={`relative inline-flex rounded-full h-3 w-3 ${emp.status === 'critical' ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-sm mt-3">
                                    <div>
                                        <div className="text-zinc-500 mb-0.5 text-[10px] uppercase tracking-wider">Burnout</div>
                                        <div className={`${emp.burnout > 70 ? 'text-rose-400 font-bold' : emp.burnout > 40 ? 'text-amber-400 font-medium' : 'text-emerald-400 font-medium'}`}>{emp.burnout}%</div>
                                    </div>
                                    <div>
                                        <div className="text-zinc-500 mb-0.5 text-[10px] uppercase tracking-wider">Frag.</div>
                                        <div className={`${(emp.fragmentationScore ?? 0) > 70 ? 'text-rose-400' : (emp.fragmentationScore ?? 0) > 50 ? 'text-amber-400' : 'text-emerald-400'} font-medium`}>{emp.fragmentationScore?.toFixed(1) ?? '—'}</div>
                                    </div>
                                    <div>
                                        <div className="text-zinc-500 mb-0.5 text-[10px] uppercase tracking-wider">Prod.</div>
                                        <div className="text-emerald-400 font-medium">{emp.productivity}%</div>
                                    </div>
                                </div>
                                {emp.ensembleProb !== null && emp.ensembleProb !== undefined && (
                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
                                        <Shield className="w-3 h-3 text-violet-400" />
                                        <span>Ensemble: <span className="text-violet-400 font-medium">{(emp.ensembleProb * 100).toFixed(1)}%</span></span>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Detail Panel */}
                <div className="col-span-1 lg:col-span-2 space-y-6">
                    {selectedEmp && (
                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-3xl font-bold text-white">{selectedEmp.name}</h2>
                                        <RiskBadge tier={selectedEmp.riskTier} />
                                    </div>
                                    <p className="text-zinc-400 font-medium mt-1">{selectedEmp.role}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-zinc-500 uppercase tracking-wider mb-1">Current Status</div>
                                    <div className={`font-semibold px-3 py-1 rounded-full text-sm inline-block border ${statusBg(selectedEmp.status)}`}>
                                        {statusLabel(selectedEmp.status)}
                                    </div>
                                </div>
                            </div>

                            {/* 6-metric grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6 pt-6 border-t border-zinc-800/50">
                                <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                                    <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider mb-2"><Flame className="w-3.5 h-3.5" /> Burnout</div>
                                    <div className={`text-2xl font-medium ${statusColor(selectedEmp.status)}`}>{selectedEmp.burnoutIndex} <span className="text-sm text-zinc-500">/ 10</span></div>
                                    {selectedEmp.ensembleProb !== null && selectedEmp.ensembleProb !== undefined && (
                                        <div className="mt-1 text-xs text-zinc-500">
                                            Ensemble: <span className="text-violet-400 font-medium">{(selectedEmp.ensembleProb * 100).toFixed(1)}%</span>
                                            {selectedEmp.ensembleConfidence !== null && <span className="ml-1">({(selectedEmp.ensembleConfidence * 100).toFixed(0)}% conf)</span>}
                                        </div>
                                    )}
                                </div>
                                <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                                    <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider mb-2"><Timer className="w-3.5 h-3.5" /> Time to Burnout</div>
                                    <div className={`text-2xl font-medium ${statusColor(selectedEmp.status)}`}>{selectedEmp.predictedBurnout}</div>
                                    {forecast && (
                                        <div className="mt-1 flex items-center gap-1.5 text-xs">
                                            <TrendIcon direction={forecast.trendDirection} />
                                            <span className={trendColor(forecast.trendDirection)}>{trendLabel(forecast.trendDirection)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                                    <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider mb-2"><Target className="w-3.5 h-3.5" /> Deep Work</div>
                                    <div className="text-2xl font-medium text-blue-400">{selectedEmp.deepWorkIndex} <span className="text-sm text-zinc-500">/ 100</span></div>
                                </div>
                                <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                                    <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider mb-2"><Waves className="w-3.5 h-3.5" /> Fragmentation</div>
                                    <div className={`text-2xl font-medium ${(selectedEmp.fragmentationScore ?? 0) > 70 ? 'text-rose-400' : (selectedEmp.fragmentationScore ?? 0) > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {selectedEmp.fragmentationScore?.toFixed(1) ?? '—'} <span className="text-sm text-zinc-500">/ 100</span>
                                    </div>
                                </div>
                                <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                                    <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider mb-2"><Link2 className="w-3.5 h-3.5" /> Connection</div>
                                    <div className="text-2xl font-medium text-cyan-400">{selectedEmp.connectionIndex?.toFixed(1) ?? '—'} <span className="text-sm text-zinc-500">/ 100</span></div>
                                </div>
                                <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                                    <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider mb-2"><BatteryCharging className="w-3.5 h-3.5" /> Recovery Debt</div>
                                    <div className={`text-2xl font-medium ${(selectedEmp.recoveryDebt ?? 0) > 5 ? 'text-rose-400' : (selectedEmp.recoveryDebt ?? 0) > 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {selectedEmp.recoveryDebt?.toFixed(1) ?? '—'} <span className="text-sm text-zinc-500">hrs</span>
                                    </div>
                                </div>
                            </div>

                            {/* Driving Factors */}
                            {selectedEmp.drivingFactors && selectedEmp.drivingFactors.trim().length > 0 && (
                                <div className="mt-5 flex items-start gap-2 flex-wrap">
                                    <Sparkles className="w-4 h-4 text-amber-400 mt-1 shrink-0" />
                                    {selectedEmp.drivingFactors.split(/[;,]/).map(f => f.trim()).filter(Boolean).map((f, i) => (
                                        <span key={i} className="text-xs bg-zinc-950 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full">
                                            {f}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Forecast Section */}
                            {forecast && (
                                <div className="mt-6 pt-6 border-t border-zinc-800/50">
                                    <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-zinc-300">
                                        <TrendingUp className="w-4 h-4 text-violet-400" /> Burnout Forecast
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="bg-zinc-950/40 p-3 rounded-lg border border-zinc-800">
                                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Current</div>
                                            <div className="text-lg font-bold text-white mt-0.5">{(forecast.currentProb * 100).toFixed(1)}%</div>
                                        </div>
                                        <div className="bg-zinc-950/40 p-3 rounded-lg border border-zinc-800">
                                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">7-Day Avg</div>
                                            <div className="text-lg font-bold text-amber-400 mt-0.5">{(forecast.forecast7dAvg * 100).toFixed(1)}%</div>
                                        </div>
                                        <div className="bg-zinc-950/40 p-3 rounded-lg border border-zinc-800">
                                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">14-Day Avg</div>
                                            <div className="text-lg font-bold text-rose-400 mt-0.5">{(forecast.forecast14dAvg * 100).toFixed(1)}%</div>
                                        </div>
                                        <div className="bg-zinc-950/40 p-3 rounded-lg border border-zinc-800">
                                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Volatility</div>
                                            <div className="text-lg font-bold text-zinc-300 mt-0.5">{forecast.avgVolatility.toFixed(3)}</div>
                                            <div className="text-[10px] text-zinc-500">{forecast.numChangepoints} changepoints</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 14-Day Trend Chart */}
                            <div className="mt-6 pt-6 border-t border-zinc-800/50">
                                <h3 className="text-base font-semibold mb-4 flex items-center gap-2 text-zinc-300">
                                    <LineChartIcon className="w-4 h-4 text-emerald-500" /> 14-Day Multi-Signal Trend
                                </h3>
                                <div className="h-56 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorBurnoutMgr" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorDeepWorkMgr" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorFragMgr" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                            <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.5rem', color: '#f4f4f5' }}
                                                itemStyle={{ fontWeight: 500 }}
                                            />
                                            <Area type="monotone" dataKey="burnoutIndex" name="Burnout Risk" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorBurnoutMgr)" />
                                            <Area type="monotone" dataKey="deepWorkIndex" name="Deep Work %" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorDeepWorkMgr)" />
                                            <Area type="monotone" dataKey="fragmentationScore" name="Fragmentation" stroke="#f59e0b" strokeWidth={1.5} fillOpacity={1} fill="url(#colorFragMgr)" strokeDasharray="4 2" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Anomaly alerts for selected employee */}
                            {anomalies.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-zinc-800/50">
                                    <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-zinc-300">
                                        <AlertTriangle className="w-4 h-4 text-amber-500" /> Anomaly Detections ({anomalies.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {anomalies.slice(-3).reverse().map((a, i) => (
                                            <div key={i} className="flex items-center gap-3 p-2.5 bg-zinc-950/50 rounded-lg border border-zinc-800 text-sm">
                                                <div className={`w-2 h-2 rounded-full shrink-0 ${a.isolationScore > 0.7 ? 'bg-rose-500' : a.isolationScore > 0.4 ? 'bg-amber-500' : 'bg-yellow-500'}`}></div>
                                                <span className="text-zinc-400 font-mono text-xs">{a.date}</span>
                                                <span className="text-zinc-300 truncate flex-1">{a.triggerFeature || 'Pattern shift'}</span>
                                                <span className="text-xs text-zinc-500">z:{a.zScoreMax.toFixed(1)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* AI Narrative */}
                            {narrative && (
                                <div className="mt-6 pt-6 border-t border-zinc-800/50">
                                    <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-zinc-300">
                                        <Brain className="w-4 h-4 text-emerald-500" /> AI Risk Narrative
                                    </h3>
                                    <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50 italic">
                                        "{narrative.narrative}"
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* AI Task Reallocation */}
                    <div>
                        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                            <Brain className="w-5 h-5 text-emerald-500" /> AI Task Reallocation
                        </h2>
                        {suggestions.length === 0 && (
                            <p className="text-zinc-500 text-sm italic">No urgent reallocations needed at this time.</p>
                        )}
                        <div className="space-y-4">
                            {suggestions.map((s) => (
                                <div key={s.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col md:flex-row gap-4 justify-between items-start md:items-center shadow-md hover:shadow-lg transition-shadow">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-md text-xs font-mono font-medium border border-zinc-700">{s.task}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-lg mb-2 mt-3">
                                            <span className="font-semibold text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded">{s.from}</span>
                                            <ArrowRight className="w-5 h-5 text-zinc-500" />
                                            <span className="font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">{s.to}</span>
                                        </div>
                                        <p className="text-sm text-zinc-400 mt-3 flex items-start gap-2 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                                            <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                            {s.reason}
                                        </p>
                                        <div className="mt-4 flex gap-2 flex-wrap">
                                            {s.benefits.map((b, idx) => (
                                                <span key={idx} className="text-xs font-medium bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                                    <TrendingUp className="w-3 h-3 text-emerald-500" /> {b}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {s.status === 'pending' ? (
                                        <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                                            <button onClick={() => handleSuggestionAction(s.id, 'rejected')} className="flex-1 md:flex-none px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2">
                                                <X className="w-4 h-4" /> Reject
                                            </button>
                                            <button onClick={() => handleSuggestionAction(s.id, 'accepted')} className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                                <Check className="w-4 h-4" /> Apply Fix
                                            </button>
                                        </div>
                                    ) : (
                                        <div className={`px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 ${s.status === 'accepted' ? 'bg-emerald-950/30 text-emerald-500 border-emerald-900/50' : 'bg-zinc-800/50 text-zinc-500 border-zinc-800'
                                            }`}>
                                            {s.status === 'accepted' ? <><Check className="w-4 h-4" /> Applied Successfully</> : <><X className="w-4 h-4" /> Suggestion Dismissed</>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
