import React, { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import type { UserStats } from '../types';
import { addGoal, addNote, archiveGoal, deleteNote, getAchievementDefinitions, getGoals, getNotes, goalProgress, syncAchievements } from '../services/productState';
import GlassSurface from './ui/GlassSurface';

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
    <div className="flex flex-col gap-8">
      {/* Цели — glass card */}
      <section className="flex flex-col gap-4">
        <p className="text-[13px] text-[#F2EFE8]/42 px-1">Цели</p>
        <GlassSurface className="p-4 flex flex-col gap-0">
          {goals.map(goal => {
            const progress = goalProgress(goal, stats);
            const percentage = Math.min(100, Math.round((progress / goal.targetCount) * 100));
            return (
              <div key={goal.id} className="border-b border-[rgba(242,239,232,0.12)] py-4 last:border-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-medium text-[#F2EFE8]/90">{goal.title}</p>
                    <p className="text-[13px] text-[#F2EFE8]/42 mt-1">{progress} из {goal.targetCount} ритуалов</p>
                  </div>
                  <button
                    aria-label="Удалить цель"
                    onClick={() => { archiveGoal(goal.id); setGoals(getGoals()); }}
                    className="p-2 text-[#F2EFE8]/25 hover:text-[#F2EFE8]/60"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="h-px bg-[rgba(242,239,232,0.08)] mt-3 overflow-hidden">
                  <div className="h-px bg-[#C59A55]/80 transition-all duration-500" style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
          <div className="grid grid-cols-[1fr_64px_40px] gap-2 pt-4">
            <input
              value={goalTitle}
              onChange={event => setGoalTitle(event.target.value)}
              maxLength={120}
              aria-label="Название цели"
              placeholder="Новая цель"
              className="min-w-0 bg-transparent border-b border-[rgba(242,239,232,0.12)] px-0 py-2 text-[13px] text-[#F2EFE8]/90 outline-none placeholder:text-[#F2EFE8]/25"
            />
            <input
              type="number"
              min={1}
              max={21}
              value={target}
              onChange={event => setTarget(Number(event.target.value))}
              aria-label="Количество ритуалов"
              className="bg-transparent border-b border-[rgba(242,239,232,0.12)] px-0 py-2 text-[13px] text-[#F2EFE8]/90 outline-none"
            />
            <button
              onClick={createGoal}
              aria-label="Создать цель"
              className="h-9 rounded-full bg-white/[0.08] text-[#F2EFE8]/70 flex items-center justify-center active:scale-[0.97] transition-transform duration-[160ms]"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </GlassSurface>
      </section>

      {/* Заметки */}
      <section className="flex flex-col gap-4">
        <p className="font-display text-[22px] font-light text-[#F2EFE8]/80">Что ты заметил сегодня?</p>
        <div className="flex gap-3">
          <textarea
            value={noteBody}
            onChange={event => setNoteBody(event.target.value)}
            maxLength={2000}
            placeholder="Запиши наблюдение..."
            className="min-h-20 flex-1 resize-none border-b border-[rgba(242,239,232,0.12)] bg-transparent py-3 text-[13px] text-[#F2EFE8]/80 placeholder:text-[#F2EFE8]/25 outline-none"
          />
          <button
            onClick={createNote}
            aria-label="Сохранить заметку"
            className="w-10 h-10 rounded-full bg-white/[0.08] text-[#F2EFE8]/70 flex items-center justify-center active:scale-[0.97] transition-transform duration-[160ms]"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-col">
          {notes.slice(0, 5).map(note => (
            <div key={note.id} className="flex gap-3 items-start border-b border-[rgba(242,239,232,0.12)] py-4">
              <p className="text-[13px] text-[#F2EFE8]/65 leading-relaxed flex-1">{note.body}</p>
              <button
                aria-label="Удалить заметку"
                onClick={() => { deleteNote(note.id); setNotes(getNotes()); }}
                className="text-[#F2EFE8]/25 hover:text-[#F2EFE8]/50"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Достижения — horizontal scroll */}
      <section className="flex flex-col gap-4">
        <p className="text-[13px] text-[#F2EFE8]/42 px-1">Достижения</p>
        <div className="flex gap-5 overflow-x-auto hide-scrollbar pb-2 -mx-1 px-1">
          {achievements.map(item => (
            <div key={item.id} className={`w-28 flex-none ${item.unlocked ? '' : 'opacity-40'}`}>
              <p className="text-[13px] font-medium text-[#F2EFE8]/85">{item.title}</p>
              <p className="text-[11px] text-[#F2EFE8]/35 mt-1 leading-snug">{item.description}</p>
              <div className={`mt-3 h-px ${item.unlocked ? 'bg-[#C59A55]/55' : 'bg-[rgba(242,239,232,0.12)]'}`} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
