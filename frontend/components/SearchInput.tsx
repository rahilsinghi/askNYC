'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Mic } from 'lucide-react';

interface SpeechResult {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: { readonly transcript: string; readonly confidence: number };
}

interface SpeechResultList {
  readonly length: number;
  readonly [index: number]: SpeechResult;
}

interface SpeechRecognitionEvent {
  readonly results: SpeechResultList;
  readonly resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  readonly error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SearchInputProps {
  onSubmit: (query: string) => void;
  className?: string;
}

export default function SearchInput({ onSubmit, className }: SearchInputProps) {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getSpeechRecognition = useCallback((): SpeechRecognitionInstance | null => {
    const win = window as unknown as Record<string, unknown>;
    const SpeechRecognition = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    return new (SpeechRecognition as new () => SpeechRecognitionInstance)();
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }, [query, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleMicClick = useCallback(() => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = getSpeechRecognition();
    if (!recognition) {
      // Fallback: navigate to dashboard with voice=true
      onSubmit('__VOICE_FALLBACK__');
      return;
    }

    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setQuery(transcript);

      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        const final = transcript.trim();
        if (final) {
          setIsListening(false);
          onSubmit(final);
        }
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
  }, [isListening, getSpeechRecognition, onSubmit]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return (
    <div className={className}>
      <div className="glass h-14 rounded-full flex items-center px-4 sm:px-8 border-electric-cyan/20 shadow-[0_0_40px_rgba(65,228,244,0.1)] group focus-within:border-electric-cyan/40 transition-all">
        <span className="text-electric-cyan font-bold text-[10px] uppercase tracking-[0.2em] mr-4 sm:mr-6 whitespace-nowrap hidden sm:inline">
          ASK NYC:
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about any NYC location..."
          className="bg-transparent border-none outline-none flex-1 text-white/90 placeholder:text-white/20 text-sm font-medium min-w-0"
        />
        <div className="flex items-center gap-2 ml-2">
          {/* Mic button */}
          <button
            onClick={handleMicClick}
            className="relative w-10 h-10 rounded-full flex items-center justify-center text-silver-mist/60 hover:text-electric-cyan hover:bg-electric-cyan/10 transition-all"
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          >
            <Mic className="w-5 h-5" />
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-full bg-electric-cyan/30"
                />
              )}
            </AnimatePresence>
            {isListening && (
              <div className="absolute inset-0 rounded-full border-2 border-electric-cyan animate-pulse" />
            )}
          </button>
          {/* Submit button */}
          <button
            onClick={handleSubmit}
            className="w-10 h-10 rounded-full bg-electric-cyan flex items-center justify-center text-midnight shadow-[0_0_20px_rgba(65,228,244,0.4)] hover:scale-105 active:scale-95 transition-all"
            aria-label="Search"
          >
            <ArrowRight className="w-5 h-5 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
}
