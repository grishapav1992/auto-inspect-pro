export const DAMAGE_TAG_GROUPS = [
  {
    title: "Серьёзные",
    tags: [
      { id: "full_repaint", label: "Полный окрас", emoji: "•" },
      { id: "major_repaint", label: "Окрас большей части", emoji: "•" },
      { id: "deep_deformation", label: "Глубокая деформация", emoji: "•" },
      { id: "heavy_putty", label: "Шпатлёвка от 400мкм", emoji: "•" },
      { id: "scratch_over_10cm", label: "Царапина от 10см", emoji: "•" },
      { id: "replaced", label: "Замена элемента", emoji: "•" },
    ],
  },
  {
    title: "Незначительные",
    tags: [
      { id: "scratch_5cm", label: "Царапина до 5 см", emoji: "•" },
      { id: "scratch_10cm", label: "Царапина до 10 см", emoji: "•" },
      { id: "light_putty", label: "Шпатлёвка до 400мкм", emoji: "•" },
      { id: "partial_repaint", label: "Частичный окрас 1/4", emoji: "•" },
      { id: "dent_no_damage", label: "Вмятина без повр. ЛКП", emoji: "•" },
      { id: "chip", label: "Скол", emoji: "•" },
    ],
  },
] as const;

export const DAMAGE_TAGS = DAMAGE_TAG_GROUPS.flatMap((g) => [...g.tags]);

type SeriousTags = (typeof DAMAGE_TAG_GROUPS)[0]["tags"][number]["id"];
type MinorTags = (typeof DAMAGE_TAG_GROUPS)[1]["tags"][number]["id"];
export type DamageTagId = SeriousTags | MinorTags;

export const GLASS_DAMAGE_TAG_GROUPS = [
  {
    title: "Серьёзные",
    severity: "serious" as const,
    tags: [
      { id: "glass_crack", label: "Трещина", emoji: "•" },
      { id: "glass_replaced", label: "Замена (не оригинал)", emoji: "•" },
      { id: "glass_delamination", label: "Расслоение", emoji: "•" },
    ],
  },
  {
    title: "Незначительные",
    severity: "minor" as const,
    tags: [
      { id: "glass_chip", label: "Скол", emoji: "•" },
      { id: "glass_scratch", label: "Царапина", emoji: "•" },
      { id: "glass_tint", label: "Тонировка", emoji: "•" },
      { id: "glass_seal_damage", label: "Повреждение уплотнителя", emoji: "•" },
      { id: "glass_moisture", label: "Запотевание / влага", emoji: "•" },
    ],
  },
] as const;

export const GLASS_DAMAGE_TAGS = GLASS_DAMAGE_TAG_GROUPS.flatMap(g => [...g.tags]);

export const STRUCTURAL_DAMAGE_TAG_GROUPS = [
  {
    title: "Серьёзные",
    severity: "serious" as const,
    tags: [
      { id: "struct_deformation", label: "Деформация", emoji: "•" },
      { id: "struct_crack", label: "Трещина", emoji: "•" },
      { id: "struct_corrosion", label: "Коррозия", emoji: "•" },
      { id: "struct_replaced", label: "Замена элемента", emoji: "•" },
    ],
  },
  {
    title: "Незначительные",
    severity: "minor" as const,
    tags: [
      { id: "struct_weld", label: "Следы сварки", emoji: "•" },
      { id: "struct_sealer", label: "Нештатный герметик", emoji: "•" },
      { id: "struct_paint", label: "Подкрас / шпатлёвка", emoji: "•" },
    ],
  },
] as const;

export const STRUCTURAL_DAMAGE_TAGS = STRUCTURAL_DAMAGE_TAG_GROUPS.flatMap(g => [...g.tags]);

export const UNDERHOOD_DAMAGE_TAG_GROUPS = [
  {
    title: "Серьёзные",
    severity: "serious" as const,
    tags: [
      { id: "uh_leak", label: "Течь / подтёк", emoji: "•" },
      { id: "uh_damage", label: "Механическое повреждение", emoji: "•" },
      { id: "uh_non_original", label: "Не оригинал", emoji: "•" },
    ],
  },
  {
    title: "Незначительные",
    severity: "minor" as const,
    tags: [
      { id: "uh_corrosion", label: "Коррозия", emoji: "•" },
      { id: "uh_dirty", label: "Сильное загрязнение", emoji: "•" },
      { id: "uh_wiring", label: "Нештатная проводка", emoji: "•" },
    ],
  },
] as const;

export const UNDERHOOD_DAMAGE_TAGS = UNDERHOOD_DAMAGE_TAG_GROUPS.flatMap(g => [...g.tags]);

