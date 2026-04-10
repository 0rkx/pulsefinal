import React, { useState } from 'react';
import { Activity, LogOut } from 'lucide-react';
import { AppUser } from './types';
import LoginScreen from './pages/LoginScreen';
import ManagerDashboard from './pages/ManagerDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';

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
