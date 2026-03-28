'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowLeft, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { SessionSummary, SOURCE_COLORS } from '@/lib/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

function getHttpUrl(wsUrl: string): string {
  return wsUrl.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://');
}

type TimeFilter = 'ALL' | 'TODAY' | 'WEEK';

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isThisWeek(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return d >= weekAgo;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function ArchivePage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');

  useEffect(() => {
    const httpUrl = getHttpUrl(WS_URL);
    fetch(`${httpUrl}/sessions`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSessions(data.sessions ?? []);
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    let result = sessions;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.location_name.toLowerCase().includes(q) ||
          (s.location_address ?? '').toLowerCase().includes(q)
      );
    }

    if (timeFilter === 'TODAY') {
      result = result.filter((s) => isToday(s.started_at));
    } else if (timeFilter === 'WEEK') {
      result = result.filter((s) => isThisWeek(s.started_at));
    }

    return result;
  }, [sessions, search, timeFilter]);

  return (
    <DashboardLayout>
      <main className="min-h-full p-12">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Header */}
          <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-4">
              <h1 className="text-6xl font-medium tracking-tight">Intelligence Archive</h1>
              <p className="text-silver-mist/60 max-w-lg">
                A temporal record of city scans, captured through the Antigravity intelligence lens.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="glass-pill h-12 px-6 flex items-center gap-3">
                <Search className="w-4 h-4 text-silver-mist/40" />
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-48 placeholder:text-silver-mist/20"
                />
              </div>
              <div className="flex gap-1">
                {(['ALL', 'WEEK', 'TODAY'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeFilter(tf)}
                    className={`glass-pill h-10 px-4 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest transition-colors ${timeFilter === tf
                      ? 'text-electric-cyan border-electric-cyan/30'
                      : 'text-silver-mist/40 hover:text-silver-mist/60'
                      }`}
                  >
                    <Clock className="w-3 h-3" />
                    {tf === 'ALL' ? 'All' : tf === 'WEEK' ? 'This Week' : 'Today'}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {/* Content */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <Loader2 className="w-8 h-8 text-electric-cyan animate-spin" />
              <p className="text-silver-mist/40 text-sm font-mono">Loading sessions...</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <p className="text-silver-mist/40 text-sm font-mono">
                Could not reach the backend. Make sure the server is running.
              </p>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                <Clock className="w-7 h-7 text-silver-mist/20" />
              </div>
              <p className="text-silver-mist/40 text-sm font-mono">
                {sessions.length === 0
                  ? 'No sessions yet. Start scanning to build your archive.'
                  : 'No sessions match your filters.'}
              </p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((session, index) => (
                <SessionArchiveCard key={session.session_id} session={session} index={index} />
              ))}
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}

function SessionArchiveCard({
  session,
  index,
}: {
  session: SessionSummary;
  index: number;
}) {
  const uniqueCategories = [...new Set(session.cards.map((c) => c.category))];
  const topCard = session.cards[0];

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.08, duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className="group cursor-pointer"
    >
      <div className="aspect-[4/3] rounded-3xl overflow-hidden glass mb-6 relative flex flex-col justify-end p-8">
        {/* Gradient background based on anomaly */}
        <div
          className={`absolute inset-0 ${session.anomaly_found
            ? 'bg-gradient-to-br from-red-900/30 via-midnight to-midnight'
            : 'bg-gradient-to-br from-electric-cyan/10 via-midnight to-midnight'
            }`}
        />

        {/* Category pills */}
        <div className="absolute top-6 left-6 flex gap-2 z-10">
          {uniqueCategories.slice(0, 3).map((cat) => (
            <span
              key={cat}
              className="px-3 py-1 text-[10px] font-mono tracking-widest uppercase rounded-full"
              style={{
                background: `${SOURCE_COLORS[cat] ?? '#84cc16'}18`,
                color: SOURCE_COLORS[cat] ?? '#84cc16',
              }}
            >
              {cat}
            </span>
          ))}
        </div>

        {session.anomaly_found && (
          <div className="absolute top-6 right-6 z-10">
            <span className="glass-pill px-3 py-1 text-[10px] font-mono tracking-widest uppercase text-red-400 border border-red-400/30">
              Anomaly
            </span>
          </div>
        )}

        {/* Summary */}
        <div className="relative z-10">
          <p className="text-silver-mist/60 text-xs font-mono mb-1">
            {session.cards.length} finding{session.cards.length !== 1 ? 's' : ''} &middot;{' '}
            {session.datasets_queried.length} dataset{session.datasets_queried.length !== 1 ? 's' : ''}
          </p>
          {topCard && (
            <p className="text-silver-mist/40 text-xs truncate">{topCard.title}</p>
          )}
        </div>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-2xl font-medium mb-1 group-hover:text-electric-cyan transition-colors">
            {session.location_name}
          </h3>
          <p className="text-sm text-silver-mist/40">
            {session.location_address ?? 'Unknown address'} &middot;{' '}
            {session.ended_at ? timeAgo(session.ended_at) : timeAgo(session.started_at)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
