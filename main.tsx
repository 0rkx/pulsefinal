import React, { useState } from 'react';
import './index.css';
import {
    AlertTriangle, Check, X, Clock, Brain, User,
    Briefcase, Activity, Zap, Coffee, ArrowRight, LogOut,
    Flame, Timer, Target, TrendingUp
} from 'lucide-react';

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

const MOCK_USERS: Record<string, AppUser> = {
    'm1': { id: 'm1', role: 'manager', name: 'Manager 1 (M1)', password: 'password' },
    'm2': { id: 'm2', role: 'manager', name: 'Manager 2 (M2)', password: 'password' },
    'alice': { id: 'e1', role: 'employee', name: 'Alice', password: 'password', managerId: 'm1' },
    'bob': { id: 'e2', role: 'employee', name: 'Bob', password: 'password', managerId: 'm1' },
    'charlie': { id: 'e3', role: 'employee', name: 'Charlie', password: 'password', managerId: 'm2' },
    'dave': { id: 'e4', role: 'employee', name: 'Dave', password: 'password', managerId: 'm2' },
    'fiona': { id: 'e5', role: 'employee', name: 'Fiona', password: 'password', managerId: 'm2' }
};

const EMPLOYEES_DB: EmployeeStat[] = [
    { id: 'e1', name: "Alice", role: "Backend Engineer", productivity: 88, burnout: 82, status: "critical", managerId: 'm1', burnoutIndex: 8.2, predictedBurnout: "3 Days", deepWorkIndex: 45 },
    { id: 'e2', name: "Bob", role: "Fullstack Dev", productivity: 92, burnout: 35, status: "healthy", managerId: 'm1', burnoutIndex: 3.5, predictedBurnout: "Stable", deepWorkIndex: 88 },
    { id: 'e3', name: "Charlie", role: "Frontend Eng", productivity: 78, burnout: 45, status: "healthy", managerId: 'm2', burnoutIndex: 4.5, predictedBurnout: "Stable", deepWorkIndex: 72 },
    { id: 'e4', name: "Dave", role: "Data Scientist", productivity: 95, burnout: 60, status: "healthy", managerId: 'm2', burnoutIndex: 6.0, predictedBurnout: "3 Weeks", deepWorkIndex: 94 },
    { id: 'e5', name: "Fiona", role: "Product Designer", productivity: 65, burnout: 88, status: "critical", managerId: 'm2', burnoutIndex: 8.8, predictedBurnout: "1 Day", deepWorkIndex: 30 },
];

const SUGGESTIONS_DB: Suggestion[] = [
    { id: 1, task: "Q3 API Integration", from: "Alice", to: "Bob", reason: "Bob has 30% lower cognitive load and overlapping skills.", benefits: ["-25% burnout risk for Alice", "+15% team delivery speed"], status: 'pending', managerId: 'm1' },
    { id: 2, task: "Client Onboarding", from: "Fiona", to: "Dave", reason: "Dave has a 2hr idle block this afternoon.", benefits: ["Fiona avoids immediate burnout", "Optimizes Dave's idle capacity"], status: 'pending', managerId: 'm2' },
    { id: 3, task: "Design System Sync", from: "Fiona", to: "Charlie", reason: "Charlie has bandwidth and frontend context.", benefits: ["Fiona regains 1.5h deep work", "Cross-pollinates design context"], status: 'pending', managerId: 'm2' }
];

