import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, Check } from 'lucide-react';
import GlassSurface from './ui/GlassSurface';

interface SelectOption {
  value: string;
  label: string;
  category?: string;
}

interface SelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  options: SelectOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

const CATEGORIES = [
  { label: 'Исток', value: 'istok' },
  { label: 'Тишина', value: 'tishina' },
  { label: 'Энергия', value: 'energiya' },
  { label: 'Ясность', value: 'yasnost' },
];

export default function SelectModal({ isOpen, onClose, title, options, selectedValue, onSelect }: SelectModalProps) {
  const hasCategories = options.some(opt => opt.category);

  const [activeCategory, setActiveCategory] = React.useState<string>(() => {
    const selectedOpt = options.find(opt => opt.value === selectedValue);
    return selectedOpt?.category || 'istok';
  });

  if (!isOpen || typeof document === 'undefined') return null;

  const filteredOptions = hasCategories
    ? options.filter(opt => opt.category === activeCategory)
    : options;

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-end justify-center bg-black/70 backdrop-blur-md overscroll-none">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className="relative w-full max-w-md z-10 px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]"
      >
        <GlassSurface className="rounded-t-[28px] rounded-b-[20px] px-5 pt-5 pb-6 overflow-hidden">
          <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />

          <div className="flex justify-between items-center mb-5">
            <h3 className="text-[15px] font-medium text-[#F2EFE8]/90">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-[#F2EFE8]/50 active:scale-[0.97] transition-transform duration-[160ms]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {hasCategories && (
            <GlassSurface className="p-1 grid grid-cols-4 gap-1 mb-4">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setActiveCategory(cat.value)}
                  className={`py-2 rounded-[14px] text-[11px] font-medium transition-colors duration-[160ms] ${
                    activeCategory === cat.value
                      ? 'bg-white/[0.10] text-[#F2EFE8]/92'
                      : 'text-[#F2EFE8]/42 hover:text-[#F2EFE8]/60'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </GlassSurface>
          )}

          <div className="flex flex-col max-h-[min(320px,50vh)] overflow-y-auto hide-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { onSelect(option.value); onClose(); }}
                  className="flex items-center justify-between border-b border-[rgba(242,239,232,0.12)] py-4 text-left active:opacity-80 transition-opacity"
                >
                  <span className="text-[15px] text-[#F2EFE8]/85">{option.label}</span>
                  {selectedValue === option.value && (
                    <Check className="w-4 h-4 text-[#C59A55]" />
                  )}
                </button>
              ))
            ) : (
              <p className="text-center py-8 text-[13px] text-[#F2EFE8]/35">
                Нет практик в этой категории
              </p>
            )}
          </div>
        </GlassSurface>
      </motion.div>
    </div>,
    document.body,
  );
}
