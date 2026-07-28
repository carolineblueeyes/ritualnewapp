import React, { useState } from 'react';
import { Grid2X2, Info, Instagram, Smartphone } from 'lucide-react';
import { requestPrivacySafeSync } from '../services/supabase/privacySync';

const ICONS = ['aurora', 'crystal', 'midnight'] as const;

export default function ProfileProductSettings() {
  const [age, setAge] = useState(() => localStorage.getItem('ritual_user_age') || '');
  const [appIcon, setAppIcon] = useState(() => localStorage.getItem('ritual_app_icon') || 'aurora');
  const [showWidgets, setShowWidgets] = useState(false);
  const saveAge = (value: string) => {
    const normalized = value.replace(/\D/g, '').slice(0, 3);
    setAge(normalized);
    const numeric = Number(normalized);
    if (numeric >= 18 && numeric <= 100) localStorage.setItem('ritual_user_age', String(numeric));
    requestPrivacySafeSync();
  };
  const chooseIcon = (icon: string) => { setAppIcon(icon); localStorage.setItem('ritual_app_icon', icon); };

  return <section className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 flex flex-col gap-4">
    <div className="flex justify-between items-center"><span className="text-xs text-white/65">Возраст для персональной нормы</span><input aria-label="Возраст" inputMode="numeric" value={age} onChange={event => saveAge(event.target.value)} placeholder="—" className="w-14 bg-black/20 border border-white/[0.06] rounded-lg px-2 py-1 text-right text-xs text-white outline-none" /></div>
    <div><div className="flex items-center gap-2 mb-2"><Smartphone className="w-4 h-4 text-white/35" /><span className="text-xs text-white/65">Иконка приложения</span></div><div className="grid grid-cols-3 gap-2">{ICONS.map(icon => <button key={icon} onClick={() => chooseIcon(icon)} className={`h-14 rounded-xl border text-[10px] capitalize ${appIcon === icon ? 'border-amber-300/30 bg-amber-300/[0.08] text-white' : 'border-white/[0.05] bg-black/10 text-white/40'}`}>{icon}</button>)}</div><p className="text-[9px] text-white/30 mt-2">Выбор сохранён. Нативная смена иконки применяется после добавления платформенных icon sets.</p></div>
    <button onClick={() => setShowWidgets(!showWidgets)} className="flex items-center justify-between text-left"><span className="flex items-center gap-2 text-xs text-white/65"><Grid2X2 className="w-4 h-4 text-white/35" />Виджеты</span><span className="text-[10px] text-white/35">5 вариантов</span></button>
    {showWidgets && <div className="grid grid-cols-2 gap-2">{['Сияние','Быстрый старт','Дыхание','Серия','Течение дня'].map(name => <div key={name} className="rounded-xl border border-white/[0.05] bg-black/15 p-3 text-[10px] text-white/55">{name}<button className="block mt-2 text-amber-200/60">Добавить</button></div>)}</div>}
    <div className="border-t border-white/[0.05] pt-3 flex flex-col gap-3"><a href="https://ritual.app" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-white/55"><Info className="w-4 h-4" />О проекте</a><a href="https://instagram.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-white/55"><Instagram className="w-4 h-4" />Ritual в Instagram</a></div>
  </section>;
}
