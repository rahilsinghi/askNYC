'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Star, MapPin, BarChart3, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EvidenceCardProps {
  idText: string;
  title: string;
  type: 'permit' | 'complaint' | 'insight' | 'location' | 'health' | 'safety' | 'housing' | 'construction' | 'transit';
  status?: string;
  rating?: number;
  className?: string;
  delay?: number;
  onExplore?: () => void;
}

export default function EvidenceCard({ idText, title, type, rating, className, delay = 0, onExplore }: EvidenceCardProps) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'glass p-6 sm:p-7 rounded-[2rem] min-w-0 w-full pointer-events-auto',
        className,
      )}
    >
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <h3 className="text-sm font-bold text-white tracking-wide truncate mr-2">
          {idText}: {title}
        </h3>
        <div className="w-9 h-9 rounded-xl bg-warm-amber/20 flex items-center justify-center border border-warm-amber/30 shrink-0">
          <BarChart3 className="w-5 h-5 text-warm-amber" />
        </div>
      </div>

      {rating !== undefined && rating !== null && (
        <div className="flex items-center gap-1.5 mb-4 sm:mb-6">
          <span className="text-sm text-warm-amber font-bold">{rating}</span>
          <Star className="w-4 h-4 text-warm-amber fill-warm-amber" />
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <div className="flex items-center gap-2">
          <MapPin className="w-3 h-3 text-silver-mist/40" />
          <span className="text-[10px] text-silver-mist/40 uppercase tracking-widest">{type}</span>
        </div>
        {onExplore && (
          <button
            onClick={onExplore}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-electric-cyan hover:text-white transition-colors group"
          >
            Explore
            <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
