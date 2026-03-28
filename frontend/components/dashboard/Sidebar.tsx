'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const NAV = [
  {
    label: 'MAP EXPLORER',
    href: '/dashboard',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    ),
  },
  {
    label: 'DATA INSIGHTS',
    href: '/insights',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="8" width="3" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="5.5" y="5" width="3" height="8" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="10" y="2" width="3" height="11" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    ),
  },
  {
    label: 'AI SESSIONS',
    href: '/sessions',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
        <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    ),
  },
  {
    label: 'ARCHIVES',
    href: '/archive',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 4h10M2 7h7M2 10h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-[200px] min-w-[200px] h-full bg-bg2 border-r border-border flex flex-col py-5">

      <p className="font-mono text-[9px] tracking-[0.2em] text-muted px-5 mb-4">
        NAVIGATOR
      </p>

      <nav className="flex flex-col">
        {NAV.map(({ label, href, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-2.5 px-5 h-11 font-mono text-[10px] tracking-[0.12em] border-l-2 transition-colors',
                active
                  ? 'text-green border-green bg-green/[0.06]'
                  : 'text-muted border-transparent hover:text-[#f4f4f5] hover:bg-surface'
              )}
            >
              <span className={active ? 'text-green' : 'text-current'}>{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="flex-1" />

      {/* User card */}
      <div className="mx-3 p-2.5 bg-surface border border-border rounded-lg flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md bg-green flex items-center justify-center font-display font-bold text-xs text-black flex-shrink-0">
          C
        </div>
        <div>
          <p className="font-mono text-[9px] tracking-[0.08em] text-[#f4f4f5]">THE CARTOGRAPHER</p>
          <p className="font-mono text-[8px] text-muted mt-0.5">LVL 4 ADMIN</p>
        </div>
      </div>

    </aside>
  )
}
