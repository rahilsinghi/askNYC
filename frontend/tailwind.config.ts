import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:       '#0c0c0f',
        bg2:      '#111115',
        surface:  '#17171c',
        surface2: '#1e1e24',
        border:   '#2a2a32',
        border2:  '#383842',
        green:    '#84cc16',
        amber:    '#f59e0b',
        blue:     '#3b82f6',
        red:      '#ef4444',
        violet:   '#8b5cf6',
        muted:    '#71717a',
        dim:      '#3f3f46',
      },
      fontFamily: {
        mono: ['"DM Mono"', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 3s linear infinite',
        'ring-out': 'ringOut 2s ease-out infinite',
        'slide-in': 'slideIn 0.35s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
      },
      keyframes: {
        scan: {
          '0%': { top: '0%' },
          '100%': { top: '100%' },
        },
        ringOut: {
          '0%': { transform: 'translate(-50%,-50%) scale(0.8)', opacity: '0.6' },
          '100%': { transform: 'translate(-50%,-50%) scale(2)', opacity: '0' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
