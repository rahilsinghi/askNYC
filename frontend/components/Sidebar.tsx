'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Compass, BarChart3, Clock, Settings, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Sidebar() {
    const items = [
        { icon: <Compass className="w-5 h-5" />, label: 'Explore', active: true },
        { icon: <BarChart3 className="w-5 h-5" />, label: 'Analysis' },
        { icon: <Clock className="w-5 h-5" />, label: 'History' },
        { icon: <Settings className="w-5 h-5" />, label: 'Settings' },
    ];

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-24 bg-midnight/90 backdrop-blur-3xl border-r border-white/5 z-[60] flex flex-col items-center py-8">
            <div className="mb-12 flex flex-col items-center gap-4">
                <div className="text-xl font-bold tracking-tighter text-silver-mist">
                    <span className="text-electric-cyan">A</span>+NYC
                </div>
                <div className="w-[1px] h-8 bg-white/10" />
            </div>

            <nav className="flex-1 flex flex-col gap-10">
                {items.map((item, i) => (
                    <button
                        key={i}
                        className={cn(
                            "flex flex-col items-center gap-2 group transition-all relative px-4",
                            item.active ? "text-electric-cyan font-bold" : "text-white/40 hover:text-white/80"
                        )}
                    >
                        {item.active && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-electric-cyan rounded-r-full shadow-[0_0_15px_#41E4F4]" />
                        )}
                        <div className={cn(
                            "p-3 rounded-2xl transition-all",
                            item.active ? "bg-electric-cyan/10" : "group-hover:bg-white/5"
                        )}>
                            {item.icon}
                        </div>
                        <span className="text-[9px] uppercase tracking-widest leading-none outline-none">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="mt-auto">
                <div className="w-10 h-10 rounded-full glass-pill flex items-center justify-center text-silver-mist/40 border-white/5">
                    <Compass className="w-5 h-5" />
                </div>
            </div>
        </aside>
    );
}