// --- MAIN APP CONTAINER ---
export default function App() {
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [mode, setMode] = useState<'manager' | 'employee'>('manager');

    if (!currentUser) {
        return <LoginScreen onLogin={setCurrentUser} />;
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30 p-4 md:p-8">
            {/* Top Navigation / Toggle */}
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center mb-8 pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-3 mb-4 sm:mb-0">
                    <div className="bg-emerald-500 p-2 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                        <Activity className="w-6 h-6 text-zinc-950" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Pulse</h1>
                        <p className="text-xs text-zinc-400">Welcome, {currentUser.name}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {currentUser.role === 'manager' && (
                        <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                            <button
                                onClick={() => setMode('manager')}
                                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${mode === 'manager'
                                    ? 'bg-zinc-800 text-white shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-200'
                                    }`}
                            >
                                Manager View
                            </button>
                            <button
                                onClick={() => setMode('employee')}
                                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${mode === 'employee'
                                    ? 'bg-zinc-800 text-white shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-200'
                                    }`}
                            >
                                Employee View
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => setCurrentUser(null)}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </div>

            {/* View Router */}
            <main className="max-w-6xl mx-auto">
                {currentUser.role === 'manager' && mode === 'manager' ? (
                    <ManagerDashboard user={currentUser} />
                ) : (
                    <EmployeeDashboard user={currentUser} />
                )}
            </main>
        </div>
    );
}

