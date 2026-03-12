/**
 * summaryGenerator.ts
 * 
 * Local summary generator — analyzes all report sections and produces
 * a structured verdict with per-section status and a 0-100 score.
 * Runs entirely client-side without any backend / AI calls.
 */

import type { PartInspection } from "@/types/inspection";
import {
  CAR_PARTS, DAMAGE_TAG_GROUPS, DAMAGE_TAGS,
  STRUCTURAL_PARTS, UNDERCARRIAGE_PARTS, STRUCTURAL_DAMAGE_TAG_GROUPS,
  GLASS_PARTS, GLASS_DAMAGE_TAGS,
  LIGHTING_PARTS, LIGHTING_DAMAGE_TAGS,
  INTERIOR_PARTS, INTERIOR_ALL_TAGS, INTERIOR_MAIN_TAG_GROUPS, INTERIOR_DASHBOARD_TAG_GROUPS,
  WHEELS_DAMAGE_TAGS,
  UNDERHOOD_DAMAGE_TAGS,
  DIAGNOSTICS_TAGS,
  ALL_TD_TAGS,
} from "@/types/inspection";
import { MEDIA_GROUP_ELEMENTS } from "@/components/SortableMediaGallery";

export interface SummaryResult {
  verdict: "recommended" | "with_reservations" | "not_recommended";
  verdictLabel: string;
  verdictEmoji: string;
  score: number; // 0-100
  sections: SummarySection[];
}

export interface MediaRef {
  mediaId: string;
  groupName: string;
  type: "image" | "video";
}

export interface SummaryDetail {
  label: string;
  value: string;
  severity?: "ok" | "serious" | "minor";
  mediaRefs?: MediaRef[];
}

export interface SummarySection {
  title: string;
  emoji: string;
  status: "ok" | "warn" | "bad";
  required: boolean;
  details: (string | SummaryDetail)[];
}

/** IDs of tags classified as "serious" from the body damage tag groups */
const SERIOUS_TAG_IDS: string[] = DAMAGE_TAG_GROUPS[0].tags.map((t) => t.id);

/** Helper: get all serious tag IDs from tag groups */
function getSeriousIds(tagGroups: readonly { severity?: string; tags: readonly { id: string }[] }[]): Set<string> {
  const ids = new Set<string>();
  for (const g of tagGroups) {
    if (g.severity === "serious") {
      for (const t of g.tags) ids.add(t.id);
    }
  }
  return ids;
}

/** Helper: find tag label+emoji from a flat tag array, with fallback to customTags */
function findTagLabel(tagId: string, allTags: readonly { id: string; label: string; emoji: string }[], customTags?: Record<string, { label: string; emoji: string }>): string {
  const t = allTags.find(dt => dt.id === tagId);
  if (t) return `${t.emoji} ${t.label}`;
  if (customTags && customTags[tagId]) {
    const ct = customTags[tagId];
    return `${ct.emoji} ${ct.label}`;
  }
  return tagId;
}

/** Build a map: groupName+elementType → MediaRef[] from flat mediaChildren */
function buildMediaIndex(children?: SummaryInput["mediaChildren"]): Map<string, MediaRef[]> {
  const index = new Map<string, MediaRef[]>();
  if (!children) return index;
  for (const c of children) {
    const key = c.elementType ? `${c.groupName}:${c.elementType}` : `${c.groupName}:__group__`;
    const arr = index.get(key) || [];
    arr.push({ mediaId: c.id, groupName: c.groupName, type: c.type });
    index.set(key, arr);
  }
  return index;
}

function getMediaRefs(index: Map<string, MediaRef[]>, groupName: string, elementId?: string): MediaRef[] | undefined {
  const refs = index.get(`${groupName}:${elementId ?? "__group__"}`);
  return refs && refs.length > 0 ? refs : undefined;
}

function getGroupMediaRefs(index: Map<string, MediaRef[]>, groupName: string): MediaRef[] | undefined {
  const refs: MediaRef[] = [];
  for (const [key, value] of index.entries()) {
    if (key.startsWith(`${groupName}:`)) refs.push(...value);
  }
  return refs.length > 0 ? refs : undefined;
}

