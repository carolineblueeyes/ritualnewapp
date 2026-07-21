# Ritual — индекс проекта для агента

Мобильное и веб-приложение для дыхательных практик, «Пути внимания» (21 уровень × 4 главы), standalone-практик, метрик здоровья и локальных/push-уведомлений.

## Стек

| Слой | Технологии |
|------|------------|
| UI | React 19, Motion, Tailwind CSS 4, Vite 6 |
| Native | Capacitor 8 (Android/iOS), Health, Local Notifications, Firebase Messaging |
| Backend | Express (`server.ts`), Vercel serverless (`api/index.ts` → re-export app) |
| Данные | localStorage на клиенте; Supabase (анонимная сессия, privacy-safe sync) |
| AI (опционально) | Gemini (`@google/genai`), ключ `GEMINI_API_KEY` |

Alias импортов: `@/` → корень репозитория (`vite.config.ts`).

## Команды

```bash
npm install          # postinstall патчит @capacitor/local-notifications
npm run dev          # Vite :3000, proxy /api и /health → :8787
npm run server:dev   # Express push API :8787 (.env.server)
npm run build        # dist для web / cap sync
npm run lint         # tsc --noEmit
npm run cap:android  # build + cap sync + open Android Studio
npm run cap:sync     # patch + cap sync
```

## Структура каталогов

```
src/
  App.tsx                 # Корень: табы, onboarding, voice, deep links, sync
  main.tsx, index.css
  types.ts                # Practice, UserStats, ActiveTab
  components/             # UI экранов и инструментов
    RitualDashboard.tsx   # «Сегодня»
    PracticesList.tsx     # Каталог
    StatsPanel.tsx        # «Прогресс», путь, heatmap
    Profile.tsx
    PracticePlayer.tsx    # Обёртка плеера
    PracticeEngine.tsx    # Сценарий по PracticeScript
    players/              # Breathing, Focus, Movement, CompletionScreen, …
    *Tool.tsx             # Breathing, Activity, Focus, Atmosphere (quick tools)
  data/
    practices/            # Контент практик (см. ниже)
    articles.ts
  hooks/
    useHealthData.ts
  services/
    progressStats.ts      # ritual_stats, deriveRealStats, EMPTY_USER_STATS
    audioEngine.ts
    geolocation.ts
    health/               # Health Connect, BLE ring, shine index
    notifications/        # Local notifications + scheduler
    supabase/             # client, auth, privacySync
  utils/
    platform.ts           # getRuntimePlatform, isNativeRuntime
api/index.ts              # Vercel: export default from ../server
server.ts                 # FCM push registrations (Supabase + Firebase Admin)
android/                  # Capacitor Android (MainActivity, ic_push_notification)
scripts/
  patch-capacitor-local-notifications.mjs
capacitor.config.ts
vercel.json               # SPA + /api → api/index
```

## Навигация в приложении

`ActiveTab`: `today` | `practices` | `progress` | `profile` — нижняя панель в `App.tsx`.

Потоки:

- **Quick practices** — массив `INITIAL_PRACTICES` в `App.tsx` (дыхание, ритуалы).
- **Путь внимания** — `chaptersData` / `getPracticeScript` из `src/data/practices/index.ts`.
- **Standalone** — `standaloneData`, `getStandalonePractice(id)`.
- **Инструменты** — модальные `BreathingTool`, `ActivityTool`, `FocusTool`, `AtmosphereTool`.

Плеер: `PracticePlayer` → `PracticeEngine` + step types из `PracticeStep` (`types.ts` в data/practices).

## Контент практик

`src/data/practices/index.ts` — единая точка экспорта:

- Главы: `istok`, `tishina`, `energiya`, `yasnost` — файлы `istok.ts`, `tishina.ts`, …
- Standalone: `standalone-*.ts` (35 практик)
- Хелперы: `getAllLevels`, `getAllStandalone`, `getChapterColor`

Типы сценария: `PracticeScript`, `PracticeStep`, `StandalonePractice` в `data/practices/types.ts`.

## Локальное состояние (ключи)

Искать по `localStorage` / `STORAGE_KEYS`:

- `ritual_stats` — прогресс (`progressStats.ts`, `UserStats`)
- Уведомления — `notification.types.ts` → `STORAGE_KEYS`
- Onboarding / подписка / согласие privacy — см. `Profile.tsx`, `privacySync.ts`, `Onboarding.tsx`

**Сияние (shine)** — расчёт в `services/health/shine.ts`, отображение в дашборде и голосовом ассистенте.

## Supabase (privacy-safe)

- `client.ts` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `hasSupabaseConfig()`
- `auth.ts` — анонимная сессия
- `privacySync.ts` — событие `PRIVACY_SAFE_SYNC_EVENT`, push только агрегатов (без сырых health dumps)

`App.tsx` вызывает `pullAllFromSupabase`, `syncPrivacySafeState`, `requestPrivacySafeSync` при старте и после практик.

## Здоровье

- `health.service.ts` + `@capgo/capacitor-health`
- `connectFlow.ts` — подключение источника
- `manager.ts` — кэш и `fetchHealthData`
- `ring.ts` — BLE-кольцо
- `useHealthData` — React-хук для UI

## Уведомления

- `notification.service.ts` — Capacitor Local Notifications
- `notification.scheduler.ts` — timeline, streak, focus break, social invite, subscription warning
- Push (сервер): регистрация токенов в Supabase, отправка через Firebase Admin (`server.ts`)

Android: иконка `ic_push_notification.xml`, патч postinstall для local notifications.

## Сервер и деплой

- Локально: `npm run server:dev`, Vite проксирует `/api`, `/health`.
- Vercel: `vercel.json` отдаёт `dist` и маршрутизирует API на `api/index.ts`.

Переменные сервера (см. `server.ts`): `PORT`, Supabase service role, `FIREBASE_SERVICE_ACCOUNT_JSON` или ADC, `FIREBASE_PROJECT_ID`.

Клиент: `VITE_*` для Supabase; `.env.local` — `GEMINI_API_KEY` для README/AI Studio.

## Capacitor

- `appId`: `com.ritual.app`, `webDir`: `dist`
- Плагины: Health, StatusBar (overlay), FirebaseMessaging, LocalNotifications
- После изменений web: `npm run cap:sync` или `cap:build`

## Где править типичные задачи

| Задача | Файлы |
|--------|--------|
| Новый экран / таб | `App.tsx`, `types.ts` (ActiveTab) |
| Текст/шаги практики пути | `src/data/practices/{chapter}.ts` |
| Standalone практика | `standalone-*.ts` + id в UI |
| Статистика / streak | `progressStats.ts`, `StatsPanel.tsx` |
| Напоминания | `notification.scheduler.ts`, `Profile.tsx` (время) |
| Sync в облако | `privacySync.ts`, `supabase/*` |
| Push API | `server.ts`, `api/index.ts` |
| Android manifest / activity | `android/app/src/main/` |

## Ограничения при правках

- Не ломать proxy `/api` в `vite.config.ts` без обновления Capacitor URL при необходимости.
- `postinstall` патч обязателен для local notifications на Android — не удалять скрипт без замены.
- Контент практик большой: менять только нужный файл главы, не дублировать данные в компонентах.
