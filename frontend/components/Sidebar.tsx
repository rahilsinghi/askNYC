'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Compass, BarChart3, Clock, Settings, Shield, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
    onSettingsClick?: () => void
}

export default function Sidebar({ onSettingsClick }: SidebarProps) {
    const items = [
        { icon: <Compass className="w-5 h-5" />, label: 'Explore', active: true },
        { icon: <BarChart3 className="w-5 h-5" />, label: 'Analysis' },
        { icon: <Clock className="w-5 h-5" />, label: 'History' },
        { icon: <Settings className="w-5 h-5" />, label: 'Settings', onClick: onSettingsClick },
    ];

    return (
        <aside className="fixed left-6 top-6 bottom-6 w-20 bg-[#07111D]/90 backdrop-blur-3xl border border-white/10 z-[100] flex flex-col items-center py-10 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.9)]">
            <div className="mb-14 flex flex-col items-center">
                <div className="text-[10px] font-black text-white tracking-[0.2em] flex items-center gap-1">
                    <span>A</span>
                    <span className="text-cyan-400">+</span>
                    <span>NYC</span>
                </div>
            </div>

            <nav className="flex-1 flex flex-col gap-12">
                {items.map((item, i) => (
                    <button
                        key={i}
                        onClick={item.onClick}
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
                                className="absolute -left-10 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-cyan-400 shadow-[0_0_15px_#22d3ee] rounded-r-full"
                            />
                        )}
                        <span className="text-[8px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="mt-auto">
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/20 hover:text-white/50 transition-colors cursor-pointer hover:bg-white/5">
                    <Shield className="w-4 h-4" />
                </div>
            </div>
        </aside>
    );
}
