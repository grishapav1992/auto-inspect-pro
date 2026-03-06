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
  'General view', 'Hood', 'Front left fender', 'Front right fender',
  'Front left door', 'Front right door', 'Rear left door', 'Rear right door',
  'Rear left fender', 'Rear right fender', 'Roof', 'Trunk',
  'Front bumper', 'Rear bumper',
] as const;

export type BodyPart = typeof BODY_PARTS[number];

export type PartStatus = 'OK' | 'Repainted' | 'Body filler' | 'Replacement' | 'Risk';

export type CheckStatus = 'OK' | 'Issue' | 'Not checked';

export type Verdict = 'Recommended' | 'Questionable' | 'Not recommended';

export type RiskLevel = 'Low' | 'Medium' | 'High';

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
