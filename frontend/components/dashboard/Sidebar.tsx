'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const NAV = [
  {
    label: 'EXPLORE',
    href: '/dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12l-18 12v-24z" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: 'ANALYSIS',
    href: '/insights',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 3v18h18M7 16l3-3 3 3 4-4" />
      </svg>
    ),
  },
  {
    label: 'HISTORY',
    href: '/archive',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'SETTINGS',
    href: '/settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-[200px] h-screen glass border-r-0 flex flex-col py-8 z-50">

      <div className="px-8 mb-12">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl font-bold tracking-tighter font-syne text-white">A+NYC</span>
        </div>
        <p className="text-[10px] font-bold tracking-[0.3em] text-white/20">INTELLIGENCE_OS</p>
      </div>

      <nav className="flex flex-col gap-1 px-4">
        {NAV.map(({ label, href, icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-4 px-4 h-12 rounded-lg font-bold text-[10px] tracking-[0.2em] transition-all group',
                active
                  ? 'bg-white/10 text-white shadow-[inset_0_0_12px_rgba(255,255,255,0.05)]'
                  : 'text-white/30 hover:text-white hover:bg-white/5'
              )}
            >
              <span className={clsx('transition-transform group-hover:scale-110', active ? 'text-cyan-glow' : 'text-current')}>
                {icon}
              </span>
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="flex-1" />

      {/* Connection Status */}
      <div className="mx-6 p-4 rounded-xl bg-white/[0.03] border border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-glow/20 flex items-center justify-center text-cyan-glow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-wider text-white">SECURE</p>
            <p className="text-[8px] text-white/30">AES-256 ACTIVE</p>
          </div>
        </div>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-cyan-glow w-2/3 shadow-[0_0_8px_#15BFD2]" />
        </div>
      </div>

    </aside>
  )
}