export const WHEELS_DAMAGE_TAG_GROUPS = [
  {
    title: "Серьёзные",
    severity: "serious" as const,
    tags: [
      { id: "wh_tire_damage", label: "Повреждение шины", emoji: "•" },
      { id: "wh_rim_damage", label: "Повреждение диска", emoji: "•" },
      { id: "wh_bearing", label: "Люфт ступицы", emoji: "•" },
    ],
  },
  {
    title: "Незначительные",
    severity: "minor" as const,
    tags: [
      { id: "wh_tire_wear", label: "Неравномерный износ", emoji: "•" },
      { id: "wh_rim_corrosion", label: "Коррозия диска", emoji: "•" },
      { id: "wh_brake_wear", label: "Износ тормозов", emoji: "•" },
      { id: "wh_brake_squeal", label: "Скрип / биение", emoji: "•" },
    ],
  },
] as const;

export const WHEELS_DAMAGE_TAGS = WHEELS_DAMAGE_TAG_GROUPS.flatMap(g => [...g.tags]);

export const LIGHTING_DAMAGE_TAG_GROUPS = [
  {
    title: "Серьёзные",
    severity: "serious" as const,
    tags: [
      { id: "light_not_working", label: "Не работает", emoji: "•" },
      { id: "light_crack", label: "Трещина / разрушение", emoji: "•" },
      { id: "light_non_original", label: "Не оригинал", emoji: "•" },
    ],
  },
  {
    title: "Незначительные",
    severity: "minor" as const,
    tags: [
      { id: "light_foggy", label: "Помутнение", emoji: "•" },
      { id: "light_moisture", label: "Запотевание / влага", emoji: "•" },
      { id: "light_scratch", label: "Царапина", emoji: "•" },
      { id: "light_chip", label: "Скол", emoji: "•" },
    ],
  },
] as const;

export const LIGHTING_DAMAGE_TAGS = LIGHTING_DAMAGE_TAG_GROUPS.flatMap(g => [...g.tags]);

export const LIGHTING_PARTS: { id: string; label: string }[] = [
  { id: "headlights_front", label: "Передние фары" },
  { id: "taillights_rear", label: "Задние фонари" },
  { id: "drl", label: "ДХО" },
  { id: "fog_lights", label: "Противотуманки" },
  { id: "turn_signals", label: "Поворотники" },
  { id: "brake_lights", label: "Стоп-сигналы" },
  { id: "plate_light", label: "Подсветка номера" },
];

export const LIGHTING_STRATEGY: InspectionStrategy = {
  key: "lighting",
  noDamage: true,
  tags: true,
  customTagGroups: LIGHTING_DAMAGE_TAG_GROUPS,
  paintThickness: false,
  note: true,
  photos: false,
};

/** Interior main tag groups — for seats, door cards, headliner, trunk, steering wheel */
export const INTERIOR_MAIN_TAG_GROUPS = [
  {
    title: "Серьёзные",
    severity: "serious" as const,
    tags: [
      { id: "int_tear", label: "Разрыв обивки", emoji: "•" },
      { id: "int_burn", label: "Прожог", emoji: "•" },
      { id: "int_crack", label: "Трещина элемента", emoji: "•" },
      { id: "int_broken", label: "Сломанный элемент", emoji: "•" },
      { id: "int_malfunction", label: "Не работает функция", emoji: "•" },
    ],
  },
  {
    title: "Незначительные",
    severity: "minor" as const,
    tags: [
      { id: "int_wear", label: "Износ", emoji: "•" },
      { id: "int_scuff", label: "Потёртость", emoji: "•" },
      { id: "int_scratch", label: "Царапины", emoji: "•" },
      { id: "int_stain", label: "Пятна", emoji: "•" },
      { id: "int_trim_damage", label: "Повреждение обшивки", emoji: "•" },
      { id: "int_odor", label: "Посторонний запах", emoji: "•" },
    ],
  },
] as const;

export const INTERIOR_MAIN_TAGS = INTERIOR_MAIN_TAG_GROUPS.flatMap(g => [...g.tags]);

