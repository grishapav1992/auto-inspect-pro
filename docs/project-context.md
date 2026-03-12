# Контекст проекта: осмотр автомобиля и формирование отчёта

Актуально на: 2026-03-03

## 1) Назначение продукта

Проект — мобильный web-мастер для автоподборщика, в котором он последовательно проходит осмотр конкретного автомобиля и фиксирует:
- идентификационные данные;
- визуально-технические дефекты;
- фото/видео/документы;
- итоговый вердикт и рекомендации.

Итоговая цель: получить завершённый отчёт с понятной аргументацией и возможностью вернуться к черновику в любой момент.

## 2) Стек и архитектурная модель

- React 18 + TypeScript + Vite.
- UI: Tailwind + shadcn/radix.
- Анимации: framer-motion.
- DnD: @dnd-kit (медиатека).
- Хранилище: только localStorage (backend отсутствует).
- Точка оркестрации: `src/pages/CreateReport.tsx`.
- Генерация итога: локальные rule-based функции (`summaryGenerator`, `checklistGenerator`).

Архитектурно это local-first SPA с "толстым" клиентом и state-heavy экраном создания отчёта.

## 3) Маршруты и экраны

- `/` — список черновиков и завершённых отчётов (`ReportsList`).
- `/create` — мастер создания/редактирования отчёта (`CreateReport`).
- `/report/:id` — детальный просмотр завершённого отчёта (`ReportDetail`).
- `/profile` — профиль (демо-экран со статическими метриками).

Нижняя навигация (`BottomNav`) фиксирована для всех экранов.

## 4) Сквозные UX-парадигмы мастера

### 4.1 Mobile-first wizard

- Один активный шаг на экране.
- Слайд-анимации переходов между шагами.
- Крупные touch-friendly контролы.

### 4.2 Progressive disclosure

- Пользователь видит только релевантные поля текущего шага.
- В сложных шагах детали раскрываются по действиям (например, теги появляются после снятия "всё ОК").

### 4.3 Step gating + мягкий skip

- Критичные шаги имеют жёсткий gate (например, VIN/госномер/пробег/подтверждения осмотра).
- Часть шагов допускает "Пропустить" с визуальным предупреждением.

### 4.4 Visual progress + back navigation

- Полоска прогресса 16 шагов.
- Кликабельные chips завершённых/пропущенных шагов.
- Возврат назад на любой предыдущий шаг.

### 4.5 Local-first persistence

- Автосохранение черновика при уходе со страницы.
- Восстановление из `?draft=<id>`.
- Проверка дубля по VIN с модальным разрешением конфликта.

### 4.6 Pattern "structured defect capture"

- Дефекты описываются через теги, заметки, фото, толщину ЛКП, аудио.
- Одинаковая парадигма используется в кузове, силовых частях, остеклении, групповых заметках в медиатеке.

### 4.7 Rule-based decision engine

- Итоговый score/verdict/checklist формируется локально по правилам.
- Блок "ИИ-ассистент" в UI имитирует загрузку, но логика полностью клиентская.

## 5) Детальный разбор каждого шага мастера

Ниже описаны все 16 шагов в формате:
- `UI-интерфейс`.
- `Паттерны/парадигмы`.
- `Условия перехода`.
- `Какие данные фиксируются`.

### Шаг 1: VIN (`vin`)

UI-интерфейс:
- заголовок и описание шага;
- `Input` с моноширинным стилем, `maxLength=17`, принудительный uppercase;
- primary CTA "Продолжить";
- `AlertDialog` при обнаружении дубля VIN.

Паттерны/парадигмы:
- single-field focus step;
- keyboard-friendly submit (`Enter`);
- conflict resolution pattern (продолжить существующий черновик vs начать заново).

Условия перехода:
- VIN не пустой;
- если есть другой черновик с таким VIN, требуется действие в диалоге.

Какие данные фиксируются:
- `vin`;
- при выборе дубля загружается полный state найденного черновика.

### Шаг 2: Госномер (`plate`)

UI-интерфейс:
- centered mono input;
- uppercase трансформация;
- CTA "Продолжить".

Паттерны/парадигмы:
- минималистичный one-field step;
- ранняя валидация на непустое значение.

Условия перехода:
- `plate.trim().length > 0`.

Какие данные фиксируются:
- `plate`.

### Шаг 3: Пробег (`mileage`)

UI-интерфейс:
- numeric input;
- очистка нецифровых символов;
- форматированный preview в `км`;
- CTA "Продолжить".

Паттерны/парадигмы:
- input normalization;
- immediate feedback (форматирование пробега).