/** Helper: append group-level note from mediaGroupInspections if present */
function appendGroupNote(
  details: (string | SummaryDetail)[],
  groupName: string,
  groupInspections: Record<string, PartInspection> | undefined,
  allTags: readonly { id: string; label: string; emoji: string }[] | undefined,
  mediaIndex: Map<string, MediaRef[]>,
  customTags?: Record<string, { label: string; emoji: string }>,
) {
  if (!groupInspections) return;
  const gi = groupInspections[groupName];
  if (!gi || gi.isDraft) return;
  const groupRefs = getGroupMediaRefs(mediaIndex, groupName);

  if (gi.tags.length > 0 && allTags) {
    const tagLabels = gi.tags.map(t => findTagLabel(t, allTags, customTags));
    details.push({
      label: "📋 Заметка группы",
      value: tagLabels.join(", "),
      severity: gi.noDamage ? "ok" : "minor",
      mediaRefs: groupRefs,
    });
  }

  if (gi.note) {
    details.push({ label: "📋 Группа", value: gi.note.slice(0, 80), mediaRefs: groupRefs });
  } else if (gi.audioRecordings && gi.audioRecordings.length > 0) {
    details.push({ label: "📋 Группа", value: `🎤 аудиозаметка (${gi.audioRecordings.length})`, mediaRefs: groupRefs });
  }
}

/** Helper: render per-element details for a group */
function renderElementDetails(
  elements: readonly { id: string; label: string }[],
  inspections: Record<string, PartInspection>,
  allTags: readonly { id: string; label: string; emoji: string }[],
  seriousIds: Set<string>,
  mediaIndex?: Map<string, MediaRef[]>,
  groupName?: string,
  customTags?: Record<string, { label: string; emoji: string }>,
): { details: (string | SummaryDetail)[]; seriousCount: number; minorCount: number } {
  const details: (string | SummaryDetail)[] = [];
  let seriousCount = 0;
  let minorCount = 0;

  for (const el of elements) {
    const ins = inspections[el.id];
    const refs = mediaIndex && groupName ? getMediaRefs(mediaIndex, groupName, el.id) : undefined;
    if (ins && ins.tags.length > 0 && !ins.noDamage) {
      const hasSerious = ins.tags.some(t => seriousIds.has(t));
      if (hasSerious) seriousCount++; else minorCount++;
      const tagLabels = ins.tags.map(t => findTagLabel(t, allTags, customTags));
      details.push({ label: el.label, value: tagLabels.join(", "), severity: hasSerious ? "serious" : "minor", mediaRefs: refs });
    } else {
      details.push({ label: el.label, value: "без повреждений", severity: "ok", mediaRefs: refs });
    }
  }

  return { details, seriousCount, minorCount };
}

/**
 * SummaryInput — all data fields from the report that feed into
 * the summary/verdict calculation.
 */
export interface SummaryInput {
  vin: string;
  vinUnreadable: boolean;
  plate: string;
  adLink: string;
  carBrand: string;
  carModel: string;
  carGeneration: string;
  mileage: string;
  mileageMatchesClaimed: boolean;
  // Параметры
  engineVolume: string;
  engineType: string;
  gearboxType: string;
  driveType: string;
  color: string;
  trim: string;
  ownersCount: string;
  inspectionCity: string;
  inspectionDate: string;
  // Кузов
  inspections: Record<string, PartInspection>;
  bodyGeometryOk: boolean;
  bodyNote: string;
  bodyPaintFrom: number;
  bodyPaintTo: number;
  bodyStructuralInspections: Record<string, PartInspection>;
  bodyUndercarriageInspections: Record<string, PartInspection>;
  structPaintFrom: number;
  structPaintTo: number;
  // Остекление
  glassInspections: Record<string, PartInspection>;
  glassNote: string;
  // Светотехника
  lightingInspections: Record<string, PartInspection>;
  // Подкапотное
  underhoodInspections: Record<string, PartInspection>;
  underhoodNote: string;
  // Салон
  interiorInspections: Record<string, PartInspection>;
  interiorNote: string;
  // Колёса
  wheelsInspections: Record<string, PartInspection>;
  wheelsNote: string;
  // Диагностика
  diagnosticsInspections: Record<string, PartInspection>;
  diagnosticNote: string;
  diagnosticFilesCount: number;
  // Флаги наличия фото по группам
  hasBodyPhotos: boolean;
  hasGlassPhotos: boolean;
  hasLightingPhotos: boolean;
  hasUnderhoodPhotos: boolean;
  hasInteriorPhotos: boolean;
  hasStructuralPhotos: boolean;
  hasWheelsPhotos: boolean;
  hasDiagnosticsPhotos: boolean;
  /** Lightweight media child references for linking details to media */
  mediaChildren?: { id: string; groupName: string; type: "image" | "video"; elementType?: string }[];
  /** Group-level inspections from media groups (groupName → PartInspection) */
  mediaGroupInspections?: Record<string, PartInspection>;
  /** Custom user tags map: tagId → {label, emoji} for resolving user-created tag labels */
  customTags?: Record<string, { label: string; emoji: string }>;
  // Документы
  docsOwnerMatch: boolean | null;
  docsVinMatch: boolean | null;
  docsEngineMatch: boolean | null;
  // Тест-драйв
  tdConducted: boolean | null;
  tdEngineOk: boolean;
  tdEngineTags: string[];
  tdGearboxOk: boolean;
  tdGearboxTags: string[];
  tdSteeringOk: boolean;
  tdSteeringTags: string[];
  tdRideOk: boolean;
  tdRideTags: string[];
  tdBrakeRideOk: boolean;
  tdBrakeRideTags: string[];
  tdNote: string;
  // Юр. проверка
  legalLoaded: boolean;
  legalSkipped: boolean;
}

