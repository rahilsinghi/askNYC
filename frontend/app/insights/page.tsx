'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, Activity, Zap, Building2 } from 'lucide-react';
import Link from 'next/link';

export default function InsightsPage() {
    return (
        <main className="min-h-screen bg-midnight text-silver-mist p-12">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header */}
                <header className="flex items-end justify-between">
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center gap-2 text-silver-mist/40 hover:text-electric-cyan transition-colors mb-4 group">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-xs font-mono uppercase tracking-widest">Back to Atlas</span>
                        </Link>
                        <h1 className="text-6xl font-medium tracking-tight">Spatial Insights</h1>
                        <p className="text-silver-mist/60 max-w-md">Aggregated city intelligence and emerging urban signals across all intelligence sectors.</p>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Total Scans" value="1,284" change="+12%" icon={<Activity className="w-5 h-5" />} />
                    <StatCard title="Active Signals" value="482" change="+5%" icon={<Zap className="w-5 h-5" />} />
                    <StatCard title="Anomalies Tracked" value="24" change="-2" icon={<TrendingUp className="w-5 h-5" />} />
                    <StatCard title="Avg Efficiency" value="A-" change="+1" icon={<Building2 className="w-5 h-5" />} />
                </div>

                {/* Visual Story Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5, duration: 1 }}
                        className="glass rounded-3xl p-10 h-[500px] flex flex-col"
                    >
                        <div className="mb-8">
                            <h2 className="text-2xl font-medium mb-2">Urban Consumption Trends</h2>
                            <p className="text-silver-mist/40 text-sm">Real-time energy variance across Manhattan districts.</p>
                        </div>

                        <div className="flex-1 flex items-end gap-3 px-4">
                            {[40, 60, 45, 90, 70, 50, 85, 65, 40, 55, 75, 95].map((h, i) => (
                                <div key={i} className="flex-1 group relative">
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${h}%` }}
                                        transition={{ delay: 1 + (i * 0.05), duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                                        className="w-full bg-electric-cyan/20 rounded-t-lg group-hover:bg-electric-cyan/40 transition-all"
                                    />
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        <span className="text-[10px] font-mono text-electric-cyan">{h}kWh</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5, duration: 1 }}
                        className="glass rounded-3xl p-10 h-[500px] flex flex-col overflow-hidden relative"
                    >
                        <div className="z-10">
                            <h2 className="text-2xl font-medium mb-2">District Distribution</h2>
                            <p className="text-silver-mist/40 text-sm">Most scanned neighborhoods this cycle.</p>
                        </div>

                        <div className="flex-1 flex items-center justify-center">
                            {/* Abstract radial visual */}
                            <div className="relative w-64 h-64">
                                <div className="absolute inset-0 rounded-full border-2 border-white/5 animate-[spin_20s_linear_infinite]" />
                                <div className="absolute inset-4 rounded-full border border-electric-cyan/20 animate-[spin_15s_linear_infinite_reverse]" />
                                <div className="absolute inset-12 rounded-full border-4 border-electric-cyan/40 animate-pulse" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <p className="text-4xl font-semibold">64%</p>
                                    <p className="text-[10px] font-mono tracking-widest text-silver-mist/40 uppercase">Midtown</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </main>
    );
}

function StatCard({ title, value, change, icon }: { title: string; value: string; change: string | number; icon: React.ReactNode }) {
    return (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="glass p-8 rounded-3xl"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-electric-cyan">
                    {icon}
                </div>
                <span className={`text-xs font-mono ${change.toString().startsWith('-') ? 'text-warm-amber' : 'text-electric-cyan'}`}>
                    {change}
                </span>
            </div>
            <p className="text-silver-mist/40 text-[10px] uppercase tracking-widest mb-1">{title}</p>
            <p className="text-4xl font-medium tracking-tight text-silver-mist">{value}</p>
        </motion.div>
    );
}
