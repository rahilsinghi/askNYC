'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Compass, BarChart3, Clock, Settings, Zap, Shield, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Sidebar() {
    const items = [
        { icon: <Target className="w-5 h-5" />, label: 'Objective', active: true },
        { icon: <Compass className="w-5 h-5" />, label: 'Navigate' },
        { icon: <BarChart3 className="w-5 h-5" />, label: 'Insights' },
        { icon: <Shield className="w-5 h-5" />, label: 'Security' },
    ];

    return (
        <aside className="fixed left-6 top-6 bottom-6 w-20 bg-slate-950/40 backdrop-blur-2xl border border-white/10 z-[60] flex flex-col items-center py-10 rounded-[2rem] shadow-[0_0_40px_rgba(0,0,0,0.5)]">
            <div className="mb-14 flex flex-col items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/20 to-transparent border border-white/20 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-white/80 shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                </div>
            </div>

            <nav className="flex-1 flex flex-col gap-12">
                {items.map((item, i) => (
                    <button
                        key={i}
                        className={cn(
                            "group transition-all relative flex flex-col items-center gap-2",
                            item.active ? "text-white" : "text-white/30 hover:text-white/60"
                        )}
                    >
                        <div className={cn(
                            "p-3 rounded-2xl transition-all duration-500",
                            item.active ? "bg-white/10 ring-1 ring-white/20" : "group-hover:bg-white/5"
                        )}>
                            {item.icon}
                        </div>
                        {item.active && (
                            <motion.div
                                layoutId="active-indicator"
                                className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                            />
                        )}
                        <span className="text-[8px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="mt-auto">
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/20 hover:text-white/50 transition-colors cursor-pointer hover:bg-white/5">
                    <Settings className="w-4 h-4" />
                </div>
            </div>
        </aside>
    );
}
