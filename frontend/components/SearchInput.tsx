'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Mic, Command } from 'lucide-react';

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
  onSendQuery: (query: string) => void;
  disabled?: boolean;
  hasImage?: boolean;
}

export default function SearchInput({ onSendQuery, disabled, hasImage }: SearchInputProps) {
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
    if (!trimmed || disabled) return;
    onSendQuery(trimmed);
    setQuery('');
  }, [query, onSendQuery, disabled]);

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
      onSendQuery('__VOICE_FALLBACK__');
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
          onSendQuery(final);
          setQuery('');
        }
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
    setIsListening(true);
  }, [isListening, getSpeechRecognition, onSendQuery]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1.5, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-4xl mx-auto"
    >
      <div className={cn(
        "glass h-16 rounded-full flex items-center px-8 border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] group focus-within:border-white/20 transition-all",
        disabled && "opacity-50 pointer-events-none"
      )}>
        <div className="flex items-center gap-3 mr-6">
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <Command className="w-4 h-4 text-white/40" />
          </div>
          <span className="text-white/40 font-black text-[10px] uppercase tracking-[0.2em] hidden sm:inline pt-1">
            ASK NYC
          </span>
          <div className="w-px h-4 bg-white/10 mx-2 hidden sm:block" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={hasImage ? "Analyze this evidence..." : "Identify active Manhattan jazz circuits..."}
          className="bg-transparent border-none outline-none flex-1 text-white text-base font-light placeholder:text-white/10 tracking-wide font-mono"
        />

        <div className="flex items-center gap-6 ml-2">
          {/* Mic button */}
          <button
            onClick={handleMicClick}
            className="relative w-10 h-10 rounded-full flex items-center justify-center text-white/30 hover:text-white transition-all"
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          >
            <Mic className="w-5 h-5" />
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-full bg-health/20"
                />
              )}
            </AnimatePresence>
          </button>

          <div className="w-[1px] h-6 bg-white/10" />

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all"
            aria-label="Submit"
          >
            <ArrowRight className="w-5 h-5 stroke-[3]" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
