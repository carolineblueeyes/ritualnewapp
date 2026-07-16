import type { StandalonePractice } from './types';

export const standaloneIstok: StandalonePractice[] = [
  {
    id: 'istok-neyro-sbros',
    groupId: 'istok',
    title: '5-4-3-2-1: Нейро-сброс',
    subtitle: '😰 Успокоиться',
    duration: 330,
    shortDuration: 120,
    description: 'Экстренный сброс стресса через сенсорное переключение. 5:30 + короткая версия 2:00.',
    practiceType: 'focus' as const,
    variant: '5-4-3-2-1',
    steps: [
      // ЧАСТЬ 0. ПРОЛОГ
      { id: 'ns-prolog', type: 'narration', startTime: 0, duration: 10, text: 'Пять шагов. Четыре минуты. Чтобы вернуться к себе.', subtitle: 'спокойно, с ясностью', musicVolume: 0.08 },
      { id: 'ns-prolog-pause', type: 'pause', startTime: 10, duration: 5, musicVolume: 0.08 },

      // ЧАСТЬ 1. ВСТУПЛЕНИЕ
      { id: 'ns-intro', type: 'narration', startTime: 15, duration: 18, text: 'Сядь удобно. Поставь обе стопы на пол. Положи левую руку на правое запястье. Туда, где бьётся пульс.', subtitle: 'спокойно, направляя', musicVolume: 0.08 },
      { id: 'ns-intro2', type: 'narration', startTime: 33, duration: 9, text: 'Когда приходит стресс, мы застреваем в голове. Мысли крутятся по кругу. Тело забывает, что можно иначе.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'ns-intro3', type: 'narration', startTime: 42, duration: 9, text: 'Сейчас ты напомнишь ему вниманием. Как луч фонарика в темноте. Куда направишь — туда и вернётся жизнь.', subtitle: 'с теплотой', musicVolume: 0.08 },
      { id: 'ns-intro-pause', type: 'pause', startTime: 51, duration: 3, musicVolume: 0.08 },

      // ЧАСТЬ 2. ШАГ ПЕРВЫЙ — ЗРЕНИЕ
      { id: 'ns-sight', type: 'narration', startTime: 54, duration: 10, text: 'Заметь пять вещей, которые видишь. Первое, на что упал взгляд. Свет на стене. Тень в углу. Край стола. Свои руки.', subtitle: 'мягко, направляя', musicVolume: 0.08 },
      { id: 'ns-sight2', type: 'narration', startTime: 64, duration: 6, text: 'Отметь про себя: вижу. И ещё. И ещё. Пять раз.', subtitle: 'спокойно', musicVolume: 0.08 },
      { id: 'ns-sight-pause', type: 'pause', startTime: 70, duration: 12, musicVolume: 0.08 },
      { id: 'ns-fist', type: 'narration', startTime: 82, duration: 8, text: 'Теперь сожми правую руку в кулак. Сильно. До дрожи. Ощути, как мышцы включились, как напряглась ладонь, как побелели костяшки. Держи.', subtitle: 'с напряжением', musicVolume: 0.08 },
      { id: 'ns-fist2', type: 'narration', startTime: 90, duration: 5, text: 'И с выдохом — отпусти. Резко. С звуком «ха».', subtitle: 'резко', musicVolume: 0.08 },
      { id: 'ns-fist3', type: 'narration', startTime: 95, duration: 7, text: 'Заметь, как напряжение стекло вниз, в землю. Только что там был камень — теперь тепло. Только что ты держал — теперь ты отпустил.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'ns-fist-pause', type: 'pause', startTime: 102, duration: 4, musicVolume: 0.08 },

      // ЧАСТЬ 3. ШАГ ВТОРОЙ — ОСЯЗАНИЕ
      { id: 'ns-touch', type: 'narration', startTime: 106, duration: 6, text: 'Теперь переведи внимание к коже.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'ns-touch2', type: 'narration', startTime: 112, duration: 10, text: 'Что ты чувствуешь прямо сейчас? Ткань одежды на плече. Тепло собственных ладоней. Стопы в обуви. Спинку стула.', subtitle: 'мягко, исследуя', musicVolume: 0.08 },
      { id: 'ns-touch3', type: 'narration', startTime: 122, duration: 8, text: 'Четыре прикосновения. Четыре напоминания: ты здесь, в теле. Ты не в мыслях. Ты там, где тепло.', subtitle: 'с теплотой', musicVolume: 0.08 },
      { id: 'ns-touch-pause', type: 'pause', startTime: 130, duration: 12, musicVolume: 0.08 },
      { id: 'ns-shoulders', type: 'narration', startTime: 142, duration: 8, text: 'Теперь подними плечи к ушам. Выше. Ещё выше. Ощути, как сжалась шея, как напряглись плечи, как будто ты держишь на них что-то тяжёлое.', subtitle: 'с напряжением', musicVolume: 0.08 },
      { id: 'ns-shoulders2', type: 'narration', startTime: 150, duration: 5, text: 'И с выдохом — брось их вниз. С звуком «ха».', subtitle: 'резко', musicVolume: 0.08 },
      { id: 'ns-shoulders3', type: 'narration', startTime: 155, duration: 7, text: 'Заметь, как волна стекла по шее вниз, в грудь, в живот, в стопы. Всё, что ты держал на плечах, ушло в землю.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'ns-shoulders-pause', type: 'pause', startTime: 162, duration: 4, musicVolume: 0.08 },

      // ЧАСТЬ 4. ШАГ ТРЕТИЙ — СЛУХ
      { id: 'ns-hear', type: 'narration', startTime: 166, duration: 5, text: 'Теперь — слух.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'ns-hear2', type: 'narration', startTime: 171, duration: 8, text: 'Три звука, которые ты слышишь прямо сейчас. Гул вентилятора. Собственное дыхание. Шум за окном.', subtitle: 'мягко, исследуя', musicVolume: 0.08 },
      { id: 'ns-hear3', type: 'narration', startTime: 179, duration: 5, text: 'Прими их. Как волны, которые приходят и уходят.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'ns-hear-pause', type: 'pause', startTime: 184, duration: 10, musicVolume: 0.08 },
      { id: 'ns-close-eyes', type: 'narration', startTime: 194, duration: 3, text: 'Закрой глаза.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'ns-breathe-in', type: 'narration', startTime: 197, duration: 7, text: 'Сделай вдох носом. Медленный, глубокий. Ощути, как воздух проходит через ноздри, вниз, в грудь.', subtitle: 'медленно', musicVolume: 0.08 },
      { id: 'ns-breathe-out', type: 'narration', startTime: 204, duration: 10, text: 'И выдохни ртом. Длинный, долгий выдох. Заметь, как тело становится тяжелее. Как будто ты погружаешься в воду. Всё глубже. Глубже. В самую глубину тишины.', subtitle: 'медленно, глубоко', musicVolume: 0.08 },
      { id: 'ns-hear-breathe-pause', type: 'pause', startTime: 214, duration: 5, musicVolume: 0.08 },

      // ЧАСТЬ 5. ШАГ ЧЕТВЁРТЫЙ — ОБОНЯНИЕ И ДВИЖЕНИЕ
      { id: 'ns-smell', type: 'narration', startTime: 219, duration: 5, text: 'Теперь — запахи.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'ns-smell2', type: 'narration', startTime: 224, duration: 6, text: 'Два запаха вокруг тебя. Воздух. Ткань. Дерево.', subtitle: 'мягко, исследуя', musicVolume: 0.08 },
      { id: 'ns-smell3', type: 'narration', startTime: 230, duration: 4, text: 'Вдохни и заметь.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'ns-smell-pause', type: 'pause', startTime: 234, duration: 8, musicVolume: 0.08 },
      { id: 'ns-eyes-open', type: 'narration', startTime: 242, duration: 3, text: 'Теперь открой глаза.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'ns-eye-movement', type: 'narration', startTime: 245, duration: 15, text: 'Медленно переведи взгляд влево. Не поворачивая головы. И вместе с взглядом — вдохни.\n\nТеперь вправо. И вместе с взглядом — выдохни.\n\nВлево — вдох. Вправо — выдох. Влево — вдох. Вправо — выдох.', subtitle: 'медленно, ритмично', musicVolume: 0.08 },
      { id: 'ns-eye-science', type: 'narration', startTime: 260, duration: 18, text: 'Твой мозг только что сбросил ещё один слой напряжения. Так работает попеременная стимуляция полушарий. Тот же механизм, который включается каждую ночь во время сна. Когда ты спишь, твои глаза двигаются — и тревоги дня перерабатываются в тишину. Сейчас ты сделал это осознанно.', subtitle: 'информативно, спокойно', musicVolume: 0.08 },
      { id: 'ns-eye-pause', type: 'pause', startTime: 278, duration: 3, musicVolume: 0.08 },

      // ЧАСТЬ 6. ШАГ ПЯТЫЙ — ВКУС И ЯКОРЬ
      { id: 'ns-taste', type: 'narration', startTime: 281, duration: 5, text: 'И самое тихое — вкус.', subtitle: 'тихо', musicVolume: 0.08 },
      { id: 'ns-taste2', type: 'narration', startTime: 286, duration: 6, text: 'Один вкус во рту. Чай. Вода. Воздух. Заметь.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'ns-taste-pause', type: 'pause', startTime: 292, duration: 6, musicVolume: 0.08 },
      { id: 'ns-anchor', type: 'narration', startTime: 298, duration: 10, text: 'Теперь крепко прижми большой палец к центру запястья. Туда, где бьётся пульс. Ощути его под пальцем. Этот ритм — твой. Он был с тобой всегда.', subtitle: 'с теплотой', musicVolume: 0.08 },
      { id: 'ns-anchor2', type: 'narration', startTime: 308, duration: 4, text: 'Нажми и скажи про себя: «Я здесь». Выдохни.', subtitle: 'с уверенностью', musicVolume: 0.08 },
      { id: 'ns-anchor3', type: 'narration', startTime: 312, duration: 4, text: 'Нажми ещё раз: «Я здесь».', subtitle: 'с уверенностью', musicVolume: 0.08 },
      { id: 'ns-anchor4', type: 'narration', startTime: 316, duration: 4, text: 'И третий раз: «Я здесь».', subtitle: 'с уверенностью', musicVolume: 0.08 },
      { id: 'ns-anchor5', type: 'narration', startTime: 320, duration: 12, text: 'Ты только что создал якорь спокойствия. Через несколько повторений одно прикосновение к запястью будет возвращать тебя в это состояние. Легко. Без усилий. Как будто тело вспомнило дорогу домой.', subtitle: 'мягко, с теплотой', musicVolume: 0.08 },
      { id: 'ns-anchor-pause', type: 'pause', startTime: 332, duration: 5, musicVolume: 0.08 },

      // ЧАСТЬ 7. МИКРО-ЧЕК
      { id: 'ns-micro', type: 'microcheck', startTime: 337, duration: 8, text: 'Заметь, что сейчас.\n\nПлечи тяжёлые и расслабленные. Челюсть свободна. Дыхание глубокое и ровное. Пульс спокойный.', subtitle: 'спокойно, с ясностью', musicVolume: 0.08 },
      { id: 'ns-micro2', type: 'narration', startTime: 345, duration: 10, text: 'Ты только что перевёл внимание с внутреннего шторма на внешний мир. И тело ответило расслаблением.\n\nТревога, возможно, ещё рядом. Но ты больше не внутри неё. Ты смотришь на неё со стороны. Ты — тот, кто управляет вниманием.', subtitle: 'спокойно, с ясностью', musicVolume: 0.08 },
      { id: 'ns-micro-pause', type: 'pause', startTime: 355, duration: 5, musicVolume: 0.08 },

      // ЧАСТЬ 8. НАУЧНЫЙ ИНСАЙТ
      { id: 'ns-science', type: 'narration', startTime: 360, duration: 15, text: 'Когда ты переключаешь внимание на органы чувств, миндалевидное тело — центр страха — снижает активность. Префронтальная кора, отвечающая за контроль, включается в работу.\n\nМы добавили к этому мышечный сброс, попеременную стимуляцию полушарий и якорь на запястье.\n\nТы только что перезагрузил нервную систему. Не метафора. Физиология.', subtitle: 'информативно, с ясностью', musicVolume: 0.08 },
      { id: 'ns-science-pause', type: 'pause', startTime: 375, duration: 3, musicVolume: 0.08 },

      // ЧАСТЬ 9. ТРАНСФОРМАЦИОННАЯ ФРАЗА
      { id: 'ns-transform', type: 'narration', startTime: 378, duration: 10, text: 'Ты перезагрузил нервную систему. Это твой инструмент. Возвращайся к нему в Ritual — в любой момент, когда нужно вернуть контроль.', subtitle: 'спокойно, с теплотой', musicVolume: 0.08 },
      { id: 'ns-transform-pause', type: 'pause', startTime: 388, duration: 3, musicVolume: 0.08 },

      // ЧАСТЬ 10. ЗАКРЕПЛЯЮЩЕЕ ЗАДАНИЕ
      { id: 'ns-homework', type: 'narration', startTime: 391, duration: 15, text: 'В любой момент сегодня, когда тревога попытается вернуться, коснись запястья. Один вдох. Один выдох. Тело вспомнит это состояние. Ты уже знаешь дорогу.', subtitle: 'мягко, с теплотой', musicVolume: 0.08 },
      { id: 'ns-homework-pause', type: 'pause', startTime: 406, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 11. ЗАКРЫТИЕ
      { id: 'ns-close-breath', type: 'narration', startTime: 408, duration: 4, text: 'Сделай глубокий вдох.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'ns-close-breath2', type: 'narration', startTime: 412, duration: 4, text: 'Медленный выдох.', subtitle: 'медленно', musicVolume: 0.08 },
      { id: 'ns-close-fingers', type: 'narration', startTime: 416, duration: 4, text: 'Пошевели пальцами. Медленно.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'ns-close-eyes', type: 'narration', startTime: 420, duration: 3, text: 'Открой глаза.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'ns-close-final', type: 'narration', startTime: 423, duration: 7, text: 'Ты вернулся. Ты в безопасности. Ты справился.', subtitle: 'спокойно, с теплотой', musicVolume: 0.08 },
      { id: 'ns-close-pause', type: 'pause', startTime: 430, duration: 5, musicVolume: 0 },
      { id: 'ns-closing-chord', type: 'final_chord', startTime: 435, duration: 50, musicVolume: 0.08 },
    ],
    shortSteps: [
      // КОРОТКАЯ ВЕРСИЯ 2:00
      // ЧАСТЬ 0. ПРОЛОГ
      { id: 'ns-s-prolog', type: 'narration', startTime: 0, duration: 7, text: 'Пять шагов. Две минуты. Чтобы вернуться к себе.', subtitle: 'спокойно, с ясностью', musicVolume: 0.08 },
      { id: 'ns-s-prolog-pause', type: 'pause', startTime: 7, duration: 3, musicVolume: 0.08 },

      // ЧАСТЬ 1. ВСТУПЛЕНИЕ
      { id: 'ns-s-intro', type: 'narration', startTime: 10, duration: 8, text: 'Сядь удобно. Стопы на полу. Левую руку — на правое запястье.', subtitle: 'чётко, направляя', musicVolume: 0.08 },
      { id: 'ns-s-intro2', type: 'narration', startTime: 18, duration: 7, text: 'Глубокий вдох. Медленный выдох.\n\nСейчас ты переключишь внимание. Через органы чувств, мышцы и дыхание.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'ns-s-intro-pause', type: 'pause', startTime: 25, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 2. ПЯТЬ ШАГОВ
      // Зрение
      { id: 'ns-s-sight-label', type: 'narration', startTime: 27, duration: 3, text: 'Зрение.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'ns-s-sight', type: 'narration', startTime: 30, duration: 8, text: 'Заметь пять вещей, которые видишь. Первое, на что упал взгляд. Раз, два, три, четыре, пять.', subtitle: 'мягко, направляя', musicVolume: 0.08 },
      { id: 'ns-s-fist', type: 'narration', startTime: 38, duration: 10, text: 'Сожми правую руку в кулак. Сильно. До дрожи. И с выдохом — отпусти. С звуком «ха». Напряжение ушло в землю.', subtitle: 'с напряжением, затем отпуская', musicVolume: 0.08 },
      { id: 'ns-s-sight-pause', type: 'pause', startTime: 48, duration: 3, musicVolume: 0.08 },

      // Осязание
      { id: 'ns-s-touch-label', type: 'narration', startTime: 51, duration: 3, text: 'Осязание.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'ns-s-touch', type: 'narration', startTime: 54, duration: 7, text: 'Четыре прикосновения кожи. Ткань на плече. Тепло ладоней. Стопы. Спинка стула. Раз, два, три, четыре.', subtitle: 'мягко, исследуя', musicVolume: 0.08 },
      { id: 'ns-s-shoulders', type: 'narration', startTime: 61, duration: 10, text: 'Подними плечи к ушам. Выше. И с выдохом — брось вниз. С звуком «ха». Волна тепла стекла вниз.', subtitle: 'с напряжением, затем отпуская', musicVolume: 0.08 },
      { id: 'ns-s-touch-pause', type: 'pause', startTime: 71, duration: 3, musicVolume: 0.08 },

      // Слух
      { id: 'ns-s-hear-label', type: 'narration', startTime: 74, duration: 3, text: 'Слух.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'ns-s-hear', type: 'narration', startTime: 77, duration: 6, text: 'Три звука вокруг. Гул. Дыхание. Шум за окном. Раз, два, три.', subtitle: 'мягко, исследуя', musicVolume: 0.08 },
      { id: 'ns-s-breathe', type: 'narration', startTime: 83, duration: 10, text: 'Закрой глаза. Вдох носом — медленный. Выдох ртом — длинный. Тело тяжелеет.', subtitle: 'медленно', musicVolume: 0.08 },
      { id: 'ns-s-hear-pause', type: 'pause', startTime: 93, duration: 3, musicVolume: 0.08 },

      // Обоняние
      { id: 'ns-s-smell-label', type: 'narration', startTime: 96, duration: 3, text: 'Обоняние.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'ns-s-smell', type: 'narration', startTime: 99, duration: 5, text: 'Два запаха. Вдохни и заметь. Раз, два.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'ns-s-eyes', type: 'narration', startTime: 104, duration: 10, text: 'Открой глаза. Взгляд влево — вдох. Вправо — выдох. Влево — вдох. Вправо — выдох. Мозг сбросил напряжение.', subtitle: 'медленно, ритмично', musicVolume: 0.08 },
      { id: 'ns-s-smell-pause', type: 'pause', startTime: 114, duration: 3, musicVolume: 0.08 },

      // Вкус
      { id: 'ns-s-taste-label', type: 'narration', startTime: 117, duration: 3, text: 'Вкус.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'ns-s-taste', type: 'narration', startTime: 120, duration: 5, text: 'Один вкус во рту. Заметь.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'ns-s-anchor', type: 'narration', startTime: 125, duration: 12, text: 'Прижми большой палец к запястью. Ощути пульс. Нажми: «Я здесь». Выдохни. Нажми: «Я здесь». И третий раз: «Я здесь». Ты создал якорь. Тело запомнит.', subtitle: 'с уверенностью', musicVolume: 0.08 },
      { id: 'ns-s-taste-pause', type: 'pause', startTime: 137, duration: 5, musicVolume: 0.08 },

      // ЧАСТЬ 3. МИКРО-ЧЕК
      { id: 'ns-s-micro', type: 'microcheck', startTime: 142, duration: 8, text: 'Плечи расслаблены. Челюсть свободна. Дыхание глубокое. Ты управляешь вниманием.', subtitle: 'спокойно, с ясностью', musicVolume: 0.08 },
      { id: 'ns-s-micro-pause', type: 'pause', startTime: 150, duration: 3, musicVolume: 0.08 },

      // ЧАСТЬ 4. ТРАНСФОРМАЦИОННАЯ ФРАЗА
      { id: 'ns-s-transform', type: 'narration', startTime: 153, duration: 10, text: 'Ты перезагрузил нервную систему за две минуты. Возвращайся к этой практике в Ritual — когда нужно быстро вернуть контроль.', subtitle: 'спокойно, с теплотой', musicVolume: 0.08 },
      { id: 'ns-s-transform-pause', type: 'pause', startTime: 163, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 5. ЗАКРЫТИЕ
      { id: 'ns-s-close', type: 'narration', startTime: 165, duration: 10, text: 'Глубокий вдох. Медленный выдох. Пошевели пальцами. Открой глаза.\n\nТы вернулся. Ты справился.', subtitle: 'мягко, с теплотой', musicVolume: 0.08 },
      { id: 'ns-s-close-pause', type: 'pause', startTime: 175, duration: 5, musicVolume: 0 },
      { id: 'ns-s-closing-chord', type: 'final_chord', startTime: 180, duration: 20, musicVolume: 0.08 },
    ],
    scientificBasis: 'Когда стресс накрывает, миндалевидное тело захватывает управление. Мысли зацикливаются, тело напрягается. Эта практика действует в обход — переключает внимание на органы чувств. Мозг выходит из петли и возвращается в реальность. Четыре механизма: сенсорное переключение, мышечный сброс, движения глаз, якорь на запястье. Марша Линехан, Эдмунд Джекобсон, Фрэнсин Шапиро.',
    ringMarker: {
      trigger: 'Падение ВСР ниже персональной нормы на 25% и более за последние 5 минут. Одновременный скачок пульса выше baseline на 20% и более. Рост КГР выше порогового значения в 2 раза.',
      category: 'Успокоиться',
      expectedOutcome: 'Снижение КГР на 30% и более от пикового значения. Пульс возвращается в зону персонального baseline. ВСР начинает расти в течение 2 минут после завершения. Микродвижения становятся плавными, без хаотичных всплесков.',
    },
  },

  {
    id: 'istok-tochka-pokoya',
    groupId: 'istok',
    title: 'Точка спокойствия',
    subtitle: '😰 Успокоиться',
    duration: 180,
    description: 'Снятие тревоги через акупрессуру. 3:00.',
    practiceType: 'focus' as const,
    variant: 'pause',
    steps: [
      // ЧАСТЬ 0. ПРОЛОГ
      { id: 'tp-prolog', type: 'narration', startTime: 0, duration: 7, text: 'Одна точка. Три минуты. Чтобы вернуть спокойствие.', subtitle: 'спокойно, с ясностью', musicVolume: 0.08 },
      { id: 'tp-prolog-pause', type: 'pause', startTime: 7, duration: 3, musicVolume: 0.08 },

      // ЧАСТЬ 1. ВСТУПЛЕНИЕ
      { id: 'tp-intro', type: 'narration', startTime: 10, duration: 10, text: 'Сядь удобно. Положи руку на колено ладонью вверх.\n\nГлубокий вдох. Медленный выдох.', subtitle: 'спокойно, направляя', musicVolume: 0.08 },
      { id: 'tp-intro2', type: 'narration', startTime: 20, duration: 15, text: 'На твоём запястье есть точка спокойствия. Она связана с блуждающим нервом. Сейчас ты нажмёшь на неё — и тревога начнёт отступать. Ты успокаиваешься. Через прикосновение.', subtitle: 'мягко, с теплотой', musicVolume: 0.08 },
      { id: 'tp-intro-pause', type: 'pause', startTime: 35, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 2. ТЕЛЕСНАЯ ПРАКТИКА
      { id: 'tp-find', type: 'narration', startTime: 37, duration: 12, text: 'Положи три пальца свободной руки поперёк запястья. Под средним пальцем — точка спокойствия. Нажми большим пальцем. Почувствуй её.', subtitle: 'чётно, направляя', musicVolume: 0.08 },
      { id: 'tp-find-pause', type: 'pause', startTime: 49, duration: 5, musicVolume: 0.08 },
      { id: 'tp-press', type: 'narration', startTime: 54, duration: 15, text: 'Нажми. Достаточно сильно, чтобы почувствовать давление. Закрой глаза. Сделай глубокий вдох. На выдохе — чуть усиль нажатие. Вдох — ослабь. Выдох — усиль. Продолжай. Нажатие на выдохе. Ослабление на вдохе.', subtitle: 'с ритмом дыхания', musicVolume: 0.08 },
      { id: 'tp-press-pause', type: 'pause', startTime: 69, duration: 15, musicVolume: 0.08 },
      { id: 'tp-circles', type: 'narration', startTime: 84, duration: 12, text: 'Теперь начни делать маленькие круги большим пальцем. Медленно. Пять кругов по часовой стрелке. Пять — против. Продолжай. Дыши ровно. Плечи опускаются. Челюсть расслабляется.', subtitle: 'мягко, ритмично', musicVolume: 0.08 },
      { id: 'tp-circles-pause', type: 'pause', startTime: 96, duration: 20, musicVolume: 0.08 },
      { id: 'tp-continue', type: 'narration', startTime: 116, duration: 15, text: 'Продолжай дышать. Нажатие на выдохе. Круги большим пальцем. Пульс замедляется. Сердце бьётся спокойнее. Это работает.', subtitle: 'мягко, с теплотой', musicVolume: 0.08 },
      { id: 'tp-continue-pause', type: 'pause', startTime: 131, duration: 15, musicVolume: 0.08 },
      { id: 'tp-release', type: 'narration', startTime: 146, duration: 12, text: 'Медленно отпусти точку. Положи руку на колено ладонью вверх. Почувствуй разницу. То запястье, с которым ты работал, теплее. Расслабленнее. Спокойнее. Запомни это ощущение.', subtitle: 'мягко, с теплотой', musicVolume: 0.08 },
      { id: 'tp-release-pause', type: 'pause', startTime: 158, duration: 10, musicVolume: 0.08 },

      // ЧАСТЬ 3. МИКРО-ЧЕК
      { id: 'tp-micro', type: 'microcheck', startTime: 168, duration: 10, text: 'Заметь, что изменилось. Пульс стал реже. Дыхание глубже. Плечи опустились. Ты вернул контроль. Ты успокоился. Через тело. Через точку на запястье.', subtitle: 'спокойно, с ясностью', musicVolume: 0.08 },
      { id: 'tp-micro-pause', type: 'pause', startTime: 178, duration: 3, musicVolume: 0.08 },

      // ЧАСТЬ 4. НАУЧНЫЙ ИНСАЙТ
      { id: 'tp-science', type: 'narration', startTime: 181, duration: 18, text: 'Стимуляция точки перикарда-6 активирует блуждающий нерв — главный нерв парасимпатической системы. Это снижает частоту сердечных сокращений, уменьшает выброс кортизола и переключает организм в режим восстановления. Ты чувствуешь это как спокойствие, которое разливается от запястья по всему телу.', subtitle: 'информативно, с ясностью', musicVolume: 0.08 },
      { id: 'tp-science-pause', type: 'pause', startTime: 199, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 5. ТРАНСФОРМАЦИОННАЯ ФРАЗА
      { id: 'tp-transform', type: 'narration', startTime: 201, duration: 10, text: 'Ты переключил нервную систему прикосновением. Это твой инструмент. Точка спокойствия всегда с тобой. Возвращайся к ней в Ritual — когда нужно быстро успокоиться.', subtitle: 'спокойно, с теплотой', musicVolume: 0.08 },
      { id: 'tp-transform-pause', type: 'pause', startTime: 211, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 6. ЗАКРЕПЛЯЮЩЕЕ ЗАДАНИЕ
      { id: 'tp-homework', type: 'narration', startTime: 213, duration: 15, text: 'Сегодня, когда почувствуешь тревогу, коснись большим пальцем точки на запястье. Сделай один глубокий вдох и выдох. Тело вспомнит это ощущение и вернёт спокойствие.', subtitle: 'мягко, с теплотой', musicVolume: 0.08 },
      { id: 'tp-homework-pause', type: 'pause', startTime: 228, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 7. ЗАКРЫТИЕ
      { id: 'tp-close', type: 'narration', startTime: 230, duration: 12, text: 'Глубокий вдох. Медленный выдох. Открой глаза.\n\nТы спокоен. Ты в себе.', subtitle: 'мягко, с теплотой', musicVolume: 0.08 },
      { id: 'tp-close-pause', type: 'pause', startTime: 242, duration: 5, musicVolume: 0 },
      { id: 'tp-closing-chord', type: 'final_chord', startTime: 247, duration: 33, musicVolume: 0.08 },
    ],
    scientificBasis: 'Механическая стимуляция точки перикарда-6 (PC6) на внутренней стороне запястья активирует блуждающий нерв — главный нерв парасимпатической системы. Это снижает частоту сердечных сокращений, уменьшает выброс кортизола и переключает организм с режима «бей или беги» на режим «отдых и восстановление». Точка перикарда-6 (РСб). Исследования акупрессуры при тревоге — Дэниел Черкин, Вашингтонский университет.',
    ringMarker: {
      trigger: 'Пульс резко повышен. КГР высокая. ВСР резко упала. Микродвижения указывают на тремор рук.',
      category: 'Успокоиться',
      expectedOutcome: 'Пульс снижается до baseline в течение 2 минут. КГР падает. ВСР начинает расти.',
    },
  },

  {
    id: 'istok-kvadratnoe-dyhanie',
    groupId: 'istok',
    title: 'Квадратное дыхание',
    subtitle: '🧠 Сосредоточиться',
    duration: 120,
    description: 'Баланс нервной системы через ритм. 2:00.',
    practiceType: 'breathing' as const,
    variant: 'square',
    steps: [
      // ЧАСТЬ 0. ПРОЛОГ
      { id: 'kd-prolog', type: 'narration', startTime: 0, duration: 7, text: 'Четыре стороны. Две минуты. Чтобы собрать внимание.', subtitle: 'спокойно, с ясностью', musicVolume: 0.08 },
      { id: 'kd-prolog-pause', type: 'pause', startTime: 7, duration: 3, musicVolume: 0.08 },

      // ЧАСТЬ 1. ВСТУПЛЕНИЕ
      { id: 'kd-intro', type: 'narration', startTime: 10, duration: 10, text: 'Сядь с прямой спиной. Стопы на полу. Закрой глаза.\n\nГлубокий вдох. Медленный выдох.', subtitle: 'чётко, направляя', musicVolume: 0.08 },
      { id: 'kd-intro2', type: 'narration', startTime: 20, duration: 12, text: 'Когда мысли разбегаются, вернуть контроль помогает ритм. Четыре счёта. Четыре фазы. Ты собираешь внимание в точку. Сейчас — только ритм. Только ты.', subtitle: 'мягко, с ясностью', musicVolume: 0.08 },
      { id: 'kd-intro-pause', type: 'pause', startTime: 32, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 2. ПЕРВЫЙ ЦИКЛ С ДИКТОРОМ
      { id: 'kd-metronome', type: 'narration', startTime: 34, duration: 6, text: 'Сейчас метроном задаст ритм. Следуй за ним.', subtitle: 'чётко', musicVolume: 0.08 },
      { id: 'kd-cycle', type: 'narration', startTime: 40, duration: 20, text: 'Вдох носом — раз, два, три, четыре. Задержка — раз, два, три, четыре. Выдох ртом — раз, два, три, четыре. Задержка — раз, два, три, четыре.', subtitle: 'ритмично, с метрономом', musicVolume: 0.08 },

      // ЧАСТЬ 3. ТРИ САМОСТОЯТЕЛЬНЫХ ЦИКЛА
      { id: 'kd-self-intro', type: 'narration', startTime: 60, duration: 6, text: 'Дальше — самостоятельно. Три цикла. Следуй за ритмом. Если приходят мысли — заметь их и вернись к ударам метронома.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'kd-self-pause', type: 'pause', startTime: 66, duration: 24, musicVolume: 0.08 },

      // ЧАСТЬ 4. МИКРО-ЧЕК
      { id: 'kd-micro', type: 'microcheck', startTime: 90, duration: 10, text: 'Заметь, что изменилось. Мысли выстроились в ряд. Ты собрал внимание в точку. Теперь ты управляешь им.', subtitle: 'спокойно, с ясностью', musicVolume: 0.08 },
      { id: 'kd-micro-pause', type: 'pause', startTime: 100, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 5. ТРАНСФОРМАЦИОННАЯ ФРАЗА
      { id: 'kd-transform', type: 'narration', startTime: 102, duration: 10, text: 'Ты собрал внимание в точку. Квадрат — твой инструмент. Возвращайся к нему в Ritual — когда нужно сосредоточиться перед важной задачей.', subtitle: 'спокойно, с теплотой', musicVolume: 0.08 },
      { id: 'kd-transform-pause', type: 'pause', startTime: 112, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 6. ЗАКРЫТИЕ
      { id: 'kd-close', type: 'narration', startTime: 114, duration: 6, text: 'Глубокий вдох. Медленный выдох. Открой глаза.\n\nТы собран. Ты управляешь вниманием.', subtitle: 'мягко, с ясностью', musicVolume: 0.08 },
      { id: 'kd-close-pause', type: 'pause', startTime: 120, duration: 5, musicVolume: 0 },
      { id: 'kd-closing-chord', type: 'final_chord', startTime: 125, duration: 35, musicVolume: 0.08 },
    ],
    scientificBasis: 'Четыре равные фазы по четыре счёта — вдох, задержка, выдох, задержка — создают резонанс между дыхательным центром в стволе мозга и синоатриальным узлом сердца. Это выравнивает пульс, снижает кортизол и возвращает внимание к себе. Техника box breathing, используемая в программах подготовки к действиям в условиях высокого стресса.',
    ringMarker: {
      trigger: 'ВСР нестабильна в течение 10 минут и более. Пульс выше baseline на 10% и более. Паттерн дыхания хаотичный — частые короткие вдохи.',
      category: 'Сосредоточиться',
      expectedOutcome: 'ВСР стабилизируется. Пульс возвращается к baseline. Паттерн дыхания становится ровным, с глубокими циклами.',
    },
  },

  {
    id: 'istok-skanirovanie-tela',
    groupId: 'istok',
    title: 'Сканирование тела',
    subtitle: '😴 Восстановиться',
    duration: 330,
    description: 'Обнаружение и снятие скрытого напряжения. 5:30.',
    practiceType: 'focus' as const,
    variant: 'body-scan',
    steps: [
      // ЧАСТЬ 0. ПРОЛОГ
      { id: 'st-prolog', type: 'narration', startTime: 0, duration: 7, text: 'От стоп до макушки. Пять минут. Чтобы вернуться в тело.', subtitle: 'спокойно, с ясностью', musicVolume: 0.08 },
      { id: 'st-prolog-pause', type: 'pause', startTime: 7, duration: 3, musicVolume: 0.08 },

      // ЧАСТЬ 1. ВСТУПЛЕНИЕ
      { id: 'st-intro', type: 'narration', startTime: 10, duration: 12, text: 'Ляг на спину. Руки вдоль тела. Ноги слегка разведены. Закрой глаза.\n\nГлубокий вдох. Медленный выдох.', subtitle: 'мягко, направляя', musicVolume: 0.08 },
      { id: 'st-intro2', type: 'narration', startTime: 22, duration: 18, text: 'Тело хранит всё. Каждый прожитый день. Каждую непрожитую эмоцию. Ты привык к этому и перестал замечать. Сейчас — заметишь. И отпустишь. Ты запустишь восстановление. Внимание вернётся туда, где оно должно быть всегда.', subtitle: 'мягко, с глубиной', musicVolume: 0.08 },
      { id: 'st-intro-pause', type: 'pause', startTime: 40, duration: 3, musicVolume: 0.08 },

      // ЧАСТЬ 2. ТЕЛЕСНАЯ ПРАКТИКА
      { id: 'st-start', type: 'narration', startTime: 43, duration: 7, text: 'Сделай глубокий вдох. И медленный выдох. Начинаем.', subtitle: 'мягко', musicVolume: 0.08 },

      { id: 'st-feet', type: 'narration', startTime: 50, duration: 8, text: 'Пальцы ног. Подошвы. Пятки. Подъём стопы. Какая температура? Есть ли напряжение? Заметь. Ничего не меняй.', subtitle: 'мягко, исследуя', musicVolume: 0.08 },
      { id: 'st-feet-pause', type: 'pause', startTime: 58, duration: 8, musicVolume: 0.08 },

      { id: 'st-calves', type: 'narration', startTime: 66, duration: 8, text: 'Голени. Икры. Колени. Левая сторона. Правая. Заметь ощущения. Тепло. Тяжесть. Покалывание. Что угодно.', subtitle: 'мягко, исследуя', musicVolume: 0.08 },
      { id: 'st-calves-pause', type: 'pause', startTime: 74, duration: 8, musicVolume: 0.08 },

      { id: 'st-thighs', type: 'narration', startTime: 82, duration: 10, text: 'Мышцы бёдер. Тазобедренные суставы. Ягодицы. Всё, на чём ты стоишь. Сделай вдох — направь внимание в эту область. Выдох — отпусти всё, что там задержалось.', subtitle: 'мягко, с ритмом дыхания', musicVolume: 0.08 },
      { id: 'st-thighs-pause', type: 'pause', startTime: 92, duration: 8, musicVolume: 0.08 },

      { id: 'st-core', type: 'narration', startTime: 100, duration: 7, text: 'Диафрагма. Поясница. Живот. Что ты чувствуешь? Тепло? Движение? Заметь.', subtitle: 'мягко, исследуя', musicVolume: 0.08 },
      { id: 'st-core-pause', type: 'pause', startTime: 107, duration: 8, musicVolume: 0.08 },

      { id: 'st-heart', type: 'narration', startTime: 115, duration: 12, text: 'Сердце. Лёгкие. Рёбра. Сделай вдох — почувствуй, как расширяется грудь. Выдох — как она опускается. Сердце бьётся. Лёгкие дышат. Ты жив. Ты здесь.', subtitle: 'с теплотой', musicVolume: 0.08 },
      { id: 'st-heart-pause', type: 'pause', startTime: 127, duration: 8, musicVolume: 0.08 },

      { id: 'st-arms', type: 'narration', startTime: 135, duration: 10, text: 'Плечи. Лопатки. Верхняя часть спины. Опусти плечи. Ещё ниже. Ты удивишься, как высоко они были. Предплечья. Ладони. Пальцы. Пошевели ими. Заметь тепло или прохладу.', subtitle: 'мягко, исследуя', musicVolume: 0.08 },
      { id: 'st-arms-pause', type: 'pause', startTime: 145, duration: 8, musicVolume: 0.08 },

      { id: 'st-neck', type: 'narration', startTime: 153, duration: 10, text: 'Горло. Затылок. Сглотни. Заметь, как двигаются мышцы. Поверни голову влево — совсем чуть-чуть. Вправо. Верни в центр. Отпусти.', subtitle: 'мягко, исследуя', musicVolume: 0.08 },
      { id: 'st-neck-pause', type: 'pause', startTime: 163, duration: 8, musicVolume: 0.08 },

      { id: 'st-face', type: 'narration', startTime: 171, duration: 10, text: 'Челюсть. Губы. Щёки. Глаза. Лоб. Макушка. Заметь, где есть напряжение. Разожми челюсть. Расслабь лоб. Глаза спокойные, как будто смотрят в темноту.', subtitle: 'мягко, исследуя', musicVolume: 0.08 },
      { id: 'st-face-pause', type: 'pause', startTime: 181, duration: 8, musicVolume: 0.08 },

      { id: 'st-whole', type: 'narration', startTime: 189, duration: 10, text: 'Всё тело целиком. От стоп до макушки. Сделай вдох — почувствуй себя полностью. Выдох — ты дома. Ты в себе. Ты восстанавливаешься.', subtitle: 'с теплотой', musicVolume: 0.08 },
      { id: 'st-whole-pause', type: 'pause', startTime: 199, duration: 15, musicVolume: 0.08 },

      // ЧАСТЬ 3. МИКРО-ЧЕК
      { id: 'st-micro', type: 'microcheck', startTime: 214, duration: 12, text: 'Заметь, что изменилось. Тело стало тяжелее. Или легче. Или теплее. Напряжение, которое ты заметил, уходит. Ты переключил нервную систему с режима борьбы на режим восстановления. Внимание вернулось к тебе.', subtitle: 'спокойно, с ясностью', musicVolume: 0.08 },
      { id: 'st-micro-pause', type: 'pause', startTime: 226, duration: 3, musicVolume: 0.08 },

      // ЧАСТЬ 4. НАУЧНЫЙ ИНСАЙТ
      { id: 'st-science', type: 'narration', startTime: 229, duration: 15, text: 'Систематическое сканирование тела активирует островковую долю мозга — центр интероцепции. Это напрямую снижает активность миндалевидного тела — центра страха. Кортизол падает. Вариабельность сердечного ритма растёт. Ты чувствуешь это как глубокое спокойствие и возвращение к себе.', subtitle: 'информативно, с ясностью', musicVolume: 0.08 },
      { id: 'st-science-pause', type: 'pause', startTime: 244, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 5. ТРАНСФОРМАЦИОННАЯ ФРАЗА
      { id: 'st-transform', type: 'narration', startTime: 246, duration: 15, text: 'Твоё внимание вернулось в тело. В этом состоянии тело восстанавливается быстрее всего. Когда внимание в теле — ты управляешь состоянием. Когда внимание теряется — теряешься и ты. Возвращайся к этой практике в Ritual — когда нужно восстановиться и вернуть контакт с собой.', subtitle: 'спокойно, с теплотой', musicVolume: 0.08 },
      { id: 'st-transform-pause', type: 'pause', startTime: 261, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 6. ЗАКРЕПЛЯЮЩЕЕ ЗАДАНИЕ
      { id: 'st-homework', type: 'narration', startTime: 263, duration: 12, text: 'Сегодня, когда будешь принимать душ или чистить зубы, проведи быстрое сканирование — стопы, плечи, челюсть. Это займёт тридцать секунд и вернёт внимание к себе.', subtitle: 'мягко, с теплотой', musicVolume: 0.08 },
      { id: 'st-homework-pause', type: 'pause', startTime: 275, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 7. ЗАКРЫТИЕ
      { id: 'st-close', type: 'narration', startTime: 277, duration: 10, text: 'Глубокий вдох. Медленный выдох. Пошевели пальцами рук и ног. Открой глаза.\n\nТы вернулся. Ты в себе.', subtitle: 'мягко, с теплотой', musicVolume: 0.08 },
      { id: 'st-close-pause', type: 'pause', startTime: 287, duration: 5, musicVolume: 0 },
      { id: 'st-closing-chord', type: 'final_chord', startTime: 292, duration: 38, musicVolume: 0.08 },
    ],
    scientificBasis: 'Последовательное перемещение внимания по телу активирует островковую долю мозга — центр интероцепции, способности чувствовать себя изнутри. Это переключает нервную систему с режима «бей или беги» на режим «отдых и восстановление». Скрытые мышечные зажимы, которые мозг перестал замечать, снова становятся видимыми и могут быть отпущены. Джон Кабат-Зинн, основатель программы снижения стресса на основе осознанности (MBSR), Медицинская школа Массачусетского университета.',
    ringMarker: {
      trigger: 'Микродвижения указывают на длительное статическое напряжение. Пульс стабильно выше baseline. ВСР снижена.',
      category: 'Восстановиться',
      expectedOutcome: 'Микродвижения становятся плавными. Пульс снижается. ВСР начинает расти.',
    },
  },

  {
    id: 'istok-zazemlenie',
    groupId: 'istok',
    title: 'Заземление через стопы',
    subtitle: '⏸️ Пауза',
    duration: 270,
    description: 'Ощущение опоры и устойчивости. 4:30.',
    practiceType: 'movement' as const,
    variant: 'grounding-feet',
    steps: [
      // ЧАСТЬ 0. ПРОЛОГ
      { id: 'zm-prolog', type: 'narration', startTime: 0, duration: 7, text: 'Пять минут. Чтобы почувствовать опору.', subtitle: 'спокойно, с ясностью', musicVolume: 0.08 },
      { id: 'zm-prolog-pause', type: 'pause', startTime: 7, duration: 3, musicVolume: 0.08 },

      // ЧАСТЬ 1. ВСТУПЛЕНИЕ
      { id: 'zm-intro', type: 'narration', startTime: 10, duration: 12, text: 'Встань. Ноги на ширине плеч. Стопы плотно на полу. Руки свободно вдоль тела. Закрой глаза.\n\nГлубокий вдох. Медленный выдох.', subtitle: 'чётко, направляя', musicVolume: 0.08 },
      { id: 'zm-intro2', type: 'narration', startTime: 22, duration: 18, text: 'Когда мысли кружатся, вернись в стопы. Прямо сейчас земля касается твоих стоп. Заметь это. Ты никуда не идёшь. Ты уже здесь. Это и есть пауза.', subtitle: 'мягко, с глубиной', musicVolume: 0.08 },
      { id: 'zm-intro-pause', type: 'pause', startTime: 40, duration: 3, musicVolume: 0.08 },

      // ЧАСТЬ 2. ТЕЛЕСНАЯ ПРАКТИКА
      { id: 'zm-feel', type: 'narration', startTime: 43, duration: 12, text: 'Перенеси вес тела в стопы. Полностью. Почувствуй пятки. Пальцы ног. Внешний край стопы. Внутренний. Подъём. Вся поверхность.', subtitle: 'мягко, исследуя', musicVolume: 0.08 },
      { id: 'zm-feel-pause', type: 'pause', startTime: 55, duration: 5, musicVolume: 0.08 },

      { id: 'zm-forward-back', type: 'narration', startTime: 60, duration: 12, text: 'Смести вес вперёд — на носки, не отрывая пяток. Заметь, как меняется ощущение. Теперь назад — на пятки, не отрывая носков. Вперёд. Назад. Найди центр. Точку равновесия. Туда, где вес распределён ровно.', subtitle: 'мягко, с движением', musicVolume: 0.08 },
      { id: 'zm-forward-back-pause', type: 'pause', startTime: 72, duration: 5, musicVolume: 0.08 },

      { id: 'zm-left-right', type: 'narration', startTime: 77, duration: 10, text: 'Смести вес влево — на внешний край стоп. Вправо — на внутренний. Влево. Вправо. Вернись в центр. Почувствуй, как стопы держат тебя — целиком.', subtitle: 'мягко, с движением', musicVolume: 0.08 },
      { id: 'zm-left-right-pause', type: 'pause', startTime: 87, duration: 5, musicVolume: 0.08 },

      { id: 'zm-sink', type: 'narration', startTime: 92, duration: 8, text: 'Почувствуй, как тяжесть уходит вниз. В стопы. В пол. В землю. Всё, что тревожит, стекает вниз. Земля принимает всё.', subtitle: 'мягко, глубоко', musicVolume: 0.08 },
      { id: 'zm-sink-pause', type: 'pause', startTime: 100, duration: 10, musicVolume: 0.08 },

      { id: 'zm-rise', type: 'narration', startTime: 110, duration: 10, text: 'Медленно поднимись на носки. Совсем чуть-чуть. Задержись. И мягко опустись. Ещё раз. Поднимись. Задержись. Опустись. Почувствуй, как после подъёма стопы ещё плотнее стоят на земле. Ты здесь.', subtitle: 'мягко, с движением', musicVolume: 0.08 },
      { id: 'zm-rise-pause', type: 'pause', startTime: 120, duration: 5, musicVolume: 0.08 },

      { id: 'zm-stand', type: 'narration', startTime: 125, duration: 12, text: 'Сделай глубокий вдох. Выдох. Ты стоишь. Устойчиво. Спокойно. Стопы плотно на земле. Ты в паузе. И этого достаточно.', subtitle: 'спокойно, с теплотой', musicVolume: 0.08 },
      { id: 'zm-stand-pause', type: 'pause', startTime: 137, duration: 5, musicVolume: 0.08 },

      // ЧАСТЬ 3. МИКРО-ЧЕК
      { id: 'zm-micro', type: 'microcheck', startTime: 142, duration: 12, text: 'Заметь, что изменилось. Дыхание стало глубже. Плечи опустились. Ты чувствуешь опору как физическое ощущение в стопах. Ты вернул внимание к себе — через землю. Ты в паузе. Ты никуда не спешишь.', subtitle: 'спокойно, с ясностью', musicVolume: 0.08 },
      { id: 'zm-micro-pause', type: 'pause', startTime: 154, duration: 3, musicVolume: 0.08 },

      // ЧАСТЬ 4. НАУЧНЫЙ ИНСАЙТ
      { id: 'zm-science', type: 'narration', startTime: 157, duration: 18, text: 'Когда мы сознательно направляем внимание в стопы и ощущаем контакт с землёй, активируется соматосенсорная кора и мозжечок. Это посылает сигнал в миндалевидное тело: «Опасности нет. Я чувствую опору». Кортизол падает. Нервная система переключается в режим безопасности. Через тело. Не через мысли.', subtitle: 'информативно, с ясностью', musicVolume: 0.08 },
      { id: 'zm-science-pause', type: 'pause', startTime: 175, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 5. ТРАНСФОРМАЦИОННАЯ ФРАЗА
      { id: 'zm-transform', type: 'narration', startTime: 177, duration: 10, text: 'Ты вернул себе опору. Ты в паузе. Это твой инструмент. Возвращайся к нему в Ritual — когда нужно остановиться и вернуть внимание в тело.', subtitle: 'спокойно, с теплотой', musicVolume: 0.08 },
      { id: 'zm-transform-pause', type: 'pause', startTime: 187, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 6. ЗАКРЕПЛЯЮЩЕЕ ЗАДАНИЕ
      { id: 'zm-homework', type: 'narration', startTime: 189, duration: 12, text: 'Сегодня, в любой момент — в очереди, на совещании, в метро — переведи внимание в стопы. Почувствуй их. Десять секунд. Это вернёт внимание в тело.', subtitle: 'мягко, с теплотой', musicVolume: 0.08 },
      { id: 'zm-homework-pause', type: 'pause', startTime: 201, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 7. ЗАКРЫТИЕ
      { id: 'zm-close', type: 'narration', startTime: 203, duration: 10, text: 'Глубокий вдох. Медленный выдох. Открой глаза.\n\nТы стоишь. Ты устойчив. Ты в себе.', subtitle: 'мягко, с теплотой', musicVolume: 0.08 },
      { id: 'zm-close-pause', type: 'pause', startTime: 213, duration: 5, musicVolume: 0 },
      { id: 'zm-closing-chord', type: 'final_chord', startTime: 218, duration: 52, musicVolume: 0.08 },
    ],
    scientificBasis: 'Когда мы сознательно направляем внимание в стопы и ощущаем контакт с землёй, активируется соматосенсорная кора и мозжечок. Это посылает сигнал в миндалевидное тело: «Опасности нет. Я чувствую опору». Кортизол падает. Нервная система переключается в режим безопасности. Через тело. Не через мысли. Питер Левин, создатель соматической терапии.',
    ringMarker: {
      trigger: 'ВСР снижена. Пульс выше baseline. Микродвижения хаотичны, указывают на неустойчивость позы.',
      category: 'Пауза',
      expectedOutcome: 'Микродвижения становятся более устойчивыми. Пульс снижается. ВСР начинает расти.',
    },
  },

  {
    id: 'istok-vzglyad-vverh',
    groupId: 'istok',
    title: 'Взгляд вверх',
    subtitle: '😰 Успокоиться',
    duration: 210,
    description: 'Переработка напряжения через движение глаз. 3:20.',
    practiceType: 'focus' as const,
    variant: 'focus-point',
    steps: [
      // ЧАСТЬ 0. ПРОЛОГ
      { id: 'vv-prolog', type: 'narration', startTime: 0, duration: 10, text: 'Каждую ночь глаза закрываются. Напряжение уходит. Сейчас — осознанно. Три минуты.', subtitle: 'спокойно, с ясностью', musicVolume: 0.08 },
      { id: 'vv-prolog-pause', type: 'pause', startTime: 10, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 1. ВСТУПЛЕНИЕ
      { id: 'vv-intro', type: 'narration', startTime: 12, duration: 10, text: 'Сядь с прямой спиной. Голова неподвижна. Открой глаза.\n\nГлубокий вдох носом. Медленный выдох ртом.', subtitle: 'чётко, направляя', musicVolume: 0.08 },
      { id: 'vv-intro2', type: 'narration', startTime: 22, duration: 16, text: 'Когда тревога приходит, мы замираем. Взгляд приклеивается к одной точке. Но глаза созданы для движения. Каждую ночь они двигаются — и перерабатывают напряжение в покой. Сейчас ты сделаешь это днём. Осознанно.', subtitle: 'мягко, с глубиной', musicVolume: 0.08 },
      { id: 'vv-intro-pause', type: 'pause', startTime: 38, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 2. ТЕЛЕСНАЯ ПРАКТИКА
      { id: 'vv-points', type: 'narration', startTime: 40, duration: 8, text: 'Выбери две точки — слева и справа от тебя. Край стола и окно. Стена и дверь.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'vv-move-intro', type: 'narration', startTime: 48, duration: 12, text: 'Медленно переведи взгляд слева направо. Как во сне. Твой мозг делает это каждую ночь — перерабатывает напряжение в покой. Сейчас ты сделаешь это осознанно. Голова неподвижна. Дыши ровно.', subtitle: 'медленно, с ритмом', musicVolume: 0.08 },
      { id: 'vv-move-pause', type: 'pause', startTime: 60, duration: 15, musicVolume: 0.08 },

      { id: 'vv-continue', type: 'narration', startTime: 75, duration: 8, text: 'Продолжай. С каждым движением глаз плечи опускаются чуть ниже. Челюсть отпускает. Ты успокаиваешься.', subtitle: 'мягко, с теплотой', musicVolume: 0.08 },
      { id: 'vv-continue-pause', type: 'pause', startTime: 83, duration: 15, musicVolume: 0.08 },

      { id: 'vv-sync', type: 'narration', startTime: 98, duration: 12, text: 'Теперь синхронизируй движение с дыханием. Взгляд влево — вдох. Вправо — выдох. Влево — вдох. Вправо — выдох. Медленно. Глаза и дыхание работают вместе. Это углубляет расслабление.', subtitle: 'медленно, ритмично', musicVolume: 0.08 },
      { id: 'vv-sync-pause', type: 'pause', startTime: 110, duration: 20, musicVolume: 0.08 },

      { id: 'vv-slow', type: 'narration', startTime: 130, duration: 8, text: 'Замедляйся. Глаза почти остановились. А внутри — тихо. Спокойно.', subtitle: 'тихо, спокойно', musicVolume: 0.08 },
      { id: 'vv-slow-pause', type: 'pause', startTime: 138, duration: 10, musicVolume: 0.08 },

      { id: 'vv-close-eyes', type: 'narration', startTime: 148, duration: 3, text: 'Закрой глаза.', subtitle: 'мягко', musicVolume: 0.08 },
      { id: 'vv-close-pause', type: 'pause', startTime: 151, duration: 5, musicVolume: 0.08 },

      // ЧАСТЬ 3. МИКРО-ЧЕК
      { id: 'vv-micro', type: 'microcheck', startTime: 156, duration: 10, text: 'Заметь, что изменилось. Взгляд свободный. Тревога отступила. Ты переработал напряжение через движение глаз. Ты вернул контроль. Ты успокоился.', subtitle: 'спокойно, с ясностью', musicVolume: 0.08 },
      { id: 'vv-micro-pause', type: 'pause', startTime: 166, duration: 3, musicVolume: 0.08 },

      // ЧАСТЬ 4. НАУЧНЫЙ ИНСАЙТ
      { id: 'vv-science', type: 'narration', startTime: 169, duration: 15, text: 'Горизонтальные движения глаз активируют попеременную работу полушарий мозга. Это снижает активность миндалевидного тела — центра страха — и запускает переработку эмоционального напряжения. Тот же механизм включается каждую ночь во время быстрой фазы сна. Синхронизация с дыханием усиливает эффект. Ты чувствуешь это как спокойствие и возвращение контроля.', subtitle: 'информативно, с ясностью', musicVolume: 0.08 },
      { id: 'vv-science-pause', type: 'pause', startTime: 184, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 5. ТРАНСФОРМАЦИОННАЯ ФРАЗА
      { id: 'vv-transform', type: 'narration', startTime: 186, duration: 10, text: 'Ты использовал механизм, который дала природа. Глаза двигаются — и напряжение уходит. Так было всегда. Возвращайся к этой практике в Ritual — когда нужно сбросить тревогу без усилий.', subtitle: 'спокойно, с теплотой', musicVolume: 0.08 },
      { id: 'vv-transform-pause', type: 'pause', startTime: 196, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 6. ЗАКРЕПЛЯЮЩЕЕ ЗАДАНИЕ
      { id: 'vv-homework', type: 'narration', startTime: 198, duration: 10, text: 'Сегодня, когда почувствуешь, что тревога нарастает, открой приложение и сделай этот ритуал. Он займёт три минуты и вернёт контроль.', subtitle: 'мягко, с теплотой', musicVolume: 0.08 },
      { id: 'vv-homework-pause', type: 'pause', startTime: 208, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 7. ЗАКРЫТИЕ
      { id: 'vv-close', type: 'narration', startTime: 210, duration: 10, text: 'Глубокий вдох носом. Медленный выдох ртом. Открой глаза.\n\nТы спокоен. Ты в себе.', subtitle: 'мягко, с теплотой', musicVolume: 0.08 },
      { id: 'vv-close-pause', type: 'pause', startTime: 220, duration: 5, musicVolume: 0 },
      { id: 'vv-closing-chord', type: 'final_chord', startTime: 225, duration: 35, musicVolume: 0.08 },
    ],
    scientificBasis: 'Горизонтальные движения глаз при неподвижной голове активируют попеременную работу полушарий мозга. Это снижает активность миндалевидного тела — центра страха — и запускает переработку эмоционального напряжения. Тот же механизм включается каждую ночь во время быстрой фазы сна. Синхронизация движений глаз с дыханием усиливает парасимпатический ответ и углубляет расслабление. Фрэнсин Шапиро, создательница EMDR-терапии.',
    ringMarker: {
      trigger: 'Резкий скачок КГР — выше персонального порога в 2 раза и более за короткий промежуток. Одновременно: пульс резко повышен, ВСР резко упала. Микродвижения хаотичны — тело вибрирует при неподвижности.',
      category: 'Успокоиться',
      expectedOutcome: 'Снижение КГР от пикового значения. Микродвижения становятся плавными. Пульс возвращается в зону персонального baseline. ВСР начинает расти в течение 2 минут.',
    },
  },

  {
    id: 'istok-mikro-momenty',
    groupId: 'istok',
    title: 'Микро-моменты',
    subtitle: '⏸️ Пауза',
    duration: 300,
    description: 'Поиск приятных ощущений в теле. 5:00.',
    practiceType: 'focus' as const,
    variant: 'micro-moments',
    steps: [
      // ЧАСТЬ 0. ПРОЛОГ
      { id: 'mm-prolog', type: 'narration', startTime: 0, duration: 7, text: 'Три приятных ощущения. Пять минут. Чтобы заметить хорошее.', subtitle: 'спокойно, с ясностью', musicVolume: 0.08 },
      { id: 'mm-prolog-pause', type: 'pause', startTime: 7, duration: 3, musicVolume: 0.08 },

      // ЧАСТЬ 1. ВСТУПЛЕНИЕ
      { id: 'mm-intro', type: 'narration', startTime: 10, duration: 10, text: 'Сядь удобно. Закрой глаза.\n\nГлубокий вдох носом. Медленный выдох ртом.', subtitle: 'мягко, направляя', musicVolume: 0.08 },
      { id: 'mm-intro2', type: 'narration', startTime: 20, duration: 20, text: 'Прямо сейчас в твоём теле есть приятные ощущения. Что-то тихое. Тепло в ладонях. Прохлада на лице. Давление стоп на пол. Ты просто перестал их замечать. Сейчас — заметишь. Ты в паузе. Ты никуда не спешишь. Внимание — здесь.', subtitle: 'мягко, с теплотой', musicVolume: 0.08 },
      { id: 'mm-intro-pause', type: 'pause', startTime: 40, duration: 3, musicVolume: 0.08 },

      // ЧАСТЬ 2. ТЕЛЕСНАЯ ПРАКТИКА
      { id: 'mm-look', type: 'narration', startTime: 43, duration: 8, text: 'Направь луч внимания в тело. Ищи приятное. Что-то тёплое. Или нейтральное, но спокойное.', subtitle: 'мягко, исследуя', musicVolume: 0.08 },
      { id: 'mm-find1', type: 'narration', startTime: 51, duration: 10, text: 'Может быть, ладони лежат на коленях — и это тепло. Стопы касаются пола — и это устойчивость. Воздух проходит через ноздри — и это лёгкая прохлада. Найди первый микро-момент.', subtitle: 'мягко, с теплотой', musicVolume: 0.08 },
      { id: 'mm-find1-pause', type: 'pause', startTime: 61, duration: 15, musicVolume: 0.08 },

      { id: 'mm-stay1', type: 'narration', startTime: 76, duration: 10, text: 'Побудь с ним. Удерживай на нём внимание. Отметь про себя: вот это приятно. Это твой первый микро-момент. Ты в паузе. Ты просто замечаешь.', subtitle: 'мягко, с теплотой', musicVolume: 0.08 },
      { id: 'mm-stay1-pause', type: 'pause', startTime: 86, duration: 20, musicVolume: 0.08 },

      { id: 'mm-find2', type: 'narration', startTime: 106, duration: 10, text: 'Теперь найди второй. Что-то ещё. Одежда касается плеча. В груди — ощущение ровного дыхания. Направь луч внимания. Отметь: и это приятно.', subtitle: 'мягко, исследуя', musicVolume: 0.08 },
      { id: 'mm-find2-pause', type: 'pause', startTime: 116, duration: 20, musicVolume: 0.08 },

      { id: 'mm-find3', type: 'narration', startTime: 136, duration: 10, text: 'Теперь третий. Самый тихий. Тот, который легче всего пропустить. Может быть, это просто отсутствие напряжения в челюсти. Или тяжесть расслабленных рук. Направь луч внимания. Отметь: и это приятно.', subtitle: 'мягко, тихо', musicVolume: 0.08 },
      { id: 'mm-find3-pause', type: 'pause', startTime: 146, duration: 20, musicVolume: 0.08 },

      { id: 'mm-summary', type: 'narration', startTime: 166, duration: 12, text: 'Три микро-момента. Они всегда были с тобой. Ты просто их не замечал. А теперь — заметил. Луч внимания осветил то, что всегда было рядом. Ты в паузе. И в этой паузе — хорошее.', subtitle: 'с теплотой', musicVolume: 0.08 },
      { id: 'mm-summary-pause', type: 'pause', startTime: 178, duration: 15, musicVolume: 0.08 },

      // ЧАСТЬ 3. МИКРО-ЧЕК
      { id: 'mm-micro', type: 'microcheck', startTime: 193, duration: 15, text: 'Заметь, что изменилось. Ты переключил мозг с поиска угроз на поиск хорошего. Это навык. Он тренируется. Через несколько повторений ты будешь замечать эти моменты сами — без усилий. Потому что мозг научился. Ты в паузе. Ты замечаешь хорошее.', subtitle: 'спокойно, с ясностью', musicVolume: 0.08 },
      { id: 'mm-micro-pause', type: 'pause', startTime: 208, duration: 3, musicVolume: 0.08 },

      // ЧАСТЬ 4. НАУЧНЫЙ ИНСАЙТ
      { id: 'mm-science', type: 'narration', startTime: 211, duration: 12, text: 'Когда мы находим приятное ощущение и удерживаем на нём внимание дольше десяти секунд, нейронные связи, отвечающие за позитивное восприятие, укрепляются. Дофаминовая система активируется. Ты чувствуешь это как лёгкость и спокойствие.', subtitle: 'информативно, с ясностью', musicVolume: 0.08 },
      { id: 'mm-science-pause', type: 'pause', startTime: 223, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 5. ТРАНСФОРМАЦИОННАЯ ФРАЗА
      { id: 'mm-transform', type: 'narration', startTime: 225, duration: 10, text: 'Ты заметил хорошее, которое всегда было рядом. Это твой инструмент. Возвращайся к нему в Ritual — когда нужно остановиться и заметить приятное в теле.', subtitle: 'спокойно, с теплотой', musicVolume: 0.08 },
      { id: 'mm-transform-pause', type: 'pause', startTime: 235, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 6. ЗАКРЕПЛЯЮЩЕЕ ЗАДАНИЕ
      { id: 'mm-homework', type: 'narration', startTime: 237, duration: 15, text: 'Сегодня обращай внимание на мелочи. Красивая ручка в руке. Тёплая кружка. Мягкий шарф. Заметь: вот это приятно. Мозг запомнит. Этого достаточно.', subtitle: 'мягко, с теплотой', musicVolume: 0.08 },
      { id: 'mm-homework-pause', type: 'pause', startTime: 252, duration: 2, musicVolume: 0.08 },

      // ЧАСТЬ 7. ЗАКРЫТИЕ
      { id: 'mm-close', type: 'narration', startTime: 254, duration: 10, text: 'Глубокий вдох носом. Медленный выдох ртом. Открой глаза.\n\nТы в себе. Ты в паузе.', subtitle: 'мягко, с теплотой', musicVolume: 0.08 },
      { id: 'mm-close-pause', type: 'pause', startTime: 264, duration: 5, musicVolume: 0 },
      { id: 'mm-closing-chord', type: 'final_chord', startTime: 269, duration: 31, musicVolume: 0.08 },
    ],
    scientificBasis: 'Мозг эволюционно настроен искать угрозы и пропускать приятные стимулы. Эта практика перенаправляет внимание на микроприятные ощущения в теле и усиливает их за счёт удержания внимания дольше десяти секунд. Активируются дофаминовые рецепторы. Формируется навык замечать хорошее на соматическом уровне — не как мысль, а как телесное переживание. Рик Хансон, позитивная нейропластичность.',
    ringMarker: {
      trigger: 'ВСР стабильно низкая в течение длительного времени (час и более). Пульс не повышен — тревоги нет, но есть подавленность, низкий тонус. Микродвижения низкой амплитуды.',
      category: 'Пауза',
      expectedOutcome: 'ВСР начинает расти в течение 3 минут. Паттерн дыхания становится глубже. Микродвижения — более плавные и свободные.',
    },
  },
];
