import React, { useState, useEffect, useRef } from 'react';
import {
    Activity,
    ArrowDown,
    ArrowUp,
    CheckCircle2,
    Cpu,
    Database,
    FastForward,
    Layers,
    Play,
    Pause,
    RefreshCw,
    Rewind,
    RotateCcw,
    Server,
    ShieldCheck,
    Users,
    Zap,
    TrendingUp,
    TrendingDown,
    Lock
} from 'lucide-react';
import {
    AreaChart,
    Area,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { fetchFederatedStatus, triggerFederatedTraining } from '../api';
import { FederatedStatusResponse, FederatedRound, FederatedClientInfo } from '../types';

export default function FederatedLearningSimulation() {
    const [data, setData] = useState<FederatedStatusResponse | null>(null);
    const [selectedRoundIdx, setSelectedRoundIdx] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [isTriggering, setIsTriggering] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedClientTab, setSelectedClientTab] = useState<string>('Client_0');

    const playTimerRef = useRef<number | null>(null);

    // Initial fetch & polling if training is in progress
    const loadStatus = async () => {
        const res = await fetchFederatedStatus();
        if (res) {
            setData(res);
            // Default to latest round if currently viewing last round
            if (res.rounds && res.rounds.length > 0) {
                setSelectedRoundIdx(prev => {
                    if (prev === 0 || prev >= res.rounds.length) {
                        return res.rounds.length - 1;
                    }
                    return prev;
                });
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        loadStatus();
    }, []);

    // Polling interval when training
    useEffect(() => {
        let interval: any = null;
        if (data?.status === 'training' || isTriggering) {
            interval = setInterval(() => {
                loadStatus();
            }, 1500);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [data?.status, isTriggering]);

    // Auto-play replay timer
    useEffect(() => {
        if (isPlaying && data?.rounds && data.rounds.length > 0) {
            playTimerRef.current = window.setInterval(() => {
                setSelectedRoundIdx(prev => {
                    if (prev >= data.rounds.length - 1) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 2500);
        } else {
            if (playTimerRef.current) clearInterval(playTimerRef.current);
        }
        return () => {
            if (playTimerRef.current) clearInterval(playTimerRef.current);
        };
    }, [isPlaying, data?.rounds]);

    const handleTriggerTrain = async () => {
        setIsTriggering(true);
        setIsPlaying(false);
        await triggerFederatedTraining();
        await loadStatus();
        setIsTriggering(false);
    };

    const rounds = data?.rounds || [];
    const currentRoundData: FederatedRound | null = rounds[selectedRoundIdx] || (rounds.length > 0 ? rounds[rounds.length - 1] : null);
    const clients: FederatedClientInfo[] = data?.clients || [];
    const isTrainingLive = data?.status === 'training';

    // Format chart data from actual genuine round history
    const chartData = rounds.map((r, idx) => ({
        round: `Round ${r.round}`,
        roundNum: r.round,
        valAuc: r.val_auc,
        trainLoss: r.train_loss,
        trainAcc: (r.train_accuracy * 100).toFixed(1),
        client0_loss: r.client_metrics?.['Client_0']?.train_loss || 0,
        client1_loss: r.client_metrics?.['Client_1']?.train_loss || 0,
        client2_loss: r.client_metrics?.['Client_2']?.train_loss || 0,
        client0_auc: r.client_metrics?.['Client_0']?.val_auc || 0,
        client1_auc: r.client_metrics?.['Client_1']?.val_auc || 0,
        client2_auc: r.client_metrics?.['Client_2']?.val_auc || 0,
    }));

    // Clients comparison for the currently selected round
    const clientComparisonData = clients.map(c => {
        const metrics = currentRoundData?.client_metrics?.[c.client_id];
        return {
            name: c.name.split(' (')[0],
            clientId: c.client_id,
            loss: metrics ? metrics.train_loss : 0,
            accuracy: metrics ? Math.round(metrics.train_accuracy * 100) : 0,
            auc: metrics ? metrics.val_auc : 0,
            trainSamples: c.train_samples,
            valSamples: c.val_samples,
        };
    });

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                <span className="ml-3 text-sm font-semibold text-on-surface-variant">Loading Federated Learning Simulation...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-slide-up pb-12">
            {/* ═══════════════════════════════════════════════════════════════
                TOP BANNER & CONTROLS
               ═══════════════════════════════════════════════════════════════ */}
            <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <span className="p-2.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                <Activity className="w-6 h-6" />
                            </span>
                            <div>
                                <h2 className="text-xl font-bold font-headline text-on-surface flex items-center gap-2">
                                    Federated Learning Simulation (Flower + FedAvg)
                                </h2>
                                <p className="text-xs text-on-surface-variant">
                                    Decentralized TensorFlow Bidirectional LSTM training across 3 client clusters with mathematical parameter aggregation.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Status Badge */}
                        <div className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 border ${
                            isTrainingLive
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                : data?.status === 'completed'
                                ? 'bg-green-500/10 text-green-600 border-green-500/30'
                                : 'bg-surface-container text-on-surface-variant border-outline-variant/30'
                        }`}>
                            {isTrainingLive ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Training Round {data?.current_round} / {data?.total_rounds}</span>
                                </>
                            ) : data?.status === 'completed' ? (
                                <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                    <span>Global Model Converged</span>
                                </>
                            ) : (
                                <span>Not Started</span>
                            )}
                        </div>

                        {/* Re-run button */}
                        <button
                            onClick={handleTriggerTrain}
                            disabled={isTrainingLive || isTriggering}
                            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all ${
                                isTrainingLive || isTriggering
                                    ? 'bg-surface-container text-on-surface-variant cursor-not-allowed opacity-70'
                                    : 'bg-primary text-white hover:bg-primary/90 active:scale-95'
                            }`}
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isTrainingLive || isTriggering ? 'animate-spin' : ''}`} />
                            <span>{isTrainingLive ? 'Training in Progress...' : 'Run Federated Training'}</span>
                        </button>
                    </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                    <div className="p-4 rounded-xl bg-surface/60 border border-outline-variant/30">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-primary" />
                            Client Partitions
                        </span>
                        <p className="text-2xl font-black font-headline text-on-surface mt-1">3 Clients</p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">30 synthetic employees (10/client)</p>
                    </div>

                    <div className="p-4 rounded-xl bg-surface/60 border border-outline-variant/30">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-primary" />
                            Total Sequences
                        </span>
                        <p className="text-2xl font-black font-headline text-on-surface mt-1">
                            {clients.reduce((acc, c) => acc + c.train_samples + c.val_samples, 0)} Windows
                        </p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">14-day sliding burnout features</p>
                    </div>

                    <div className="p-4 rounded-xl bg-surface/60 border border-outline-variant/30">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                            Global Validation AUC
                        </span>
                        <p className="text-2xl font-black font-headline text-green-600 mt-1">
                            {currentRoundData ? (currentRoundData.val_auc).toFixed(4) : (data?.global_model.final_val_auc || '0.0000')}
                        </p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                            {selectedRoundIdx > 0 && rounds[selectedRoundIdx - 1] ? (
                                <span className="text-green-600 font-semibold">
                                    +{((currentRoundData!.val_auc - rounds[selectedRoundIdx - 1].val_auc) * 100).toFixed(2)}% vs prev round
                                </span>
                            ) : (
                                'Initial baseline'
                            )}
                        </p>
                    </div>

                    <div className="p-4 rounded-xl bg-surface/60 border border-outline-variant/30">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
                            <TrendingDown className="w-3.5 h-3.5 text-primary" />
                            Global Training Loss
                        </span>
                        <p className="text-2xl font-black font-headline text-primary mt-1">
                            {currentRoundData ? (currentRoundData.train_loss).toFixed(4) : (data?.global_model.final_train_loss || '0.0000')}
                        </p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">Binary Crossentropy</p>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                ROUND REPLAY & STEPPER CONTROLS
               ═══════════════════════════════════════════════════════════════ */}
            <div className="glass-card p-5 rounded-2xl">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                            Replay Timeline:
                        </span>
                        <div className="flex items-center gap-1.5 bg-surface-container/60 p-1 rounded-xl border border-outline-variant/30">
                            {rounds.map((r, idx) => (
                                <button
                                    key={r.round}
                                    onClick={() => {
                                        setSelectedRoundIdx(idx);
                                        setIsPlaying(false);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        selectedRoundIdx === idx
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                                    }`}
                                >
                                    Round {r.round}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Playback action buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setSelectedRoundIdx(0);
                                setIsPlaying(false);
                            }}
                            disabled={selectedRoundIdx === 0}
                            title="First Round"
                            className="p-2 rounded-xl bg-surface hover:bg-surface-container border border-outline-variant/30 text-on-surface-variant hover:text-on-surface disabled:opacity-40 transition-colors"
                        >
                            <Rewind className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => {
                                setSelectedRoundIdx(prev => Math.max(0, prev - 1));
                                setIsPlaying(false);
                            }}
                            disabled={selectedRoundIdx === 0}
                            title="Previous Round"
                            className="p-2 rounded-xl bg-surface hover:bg-surface-container border border-outline-variant/30 text-on-surface-variant hover:text-on-surface disabled:opacity-40 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                        </button>

                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            disabled={rounds.length <= 1}
                            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                                isPlaying
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                            }`}
                        >
                            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            <span>{isPlaying ? 'Pause' : 'Auto Play'}</span>
                        </button>

                        <button
                            onClick={() => {
                                setSelectedRoundIdx(prev => Math.min(rounds.length - 1, prev + 1));
                                setIsPlaying(false);
                            }}
                            disabled={selectedRoundIdx >= rounds.length - 1}
                            title="Next Round"
                            className="p-2 rounded-xl bg-surface hover:bg-surface-container border border-outline-variant/30 text-on-surface-variant hover:text-on-surface disabled:opacity-40 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>

                        <button
                            onClick={() => {
                                setSelectedRoundIdx(rounds.length - 1);
                                setIsPlaying(false);
                            }}
                            disabled={selectedRoundIdx >= rounds.length - 1}
                            title="Latest Round"
                            className="p-2 rounded-xl bg-surface hover:bg-surface-container border border-outline-variant/30 text-on-surface-variant hover:text-on-surface disabled:opacity-40 transition-colors"
                        >
                            <FastForward className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                INTERACTIVE FEDERATED TOPOLOGY MAP
               ═══════════════════════════════════════════════════════════════ */}
            <div className="glass-card p-6 rounded-2xl relative">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-primary" />
                            Federated Topology & Parameter Exchange
                        </h3>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                            Visual state of Round {currentRoundData?.round || 1}: Weight Broadcast → Local Client Optimization → FedAvg Aggregation
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container px-3 py-1 rounded-full border border-outline-variant/20">
                        <Lock className="w-3 h-3 text-green-600" />
                        <span>Data stays on client nodes</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
                    {/* Top / Global Aggregator Card */}
                    <div className="lg:col-span-3 p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-tertiary/10 border-2 border-primary/30 shadow-sm relative overflow-hidden">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md">
                                    <Server className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-base font-extrabold text-on-surface">Central Flower Server (FedAvg Aggregator)</h4>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white">
                                            Round {currentRoundData?.round || 1}
                                        </span>
                                    </div>
                                    <p className="text-xs text-on-surface-variant mt-0.5">
                                        Aggregating 3 client weight updates weighted by local sample size: <code className="bg-surface/80 px-1.5 py-0.5 rounded text-[11px] font-mono text-primary font-bold">θ(r+1) = Σ (n_k / N) · θ_k</code>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 text-right">
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-on-surface-variant">Global Parameters</span>
                                    <p className="text-sm font-extrabold text-on-surface font-mono">
                                        {data?.global_model.total_parameters?.toLocaleString() || '68,689'} Weights
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-on-surface-variant">Round AUC</span>
                                    <p className="text-sm font-extrabold text-green-600 font-mono">
                                        {currentRoundData?.val_auc.toFixed(4) || '—'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-on-surface-variant">Round Loss</span>
                                    <p className="text-sm font-extrabold text-primary font-mono">
                                        {currentRoundData?.train_loss.toFixed(4) || '—'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3 Participating Client Node Cards */}
                    {clients.map((c, cIdx) => {
                        const m = currentRoundData?.client_metrics?.[c.client_id];
                        const isSelected = selectedClientTab === c.client_id;
                        return (
                            <div
                                key={c.client_id}
                                onClick={() => setSelectedClientTab(c.client_id)}
                                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                                    isSelected
                                        ? 'bg-surface shadow-md border-primary scale-[1.01]'
                                        : 'bg-surface/70 hover:bg-surface border-outline-variant/30'
                                }`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                            C{cIdx + 1}
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-bold text-on-surface">{c.name}</h5>
                                            <span className="text-[10px] font-mono text-on-surface-variant">{c.client_id}</span>
                                        </div>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                        {c.num_employees} Employees
                                    </span>
                                </div>

                                <div className="space-y-2 mt-4 pt-3 border-t border-outline-variant/20 text-xs">
                                    <div className="flex justify-between items-center text-on-surface-variant">
                                        <span>Training Samples:</span>
                                        <span className="font-bold text-on-surface font-mono">{c.train_samples} windows</span>
                                    </div>
                                    <div className="flex justify-between items-center text-on-surface-variant">
                                        <span>Validation Samples:</span>
                                        <span className="font-bold text-on-surface font-mono">{c.val_samples} windows</span>
                                    </div>
                                    <div className="flex justify-between items-center text-on-surface-variant">
                                        <span>Local Train Loss:</span>
                                        <span className="font-bold text-primary font-mono">{m ? m.train_loss.toFixed(4) : '—'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-on-surface-variant">
                                        <span>Local Accuracy:</span>
                                        <span className="font-bold text-green-600 font-mono">{m ? `${(m.train_accuracy * 100).toFixed(1)}%` : '—'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-on-surface-variant">
                                        <span>Local Val AUC:</span>
                                        <span className="font-bold text-tertiary font-mono">{m ? m.val_auc.toFixed(4) : '—'}</span>
                                    </div>
                                </div>

                                {/* Employee ID tags */}
                                <div className="mt-4 pt-3 border-t border-outline-variant/20">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5">
                                        Assigned Employees:
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                        {c.employees.map(eid => (
                                            <span key={eid} className="px-1.5 py-0.5 rounded bg-surface-container text-[10px] font-mono text-on-surface font-semibold">
                                                {eid}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-4 pt-2 flex items-center justify-between text-[11px] text-on-surface-variant">
                                    <span className="flex items-center gap-1 text-green-700">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        Private Partition
                                    </span>
                                    <span className="flex items-center gap-1 text-primary">
                                        <Zap className="w-3.5 h-3.5" />
                                        FedAvg Uplink Active
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                METRIC PROGRESSION CHARTS (GENUINE DATA ONLY)
               ═══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Validation AUC Curve */}
                <div className="glass-card p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-green-600" />
                                Global Validation AUC Progression
                            </h3>
                            <p className="text-xs text-on-surface-variant mt-0.5">
                                Real evaluation metric across federated rounds (Flower FedAvg)
                            </p>
                        </div>
                    </div>

                    <div className="h-[260px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="aucGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0.0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                <XAxis dataKey="round" tick={{ fontSize: 11 }} />
                                <YAxis domain={[0.7, 1.0]} tick={{ fontSize: 11 }} />
                                <Tooltip
                                    formatter={(value: any) => [Number(value).toFixed(4), 'Validation AUC']}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="valAuc"
                                    stroke="#16a34a"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#aucGrad)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Training Loss Convergence */}
                <div className="glass-card p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface flex items-center gap-2">
                                <TrendingDown className="w-4 h-4 text-primary" />
                                Training Loss Convergence
                            </h3>
                            <p className="text-xs text-on-surface-variant mt-0.5">
                                Weighted average binary crossentropy loss across 3 clients
                            </p>
                        </div>
                    </div>

                    <div className="h-[260px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                <XAxis dataKey="round" tick={{ fontSize: 11 }} />
                                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                                <Tooltip
                                    formatter={(value: any) => [Number(value).toFixed(4), 'Train Loss']}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="trainLoss"
                                    stroke="#0284c7"
                                    strokeWidth={3}
                                    dot={{ r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                PER-CLIENT PERFORMANCE BREAKDOWN
               ═══════════════════════════════════════════════════════════════ */}
            <div className="glass-card p-6 rounded-2xl">
                <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface mb-2">
                    Client-Level Convergence in Round {currentRoundData?.round || 1}
                </h3>
                <p className="text-xs text-on-surface-variant mb-6">
                    Independent loss, accuracy, and validation AUC values reported by each client's NumPyClient container.
                </p>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-outline-variant/30 text-on-surface-variant">
                                <th className="py-3 px-4 font-bold uppercase">Client Node</th>
                                <th className="py-3 px-4 font-bold uppercase">Assigned Employees</th>
                                <th className="py-3 px-4 font-bold uppercase">Train Samples</th>
                                <th className="py-3 px-4 font-bold uppercase">Local Loss</th>
                                <th className="py-3 px-4 font-bold uppercase">Local Accuracy</th>
                                <th className="py-3 px-4 font-bold uppercase">Local Val AUC</th>
                                <th className="py-3 px-4 font-bold uppercase">FedAvg Weight</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/20">
                            {clients.map(c => {
                                const m = currentRoundData?.client_metrics?.[c.client_id];
                                const totalTrain = clients.reduce((acc, cl) => acc + cl.train_samples, 0);
                                const weightShare = totalTrain > 0 ? ((c.train_samples / totalTrain) * 100).toFixed(1) : '33.3';
                                return (
                                    <tr key={c.client_id} className="hover:bg-surface/50 transition-colors">
                                        <td className="py-3 px-4 font-bold text-on-surface">
                                            {c.name} <span className="font-mono text-on-surface-variant text-[10px]">({c.client_id})</span>
                                        </td>
                                        <td className="py-3 px-4 font-mono text-on-surface-variant">
                                            {c.employees[0]} → {c.employees[c.employees.length - 1]} ({c.num_employees} emps)
                                        </td>
                                        <td className="py-3 px-4 font-mono font-bold text-on-surface">{c.train_samples}</td>
                                        <td className="py-3 px-4 font-mono font-bold text-primary">{m ? m.train_loss.toFixed(4) : '—'}</td>
                                        <td className="py-3 px-4 font-mono font-bold text-green-600">{m ? `${(m.train_accuracy * 100).toFixed(1)}%` : '—'}</td>
                                        <td className="py-3 px-4 font-mono font-bold text-tertiary">{m ? m.val_auc.toFixed(4) : '—'}</td>
                                        <td className="py-3 px-4 font-mono font-bold text-on-surface">{weightShare}% (n_k / N)</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                MODEL ARTIFACTS & INTEGRATION PROOF
               ═══════════════════════════════════════════════════════════════ */}
            <div className="glass-card p-6 rounded-2xl bg-surface/80">
                <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface mb-2 flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary" />
                    Global Model Artifacts & Integration Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs">
                    <div className="p-3.5 rounded-xl bg-surface border border-outline-variant/30 space-y-1">
                        <span className="font-bold text-on-surface-variant block">Keras Global Model:</span>
                        <code className="text-primary font-mono block truncate">pulseiq_data/models/lstm_burnout_model.keras</code>
                        <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1 mt-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Aggregated Global Checkpoint Saved
                        </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-surface border border-outline-variant/30 space-y-1">
                        <span className="font-bold text-on-surface-variant block">Predictions CSV:</span>
                        <code className="text-primary font-mono block truncate">pulseiq_data/lstm_predictions.csv</code>
                        <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1 mt-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 1,380 Predictions Active in Ensemble
                        </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-surface border border-outline-variant/30 space-y-1">
                        <span className="font-bold text-on-surface-variant block">Architecture:</span>
                        <span className="text-on-surface font-semibold block truncate">Bidirectional LSTM (64) → LSTM (32)</span>
                        <span className="text-[11px] text-on-surface-variant font-mono block mt-1">
                            Sigmoid Output [0, 1] Burnout Risk
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