Условия перехода:
- `mileage.trim().length > 0`.

Какие данные фиксируются:
- `mileage` (строка с цифрами).

### Шаг 4: Автомобиль (`car`)

UI-интерфейс:
- кнопка открытия полноэкранного `CarPicker`;
- после выбора показывается карточка с фото и поколением;
- CTA "Продолжить" появляется только при выбранном авто.

Паттерны/парадигмы:
- hierarchical picker (марка -> модель -> поколение -> рестайлинг);
- progressive disclosure;
- full-screen modal sub-flow.

Условия перехода:
- выбран `carResult`.

Какие данные фиксируются:
- `carResult` (brand/model/generation/restyling с метаданными).

### Шаг 5: Сверка документов (`docs_check`)

UI-интерфейс:
- 3 toggle-карточки: владелец, VIN, номер двигателя;
- 2 варианта CTA:
- "Продолжить" (когда 3/3);
- "Продолжить с расхождениями" (когда отмечено хотя бы 1, но не 3).

Паттерны/парадигмы:
- checklist verification;
- severity-aware CTA (обычный и warning-стиль).

Условия перехода:
- хотя бы один checkbox отмечен.

Какие данные фиксируются:
- `docsOwnerMatch`, `docsVinMatch`, `docsEngineMatch`.

### Шаг 6: Юр. проверка (`legal`)

UI-интерфейс:
- автоматический loading-state со spinner + skeleton карточками;
- success-state с подтверждением;
- timeout-state с ошибкой и CTA "Подгрузить позже";
- skipped-state.

Паттерны/парадигмы:
- async state machine;
- fail-soft: deferred completion вместо hard-stop;
- таймаут и graceful degradation.

Условия перехода:
- после успешной загрузки либо через "подгрузить позже"/пропуск.

Какие данные фиксируются:
- `legalLoaded`, `legalSkipped`.

### Шаг 7: Медиатека (`media`)

UI-интерфейс:
- `SortableMediaGallery` (masonry сетка);
- добавление image/video через hidden file input;
- long-press меню (`drag` / `select`);
- выделение, удаление, объединение в группы;
- group-view с отдельным DnD;
- lightbox-просмотр.

Паттерны/парадигмы:
- direct manipulation UI;
- mode-based interaction (`normal`/`drag`/`select`);
- grouping/stacking pattern;
- group-route через query param `?group=<id>`.

Условия перехода:
- можно продолжить сразу (жёсткой валидации нет).

Какие данные фиксируются:
- `mediaFiles` (`MediaItem[]`, включая группы и вложенные inspection-комментарии).

### Шаг 8: Осмотр кузовных деталей (`inspection`)

UI-интерфейс:
- групповые кнопки сторон автомобиля (`InspectionGroupButton`);
- модалка осмотра элемента (`PartInspectionModal`);
- чек "пропущенные элементы заводские";
- карточка разброса ЛКП (авторасчёт + ручная корректировка + slider);
- общий медиа-блок (файлы/камера);
- итоговый чек "все элементы осмотрены".

Паттерны/парадигмы:
- group-based data entry;
- reusable inspection modal;
- bulk-complete pattern для пропущенных элементов;
- derived state (диапазон ЛКП из осмотров);
- hard confirmation gate на выходе.

Условия перехода:
- одновременно `checkAllInspected === true` и `checkRemainingFactory === true`.

Какие данные фиксируются:
- `inspections`, `inspectionPhotos`, `bodyPaintFrom`, `bodyPaintTo`.

### Шаг 9: Силовые элементы кузова (`body_overview`)

UI-интерфейс:
- 2 группы: стойки и "лонжероны/пороги/брызговики";
- модалка `PartInspectionModal` для наборов элементов;
- чек "пропущенные элементы заводские";
- отдельный диапазон ЛКП `structPaintFrom/To`;
- медиа-блок (файлы/камера);
- итоговый чек завершённости.

Паттерны/парадигмы:
- domain specialization поверх общего inspection pattern;
- multi-group modal navigation;
- second hard gate по аналогии шага 8.

Условия перехода:
- `checkBodyAllInspected === true` и `checkBodyRemainingFactory === true`.

Какие данные фиксируются:
- `bodyStructuralInspections`, `bodyUndercarriageInspections`, `bodyPhotos`, `structPaintFrom`, `structPaintTo`.

Примечание по текущей реализации:
- состояния `bodyGeometryOk`, `bodyNote`, `bodyStructural`, `bodyDamageElements` сохраняются в draft и участвуют в summary, но в текущем UI этого шага не имеют явных контролов ввода.

