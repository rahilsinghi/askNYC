'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MessageSquare, Volume2, ArrowUpRight } from 'lucide-react';

export default function AnswerPanel() {
    return (
        <motion.div
            initial={{ x: 450, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-8 top-8 bottom-8 w-[400px] glass rounded-[2.5rem] z-50 overflow-hidden flex flex-col shadow-[0_30px_100px_rgba(0,0,0,0.6)] border-white/10 backdrop-blur-2xl"
        >
            <div className="p-10 flex flex-col h-full">
                <div className="space-y-1 mb-10">
                    <h2 className="text-2xl font-bold text-white tracking-tight">AI Analysis & Response</h2>
                    <p className="text-[10px] text-white/30 font-mono uppercase tracking-[0.2em]">Geist Sans, Bold</p>
                </div>

                <div className="space-y-10 flex-1 overflow-y-auto pr-2 scrollbar-none">
                    <section className="space-y-4">
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em]">Your Query</p>
                        <p className="text-2xl font-medium leading-relaxed italic text-white/90">
                            "Live jazz NYC tonight?"
                        </p>
                        <div className="h-[1px] w-full bg-white/10" />
                    </section>

                    <section className="space-y-8">
                        <div className="space-y-6">
                            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">AI Answer:</p>
                            <h3 className="text-xl font-bold text-white">Top Recommendations:</h3>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-bold text-electric-cyan uppercase tracking-[0.15em]">Blue Note Jazz Club</p>
                            <p className="text-base leading-relaxed text-white/70">
                                Legendary Greenwich Village jazz club. Shows nightly at 8pm and 10:30pm. All ages.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-bold text-electric-cyan uppercase tracking-[0.15em]">Smalls Jazz Club</p>
                            <p className="text-base leading-relaxed text-white/70">
                                Intimate basement venue in the West Village. Late night jam sessions after midnight.
                            </p>
                        </div>

                        <div className="space-y-3 pb-12">
                            <p className="text-[10px] font-bold text-electric-cyan uppercase tracking-[0.15em]">The Django</p>
                            <p className="text-base leading-relaxed text-white/70">
                                Jazz and live music in the cellar of The Roxy Hotel, Tribeca. Cocktail bar atmosphere.
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </motion.div>
    );
}
