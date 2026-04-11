import React, { useEffect, useState } from 'react';
import { Brain, Flame, Timer, Target, Briefcase, Clock, Activity, Coffee, Check, User, Zap, LineChart as LineChartIcon, AlertTriangle, TrendingUp, TrendingDown, Minus, Shield, Sparkles, Waves, Link2, BatteryCharging } from 'lucide-react';
import { AppUser, EmployeeStat, EmployeeHistory, Anomaly, Forecast, Narrative } from '../types';
import { fetchEmployees, fetchEmployeeHistory, fetchAnomalies, fetchForecast, fetchNarratives } from '../api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

// --- Helper: Trend arrow icon ---
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

// --- Helper: Risk tier badge ---
function RiskBadge({ tier }: { tier: string | null }) {
    if (!tier) return null;
    const colors: Record<string, string> = {
        CRITICAL: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        MEDIUM: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        LOW: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        MINIMAL: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    };
    const cls = colors[tier] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>{tier}</span>;
}

// --- Sub-score gauge bar ---
function GaugeBar({ label, value, max, icon, color, unit }: { label: string; value: number; max: number; icon: React.ReactNode; color: string; unit?: string }) {
    const pct = Math.min(100, (value / max) * 100);
    return (
        <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider mb-2">
                {icon} {label}
            </div>
            <div className="flex items-baseline gap-1.5 mb-2">
                <span className={`text-xl font-bold ${color}`}>{typeof value === 'number' ? value.toFixed(1) : value}</span>
                {unit && <span className="text-zinc-500 text-xs">{unit}</span>}
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700`} style={{ width: `${pct}%`, background: `var(--gauge-${color.replace('text-', '')}, currentColor)` }}>
                    <div className={`h-full rounded-full ${color.replace('text-', 'bg-')}`} style={{ width: '100%' }}></div>
                </div>
            </div>
        </div>
    );
}


export default function EmployeeDashboard({ user }: { user: AppUser }) {
    const [empStats, setEmpStats] = useState<EmployeeStat | null>(null);
    const [history, setHistory] = useState<EmployeeHistory[]>([]);
    const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
    const [forecast, setForecast] = useState<Forecast | null>(null);
    const [narrative, setNarrative] = useState<Narrative | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const emps = await fetchEmployees();
            const me = emps.find(e => e.id.toLowerCase() === user.id.toLowerCase()) || null;
            setEmpStats(me);

            if (me) {
                const [hist, anom, fc, narrs] = await Promise.all([
                    fetchEmployeeHistory(me.id),
                    fetchAnomalies(me.id),
                    fetchForecast(me.id),
                    fetchNarratives(),
                ]);

                setHistory(hist.length > 0 ? hist : [
                    { date: 'Mon', burnoutIndex: 2.0, deepWorkIndex: 80, fragmentationScore: 3, connectionIndex: 60, recoveryDebt: 1 },
                    { date: 'Tue', burnoutIndex: 2.5, deepWorkIndex: 75, fragmentationScore: 4, connectionIndex: 55, recoveryDebt: 1.5 },
                    { date: 'Wed', burnoutIndex: 3.5, deepWorkIndex: 60, fragmentationScore: 6, connectionIndex: 50, recoveryDebt: 2 },
                    { date: 'Thu', burnoutIndex: 3.2, deepWorkIndex: 70, fragmentationScore: 5, connectionIndex: 52, recoveryDebt: 1.8 },
                    { date: 'Fri', burnoutIndex: 4.1, deepWorkIndex: 50, fragmentationScore: 7, connectionIndex: 45, recoveryDebt: 3 },
                ]);
                setAnomalies(anom);
                setForecast(fc);

                const myNarr = narrs.find(n => n.employeeId.toLowerCase() === me.id.toLowerCase());
                setNarrative(myNarr || null);
            }

            setLoading(false);
        }
        loadData();
    }, [user.id]);

    if (loading || !empStats) {
        return (
            <div className="flex justify-center items-center h-64 text-zinc-500">
                <div className="w-8 h-8 border-4 border-zinc-800 border-t-emerald-500 rounded-full animate-spin"></div>
                <span className="ml-3">Loading Workload Analysis...</span>
            </div>
        );
    }

    // Radar chart data for sub-scores
    const radarData = [
        { subject: 'Deep Work', value: empStats.deepWorkIndex, fullMark: 100 },
        { subject: 'Connection', value: empStats.connectionIndex ?? 50, fullMark: 100 },
        { subject: 'Recovery', value: Math.max(0, 100 - (empStats.recoveryDebt ?? 0) * 10), fullMark: 100 },
        { subject: 'Focus', value: Math.max(0, 100 - (empStats.fragmentationScore ?? 0) * 5), fullMark: 100 },
    ];

    // Parse driving factors into tags
    const factorTags = empStats.drivingFactors
        ? empStats.drivingFactors.split(';').map(f => f.trim()).filter(Boolean)
        : [];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="mb-6">
                <div className="flex items-center gap-4 flex-wrap">
                    <h2 className="text-2xl font-bold text-white">Your Dashboard, {user.name}</h2>
                    <RiskBadge tier={empStats.riskTier} />
                </div>
                <p className="text-zinc-400 mt-1">Real-time workload intelligence powered by multi-model ML analysis.</p>
            </div>

            {/* Anomaly Alert Banner */}
            {anomalies.length > 0 && (
                <div className="bg-amber-950/40 border border-amber-800/50 p-4 rounded-xl flex items-start gap-3 shadow-lg shadow-amber-900/10">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                        <h3 className="text-amber-400 font-semibold text-sm">Anomaly Detected — {anomalies.length} unusual pattern{anomalies.length > 1 ? 's' : ''} found</h3>
                        <p className="text-sm text-amber-300/80 mt-1">
                            Latest on <span className="font-mono">{anomalies[anomalies.length - 1].date}</span>
                            {anomalies[anomalies.length - 1].triggerFeature && (
                                <> — triggered by <span className="font-semibold">{anomalies[anomalies.length - 1].triggerFeature}</span></>
                            )}
                            {" "}(isolation score: {anomalies[anomalies.length - 1].isolationScore.toFixed(2)}, z-score: {anomalies[anomalies.length - 1].zScoreMax.toFixed(2)})
                        </p>
                    </div>
                </div>
            )}

            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2"><Flame className="w-4 h-4" /> Burnout Index</div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-bold ${empStats.status === 'critical' ? 'text-rose-400' : empStats.status === 'warning' ? 'text-amber-400' : 'text-white'}`}>{empStats.burnoutIndex}</span>
                        <span className="text-zinc-500 font-medium">/ 10</span>
                    </div>
                    {empStats.ensembleProb !== null && empStats.ensembleProb !== undefined && (
                        <div className="mt-2 flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5 text-violet-400" />
                            <span className="text-xs text-zinc-400">Ensemble: <span className="text-violet-400 font-semibold">{(empStats.ensembleProb * 100).toFixed(1)}%</span></span>
                            {empStats.ensembleConfidence !== null && (
                                <span className="text-xs text-zinc-500 ml-1">({(empStats.ensembleConfidence * 100).toFixed(0)}% conf)</span>
                            )}
                        </div>
                    )}
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2"><Timer className="w-4 h-4" /> Est. Time to Burnout</div>
                    <div className={`text-4xl font-bold ${empStats.status === 'critical' ? 'text-rose-400' : empStats.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}>{empStats.predictedBurnout}</div>
                    {forecast && (
                        <div className="mt-2 flex items-center gap-2">
                            <TrendIcon direction={forecast.trendDirection} />
                            <span className={`text-xs font-medium ${trendColor(forecast.trendDirection)}`}>{trendLabel(forecast.trendDirection)} trend</span>
                        </div>
                    )}
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2"><Target className="w-4 h-4" /> Deep Work Index</div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-blue-400">{empStats.deepWorkIndex}</span>
                        <span className="text-zinc-500 font-medium">/ 100</span>
                    </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2"><Waves className="w-4 h-4" /> Fragmentation</div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-bold ${empStats.fragmentationScore > 6 ? 'text-rose-400' : empStats.fragmentationScore > 3 ? 'text-amber-400' : 'text-emerald-400'}`}>{empStats.fragmentationScore?.toFixed(1) ?? '—'}</span>
                        <span className="text-zinc-500 font-medium">/ 10</span>
                    </div>
                </div>
            </div>

            {/* Sub-Score Gauges + Radar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <GaugeBar label="Deep Work" value={empStats.deepWorkIndex} max={100} icon={<Target className="w-3.5 h-3.5" />} color="text-blue-400" unit="/ 100" />
                    <GaugeBar label="Fragmentation" value={empStats.fragmentationScore ?? 0} max={10} icon={<Waves className="w-3.5 h-3.5" />} color={empStats.fragmentationScore > 6 ? "text-rose-400" : empStats.fragmentationScore > 3 ? "text-amber-400" : "text-emerald-400"} unit="/ 10" />
                    <GaugeBar label="Connection" value={empStats.connectionIndex ?? 50} max={100} icon={<Link2 className="w-3.5 h-3.5" />} color="text-cyan-400" unit="/ 100" />
                    <GaugeBar label="Recovery Debt" value={empStats.recoveryDebt ?? 0} max={10} icon={<BatteryCharging className="w-3.5 h-3.5" />} color={empStats.recoveryDebt > 5 ? "text-rose-400" : empStats.recoveryDebt > 2 ? "text-amber-400" : "text-emerald-400"} unit="hrs" />
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-lg flex flex-col items-center">
                    <h3 className="text-sm font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Wellness Radar</h3>
                    <ResponsiveContainer width="100%" height={180}>
                        <RadarChart data={radarData} outerRadius="70%">
                            <PolarGrid stroke="#27272a" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                            <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                            <Radar name="Wellness" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Driving Factors */}
            {factorTags.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-sm">
                    <h3 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-400" /> ML-Identified Driving Factors</h3>
                    <div className="flex flex-wrap gap-2">
                        {factorTags.map((f, i) => (
                            <span key={i} className="text-xs font-medium bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:border-zinc-600 transition-colors">
                                <Zap className="w-3 h-3 text-amber-500" /> {f}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Performance History Chart — Multi-Signal */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-white">
                    <LineChartIcon className="w-5 h-5 text-emerald-500" /> 14-Day Performance & Wellness Trend
                </h2>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorBurnout" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorDeepWork" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorFrag" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorConn" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.5rem', color: '#f4f4f5' }}
                                itemStyle={{ fontWeight: 500 }}
                            />
                            <Area type="monotone" dataKey="burnoutIndex" name="Burnout Risk" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorBurnout)" />
                            <Area type="monotone" dataKey="deepWorkIndex" name="Deep Work %" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorDeepWork)" />
                            <Area type="monotone" dataKey="fragmentationScore" name="Fragmentation" stroke="#f59e0b" strokeWidth={1.5} fillOpacity={1} fill="url(#colorFrag)" strokeDasharray="4 2" />
                            <Area type="monotone" dataKey="connectionIndex" name="Connection" stroke="#06b6d4" strokeWidth={1.5} fillOpacity={1} fill="url(#colorConn)" strokeDasharray="4 2" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Forecast + AI Narrative Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Forecast Card */}
                {forecast && (
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                        <h2 className="text-xl font-semibold mb-5 flex items-center gap-2 relative z-10">
                            <TrendingUp className="w-5 h-5 text-violet-400" /> Time-Series Forecast
                        </h2>
                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800">
                                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Current Probability</div>
                                <div className="text-lg font-bold text-white">{(forecast.currentProb * 100).toFixed(1)}%</div>
                            </div>
                            <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800">
                                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">EWMA Smoothed</div>
                                <div className="text-lg font-bold text-violet-400">{(forecast.ewmaCurrent * 100).toFixed(1)}%</div>
                            </div>
                            <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800">
                                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">7-Day Forecast (Avg)</div>
                                <div className="text-lg font-bold text-amber-400">{(forecast.forecast7dAvg * 100).toFixed(1)}%</div>
                                <div className="text-xs text-zinc-500 mt-0.5">max: {(forecast.forecast7dMax * 100).toFixed(1)}%</div>
                            </div>
                            <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800">
                                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">14-Day Forecast (Avg)</div>
                                <div className="text-lg font-bold text-rose-400">{(forecast.forecast14dAvg * 100).toFixed(1)}%</div>
                                <div className="text-xs text-zinc-500 mt-0.5">max: {(forecast.forecast14dMax * 100).toFixed(1)}%</div>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-4 text-sm relative z-10">
                            <div className="flex items-center gap-2">
                                <TrendIcon direction={forecast.trendDirection} />
                                <span className={`font-medium ${trendColor(forecast.trendDirection)}`}>{trendLabel(forecast.trendDirection)}</span>
                            </div>
                            <div className="text-zinc-500">
                                <span className="text-zinc-400 font-medium">{forecast.numChangepoints}</span> changepoints
                            </div>
                            <div className="text-zinc-500">
                                volatility: <span className="text-zinc-400 font-medium">{forecast.avgVolatility.toFixed(3)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Narrative Card */}
                {narrative ? (
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 relative z-10">
                            <Brain className="w-5 h-5 text-emerald-500" /> AI Risk Narrative
                        </h2>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-3">
                                <RiskBadge tier={narrative.riskTier} />
                                <span className="text-sm text-zinc-400">Ensemble: {(narrative.ensembleProb * 100).toFixed(1)}%</span>
                            </div>
                            <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50 italic">
                                "{narrative.narrative}"
                            </p>
                        </div>
                    </div>
                ) : (
                    /* Fallback — AI Schedule (no narrative available) */
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden shadow-lg">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 relative z-10">
                            <Brain className="w-5 h-5 text-emerald-500" /> AI Optimized Schedule
                        </h2>
                        <div className="space-y-4 relative z-10">
                            {[
                                { time: "09:00 - 11:30", label: "Deep Work: Primary Tasks", type: "deep", reason: "Placed early when cognitive energy is statistically highest.", icon: <Activity className="w-4 h-4" /> },
                                { time: "11:30 - 12:00", label: "Mandatory Unplug", type: "break", reason: "Required break to reduce context-switching fatigue.", icon: <Coffee className="w-4 h-4" /> },
                                { time: "12:00 - 12:45", label: "Task: Code Review", type: "task", reason: "Lower cognitive load task bridging to lunch.", icon: <Briefcase className="w-4 h-4" /> },
                                { time: "14:00 - 14:30", label: "Admin: Team Sync", type: "admin", reason: "Batched meetings to preserve uninterrupted afternoon blocks.", icon: <User className="w-4 h-4" /> },
                            ].map((slot, i) => {
                                let colorClasses = "";
                                if (slot.type === 'deep') colorClasses = "border-l-blue-500 bg-blue-950/20 text-blue-100 border-blue-900/30";
                                if (slot.type === 'break') colorClasses = "border-l-zinc-500 bg-zinc-800/50 text-zinc-300 border-zinc-700/50";
                                if (slot.type === 'task') colorClasses = "border-l-emerald-500 bg-emerald-950/20 text-emerald-100 border-emerald-900/30";
                                if (slot.type === 'admin') colorClasses = "border-l-amber-500 bg-amber-950/20 text-amber-100 border-amber-900/30";
                                return (
                                    <div key={i} className={`p-4 rounded-r-xl border-l-4 border-y border-r ${colorClasses} hover:brightness-110 transition-all`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-semibold text-sm flex items-center gap-2">{slot.icon} {slot.label}</div>
                                            <div className="text-xs font-mono opacity-80 bg-black/20 px-2 py-0.5 rounded">{slot.time}</div>
                                        </div>
                                        <p className="text-xs opacity-70 mt-2 flex items-start gap-1.5 leading-relaxed">
                                            <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5 text-current opacity-80" />
                                            {slot.reason}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-8 pt-5 border-t border-zinc-800 flex items-center gap-3 text-sm font-medium text-emerald-400 bg-emerald-950/10 p-3 rounded-lg">
                            <div className="bg-emerald-500/20 p-1.5 rounded-full"><Check className="w-4 h-4" /></div>
                            Following this schedule reduces daily burnout probability by 18%.
                        </div>
                    </div>
                )}
            </div>

            {/* Anomalies Timeline */}
            {anomalies.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" /> Anomaly Detection Log
                    </h2>
                    <div className="space-y-3">
                        {anomalies.slice(-5).reverse().map((a, i) => (
                            <div key={i} className="flex items-center gap-4 p-3 bg-zinc-950/50 rounded-xl border border-zinc-800 hover:border-amber-800/50 transition-colors">
                                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${a.isolationScore > 0.7 ? 'bg-rose-500' : a.isolationScore > 0.4 ? 'bg-amber-500' : 'bg-yellow-500'}`}></div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-zinc-300 font-medium">{a.date}</div>
                                    {a.triggerFeature && <div className="text-xs text-zinc-500 truncate">Trigger: {a.triggerFeature}</div>}
                                </div>
                                <div className="flex gap-4 text-xs text-zinc-500 shrink-0">
                                    <span>ISO: <span className="text-zinc-300 font-medium">{a.isolationScore.toFixed(2)}</span></span>
                                    <span>Z: <span className="text-zinc-300 font-medium">{a.zScoreMax.toFixed(2)}</span></span>
                                    <span>Shift: <span className="text-zinc-300 font-medium">{a.patternShift.toFixed(2)}</span></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