### Шаг 10: Остекление (`glass`)

UI-интерфейс:
- группы: лобовое/заднее, боковые, зеркала;
- модалка `PartInspectionModal` со стратегией `GLASS_STRATEGY` (специализированные теги);
- чек "пропущенные элементы без повреждений";
- медиа-блок;
- итоговый чек завершённости.

Паттерны/парадигмы:
- strategy pattern для переиспользуемой модалки;
- повторяемый gate-паттерн из шагов 8-9.

Условия перехода:
- `checkGlassAllInspected === true` и `checkGlassRemainingFactory === true`.

Какие данные фиксируются:
- `glassInspections`, `glassPhotos`.

Примечание по текущей реализации:
- `glassNote` хранится в state/draft, но отдельное поле ввода на шаге не отрисовано.

### Шаг 11: Диагностика (`diagnostics`)

UI-интерфейс:
- upload-зона для image/video/pdf/doc/docx/txt;
- список загруженных файлов с превью и удалением;
- checkbox "пробег соответствует заявленному";
- textarea заметки;
- CTA "Продолжить" или warning-кнопка "Пропустить".

Паттерны/парадигмы:
- evidence attachment step;
- optional completion with soft skip;
- mixed content uploader (медиа + документы).

Условия перехода:
- при наличии файлов/заметки показывается обычный CTA;
- иначе доступен skip.

Какие данные фиксируются:
- `diagnosticFiles`, `diagnosticNote`, `mileageMatchesClaimed`.

Примечание:
- `mileageMatchesClaimed` сохраняется, но в текущей генерации summary/checklist не используется.

### Шаг 12: Подкапотное (`underhood`)

UI-интерфейс:
- чеклист (`UNDERHOOD_ITEMS`);
- заметка;
- фото-сетка с добавлением/удалением;
- CTA "Продолжить" при >=1 отмеченном пункте, иначе warning "Пропустить".

Паттерны/парадигмы:
- compact checklist step;
- minimum-threshold completion pattern.

Условия перехода:
- всегда можно перейти дальше; стиль CTA зависит от заполненности.

Какие данные фиксируются:
- `underhoodChecks`, `underhoodNote`, `underhoodPhotos`.

### Шаг 13: Салон (`interior`)

UI-интерфейс:
- блок "состояние салона": toggle "без повреждений" + теги дефектов;
- блок "работоспособность систем": toggle "всё исправно" + теги неисправностей;
- фото/видео;
- заметка;
- CTA "Продолжить" или "Пропустить".

Паттерны/парадигмы:
- dual-axis assessment (косметика vs функции);
- conditional reveal tag-cloud;
- optional step with meaningful partial completion.

Условия перехода:
- всегда доступен переход; тип CTA зависит от наличия данных.

Какие данные фиксируются:
- `interiorNoDamage`, `interiorTags`, `functionsAllOk`, `functionsTags`, `interiorPhotos`, `interiorNote`.

### Шаг 14: Колёса (`wheels`)

UI-интерфейс:
- 4 секции: шины, диски, тормоза, подвеска;
- в каждой секции: toggle "в норме" и набор тегов проблем;
- фото/видео;
- заметка;
- CTA "Продолжить" или "Пропустить".

Паттерны/парадигмы:
- modular section pattern;
- standardized defect taxonomy;
- repeated control grammar (единый UX-паттерн на все подсекции).

Условия перехода:
- всегда возможен переход; CTA зависит от наличия введённых данных.

Какие данные фиксируются:
- `wheelsTiresOk`, `wheelsTiresTags`,
- `wheelsRimsOk`, `wheelsRimsTags`,
- `wheelsBrakesOk`, `wheelsBrakesTags`,
- `wheelsSuspensionOk`, `wheelsSuspensionTags`,
- `wheelsPhotos`, `wheelsNote`.

### Шаг 15: Тест-драйв (`test_drive`)

UI-интерфейс:
- 5 секций: двигатель, КПП, рулевое, подвеска на ходу, тормоза на ходу;
- каждая секция: toggle OK + теги отклонений;
- фото/видео;
- заметка;
- CTA "Продолжить" или "Пропустить".

Паттерны/парадигмы:
- dynamic repeated sections (рендер массива конфигов);
- consistent issue-capture pattern с шагом 14.

Условия перехода:
- всегда возможен переход; CTA зависит от наличия данных.

Какие данные фиксируются:
- `tdEngineOk`, `tdEngineTags`,
- `tdGearboxOk`, `tdGearboxTags`,
- `tdSteeringOk`, `tdSteeringTags`,
- `tdRideOk`, `tdRideTags`,
- `tdBrakeRideOk`, `tdBrakeRideTags`,
- `tdPhotos`, `tdNote`.

