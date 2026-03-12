// Per-element-type diagnostic tags for the Computer Diagnostics group

export type DiagTagGroup = readonly {
  title: string;
  severity: "serious" | "minor";
  tags: readonly { id: string; label: string; emoji: string }[];
}[];

const ENGINE_TAGS: DiagTagGroup = [
  {
    title: "Ошибки",
    severity: "serious",
    tags: [
      { id: "eng_err_general", label: "Ошибки двигателя", emoji: "•" },
      { id: "eng_err_misfire", label: "Пропуски зажигания", emoji: "•" },
      { id: "eng_err_sensor", label: "Ошибка датчика", emoji: "•" },
      { id: "eng_err_rough", label: "Неровная работа", emoji: "•" },
      { id: "eng_err_mixture", label: "Ошибка по смеси", emoji: "•" },
      { id: "eng_err_fuel_pressure", label: "Низкое давление топлива", emoji: "•" },
      { id: "eng_err_turbo", label: "Ошибка турбины", emoji: "•" },
      { id: "eng_err_overboost", label: "Передув", emoji: "•" },
      { id: "eng_err_underboost", label: "Недодув", emoji: "•" },
      { id: "eng_err_vvt", label: "Ошибка фаз", emoji: "•" },
      { id: "eng_err_timing", label: "Ошибка ГРМ", emoji: "•" },
    ],
  },
  {
    title: "Предупреждения",
    severity: "minor",
    tags: [
      { id: "eng_warn_general", label: "Предупреждение по двигателю", emoji: "•" },
      { id: "eng_warn_unstable", label: "Нестабильная работа", emoji: "•" },
      { id: "eng_warn_misfire", label: "Подозрение на пропуски", emoji: "•" },
      { id: "eng_warn_sensor", label: "Ошибка по датчику", emoji: "•" },
      { id: "eng_warn_fuel", label: "Требуется проверка топливной системы", emoji: "•" },
      { id: "eng_warn_boost", label: "Требуется проверка наддува", emoji: "•" },
      { id: "eng_warn_airleak", label: "Подозрение на подсос воздуха", emoji: "•" },
    ],
  },
];

const TRANSMISSION_TAGS: DiagTagGroup = [
  {
    title: "Ошибки",
    severity: "serious",
    tags: [
      { id: "trans_err_general", label: "Ошибки АКПП", emoji: "•" },
      { id: "trans_err_limp", label: "Аварийный режим АКПП", emoji: "•" },
      { id: "trans_err_slip", label: "Пробуксовка", emoji: "•" },
      { id: "trans_err_mechatronic", label: "Ошибка мехатроника", emoji: "•" },
      { id: "trans_err_clutch", label: "Ошибка сцепления", emoji: "•" },
      { id: "trans_err_dsg", label: "Ошибка DSG", emoji: "•" },
      { id: "trans_err_cvt", label: "Ошибка вариатора", emoji: "•" },
    ],
  },
  {
    title: "Предупреждения",
    severity: "minor",
    tags: [
      { id: "trans_warn_general", label: "Предупреждение по АКПП", emoji: "•" },
      { id: "trans_warn_check", label: "Требуется проверка АКПП", emoji: "•" },
      { id: "trans_warn_shift", label: "Есть замечания по переключениям", emoji: "•" },
      { id: "trans_warn_clutch", label: "Подозрение на износ сцепления", emoji: "•" },
      { id: "trans_warn_diag", label: "Рекомендована диагностика трансмиссии", emoji: "•" },
    ],
  },
];

const BRAKES_CHASSIS_TAGS: DiagTagGroup = [
  {
    title: "Ошибки",
    severity: "serious",
    tags: [
      { id: "brake_err_abs", label: "Ошибка ABS", emoji: "•" },
      { id: "brake_err_esp", label: "Ошибка ESP", emoji: "•" },
      { id: "brake_err_wheel_sensor", label: "Ошибка датчика колеса", emoji: "•" },
      { id: "brake_err_epb", label: "Ошибка EPB", emoji: "•" },
      { id: "brake_err_system", label: "Неисправность тормозной системы", emoji: "•" },
    ],
  },
  {
    title: "Предупреждения",
    severity: "minor",
    tags: [
      { id: "brake_warn_general", label: "Предупреждение ABS/ESP", emoji: "•" },
      { id: "brake_warn_sensor", label: "Требуется проверка датчика колеса", emoji: "•" },
      { id: "brake_warn_system", label: "Требуется проверка тормозной системы", emoji: "•" },
    ],
  },
];

