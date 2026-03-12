# Шаг 7 — Медиатека: Архитектура и паттерны

## Обзор

Шаг 7 («Медиатека») — masonry-галерея для загрузки, организации и аннотирования фото/видео материалов осмотра автомобиля. Реализован в компоненте `SortableMediaGallery` (~1100 строк), вызывается из `CreateReport.tsx`.

---

## Структура данных

### MediaItem

```ts
interface MediaItem {
  id: string;
  url: string;               // data URL (FileReader.readAsDataURL)
  type: "image" | "video";
  note?: string;
  inspection?: PartInspection; // данные осмотра (теги, толщина ЛКП, заметка)
  children?: MediaItem[];      // вложенные элементы (группа/стопка)
  groupName?: MediaGroupName;  // "front" | "rear" | "left" | "right" | "roof"
}
```

### Группы (MediaGroupName)

Фиксированный набор из 5 именованных групп:
- `front` — Передняя часть
- `rear` — Задняя часть
- `left` — Левая сторона
- `right` — Правая сторона
- `roof` — Крыша

Каждая группа может быть использована только один раз. Уже занятые группы отслеживаются через `usedGroups: Set<MediaGroupName>`.

---

## Архитектура компонентов

### Иерархия

```
SortableMediaGallery (корневой)
├── LongPressMenu          — контекстное меню (перетаскивание / выделение / заметка)
├── GroupPicker             — выбор имени группы при объединении
├── SelectActionsMenu       — меню действий при выделении (⋯ кнопка)
├── SortableMediaCard       — карточка медиа-файла (с dnd, long press, selection)
├── MediaOverlayCard        — карточка-призрак при перетаскивании (DragOverlay)
├── MediaLightbox           — полноэкранный просмотрщик фото/видео
│   └── PartInspectionModal — модалка осмотра (из lightbox)
└── PartInspectionModal     — модалка общей заметки (для группы)
```

---

## Паттерны взаимодействия

### 1. Три режима взаимодействия (InteractionMode)

```ts
type InteractionMode = "normal" | "drag" | "select";
```

- **normal** — обычный режим, нажатие открывает lightbox/группу
- **drag** — перетаскивание для изменения порядка (DnD)
- **select** — выделение для группировки/удаления/заметки

Переключение режимов происходит через `LongPressMenu` (долгое нажатие 500мс).

### 2. Двухуровневая система режимов

Режимы дублируются для двух уровней:
- **Корневой уровень**: `interactionMode`, `selectedIds`, `longPressMenu`, `savedItems`
- **Уровень группы**: `groupInteractionMode`, `groupSelectedIds`, `groupLongPressMenu`, `groupSavedChildren`

Это позволяет независимо управлять взаимодействием внутри открытой группы.

### 3. Long Press (500мс)

```ts
onPointerDown → запуск таймера (500мс)
onPointerMove → если сдвиг > 5px, отмена таймера
onPointerUp   → отмена таймера
onClick       → если didLongPress, игнорировать клик
```

Long press вычисляет центр карточки (`getBoundingClientRect`) и передаёт координаты в `LongPressMenu`.

**В группе**: long press имеет дополнительную опцию «Заметка» (открывает `PartInspectionModal` для одного элемента).

### 4. Drag & Drop (@dnd-kit)

Используемые модули:
- `DndContext` + `closestCenter`
- `SortableContext` + `rectSortingStrategy`
- `useSortable` хук в каждой карточке
- `DragOverlay` с `MediaOverlayCard`
- `arrayMove` для перестановки

Сенсоры:
```ts
PointerSensor({ activationConstraint: { delay: 200, tolerance: 5 } })
TouchSensor({ activationConstraint: { delay: 200, tolerance: 5 } })
```

DnD активен ТОЛЬКО в режиме `drag`. В остальных режимах `useSortable` отключён через `disabled`.

**Отмена перетаскивания**: при входе в drag-режим сохраняется `savedItems`/`groupSavedChildren`. Кнопка «Отмена» восстанавливает сохранённое состояние.

### 5. Группировка (стопки)

