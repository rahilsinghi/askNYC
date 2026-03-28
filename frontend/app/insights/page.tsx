'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Activity, Zap, Building2, Layers, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { SessionSummary, DataCategory, SOURCE_COLORS } from '@/lib/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

function getHttpUrl(wsUrl: string): string {
  return wsUrl.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://');
}

interface AggregatedStats {
  totalSessions: number;
  totalDatasetsQueried: number;
  uniqueLocations: number;
  avgCardsPerSession: number;
  cardsByCategory: Record<string, number>;
  topLocation: string | null;
  topLocationCount: number;
}

function computeStats(sessions: SessionSummary[]): AggregatedStats {
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalDatasetsQueried: 0,
      uniqueLocations: 0,
      avgCardsPerSession: 0,
      cardsByCategory: {},
      topLocation: null,
      topLocationCount: 0,
    };
  }

  const locationCounts: Record<string, number> = {};
  const cardsByCategory: Record<string, number> = {};
  let totalDatasets = 0;
  let totalCards = 0;

  for (const s of sessions) {
    // Location counts
    const loc = s.location_name;
    locationCounts[loc] = (locationCounts[loc] ?? 0) + 1;

    // Datasets
    totalDatasets += s.datasets_queried.length;

    // Cards
    totalCards += s.cards.length;
    for (const card of s.cards) {
      cardsByCategory[card.category] = (cardsByCategory[card.category] ?? 0) + 1;
    }
  }

  let topLocation: string | null = null;
  let topLocationCount = 0;
  for (const [loc, count] of Object.entries(locationCounts)) {
    if (count > topLocationCount) {
      topLocation = loc;
      topLocationCount = count;
    }
  }

  return {
    totalSessions: sessions.length,
    totalDatasetsQueried: totalDatasets,
    uniqueLocations: Object.keys(locationCounts).length,
    avgCardsPerSession: Math.round((totalCards / sessions.length) * 10) / 10,
    cardsByCategory,
    topLocation,
    topLocationCount,
  };
}

export default function InsightsPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  const stats = useMemo(() => computeStats(sessions), [sessions]);

  const hasData = stats.totalSessions > 0;

  // Sort categories by count descending for the bar chart
  const sortedCategories = useMemo(() => {
    return Object.entries(stats.cardsByCategory)
      .sort(([, a], [, b]) => b - a);
  }, [stats.cardsByCategory]);

  const maxCategoryCount = sortedCategories.length > 0 ? sortedCategories[0][1] : 1;

  return (
    <main className="min-h-screen bg-midnight text-silver-mist p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <header className="flex items-end justify-between">
          <div className="space-y-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-silver-mist/40 hover:text-electric-cyan transition-colors mb-4 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-mono uppercase tracking-widest">Back to Atlas</span>
            </Link>
            <h1 className="text-6xl font-medium tracking-tight">Spatial Insights</h1>
            <p className="text-silver-mist/60 max-w-md">
              Aggregated city intelligence and emerging urban signals across all intelligence sectors.
            </p>
          </div>
        </header>

        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-8 h-8 text-electric-cyan animate-spin" />
            <p className="text-silver-mist/40 text-sm font-mono">Loading insights...</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <p className="text-silver-mist/40 text-sm font-mono">
              Could not reach the backend. Make sure the server is running.
            </p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Sessions"
                value={stats.totalSessions.toLocaleString()}
                icon={<Activity className="w-5 h-5" />}
                delay={0}
              />
              <StatCard
                title="Datasets Queried"
                value={stats.totalDatasetsQueried.toLocaleString()}
                icon={<Layers className="w-5 h-5" />}
                delay={0.1}
              />
              <StatCard
                title="Unique Locations"
                value={stats.uniqueLocations.toLocaleString()}
                icon={<Building2 className="w-5 h-5" />}
                delay={0.2}
              />
              <StatCard
                title="Avg Cards / Session"
                value={hasData ? stats.avgCardsPerSession.toString() : '0'}
                icon={<Zap className="w-5 h-5" />}
                delay={0.3}
              />
            </div>

            {!hasData && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                  <Activity className="w-7 h-7 text-silver-mist/20" />
                </div>
                <p className="text-silver-mist/40 text-sm font-mono">
                  Start exploring to see insights.
                </p>
              </div>
            )}

            {hasData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Category Breakdown */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="glass rounded-3xl p-10 min-h-[400px] flex flex-col"
                >
                  <div className="mb-8">
                    <h2 className="text-2xl font-medium mb-2">Cards by Category</h2>
                    <p className="text-silver-mist/40 text-sm">
                      Data findings across all sessions, broken down by intelligence sector.
                    </p>
                  </div>

                  <div className="flex-1 flex flex-col justify-center gap-4">
                    {sortedCategories.map(([category, count], i) => (
                      <div key={category} className="flex items-center gap-4">
                        <span
                          className="w-20 text-right text-[10px] font-mono uppercase tracking-widest flex-shrink-0"
                          style={{ color: SOURCE_COLORS[category] ?? '#84cc16' }}
                        >
                          {category}
                        </span>
                        <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(count / maxCategoryCount) * 100}%` }}
                            transition={{
                              delay: 0.8 + i * 0.08,
                              duration: 1.2,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            className="h-full rounded-lg"
                            style={{
                              background: `${SOURCE_COLORS[category] ?? '#84cc16'}40`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-mono text-silver-mist/60 w-10 text-right">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Top Location */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="glass rounded-3xl p-10 min-h-[400px] flex flex-col overflow-hidden relative"
                >
                  <div className="z-10">
                    <h2 className="text-2xl font-medium mb-2">Most Scanned Location</h2>
                    <p className="text-silver-mist/40 text-sm">
                      The location with the highest scan frequency.
                    </p>
                  </div>

                  <div className="flex-1 flex items-center justify-center">
                    <div className="relative w-64 h-64">
                      <div className="absolute inset-0 rounded-full border-2 border-white/5 animate-[spin_20s_linear_infinite]" />
                      <div className="absolute inset-4 rounded-full border border-electric-cyan/20 animate-[spin_15s_linear_infinite_reverse]" />
                      <div className="absolute inset-12 rounded-full border-4 border-electric-cyan/40 animate-pulse" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                        <p className="text-4xl font-semibold">
                          {stats.topLocationCount}x
                        </p>
                        <p className="text-[10px] font-mono tracking-widest text-silver-mist/40 uppercase mt-1 truncate max-w-full">
                          {stats.topLocation}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  icon,
  delay,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.8 }}
      className="glass p-8 rounded-3xl"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-electric-cyan">
          {icon}
        </div>
      </div>
      <p className="text-silver-mist/40 text-[10px] uppercase tracking-widest mb-1">{title}</p>
      <p className="text-4xl font-medium tracking-tight text-silver-mist">{value}</p>
    </motion.div>
  );
}
