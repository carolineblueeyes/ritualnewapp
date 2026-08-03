import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mic, Send, X } from 'lucide-react';

interface VoiceAssistantOverlayProps {
  reply: string;
  isListening: boolean;
  onClose: () => void;
  onListen: () => void;
  onSubmit: (query: string) => void;
}

const QUICK_INTENTS = [
  { label: 'Я устал', query: 'я устал' },
  { label: 'Хочу спать', query: 'хочу спать' },
  { label: 'Нужен фокус', query: 'нужен фокус' },
];

export default function VoiceAssistantOverlay({
  reply,
  isListening,
  onClose,
  onListen,
  onSubmit,
}: VoiceAssistantOverlayProps) {
  const [query, setQuery] = useState('');

  const submit = (value = query) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setQuery('');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex h-[100dvh] flex-col justify-end overflow-hidden bg-[#070709]/98 p-6 backdrop-blur-2xl"
    >
      <div className="absolute left-6 right-6 top-6 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">Ассистент</span>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.04] transition-all hover:bg-white/[0.08] active:scale-95"
          aria-label="Закрыть ассистента"
        >
          <X className="h-4 w-4 text-white/60" />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <div className="flex h-16 items-center justify-center gap-1">
          {Array.from({ length: 7 }).map((_, index) => (
            <motion.div
              key={index}
              animate={{
                height: isListening
                  ? [16, Math.random() * 50 + 16, 16]
                  : [16, Math.sin(index) * 8 + 16, 16],
              }}
              transition={{
                duration: isListening ? 0.6 : 1.5,
                repeat: Infinity,
                delay: index * 0.08,
              }}
              className="w-1 rounded-full bg-[#e8e0d4]/40"
              style={{ opacity: isListening ? 0.7 : 0.25 }}
            />
          ))}
        </div>

        <div className="max-w-sm px-4 text-center">
          <motion.div
            key={reply}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5 text-sm leading-relaxed text-white/80"
          >
            <p>{reply}</p>
          </motion.div>

          {isListening && (
            <span className="mt-4 block text-xs tracking-wider text-[#e8e0d4]/60">
              Слушаю...
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-3 pb-6">
        <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
          {QUICK_INTENTS.map((intent) => (
            <button
              key={intent.query}
              type="button"
              onClick={() => submit(intent.query)}
              className="flex-none rounded-2xl border border-white/[0.04] bg-white/[0.04] px-4 py-2 text-xs text-white/50 transition-all hover:border-white/[0.08] active:scale-95"
            >
              {intent.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            onClick={onListen}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8e0d4] text-[#070709] transition-all active:scale-95"
            aria-label="Начать слушать"
          >
            <Mic className="h-[18px] w-[18px] stroke-[2]" />
          </button>

          <div className="relative flex flex-1 items-center">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Состояние..."
              className="h-11 w-full rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 text-sm text-white placeholder-white/20 focus:border-white/[0.12] focus:outline-none"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-xl bg-white/[0.06] text-white/60 transition-all hover:bg-white/[0.1] active:scale-95"
              aria-label="Отправить"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
