import React, { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle, FlaskConical } from 'lucide-react';
import { getReadInsightIds, markInsightRead } from '../services/productState';

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

  return <div className="fixed inset-0 z-[70] bg-[#07090d] overflow-y-auto">
    <div className="max-w-md mx-auto min-h-full px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-12">
      <header className="flex items-center justify-between mb-8"><button aria-label={selected ? 'Назад к списку Insights' : 'Закрыть Ritual Insights'} onClick={selected ? () => setSelectedId(null) : onClose} className="w-10 h-10 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center"><ArrowLeft className="w-4 h-4 text-white/70" /></button><span className="text-[10px] uppercase tracking-[0.24em] text-white/40">Ritual Insights</span><FlaskConical className="w-4 h-4 text-sky-300/70" /></header>
      {selected ? <article><span className="text-[10px] text-sky-300/70 uppercase tracking-wider">{selected.category}</span><h1 className="text-3xl text-white font-light leading-tight mt-3">{selected.title}</h1><p className="text-sm text-white/55 leading-relaxed mt-6">{selected.body}</p><div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 mt-8"><p className="text-[11px] text-white/45 leading-relaxed">Материалы Insights носят образовательный характер и не заменяют медицинскую консультацию.</p></div></article> : <><div className="mb-7"><h1 className="text-3xl font-light text-white">Исследуем состояние человека</h1><p className="text-sm text-white/45 mt-3 leading-relaxed">Короткие объяснения механизмов, на которых строятся практики и показатель Сияния.</p></div><div className="flex flex-col gap-3">{INSIGHTS.map(item => <button key={item.id} onClick={() => open(item.id)} className="text-left rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4"><div className="flex items-start justify-between gap-3"><div><span className="text-[9px] uppercase tracking-wider text-sky-300/60">{item.category}</span><h2 className="text-base text-white/85 font-medium mt-1">{item.title}</h2></div>{readIds.includes(item.id) ? <CheckCircle className="w-4 h-4 text-emerald-300/60" /> : <BookOpen className="w-4 h-4 text-white/25" />}</div><p className="text-[11px] text-white/45 mt-2 leading-relaxed">{item.summary}</p></button>)}</div></>}
    </div>
  </div>;
}
