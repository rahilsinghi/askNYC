import type { Metadata } from "next";
import { Syne, DM_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: '--font-syne',
});

const dmMono = DM_Mono({
  weight: ['400', '500'],
  subsets: ["latin"],
  variable: '--font-dm-mono',
});

export const metadata: Metadata = {
  title: "ASK NYC 🗽 AI Intelligence Dashboard",
  description: "A cinematic, living city intelligence atlas for New York City.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${syne.variable} ${dmMono.variable} dark`}>
      <body className="antialiased font-mono bg-[#0c0c0f] text-white/90">
        {children}
      </body>
    </html>
  );
}
