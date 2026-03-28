'use client'

import { useState } from 'react'

interface SearchInputProps {
    onSendQuery: (text: string) => void
    disabled?: boolean
    hasImage?: boolean
}

export default function SearchInput({ onSendQuery, disabled, hasImage }: SearchInputProps) {
    const [query, setQuery] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (query.trim() && !disabled) {
            onSendQuery(query.trim())
            setQuery('')
        }
    }

    return (
        <div className="w-full max-w-2xl mx-auto pb-8 px-4">
            <form
                onSubmit={handleSubmit}
                className="glass rounded-xl p-1.5 flex items-center gap-3 shadow-[0_0_40px_rgba(21,191,210,0.15)] border-cyan-glow/20"
            >
                <div className="pl-4 pr-1 flex items-center gap-2 border-r border-white/10 select-none">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-cyan-glow">ASK</span>
                    <span className="text-[10px] font-bold tracking-[0.2em] text-white/40">NYC</span>
                </div>

                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="What is the health grade of this restaurant?"
                    className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-white/20 px-2"
                    disabled={disabled}
                />

                <button
                    type="submit"
                    disabled={disabled || !query.trim()}
                    className="h-10 px-6 rounded-lg bg-cyan-glow/10 hover:bg-cyan-glow/20 border border-cyan-glow/30 text-cyan-glow text-[10px] font-bold tracking-widest transition-all disabled:opacity-30 flex items-center gap-2"
                >
                    {hasImage && <div className="w-1 h-1 rounded-full bg-cyan-glow animate-pulse" />}
                    ANALYZE
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="ml-1">
                        <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </form>
        </div>
    )
}