Алгоритм:
1. Выделить ≥2 элемента (только не-группы)
2. Нажать «Объединить в группу» → открывается `GroupPicker`
3. Выбрать имя группы → создаётся новый `MediaItem` с `children` и `groupName`
4. Группа вставляется на позицию первого выделенного элемента

Визуально группа отображается как стопка карточек:
- Два фейковых слоя (`-bottom-1`, `-bottom-2`) создают эффект стопки
- Бейдж с количеством (`Layers` иконка + число)
- Бейдж с названием группы

### 6. Просмотр группы (Group Detail View)

При клике на группу открывается полноэкранный overlay (`z-[95]`) с:
- Заголовком (название группы, кол-во файлов, кнопка «Назад»)
- Своим masonry grid с DnD
- Своими режимами взаимодействия (drag/select)
- Своим lightbox (навигация ограничена элементами группы)

Закрытие: кнопка «←» или выход через `closeGroupView`.

### 7. Lightbox (MediaLightbox)

Полноэкранный просмотр (`z-[100]`):
- Навигация: стрелки ←→, счётчик `N / M`
- Фото: `<img>` с `object-contain`
- Видео: `<video>` с `controls autoPlay playsInline`
- Кнопка «Оставить заметку» внизу → открывает `PartInspectionModal`
- Если элемент в группе → вместо кнопки заметки показывается бейдж с названием группы

При открытии модалки осмотра lightbox скрывается (`!inspectionModalOpen`).

### 8. Заметки / Осмотр (PartInspectionModal)

Три контекста использования:

| Контекст | Источник | Strategy | Особенности |
|----------|----------|----------|-------------|
| Lightbox (одно фото) | Кнопка «Оставить заметку» | По умолчанию (все поля) | Полная модалка |
| Выделение в группе → «Общая заметка» | `SelectActionsMenu` | `group_note` (без noDamage, без photos) | Применяется ко всем выделенным |
| Long press в группе → «Заметка» | `LongPressMenu` | `group_note` (без noDamage, без photos) | Применяется к одному элементу, загружает существующую инспекцию |

Стратегия `group_note`:
```ts
{
  key: "group_note",
  noDamage: false,      // скрыт чекбокс "Без повреждений"
  tags: true,
  paintThickness: true,
  note: true,
  photos: false,         // скрыта секция добавления фото
}
```

### 9. Удаление

- **Одиночное**: кнопка ✕ в левом верхнем углу карточки (видна только в normal-режиме, при hover)
- **Множественное**: через `SelectActionsMenu` → «Удалить»
- **В группе**: при удалении до ≤1 элемента группа автоматически расформировывается

---

## Состояния (State Management)

Всё управление — через `useState` внутри компонента. Нет внешнего store.

### Корневой уровень

| State | Тип | Назначение |
|-------|-----|-----------|
| `activeId` | `string \| null` | ID перетаскиваемого элемента |
| `lightboxIndex` | `number \| null` | Индекс в flatItems для lightbox |
| `interactionMode` | `InteractionMode` | Текущий режим |
| `selectedIds` | `Set<string>` | Выделенные элементы |
| `longPressMenu` | `{id, x, y} \| null` | Позиция контекстного меню |
| `savedItems` | `MediaItem[] \| null` | Бэкап для отмены drag |
| `showGroupPicker` | `boolean` | Видимость пикера групп |
| `openGroupId` | `string \| null` | ID открытой группы |
| `groupLightboxIndex` | `number \| null` | Lightbox внутри группы |

### Уровень группы (при открытой группе)

| State | Тип | Назначение |
|-------|-----|-----------|
| `groupInteractionMode` | `InteractionMode` | Режим внутри группы |
| `groupSelectedIds` | `Set<string>` | Выделенные внутри группы |
| `groupLongPressMenu` | `{id, x, y} \| null` | Контекстное меню в группе |
| `groupSavedChildren` | `MediaItem[] \| null` | Бэкап для отмены drag |
| `groupActiveId` | `string \| null` | Перетаскиваемый в группе |
| `groupNoteModalOpen` | `boolean` | Видимость модалки заметки |
| `groupSingleNoteId` | `string \| null` | ID элемента для одиночной заметки (из long press) |

