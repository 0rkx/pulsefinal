import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Check, X, Shield, Cpu, Sparkles, ArrowRight } from 'lucide-react';
import { AppUser, EmployeeStat, Suggestion, EmployeeHistory, Anomaly, Forecast, Narrative, EnsembleSummary } from '../types';
import { fetchEmployees, fetchSuggestions, fetchEmployeeHistory, fetchAnomalies, fetchForecast, fetchNarratives, fetchEnsembleSummary } from '../api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ─── Helpers ────────────────────────────────────────────────────────────────

function TrendIcon({ direction }: { direction: string }) {
    if (direction === 'rising') return <TrendingUp className="w-4 h-4 text-error" />;
    if (direction === 'falling') return <TrendingDown className="w-4 h-4 text-primary" />;
    return <Minus className="w-4 h-4 text-on-surface-variant" />;
}

function trendLabel(d: string) {
    if (d === 'rising') return 'Rising';
    if (d === 'falling') return 'Falling';
    return 'Stable';
}

function trendColor(d: string) {
    if (d === 'rising') return 'text-error';
    if (d === 'falling') return 'text-primary';
    return 'text-on-surface-variant';
}

function RiskBadge({ tier }: { tier: string | null | undefined }) {
    if (!tier) return null;
    const styles: Record<string, string> = {
        CRITICAL: 'bg-red-100 text-red-700 border border-red-200',
        HIGH: 'bg-orange-100 text-orange-700 border border-orange-200',
        MEDIUM: 'bg-amber-100 text-amber-700 border border-amber-200',
        LOW: 'bg-green-100 text-green-700 border border-green-200',
        MINIMAL: 'bg-sky-100 text-sky-700 border border-sky-200',
    };
    const cls = styles[tier] || 'bg-surface-container text-on-surface-variant border border-outline-variant/30';
    return <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${cls}`}>{tier}</span>;
}

function statusColor(status: string) {
    if (status === 'critical') return 'text-error';
    if (status === 'warning') return 'text-amber-600';
    return 'text-primary';
}

function statusBg(status: string) {
    if (status === 'critical') return 'bg-red-50 text-red-700 border border-red-200';
    if (status === 'warning') return 'bg-amber-50 text-amber-700 border border-amber-200';
    return 'bg-sky-50 text-sky-700 border border-sky-200';
}

function statusLabel(status: string) {
    if (status === 'critical') return 'At Risk -- Critical';
    if (status === 'warning') return 'Elevated Risk';
    return 'Optimal Capacity';
}

function burnoutBarColor(pct: number) {
    if (pct >= 70) return 'bg-error';
    if (pct >= 40) return 'bg-amber-500';
    return 'bg-primary';
}

// ─── Distribution bar ───────────────────────────────────────────────────────
function DistributionBar({ distribution }: { distribution: Record<string, number> }) {
    const tiers = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL'];
    const tierColors: Record<string, string> = {
        CRITICAL: 'bg-red-500', HIGH: 'bg-orange-400', MEDIUM: 'bg-amber-400', LOW: 'bg-green-500', MINIMAL: 'bg-sky-400',
    };
    const total = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;
    return (
        <div className="w-full">
            <div className="flex w-full h-2.5 rounded-full overflow-hidden bg-surface-container-high">
                {tiers.map(t => {
                    const count = distribution[t] || 0;
                    if (count === 0) return null;
                    return <div key={t} className={`${tierColors[t]} transition-all duration-700`} style={{ width: `${(count / total) * 100}%` }} title={`${t}: ${count}`} />;
                })}
            </div>
            <div className="flex flex-wrap gap-3 mt-2.5">
                {tiers.map(t => {
                    const count = distribution[t] || 0;
                    if (count === 0) return null;
                    return (
                        <div key={t} className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                            <div className={`w-2 h-2 rounded-full ${tierColors[t]}`} />
                            <span>{t}: <span className="text-on-surface font-semibold">{count}</span></span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Nav Link Component ─────────────────────────────────────────────────────
function NavLink({ icon, label, active, badge, onClick }: { icon: string; label: string; active?: boolean; badge?: number; onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                    ? 'bg-white/60 text-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-white/30 hover:text-on-surface'
            }`}
        >
            <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
                {label}
            </div>
            {badge != null && badge > 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center ${
                    active ? 'bg-primary text-white' : 'bg-tertiary/20 text-tertiary'
                }`}>
                    {badge}
                </span>
            )}
        </button>
    );
}

// ─── Window type definitions ────────────────────────────────────────────────
type ActiveWindow = 'overview' | 'employee' | 'optimizer' | 'team';

// ─── Main Manager Dashboard ─────────────────────────────────────────────────
interface ManagerDashboardProps {
    user: AppUser;
    onLogout: () => void;
    mode: 'manager' | 'employee';
    setMode: (m: 'manager' | 'employee') => void;
}

export default function ManagerDashboard({ user, onLogout }: ManagerDashboardProps) {
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
    const [activeWindow, setActiveWindow] = useState<ActiveWindow>('overview');
    const [alertsDismissed, setAlertsDismissed] = useState(false);

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
            if (emps.length > 0) setSelectedEmpId(emps[0].id);
            setLoading(false);
        }
        loadData();
    }, [user.id]);

    useEffect(() => {
        if (selectedEmpId) {
            Promise.all([
                fetchEmployeeHistory(selectedEmpId),
                fetchAnomalies(selectedEmpId),
                fetchForecast(selectedEmpId),
            ]).then(([hist, anom, fc]) => {
                setHistory(
                    hist.length > 0 ? hist : [
                        { date: 'Mon', burnoutIndex: 2.0, deepWorkIndex: 80, fragmentationScore: 3, connectionIndex: 60, recoveryDebt: 1 },
                        { date: 'Tue', burnoutIndex: 2.5, deepWorkIndex: 75, fragmentationScore: 4, connectionIndex: 55, recoveryDebt: 1.5 },
                        { date: 'Wed', burnoutIndex: 3.5, deepWorkIndex: 60, fragmentationScore: 6, connectionIndex: 50, recoveryDebt: 2 },
                        { date: 'Thu', burnoutIndex: 3.2, deepWorkIndex: 70, fragmentationScore: 5, connectionIndex: 52, recoveryDebt: 1.8 },
                        { date: 'Fri', burnoutIndex: 4.1, deepWorkIndex: 50, fragmentationScore: 7, connectionIndex: 45, recoveryDebt: 3 },
                    ]
                );
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
            <div className="min-h-screen flex items-center justify-center">
                <div className="glass-card p-10 rounded-2xl flex flex-col items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-4 border-surface-container border-t-primary animate-spin" />
                    <p className="text-on-surface-variant font-medium text-sm">Loading Intelligence...</p>
                </div>
            </div>
        );
    }

    const selectedEmp = teamEmployees.find(e => e.id === selectedEmpId);
    const criticalEmps = teamEmployees.filter(e => e.status === 'critical');
    const warningEmps = teamEmployees.filter(e => e.status === 'warning');
    const sortedEmployees = [...teamEmployees].sort((a, b) => sortOrder === 'busy' ? b.burnout - a.burnout : a.burnout - b.burnout);
    const avgRecoveryDebt = teamEmployees.length ? teamEmployees.reduce((s, e) => s + (e.recoveryDebt ?? 0), 0) / teamEmployees.length : 0;
    const avgFragmentation = teamEmployees.length ? teamEmployees.reduce((s, e) => s + (e.fragmentationScore ?? 0), 0) / teamEmployees.length : 0;
    const riskQueue = [...teamEmployees].sort((a, b) => b.burnout - a.burnout).slice(0, 5);
    const pendingSuggestions = suggestions.filter(s => s.status === 'pending');

    const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const avatarColor = (id: string) => {
        const colors = ['bg-primary/20 text-primary', 'bg-tertiary/20 text-tertiary', 'bg-error/20 text-error', 'bg-amber-100 text-amber-700', 'bg-sky-100 text-sky-700'];
        return colors[id.charCodeAt(id.length - 1) % colors.length];
    };

    // Window title mapping
    const windowTitles: Record<ActiveWindow, string> = {
        overview: 'Overview',
        employee: 'Employee Detail',
        optimizer: 'AI Task Optimizer',
        team: 'Team Management',
    };

    return (
        <div className="flex h-screen overflow-hidden font-body text-on-surface">

            {/* ══════════════════ Sidebar ══════════════════ */}
            <aside className="w-64 flex-shrink-0 glass-sidebar flex flex-col p-6 gap-2 z-50 overflow-y-auto">
                {/* Logo */}
                <div className="mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-tinted">
                        <span className="text-white font-extrabold text-base font-headline">P</span>
                    </div>
                    <div>
                        <h2 className="text-base font-extrabold text-primary font-headline leading-tight">PulseIQ</h2>
                        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Burnout Intelligence</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="space-y-1 flex-1">
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2 px-1">Dashboard</p>
                    <NavLink icon="dashboard" label="Overview" active={activeWindow === 'overview'} onClick={() => setActiveWindow('overview')} />
                    <NavLink icon="person_search" label="Employee Detail" active={activeWindow === 'employee'} onClick={() => setActiveWindow('employee')} />
                    <NavLink icon="auto_awesome" label="Task Optimizer" active={activeWindow === 'optimizer'} badge={pendingSuggestions.length} onClick={() => setActiveWindow('optimizer')} />
                    <NavLink icon="groups" label="Team" active={activeWindow === 'team'} onClick={() => setActiveWindow('team')} />
                </nav>

                {/* Bottom */}
                <div className="pt-4 border-t border-white/20 space-y-2">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold shadow-tinted">
                            {initials(user.name)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-on-surface truncate">{user.name}</p>
                            <p className="text-[10px] text-on-surface-variant">Manager</p>
                        </div>
                    </div>
                    <button
                        id="logout-sidebar-btn"
                        onClick={onLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-on-surface-variant hover:text-on-surface text-sm font-medium rounded-xl hover:bg-white/20 transition-all"
                    >
                        <span className="material-symbols-outlined text-[18px]">logout</span> Sign Out
                    </button>
                </div>
            </aside>

            {/* ══════════════════ Main Content ══════════════════ */}
            <main className="flex-1 overflow-y-auto">
                <div className="p-8 space-y-8 min-h-full">

                    {/* Top Bar */}
                    <header className="glass-topbar rounded-2xl flex justify-between items-center px-6 py-4 sticky top-0 z-40">
                        <h1 className="text-xl font-bold font-headline text-on-surface tracking-tight">
                            {windowTitles[activeWindow]}
                        </h1>
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                <span className="absolute inset-y-0 left-3 flex items-center text-on-surface-variant">
                                    <span className="material-symbols-outlined text-[18px]">search</span>
                                </span>
                                <input
                                    id="dashboard-search"
                                    className="pl-9 pr-4 py-2 bg-white/50 border-none rounded-xl focus:ring-2 focus:ring-primary/30 w-56 text-sm outline-none placeholder-on-surface-variant"
                                    placeholder="Search team..."
                                    type="text"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <button id="notifications-btn" className="text-on-surface-variant hover:text-primary transition-colors">
                                    <span className="material-symbols-outlined">notifications</span>
                                </button>
                                <button id="settings-btn" className="text-on-surface-variant hover:text-primary transition-colors">
                                    <span className="material-symbols-outlined">settings</span>
                                </button>
                            </div>
                        </div>
                    </header>

                    {/* ═══════════════════════════════════════════════════
                        WINDOW: OVERVIEW
                       ═══════════════════════════════════════════════════ */}
                    {activeWindow === 'overview' && (
                        <div className="space-y-8 animate-fade-slide-up">
                            {/* Alert Banner */}
                            {!alertsDismissed && (criticalEmps.length > 0 || warningEmps.length > 0) && (
                                <div className="glass-card p-4 rounded-2xl border-l-4 border-error/60">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            <div className="flex h-3 w-3 relative mt-1 shrink-0">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error/50 opacity-60" />
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-error/70" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-sm font-bold text-on-surface">Burnout Risk Alerts</h3>
                                                <div className="max-h-[100px] overflow-y-auto mt-1 pr-2 space-y-0.5">
                                                    {criticalEmps.map(e => (
                                                        <p key={e.id} className="text-sm text-red-600/80 flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                                            <span className="truncate"><span className="font-semibold">{e.name}</span> — {e.burnout}% burnout risk</span>
                                                        </p>
                                                    ))}
                                                    {warningEmps.map(e => (
                                                        <p key={e.id} className="text-sm text-amber-600/80 flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                                            <span className="truncate"><span className="font-semibold">{e.name}</span> — elevated ({e.burnout}%)</span>
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => setAlertsDismissed(true)} className="text-on-surface-variant hover:text-on-surface transition-colors ml-3 shrink-0">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Bento Stat Cards */}
                            <div className="grid grid-cols-12 gap-5">
                                {/* Critical Alerts */}
                                <div className="col-span-12 lg:col-span-4 glass-card p-6 rounded-2xl relative overflow-hidden">
                                    <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Critical Alerts</h3>
                                    <div className="space-y-3 max-h-[200px] overflow-y-auto">
                                        {criticalEmps.length === 0 && warningEmps.length === 0 ? (
                                            <div className="flex items-start gap-3 p-3 rounded-xl bg-sky-50 border border-sky-100">
                                                <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                                                <div>
                                                    <p className="text-sm font-bold text-on-surface">All clear</p>
                                                    <p className="text-xs text-on-surface-variant">No critical burnout risks detected.</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {criticalEmps.slice(0, 3).map(e => (
                                                    <div key={e.id} className="flex items-start gap-3 p-3 rounded-xl bg-red-50/60 border border-red-100/60 cursor-pointer hover:bg-red-50/90 transition-colors"
                                                         onClick={() => { setSelectedEmpId(e.id); setActiveWindow('employee'); }}>
                                                        <span className="material-symbols-outlined text-error/70 text-[20px]">warning</span>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-on-surface truncate">{e.name} — Critical</p>
                                                            <p className="text-xs text-on-surface-variant truncate">Burnout risk: {e.burnout}%</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                {warningEmps.slice(0, 2).map(e => (
                                                    <div key={e.id} className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-100/60 cursor-pointer hover:bg-amber-50/90 transition-colors"
                                                         onClick={() => { setSelectedEmpId(e.id); setActiveWindow('employee'); }}>
                                                        <span className="material-symbols-outlined text-amber-500 text-[20px]">schedule</span>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-on-surface truncate">{e.name} — Warning</p>
                                                            <p className="text-xs text-on-surface-variant truncate">Elevated risk at {e.burnout}%</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Team Recovery Debt */}
                                <div className="col-span-12 md:col-span-6 lg:col-span-4 glass-card p-6 rounded-2xl">
                                    <div className="flex justify-between items-start mb-5">
                                        <div>
                                            <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Team Recovery Debt</h3>
                                            <p className="text-4xl font-extrabold font-headline text-on-surface mt-2">
                                                {avgRecoveryDebt.toFixed(1)}h
                                                <span className={`text-sm font-medium ml-2 ${avgRecoveryDebt > 3 ? 'text-error' : 'text-primary'}`}>
                                                    {avgRecoveryDebt > 3 ? '↑ High' : '↓ Low'}
                                                </span>
                                            </p>
                                        </div>
                                        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <span className="material-symbols-outlined text-[22px]">battery_alert</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden mb-2">
                                        <div className={`h-full rounded-full transition-all duration-700 ${avgRecoveryDebt > 5 ? 'bg-error' : avgRecoveryDebt > 2 ? 'bg-amber-500' : 'bg-primary'}`}
                                             style={{ width: `${Math.min(100, (avgRecoveryDebt / 10) * 100)}%` }} />
                                    </div>
                                    <p className="text-xs text-on-surface-variant">Avg across {teamEmployees.length} team members</p>
                                </div>

                                {/* Work Fragmentation */}
                                <div className="col-span-12 md:col-span-6 lg:col-span-4 glass-card p-6 rounded-2xl">
                                    <div className="flex justify-between items-start mb-5">
                                        <div>
                                            <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Work Fragmentation</h3>
                                            <p className="text-4xl font-extrabold font-headline text-on-surface mt-2">
                                                {avgFragmentation.toFixed(0)}%
                                                <span className={`text-sm font-medium ml-2 ${avgFragmentation > 60 ? 'text-error' : 'text-primary-fixed-dim'}`}>
                                                    {avgFragmentation > 60 ? '↑ High' : '→ Mod'}
                                                </span>
                                            </p>
                                        </div>
                                        <div className="w-11 h-11 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
                                            <span className="material-symbols-outlined text-[22px]">bubble_chart</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 h-1.5 mb-2">
                                        <div className="flex-1 bg-primary rounded-full" />
                                        <div className="flex-[0.5] bg-tertiary rounded-full" />
                                        <div className="flex-[0.3] bg-outline-variant rounded-full" />
                                    </div>
                                    <p className="text-xs text-on-surface-variant">Context switching across team</p>
                                </div>
                            </div>

                            {/* Ensemble Summary */}
                            {ensembleSummary && Object.keys(ensembleSummary.distribution || {}).length > 0 && (
                                <div className="glass-panel p-6 rounded-2xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-sm font-bold font-headline text-on-surface flex items-center gap-2">
                                            <Cpu className="w-4 h-4 text-tertiary" />
                                            Ensemble Intelligence Summary
                                        </h2>
                                        <div className="flex items-center gap-3">
                                            {ensembleSummary.averageConfidence != null && (
                                                <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                                                    <Shield className="w-4 h-4 text-tertiary" />
                                                    <span>Confidence: <span className="text-tertiary font-bold">{(ensembleSummary.averageConfidence * 100).toFixed(1)}%</span></span>
                                                </div>
                                            )}
                                            {ensembleSummary.totalEmployees != null && (
                                                <span className="text-xs text-on-surface-variant bg-surface-container-high px-2.5 py-1 rounded-full font-medium">{ensembleSummary.totalEmployees} employees</span>
                                            )}
                                        </div>
                                    </div>
                                    <DistributionBar distribution={ensembleSummary.distribution} />
                                    {(ensembleSummary.modelsAvailable || []).length > 0 && (
                                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                                            <span className="text-xs text-on-surface-variant">Active models:</span>
                                            {ensembleSummary.modelsAvailable.map(m => (
                                                <span key={m} className="text-xs font-mono bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full">{m}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Quick Risk Queue */}
                            <div className="glass-panel p-6 rounded-2xl">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="text-sm font-bold font-headline text-on-surface">Top Risk Queue</h3>
                                    <button onClick={() => setActiveWindow('team')} className="text-xs text-primary font-semibold hover:underline">View All Team →</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {riskQueue.slice(0, 3).map(emp => (
                                        <button
                                            key={emp.id}
                                            onClick={() => { setSelectedEmpId(emp.id); setActiveWindow('employee'); }}
                                            className="flex items-center gap-4 p-4 bg-white/50 rounded-xl hover:bg-white/80 transition-all text-left"
                                        >
                                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-extrabold font-headline shrink-0 ${avatarColor(emp.id)}`}>
                                                {initials(emp.name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-on-surface truncate">{emp.name}</p>
                                                <div className="w-full bg-surface-container h-1.5 rounded-full mt-1.5">
                                                    <div className={`h-full rounded-full transition-all duration-700 ${burnoutBarColor(emp.burnout)}`}
                                                         style={{ width: `${emp.burnout}%` }} />
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className={`text-sm font-bold ${emp.burnout >= 70 ? 'text-error' : emp.burnout >= 40 ? 'text-amber-600' : 'text-primary'}`}>
                                                    {emp.burnout}%
                                                </span>
                                                <div className="mt-0.5"><RiskBadge tier={emp.riskTier} /></div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Quick Optimizer Preview */}
                            {pendingSuggestions.length > 0 && (
                                <div className="glass-panel p-6 rounded-2xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-bold font-headline text-on-surface flex items-center gap-2">
                                            <span className="material-symbols-outlined text-tertiary text-[18px]">auto_awesome</span>
                                            Pending Optimizations
                                        </h3>
                                        <button onClick={() => setActiveWindow('optimizer')} className="text-xs text-primary font-semibold hover:underline">
                                            View All ({pendingSuggestions.length}) →
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {pendingSuggestions.slice(0, 2).map(s => (
                                            <div key={s.id} className="flex items-center justify-between p-3 bg-white/50 rounded-xl">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="material-symbols-outlined text-on-surface-variant text-[16px]">swap_horiz</span>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-on-surface truncate">{s.task}</p>
                                                        <p className="text-xs text-on-surface-variant truncate">{s.from} → {s.to}</p>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold shrink-0">Pending</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════
                        WINDOW: EMPLOYEE DETAIL
                       ═══════════════════════════════════════════════════ */}
                    {activeWindow === 'employee' && (
                        <div className="space-y-6 animate-fade-slide-up">
                            {/* Employee selector strip */}
                            <div className="glass-card p-4 rounded-2xl">
                                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                    {teamEmployees.map(emp => (
                                        <button
                                            key={emp.id}
                                            onClick={() => setSelectedEmpId(emp.id)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                                                selectedEmpId === emp.id
                                                    ? 'bg-white/80 shadow-sm text-primary'
                                                    : 'bg-white/30 text-on-surface-variant hover:bg-white/60'
                                            }`}
                                        >
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${avatarColor(emp.id)}`}>
                                                {initials(emp.name)}
                                            </div>
                                            <span className="truncate max-w-[100px]">{emp.name}</span>
                                            {emp.status === 'critical' && <span className="w-2 h-2 rounded-full bg-error/70 shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Employee Detail */}
                            {selectedEmp ? (
                                <div className="glass-panel p-8 rounded-2xl">
                                    {/* Header */}
                                    <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
                                        <div className="flex items-center gap-5">
                                            <div className="relative">
                                                <div className={`w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-2xl font-extrabold font-headline shadow-glass-lg ${avatarColor(selectedEmp.id)}`}>
                                                    {initials(selectedEmp.name)}
                                                </div>
                                                {selectedEmp.status === 'critical' && (
                                                    <div className="absolute -bottom-1.5 -right-1.5 text-white text-[9px] px-1.5 py-0.5 rounded-lg font-bold bg-error/80">CRIT</div>
                                                )}
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-extrabold font-headline text-on-surface">{selectedEmp.name}</h2>
                                                <p className="text-on-surface-variant font-medium text-sm">{selectedEmp.role}</p>
                                                <div className="flex gap-2 mt-2 flex-wrap">
                                                    <RiskBadge tier={selectedEmp.riskTier} />
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${statusBg(selectedEmp.status)}`}>
                                                        {statusLabel(selectedEmp.status)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 self-center">
                                            <div className="bg-white/40 p-3 rounded-xl border border-white/20">
                                                <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Recovery Debt</p>
                                                <p className={`text-xl font-extrabold ${(selectedEmp.recoveryDebt ?? 0) > 3 ? 'text-error' : 'text-primary'}`}>
                                                    {selectedEmp.recoveryDebt?.toFixed(1) ?? '—'}h
                                                </p>
                                            </div>
                                            <div className="bg-white/40 p-3 rounded-xl border border-white/20">
                                                <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Focus Time</p>
                                                <p className="text-xl font-extrabold text-primary">{selectedEmp.deepWorkIndex?.toFixed(0) ?? '—'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 6-metric grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                                        {[
                                            { label: 'Burnout Index', value: `${selectedEmp.burnoutIndex} / 10`, color: statusColor(selectedEmp.status), icon: 'local_fire_department' },
                                            { label: 'Time to Burnout', value: selectedEmp.predictedBurnout, color: statusColor(selectedEmp.status), icon: 'timer' },
                                            { label: 'Deep Work', value: `${selectedEmp.deepWorkIndex} / 100`, color: 'text-primary', icon: 'center_focus_strong' },
                                            { label: 'Fragmentation', value: `${selectedEmp.fragmentationScore?.toFixed(1) ?? '—'} / 100`, color: (selectedEmp.fragmentationScore ?? 0) > 70 ? 'text-error' : (selectedEmp.fragmentationScore ?? 0) > 50 ? 'text-amber-600' : 'text-primary', icon: 'bubble_chart' },
                                            { label: 'Connection', value: `${selectedEmp.connectionIndex?.toFixed(1) ?? '—'} / 100`, color: 'text-tertiary', icon: 'hub' },
                                            { label: 'Productivity', value: `${selectedEmp.productivity}%`, color: 'text-primary', icon: 'trending_up' },
                                        ].map(({ label, value, color, icon }) => (
                                            <div key={label} className="bg-white/40 p-4 rounded-xl border border-white/20">
                                                <div className="flex items-center gap-1.5 text-on-surface-variant text-[10px] uppercase tracking-wider font-bold mb-1.5">
                                                    <span className="material-symbols-outlined text-[16px]">{icon}</span> {label}
                                                </div>
                                                <div className={`text-xl font-bold ${color}`}>{value}</div>
                                                {label === 'Burnout Index' && selectedEmp.ensembleProb != null && (
                                                    <div className="mt-1 text-[10px] text-on-surface-variant">
                                                        Ensemble: <span className="text-tertiary font-bold">{(selectedEmp.ensembleProb * 100).toFixed(1)}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Driving Factors */}
                                    {selectedEmp.drivingFactors && selectedEmp.drivingFactors.trim().length > 0 && (
                                        <div className="flex items-start gap-2 flex-wrap mb-6">
                                            <Sparkles className="w-4 h-4 text-amber-500 mt-1 shrink-0" />
                                            {selectedEmp.drivingFactors.split(/[;,]/).map(f => f.trim()).filter(Boolean).map((f, i) => (
                                                <span key={i} className="text-xs bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full font-medium">{f}</span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Trend Chart */}
                                    <div>
                                        <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">Burnout Trend (Last {history.length} Days)</h4>
                                        <div className="h-48 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="mgr-burnout" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#a83836" stopOpacity={0.25} />
                                                            <stop offset="95%" stopColor="#a83836" stopOpacity={0} />
                                                        </linearGradient>
                                                        <linearGradient id="mgr-deepwork" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#305ea9" stopOpacity={0.2} />
                                                            <stop offset="95%" stopColor="#305ea9" stopOpacity={0} />
                                                        </linearGradient>
                                                        <linearGradient id="mgr-frag" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#625983" stopOpacity={0.15} />
                                                            <stop offset="95%" stopColor="#625983" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(172,178,189,0.2)" vertical={false} />
                                                    <XAxis dataKey="date" stroke="#595f69" fontSize={11} tickLine={false} axisLine={false} />
                                                    <YAxis stroke="#595f69" fontSize={11} tickLine={false} axisLine={false} />
                                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.92)', borderColor: 'rgba(172,178,189,0.3)', borderRadius: '12px', color: '#2d333b' }} itemStyle={{ fontWeight: 500 }} />
                                                    <Area type="monotone" dataKey="burnoutIndex" name="Burnout" stroke="#a83836" strokeWidth={2} fillOpacity={1} fill="url(#mgr-burnout)" />
                                                    <Area type="monotone" dataKey="deepWorkIndex" name="Deep Work" stroke="#305ea9" strokeWidth={2} fillOpacity={1} fill="url(#mgr-deepwork)" />
                                                    <Area type="monotone" dataKey="fragmentationScore" name="Fragmentation" stroke="#625983" strokeWidth={1.5} fillOpacity={1} fill="url(#mgr-frag)" strokeDasharray="4 2" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Forecast */}
                                    {forecast && (
                                        <div className="mt-6 pt-6 border-t border-white/30">
                                            <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">Burnout Forecast</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {[
                                                    { label: 'Current', value: `${(forecast.currentProb * 100).toFixed(1)}%`, color: 'text-on-surface' },
                                                    { label: '7-Day Avg', value: `${(forecast.forecast7dAvg * 100).toFixed(1)}%`, color: 'text-amber-600' },
                                                    { label: '14-Day Avg', value: `${(forecast.forecast14dAvg * 100).toFixed(1)}%`, color: 'text-error' },
                                                    { label: 'Volatility', value: forecast.avgVolatility.toFixed(3), color: 'text-tertiary' },
                                                ].map(({ label, value, color }) => (
                                                    <div key={label} className="bg-white/40 p-3 rounded-xl border border-white/20">
                                                        <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">{label}</div>
                                                        <div className={`text-lg font-bold ${color}`}>{value}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-3 flex items-center gap-2 text-sm">
                                                <TrendIcon direction={forecast.trendDirection} />
                                                <span className={`font-medium ${trendColor(forecast.trendDirection)}`}>{trendLabel(forecast.trendDirection)} trend</span>
                                                <span className="text-on-surface-variant">· {forecast.numChangepoints} changepoints</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Anomalies */}
                                    {anomalies.length > 0 && (
                                        <div className="mt-6 pt-6 border-t border-white/30">
                                            <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">Anomaly Detections ({anomalies.length})</h4>
                                            <div className="space-y-2 max-h-[180px] overflow-y-auto">
                                                {anomalies.slice(-3).reverse().map((a, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-3 bg-white/30 rounded-xl text-sm">
                                                        <div className={`w-2 h-2 rounded-full shrink-0 ${a.isolationScore > 0.7 ? 'bg-error' : a.isolationScore > 0.4 ? 'bg-amber-500' : 'bg-yellow-400'}`} />
                                                        <span className="text-on-surface-variant font-mono text-xs">{a.date}</span>
                                                        <span className="text-on-surface flex-1 truncate">{a.triggerFeature || 'Pattern shift'}</span>
                                                        <span className="text-xs text-on-surface-variant">z:{a.zScoreMax.toFixed(1)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* AI Narrative */}
                                    {narrative && (
                                        <div className="mt-6 pt-6 border-t border-white/30">
                                            <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">AI Risk Narrative</h4>
                                            <p className="text-sm text-on-surface leading-relaxed bg-primary/5 p-4 rounded-xl border border-primary/10 italic">
                                                "{narrative.narrative}"
                                            </p>
                                        </div>
                                    )}

                                    {/* Recommendation */}
                                    <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-primary text-[20px]">lightbulb</span>
                                            <p className="text-sm font-medium text-on-primary-container">
                                                <span className="font-bold">AI Recommendation:</span> Reduce meetings by 40% for {selectedEmp.name} over 48 hrs to reduce recovery debt.
                                            </p>
                                        </div>
                                        <button id="apply-adjustment-btn" className="px-4 py-2 gradient-primary text-white rounded-xl text-xs font-bold hover:shadow-tinted transition-all shrink-0">
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="glass-panel p-8 rounded-2xl text-center text-on-surface-variant">
                                    <p>Select an employee to view details.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════
                        WINDOW: AI TASK OPTIMIZER
                       ═══════════════════════════════════════════════════ */}
                    {activeWindow === 'optimizer' && (
                        <div className="space-y-6 animate-fade-slide-up">
                            {/* Summary strip */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="glass-card p-5 rounded-2xl text-center">
                                    <p className="text-3xl font-extrabold font-headline text-on-surface">{suggestions.length}</p>
                                    <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest mt-1">Total Suggestions</p>
                                </div>
                                <div className="glass-card p-5 rounded-2xl text-center">
                                    <p className="text-3xl font-extrabold font-headline text-amber-600">{pendingSuggestions.length}</p>
                                    <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest mt-1">Pending Review</p>
                                </div>
                                <div className="glass-card p-5 rounded-2xl text-center">
                                    <p className="text-3xl font-extrabold font-headline text-primary">{suggestions.filter(s => s.status === 'accepted').length}</p>
                                    <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest mt-1">Applied</p>
                                </div>
                            </div>

                            {/* Distribution insight */}
                            {(() => {
                                const assigneeCounts: Record<string, number> = {};
                                suggestions.forEach(s => {
                                    assigneeCounts[s.to] = (assigneeCounts[s.to] || 0) + 1;
                                });
                                const assignees = Object.entries(assigneeCounts).sort((a, b) => b[1] - a[1]);
                                if (assignees.length === 0) return null;
                                return (
                                    <div className="glass-card p-5 rounded-2xl">
                                        <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">Task Distribution Across Team</h4>
                                        <div className="space-y-2">
                                            {assignees.map(([name, count]) => (
                                                <div key={name} className="flex items-center gap-3">
                                                    <span className="text-sm font-medium text-on-surface w-40 truncate">{name}</span>
                                                    <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary/70 rounded-full transition-all duration-500"
                                                            style={{ width: `${Math.min(100, (count / Math.max(...assignees.map(a => a[1]))) * 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold text-on-surface w-8 text-right">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Suggestion cards */}
                            <div className="glass-panel p-6 rounded-2xl">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-base font-bold font-headline text-on-surface flex items-center gap-2">
                                        <span className="material-symbols-outlined text-tertiary text-[20px]">auto_awesome</span>
                                        AI-Generated Suggestions
                                    </h3>
                                    {pendingSuggestions.length > 0 && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => suggestions.forEach(s => s.status === 'pending' && handleSuggestionAction(s.id, 'rejected'))}
                                                className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/50 hover:bg-red-50 text-on-surface-variant hover:text-error transition-colors border border-white/30"
                                            >
                                                Dismiss All
                                            </button>
                                            <button
                                                onClick={() => suggestions.forEach(s => s.status === 'pending' && handleSuggestionAction(s.id, 'accepted'))}
                                                className="px-4 py-2 text-xs font-semibold rounded-xl gradient-primary text-white shadow-tinted hover:shadow-lg transition-all"
                                            >
                                                Accept All
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {suggestions.length === 0 && (
                                    <div className="text-center py-12">
                                        <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">check_circle</span>
                                        <p className="text-sm text-on-surface-variant">No urgent task reallocations needed at this time.</p>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {suggestions.map(s => (
                                        <div key={s.id} className={`flex items-center justify-between p-5 rounded-xl transition-all group ${
                                            s.status === 'accepted' ? 'bg-sky-50/60 border border-sky-100/60' :
                                            s.status === 'rejected' ? 'bg-surface-container/40 border border-outline-variant/20 opacity-60' :
                                            'bg-white/50 border border-white/30 glass-hover'
                                        }`}>
                                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                                    s.status === 'accepted' ? 'bg-primary/10 text-primary' :
                                                    s.status === 'rejected' ? 'bg-surface-container text-on-surface-variant' :
                                                    'bg-surface-container text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary'
                                                }`}>
                                                    <span className="material-symbols-outlined text-[18px]">
                                                        {s.status === 'accepted' ? 'check_circle' : s.status === 'rejected' ? 'cancel' : 'swap_horiz'}
                                                    </span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-on-surface">
                                                        {s.task}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1.5 text-sm">
                                                        <span className="font-semibold text-error">{s.from}</span>
                                                        <ArrowRight className="w-3 h-3 text-on-surface-variant" />
                                                        <span className="font-semibold text-primary">{s.to}</span>
                                                    </div>
                                                    <p className="text-xs text-on-surface-variant mt-1">{s.reason}</p>
                                                    {s.benefits && s.benefits.length > 0 && (
                                                        <div className="flex gap-2 mt-2 flex-wrap">
                                                            {s.benefits.map((b, i) => (
                                                                <span key={i} className="text-[10px] bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full">{b}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {s.status === 'pending' ? (
                                                <div className="flex gap-2 ml-4 shrink-0">
                                                    <button
                                                        id={`reject-${s.id}`}
                                                        onClick={() => handleSuggestionAction(s.id, 'rejected')}
                                                        className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/60 hover:bg-red-50 text-on-surface-variant hover:text-error transition-colors border border-white/30"
                                                    >
                                                        Dismiss
                                                    </button>
                                                    <button
                                                        id={`accept-${s.id}`}
                                                        onClick={() => handleSuggestionAction(s.id, 'accepted')}
                                                        className="px-4 py-2 text-xs font-semibold rounded-xl gradient-primary text-white shadow-tinted hover:shadow-lg transition-all"
                                                    >
                                                        Accept
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className={`ml-4 shrink-0 px-4 py-2 rounded-xl text-xs font-semibold ${
                                                    s.status === 'accepted' ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant'
                                                }`}>
                                                    {s.status === 'accepted' ? 'Applied' : 'Dismissed'}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════
                        WINDOW: TEAM
                       ═══════════════════════════════════════════════════ */}
                    {activeWindow === 'team' && (
                        <div className="space-y-6 animate-fade-slide-up">
                            {/* Team stats strip */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="glass-card p-5 rounded-2xl text-center">
                                    <p className="text-3xl font-extrabold font-headline text-on-surface">{teamEmployees.length}</p>
                                    <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest mt-1">Total Members</p>
                                </div>
                                <div className="glass-card p-5 rounded-2xl text-center">
                                    <p className="text-3xl font-extrabold font-headline text-error">{criticalEmps.length}</p>
                                    <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest mt-1">Critical</p>
                                </div>
                                <div className="glass-card p-5 rounded-2xl text-center">
                                    <p className="text-3xl font-extrabold font-headline text-amber-600">{warningEmps.length}</p>
                                    <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest mt-1">Warning</p>
                                </div>
                                <div className="glass-card p-5 rounded-2xl text-center">
                                    <p className="text-3xl font-extrabold font-headline text-primary">{teamEmployees.filter(e => e.status === 'healthy').length}</p>
                                    <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest mt-1">Healthy</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-6">
                                {/* Risk Queue */}
                                <div className="col-span-12 lg:col-span-4">
                                    <div className="glass-panel p-6 rounded-2xl">
                                        <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-5">Burnout Risk Queue</h3>
                                        <div className="space-y-4">
                                            {riskQueue.map(emp => (
                                                <button
                                                    key={emp.id}
                                                    onClick={() => { setSelectedEmpId(emp.id); setActiveWindow('employee'); }}
                                                    className={`w-full flex items-center gap-4 text-left transition-all ${selectedEmpId === emp.id ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
                                                >
                                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-extrabold font-headline shrink-0 ${avatarColor(emp.id)}`}>
                                                        {initials(emp.name)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-on-surface truncate">{emp.name}</p>
                                                        <div className="w-full bg-surface-container h-1.5 rounded-full mt-1.5">
                                                            <div className={`h-full rounded-full transition-all duration-700 ${burnoutBarColor(emp.burnout)}`}
                                                                 style={{ width: `${emp.burnout}%` }} />
                                                        </div>
                                                    </div>
                                                    <span className={`text-xs font-bold shrink-0 ${emp.burnout >= 70 ? 'text-error' : emp.burnout >= 40 ? 'text-amber-600' : 'text-primary'}`}>
                                                        {emp.burnout}%
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Full Team List */}
                                <div className="col-span-12 lg:col-span-8">
                                    <div className="glass-panel p-6 rounded-2xl">
                                        <div className="flex items-center justify-between mb-5">
                                            <h3 className="text-sm font-bold font-headline text-on-surface">All Team Members</h3>
                                            <select
                                                id="team-sort-select"
                                                value={sortOrder}
                                                onChange={e => setSortOrder(e.target.value as 'busy' | 'free')}
                                                className="text-xs text-on-surface-variant bg-white/50 border border-white/30 rounded-lg py-1 px-2 outline-none focus:border-primary/40"
                                            >
                                                <option value="busy">Most at Risk</option>
                                                <option value="free">Most Healthy</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
                                            {sortedEmployees.map(emp => (
                                                <button
                                                    key={emp.id}
                                                    id={`emp-btn-${emp.id}`}
                                                    onClick={() => { setSelectedEmpId(emp.id); setActiveWindow('employee'); }}
                                                    className={`text-left p-4 rounded-xl transition-all ${
                                                        selectedEmpId === emp.id
                                                            ? 'bg-white/80 shadow-glass'
                                                            : 'bg-white/30 hover:bg-white/60'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(emp.id)}`}>
                                                                {initials(emp.name)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold text-on-surface truncate">{emp.name}</p>
                                                                <p className="text-[10px] text-on-surface-variant">{emp.role}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <RiskBadge tier={emp.riskTier} />
                                                            {emp.status === 'critical' && (
                                                                <span className="flex h-2 w-2 relative">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error/50 opacity-60" />
                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-error/70" />
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="mt-2.5 flex gap-3 text-[10px] font-medium text-on-surface-variant">
                                                        <span>Burnout: <span className={`font-bold ${emp.burnout > 70 ? 'text-error' : emp.burnout > 40 ? 'text-amber-600' : 'text-primary'}`}>{emp.burnout}%</span></span>
                                                        <span>Deep: <span className="text-primary font-bold">{emp.deepWorkIndex}</span></span>
                                                        <span>Frag: <span className="text-tertiary font-bold">{emp.fragmentationScore?.toFixed(0) ?? '—'}</span></span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
