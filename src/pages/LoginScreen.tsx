import React, { useState } from 'react';
import { Activity, Brain, Clock, Zap, User, Briefcase } from 'lucide-react';
import { AppUser } from '../types';
import { loginApi } from '../api';

export default function LoginScreen({ onLogin }: { onLogin: (user: AppUser) => void }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e?: React.FormEvent, explicitUsername?: string, explicitPassword?: string) => {
        if (e) e.preventDefault();
        const u = explicitUsername || username;
        const p = explicitPassword || password; // The backend currently doesn't check password

        setError('');
        setIsLoading(true);

        const user = await loginApi(u);
        
        setIsLoading(false);
        if (user) {
            onLogin(user);
        } else {
            setError('Invalid username or password.');
        }
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
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Username <span className="text-zinc-600 font-normal ml-2">Hint: m1, m2, or E001</span></label>
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

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <button
                                onClick={(e) => handleLogin(e, 'm1', 'password')}
                                disabled={isLoading}
                                className="flex flex-col items-center justify-center p-3 bg-zinc-900/40 hover:bg-zinc-800 border border-zinc-800/80 rounded-xl transition-all group"
                            >
                                <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 mb-2 group-hover:border-emerald-500/50 transition-colors">
                                    <User className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                                </div>
                                <span className="text-sm font-medium text-zinc-300 text-center leading-tight">Manager 1<br /><span className="text-[10px] text-zinc-500 font-normal">(Engineering)</span></span>
                            </button>

                            <button
                                onClick={(e) => handleLogin(e, 'm2', 'password')}
                                disabled={isLoading}
                                className="flex flex-col items-center justify-center p-3 bg-zinc-900/40 hover:bg-zinc-800 border border-zinc-800/80 rounded-xl transition-all group"
                            >
                                <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 mb-2 group-hover:border-emerald-500/50 transition-colors">
                                    <User className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                                </div>
                                <span className="text-sm font-medium text-zinc-300 text-center leading-tight">Manager 2<br /><span className="text-[10px] text-zinc-500 font-normal">(Design)</span></span>
                            </button>

                            <button
                                onClick={(e) => handleLogin(e, 'e001', 'password')}
                                disabled={isLoading}
                                className="flex flex-col items-center justify-center p-3 bg-zinc-900/40 hover:bg-zinc-800 border border-zinc-800/80 rounded-xl transition-all group"
                            >
                                <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 mb-2 group-hover:border-rose-500/50 transition-colors">
                                    <Briefcase className="w-4 h-4 text-zinc-400 group-hover:text-rose-400 transition-colors" />
                                </div>
                                <span className="text-sm font-medium text-zinc-300 text-center leading-tight">Employee<br /><span className="text-[10px] text-zinc-500 font-normal">(At Risk)</span></span>
                            </button>

                            <button
                                onClick={(e) => handleLogin(e, 'e005', 'password')}
                                disabled={isLoading}
                                className="flex flex-col items-center justify-center p-3 bg-zinc-900/40 hover:bg-zinc-800 border border-zinc-800/80 rounded-xl transition-all group"
                            >
                                <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 mb-2 group-hover:border-blue-500/50 transition-colors">
                                    <Briefcase className="w-4 h-4 text-zinc-400 group-hover:text-blue-400 transition-colors" />
                                </div>
                                <span className="text-sm font-medium text-zinc-300 text-center leading-tight">Employee<br /><span className="text-[10px] text-zinc-500 font-normal">(Stable)</span></span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