---

## Вычисляемые данные (useMemo)

### flatItems + itemGroupMap

```ts
const { flatItems, itemGroupMap } = useMemo(() => { ... }, [items]);
```

- `flatItems` — плоский массив всех медиа (разворачивает `children`)
- `itemGroupMap` — `Map<itemId, MediaGroupName>` для определения принадлежности к группе

Используется для:
- Lightbox навигации (индексация по плоскому массиву)
- Определения, показывать ли кнопку заметки или бейдж группы в lightbox

### usedGroups

```ts
const usedGroups = useMemo(() => { ... }, [items]);
```

`Set<MediaGroupName>` — какие имена групп уже заняты. Передаётся в `GroupPicker` для блокировки занятых опций.

---

## Анимации (Framer Motion)

| Элемент | Анимация |
|---------|----------|
| LongPressMenu (overlay) | fade in/out |
| LongPressMenu (карточка) | scale 0.85→1 + fade, spring damping=25 |
| GroupPicker (backdrop) | fade |
| GroupPicker (карточка) | scale 0.9→1 + y: 20→0, spring |
| SelectActionsMenu dropdown | scale 0.9→1 + y: -4→0, spring |
| Mode header | y: -10→0 + fade |
| Selection checkbox | scale 0→1 |
| Group detail view | fade |
| Lightbox | fade |
| Все используют `AnimatePresence` | для exit-анимаций |

---

## z-index слои

| z-index | Элемент |
|---------|---------|
| 50 | Перетаскиваемая карточка |
| 80 | SelectActionsMenu backdrop |
| 81 | SelectActionsMenu dropdown |
| 85 | GroupPicker backdrop |
| 86 | GroupPicker карточка |
| 90 | LongPressMenu backdrop |
| 91 | LongPressMenu карточка |
| 95 | Group detail view (полноэкранный) |
| 100 | Lightbox |

---

## Интеграция с CreateReport.tsx

```tsx
// Шаг 7 в CreateReport.tsx
{step.id === "media" && (
  <SortableMediaGallery
    items={mediaFiles}
    onChange={setMediaFiles}
    onAddFiles={() => mediaFileRef.current?.click()}
  />
)}
```

- `mediaFiles: MediaItem[]` — состояние хранится в `CreateReport`
- `onAddFiles` — триггерит скрытый `<input type="file" accept="image/*,video/*" multiple>`
- Файлы читаются через `FileReader.readAsDataURL` и добавляются в массив
- Черновик сохраняется через `draftStorage` (localStorage)

---

## Masonry Layout

CSS columns вместо JS-библиотеки:

```tsx
<div className="columns-2 gap-3 space-y-3">
  {items.map(item => (
    <div className="break-inside-avoid">
      <SortableMediaCard ... />
    </div>
  ))}
</div>
```

- 2 колонки
- `break-inside-avoid` предотвращает разрыв карточки между колонками
- `gap-3 space-y-3` — отступы 12px

---

## Визуальные индикаторы на карточках

| Индикатор | Условие | Позиция |
|-----------|---------|---------|
| Кнопка удаления (✕) | `normal` mode + hover | top-left |
| Чекбокс выделения | `select` mode | top-left |
| Иконка перетаскивания | `drag` mode | top-left |
| Бейдж кол-ва в стопке | `item.children.length > 1` | top-right |
| Бейдж названия группы | `item.groupName` | top-right (под счётчиком) |

---

## Ограничения и правила

1. Группы (стопки) нельзя выделить или вложить в другую группу
2. Каждое имя группы уникально (одна «Передняя часть» и т.д.)
3. При уменьшении группы до ≤1 элемента она автоматически расформировывается
4. Lightbox в группе ограничен элементами этой группы
5. Модалка заметки в группе скрывает group detail view (`invisible` класс)
6. Кнопка «Добавить файлы» стилизована как карточка и скрыта в drag/select режимах
