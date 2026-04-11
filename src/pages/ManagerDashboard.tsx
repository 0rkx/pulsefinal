import React, { useState, useEffect } from 'react';
import { AlertTriangle, User, Flame, Timer, Target, ArrowRight, Zap, TrendingUp, Check, X, Brain, LineChart as LineChartIcon } from 'lucide-react';
import { AppUser, EmployeeStat, Suggestion, EmployeeHistory } from '../types';
import { fetchEmployees, fetchSuggestions, fetchEmployeeHistory } from '../api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ManagerDashboard({ user }: { user: AppUser }) {
    const [alertsDismissed, setAlertsDismissed] = useState(false);
    const [teamEmployees, setTeamEmployees] = useState<EmployeeStat[]>([]);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
    const [history, setHistory] = useState<EmployeeHistory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const emps = await fetchEmployees(user.id);
            const suggs = await fetchSuggestions(user.id);
            setTeamEmployees(emps);
            setSuggestions(suggs);
            if (emps.length > 0) {
                setSelectedEmpId(emps[0].id);
            }
            setLoading(false);
        }
        loadData();
    }, [user.id]);

    useEffect(() => {
        if (selectedEmpId) {
            fetchEmployeeHistory(selectedEmpId).then(hist => {
                if (hist && hist.length > 0) {
                    setHistory(hist);
                } else {
                    setHistory([
                        { date: 'Mon', burnoutIndex: 2.0, deepWorkIndex: 80 },
                        { date: 'Tue', burnoutIndex: 2.5, deepWorkIndex: 75 },
                        { date: 'Wed', burnoutIndex: 3.5, deepWorkIndex: 60 },
                        { date: 'Thu', burnoutIndex: 3.2, deepWorkIndex: 70 },
                        { date: 'Fri', burnoutIndex: 4.1, deepWorkIndex: 50 },
                    ]);
                }
            });
        }
    }, [selectedEmpId]);

    const handleSuggestionAction = (id: number, action: string) => {
        setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: action } : s));
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 text-zinc-500">
                <div className="w-8 h-8 border-4 border-zinc-800 border-t-emerald-500 rounded-full animate-spin"></div>
                <span className="ml-3">Loading Intelligence...</span>
            </div>
        );
    }

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

                            <div className="mt-8 pt-6 border-t border-zinc-800/50">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-zinc-300">
                                    <LineChartIcon className="w-4 h-4 text-emerald-500" /> 14-Day Performance Trend
                                </h3>
                                <div className="h-56 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorBurnoutMgr" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorDeepWorkMgr" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                            <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.5rem', color: '#f4f4f5' }}
                                                itemStyle={{ fontWeight: 500 }}
                                            />
                                            <Area type="monotone" dataKey="burnoutIndex" name="Burnout Risk" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorBurnoutMgr)" />
                                            <Area type="monotone" dataKey="deepWorkIndex" name="Deep Work %" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorDeepWorkMgr)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                            <Brain className="w-5 h-5 text-emerald-500" /> AI Task Reallocation
                        </h2>
                        {suggestions.length === 0 && (
                            <p className="text-zinc-500 text-sm italic">No urgent reallocations needed at this time.</p>
                        )}
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
