'use client'

import { useState, useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'

interface SearchInputProps {
    onSendQuery: (text: string) => void
    disabled?: boolean
    hasImage?: boolean
    uploadedImage?: string | null
    onImageUpload?: (base64: string) => void
    onImageClear?: () => void
}

export default function SearchInput({ onSendQuery, disabled, hasImage, uploadedImage, onImageUpload, onImageClear }: SearchInputProps) {
    const [query, setQuery] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (query.trim() && !disabled) {
            onSendQuery(query.trim())
            setQuery('')
        }
    }

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/') || !onImageUpload) return

        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            const size = 768
            canvas.width = size
            canvas.height = size
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            const scale = Math.max(size / img.width, size / img.height)
            const w = img.width * scale
            const h = img.height * scale
            ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)

            const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
            const base64 = dataUrl.split(',')[1]
            if (base64) onImageUpload(base64)
        }
        img.src = URL.createObjectURL(file)
    }

    return (
        <div className="w-full max-w-2xl mx-auto pb-8 px-4">
            {/* Thumbnail preview */}
            {uploadedImage && (
                <div className="flex items-center gap-2 mb-2 ml-1">
                    <div className="relative group">
                        <img
                            src={`data:image/jpeg;base64,${uploadedImage}`}
                            alt="Attached"
                            className="w-12 h-12 rounded-lg object-cover border border-white/10"
                        />
                        {onImageClear && (
                            <button
                                onClick={onImageClear}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="w-2.5 h-2.5 text-white" />
                            </button>
                        )}
                    </div>
                    <span className="text-[9px] font-mono tracking-wider text-cyan-400/60 uppercase">Image attached — type your question</span>
                </div>
            )}

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
                    placeholder={uploadedImage ? "Ask about this location..." : "What is the health grade of this restaurant?"}
                    className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-white/20 px-2"
                    disabled={disabled}
                />

                {/* Image upload button */}
                {onImageUpload && (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                            uploadedImage
                                ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30'
                                : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                        }`}
                        title="Upload an image"
                    >
                        <ImagePlus className="w-4 h-4" />
                    </button>
                )}

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

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const files = e.target.files
                    if (files && files.length > 0) handleFile(files[0])
                    e.target.value = ''
                }}
            />
        </div>
    )
}
