'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Volume2, ArrowUpRight, Cpu, Network } from 'lucide-react';

export default function AnswerPanel() {
    return (
        <motion.div
            initial={{ x: 450, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 1.5, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-8 top-8 bottom-8 w-[420px] bg-slate-950/40 backdrop-blur-2xl rounded-[2.5rem] z-50 overflow-hidden flex flex-col shadow-[0_30px_100px_rgba(0,0,0,0.8)] border border-white/10 font-mono"
        >
            <div className="p-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-10">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">Intelligence</h2>
                        <div className="flex items-center gap-2">
                            <Cpu className="w-3 h-3 text-white/40" />
                            <span className="text-[10px] text-white/30 font-mono uppercase tracking-[0.2em]">Neural Engine v4.2</span>
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Network className="w-6 h-6 text-white/60" />
                    </div>
                </div>

                <div className="space-y-10 flex-1 overflow-y-auto pr-2 scrollbar-none">
                    <section className="space-y-4">
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em]">Contextual Query</p>
                        <p className="text-2xl font-light leading-snug text-white/90">
                            "Identify premier <span className="text-white font-bold underline decoration-white/20">jazz venues</span> in Lower Manhattan with live availability."
                        </p>
                    </section>

                    <div className="h-[1px] w-full bg-gradient-to-r from-white/20 to-transparent" />

                    <section className="space-y-8">
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Synthesized Result</p>
                            <h3 className="text-xl font-bold text-white tracking-tight">Current Hotspots</h3>
                        </div>

                        <div className="space-y-6">
                            {[
                                { name: 'Blue Note', desc: 'World-renowned venue. High-intensity sets. Landmark location.', link: 'bluenotejazz.com' },
                                { name: 'Smalls Jazz Club', desc: 'Underground Greenwich Village staple. Raw, authentic vibe.', link: 'smallsjazz.com' },
                                { name: 'The Django', desc: 'Subterranean Paris-inspired club in Tribeca. Premium acoustics.', link: 'thedjangonyc.com' }
                            ].map((spot, i) => (
                                <div key={i} className="group cursor-pointer">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-bold text-white text-lg group-hover:text-white/80 transition-colors uppercase">{spot.name}</h4>
                                        <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                    </div>
                                    <p className="text-sm leading-relaxed text-white/50 mb-2">
                                        {spot.desc}
                                    </p>
                                    <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest">{spot.link}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="mt-auto pt-8 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-white/40">
                        <Volume2 className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
                        <MessageSquare className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
                    </div>
                    <button className="px-6 py-2.5 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-white/90 transition-all">
                        Deep Dive
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
