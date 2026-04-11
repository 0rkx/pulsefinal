import React, { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Shield, Zap, Sparkles } from 'lucide-react';
import { AppUser, EmployeeStat, EmployeeHistory, Anomaly, Forecast, Narrative } from '../types';
import { fetchEmployees, fetchEmployeeHistory, fetchAnomalies, fetchForecast, fetchNarratives } from '../api';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TrendIcon({ direction }: { direction: string }) {
    if (direction === 'rising') return <TrendingUp className="w-4 h-4 text-error" />;
    if (direction === 'falling') return <TrendingDown className="w-4 h-4 text-primary" />;
    return <Minus className="w-4 h-4 text-on-surface-variant" />;
}
function trendLabel(d: string) { return d === 'rising' ? 'Rising' : d === 'falling' ? 'Falling' : 'Stable'; }
function trendColor(d: string) { return d === 'rising' ? 'text-error' : d === 'falling' ? 'text-primary' : 'text-on-surface-variant'; }

function RiskBadge({ tier }: { tier: string | null }) {
    if (!tier) return null;
    const styles: Record<string, string> = {
        CRITICAL: 'bg-red-100 text-red-700 border border-red-200',
        HIGH: 'bg-orange-100 text-orange-700 border border-orange-200',
        MEDIUM: 'bg-amber-100 text-amber-700 border border-amber-200',
        LOW: 'bg-sky-100 text-sky-700 border border-sky-200',
        MINIMAL: 'bg-green-100 text-green-700 border border-green-200',
    };
    const cls = styles[tier] || 'bg-surface-container text-on-surface-variant border border-outline-variant/30';
    return <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${cls}`}>{tier}</span>;
}

// ─── Creative: Burnout Dial — SVG arc gauge ──────────────────────────────────
function BurnoutDial({ value, max = 10 }: { value: number; max?: number }) {
    const pct = Math.min(1, value / max);
    const radius = 70;
    const cx = 100; const cy = 100;
    const startAngle = -210;
    const endAngle = 30;
    const totalAngle = endAngle - startAngle;
    const arcAngle = startAngle + totalAngle * pct;

    function polarToXY(angleDeg: number, r: number) {
        const a = (angleDeg * Math.PI) / 180;
        return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    }

    function describeArc(fromAngle: number, toAngle: number, r: number) {
        const s = polarToXY(fromAngle, r);
        const e = polarToXY(toAngle, r);
        const large = toAngle - fromAngle > 180 ? 1 : 0;
        return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
    }

    const dialColor = pct > 0.7 ? '#a83836' : pct > 0.4 ? '#d97706' : '#305ea9';
    const dialLabel = pct > 0.7 ? 'Critical' : pct > 0.4 ? 'Elevated' : 'Healthy';

    // tick marks
    const ticks = Array.from({ length: 11 }, (_, i) => {
        const angle = startAngle + (totalAngle * i) / 10;
        const inner = polarToXY(angle, radius - 12);
        const outer = polarToXY(angle, radius);
        return { inner, outer, i };
    });

    return (
        <div className="flex flex-col items-center">
            <svg viewBox="0 0 200 160" className="w-full max-w-[220px]">
                {/* Track */}
                <path
                    d={describeArc(startAngle, endAngle, radius)}
                    fill="none"
                    stroke="rgba(172,178,189,0.25)"
                    strokeWidth={14}
                    strokeLinecap="round"
                />
                {/* Colored arc */}
                <path
                    d={describeArc(startAngle, arcAngle, radius)}
                    fill="none"
                    stroke={dialColor}
                    strokeWidth={14}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s' }}
                />
                {/* Glow under arc */}
                <path
                    d={describeArc(startAngle, arcAngle, radius)}
                    fill="none"
                    stroke={dialColor}
                    strokeWidth={22}
                    strokeLinecap="round"
                    opacity={0.12}
                />
                {/* Tick marks */}
                {ticks.map(({ inner, outer, i }) => (
                    <line
                        key={i}
                        x1={inner.x} y1={inner.y}
                        x2={outer.x} y2={outer.y}
                        stroke="rgba(172,178,189,0.4)"
                        strokeWidth={i === 0 || i === 5 || i === 10 ? 2 : 1}
                    />
                ))}
                {/* Value text cleanly stacked (no needle clutter) */}
                <text x={cx} y={cy - 6} textAnchor="middle" fontSize={36} fontWeight={800} fontFamily="Manrope, sans-serif" fill={dialColor}>
                    {value.toFixed(1)}
                </text>
                <text x={cx} y={cy + 16} textAnchor="middle" fontSize={11} fill="#595f69" fontFamily="Inter, sans-serif" fontWeight="600">
                    / {max}
                </text>
                <text x={cx} y={cy + 36} textAnchor="middle" fontSize={13} fontWeight={800} fontFamily="Inter, sans-serif" fill={dialColor} letterSpacing="0.05em">
                    {dialLabel.toUpperCase()}
                </text>
            </svg>
        </div>
    );
}

// ─── Creative: Signal Heatmap bar ────────────────────────────────────────────
function SignalBar({ label, value, max, color, icon }: { label: string; value: number; max: number; color: string; icon: string }) {
    const pct = Math.min(100, (value / max) * 100);
    return (
        <div className="flex items-center gap-4">
            <div className="w-36 shrink-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`material-symbols-outlined text-[15px] ${color}`}>{icon}</span>
                    <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">{label}</span>
                </div>
            </div>
            <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700`}
                    style={{
                        width: `${pct}%`,
                        background: color.includes('error') ? '#a83836' :
                            color.includes('amber') ? '#d97706' :
                                color.includes('primary') ? '#305ea9' :
                                    color.includes('tertiary') ? '#625983' : '#305ea9',
                    }}
                />
            </div>
            <span className={`text-sm font-bold w-12 text-right ${color}`}>
                {typeof value === 'number' ? value.toFixed(1) : value}
            </span>
        </div>
    );
}