// --- LOGIN VIEW ---
function LoginScreen({ onLogin }: { onLogin: (user: AppUser) => void }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e?: React.FormEvent, explicitUsername?: string, explicitPassword?: string) => {
        if (e) e.preventDefault();
        const u = explicitUsername || username;
        const p = explicitPassword || password;

        setError('');
        setIsLoading(true);

        setTimeout(() => {
            const user = MOCK_USERS[u.toLowerCase()];
            if (user && user.password === p) {
                onLogin(user);
            } else {
                setError('Invalid username or password.');
                setIsLoading(false);
            }
        }, 600);
    };

    return (
        <div className="min-h-screen flex bg-zinc-950 font-sans selection:bg-emerald-500/30">
            <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 overflow-hidden border-r border-zinc-800/50 bg-zinc-900/20">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-emerald-500/10 blur-[120px]"></div>
                    <div className="absolute top-[60%] -right-[20%] w-[60%] h-[60%] rounded-full bg-blue-500/5 blur-[100px]"></div>
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjA1KSIvPjwvc3ZnPg==')] opacity-50"></div>
                </div>

                <div className="relative z-10 animate-in fade-in slide-in-from-left-8 duration-700">
                    <div className="flex items-center gap-3 mb-16">
                        <div className="bg-emerald-500 p-2.5 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                            <Activity className="w-7 h-7 text-zinc-950" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Pulse</h1>
                    </div>

                    <div className="max-w-md">
                        <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
                            Stop burnout <br />
                            <span className="text-emerald-400">before it happens.</span>
                        </h2>
                        <p className="text-zinc-400 text-lg leading-relaxed mb-10">
                            AI-driven workload optimization that keeps your team healthy, productive, and perfectly balanced.
                        </p>

                        <div className="space-y-5">
                            <div className="flex items-center gap-4 text-zinc-300">
                                <div className="bg-zinc-800/80 p-2 rounded-lg border border-zinc-700/50">
                                    <Brain className="w-5 h-5 text-emerald-400" />
                                </div>
                                <span className="font-medium">Predictive burnout analytics</span>
                            </div>
                            <div className="flex items-center gap-4 text-zinc-300">
                                <div className="bg-zinc-800/80 p-2 rounded-lg border border-zinc-700/50">
                                    <Zap className="w-5 h-5 text-amber-400" />
                                </div>
                                <span className="font-medium">Smart task reallocation</span>
                            </div>
                            <div className="flex items-center gap-4 text-zinc-300">
                                <div className="bg-zinc-800/80 p-2 rounded-lg border border-zinc-700/50">
                                    <Clock className="w-5 h-5 text-blue-400" />
                                </div>
                                <span className="font-medium">Cognitive load scheduling</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-zinc-600 text-sm font-medium">
                    &copy; 2026 Pulse Optimization Inc.
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 relative">
                <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none lg:hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[100px]"></div>
                </div>

                <div className="w-full max-w-sm mx-auto relative z-10 animate-in fade-in slide-in-from-right-8 duration-500">
                    <div className="lg:hidden flex items-center gap-3 mb-12 justify-center">
                        <div className="bg-emerald-500 p-2 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                            <Activity className="w-6 h-6 text-zinc-950" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white">Pulse</h1>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold text-white mb-2">Welcome back</h2>
                        <p className="text-zinc-400 text-sm">Please enter your details to sign in.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                                className={`w-full bg-zinc-900/50 border ${error ? 'border-rose-500/50 focus:border-rose-500' : 'border-zinc-800 focus:border-emerald-500'} rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all`}
                                placeholder="Enter your username"
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                className={`w-full bg-zinc-900/50 border ${error ? 'border-rose-500/50 focus:border-rose-500' : 'border-zinc-800 focus:border-emerald-500'} rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all`}
                                placeholder="••••••••"
                                disabled={isLoading}
                            />
                            {error && <p className="text-rose-400 text-xs mt-2 animate-in slide-in-from-top-1">{error}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] mt-2 flex justify-center items-center h-12"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>

                    <div className="mt-10">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-zinc-800"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-3 bg-zinc-950 text-zinc-500 font-medium tracking-wide text-xs uppercase">1-Click Demo Login</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button
                                onClick={(e) => handleLogin(e, 'm1', 'password')}
                                disabled={isLoading}
                                className="flex flex-col items-center justify-center p-3 bg-zinc-900/40 hover:bg-zinc-800 border border-zinc-800/80 rounded-xl transition-all group"
                            >
                                <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 mb-2 group-hover:border-emerald-500/50 transition-colors">
                                    <User className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                                </div>
                                <span className="text-sm font-medium text-zinc-300 text-center leading-tight">Manager 1<br /><span className="text-[10px] text-zinc-500 font-normal">(Alice, Bob)</span></span>
                            </button>

                            <button
                                onClick={(e) => handleLogin(e, 'm2', 'password')}
                                disabled={isLoading}
                                className="flex flex-col items-center justify-center p-3 bg-zinc-900/40 hover:bg-zinc-800 border border-zinc-800/80 rounded-xl transition-all group"
                            >
                                <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 mb-2 group-hover:border-emerald-500/50 transition-colors">
                                    <User className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                                </div>
                                <span className="text-sm font-medium text-zinc-300 text-center leading-tight">Manager 2<br /><span className="text-[10px] text-zinc-500 font-normal">(Dave, Charlie...)</span></span>
                            </button>

                            <button
                                onClick={(e) => handleLogin(e, 'fiona', 'password')}
                                disabled={isLoading}
                                className="flex flex-col items-center justify-center p-3 bg-zinc-900/40 hover:bg-zinc-800 border border-zinc-800/80 rounded-xl transition-all group"
                            >
                                <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 mb-2 group-hover:border-blue-500/50 transition-colors">
                                    <Briefcase className="w-4 h-4 text-zinc-400 group-hover:text-blue-400 transition-colors" />
                                </div>
                                <span className="text-sm font-medium text-zinc-300 text-center leading-tight">Employee<br /><span className="text-[10px] text-zinc-500 font-normal">(Fiona's View)</span></span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- MANAGER VIEW ---
function ManagerDashboard({ user }: { user: AppUser }) {
    const [alertsDismissed, setAlertsDismissed] = useState(false);

    const teamEmployees = EMPLOYEES_DB.filter(e => e.managerId === user.id);
    const teamSuggestions = SUGGESTIONS_DB.filter(s => s.managerId === user.id);

    const [selectedEmpId, setSelectedEmpId] = useState(teamEmployees.length > 0 ? teamEmployees[0].id : null);
    const [suggestions, setSuggestions] = useState(teamSuggestions);

    const handleSuggestionAction = (id: number, action: string) => {
        setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: action } : s));
    };

    const selectedEmp = teamEmployees.find(e => e.id === selectedEmpId);
    const criticalEmp = teamEmployees.find(e => e.status === 'critical');

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {!alertsDismissed && criticalEmp && (
                <div className="bg-rose-950/50 border border-rose-900/50 p-4 rounded-xl flex items-start justify-between shadow-lg shadow-rose-900/10">
                    <div className="flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5" />
                        <div>
                            <h3 className="text-rose-400 font-semibold">Burnout Threshold Warning</h3>
                            <p className="text-sm text-rose-300 mt-1">{criticalEmp.name} is at {criticalEmp.burnout}% burnout risk due to sustained context-switching. Immediate reallocation recommended.</p>
                        </div>
                    </div>
                    <button onClick={() => setAlertsDismissed(true)} className="text-rose-500 hover:text-rose-300 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="col-span-1 space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <User className="w-5 h-5 text-zinc-400" /> Team Overview
                    </h2>
                    <div className="flex flex-col gap-3">
                        {teamEmployees.map((emp) => (
                            <button
                                key={emp.id}
                                onClick={() => setSelectedEmpId(emp.id)}
                                className={`text-left p-4 rounded-xl border transition-all ${selectedEmpId === emp.id
                                    ? 'bg-zinc-800 border-zinc-600 shadow-md transform scale-[1.02]'
                                    : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/50'
                                    }`}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-lg">{emp.name}</span>
                                    {emp.status === 'critical' && (
                                        <span className="flex h-3 w-3 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                                    <div>
                                        <div className="text-zinc-500 mb-1 text-xs uppercase tracking-wider">Productivity</div>
                                        <div className="text-emerald-400 font-medium">{emp.productivity}%</div>
                                    </div>
                                    <div>
                                        <div className="text-zinc-500 mb-1 text-xs uppercase tracking-wider">Burnout Risk</div>
                                        <div className={`${emp.burnout > 70 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-medium'}`}>{emp.burnout}%</div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="col-span-1 lg:col-span-2 space-y-6">
                    {selectedEmp && (
                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-3xl font-bold text-white">{selectedEmp.name}</h2>
                                    <p className="text-zinc-400 font-medium mt-1">{selectedEmp.role}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-zinc-500 uppercase tracking-wider mb-1">Current Status</div>
                                    <div className={`font-semibold px-3 py-1 rounded-full text-sm inline-block ${selectedEmp.status === 'critical'
                                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        }`}>
                                        {selectedEmp.status === 'critical' ? 'At Risk (Threshold > 75%)' : 'Optimal Capacity'}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-zinc-800/50">
                                <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                                    <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2"><Flame className="w-4 h-4" /> Burnout Index</div>
                                    <div className={`text-2xl font-medium ${selectedEmp.status === 'critical' ? 'text-rose-400' : 'text-white'}`}>{selectedEmp.burnoutIndex} <span className="text-sm text-zinc-500">/ 10</span></div>
                                </div>
                                <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                                    <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2"><Timer className="w-4 h-4" /> Time to Burnout</div>
                                    <div className={`text-2xl font-medium ${selectedEmp.status === 'critical' ? 'text-rose-400' : 'text-emerald-400'}`}>{selectedEmp.predictedBurnout}</div>
                                </div>
                                <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                                    <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2"><Target className="w-4 h-4" /> Deep Work Index</div>
                                    <div className="text-2xl font-medium text-emerald-400">{selectedEmp.deepWorkIndex} <span className="text-sm text-zinc-500">/ 100</span></div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                            <Brain className="w-5 h-5 text-emerald-500" /> AI Task Reallocation
                        </h2>
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

// --- EMPLOYEE VIEW ---
function EmployeeDashboard({ user }: { user: AppUser }) {
    const empStats = EMPLOYEES_DB.find(e => e.id === user.id) || EMPLOYEES_DB[0];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Your Dashboard{user && user.role === 'employee' ? `, ${user.name}` : ''}</h2>
                <p className="text-zinc-400">Here is your real-time workload and schedule optimization.</p>
            </div>

            {/* Vital Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2"><Flame className="w-4 h-4" /> Burnout Index</div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-bold ${empStats.status === 'critical' ? 'text-rose-400' : 'text-white'}`}>{empStats.burnoutIndex}</span>
                        <span className="text-zinc-500 font-medium">/ 10</span>
                    </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2"><Timer className="w-4 h-4" /> Est. Time to Burnout</div>
                    <div className={`text-4xl font-bold ${empStats.status === 'critical' ? 'text-rose-400' : 'text-emerald-400'}`}>{empStats.predictedBurnout}</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2"><Target className="w-4 h-4" /> Deep Work Index</div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-blue-400">{empStats.deepWorkIndex}</span>
                        <span className="text-zinc-500 font-medium">/ 100</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col h-full shadow-lg">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-emerald-500" /> Pending Workload
                    </h2>
                    <div className="space-y-4 flex-1">
                        {[
                            { title: "Refactor Auth Flow", time: "2h 30m", type: "Code", urgent: true },
                            { title: "Review PR #442", time: "45m", type: "Review", urgent: false },
                            { title: "Sync with Design Team", time: "30m", type: "Meeting", urgent: false },
                        ].map((task, i) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 bg-zinc-950 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                                <div className="mb-2 sm:mb-0">
                                    <div className="font-medium text-zinc-100">{task.title}</div>
                                    <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">{task.type}</div>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    {task.urgent && <span className="bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-md text-xs font-semibold border border-rose-500/20">Priority</span>}
                                    <div className="flex items-center gap-1.5 text-zinc-300 bg-zinc-800/80 px-3 py-1.5 rounded-md font-medium">
                                        <Clock className="w-4 h-4 text-emerald-500" /> {task.time}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden shadow-lg">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 relative z-10">
                        <Brain className="w-5 h-5 text-emerald-500" /> AI Optimized Schedule
                    </h2>

                    <div className="space-y-4 relative z-10">
                        {[
                            { time: "09:00 - 11:30", label: "Deep Work: Auth Flow", type: "deep", reason: "Placed early when cognitive energy is statistically highest.", icon: <Activity className="w-4 h-4" /> },
                            { time: "11:30 - 12:00", label: "Mandatory Unplug", type: "break", reason: "Required break to reduce context-switching fatigue.", icon: <Coffee className="w-4 h-4" /> },
                            { time: "12:00 - 12:45", label: "Task: PR Review", type: "task", reason: "Lower cognitive load task bridging to lunch.", icon: <Briefcase className="w-4 h-4" /> },
                            { time: "14:00 - 14:30", label: "Admin: Design Sync", type: "admin", reason: "Batched meetings to preserve uninterrupted afternoon blocks.", icon: <User className="w-4 h-4" /> },
                        ].map((slot, i) => {
                            let colorClasses = "";
                            if (slot.type === 'deep') colorClasses = "border-l-blue-500 bg-blue-950/20 text-blue-100 border-blue-900/30";
                            if (slot.type === 'break') colorClasses = "border-l-zinc-500 bg-zinc-800/50 text-zinc-300 border-zinc-700/50";
                            if (slot.type === 'task') colorClasses = "border-l-emerald-500 bg-emerald-950/20 text-emerald-100 border-emerald-900/30";
                            if (slot.type === 'admin') colorClasses = "border-l-amber-500 bg-amber-950/20 text-amber-100 border-amber-900/30";

                            return (
                                <div key={i} className={`p-4 rounded-r-xl border-l-4 border-y border-r ${colorClasses} hover:brightness-110 transition-all`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-semibold text-sm flex items-center gap-2">
                                            {slot.icon} {slot.label}
                                        </div>
                                        <div className="text-xs font-mono opacity-80 bg-black/20 px-2 py-0.5 rounded">{slot.time}</div>
                                    </div>
                                    <p className="text-xs opacity-70 mt-2 flex items-start gap-1.5 leading-relaxed">
                                        <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5 text-current opacity-80" />
                                        {slot.reason}
                                    </p>
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-8 pt-5 border-t border-zinc-800 flex items-center gap-3 text-sm font-medium text-emerald-400 bg-emerald-950/10 p-3 rounded-lg">
                        <div className="bg-emerald-500/20 p-1.5 rounded-full">
                            <Check className="w-4 h-4" />
                        </div>
                        Following this schedule reduces daily burnout probability by 18%.
                    </div>
                </div>
            </div>
        </div>
    );
}