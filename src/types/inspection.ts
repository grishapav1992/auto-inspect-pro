export type InspectionSection = 
  | 'car-info' 
  | 'legal-check' 
  | 'body' 
  | 'interior' 
  | 'technical' 
  | 'diagnostics' 
  | 'final-verdict';

export const SECTION_LABELS: Record<InspectionSection, string> = {
  'car-info': 'Информация об авто',
  'legal-check': 'Юридическая проверка',
  'body': 'Кузов',
  'interior': 'Салон',
  'technical': 'Техническая часть',
  'diagnostics': 'Диагностика',
  'final-verdict': 'Итоговый вердикт',
};

export const BODY_PARTS = [
  'Общий вид', 'Капот', 'Переднее левое крыло', 'Переднее правое крыло',
  'Передняя левая дверь', 'Передняя правая дверь', 'Задняя левая дверь', 'Задняя правая дверь',
  'Заднее левое крыло', 'Заднее правое крыло', 'Крыша', 'Багажник',
  'Передний бампер', 'Задний бампер',
] as const;

export type BodyPart = typeof BODY_PARTS[number];

export type PartStatus = 'OK' | 'Перекрашено' | 'Шпаклёвка' | 'Замена' | 'Риск';

export type CheckStatus = 'OK' | 'Проблема' | 'Не проверено';

export type Verdict = 'Рекомендован' | 'Сомнительно' | 'Не рекомендован';

export type RiskLevel = 'Низкий' | 'Средний' | 'Высокий';

export interface MediaItem {
  id: string;
  dataUrl: string;
  section?: InspectionSection;
  carPart?: string;
  note?: string;
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
  year?: string;
  vin?: string;
  licensePlate?: string;
  mileage?: string;
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
}

export interface Inspection {
  id: string;
  carInfo: CarInfo;
  media: MediaItem[];
  bodyParts: Record<string, BodyPartData>;
  legalChecks: LegalCheckItem[];
  diagnostics: DiagnosticItem[];
  finalVerdict: FinalVerdictData;
  createdAt: string;
}

export const createNewInspection = (): Inspection => ({
  id: crypto.randomUUID(),
  carInfo: { inspectionDate: new Date().toISOString().split('T')[0] },
  media: [],
  bodyParts: {},
  legalChecks: [
    { label: 'VIN verified', status: 'Not checked' },
    { label: 'Documents verified', status: 'Not checked' },
    { label: 'Restrictions', status: 'Not checked' },
    { label: 'Loan / pledge', status: 'Not checked' },
    { label: 'Taxi history', status: 'Not checked' },
  ],
  diagnostics: [
    { label: 'OBD scan', status: 'Not checked' },
    { label: 'Error codes', status: 'Not checked' },
    { label: 'Electronics', status: 'Not checked' },
    { label: 'Equipment', status: 'Not checked' },
  ],
  finalVerdict: {},
  createdAt: new Date().toISOString(),
});
