import React from 'react';
import { cn } from '../../lib/utils';

interface GlassPanelProps {
    children: React.ReactNode;
    className?: string;
    intensity?: 'low' | 'medium' | 'high';
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
    children,
    className,
    intensity = 'medium'
}) => {
    const intensityMap = {
        low: 'bg-white/5 backdrop-blur-md border-white/10',
        medium: 'bg-black/20 backdrop-blur-xl border-white/20',
        high: 'bg-black/40 backdrop-blur-2xl border-white/30',
    };

    return (
        <div className={cn(
            "rounded-2xl border shadow-2xl relative overflow-hidden group transition-all duration-500",
            intensityMap[intensity],
            className
        )}>
            {/* Subtle shine effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

            {/* Glow on hover */}
            <div className="absolute -inset-px bg-gradient-to-r from-gold-500/20 to-cyan-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};