### Шаг 16: Итог (`summary`)

UI-интерфейс:
- verdict-card (emoji, label, score/progress bar);
- секции итогового анализа;
- блок "На что обратить внимание" (чеклист);
- кнопка "Завершить отчёт".

Паттерны/парадигмы:
- explainable decision output (секции с деталями);
- pseudo-async advisory generation (имитация загрузки чеклиста через таймер);
- terminal commit action.

Условия перехода:
- нажатие "Завершить отчёт".

Какие данные фиксируются:
- вызывается `buildDraft()` -> `finalizeDraft()`:
- создаётся `CompletedReport` в `completed_reports`;
- удаляется черновик из `report_drafts`;
- навигация на `/`.

## 6) Модалка осмотра `PartInspectionModal` как основной интерфейсный контракт

Компонент используется в шагах 8, 9, 10 и в медиатеке (заметки к группам/фото).

UI-блоки модалки:
- навигация по активному элементу/группе элементов;
- selector "тип элемента" (если стратегия передала `elementTypes`);
- toggle "без повреждений";
- группы тегов (дефолтные + пользовательские);
- режим редактирования тегов (перетаскивание, скрытие дефолтных, добавление своих);
- диапазон толщины ЛКП;
- заметка + аудиозаписи;
- фото-блок с привязкой фото к тегам.

Паттерны:
- strategy pattern (`InspectionStrategy`);
- auto-save to parent на изменение локального state;
- tag-photo binding (при выборе тега фото может быть обязательным);
- reusable modal microflow.

## 7) Хранилища и ключи localStorage

- `report_drafts` — черновики (`ReportDraft[]`).
- `completed_reports` — завершённые отчёты (`CompletedReport[]`).
- `user_custom_tags_v2` — пользовательские теги для групп дефектов.

Поведение черновиков:
- автосохранение при unmount;
- компрессия части image dataUrl;
- merge по VIN при сохранении.

## 8) Итоговые генераторы

- `generateSummary()`:
- считает penalty;
- формирует score 0..100;
- выдаёт verdict `recommended | with_reservations | not_recommended`;
- собирает секции с деталями.

- `generateChecklist()`:
- формирует список рекомендаций (`info/warning/critical`) на основе тех же входных данных.

Это rule-based логика без внешних AI/ML вызовов.

## 9) Ограничения и техдолг, выявленные при повторном анализе

- Нет backend/синхронизации между устройствами.
- "Юр. проверка" не интегрирована с реальным источником.
- "ИИ-ассистент" — исключительно локальные эвристики.
- `CarPicker` использует `mockCamryGenerations` как общий источник поколений, не модель-специфично.
- Медиатека нового черновика стартует с демо-контента `picsum`.
- Не все файлы/медиа проходят компрессию перед сохранением в localStorage.
- В шаге 9 часть состояний участвует в summary, но не имеет явного UI-ввода (`bodyGeometryOk`, `bodyNote` и др.).
- В шаге 10 `glassNote` хранится, но не редактируется UI.
- В шаге 11 `mileageMatchesClaimed` пока не влияет на summary/checklist.
- Есть неиспользуемые/устаревшие сущности (`Index`, `ReportCard`, `BrandModelPicker`, `GenerationPicker`, `CarPartsList` импортирован в `CreateReport`, но не рендерится).
- `Profile` считает метрики по `MOCK_REPORTS`, а не по реальным завершённым отчётам.

## 10) Карта файлов для изменений

- Логика мастера: `src/pages/CreateReport.tsx`.
- Медиатека: `src/components/SortableMediaGallery.tsx`.
- Осмотр элемента: `src/components/PartInspectionModal.tsx`.
- Итог/вердикт: `src/lib/summaryGenerator.ts`.
- Рекомендации: `src/lib/checklistGenerator.ts`.
- Хранение: `src/lib/draftStorage.ts`, `src/lib/completedReportStorage.ts`.
- Теги пользователя: `src/contexts/UserTagContext.tsx`.

## 11) Краткий operational summary

Сценарий уже покрывает полный end-to-end осмотр с финализацией отчёта. Ключевая архитектурная особенность — единый stateful мастер и повторное использование inspection-парадигмы (теги + фото + заметка + ЛКП) в нескольких шагах. Главные точки развития: убрать несогласованность state/UI в шагах 9-11, заменить моковые данные на реальные источники и вынести хранение из localStorage в серверный контур.
