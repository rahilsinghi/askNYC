import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ask NYC',
  description: 'The city knows. Now you can ask.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen bg-bg text-[#f4f4f5]">
        {children}
      </body>
    </html>
  )
}
