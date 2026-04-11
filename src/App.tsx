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

    // Employee gets a full-page layout managed by EmployeeDashboard itself
    return (
        <EmployeeDashboard 
            user={currentUser} 
            onLogout={() => setCurrentUser(null)} 
        />
    );
}
