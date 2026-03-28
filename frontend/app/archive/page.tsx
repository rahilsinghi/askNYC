'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, ArrowLeft, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

const ARCHIVE_ITEMS = [
    { id: 1, title: 'The Dakota', location: '1 W 72nd St', category: 'Residential', date: 'Oct 24, 2023', image: 'https://images.unsplash.com/photo-1541339907198-e08759df9a73?q=80&w=400&auto=format&fit=crop' },
    { id: 2, title: 'Hearst Tower', location: '300 W 57th St', category: 'Commercial', date: 'Oct 12, 2023', image: 'https://images.unsplash.com/photo-1518235506717-e1ed3307a49c?q=80&w=400&auto=format&fit=crop' },
    { id: 3, title: 'Chrysler Building', location: '405 Lexington Ave', category: 'Landmark', date: 'Sep 28, 2023', image: 'https://images.unsplash.com/photo-1527503382184-386c99f0e157?q=80&w=400&auto=format&fit=crop' },
    { id: 4, title: 'Edge NYC', location: '30 Hudson Yards', category: 'Observation', date: 'Sep 15, 2023', image: 'https://images.unsplash.com/photo-1502101872923-d48509bff386?q=80&w=400&auto=format&fit=crop' },
    { id: 5, title: 'Flatiron Building', location: '175 5th Ave', category: 'Landmark', date: 'Aug 30, 2023', image: 'https://images.unsplash.com/photo-1520690214124-2ec09649bc80?q=80&w=400&auto=format&fit=crop' },
    { id: 6, title: 'The Vessel', location: '20 Hudson Yards', category: 'Structure', date: 'Aug 12, 2023', image: 'https://images.unsplash.com/photo-1549413247-49405625bf93?q=80&w=400&auto=format&fit=crop' },
];

export default function ArchivePage() {
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
                        <h1 className="text-6xl font-medium tracking-tight">Intelligence Archive</h1>
                        <p className="text-silver-mist/60 max-w-lg">A temporal record of city scans, captured through the Antigravity intelligence lens.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="glass-pill h-12 px-6 flex items-center gap-3">
                            <Search className="w-4 h-4 text-silver-mist/40" />
                            <input type="text" placeholder="Search locations..." className="bg-transparent border-none outline-none text-sm w-48 placeholder:text-silver-mist/20" />
                        </div>
                        <button className="glass-pill h-12 w-12 flex items-center justify-center text-silver-mist/40 hover:text-electric-cyan transition-colors">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {ARCHIVE_ITEMS.map((item, index) => (
                        <ArchiveCard key={item.id} item={item} index={index} />
                    ))}
                </div>
            </div>
        </main>
    );
}

function ArchiveCard({ item, index }: { item: typeof ARCHIVE_ITEMS[0], index: number }) {
    return (
        <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.1, duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="group cursor-pointer"
        >
            <div className="aspect-[4/3] rounded-3xl overflow-hidden glass mb-6 relative">
                <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-midnight via-transparent to-transparent opacity-60" />
                <div className="absolute top-6 left-6 flex gap-2">
                    <span className="glass-pill px-3 py-1 text-[10px] font-mono tracking-widest uppercase">{item.category}</span>
                </div>
            </div>

            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-2xl font-medium mb-1 group-hover:text-electric-cyan transition-colors">{item.title}</h3>
                    <p className="text-sm text-silver-mist/40">{item.location} • {item.date}</p>
                </div>
                <button className="p-2 text-silver-mist/20 hover:text-silver-mist transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </div>
        </motion.div>
    );
}