/** Interior dashboard tag groups — for dashboard, instrument cluster, displays, climate, console, gear selector, buttons */
export const INTERIOR_DASHBOARD_TAG_GROUPS = [
  {
    title: "Серьёзные",
    severity: "serious" as const,
    tags: [
      { id: "dash_crack", label: "Трещина панели", emoji: "•" },
      { id: "dash_screen_dead", label: "Экран не работает", emoji: "•" },
      { id: "dash_cluster_fault", label: "Приборная панель неисправна", emoji: "•" },
      { id: "dash_climate_fault", label: "Блок климата неисправен", emoji: "•" },
      { id: "dash_buttons_dead", label: "Кнопки не работают", emoji: "•" },
      { id: "dash_aftermarket", label: "Нештатная установка", emoji: "•" },
    ],
  },
  {
    title: "Незначительные",
    severity: "minor" as const,
    tags: [
      { id: "dash_scratch", label: "Царапины", emoji: "•" },
      { id: "dash_scuff", label: "Потёртость", emoji: "•" },
      { id: "dash_pixel", label: "Битые пиксели / засветы", emoji: "•" },
      { id: "dash_backlight", label: "Неисправна подсветка", emoji: "•" },
      { id: "dash_disassembly", label: "Следы разбора", emoji: "•" },
      { id: "dash_icons_worn", label: "Стёрты пиктограммы", emoji: "•" },
    ],
  },
] as const;

export const INTERIOR_DASHBOARD_TAGS = INTERIOR_DASHBOARD_TAG_GROUPS.flatMap(g => [...g.tags]);

/** All interior tags combined (for summary/display lookups) */
export const INTERIOR_ALL_TAGS = [...INTERIOR_MAIN_TAGS, ...INTERIOR_DASHBOARD_TAGS];

// Legacy aliases for backward compatibility
export const INTERIOR_DAMAGE_TAG_GROUPS = INTERIOR_MAIN_TAG_GROUPS;
export const INTERIOR_DAMAGE_TAGS = INTERIOR_MAIN_TAGS;
export const INTERIOR_FUNCTION_TAG_GROUPS = INTERIOR_DASHBOARD_TAG_GROUPS;
export const INTERIOR_FUNCTION_TAGS = INTERIOR_DASHBOARD_TAGS;

/** Dashboard element IDs — elements that use interior_dashboard tags */
const DASHBOARD_ELEMENT_IDS = new Set([
  "dashboard_top", "instrument_cluster", "center_display",
  "climate_panel", "center_console", "gear_selector_area", "dashboard_buttons_left",
]);

/** Maps interior element type IDs to their tag section */
export const INTERIOR_ELEMENT_TAG_GROUPS: Record<string, typeof INTERIOR_MAIN_TAG_GROUPS | typeof INTERIOR_DASHBOARD_TAG_GROUPS> = (() => {
  const map: Record<string, any> = {};
  // Main elements
  for (const id of ["front_seats", "rear_seats", "door_cards", "headliner", "trunk_interior", "steering_wheel"]) {
    map[id] = INTERIOR_MAIN_TAG_GROUPS;
  }
  // Dashboard elements
  for (const id of DASHBOARD_ELEMENT_IDS) {
    map[id] = INTERIOR_DASHBOARD_TAG_GROUPS;
  }
  return map;
})();

export const DIAGNOSTICS_TAG_GROUPS = [
  {
    title: "Ошибки",
    severity: "serious" as const,
    tags: [
      { id: "diag_engine_error", label: "Ошибка двигателя", emoji: "•" },
      { id: "diag_transmission_error", label: "Ошибка АКПП/КПП", emoji: "•" },
      { id: "diag_airbag_error", label: "Ошибка подушек безопасности", emoji: "•" },
      { id: "diag_abs_error", label: "Ошибка ABS/ESP", emoji: "•" },
      { id: "diag_electric_error", label: "Ошибка электрики", emoji: "•" },
      { id: "diag_emission_error", label: "Ошибка экологии/катализатора", emoji: "•" },
      { id: "diag_body_error", label: "Ошибка кузовных систем", emoji: "•" },
    ],
  },
  {
    title: "Предупреждения",
    severity: "minor" as const,
    tags: [
      { id: "diag_frozen_error", label: "Замороженная ошибка", emoji: "•" },
      { id: "diag_warning_engine", label: "Предупреждение двигателя", emoji: "•" },
      { id: "diag_warning_transmission", label: "Предупреждение АКПП/КПП", emoji: "•" },
      { id: "diag_warning_abs", label: "Предупреждение ABS/ESP", emoji: "•" },
      { id: "diag_warning_electric", label: "Предупреждение электрики", emoji: "•" },
      { id: "diag_warning_body", label: "Предупреждение кузовных систем", emoji: "•" },
    ],
  },
] as const;

export const DIAGNOSTICS_TAGS = DIAGNOSTICS_TAG_GROUPS.flatMap(g => [...g.tags]);

