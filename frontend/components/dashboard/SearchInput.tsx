'use client'

import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Mic, ImagePlus, X } from 'lucide-react'

interface SearchInputProps {
    onSendQuery: (text: string) => void
    disabled?: boolean
    hasImage?: boolean
    uploadedImage?: string | null
    onImageUpload?: (base64: string) => void
    onImageClear?: () => void
}

export default function SearchInput({
    onSendQuery,
    disabled,
    hasImage,
    uploadedImage,
    onImageUpload,
    onImageClear
}: SearchInputProps) {
    const [query, setQuery] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const handleSubmit = useCallback(() => {
        const trimmed = query.trim()
        if (!trimmed || disabled) return
        onSendQuery(trimmed)
        setQuery('')
    }, [query, onSendQuery, disabled])

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                handleSubmit()
            }
        },
        [handleSubmit]
    )

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
        <div className="w-full max-w-4xl mx-auto px-6 pb-8">
            {/* Thumbnail preview */}
            <AnimatePresence>
                {uploadedImage && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex items-center gap-3 mb-4 ml-6"
                    >
                        <div className="relative group">
                            <img
                                src={`data:image/jpeg;base64,${uploadedImage}`}
                                alt="Attached"
                                className="w-12 h-12 rounded-xl object-cover border border-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                            />
                            {onImageClear && (
                                <button
                                    onClick={onImageClear}
                                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500/80 backdrop-blur-sm flex items-center justify-center border border-white/20 hover:bg-red-500 transition-colors"
                                >
                                    <X className="w-3 h-3 text-white" />
                                </button>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold tracking-[0.2em] text-cyan-400 uppercase">Image attached</span>
                            <span className="text-[9px] text-white/30 uppercase tracking-tighter">Analyzing visual data node...</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={`
                    bg-[#07111D]/80 backdrop-blur-3xl h-14 rounded-full flex items-center px-6 border border-white/5 
                    shadow-[0_20px_60px_rgba(0,0,0,0.8)] focus-within:border-cyan-400/20 transition-all
                    ${disabled ? 'opacity-50 pointer-events-none' : ''}
                `}
            >
                <div className="flex items-center gap-1.5 mr-4 whitespace-nowrap border-r border-white/10 pr-4">
                    <span className="text-cyan-400 font-black text-[10px] uppercase tracking-[0.2em] pt-0.5">
                        ASK NYC
                    </span>
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={hasImage ? "Analyze this evidence..." : "State your query or destination..."}
                    className="bg-transparent border-none outline-none flex-1 text-white/90 text-[13px] font-medium placeholder:text-white/10 tracking-wide font-sans min-w-0"
                    disabled={disabled}
                />

                <div className="flex items-center gap-3 ml-2">
                    {/* Image upload button */}
                    {onImageUpload && (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${uploadedImage
                                    ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                                    : 'text-white/20 hover:text-white/60 hover:bg-white/5'
                                }`}
                            title="Upload an image"
                        >
                            <ImagePlus className="w-4 h-4" />
                        </button>
                    )}

                    <div className="w-px h-6 bg-white/5" />

                    <button
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white/15 hover:text-white/40 transition-all"
                        aria-label="Voice input"
                    >
                        <Mic className="w-5 h-5" />
                    </button>

                    {/* Submit button */}
                    <button
                        onClick={handleSubmit}
                        disabled={disabled || !query.trim()}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-[0_0_25px_rgba(34,211,238,0.6)] 
                            ${disabled || !query.trim()
                                ? 'bg-white/5 text-white/10 shadow-none grayscale'
                                : 'bg-cyan-400 text-[#07111D] hover:shadow-[0_0_35px_rgba(34,211,238,0.8)] hover:scale-110 active:scale-95'
                            }`}
                        aria-label="Submit"
                    >
                        <ArrowRight className="w-5 h-5 stroke-[4]" />
                    </button>
                </div>
            </motion.div>

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