// ─── Creative: Anomaly Timeline ───────────────────────────────────────────────
function AnomalyTimeline({ anomalies }: { anomalies: Anomaly[] }) {
    const last5 = anomalies.slice(-5).reverse();
    return (
        <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-surface-container-high rounded-full" />
            <div className="space-y-4">
                {last5.map((a, i) => {
                    const severity = a.isolationScore > 0.7 ? 'error' : a.isolationScore > 0.4 ? 'amber' : 'yellow';
                    const dotColor = severity === 'error' ? 'bg-error' : severity === 'amber' ? 'bg-amber-500' : 'bg-yellow-400';
                    return (
                        <div key={i} className="relative flex items-start gap-3">
                            {/* Dot on timeline */}
                            <div className={`absolute -left-[18px] top-1.5 w-2.5 h-2.5 rounded-full ${dotColor} ring-2 ring-white`} />
                            <div className="flex-1 bg-white/50 p-3 rounded-xl border border-white/30">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-mono text-xs text-on-surface-variant">{a.date}</span>
                                    <div className="flex gap-3 text-[10px] text-on-surface-variant">
                                        <span>ISO: <strong>{a.isolationScore.toFixed(2)}</strong></span>
                                        <span>Z: <strong>{a.zScoreMax.toFixed(2)}</strong></span>
                                    </div>
                                </div>
                                <p className="text-xs text-on-surface font-medium truncate">{a.triggerFeature || 'Behavioral pattern shift detected'}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Creative: Forecast Horizon visualization ─────────────────────────────────
function ForecastHorizon({ forecast }: { forecast: Forecast }) {
    const zones = [
        { label: 'Now', prob: forecast.currentProb, days: 0 },
        { label: '7 Day', prob: forecast.forecast7dAvg, days: 7 },
        { label: '14 Day', prob: forecast.forecast14dAvg, days: 14 },
    ];
    const maxProb = Math.max(...zones.map(z => z.prob), 0.01);

    return (
        <div>
            <div className="flex items-end gap-3 h-32">
                {zones.map((z, i) => {
                    const pct = (z.prob / Math.max(maxProb * 1.1, 0.1)) * 100;
                    const color = z.prob > 0.7 ? '#a83836' : z.prob > 0.4 ? '#d97706' : '#305ea9';
                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-xs font-bold" style={{ color }}>{(z.prob * 100).toFixed(1)}%</span>
                            <div className="w-full flex items-end" style={{ height: '80px' }}>
                                <div
                                    className="w-full rounded-t-xl transition-all duration-700"
                                    style={{
                                        height: `${pct}%`,
                                        background: `linear-gradient(to top, ${color}cc, ${color}40)`,
                                        minHeight: '4px',
                                    }}
                                />
                            </div>
                            <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">{z.label}</span>
                        </div>
                    );
                })}
            </div>
            {/* Trend indicator */}
            <div className="mt-4 flex items-center gap-3 text-sm">
                <TrendIcon direction={forecast.trendDirection} />
                <span className={`font-medium ${trendColor(forecast.trendDirection)}`}>{trendLabel(forecast.trendDirection)} trend</span>
                <span className="text-on-surface-variant text-xs">· {forecast.numChangepoints} changepoints · vol: {forecast.avgVolatility.toFixed(3)}</span>
            </div>
        </div>
    );
}

// ─── Creative: Wellness Orbit — animated SVG rings ────────────────────────────
function WellnessOrbit({ stats }: { stats: EmployeeStat }) {
    const metrics = [
        { label: 'Deep Work', value: stats.deepWorkIndex / 100, color: '#305ea9', r: 48 },
        { label: 'Connection', value: (stats.connectionIndex ?? 50) / 100, color: '#625983', r: 37 },
        { label: 'Recovery', value: Math.max(0, 1 - (stats.recoveryDebt ?? 0) / 10), color: '#546071', r: 26 },
    ];

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative">
                <svg viewBox="0 0 120 120" className="w-36 h-36">
                    {/* Orbit rings */}
                    {metrics.map(({ r, color, value }, i) => {
                        const circ = 2 * Math.PI * r;
                        const dash = circ * value;
                        const gap = circ - dash;
                        return (
                            <g key={i}>
                                {/* Track */}
                                <circle cx={60} cy={60} r={r} fill="none" stroke="rgba(172,178,189,0.15)" strokeWidth={7} />
                                {/* Progress */}
                                <circle
                                    cx={60} cy={60} r={r}
                                    fill="none"
                                    stroke={color}
                                    strokeWidth={7}
                                    strokeLinecap="round"
                                    strokeDasharray={`${dash} ${gap}`}
                                    strokeDashoffset={circ * 0.25}
                                    style={{ transition: 'stroke-dasharray 1s ease' }}
                                    transform={`rotate(-90 60 60)`}
                                />
                            </g>
                        );
                    })}
                    {/* Center */}
                    <text x={60} y={66} textAnchor="middle" fontSize={24} fontWeight={800} fontFamily="Manrope" fill="#2d333b">
                        {stats.productivity}%
                    </text>
                </svg>
            </div>
            {/* Legend */}
            <div className="flex flex-col gap-1.5 w-full">
                {metrics.map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-on-surface-variant font-medium">{label}</span>
                        </div>
                        <span className="font-bold text-on-surface">{(value * 100).toFixed(0)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Creative: Daily Schedule Strip ─────────────────────────────────────────
function DailyScheduleStrip({ stats }: { stats: EmployeeStat }) {
    const deepWork = Math.max(1, Math.round((stats.deepWorkIndex / 100) * 8));
    const meetings = Math.min(4, Math.round((stats.fragmentationScore ?? 30) / 25));
    const recovery = 1;
    const admin = 8 - deepWork - meetings - recovery;

    const blocks = [
        ...Array(deepWork).fill({ type: 'deep', label: 'Deep Work', color: 'bg-primary/80', icon: 'center_focus_strong' }),
        ...Array(Math.max(0, meetings)).fill({ type: 'meeting', label: 'Meetings', color: 'bg-tertiary/70', icon: 'groups' }),
        ...Array(Math.max(0, admin)).fill({ type: 'admin', label: 'Admin', color: 'bg-secondary-fixed-dim/80', icon: 'inbox' }),
        ...Array(recovery).fill({ type: 'break', label: 'Recovery', color: 'bg-surface-container-high', icon: 'self_improvement' }),
    ];

    const hours = ['9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm'];

    return (
        <div>
            <div className="flex gap-1 mb-2">
                {blocks.slice(0, 8).map((b, i) => (
                    <div
                        key={i}
                        title={b.label}
                        className={`flex-1 h-8 rounded-lg ${b.color} flex items-center justify-center cursor-default transition-all hover:scale-105`}
                    >
                        <span className="material-symbols-outlined text-white/80 text-[14px]">{b.icon}</span>
                    </div>
                ))}
            </div>
            <div className="flex gap-1">
                {hours.map((h, i) => (
                    <div key={i} className="flex-1 text-center text-[9px] text-on-surface-variant font-medium">{h}</div>
                ))}
            </div>
            <div className="flex gap-4 mt-3 flex-wrap">
                {[
                    { label: 'Deep Work', color: 'bg-primary/80' },
                    { label: 'Meetings', color: 'bg-tertiary/70' },
                    { label: 'Admin', color: 'bg-secondary-fixed-dim/80' },
                    { label: 'Recovery', color: 'bg-surface-container-high' },
                ].map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-1.5 text-[10px] text-on-surface-variant">
                        <div className={`w-2 h-2 rounded ${color}`} />
                        {label}
                    </div>
                ))}
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

// ─── Main Employee Dashboard ──────────────────────────────────────────────────
export default function EmployeeDashboard({ user, onLogout }: { user: AppUser; onLogout?: () => void }) {
    const [empStats, setEmpStats] = useState<EmployeeStat | null>(null);
    const [history, setHistory] = useState<EmployeeHistory[]>([]);
    const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
    const [forecast, setForecast] = useState<Forecast | null>(null);
    const [narrative, setNarrative] = useState<Narrative | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeWindow, setActiveWindow] = useState('overview');

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
                    { date: 'Mon', burnoutIndex: 2.0, deepWorkIndex: 80, fragmentationScore: 30, connectionIndex: 60, recoveryDebt: 1 },
                    { date: 'Tue', burnoutIndex: 2.5, deepWorkIndex: 75, fragmentationScore: 40, connectionIndex: 55, recoveryDebt: 1.5 },
                    { date: 'Wed', burnoutIndex: 3.5, deepWorkIndex: 60, fragmentationScore: 60, connectionIndex: 50, recoveryDebt: 2 },
                    { date: 'Thu', burnoutIndex: 3.2, deepWorkIndex: 70, fragmentationScore: 50, connectionIndex: 52, recoveryDebt: 1.8 },
                    { date: 'Fri', burnoutIndex: 4.1, deepWorkIndex: 50, fragmentationScore: 70, connectionIndex: 45, recoveryDebt: 3 },
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
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="w-10 h-10 rounded-full border-4 border-surface-container border-t-primary animate-spin" />
                <p className="text-on-surface-variant text-sm font-medium">Loading Workload Analysis...</p>
            </div>
        );
    }

    const factorTags = empStats.drivingFactors
        ? empStats.drivingFactors.split(/[;,]/).map(f => f.trim()).filter(Boolean)
        : [];

    const radarData = [
        { subject: 'Deep Work', value: empStats.deepWorkIndex ?? 50, fullMark: 100 },
        { subject: 'Connection', value: empStats.connectionIndex ?? 50, fullMark: 100 },
        { subject: 'Recovery', value: Math.max(0, 100 - (empStats.recoveryDebt ?? 0) * 10), fullMark: 100 },
        { subject: 'Focus', value: Math.max(0, 100 - (empStats.fragmentationScore ?? 50)), fullMark: 100 },
        { subject: 'Productivity', value: empStats.productivity ?? 70, fullMark: 100 },
    ];

    const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="flex h-screen overflow-hidden font-body text-on-surface">

            {/* ══════════════════ Sidebar ══════════════════ */}
            <aside className="w-64 flex-shrink-0 glass-sidebar flex flex-col p-6 gap-2 z-50 overflow-y-auto">
                <div className="mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-tinted">
                        <span className="text-white font-extrabold text-base font-headline">P</span>
                    </div>
                    <div>
                        <h2 className="text-base font-extrabold text-primary font-headline leading-tight">PulseIQ</h2>
                        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Productivity Intelligence</p>
                    </div>
                </div>

                <nav className="space-y-1 flex-1">
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2 px-1">Dashboard</p>
                    <NavLink icon="monitoring" label="My Wellness" active={activeWindow === 'overview'} onClick={() => setActiveWindow('overview')} />
                    <NavLink icon="whatshot" label="Buzz" active={activeWindow === 'buzz'} onClick={() => setActiveWindow('buzz')} />
                </nav>

                <div className="pt-4 border-t border-white/20 space-y-2">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold shadow-tinted">
                            {initials(user.name)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-on-surface truncate">{user.name}</p>
                            <p className="text-[10px] text-on-surface-variant capitalize">{user.role}</p>
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
                    <header className="glass-topbar rounded-2xl flex justify-between items-center px-6 py-4 sticky top-0 z-40 mb-8">
                        <h1 className="text-xl font-bold font-headline text-on-surface tracking-tight">
                            Personal Overview
                        </h1>
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                <span className="absolute inset-y-0 left-3 flex items-center text-on-surface-variant">
                                    <span className="material-symbols-outlined text-[18px]">search</span>
                                </span>
                                <input
                                    id="dashboard-search"
                                    className="pl-9 pr-4 py-2 bg-white/50 border-none rounded-xl focus:ring-2 focus:ring-primary/30 w-56 text-sm outline-none placeholder-on-surface-variant"
                                    placeholder="Search resources..."
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

                    {/* Main Body */}
                    {activeWindow === 'overview' && (
                        <div className="space-y-8 animate-fade-slide-up">

            {/* ── Greeting Header ── */}
            <div className="glass-card p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <p className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-1">Your Wellness Dashboard</p>
                    <h2 className="text-3xl font-extrabold font-headline text-on-surface">{user.name}</h2>
                    <p className="text-on-surface-variant mt-1 text-sm">Real-time workload intelligence · Multi-model ML analysis</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <RiskBadge tier={empStats.riskTier} />
                    {empStats.ensembleProb != null && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-tertiary-container/40 text-on-tertiary-container text-xs font-bold">
                            <Shield className="w-3 h-3" />
                            Ensemble: {(empStats.ensembleProb * 100).toFixed(1)}%
                            {empStats.ensembleConfidence != null && (
                                <span className="opacity-70 ml-1">({(empStats.ensembleConfidence * 100).toFixed(0)}% conf)</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Anomaly Alert Banner ── */}
            {anomalies.length > 0 && (
                <div className="glass-card p-4 rounded-2xl flex items-start gap-4 border-l-4 border-amber-500">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                        <h3 className="text-sm font-bold text-on-surface">Anomaly Detected — {anomalies.length} unusual pattern{anomalies.length > 1 ? 's' : ''} found</h3>
                        <p className="text-sm text-on-surface-variant mt-0.5">
                            Latest on <span className="font-mono">{anomalies[anomalies.length - 1].date}</span>
                            {anomalies[anomalies.length - 1].triggerFeature && (
                                <> — triggered by <span className="font-semibold text-amber-600">{anomalies[anomalies.length - 1].triggerFeature}</span></>
                            )}
                        </p>
                    </div>
                </div>
            )}

            {/* ── Hero Row: Burnout Dial + Wellness Orbit + Signals ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Burnout Dial */}
                <div className="glass-card p-6 rounded-2xl flex flex-col items-center gap-2">
                    <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest self-start">Burnout Index</h3>
                    <BurnoutDial value={empStats.burnoutIndex} max={10} />
                    <p className="text-xs text-on-surface-variant text-center w-full px-2">
                        Predicted: <span className={`font-bold ${empStats.status === 'critical' ? 'text-error' : empStats.status === 'warning' ? 'text-amber-600' : 'text-primary'}`}>{empStats.predictedBurnout}</span>
                    </p>
                </div>

                {/* Wellness Orbit */}
                <div className="glass-card p-6 rounded-2xl flex flex-col gap-2">
                    <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Wellness Rings</h3>
                    <WellnessOrbit stats={empStats} />
                </div>

                {/* Signal Bars */}
                <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
                    <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Signal Breakdown</h3>
                    <div className="space-y-3 flex-1 justify-center flex flex-col">
                        <SignalBar label="Deep Work" value={empStats.deepWorkIndex} max={100} color="text-primary" icon="center_focus_strong" />
                        <SignalBar
                            label="Fragmentation"
                            value={empStats.fragmentationScore ?? 0}
                            max={100}
                            color={(empStats.fragmentationScore ?? 0) > 70 ? 'text-error' : (empStats.fragmentationScore ?? 0) > 50 ? 'text-amber-600' : 'text-primary'}
                            icon="bubble_chart"
                        />
                        <SignalBar label="Connection" value={empStats.connectionIndex ?? 50} max={100} color="text-tertiary" icon="hub" />
                        <SignalBar
                            label="Recovery Debt"
                            value={empStats.recoveryDebt ?? 0}
                            max={10}
                            color={(empStats.recoveryDebt ?? 0) > 5 ? 'text-error' : (empStats.recoveryDebt ?? 0) > 2 ? 'text-amber-600' : 'text-primary'}
                            icon="battery_alert"
                        />
                    </div>
                </div>
            </div>

            {/* ── Driving Factors ── */}
            {factorTags.length > 0 && (
                <div className="glass-card p-5 rounded-2xl">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">ML-Identified Driving Factors</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {factorTags.map((f, i) => (
                            <span key={i} className="text-xs font-medium bg-secondary-container text-on-secondary-container px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-secondary-fixed-dim transition-colors">
                                <Zap className="w-3 h-3 text-amber-500" /> {f}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Multi-Signal Trend Chart ── */}
            <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-base font-bold font-headline text-on-surface mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">ssid_chart</span>
                    14-Day Multi-Signal Trend
                </h2>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="empBurnout" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#a83836" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#a83836" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="empDeep" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#305ea9" stopOpacity={0.18} />
                                    <stop offset="95%" stopColor="#305ea9" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="empFrag" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="empConn" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#625983" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#625983" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(172,178,189,0.2)" vertical={false} />
                            <XAxis dataKey="date" stroke="#595f69" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="#595f69" fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'rgba(172,178,189,0.3)', borderRadius: '12px', color: '#2d333b' }}
                                itemStyle={{ fontWeight: 500 }}
                            />
                            <Area type="monotone" dataKey="burnoutIndex" name="Burnout Risk" stroke="#a83836" strokeWidth={2.5} fillOpacity={1} fill="url(#empBurnout)" />
                            <Area type="monotone" dataKey="deepWorkIndex" name="Deep Work" stroke="#305ea9" strokeWidth={2} fillOpacity={1} fill="url(#empDeep)" />
                            <Area type="monotone" dataKey="fragmentationScore" name="Fragmentation" stroke="#d97706" strokeWidth={1.5} fillOpacity={1} fill="url(#empFrag)" strokeDasharray="4 2" />
                            <Area type="monotone" dataKey="connectionIndex" name="Connection" stroke="#625983" strokeWidth={1.5} fillOpacity={1} fill="url(#empConn)" strokeDasharray="4 2" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── Radar + Forecast Horizon ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Wellness Radar */}
                <div className="glass-card p-6 rounded-2xl">
                    <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Wellness Radar</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <RadarChart data={radarData} outerRadius="70%">
                            <PolarGrid stroke="rgba(172,178,189,0.2)" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#595f69', fontSize: 11, fontFamily: 'Inter' }} />
                            <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                            <Radar name="Wellness" dataKey="value" stroke="#305ea9" fill="#305ea9" fillOpacity={0.12} strokeWidth={2} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                {/* Forecast Horizon */}
                {forecast ? (
                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-5">Burnout Forecast Horizon</h3>
                        <ForecastHorizon forecast={forecast} />
                        {/* EWMA current */}
                        <div className="mt-4 p-3 rounded-xl bg-surface-container-low flex items-center justify-between text-sm">
                            <span className="text-on-surface-variant">EWMA Smoothed</span>
                            <span className="font-bold text-tertiary">{(forecast.ewmaCurrent * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                ) : (
                    <div className="glass-card p-6 rounded-2xl flex items-center justify-center text-on-surface-variant text-sm">
                        No forecast data available yet.
                    </div>
                )}
            </div>

            {/* ── Today's Cognitive Schedule ── */}
            <div className="glass-card p-6 rounded-2xl">
                <div className="flex items-center gap-2 mb-5">
                    <span className="material-symbols-outlined text-primary text-[20px]">schedule</span>
                    <h3 className="text-base font-bold font-headline text-on-surface">Today's Cognitive Load Map</h3>
                </div>
                <DailyScheduleStrip stats={empStats} />
                <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-3 text-sm">
                    <span className="material-symbols-outlined text-primary text-[18px]">lightbulb</span>
                    <p className="text-on-primary-container">
                        Based on your current metrics, schedule deep work <strong>before noon</strong> when cognitive load is lowest.
                    </p>
                </div>
            </div>

            {/* ── AI Risk Narrative ── */}
            {narrative && (
                <div className="glass-card p-6 rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="material-symbols-outlined text-tertiary text-[20px]">auto_awesome</span>
                        <h3 className="text-base font-bold font-headline text-on-surface">AI Risk Narrative</h3>
                        <RiskBadge tier={narrative.riskTier} />
                    </div>
                    <p className="text-sm text-on-surface leading-relaxed bg-primary/5 p-4 rounded-xl border border-primary/10 italic">
                        "{narrative.narrative}"
                    </p>
                </div>
            )}

            {/* ── Anomaly Timeline ── */}
            {anomalies.length > 0 && (
                <div className="glass-card p-6 rounded-2xl">
                    <div className="flex items-center gap-2 mb-5">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        <h3 className="text-base font-bold font-headline text-on-surface">Anomaly Detection Log</h3>
                    </div>
                    <AnomalyTimeline anomalies={anomalies} />
                </div>
            )}
                        </div>
                    )}

                    {activeWindow === 'buzz' && (
                        <div className="space-y-8 animate-fade-slide-up">
                            <div className="glass-card p-8 rounded-2xl">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="material-symbols-outlined text-primary text-[28px]">campaign</span>
                                    <h2 className="text-2xl font-extrabold font-headline text-on-surface">The Buzz</h2>
                                </div>
                                <p className="text-on-surface-variant mb-6 font-medium">While you were offline, here's what happened around the team:</p>
                                
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4 p-4 bg-white/40 border border-white/20 rounded-xl">
                                        <div className="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-tertiary text-[20px]">celebration</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-on-surface">Project Phoenix Launch</p>
                                            <p className="text-sm text-on-surface-variant mt-0.5">The design team successfully pushed the new mockups to staging late last night.</p>
                                            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mt-2">2 hours ago</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-4 p-4 bg-white/40 border border-white/20 rounded-xl">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-primary text-[20px]">update</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-on-surface">Sprint Planning Rescheduled</p>
                                            <p className="text-sm text-on-surface-variant mt-0.5">Alex moved the planning meeting to Thursday at 10 AM to accommodate timezone differences.</p>
                                            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mt-2">5 hours ago</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-4 p-4 bg-white/40 border border-white/20 rounded-xl">
                                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-amber-600 text-[20px]">forum</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-on-surface">New Discussion Thread</p>
                                            <p className="text-sm text-on-surface-variant mt-0.5">A debate started in the #engineering channel regarding the new API gateway timeout limits.</p>
                                            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mt-2">Yesterday</p>
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