export const INTERIOR_PARTS: { id: string; label: string }[] = [
  // Салон (interior_main)
  { id: "front_seats", label: "Передние сиденья" },
  { id: "rear_seats", label: "Задние сиденья" },
  { id: "door_cards", label: "Дверные карты" },
  { id: "headliner", label: "Потолок" },
  { id: "trunk_interior", label: "Багажное отделение" },
  { id: "steering_wheel", label: "Рулевое колесо" },
  // Панель приборов (interior_dashboard)
  { id: "dashboard_top", label: "Торпедо" },
  { id: "instrument_cluster", label: "Комбинация приборов" },
  { id: "center_display", label: "Центральный экран" },
  { id: "climate_panel", label: "Блок климата" },
  { id: "center_console", label: "Центральная консоль" },
  { id: "gear_selector_area", label: "Зона селектора КПП" },
  { id: "dashboard_buttons_left", label: "Кнопки слева от руля" },
];

export interface InspectionStrategy {
  /** Unique key for storing user custom tags */
  key: string;
  /** Show "Без повреждений" toggle */
  noDamage: boolean;
  /** Custom label for "Без повреждений" toggle */
  noDamageLabel?: string;
  /** Show damage tags section — uses custom tags if provided, otherwise DAMAGE_TAG_GROUPS */
  tags: boolean;
  /** Custom tag groups to use instead of DAMAGE_TAG_GROUPS */
  customTagGroups?: readonly { title: string; severity?: "serious" | "minor"; tags: readonly { id: string; label: string; emoji: string }[] }[];
  /** Per-element-type tag groups — overrides customTagGroups when element type is selected */
  elementTagGroups?: Record<string, readonly { title: string; severity?: "serious" | "minor"; tags: readonly { id: string; label: string; emoji: string }[] }[]>;
  /** Show paint thickness slider */
  paintThickness: boolean;
  /** Show note textarea */
  note: boolean;
  /** Show photos section */
  photos: boolean;
  /** Element type options for the selector */
  elementTypes?: readonly { id: string; label: string }[];
}

export const BODY_PARTS_STRATEGY: InspectionStrategy = {
  key: "body_parts",
  noDamage: true,
  tags: true,
  paintThickness: true,
  note: true,
  photos: true,
};

export const GLASS_STRATEGY: InspectionStrategy = {
  key: "glass",
  noDamage: true,
  tags: true,
  customTagGroups: GLASS_DAMAGE_TAG_GROUPS,
  paintThickness: false,
  note: true,
  photos: true,
};

export const STRUCTURAL_STRATEGY: InspectionStrategy = {
  key: "structural",
  noDamage: true,
  tags: true,
  customTagGroups: STRUCTURAL_DAMAGE_TAG_GROUPS,
  paintThickness: true,
  note: true,
  photos: false,
};

export const UNDERHOOD_STRATEGY: InspectionStrategy = {
  key: "underhood",
  noDamage: true,
  tags: true,
  customTagGroups: UNDERHOOD_DAMAGE_TAG_GROUPS,
  paintThickness: false,
  note: true,
  photos: false,
};

export const WHEELS_STRATEGY: InspectionStrategy = {
  key: "wheels",
  noDamage: true,
  tags: true,
  customTagGroups: WHEELS_DAMAGE_TAG_GROUPS,
  paintThickness: false,
  note: true,
  photos: false,
};

export interface PartInspection {
  partId: string;
  label: string;
  noDamage: boolean;
  tags: DamageTagId[];
  micronValues: Record<string, number>;
  paintThickness?: { from: number; to: number };
  note: string;
  photos: string[];
  /** Photos grouped by damage tag */
  tagPhotos?: Record<string, string[]>;
  /** Selected element type within a group */
  elementType?: string;
  /** Audio recordings as data URLs */
  audioRecordings?: string[];
  /** Whether this inspection is a draft (not explicitly saved) */
  isDraft?: boolean;
}

export const STRUCTURAL_PARTS: { id: string; label: string }[] = [
  { id: "a_pillar_left", label: "Передняя стойка левая (A)" },
  { id: "a_pillar_right", label: "Передняя стойка правая (A)" },
  { id: "b_pillar_left", label: "Центральная стойка левая (B)" },
  { id: "b_pillar_right", label: "Центральная стойка правая (B)" },
  { id: "c_pillar_left", label: "Задняя стойка левая (C)" },
  { id: "c_pillar_right", label: "Задняя стойка правая (C)" },
];

export const UNDERCARRIAGE_PARTS: { id: string; label: string }[] = [
  { id: "rail_left", label: "Лонжерон левый" },
  { id: "rail_right", label: "Лонжерон правый" },
  { id: "sill_left", label: "Порог левый" },
  { id: "sill_right", label: "Порог правый" },
  { id: "fender_liner_left_front", label: "Брызговик левый передний" },
  { id: "fender_liner_right_front", label: "Брызговик правый передний" },
  { id: "fender_liner_left_rear", label: "Брызговик левый задний" },
  { id: "fender_liner_right_rear", label: "Брызговик правый задний" },
];

