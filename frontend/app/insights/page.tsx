'use client'

import Sidebar from '@/components/dashboard/Sidebar'

export default function InsightsPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="flex items-end gap-1.5 opacity-20">
          {[40, 80, 55, 95, 65, 85, 45].map((h, i) => (
            <div key={i} className="w-5 bg-muted rounded-t" style={{ height: h }} />
          ))}
        </div>
        <p className="font-display font-semibold text-[16px] text-muted">Data Insights</p>
        <p className="font-mono font-light text-[11px] text-dim text-center max-w-xs">
          Aggregate analytics across all your Ask NYC sessions will appear here.
        </p>
      </div>
    </div>
  )
}