const SAFETY_TAGS: DiagTagGroup = [
  {
    title: "Ошибки",
    severity: "serious",
    tags: [
      { id: "safe_err_srs", label: "Ошибка SRS", emoji: "•" },
      { id: "safe_err_airbag", label: "Ошибка Airbag", emoji: "•" },
      { id: "safe_err_airbag_fault", label: "Неисправность подушек безопасности", emoji: "•" },
      { id: "safe_err_pretensioner", label: "Ошибка преднатяжителей", emoji: "•" },
      { id: "safe_err_crash_sensor", label: "Ошибка датчика удара", emoji: "•" },
    ],
  },
  {
    title: "Предупреждения",
    severity: "minor",
    tags: [
      { id: "safe_warn_srs", label: "Предупреждение SRS", emoji: "•" },
      { id: "safe_warn_check", label: "Требуется проверка системы безопасности", emoji: "•" },
    ],
  },
];

const ELECTRIC_TAGS: DiagTagGroup = [
  {
    title: "Ошибки",
    severity: "serious",
    tags: [
      { id: "elec_err_general", label: "Ошибка электрики", emoji: "•" },
      { id: "elec_err_voltage", label: "Низкое напряжение", emoji: "•" },
      { id: "elec_err_alternator", label: "Ошибка генератора", emoji: "•" },
      { id: "elec_err_short", label: "Короткое замыкание", emoji: "•" },
      { id: "elec_err_open", label: "Обрыв цепи", emoji: "•" },
      { id: "elec_err_can", label: "Ошибка CAN", emoji: "•" },
      { id: "elec_err_comm", label: "Потеря связи", emoji: "•" },
      { id: "elec_err_ecu", label: "Ошибка блока управления", emoji: "•" },
    ],
  },
  {
    title: "Предупреждения",
    severity: "minor",
    tags: [
      { id: "elec_warn_general", label: "Предупреждение по электрике", emoji: "•" },
      { id: "elec_warn_power", label: "Нестабильное питание", emoji: "•" },
      { id: "elec_warn_battery", label: "Требуется проверка аккумулятора", emoji: "•" },
      { id: "elec_warn_alternator", label: "Требуется проверка генератора", emoji: "•" },
      { id: "elec_warn_comm", label: "Периодическая потеря связи", emoji: "•" },
    ],
  },
];

const ECOLOGY_TAGS: DiagTagGroup = [
  {
    title: "Ошибки",
    severity: "serious",
    tags: [
      { id: "eco_err_catalyst", label: "Ошибка катализатора", emoji: "•" },
      { id: "eco_err_lambda", label: "Ошибка лямбда-зонда", emoji: "•" },
      { id: "eco_err_egr", label: "Ошибка EGR", emoji: "•" },
      { id: "eco_err_dpf", label: "Ошибка DPF", emoji: "•" },
      { id: "eco_err_adblue", label: "Ошибка AdBlue", emoji: "•" },
    ],
  },
  {
    title: "Предупреждения",
    severity: "minor",
    tags: [
      { id: "eco_warn_general", label: "Предупреждение по экологии", emoji: "•" },
      { id: "eco_warn_catalyst", label: "Требуется проверка катализатора", emoji: "•" },
      { id: "eco_warn_lambda", label: "Требуется проверка лямбда-зонда", emoji: "•" },
      { id: "eco_warn_dpf", label: "Рекомендована проверка DPF", emoji: "•" },
    ],
  },
];

// Generic tags for element types without specific tags
const GENERIC_DIAG_TAGS: DiagTagGroup = [
  {
    title: "Ошибки",
    severity: "serious",
    tags: [
      { id: "gen_err_fault", label: "Ошибка системы", emoji: "•" },
      { id: "gen_err_malfunction", label: "Неисправность", emoji: "•" },
    ],
  },
  {
    title: "Предупреждения",
    severity: "minor",
    tags: [
      { id: "gen_warn_check", label: "Требуется проверка", emoji: "•" },
      { id: "gen_warn_attention", label: "Есть замечания", emoji: "•" },
    ],
  },
];

/** Maps diagnostic element type IDs to their specific tag groups */
export const DIAGNOSTICS_ELEMENT_TAG_GROUPS: Record<string, DiagTagGroup> = {
  diag_engine: ENGINE_TAGS,
  diag_transmission: TRANSMISSION_TAGS,
  diag_abs_esp: BRAKES_CHASSIS_TAGS,
  diag_srs_airbag: SAFETY_TAGS,
  diag_electric: ELECTRIC_TAGS,
  diag_ecology: ECOLOGY_TAGS,
  diag_body_comfort: GENERIC_DIAG_TAGS,
  diag_steering_suspension: GENERIC_DIAG_TAGS,
  diag_awd: GENERIC_DIAG_TAGS,
  diag_climate: GENERIC_DIAG_TAGS,
  diag_immobilizer: GENERIC_DIAG_TAGS,
};
