import React, { useEffect, useState } from 'react';
import { Brain, Flame, Timer, Target, Briefcase, Clock, Activity, Coffee, Check, User, Zap } from 'lucide-react';
import { AppUser, EmployeeStat } from '../types';
import { fetchEmployees } from '../api';

export default function EmployeeDashboard({ user }: { user: AppUser }) {
    const [empStats, setEmpStats] = useState<EmployeeStat | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const emps = await fetchEmployees(); // Fetch all or filter by ID
            const me = emps.find(e => e.id.toLowerCase() === user.id.toLowerCase()) || {
                id: user.id,
                name: user.name,
                role: user.role,
                productivity: 85,
                burnout: 15,
                status: 'healthy',
                managerId: '',
                burnoutIndex: 1.5,
                predictedBurnout: 'Stable',
                deepWorkIndex: 80
            };
            setEmpStats(me);
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

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Your Dashboard, {user.name}</h2>
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
