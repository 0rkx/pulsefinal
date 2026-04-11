import React, { useState } from 'react';
import { AppUser } from './types';
import LoginScreen from './pages/LoginScreen';
import ManagerDashboard from './pages/ManagerDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';

export default function App() {
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

    if (!currentUser) {
        return <LoginScreen onLogin={setCurrentUser} />;
    }

    // Manager gets a full-page layout managed by ManagerDashboard itself
    if (currentUser.role === 'manager') {
        return (
            <ManagerDashboard
                user={currentUser}
                onLogout={() => setCurrentUser(null)}
                mode={'manager'}
                setMode={() => {}}
            />
        );
    }

    // Employee gets the glass-themed wrapper
    return (
        <div className="min-h-screen font-body text-on-surface">
            {/* Compact top bar for employee view */}
            <header className="sticky top-0 z-40 px-6 py-3 glass-topbar flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
                        <span className="text-white font-bold text-sm font-headline">P</span>
                    </div>
                    <h1 className="text-lg font-bold font-headline text-primary tracking-tight">PulseIQ</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-on-surface-variant font-medium">
                        {currentUser.name}
                    </span>
                    <button
                        id="logout-btn"
                        onClick={() => setCurrentUser(null)}
                        className="text-xs font-semibold px-4 py-2 rounded-xl bg-white/50 hover:bg-white/80 text-on-surface-variant hover:text-on-surface border border-white/30 transition-all"
                    >
                        Sign Out
                    </button>
                </div>
            </header>
            <main className="max-w-5xl mx-auto px-4 py-8">
                <EmployeeDashboard user={currentUser} />
            </main>
        </div>
    );
}
