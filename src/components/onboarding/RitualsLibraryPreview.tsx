import React from 'react';
import ThoughtSequence from './ThoughtSequence';

interface RitualsLibraryPreviewProps {
  thoughts: string[];
  onThoughtsComplete: () => void;
}

const FILTERS = ['Все', 'Исток', 'Тишина', 'Энергия', 'Ясность'];

const RITUALS = [
  { mood: 'Исток', title: 'Начать день', duration: '8 мин', color: '#C59A55' },
  { mood: 'Тишина', title: 'Дыхание 4-7-8', duration: '5 мин', color: '#76668E' },
  { mood: 'Энергия', title: 'Перед важным моментом', duration: '4 мин', color: '#FF5B00' },
  { mood: 'Ясность', title: 'Сосредоточиться', duration: '10 мин', color: '#A8D5E5' },
];

export default function RitualsLibraryPreview({ thoughts, onThoughtsComplete }: RitualsLibraryPreviewProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden px-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <span className="text-[28px] font-display font-light text-[#F2EFE8]">Ритуалы</span>

      <div className="mt-5 flex gap-2 overflow-hidden pointer-events-none" aria-hidden="true">
        {FILTERS.map((label, index) => (
          <span
            key={label}
            className={`flex-none rounded-full px-3 py-1.5 text-[13px] ${
              index === 0
                ? 'bg-[#F2EFE8] text-[#08090A]'
                : 'border border-white/10 text-[#F2EFE8]/45'
            }`}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="mt-2 pointer-events-none" aria-hidden="true">
        {RITUALS.map((item) => (
          <div
            key={item.title}
            className="flex items-center gap-3 py-4 border-b border-[rgba(242,239,232,0.12)]"
          >
            <div
              className="w-10 h-10 rounded-full flex-shrink-0"
              style={{
                background: `radial-gradient(circle at 35% 35%, ${item.color}88, ${item.color}22 55%, transparent 70%)`,
                boxShadow: `0 0 16px ${item.color}33`,
              }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] text-[#F2EFE8]/42">
                <span>{item.mood}</span>
                <span className="text-[#F2EFE8]/25">·</span>
                <span>{item.duration}</span>
              </div>
              <p className="text-[15px] font-medium text-[#F2EFE8]/90 truncate">{item.title}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-6 min-h-[108px]">
        <ThoughtSequence
          thoughts={thoughts}
          pauseMs={2600}
          initialDelay={400}
          thoughtClassName="text-[17px] leading-[1.45] text-[#F2EFE8]/85"
          onComplete={onThoughtsComplete}
        />
      </div>
    </div>
  );
}
