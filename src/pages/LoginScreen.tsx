import React, { useState } from 'react';
import { AppUser } from '../types';
import { loginApi } from '../api';

export default function LoginScreen({ onLogin }: { onLogin: (user: AppUser) => void }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e?: React.FormEvent, explicitUsername?: string) => {
        if (e) e.preventDefault();
        const u = explicitUsername || username;
        setError('');
        setIsLoading(true);
        const user = await loginApi(u);
        setIsLoading(false);
        if (user) {
            onLogin(user);
        } else {
            setError('No user found. Try: m1, m2, or E001');
        }
    };

    const quickLogins = [
        { id: 'm1', label: 'Manager 1', sub: 'Engineering', icon: 'manage_accounts', accent: 'text-primary border-primary/20 hover:border-primary/40 hover:bg-primary/5' },
        { id: 'm2', label: 'Manager 2', sub: 'Design', icon: 'manage_accounts', accent: 'text-tertiary border-tertiary/20 hover:border-tertiary/40 hover:bg-tertiary/5' },
        { id: 'e001', label: 'Employee', sub: 'At Risk', icon: 'person', accent: 'text-error border-error/20 hover:border-error/40 hover:bg-red-50' },
        { id: 'e005', label: 'Employee', sub: 'Stable', icon: 'person', accent: 'text-secondary border-secondary/20 hover:border-secondary/40 hover:bg-surface-container' },
    ];

    return (
        <div className="min-h-screen flex font-body">

            {/* ── Left Pane — Brand Panel ── */}
            <div className="hidden lg:flex w-1/2 flex-col justify-between p-14 relative overflow-hidden">
                {/* Mesh gradient is inherited from body; add extra tinted layer */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-tertiary/10 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-[60%] h-[60%] rounded-full bg-tertiary-fixed/30 blur-[80px] pointer-events-none" />
                <div className="absolute top-0 left-0 w-[50%] h-[50%] rounded-full bg-primary-fixed/20 blur-[100px] pointer-events-none" />

                {/* Logo */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl gradient-primary flex items-center justify-center shadow-tinted">
                        <span className="text-white font-extrabold text-lg font-headline">P</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold font-headline text-primary leading-tight">PulseIQ</h1>
                        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Burnout Intelligence</p>
                    </div>
                </div>

                {/* Hero copy */}
                <div className="relative z-10 max-w-md">
                    <h2 className="text-5xl font-extrabold font-headline text-on-surface leading-tight tracking-tight mb-6">
                        Stop burnout<br />
                        <span className="text-primary">before it starts.</span>
                    </h2>
                    <p className="text-on-surface-variant text-base leading-relaxed mb-10">
                        AI-driven workload optimization that keeps your team healthy, productive, and perfectly balanced.
                    </p>

                    {/* Feature list */}
                    <div className="space-y-4">
                        {[
                            { icon: 'analytics', label: 'Predictive burnout analytics', color: 'text-primary' },
                            { icon: 'swap_horiz', label: 'Smart task reallocation engine', color: 'text-tertiary' },
                            { icon: 'timeline', label: '14-day multi-model forecasting', color: 'text-secondary' },
                            { icon: 'model_training', label: 'Ensemble ML confidence scoring', color: 'text-primary' },
                        ].map(({ icon, label, color }) => (
                            <div key={label} className="flex items-center gap-4">
                                <div className={`w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center ${color}`}>
                                    <span className="material-symbols-outlined text-[18px]">{icon}</span>
                                </div>
                                <span className="text-on-surface font-medium text-sm">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Floating stat cards */}
                <div className="relative z-10 flex gap-4">
                    <div className="glass-card px-4 py-3 rounded-2xl flex-1">
                        <p className="text-2xl font-extrabold font-headline text-on-surface">94%</p>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Prediction Accuracy</p>
                    </div>
                    <div className="glass-card px-4 py-3 rounded-2xl flex-1">
                        <p className="text-2xl font-extrabold font-headline text-on-surface">8</p>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">ML Models Active</p>
                    </div>
                    <div className="glass-card px-4 py-3 rounded-2xl flex-1">
                        <p className="text-2xl font-extrabold font-headline text-on-surface">↓18%</p>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Burnout Reduction</p>
                    </div>
                </div>
            </div>

            {/* ── Right Pane — Login Form ── */}
            <div className="flex-1 flex flex-col justify-center items-center px-8 sm:px-16 relative">
                {/* Mobile logo */}
                <div className="lg:hidden flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-tinted">
                        <span className="text-white font-extrabold text-base font-headline">P</span>
                    </div>
                    <h1 className="text-xl font-extrabold font-headline text-primary">PulseIQ</h1>
                </div>

                <div className="w-full max-w-sm">
                    <div className="glass-card p-8 rounded-2xl shadow-glass-lg">
                        <div className="mb-7">
                            <h2 className="text-2xl font-extrabold font-headline text-on-surface">Welcome back</h2>
                            <p className="text-on-surface-variant text-sm mt-1">Sign in to your intelligence hub.</p>
                        </div>

                        <form id="login-form" onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                                    Username
                                </label>
                                <input
                                    id="username-input"
                                    type="text"
                                    value={username}
                                    onChange={e => { setUsername(e.target.value); setError(''); }}
                                    className={`w-full bg-surface-container-low/60 border rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-sm ${error ? 'border-error/40 focus:border-error' : 'border-outline-variant/20 focus:border-primary/40'}`}
                                    placeholder="m1, m2, or E001"
                                    disabled={isLoading}
                                    autoComplete="username"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                                    Password
                                </label>
                                <input
                                    id="password-input"
                                    type="password"
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setError(''); }}
                                    className={`w-full bg-surface-container-low/60 border rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-sm ${error ? 'border-error/40 focus:border-error' : 'border-outline-variant/20 focus:border-primary/40'}`}
                                    placeholder="••••••••"
                                    disabled={isLoading}
                                    autoComplete="current-password"
                                />
                                {error && (
                                    <p className="text-error text-xs mt-1.5 font-medium">{error}</p>
                                )}
                            </div>

                            <button
                                id="signin-btn"
                                type="submit"
                                disabled={isLoading}
                                className="w-full gradient-primary text-white font-bold py-3 rounded-xl shadow-tinted hover:shadow-lg active:scale-98 transition-all flex justify-center items-center h-12 text-sm mt-2"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : 'Sign In'}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-outline-variant/20" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="px-3 bg-white text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">1-Click Demo</span>
                            </div>
                        </div>

                        {/* Quick login tiles */}
                        <div className="grid grid-cols-2 gap-2.5">
                            {quickLogins.map(({ id, label, sub, icon, accent }) => (
                                <button
                                    key={id}
                                    id={`quick-login-${id}`}
                                    onClick={e => handleLogin(e, id)}
                                    disabled={isLoading}
                                    className={`flex flex-col items-center p-3.5 bg-white/50 border rounded-2xl transition-all ${accent}`}
                                >
                                    <span className={`material-symbols-outlined text-[22px] mb-1`}>{icon}</span>
                                    <span className="text-xs font-bold text-on-surface">{label}</span>
                                    <span className="text-[10px] text-on-surface-variant">{sub}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <p className="text-center text-on-surface-variant text-xs mt-6 font-medium">
                        © 2026 PulseIQ · Burnout Intelligence Platform
                    </p>
                </div>
            </div>
        </div>
    );
}