export const GLASS_PARTS: { id: string; label: string }[] = [
  { id: "windshield", label: "Лобовое стекло" },
  { id: "rear_glass", label: "Заднее стекло" },
  { id: "glass_front_left", label: "Переднее левое стекло" },
  { id: "glass_front_right", label: "Переднее правое стекло" },
  { id: "glass_rear_left", label: "Заднее левое стекло" },
  { id: "glass_rear_right", label: "Заднее правое стекло" },
  { id: "mirror_left", label: "Зеркало левое" },
  { id: "mirror_right", label: "Зеркало правое" },
];

export const CAR_PARTS: { id: string; label: string }[] = [
  { id: "hood", label: "Капот" },
  { id: "front_bumper", label: "Передний бампер" },
  { id: "roof", label: "Крыша" },
  { id: "trunk", label: "Багажник" },
  { id: "rear_bumper", label: "Задний бампер" },
  { id: "left_front_fender", label: "Левое переднее крыло" },
  { id: "left_front_door", label: "Левая передняя дверь" },
  { id: "left_rear_door", label: "Левая задняя дверь" },
  { id: "left_rear_fender", label: "Левое заднее крыло" },
  { id: "right_front_fender", label: "Правое переднее крыло" },
  { id: "right_front_door", label: "Правая передняя дверь" },
  { id: "right_rear_door", label: "Правая задняя дверь" },
  { id: "right_rear_fender", label: "Правое заднее крыло" },
];

// --- Test drive tags ---
export const TD_ENGINE_TAGS = [
  { id: "td_engine_vibration", label: "Вибрация двигателя", emoji: "•" },
  { id: "td_engine_knock", label: "Посторонний стук", emoji: "•" },
  { id: "td_engine_power_loss", label: "Потеря мощности", emoji: "•" },
  { id: "td_engine_misfire", label: "Пропуски зажигания", emoji: "•" },
  { id: "td_engine_smoke", label: "Дым из выхлопной", emoji: "•" },
  { id: "td_engine_overheat", label: "Перегрев", emoji: "•" },
  { id: "td_engine_idle", label: "Нестабильный холостой ход", emoji: "•" },
] as const;

export const TD_GEARBOX_TAGS = [
  { id: "td_gear_hard_shift", label: "Тугое переключение", emoji: "•" },
  { id: "td_gear_delay", label: "Задержка переключения", emoji: "•" },
  { id: "td_gear_kick", label: "Толчки / пинки", emoji: "•" },
  { id: "td_gear_slip", label: "Пробуксовка", emoji: "•" },
  { id: "td_gear_noise", label: "Посторонний шум КПП", emoji: "•" },
  { id: "td_gear_vibration", label: "Вибрация на ходу", emoji: "•" },
] as const;

export const TD_STEERING_TAGS = [
  { id: "td_steer_play", label: "Люфт руля", emoji: "•" },
  { id: "td_steer_pull", label: "Увод в сторону", emoji: "•" },
  { id: "td_steer_noise", label: "Шум при повороте", emoji: "•" },
  { id: "td_steer_heavy", label: "Тяжёлый руль", emoji: "•" },
  { id: "td_steer_vibration", label: "Вибрация руля", emoji: "•" },
] as const;

export const TD_RIDE_TAGS = [
  { id: "td_ride_knock", label: "Стук подвески на ходу", emoji: "•" },
  { id: "td_ride_sway", label: "Раскачка кузова", emoji: "•" },
  { id: "td_ride_drift", label: "Снос оси", emoji: "•" },
  { id: "td_ride_bounce", label: "Пробой подвески", emoji: "•" },
] as const;

export const TD_BRAKE_RIDE_TAGS = [
  { id: "td_brake_pull", label: "Увод при торможении", emoji: "•" },
  { id: "td_brake_vibration", label: "Вибрация при торможении", emoji: "•" },
  { id: "td_brake_long", label: "Длинный ход педали", emoji: "•" },
  { id: "td_brake_squeal", label: "Скрип тормозов", emoji: "•" },
  { id: "td_brake_abs", label: "Срабатывание ABS на ровной", emoji: "•" },
] as const;

export const ALL_TD_TAGS = [
  ...TD_ENGINE_TAGS, ...TD_GEARBOX_TAGS, ...TD_STEERING_TAGS, ...TD_RIDE_TAGS, ...TD_BRAKE_RIDE_TAGS,
] as const;
