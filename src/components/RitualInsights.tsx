import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle, ChevronRight, FlaskConical } from 'lucide-react';
import { getReadInsightIds, markInsightRead } from '../services/productState';
import GlassSurface from './ui/GlassSurface';

const INSIGHTS = [
  { id: 'attention-resource', category: 'Внимание', title: 'Внимание формирует состояние', summary: 'Почему регулярное возвращение к выбранному объекту постепенно меняет автоматические реакции.', body: 'Внимание усиливает те нервные связи, которыми человек пользуется чаще. Практика не требует отсутствия мыслей: ключевой момент — заметить отвлечение и мягко вернуться. Каждый такой возврат является повторением навыка саморегуляции.' },
  { id: 'breath-autonomic', category: 'Дыхание', title: 'Длинный выдох и восстановление', summary: 'Как темп дыхания связан с переключением автономной нервной системы.', body: 'Медленное дыхание с комфортным удлинённым выдохом помогает снизить возбуждение. Практика должна оставаться лёгкой: головокружение, боль или выраженный дискомфорт — сигнал остановиться и вернуться к обычному дыханию.' },
  { id: 'sleep-regularity', category: 'Сон', title: 'Регулярность важнее идеальной ночи', summary: 'Почему тренд сна информативнее единичного измерения.', body: 'Одна ночь редко описывает устойчивое состояние. Ritual использует последовательность дневных агрегатов, чтобы отличать случайное отклонение от тренда и не превращать отдельное число в диагноз.' },
  { id: 'hrv-context', category: 'Биометрия', title: 'ВСР всегда требует контекста', summary: 'Почему показатель сравнивается прежде всего с личной нормой.', body: 'ВСР заметно различается между людьми. Поэтому после накопления истории система опирается на персональный 30-дневный baseline, а популяционные значения использует только в начале.' },
];

export default function RitualInsights({ onClose }: { onClose: () => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState(getReadInsightIds);
  const selected = useMemo(() => INSIGHTS.find(item => item.id === selectedId) ?? null, [selectedId]);
  const open = (id: string) => { markInsightRead(id); setReadIds(getReadInsightIds()); setSelectedId(id); };

  return (
    <div className="fixed inset-0 z-[70] bg-[#08090A] overflow-y-auto">
      <div className="max-w-md mx-auto min-h-full px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-12">
        <header className="flex items-center justify-between mb-8">
          <button
            aria-label={selected ? 'Назад к списку Insights' : 'Закрыть Ritual Insights'}
            onClick={selected ? () => setSelectedId(null) : onClose}
            className="w-10 h-10 rounded-full border border-white/10 bg-white/[0.06] flex items-center justify-center active:scale-[0.97] transition-transform duration-[160ms]"
          >
            <ArrowLeft className="w-4 h-4 text-[#F2EFE8]/70" />
          </button>
          <span className="text-[13px] text-[#F2EFE8]/42">Ritual Insights</span>
          <FlaskConical className="w-4 h-4 text-[#7dd3fc]/70" />
        </header>

        {selected ? (
          <article>
            <span className="text-[13px] text-[#7dd3fc]/70">{selected.category}</span>
            <h1 className="font-display text-[28px] font-light text-[#F2EFE8] leading-tight mt-3">{selected.title}</h1>
            <p className="text-[15px] text-[#F2EFE8]/60 leading-relaxed mt-6">{selected.body}</p>
            <GlassSurface className="p-4 mt-8">
              <p className="text-[13px] text-[#F2EFE8]/42 leading-relaxed">Материалы Insights носят образовательный характер и не заменяют медицинскую консультацию.</p>
            </GlassSurface>
          </article>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="font-display text-[28px] font-light text-[#F2EFE8]">Исследуем состояние</h1>
              <p className="text-[15px] text-[#F2EFE8]/42 mt-3 leading-relaxed">Короткие объяснения механизмов, на которых строятся практики и Сияние.</p>
            </div>
            <div className="flex flex-col">
              {INSIGHTS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => open(item.id)}
                  className="w-full text-left py-4 border-b border-[rgba(242,239,232,0.12)] flex items-center gap-3 active:scale-[0.99] transition-transform duration-[160ms]"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] text-[#7dd3fc]/60">{item.category}</span>
                    <h2 className="text-[15px] text-[#F2EFE8]/90 font-medium mt-0.5">{item.title}</h2>
                    <p className="text-[13px] text-[#F2EFE8]/42 mt-1 leading-relaxed line-clamp-2">{item.summary}</p>
                  </div>
                  {readIds.includes(item.id) ? (
                    <CheckCircle className="w-4 h-4 text-[#74B6A0]/70 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[#F2EFE8]/25 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
