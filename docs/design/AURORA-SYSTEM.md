# Ritual — Aurora Instrument Design System

Status: product + visual specification  
Scope: full mobile app (React / Capacitor)  
Updated: 2026-08-11  
Authority: RITUAL product doc + reference boards + Emil design-engineering motion rules

---

## 1. Direction

Ritual is a **state instrument**, not a health dashboard. The interface feels like standing inside a calm aurora field while one number tells you how you are, one glass surface suggests what to do next, and the rest of the day unfolds below.

**One sentence:** dark continuous canvas, living aurora atmosphere, thin serif/display numbers, frosted glass only where action lives.

### Modes by surface

| Surface | Mode | Success looks like |
|---------|------|-------------------|
| Today | Operate | User knows state, picks direction, starts a ritual in one tap |
| Onboarding | Experience | User feels the product philosophy before account setup finishes |
| Practices | Operate | User finds and launches the right ritual |
| Progress | Experience | User sees crystal + rhythm, feels momentum |
| Health | Read | User understands why they feel this way |
| Rail | Operate | User speaks intent, gets a ritual |
| Profile | Operate | User manages sources, subscription, settings |

---

## 2. Foundations

### 2.1 Color

| Token | Value | Use |
|-------|-------|-----|
| `--ritual-bg` | `#08090A` | Canvas |
| `--ritual-ink` | `#F2EFE8` | Primary text, hero values |
| `--ritual-ink-70` | `rgba(242,239,232,.70)` | Secondary |
| `--ritual-ink-42` | `rgba(242,239,232,.42)` | Meta |
| `--ritual-line` | `rgba(242,239,232,.12)` | Hairlines |
| `--ritual-mint` | `#74B6A0` | Shine: сияешь |
| `--ritual-sky` | `#7dd3fc` | Shine: баланс |
| `--ritual-amber` | `#C59A55` | Shine: напряжён, warm accent |
| `--ritual-coral` | `#C56855` | Shine: перегруз |
| `--ritual-wait` | `#94a3b8` | No device / waiting |

Practice groups (unchanged): Исток · Тишина · Энергия · Ясность.

### 2.2 Aurora states

Full-screen or hero aurora color follows **Shine state**, not decoration:

| State | Palette | Motion |
|-------|---------|--------|
| `shining` | emerald, mint, soft gold | slow drift, 18–24s |
| `balanced` | green + sky | slow drift |
| `tense` | amber, orange | slightly faster pulse |
| `overload` | coral, deep red | heavy slow waves |
| `waiting` | gray-blue | almost static, rare shimmer |

Implementation: `SilkShaderBackground` + CSS mesh fallback. Respect `prefers-reduced-motion`.

### 2.3 Typography

| Role | Family | Size | Notes |
|------|--------|------|-------|
| Hero value (Shine) | Cormorant Garamond | 88–112px | **Light / 300**, tabular |
| Editorial question | Cormorant Garamond | 28–34px | «Что ты выбираешь сегодня?» |
| Screen title | Inter | 24–28px | Semibold |
| Body | Inter | 15–17px | Regular, 1.45 lh |
| Meta / glass label | Inter | 13px | «Рекомендация», time in timeline |
| Control | Inter | 17px | Semibold buttons |

No kickers/eyebrows above headings. Section names only when scanability requires it.

### 2.4 Glass surface

Reserved for: recommendation card, bottom nav, modals, segmented controls, subscription sheet.

```css
background: rgba(255,255,255,0.06);
border: 1px solid rgba(255,255,255,0.10);
backdrop-filter: blur(20px);
border-radius: 20–24px;
```

Max **one** glass hero per viewport.

### 2.5 Shape & spacing

- Grid: 4px  
- Page margins: 20px phone / 24px wide  
- Vertical rhythm: 24 / 32 / 48  
- Touch target: 44×44 minimum  
- Nav pill radius: 999px  
- Hairlines: 1px at 12% white  

---

## 3. Navigation (invariant)

- Bottom pill: **Сегодня · Практики · Прогресс**  
- Separate **52×52** mic FAB → Rail  
- **Profile** from top-left only  
- **Share** from top-right on Today, Progress (where specified)  
- Subscription entry moves to Profile / Plus card, not Today header  

Spring tab indicator: 250–350ms, light inertia.

---

## 4. Screen specifications

### 4.1 Today (implemented first)

**Header:** Profile left · Share right  

