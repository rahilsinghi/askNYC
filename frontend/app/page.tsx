'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MapCanvas from '@/components/MapCanvas';
import Sidebar from '@/components/Sidebar';
import SearchInput from '@/components/SearchInput';
import AnswerPanel from '@/components/AnswerPanel';
import EvidenceCard from '@/components/EvidenceCard';
import BootScreen from '@/components/BootScreen';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashPage() {
  const router = useRouter();
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [showBoot, setShowBoot] = useState(true);
  const [systemReady, setSystemReady] = useState(false);

  // Stabilize the onMapLoad callback to prevent infinite loops
  const handleMapLoad = useCallback(() => {
    setIsMapLoaded(true);
  }, []);

  // When boot completes, show "SYSTEM READY" then redirect after 1s
  const handleBootComplete = useCallback(() => {
    setShowBoot(false);
    setSystemReady(true);
  }, []);

  useEffect(() => {
    if (!systemReady) return;
    const timer = setTimeout(() => router.push('/dashboard'), 1000);
    return () => clearTimeout(timer);
  }, [systemReady, router]);

  // Auto-hide boot screen after 7 seconds even if map isn't perfect
  useEffect(() => {
    const timer = setTimeout(() => handleBootComplete(), 7000);
    return () => clearTimeout(timer);
  }, [handleBootComplete]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-midnight">
      <AnimatePresence mode="wait">
        {showBoot && <BootScreen onComplete={handleBootComplete} />}
      </AnimatePresence>

      {/* SYSTEM READY overlay — shown briefly before redirect */}
      <AnimatePresence>
        {systemReady && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-midnight/80"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-4"
            >
              <p className="text-xs font-mono tracking-[0.5em] text-electric-cyan uppercase text-glow">
                System Ready
              </p>
              <div className="w-12 h-[1px] bg-electric-cyan/40" />
              <p className="text-[10px] font-mono text-silver-mist/40">Entering dashboard...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MapCanvas onMapLoad={handleMapLoad} />

      {/* Left Sidebar */}
      <Sidebar />

      {/* 20% Intelligence: Side Panel */}
      <AnswerPanel />

      {/* Floating Evidence Cards (Positioned over the map as per brief) */}
      <div className="fixed inset-0 pointer-events-none z-40">
        {/* Card 1: Left-Center */}
        <EvidenceCard
          idText="Card 1"
          title="Blue Note Jazz Club"
          type="location"
          buttons={['Location', 'Info']}
          rating={4.8}
          className="absolute left-[15%] top-[45%]"
          delay={0.2}
        />

        {/* Card 2: Mid-Right (Partially overlapping) */}
        <EvidenceCard
          idText="Card 2"
          title="Smalls Jazz Club"
          type="location"
          buttons={['Schedule', 'Reviews']}
          className="absolute right-[45%] top-[55%]"
          delay={0.4}
        />

        {/* Card 3: Overlapping Lower-Mid */}
        <EvidenceCard
          idText="Card 3"
          title="Django"
          type="location"
          buttons={['Vibe', 'Ratings']}
          rating={4.0}
          className="absolute left-[40%] top-[65%]"
          delay={0.6}
        />
      </div>

      {/* Bottom Search Bar */}
      <SearchInput />

      {/* Ambient Depth Vignette — bottom half dark for card legibility */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(7,17,29,0.6) 0%, transparent 40%)' }} />
    </main>
  );
}