/**
 * generateSummary — takes the full report data and returns a structured
 * verdict with score, per-section breakdown, and overall recommendation.
 * Penalty-based: starts at 100, deducts points for each issue found.
 */
export function generateSummary(input: SummaryInput): SummaryResult {
  let penalty = 0;
  const sections: SummarySection[] = [];
  const mediaIndex = buildMediaIndex(input.mediaChildren);

  // --- Section 1: Автомобиль ---
  {
    const details: (string | SummaryDetail)[] = [];
    if (input.carBrand || input.carModel) {
      const carName = [input.carBrand, input.carModel, input.carGeneration].filter(Boolean).join(" ");
      details.push({ label: "Марка / модель", value: carName, severity: "ok" });
    }
    if (input.vin) details.push({ label: "VIN", value: input.vin, severity: "ok" });
    else if (input.vinUnreadable) details.push({ label: "VIN", value: "нечитаемый", severity: "minor" });
    else details.push({ label: "VIN", value: "не указан", severity: "minor" });
    if (input.plate) details.push({ label: "Госномер", value: input.plate, severity: "ok" });
    if (input.adLink) details.push({ label: "Объявление", value: input.adLink, severity: "ok" });
    const status = input.vin && (input.carBrand || input.carModel) ? "ok" : "warn";
    sections.push({ title: "Автомобиль", emoji: "•", status, required: true, details });
  }

  // --- Section 2: Параметры ---
  {
    const details: (string | SummaryDetail)[] = [];
    if (input.mileage) {
      if (input.mileageMatchesClaimed) {
        details.push({ label: "Пробег", value: `${input.mileage} км — по внешнему состоянию не соответствует заявленному`, severity: "minor" });
        penalty += 8;
      } else {
        details.push({ label: "Пробег", value: `${input.mileage} км`, severity: "ok" });
      }
    } else details.push({ label: "Пробег", value: "не указан", severity: "minor" });
    if (input.engineVolume) details.push({ label: "Объём", value: input.engineVolume, severity: "ok" });
    if (input.engineType) details.push({ label: "Тип ДВС", value: input.engineType, severity: "ok" });
    if (input.gearboxType) details.push({ label: "КПП", value: input.gearboxType, severity: "ok" });
    if (input.driveType) details.push({ label: "Привод", value: input.driveType, severity: "ok" });
    if (input.color) details.push({ label: "Цвет", value: input.color, severity: "ok" });
    if (input.trim) details.push({ label: "Комплектация", value: input.trim, severity: "ok" });
    if (input.ownersCount) details.push({ label: "Владельцев", value: input.ownersCount, severity: "ok" });
    if (input.inspectionCity) details.push({ label: "Город", value: input.inspectionCity, severity: "ok" });
    if (input.inspectionDate) {
      const d = new Date(input.inspectionDate);
      if (!isNaN(d.getTime())) details.push({ label: "Дата", value: d.toLocaleDateString("ru-RU"), severity: "ok" });
    }
    if (details.length === 0) details.push({ label: "Параметры", value: "не заполнены", severity: "minor" });
    const hasMileage = !!input.mileage;
    const status = hasMileage && details.length > 3 ? "ok" : "warn";
    sections.push({ title: "Параметры", emoji: "•", status, required: true, details });
  }

  // --- Сверка документов ---
  {
    const allAnswered = input.docsOwnerMatch !== null && input.docsVinMatch !== null && input.docsEngineMatch !== null;
    const allMatch = input.docsOwnerMatch === true && input.docsVinMatch === true && input.docsEngineMatch === true;
    const details: (string | SummaryDetail)[] = [];
    if (!allAnswered) {
      details.push({ label: "Документы", value: "не проверены", severity: "minor" });
    } else {
      details.push({ label: "Владелец", value: input.docsOwnerMatch ? "совпадает" : "не совпадает", severity: input.docsOwnerMatch ? "ok" : "serious" });
      details.push({ label: "VIN", value: input.docsVinMatch ? "совпадает" : "не совпадает", severity: input.docsVinMatch ? "ok" : "serious" });
      details.push({ label: "Модель двигателя", value: input.docsEngineMatch ? "совпадает" : "не совпадает", severity: input.docsEngineMatch ? "ok" : "serious" });
    }
    const status = allMatch ? "ok" : !allAnswered ? "warn" : "bad";
    if (!allMatch) penalty += !allAnswered ? 5 : 15;
    sections.push({ title: "Сверка документов", emoji: "•", status, required: true, details });
  }

  // --- Юр. проверка ---
  {
    const details: (string | SummaryDetail)[] = [];
    if (input.legalLoaded) details.push({ label: "Юр. проверка", value: "выполнена", severity: "ok" });
    else if (input.legalSkipped) details.push({ label: "Юр. проверка", value: "пропущена", severity: "minor" });
    else details.push({ label: "Юр. проверка", value: "не проверено", severity: "minor" });
    const status = input.legalLoaded ? "ok" : "warn";
    if (input.legalSkipped && !input.legalLoaded) penalty += 5;
    sections.push({ title: "Юр. проверка", emoji: "•", status, required: false, details });
  }

  // --- Кузов ---
  {
    const details: (string | SummaryDetail)[] = [];

    if (!input.hasBodyPhotos && Object.keys(input.inspections).length === 0) {
      details.push({ label: "Кузов", value: "не осмотрен", severity: "minor" });
      penalty += 10;
      sections.push({ title: "Кузов", emoji: "•", status: "warn", required: true, details });
    } else {
      const inspected = input.inspections;
      const seriousParts = Object.values(inspected).filter((p) => p.tags.some((t) => SERIOUS_TAG_IDS.includes(t)));
      const minorParts = Object.values(inspected).filter((p) => p.tags.length > 0 && !p.tags.some((t) => SERIOUS_TAG_IDS.includes(t)));

      for (const part of CAR_PARTS) {
        const ins = inspected[part.id];
        const refs = getMediaRefs(mediaIndex, "body", part.id);
        if (ins && ins.tags.length > 0) {
          const hasSerious = ins.tags.some((t) => SERIOUS_TAG_IDS.includes(t));
          const tagLabels = ins.tags.map(t => findTagLabel(t, DAMAGE_TAGS, input.customTags));
          details.push({ label: part.label, value: tagLabels.join(", "), severity: hasSerious ? "serious" : "minor", mediaRefs: refs });
        } else {
          details.push({ label: part.label, value: "без повреждений", severity: "ok", mediaRefs: refs });
        }
      }

      // Paint thickness range for body
      if (input.bodyPaintFrom !== 80 || input.bodyPaintTo !== 200 || Object.values(inspected).some(ins => ins.paintThickness)) {
        const spread = input.bodyPaintTo - input.bodyPaintFrom;
        const severity: "ok" | "minor" | "serious" = spread <= 50 ? "ok" : spread <= 150 ? "minor" : "serious";
        details.push({ label: "Разброс ЛКП", value: `${input.bodyPaintFrom}–${input.bodyPaintTo} мкм`, severity });
      }

      if (input.bodyNote) details.push({ label: "📝 Раздел", value: input.bodyNote.slice(0, 60), mediaRefs: getGroupMediaRefs(mediaIndex, "body") });
      appendGroupNote(details, "body", input.mediaGroupInspections, DAMAGE_TAGS, mediaIndex, input.customTags);
      penalty += seriousParts.length * 12 + minorParts.length * 4;
      const status = seriousParts.length > 0 ? "bad" : minorParts.length > 2 ? "warn" : "ok";
      sections.push({ title: "Кузов", emoji: "•", status, required: true, details });
    }
  }

  // --- Остекление ---
  {
    const details: (string | SummaryDetail)[] = [];

    if (!input.hasGlassPhotos && Object.keys(input.glassInspections).length === 0) {
      details.push({ label: "Остекление", value: "не осмотрено", severity: "minor" });
      penalty += 5;
      sections.push({ title: "Остекление", emoji: "•", status: "warn", required: true, details });
    } else {
      const glassInspected = input.glassInspections;
      const glassSeriousIds = new Set(
        GLASS_DAMAGE_TAGS.slice(0, 3).map(t => t.id as string)
      );

      let seriousCount = 0;
      let minorCount = 0;

      for (const part of GLASS_PARTS) {
        const ins = glassInspected[part.id];
        const refs = getMediaRefs(mediaIndex, "glass", part.id);
        if (ins && ins.tags.length > 0 && !ins.noDamage) {
          const hasSerious = ins.tags.some(t => glassSeriousIds.has(t));
          if (hasSerious) seriousCount++; else minorCount++;
          const tagLabels = ins.tags.map(t => findTagLabel(t, GLASS_DAMAGE_TAGS as readonly { id: string; label: string; emoji: string }[], input.customTags));
          details.push({ label: part.label, value: tagLabels.join(", "), severity: hasSerious ? "serious" : "minor", mediaRefs: refs });
        } else {
          details.push({ label: part.label, value: "без повреждений", severity: "ok", mediaRefs: refs });
        }
      }

      if (details.length === 0) {
        details.push({ label: "Остекление", value: "без повреждений", severity: "ok" });
      }

      if (input.glassNote) details.push({ label: "📝 Раздел", value: input.glassNote.slice(0, 60), mediaRefs: getGroupMediaRefs(mediaIndex, "glass") });
      appendGroupNote(details, "glass", input.mediaGroupInspections, GLASS_DAMAGE_TAGS as readonly { id: string; label: string; emoji: string }[], mediaIndex, input.customTags);

      penalty += seriousCount * 10 + minorCount * 5;
      const status = seriousCount > 0 ? "bad" : minorCount > 0 ? "warn" : "ok";
      sections.push({ title: "Остекление", emoji: "•", status, required: true, details });
    }
  }

  // --- Силовые элементы ---
  {
    const structInspected = Object.values(input.bodyStructuralInspections);
    const underInspected = Object.values(input.bodyUndercarriageInspections);
    const allInspected = [...structInspected, ...underInspected];
    const allInspections = { ...input.bodyStructuralInspections, ...input.bodyUndercarriageInspections };
    const details: (string | SummaryDetail)[] = [];

    if (!input.hasStructuralPhotos && allInspected.length === 0) {
      details.push({ label: "Силовые элементы кузова", value: "не осмотрены", severity: "minor" });
      penalty += 5;
      sections.push({ title: "Силовые элементы кузова", emoji: "•", status: "warn", required: false, details });
    } else {
      const elements = MEDIA_GROUP_ELEMENTS.structural;
      const allStructTags = [...DAMAGE_TAGS] as { id: string; label: string; emoji: string }[];
      for (const g of STRUCTURAL_DAMAGE_TAG_GROUPS) {
        for (const t of g.tags) {
          if (!allStructTags.find(at => at.id === t.id)) allStructTags.push(t as { id: string; label: string; emoji: string });
        }
      }
      const structSeriousIds = getSeriousIds(STRUCTURAL_DAMAGE_TAG_GROUPS as any);

      let seriousCount = 0;
      let minorCount = 0;

      for (const el of elements) {
        const ins = allInspections[el.id];
        const refs = getMediaRefs(mediaIndex, "structural", el.id);
        if (ins && ins.tags.length > 0 && !ins.noDamage) {
          const hasSerious = ins.tags.some(t => structSeriousIds.has(t));
          if (hasSerious) seriousCount++; else minorCount++;
          const tagLabels = ins.tags.map(t => findTagLabel(t, allStructTags, input.customTags));
          details.push({ label: el.label, value: tagLabels.join(", "), severity: hasSerious ? "serious" : "minor", mediaRefs: refs });
        } else {
          details.push({ label: el.label, value: "без повреждений", severity: "ok", mediaRefs: refs });
        }
      }

      if (input.structPaintFrom !== 80 || input.structPaintTo !== 200 || allInspected.some(ins => ins.paintThickness)) {
        const spread = input.structPaintTo - input.structPaintFrom;
        const severity: "ok" | "minor" | "serious" = spread <= 50 ? "ok" : spread <= 150 ? "minor" : "serious";
        details.push({ label: "Разброс ЛКП", value: `${input.structPaintFrom}–${input.structPaintTo} мкм`, severity });
      }

      if (details.length === 0) {
        details.push({ label: "Силовые элементы", value: "без повреждений", severity: "ok" });
      }
      appendGroupNote(details, "structural", input.mediaGroupInspections, [...DAMAGE_TAGS] as { id: string; label: string; emoji: string }[], mediaIndex, input.customTags);

      penalty += seriousCount * 10 + minorCount * 5;
      const status = seriousCount > 0 ? "bad" : minorCount > 0 ? "warn" : "ok";
      sections.push({ title: "Силовые элементы кузова", emoji: "•", status, required: false, details });
    }
  }

  {
    const inspections = input.lightingInspections;
    const hasData = Object.keys(inspections).length > 0;
    const details: (string | SummaryDetail)[] = [];

    if (!input.hasLightingPhotos && !hasData) {
      details.push({ label: "Светотехника", value: "не осмотрена", severity: "minor" });
      penalty += 5;
      sections.push({ title: "Светотехника", emoji: "•", status: "warn", required: false, details });
    } else {
      const elements = MEDIA_GROUP_ELEMENTS.lighting;
      const lightingSeriousIds = getSeriousIds([...DAMAGE_TAG_GROUPS] as any);
      // Use lighting-specific tags
      const allLightingTags = LIGHTING_DAMAGE_TAGS as readonly { id: string; label: string; emoji: string }[];
      const lightSeriousIds = new Set(allLightingTags.slice(0, 3).map(t => t.id)); // first 3 are serious

      let seriousCount = 0;
      let minorCount = 0;

      for (const el of elements) {
        const ins = inspections[el.id];
        const refs = getMediaRefs(mediaIndex, "lighting", el.id);
        if (ins && ins.tags.length > 0 && !ins.noDamage) {
          const hasSerious = ins.tags.some(t => lightSeriousIds.has(t));
          if (hasSerious) seriousCount++; else minorCount++;
          const tagLabels = ins.tags.map(t => findTagLabel(t, allLightingTags, input.customTags));
          details.push({ label: el.label, value: tagLabels.join(", "), severity: hasSerious ? "serious" : "minor", mediaRefs: refs });
        } else {
          details.push({ label: el.label, value: "без повреждений", severity: "ok", mediaRefs: refs });
        }
      }

      if (details.length === 0) {
        details.push({ label: "Светотехника", value: "без замечаний", severity: "ok" });
      }

      appendGroupNote(details, "lighting", input.mediaGroupInspections, LIGHTING_DAMAGE_TAGS as readonly { id: string; label: string; emoji: string }[], mediaIndex, input.customTags);
      penalty += seriousCount * 8 + minorCount * 4;
      const status = seriousCount > 0 ? "bad" : minorCount > 0 ? "warn" : "ok";
      sections.push({ title: "Светотехника", emoji: "•", status, required: false, details });
    }
  }

  // --- Подкапотное пространство ---
  {
    const inspections = input.underhoodInspections;
    const hasData = Object.keys(inspections).length > 0;
    const details: (string | SummaryDetail)[] = [];

    if (!input.hasUnderhoodPhotos && !hasData && !input.underhoodNote) {
      details.push({ label: "Подкапотное пространство", value: "не осмотрено", severity: "minor" });
      penalty += 5;
      sections.push({ title: "Подкапотное пространство", emoji: "•", status: "warn", required: true, details });
    } else {
      const elements = MEDIA_GROUP_ELEMENTS.underhood;
      const allUnderhoodTags = UNDERHOOD_DAMAGE_TAGS as readonly { id: string; label: string; emoji: string }[];
      const underhoodSeriousIds = new Set(allUnderhoodTags.slice(0, 3).map(t => t.id));

      let seriousCount = 0;
      let minorCount = 0;

      for (const el of elements) {
        const ins = inspections[el.id];
        const refs = getMediaRefs(mediaIndex, "underhood", el.id);
        if (ins && ins.tags.length > 0 && !ins.noDamage) {
          const hasSerious = ins.tags.some(t => underhoodSeriousIds.has(t));
          if (hasSerious) seriousCount++; else minorCount++;
          const tagLabels = ins.tags.map(t => findTagLabel(t, allUnderhoodTags, input.customTags));
          details.push({ label: el.label, value: tagLabels.join(", "), severity: hasSerious ? "serious" : "minor", mediaRefs: refs });
        } else {
          details.push({ label: el.label, value: "без замечаний", severity: "ok", mediaRefs: refs });
        }
      }

      if (details.length === 0) {
        details.push({ label: "Подкапотное", value: "без замечаний", severity: "ok" });
      }

      if (input.underhoodNote) details.push({ label: "📝 Раздел", value: input.underhoodNote.slice(0, 60), mediaRefs: getGroupMediaRefs(mediaIndex, "underhood") });
      appendGroupNote(details, "underhood", input.mediaGroupInspections, UNDERHOOD_DAMAGE_TAGS as readonly { id: string; label: string; emoji: string }[], mediaIndex, input.customTags);

      penalty += seriousCount * 8 + minorCount * 4;
      const status = seriousCount > 0 ? "bad" : minorCount > 0 ? "warn" : "ok";
      sections.push({ title: "Подкапотное пространство", emoji: "•", status, required: true, details });
    }
  }

  // --- Салон ---
  {
    const inspections = input.interiorInspections;
    const hasData = Object.keys(inspections).length > 0;
    const details: (string | SummaryDetail)[] = [];

    if (!input.hasInteriorPhotos && !hasData && !input.interiorNote) {
      details.push({ label: "Салон", value: "не осмотрен", severity: "minor" });
      penalty += 5;
      sections.push({ title: "Салон", emoji: "•", status: "warn", required: true, details });
    } else {
      const elements = MEDIA_GROUP_ELEMENTS.interior;
      const allInteriorTags = INTERIOR_ALL_TAGS as { id: string; label: string; emoji: string }[];
      const interiorSeriousIds = getSeriousIds([...INTERIOR_MAIN_TAG_GROUPS, ...INTERIOR_DASHBOARD_TAG_GROUPS]);

      let seriousCount = 0;
      let minorCount = 0;

      for (const el of elements) {
        const ins = inspections[el.id];
        const refs = getMediaRefs(mediaIndex, "interior", el.id);
        if (ins && ins.tags.length > 0 && !ins.noDamage) {
          const hasSerious = ins.tags.some(t => interiorSeriousIds.has(t as string));
          if (hasSerious) seriousCount++; else minorCount++;
          const tagLabels = ins.tags.map(t => findTagLabel(t, allInteriorTags, input.customTags));
          details.push({ label: el.label, value: tagLabels.join(", "), severity: hasSerious ? "serious" : "minor", mediaRefs: refs });
        } else {
          details.push({ label: el.label, value: "без повреждений", severity: "ok", mediaRefs: refs });
        }
      }

      if (details.length === 0) {
        details.push({ label: "Салон", value: "без повреждений", severity: "ok" });
      }

      if (input.interiorNote) details.push({ label: "📝 Раздел", value: input.interiorNote.slice(0, 60), mediaRefs: getGroupMediaRefs(mediaIndex, "interior") });
      appendGroupNote(details, "interior", input.mediaGroupInspections, INTERIOR_ALL_TAGS as { id: string; label: string; emoji: string }[], mediaIndex, input.customTags);

      penalty += seriousCount * 6 + minorCount * 3;
      const status = seriousCount > 0 ? "bad" : minorCount > 2 ? "warn" : "ok";
      sections.push({ title: "Салон", emoji: "•", status, required: true, details });
    }
  }

  // --- Компьютерная диагностика ---
  {
    const inspections = input.diagnosticsInspections;
    const hasData = Object.keys(inspections).length > 0;
    const details: (string | SummaryDetail)[] = [];

    if (!input.hasDiagnosticsPhotos && !hasData && !input.diagnosticNote) {
      details.push({ label: "Компьютерная диагностика", value: "не проводилась", severity: "minor" });
      penalty += 5;
      sections.push({ title: "Компьютерная диагностика", emoji: "•", status: "warn", required: false, details });
    } else {
      const elements = MEDIA_GROUP_ELEMENTS.diagnostics;
      const allDiagTags = DIAGNOSTICS_TAGS as readonly { id: string; label: string; emoji: string }[];
      const diagSeriousIds = new Set(allDiagTags.slice(0, 7).map(t => t.id)); // first group = errors

      let seriousCount = 0;
      let minorCount = 0;

      for (const el of elements) {
        const ins = inspections[el.id];
        const refs = getMediaRefs(mediaIndex, "diagnostics", el.id);
        if (ins && ins.tags.length > 0 && !ins.noDamage) {
          const hasSerious = ins.tags.some(t => diagSeriousIds.has(t));
          if (hasSerious) seriousCount++; else minorCount++;
          const tagLabels = ins.tags.map(t => findTagLabel(t, allDiagTags, input.customTags));
          details.push({ label: el.label, value: tagLabels.join(", "), severity: hasSerious ? "serious" : "minor", mediaRefs: refs });
        } else {
          details.push({ label: el.label, value: "без ошибок", severity: "ok", mediaRefs: refs });
        }
      }

      if (input.diagnosticFilesCount > 0) {
        details.push({ label: "Файлы диагностики", value: `${input.diagnosticFilesCount}`, severity: "ok" });
      }

      if (details.length === 0) {
        details.push({ label: "Диагностика", value: "без ошибок", severity: "ok" });
      }

      if (input.diagnosticNote) details.push({ label: "📝 Раздел", value: input.diagnosticNote.slice(0, 80), mediaRefs: getGroupMediaRefs(mediaIndex, "diagnostics") });
      appendGroupNote(details, "diagnostics", input.mediaGroupInspections, DIAGNOSTICS_TAGS as readonly { id: string; label: string; emoji: string }[], mediaIndex, input.customTags);

      penalty += seriousCount * 8 + minorCount * 4;
      const status = seriousCount > 0 ? "bad" : minorCount > 0 ? "warn" : "ok";
      sections.push({ title: "Компьютерная диагностика", emoji: "•", status, required: false, details });
    }
  }

  // --- Колёса и тормозные механизмы ---
  {
    const inspections = input.wheelsInspections;
    const hasData = Object.keys(inspections).length > 0;
    const details: (string | SummaryDetail)[] = [];

    if (!input.hasWheelsPhotos && !hasData && !input.wheelsNote) {
      details.push({ label: "Колёса и тормозные механизмы", value: "не осмотрены", severity: "minor" });
      penalty += 5;
      sections.push({ title: "Колёса и тормозные механизмы", emoji: "•", status: "warn", required: false, details });
    } else {
      const elements = MEDIA_GROUP_ELEMENTS.wheels;
      const allWheelsTags = WHEELS_DAMAGE_TAGS as readonly { id: string; label: string; emoji: string }[];
      const wheelsSeriousIds = new Set(allWheelsTags.slice(0, 3).map(t => t.id));

      let seriousCount = 0;
      let minorCount = 0;

      for (const el of elements) {
        const ins = inspections[el.id];
        const refs = getMediaRefs(mediaIndex, "wheels", el.id);
        if (ins && ins.tags.length > 0 && !ins.noDamage) {
          const hasSerious = ins.tags.some(t => wheelsSeriousIds.has(t));
          if (hasSerious) seriousCount++; else minorCount++;
          const tagLabels = ins.tags.map(t => findTagLabel(t, allWheelsTags, input.customTags));
          details.push({ label: el.label, value: tagLabels.join(", "), severity: hasSerious ? "serious" : "minor", mediaRefs: refs });
        } else {
          details.push({ label: el.label, value: "в порядке", severity: "ok", mediaRefs: refs });
        }
      }

      if (details.length === 0) {
        details.push({ label: "Колёса", value: "без замечаний", severity: "ok" });
      }

      if (input.wheelsNote) details.push({ label: "📝 Раздел", value: input.wheelsNote.slice(0, 60), mediaRefs: getGroupMediaRefs(mediaIndex, "wheels") });
      appendGroupNote(details, "wheels", input.mediaGroupInspections, WHEELS_DAMAGE_TAGS as readonly { id: string; label: string; emoji: string }[], mediaIndex, input.customTags);

      penalty += seriousCount * 8 + minorCount * 5;
      const status = seriousCount > 0 ? "bad" : minorCount > 0 ? "warn" : "ok";
      sections.push({ title: "Колёса и тормозные механизмы", emoji: "🛞", status, required: false, details });
    }
  }

  // --- Тест-драйв ---
  {
    const details: (string | SummaryDetail)[] = [];
    if (input.tdConducted === false) {
      details.push({ label: "Тест-драйв", value: "не проводился", severity: "minor" });
      if (input.tdNote) details.push(`${input.tdNote.slice(0, 60)}`);
      sections.push({ title: "Тест-драйв", emoji: "🏁", status: "ok", required: true, details });
    } else {
      const tdSections: { label: string; ok: boolean; tags: string[] }[] = [
        { label: "ДВС на ходу", ok: input.tdEngineOk, tags: input.tdEngineTags },
        { label: "КПП", ok: input.tdGearboxOk, tags: input.tdGearboxTags },
        { label: "Рулевое", ok: input.tdSteeringOk, tags: input.tdSteeringTags },
        { label: "Ходовая", ok: input.tdRideOk, tags: input.tdRideTags },
        { label: "Тормоза на ходу", ok: input.tdBrakeRideOk, tags: input.tdBrakeRideTags },
      ];
      let totalDefects = 0;
      for (const sec of tdSections) {
        if (sec.ok && sec.tags.length === 0) {
          details.push({ label: sec.label, value: "норма", severity: "ok" });
        } else if (sec.tags.length > 0) {
          totalDefects += sec.tags.length;
          const tagLabels = sec.tags.map(t => findTagLabel(t, ALL_TD_TAGS as readonly { id: string; label: string; emoji: string }[], input.customTags));
          details.push({ label: sec.label, value: tagLabels.join(", "), severity: "serious" });
        }
      }
      if (input.tdNote) details.push(`${input.tdNote.slice(0, 60)}`);
      if (details.length === 0) details.push({ label: "Тест-драйв", value: "не заполнено", severity: "minor" });
      penalty += totalDefects * 6;
      const allOk = tdSections.every(s => s.ok && s.tags.length === 0);
      const status = allOk ? "ok" : totalDefects > 3 ? "bad" : "warn";
      sections.push({ title: "Тест-драйв", emoji: "🏁", status, required: true, details });
    }
  }

  // --- Score & verdict calculation ---
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const verdict: SummaryResult["verdict"] = score >= 70 ? "recommended" : score >= 40 ? "with_reservations" : "not_recommended";
  const verdictLabel = verdict === "recommended" ? "Рекомендуется к покупке" : verdict === "with_reservations" ? "С оговорками" : "Не рекомендуется";
  const verdictEmoji = verdict === "recommended" ? "✅" : verdict === "with_reservations" ? "⚠️" : "🚫";

  return { verdict, verdictLabel, verdictEmoji, score, sections };
}
