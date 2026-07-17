import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';

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
  
  // Set default active category to the selected option's category if available, or 'istok'
  const [activeCategory, setActiveCategory] = React.useState<string>(() => {
    const selectedOpt = options.find(opt => opt.value === selectedValue);
    return selectedOpt?.category || 'istok';
  });

  if (!isOpen) return null;

  const filteredOptions = hasCategories
    ? options.filter(opt => opt.category === activeCategory)
    : options;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="relative w-full max-w-md bg-[#0e0e16]/95 border-t border-white/10 rounded-t-[40px] px-6 pt-5 pb-8 shadow-2xl z-10"
      >
        <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-sm font-semibold text-white text-center mb-4">{title}</h3>

        {/* Category Tabs inside SelectModal */}
        {hasCategories && (
          <div className="grid grid-cols-4 gap-1 p-1 bg-white/[0.02] border border-white/5 rounded-xl mb-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  activeCategory === cat.value
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1 hide-scrollbar">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => { onSelect(option.value); onClose(); }}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 ${
                  selectedValue === option.value
                    ? 'bg-white/[0.06] border-white/15'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                }`}
              >
                <span className="text-sm text-white/80">{option.label}</span>
                {selectedValue === option.value && (
                  <Check className="w-4 h-4 text-amber-300" />
                )}
              </button>
            ))
          ) : (
            <div className="text-center py-6 text-white/30 text-xs">
              Нет практик в этой категории
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
