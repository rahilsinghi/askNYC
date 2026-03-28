'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MapCanvas from '@/components/MapCanvas';
import SearchInput from '@/components/SearchInput';
import EvidenceCard from '@/components/EvidenceCard';
import BootScreen from '@/components/BootScreen';
import SettingsPanel from '@/components/SettingsPanel';
import { useSettings } from '@/hooks/useSettings';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings } from 'lucide-react';
import type { SessionSummary } from '@/lib/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

type CardType =
  | 'permit'
  | 'complaint'
  | 'insight'
  | 'location'
  | 'health'
  | 'safety'
  | 'housing'
  | 'construction'
  | 'transit';

function wsToHttp(wsUrl: string): string {
  return wsUrl.replace(/^ws:/, 'http:').replace(/^wss:/, 'https:');
}

interface DemoCard {
  idText: string;
  title: string;
  type: 'health' | 'housing' | 'construction';
  rating: number;
  demoKey: string;
}

const DEMO_CARDS: DemoCard[] = [
  { idText: 'DEMO-01', title: "Joe's Pizza", type: 'health', rating: 4.8, demoKey: 'restaurant' },
  { idText: 'DEMO-02', title: 'Brooklyn Apartment', type: 'housing', rating: 3.2, demoKey: 'building' },
  { idText: 'DEMO-03', title: 'Construction Site', type: 'construction', rating: 2.5, demoKey: 'construction' },
];

export default function SplashPage() {
  const router = useRouter();
  const settings = useSettings();
  const [showBoot, setShowBoot] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);

  const handleRunDemo = useCallback(
    (scenario: 'all' | 'restaurant' | 'building' | 'construction') => {
      if (scenario === 'all') {
        router.push('/dashboard?demo=all');
      } else {
        router.push(`/dashboard?demo=${scenario}`);
      }
    },
    [router],
  );

  const handleBootComplete = useCallback(() => {
    setShowBoot(false);
  }, []);

  // Auto-hide boot screen after 7 seconds
  useEffect(() => {
    const timer = setTimeout(() => handleBootComplete(), 7000);
    return () => clearTimeout(timer);
  }, [handleBootComplete]);

  // Fetch sessions from backend
  useEffect(() => {
    const httpUrl = wsToHttp(WS_URL);
    fetch(`${httpUrl}/sessions`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch sessions');
        return res.json();
      })
      .then((data: { sessions: SessionSummary[] } | SessionSummary[]) => {
        const list = Array.isArray(data) ? data : (data.sessions ?? []);
        setSessions(list);
        setSessionsLoaded(true);
      })
      .catch(() => {
        setSessionsLoaded(true);
      });
  }, []);

  const handleSearch = useCallback(
    (query: string) => {
      if (query === '__VOICE_FALLBACK__') {
        router.push('/dashboard?voice=true');
        return;
      }
      router.push(`/dashboard?q=${encodeURIComponent(query)}`);
    },
    [router],
  );

  const handleExploreSession = useCallback(
    (session: SessionSummary) => {
      const q = encodeURIComponent(`Tell me about ${session.location_name}`);
      const loc = encodeURIComponent(session.location_name);
      router.push(`/dashboard?q=${q}&location=${loc}`);
    },
    [router],
  );

  const handleExploreDemo = useCallback(
    (demoKey: string) => {
      router.push(`/dashboard?demo=${encodeURIComponent(demoKey)}`);
    },
    [router],
  );

  const recentSessions = sessions.slice(-3).reverse();
  const showDemoCards = sessionsLoaded && recentSessions.length === 0;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-midnight">
      {/* Boot animation */}
      <AnimatePresence mode="wait">
        {showBoot && <BootScreen onComplete={handleBootComplete} />}
      </AnimatePresence>

      {/* Map background */}
      <MapCanvas />

      {/* Ambient vignette for legibility */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            'radial-gradient(ellipse 100% 80% at 50% 40%, transparent 20%, rgba(7,17,29,0.7) 100%)',
        }}
      />

      {/* Settings gear — top right */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: showBoot ? 0 : 1 }}
        transition={{ delay: 0.3 }}
        onClick={() => setShowSettings((s) => !s)}
        className={`fixed top-6 right-6 z-50 w-10 h-10 rounded-full glass-pill flex items-center justify-center transition-colors ${
          showSettings ? 'text-electric-cyan border-electric-cyan/40' : 'text-silver-mist/50 border-white/10 hover:text-silver-mist'
        }`}
        aria-label="Settings"
      >
        <Settings className="w-5 h-5" />
      </motion.button>

      {/* Main content — only visible after boot */}
      <AnimatePresence>
        {!showBoot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-20 flex flex-col items-center justify-center pointer-events-none"
          >
            {/* Title / Logo */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center mb-10"
            >
              <div className="w-14 h-14 rounded-2xl glass-pill flex items-center justify-center mb-6 border-electric-cyan/20">
                <div className="w-7 h-7 rounded-lg bg-electric-cyan shadow-[0_0_30px_rgba(64,224,208,0.5)]" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-medium tracking-[0.2em] uppercase text-silver-mist text-glow">
                ASK NYC
              </h1>
              <p className="mt-3 text-[10px] font-mono tracking-[0.4em] text-silver-mist/40 uppercase">
                Voice + Camera Intelligence
              </p>
            </motion.div>

            {/* Search bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-2xl px-6 pointer-events-auto"
            >
              <SearchInput onSubmit={handleSearch} />

              {/* Dashboard link */}
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-xs font-mono text-silver-mist/30 hover:text-electric-cyan/70 transition-colors tracking-wide"
                >
                  or go straight to dashboard &rarr;
                </button>
              </div>
            </motion.div>

            {/* Evidence cards */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-5xl px-6 mt-12 pointer-events-auto"
            >
              {sessionsLoaded && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {showDemoCards
                    ? DEMO_CARDS.map((card, i) => (
                        <EvidenceCard
                          key={card.demoKey}
                          idText={card.idText}
                          title={card.title}
                          type={card.type}
                          rating={card.rating}
                          delay={i * 0.15}
                          onExplore={() => handleExploreDemo(card.demoKey)}
                        />
                      ))
                    : recentSessions.map((session, i) => (
                        <EvidenceCard
                          key={session.session_id}
                          idText={`S-${String(i + 1).padStart(2, '0')}`}
                          title={session.location_name}
                          type={
                            (session.cards[0]?.category as CardType) || 'location'
                          }
                          rating={session.cards.length}
                          delay={i * 0.15}
                          onExplore={() => handleExploreSession(session)}
                        />
                      ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onRunDemo={handleRunDemo}
        onVolumeChange={settings.setVolume}
        onMuteChange={settings.setMuted}
        volume={settings.volume}
        muted={settings.muted}
      />
    </main>
  );
}
