'use client'

import React, { useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import SettingsPanel from '../SettingsPanel'
import { useSettings } from '@/hooks/useSettings'

interface DashboardLayoutProps {
    children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [showSettings, setShowSettings] = useState(false)
    const settings = useSettings()

    const handleRunDemo = useCallback((scenario: string) => {
        if (pathname === '/dashboard') {
            // If already on dashboard, we might need a way to trigger it.
            // But for now, let's just use the query param to be safe and consistent.
            router.push(`/dashboard?demo=${scenario}`)
        } else {
            router.push(`/dashboard?demo=${scenario}`)
        }
    }, [router, pathname])

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-[#0c0c0f] font-mono flex">
            {/* Sidebar */}
            <div className="flex-shrink-0 z-50">
                <Sidebar onSettingsClick={() => setShowSettings(true)} />
            </div>

            {/* Main Content */}
            <div className="flex-1 relative overflow-auto">
                {children}
            </div>

            {/* Shared Settings Panel */}
            <SettingsPanel
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                onRunDemo={(scenario) => handleRunDemo(scenario)}
                onVolumeChange={settings.setVolume}
                onMuteChange={settings.setMuted}
                volume={settings.volume}
                muted={settings.muted}
            />
        </div>
    )
}
