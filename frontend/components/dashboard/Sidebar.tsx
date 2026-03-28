'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const NAV = [
  {
    label: 'Explore',
    href: '/dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'Ask NYC',
    href: '/ask',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    label: 'Analysis',
    href: '/insights',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M3 3v18h18M7 16l3-3 3 3 4-4" />
      </svg>
    ),
  },
  {
    label: 'History',
    href: '/archive',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

interface SidebarProps {
  onSettingsClick?: () => void
}

export default function Sidebar({ onSettingsClick }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-16 h-screen glass border-r-0 flex flex-col items-center py-6 z-50">
      <div className="mb-10">
        <span className="text-sm font-bold tracking-tight font-syne text-white">A+NYC</span>
      </div>

      <nav className="flex flex-col gap-2 items-center">
        {NAV.map(({ label, href, icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'relative group w-10 h-10 rounded-lg flex items-center justify-center transition-all',
                active
                  ? 'bg-white/10 text-cyan-glow shadow-[inset_0_0_12px_rgba(255,255,255,0.05)]'
                  : 'text-white/30 hover:text-white hover:bg-white/5'
              )}
            >
              {icon}
              <span className="absolute left-full ml-3 px-2.5 py-1 rounded-md bg-surface2/90 border border-white/10 text-[9px] font-bold tracking-[0.15em] text-white/70 uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 backdrop-blur-sm z-50">
                {label}
              </span>
            </Link>
          )
        })}

        <button
          onClick={onSettingsClick}
          className="relative group w-10 h-10 rounded-lg flex items-center justify-center transition-all text-white/30 hover:text-white hover:bg-white/5"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          <span className="absolute left-full ml-3 px-2.5 py-1 rounded-md bg-surface2/90 border border-white/10 text-[9px] font-bold tracking-[0.15em] text-white/70 uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 backdrop-blur-sm z-50">
            Settings
          </span>
        </button>
      </nav>

      <div className="flex-1" />

      <div className="flex flex-col items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white/20">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 16l2-6 6-2-2 6z" fill="currentColor" />
        </svg>
        <span className="text-[7px] font-bold tracking-[0.15em] text-white/15 uppercase">Mapbox</span>
      </div>
    </aside>
  )
}
