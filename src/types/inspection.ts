export type InspectionSection = 
  | 'car-info' 
  | 'legal-check' 
  | 'body' 
  | 'interior' 
  | 'under-hood'
  | 'technical' 
  | 'electrical'
  | 'diagnostics' 
  | 'test-drive'
  | 'final-verdict';

export const SECTION_LABELS: Record<InspectionSection, string> = {
  'car-info': 'Автомобиль',
  'legal-check': 'Юридическая проверка',
  'body': 'Кузов',
  'interior': 'Салон',
  'under-hood': 'Под капотом',
  'technical': 'Техника',
  'electrical': 'Электрика',
  'diagnostics': 'Диагностика',
  'test-drive': 'Тест-драйв',
  'final-verdict': 'Итог',
};

export const BODY_PARTS = [
  'Общий вид', 'Капот', 'Крыло переднее левое', 'Крыло переднее правое',
  'Дверь передняя левая', 'Дверь передняя правая', 'Дверь задняя левая', 'Дверь задняя правая',
  'Крыло заднее левое', 'Крыло заднее правое', 'Крыша',
  'Стойка A левая', 'Стойка A правая', 'Стойка B левая', 'Стойка B правая',
  'Стойка C левая', 'Стойка C правая',
  'Крышка багажника', 'Передний бампер', 'Задний бампер',
  'Пороги', 'Колесные арки', 'Зазоры кузова', 'Следы ремонта', 'Следы ДТП',
] as const;

export const INTERIOR_PARTS = [
  'Общий вид салона', 'Сиденье водителя', 'Сиденье переднего пассажира',
  'Задний ряд сидений', 'Потолок', 'Ковры', 'Панель приборов', 'Руль',
  'Кнопки управления', 'Мультимедиа', 'Климат контроль', 'Обшивки дверей',
  'Багажник', 'Запах в салоне', 'Следы износа',
] as const;

export const UNDER_HOOD_PARTS = [
  'Общий вид подкапотного пространства', 'Двигатель', 'Подтеки масла',
  'Подтеки антифриза', 'Ремни', 'Патрубки', 'Крепления двигателя',
  'Аккумулятор', 'Следы ремонта', 'Следы демонтажа',
] as const;

export const TECHNICAL_PARTS = [
  'Коробка передач', 'Сцепление', 'Раздаточная коробка', 'Кардан',
  'Приводы', 'Передняя подвеска', 'Задняя подвеска', 'Амортизаторы',
  'Тормозные диски', 'Тормозные колодки', 'Рулевая рейка',
] as const;

export const ELECTRICAL_PARTS = [
  'Фары', 'Задние фонари', 'Поворотники', 'Стеклоподъемники',
  'Зеркала', 'Подогревы', 'Датчики', 'Работа электроники',
] as const;

export type BodyPart = typeof BODY_PARTS[number];

export type PartStatus = 'OK' | 'Перекрашено' | 'Шпаклёвка' | 'Замена' | 'Риск';

export const DEFAULT_DAMAGE_TAGS: string[] = ['OK', 'Перекрашено', 'Шпаклёвка', 'Замена', 'Риск'];

export type CheckStatus = 'OK' | 'Проблема' | 'Не проверено';

export type Verdict = 'Рекомендован' | 'Сомнительно' | 'Не рекомендован';

export type RiskLevel = 'Низкий' | 'Средний' | 'Высокий';

export interface MediaItem {
  id: string;
  section?: InspectionSection;
  carPart?: string;
  note?: string;
  damageTags?: string[];
  paintThicknessMin?: number;
  paintThicknessMax?: number;
  createdAt: string;
}

export interface BodyPartData {
  status?: PartStatus;
  paintThickness?: string;
  comment?: string;
}

export interface CarInfo {
  make?: string;
  model?: string;
  generation?: string;
  year?: string;
  vin?: string;
  licensePlate?: string;
  mileage?: string;
  engine?: string;
  transmission?: string;
  drivetrain?: string;
  trim?: string;
  ownerCount?: string;
  city?: string;
  inspectionDate?: string;
}

