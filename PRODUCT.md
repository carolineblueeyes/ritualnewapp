# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Люди, которые хотят понимать своё состояние день за днём и направлять внимание через ритуалы. Приходят утром или в момент неопределённости: «как я сейчас?» и «что с этим делать?».

## Product Purpose

Ritual помогает понимать и управлять состоянием через Сияние, биометрию (Ritual Core / Apple Health / Health Connect) и персональные ритуалы. Успех — человек видит ясное состояние, понимает причину и запускает подходящий ритуал.

## Positioning

Не wellness-дашборд и не трекер метрик ради метрик. Это инструмент состояния: одно число (Сияние), живая аврора, нарратив «почему так», и ритуал как следующий шаг. Кольцо Ritual Core и Rail делают персонализацию непрерывной.

## Operating Context

Мобильное приложение (React + Capacitor, iOS и Android). Нижняя навигация: Сегодня · Практики · Прогресс; отдельный mic FAB → Rail. Экран Здоровье (Ritual Health) открывается с «Сегодня» через «подробнее» как full-screen modal с вкладками Главное · Здоровье · Аналитика.

## Capabilities and Constraints

- Сияние (0–100) из health snapshot; драйверы primary/secondary; состояния авроры по зоне Сияния.
- Источники: Ritual Core (BLE), Apple Health, Health Connect; честные empty / partial / locked состояния.
- Ritual Health: нарратив (в т.ч. женский цикл / беременность), детальные метрики с 7-дневной динамикой, корреляция ритуалов и Сияния (7/30/90).
- Визуальный канон для UI: `docs/design/AURORA-SYSTEM.md`. Структура и информационная модель здоровья: референс JCRing Pro + product brief, **без бенто-карточек**.
- Open: полный паритет метрик JCRing (биологический возраст, VO₂max, сахар и т.д.) зависит от доступности данных с кольца / Health API.

## Brand Commitments

Имя Ritual; мантра «Внимание к себе — это прекрасно»; группы практик Исток · Тишина · Энергия · Ясность; Сияние как главный показатель состояния; Ritual Core как сенсор экосистемы.

## Evidence on Hand

- Product brief: `/home/dima/Загрузки/RITUAL (1).docx`
- Design authority: `docs/design/AURORA-SYSTEM.md`
- Incumbent Health UI: `src/components/RitualDashboard.tsx` (modal Ritual Health)
- Health / Shine services: `src/services/health/*`

## Product Principles

1. Состояние важнее таблицы метрик — сначала смысл, потом цифры.
2. Честность данных: нет данных → прочерк / «нет данных», без фейковых графиков.
3. Aurora + стекло сдержанно; действие живёт в стекле, атмосфера — в фоне.
4. Health читается как JCRing-обзор тела, но оформляется языком Ritual (списки, hairline, editorial), не как mosaic dashboard.
5. Каждая метрика объясняет вклад в Сияние или даёт один ясный инсайт.
