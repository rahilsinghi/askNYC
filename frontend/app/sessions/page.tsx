'use client'

import Sidebar from '@/components/dashboard/Sidebar'

export default function SessionsPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center opacity-30">
          <div className="w-4 h-4 rounded-full border border-current" />
        </div>
        <p className="font-display font-semibold text-[16px] text-muted">AI Sessions</p>
        <p className="font-mono font-light text-[11px] text-dim text-center max-w-xs">
          Live session management — coming soon.
        </p>
      </div>
    </div>
  )
}