**Block 1 — Сияние**  
1. Large thin number 0–100  
2. Glowing ring indicator (color = state)  
3. Label «Сияние» **below** number  
4. Aurora bleeds behind hero, not inside a rounded card  

**Block 2 — Направление**  
- «Что ты выбираешь сегодня?»  
- Text action «подробнее» → Ritual Health  

**Block 3 — Рекомендация**  
- Single glass key  
- Small: «Рекомендация» · Large: ritual name  
- Tap → launch ritual  
- No ring: «Полный опыт с Ritual Core» → landing  

**Block 4 — Быстрый старт**  
- Horizontal scroll pills: ☀️ 🎤 😰 ⏸️ 🧠 😴 🌙  
- Frosted chips, no photo cards  

**Block 5 — Течение дня**  
- Vertical time + ritual list  
- «+» adds slot; edit time & ritual  

**Removed from Today v1:** inner «Чтение» tab, evening reflection card, separate ring banner, photo recommendation card, Lite header badge.

---

### 4.2 Onboarding

Nine-screen editorial flow. Text as thoughts with pauses. See product doc §Онбординг.  
Visual: `ritual-flow` canvas, cream primary actions, Rail preview, Shine 82 demo, crystal, sources, spark finale.

---

### 4.3 Practices

**Header:** Profile · Search  

1. **Инструменты** — Дыхание, Активность, Фокус, Атмосфера, Ritual Insights (compact glass tiles)  
2. **Направление** — filters: Все, Исток, Тишина, Энергия, Ясность, Избранное  
3. **Lists** — hairline rows, small nebula thumbs, no nested cards  

---

### 4.4 Progress

**Header:** Profile · Share  

1. **Кристалл** — 3D crystal, 60s rotation, manual drag  
2. **Грани** — «Открыто граней» 0–64, glass chevron  
3. **Плитки** — дни практики, ритуалы, серия  
4. **Цели** — glass card, progress «3 из 5»  
5. **Заметки** — «Что ты заметил сегодня?»  
6. **Достижения** — horizontal badge scroll  

---

### 4.5 Ritual Health

Full-screen modal · tabs: **Главное · Здоровье · Аналитика**

- **Главное:** narrative, cycle sheet (🌸), JCRing-style summary blocks  
- **Здоровье:** glass metric cards, driver outlines, sparkline on expand  
- **Аналитика:** Shine line + ritual bars, period 7/30/90, narrative under chart  

Detail metric view: serif value, dot-range (hemoglobin ref), one-line insight.

---

### 4.6 Rail

Voice overlay: waveform center, thought replies, quick intents, input bar. Dark blur canvas.

---

### 4.7 Ritual player

Back · fav · info · phase · timer · living glow · pause/complete · completion insight (+ ring delta if available).

---

### 4.8 Profile

Center identity · Ritual Core source · friends/referral · settings · support · sign out. Plus card links to subscription sheet.

---

## 5. Motion (Emil rules)

| Context | Rule |
|---------|------|
| Tab switch | ≤200ms fade or none |
| Shine ring draw | 700ms once per session |
| Glass press | `scale(0.97)` 160ms ease-out |
| Thought text | opacity + blur(4px), ease-out |
| Quick-start stagger | 40ms, first mount only |
| Never | `transition: all`, `scale(0)` enter, `ease-in` on UI |

Custom ease: `cubic-bezier(0.23, 1, 0.32, 1)`.

---

## 6. Components

| Primitive | Purpose |
|-----------|---------|
| `ShineDial` | Ring + thin hero number |
| `GlassSurface` | Frosted container |
| `AuroraField` | Full-bleed SilkShader wrapper |
| `QuickStartPill` | Horizontal emoji chip |
| `TimelineDay` | Течение дня rows |
| `ThoughtSequence` | Onboarding / Rail text |
| `MainBottomNavigation` | Existing pill + mic |

---

## 7. Migration order

1. ✅ Today — Aurora hero + glass recommendation  
2. Onboarding — align to nine-screen spec  
3. Health modal — editorial metrics  
4. Practices — hairline lists  
5. Progress — crystal-first  
6. Profile header / share consistency  
7. Remove legacy card styles after all consumers migrate  

---

## 8. Definition of done (per screen)

- One visual thesis readable in 3 seconds  
- Aurora/glass used with restraint  
- Product doc block order preserved  
- Real data or honest empty states  
- Safe areas + reduced motion verified  
- No photo-card dashboard patterns  