export interface LegalCheckItem {
  label: string;
  status: CheckStatus;
}

export interface DiagnosticItem {
  label: string;
  status: CheckStatus;
  comment?: string;
}

export interface FinalVerdictData {
  verdict?: Verdict;
  riskLevel?: RiskLevel;
  estimatedRepairCost?: string;
  finalComment?: string;
  pros?: string;
  cons?: string;
  recommendations?: string;
  overallRating?: string;
}

export interface CustomSection {
  id: string;
  name: string;
  icon: string;
  customTags: string[];
}

export interface Inspection {
  id: string;
  carInfo: CarInfo;
  media: MediaItem[];
  bodyParts: Record<string, BodyPartData>;
  bodyPaintThickness?: string;
  legalChecks: LegalCheckItem[];
  diagnostics: DiagnosticItem[];
  testDrive: DiagnosticItem[];
  finalVerdict: FinalVerdictData;
  
  createdAt: string;
}

export const AVAILABLE_ICONS = [
  'Camera', 'Car', 'Wrench', 'Shield', 'Layers', 'Eye', 'Zap', 'Star',
  'AlertTriangle', 'CheckCircle', 'Settings', 'Gauge', 'Thermometer',
  'Droplets', 'Wind', 'Battery', 'Lightbulb', 'Search', 'Tag', 'Box',
] as const;

export const SECTION_PARTS: Partial<Record<InspectionSection, readonly string[]>> = {
  'body': BODY_PARTS,
  'interior': INTERIOR_PARTS,
  'under-hood': UNDER_HOOD_PARTS,
  'technical': TECHNICAL_PARTS,
  'electrical': ELECTRICAL_PARTS,
};

export const createNewInspection = (): Inspection => ({
  id: crypto.randomUUID(),
  carInfo: { inspectionDate: new Date().toISOString().split('T')[0] },
  media: [],
  bodyParts: {},
  
  legalChecks: [
    { label: 'Проверка VIN', status: 'Не проверено' },
    { label: 'Совпадение VIN на кузове', status: 'Не проверено' },
    { label: 'Совпадение VIN в документах', status: 'Не проверено' },
    { label: 'Ограничения на регистрацию', status: 'Не проверено' },
    { label: 'Залог / кредит', status: 'Не проверено' },
    { label: 'История регистраций', status: 'Не проверено' },
    { label: 'Работа в такси', status: 'Не проверено' },
    { label: 'Лизинг', status: 'Не проверено' },
    { label: 'ДТП по базам', status: 'Не проверено' },
    { label: 'История страховых выплат', status: 'Не проверено' },
    { label: 'Пробег по базам', status: 'Не проверено' },
  ],
  diagnostics: [
    { label: 'OBD диагностика', status: 'Не проверено' },
    { label: 'Ошибки двигателя', status: 'Не проверено' },
    { label: 'Ошибки коробки передач', status: 'Не проверено' },
    { label: 'Ошибки ABS', status: 'Не проверено' },
    { label: 'Ошибки электроники', status: 'Не проверено' },
    { label: 'Пробег по электронным блокам', status: 'Не проверено' },
    { label: 'Работа систем безопасности', status: 'Не проверено' },
  ],
  testDrive: [
    { label: 'Запуск двигателя', status: 'Не проверено' },
    { label: 'Работа двигателя', status: 'Не проверено' },
    { label: 'Работа коробки передач', status: 'Не проверено' },
    { label: 'Работа подвески на ходу', status: 'Не проверено' },
    { label: 'Работа тормозов', status: 'Не проверено' },
    { label: 'Рулевое управление', status: 'Не проверено' },
    { label: 'Посторонние шумы', status: 'Не проверено' },
    { label: 'Вибрации', status: 'Не проверено' },
  ],
  finalVerdict: {},
  createdAt: new Date().toISOString(),
});
