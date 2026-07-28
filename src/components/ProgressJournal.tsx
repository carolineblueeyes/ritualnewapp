import React, { useEffect, useMemo, useState } from 'react';
import { Award, Check, Plus, Target, Trash2 } from 'lucide-react';
import type { UserStats } from '../types';
import { addGoal, addNote, archiveGoal, deleteNote, getAchievementDefinitions, getGoals, getNotes, goalProgress, syncAchievements } from '../services/productState';

export default function ProgressJournal({ stats }: { stats: UserStats }) {
  const [goals, setGoals] = useState(getGoals);
  const [notes, setNotes] = useState(getNotes);
  const [goalTitle, setGoalTitle] = useState('Практиковать регулярно');
  const [target, setTarget] = useState(5);
  const [noteBody, setNoteBody] = useState('');
  const achievements = useMemo(() => getAchievementDefinitions(stats), [stats]);

  useEffect(() => {
    void syncAchievements(stats);
  }, [stats]);

  const createGoal = () => {
    if (!goalTitle.trim()) return;
    addGoal(goalTitle, target);
    setGoals(getGoals());
  };
  const createNote = () => {
    if (!noteBody.trim()) return;
    addNote(noteBody);
    setNoteBody('');
    setNotes(getNotes());
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
        <div className="flex items-center gap-2 mb-1"><Target className="w-4 h-4 text-amber-300" /><h3 className="text-sm font-semibold text-white">Цели</h3></div>
        <p className="text-[11px] text-white/45 mb-4">Цели помогают направить внимание.</p>
        <div className="flex flex-col gap-2">
          {goals.map(goal => {
            const progress = goalProgress(goal, stats);
            const percentage = Math.min(100, Math.round((progress / goal.targetCount) * 100));
            return <div key={goal.id} className="rounded-xl bg-black/20 border border-white/[0.05] p-3">
              <div className="flex items-center justify-between gap-3"><div><p className="text-xs text-white/85 font-medium">{goal.title}</p><p className="text-[10px] text-white/45 mt-1">{progress} из {goal.targetCount} ритуалов за неделю</p></div><button aria-label="Удалить цель" onClick={() => { archiveGoal(goal.id); setGoals(getGoals()); }} className="p-2 text-white/30 hover:text-white/70"><Trash2 className="w-3.5 h-3.5" /></button></div>
              <div className="h-1 rounded-full bg-white/[0.05] mt-3 overflow-hidden"><div className="h-full bg-amber-300/80" style={{ width: `${percentage}%` }} /></div>
            </div>;
          })}
          <div className="grid grid-cols-[1fr_64px_40px] gap-2 mt-1"><input value={goalTitle} onChange={event => setGoalTitle(event.target.value)} maxLength={120} aria-label="Название цели" className="min-w-0 rounded-xl bg-black/20 border border-white/[0.06] px-3 text-xs text-white outline-none" /><input type="number" min={1} max={21} value={target} onChange={event => setTarget(Number(event.target.value))} aria-label="Количество ритуалов" className="rounded-xl bg-black/20 border border-white/[0.06] px-2 text-xs text-white outline-none" /><button onClick={createGoal} aria-label="Создать цель" className="h-10 rounded-xl bg-white/10 text-white flex items-center justify-center"><Plus className="w-4 h-4" /></button></div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Заметки</h3>
        <div className="flex gap-2"><textarea value={noteBody} onChange={event => setNoteBody(event.target.value)} maxLength={2000} placeholder="Что ты заметил сегодня?" className="min-h-20 flex-1 resize-none rounded-xl bg-black/20 border border-white/[0.06] p-3 text-xs text-white placeholder:text-white/25 outline-none" /><button onClick={createNote} aria-label="Сохранить заметку" className="w-10 rounded-xl bg-white/10 text-white flex items-center justify-center"><Check className="w-4 h-4" /></button></div>
        <div className="flex flex-col gap-2 mt-3">{notes.slice(0, 5).map(note => <div key={note.id} className="flex gap-3 items-start rounded-xl bg-black/15 p-3"><p className="text-[11px] text-white/65 leading-relaxed flex-1">{note.body}</p><button aria-label="Удалить заметку" onClick={() => { deleteNote(note.id); setNotes(getNotes()); }} className="text-white/25"><Trash2 className="w-3 h-3" /></button></div>)}</div>
      </section>

      <section><div className="flex items-center gap-2 mb-3 px-1"><Award className="w-4 h-4 text-white/60" /><h3 className="text-sm font-semibold text-white">Мои достижения</h3></div><div className="flex gap-2 overflow-x-auto pb-2">{achievements.map(item => <div key={item.id} className={`w-28 flex-none rounded-2xl border p-3 ${item.unlocked ? 'border-amber-300/20 bg-amber-300/[0.06]' : 'border-white/[0.05] bg-white/[0.02] grayscale opacity-45'}`}><div className="text-2xl mb-2">{item.icon}</div><p className="text-[11px] font-semibold text-white/80">{item.title}</p><p className="text-[9px] text-white/40 mt-1 leading-snug">{item.description}</p></div>)}</div></section>
    </div>
  );
}
