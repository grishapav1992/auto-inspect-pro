/**
 * summaryNoteGenerator.ts
 *
 * Generates a structured summary note for the client based on inspection data.
 * Only includes issues, missing checks, and important notes — never "всё хорошо".
 * Leaves "Итог специалиста:" empty for manual input.
 */

import type { SummarySection, SummaryDetail, SummaryInput } from "./summaryGenerator";
import { generateSummary } from "./summaryGenerator";
import type { ReportDraft } from "./draftStorage";
import { STRUCTURAL_PARTS } from "@/types/inspection";
import { loadAllCustomTags } from "./customTagsLoader";

// ── helpers ──

type ExtractedItem = { label: string; value: string; severity: "serious" | "minor" };

function extractItems(
  details: (string | SummaryDetail)[],
  severities: ("serious" | "minor")[],
): ExtractedItem[] {
  return details
    .filter((d): d is SummaryDetail => typeof d !== "string" && !!d.severity && severities.includes(d.severity as any))
    .map(d => ({ label: d.label, value: d.value, severity: d.severity as "serious" | "minor" }));
}

function extractNotes(details: (string | SummaryDetail)[]): string[] {
  return details.flatMap((d) => {
    if (typeof d === "string") return [d];
    if (/^📝|^📋/.test(d.label)) return [`${d.label}: ${d.value}`];
    return [];
  });
}

function cleanValue(v: string): string {
  return v.replace(/^[^\w\u0400-\u04FF]*/, "").trim();
}

function lowerFirst(value: string): string {
  return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}

function lowerLabel(value: string): string {
  return lowerFirst(value.trim());
}

function stripKnownPrefixes(value: string): string {
  return value
    .replace(/^Заметка:\s*/i, "")
    .replace(/^по результатам осмотра:\s*/i, "")
    .trim();
}

function humanJoin(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} и ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} и ${items[items.length - 1]}`;
}

function isGenericPositiveValue(value: string): boolean {
  const normalized = cleanValue(value).toLowerCase();
  return [
    "без повреждений",
    "без замечаний",
    "в порядке",
    "без ошибок",
    "без дефектов",
    "норма",
  ].includes(normalized);
}

function isInspectionGapValue(value: string): boolean {
  const normalized = cleanValue(value).toLowerCase();
  return [
    "не осмотрен",
    "не осмотрена",
    "не осмотрено",
    "не осмотрены",
    "не проверены",
    "не проверено",
    "не проводилась",
    "не проводился",
  ].includes(normalized);
}

function isInformativeItem(item: ExtractedItem): boolean {
  if (isGenericPositiveValue(item.value) || isInspectionGapValue(item.value)) return false;
  if (item.label === "Разброс ЛКП" && item.severity !== "serious") return false;
  return true;
}

function normalizeNote(note: string): string {
  const cleaned = stripKnownPrefixes(cleanValue(note));
  if (!cleaned) return "";
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

function formatIssueItem(item: { label: string; value: string }): string {
  return `${lowerLabel(item.label)} — ${stripKnownPrefixes(cleanValue(item.value))}`;
}

function formatIssueList(items: { label: string; value: string }[], limit = 3): string {
  if (items.length === 0) return "";
  const formatted = items.slice(0, limit).map(i => `  ▸ ${formatIssueItem(i)}`);
  if (items.length > limit) formatted.push("  ▸ а также другие замечания");
  return "\n" + formatted.join("\n");
}

function hasGapDetail(section?: SummarySection, matcher?: RegExp): boolean {
  if (!section) return false;
  return section.details.some((detail) => {
    if (typeof detail !== "string") {
      const value = cleanValue(detail.value).toLowerCase();
      return matcher ? matcher.test(value) : isInspectionGapValue(value);
    }
    return false;
  });
}

function compactSectionItems(section?: SummarySection, severities: ("serious" | "minor")[] = ["serious", "minor"]): ExtractedItem[] {
  if (!section) return [];
  return extractItems(section.details, severities).filter(isInformativeItem);
}

function buildAttentionPhrase(sectionTitle: string, item: ExtractedItem): string {
  const label = lowerLabel(item.label);
  const value = stripKnownPrefixes(cleanValue(item.value)).toLowerCase();

  if (sectionTitle === "Сверка документов") {
    return "несоответствия по результатам сверки документов";
  }
  if (sectionTitle === "Компьютерная диагностика") {
    return `ошибки по блоку "${label}"`;
  }
  if (sectionTitle === "Тест-драйв") {
    return `замечания по результатам тест-драйва: ${value}`;
  }
  if (sectionTitle === "Кузов" && /шпатл|окрас|ремонт/i.test(value)) {
    return `${label} со следами кузовного ремонта`;
  }
  if (sectionTitle === "Силовые элементы кузова") {
    return `${label}: ${value}`;
  }
  return `${label}: ${value}`;
}

function sec(sections: SummarySection[], title: string) {
  return sections.find(s => s.title === title);
}

function mediaInspections(draft: ReportDraft, groupName: string): Record<string, any> {
  const files: any[] = draft.mediaFiles || [];
  const group = files.find((f: any) => f.groupName === groupName && f.children);
  const result: Record<string, any> = {};
  if (group?.children) for (const c of group.children) if (c.inspection?.elementType) result[c.inspection.elementType] = c.inspection;
  return result;
}

function hasGroupPhotos(draft: ReportDraft, groupName: string): boolean {
  return ((draft.mediaFiles || []) as any[]).some((f: any) => f.groupName === groupName && f.children && f.children.length > 0);
}

// ── merge helpers (mirrors useMergedInspections logic) ──

function mergeBodyInspections(draft: ReportDraft): Record<string, any> {
  const merged = { ...(draft.inspections ?? {}) };
  const bodyMedia = mediaInspections(draft, "body");
  for (const [partId, ins] of Object.entries(bodyMedia)) {
    const existing = merged[partId];
    if (!existing || (existing.tags && existing.tags.length === 0)) {
      merged[partId] = ins;
    }
  }
  return merged;
}

function mergeStructuralInspections(draft: ReportDraft): {
  structural: Record<string, any>;
  undercarriage: Record<string, any>;
} {
  const mergedStructural = { ...(draft.bodyStructuralInspections ?? {}) };
  const mergedUndercarriage = { ...(draft.bodyUndercarriageInspections ?? {}) };
  const structMedia = mediaInspections(draft, "structural");
  for (const [partId, ins] of Object.entries(structMedia)) {
    const isStructural = STRUCTURAL_PARTS.some((p: any) => p.id === partId);
    if (isStructural) {
      if (!mergedStructural[partId]) mergedStructural[partId] = ins;
    } else {
      if (!mergedUndercarriage[partId]) mergedUndercarriage[partId] = ins;
    }
  }
  return { structural: mergedStructural, undercarriage: mergedUndercarriage };
}

function mergeGlassInspections(draft: ReportDraft): Record<string, any> {
  const merged = { ...(draft.glassInspections ?? {}) };
  const glassMedia = mediaInspections(draft, "glass");
  for (const [partId, ins] of Object.entries(glassMedia)) {
    if (!merged[partId]) merged[partId] = ins;
  }
  return merged;
}

// ── build SummaryInput from draft ──

function buildSummaryInput(draft: ReportDraft): SummaryInput {
  const mergedBody = mergeBodyInspections(draft);
  const { structural, undercarriage } = mergeStructuralInspections(draft);
  const mergedGlass = mergeGlassInspections(draft);

  return {
    vin: draft.vin,
    vinUnreadable: draft.vinUnreadable ?? false,
    plate: draft.plate ?? "",
    carBrand: draft.carResult?.brand?.name ?? "",
    carModel: draft.carResult?.model?.model ?? "",
    carGeneration: String(draft.carResult?.generation?.generation ?? ""),
    mileage: draft.mileage,
    mileageMatchesClaimed: draft.mileageMatchesClaimed ?? false,
    engineVolume: draft.engineVolume ?? "",
    engineType: draft.engineType ?? "",
    gearboxType: draft.gearboxType ?? "",
    driveType: draft.driveType ?? "",
    color: draft.color ?? "",
    trim: draft.trim ?? "",
    ownersCount: draft.ownersCount ?? "",
    inspectionCity: draft.inspectionCity ?? "",
    inspectionDate: draft.inspectionDate ?? "",
    inspections: mergedBody,
    bodyGeometryOk: draft.bodyGeometryOk,
    bodyNote: draft.bodyNote,
    bodyPaintFrom: draft.bodyPaintFrom ?? 80,
    bodyPaintTo: draft.bodyPaintTo ?? 200,
    bodyStructuralInspections: structural,
    bodyUndercarriageInspections: undercarriage,
    structPaintFrom: draft.structPaintFrom ?? 80,
    structPaintTo: draft.structPaintTo ?? 200,
    glassInspections: mergedGlass,
    glassNote: draft.glassNote ?? "",
    lightingInspections: mediaInspections(draft, "lighting"),
    underhoodInspections: mediaInspections(draft, "underhood"),
    interiorInspections: mediaInspections(draft, "interior"),
    wheelsInspections: mediaInspections(draft, "wheels"),
    diagnosticsInspections: mediaInspections(draft, "diagnostics"),
    underhoodNote: draft.underhoodNote,
    interiorNote: draft.interiorNote,
    wheelsNote: draft.wheelsNote,
    tdConducted: draft.tdConducted ?? null,
    tdEngineOk: draft.tdEngineOk,
    tdEngineTags: draft.tdEngineTags,
    tdGearboxOk: draft.tdGearboxOk,
    tdGearboxTags: draft.tdGearboxTags,
    tdSteeringOk: draft.tdSteeringOk,
    tdSteeringTags: draft.tdSteeringTags,
    tdRideOk: draft.tdRideOk,
    tdRideTags: draft.tdRideTags,
    tdBrakeRideOk: draft.tdBrakeRideOk,
    tdBrakeRideTags: draft.tdBrakeRideTags,
    tdNote: draft.tdNote,
    diagnosticNote: draft.diagnosticNote,
    diagnosticFilesCount: (draft.diagnosticFiles ?? []).length,
    hasBodyPhotos: hasGroupPhotos(draft, "body"),
    hasGlassPhotos: hasGroupPhotos(draft, "glass"),
    hasLightingPhotos: hasGroupPhotos(draft, "lighting"),
    hasUnderhoodPhotos: hasGroupPhotos(draft, "underhood"),
    hasInteriorPhotos: hasGroupPhotos(draft, "interior"),
    hasStructuralPhotos: hasGroupPhotos(draft, "structural"),
    hasWheelsPhotos: hasGroupPhotos(draft, "wheels"),
    hasDiagnosticsPhotos: hasGroupPhotos(draft, "diagnostics"),
    mediaChildren: ((draft.mediaFiles || []) as any[]).flatMap((group: any) => {
      if (!group.children) return [];
      return group.children.map((c: any) => ({
        id: c.id,
        groupName: c.groupName || group.groupName,
        type: c.type || "image",
        elementType: c.inspection?.elementType,
      }));
    }),
    mediaGroupInspections: ((draft.mediaFiles || []) as any[]).reduce((acc: Record<string, any>, group: any) => {
      if (group.groupName && group.groupInspection) {
        acc[group.groupName] = group.groupInspection;
      }
      return acc;
    }, {}),
    docsOwnerMatch: draft.docsOwnerMatch ?? null,
    docsVinMatch: draft.docsVinMatch ?? null,
    docsEngineMatch: draft.docsEngineMatch ?? null,
    legalLoaded: draft.legalLoaded,
    legalSkipped: draft.legalSkipped,
    adLink: draft.adLink ?? "",
    customTags: loadAllCustomTags(),
  };
}

// ── main export ──

/**
 * generateSummaryNote — builds the auto-generated summary note from a draft.
 * Only includes issues, missing checks, and notes. Leaves conclusion empty.
 */
export function generateSummaryNote(draft: ReportDraft): string {
  const input = buildSummaryInput(draft);
  const { sections } = generateSummary(input);
  const lines: string[] = [];

  // Header
  const carName = [input.carBrand, input.carModel, input.carGeneration].filter(Boolean).join(" ");
  const vinPart = input.vin ? `, VIN ${input.vin}` : input.vinUnreadable ? ", VIN не читается" : "";
  const platePart = input.plate ? `, г/н ${input.plate}` : "";
  lines.push(`Осмотрен автомобиль ${carName || "—"}${vinPart}${platePart}.`);
  lines.push("");

  // === Identity & Checks ===
  const idParts: string[] = [];

  if (input.vinUnreadable) {
    idParts.push("VIN не читается, требуется дополнительная сверка идентификационных данных.");
  }

   if (input.mileage) {
    if (input.mileageMatchesClaimed) {
      idParts.push(`Пробег ${input.mileage} км не соответствует заявленному продавцом.`);
    }
  }

  const docsS = sec(sections, "Сверка документов");
  if (docsS) {
    const issues = compactSectionItems(docsS, ["serious"]);
    if (issues.length > 0) {
      idParts.push(`По результатам сверки документов выявлены несоответствия:${formatIssueList(issues)}`);
    }
  }

  if (idParts.length > 0) {
    lines.push(`По проверкам и идентификации:`);
    for (const part of idParts) lines.push(`  ▸ ${part}`);
    lines.push("");
  }

  // === Кузов ===
  const bodyS = sec(sections, "Кузов");
  if (bodyS && !hasGapDetail(bodyS, /не осмотр/)) {
    const serious = compactSectionItems(bodyS, ["serious"]);
    const minor = compactSectionItems(bodyS, ["minor"]);
    if (serious.length > 0 || minor.length > 0) {
      const all = [...serious, ...minor];
      const repaint = all.filter(i => /окрас|шпатлёвка/i.test(i.value));
      const other = all.filter(i => !repaint.includes(i));
      if (repaint.length > 0) {
        lines.push(`Кузов — следы ремонтного воздействия:${formatIssueList(repaint)}`);
        lines.push("");
      }
      if (other.length > 0) {
        lines.push(`Кузов — замечания:${formatIssueList(other)}`);
        lines.push("");
      }
    }
    const notes = extractNotes(bodyS.details).map(normalizeNote).filter(Boolean);
    if (notes.length > 0) { lines.push(notes[0]); lines.push(""); }
  }

  // === Силовые элементы ===
  const structS = sec(sections, "Силовые элементы кузова");
  if (structS && !hasGapDetail(structS, /не осмотр/)) {
    const issues = compactSectionItems(structS);
    if (issues.length > 0) {
      lines.push(`Силовые элементы кузова:${formatIssueList(issues)}`);
      lines.push("");
    }
  }

  // === Остекление ===
  const glassS = sec(sections, "Остекление");
  if (glassS && !hasGapDetail(glassS, /не осмотр/)) {
    const issues = compactSectionItems(glassS);
    if (issues.length > 0) {
      lines.push(`Остекление:${formatIssueList(issues)}`);
      lines.push("");
    }
  }

  // === Светотехника ===
  const lightS = sec(sections, "Светотехника");
  if (lightS && !hasGapDetail(lightS, /не осмотр/)) {
    const issues = compactSectionItems(lightS);
    if (issues.length > 0) {
      lines.push(`Светотехника:${formatIssueList(issues)}`);
      lines.push("");
    }
  }

  // === Подкапотное пространство ===
  const underhoodS = sec(sections, "Подкапотное пространство");
  if (underhoodS && !hasGapDetail(underhoodS, /не осмотр/)) {
    const issues = compactSectionItems(underhoodS);
    if (issues.length > 0) {
      lines.push(`Подкапотное пространство:${formatIssueList(issues)}`);
      lines.push("");
    }
    const notes = extractNotes(underhoodS.details).map(normalizeNote).filter(Boolean);
    if (notes.length > 0) { lines.push(notes[0]); lines.push(""); }
  }

  // === Компьютерная диагностика ===
  const diagS = sec(sections, "Компьютерная диагностика");
  if (diagS && !hasGapDetail(diagS, /не провод/)) {
    const issues = compactSectionItems(diagS);
    if (issues.length > 0) {
      lines.push(`Компьютерная диагностика:${formatIssueList(issues)}`);
      lines.push("");
    }
    const notes = extractNotes(diagS.details).map(normalizeNote).filter(Boolean);
    if (notes.length > 0) { lines.push(notes[0]); lines.push(""); }
  }

  // === Колёса и тормозные механизмы ===
  const wheelsS = sec(sections, "Колёса и тормозные механизмы");
  if (wheelsS && !hasGapDetail(wheelsS, /не осмотр/)) {
    const issues = compactSectionItems(wheelsS);
    if (issues.length > 0) {
      lines.push(`Колёса и тормозные механизмы:${formatIssueList(issues)}`);
      lines.push("");
    }
  }

  // === Тест-драйв ===
  const tdS = sec(sections, "Тест-драйв");
  if (tdS && input.tdConducted !== false) {
    const issues = compactSectionItems(tdS, ["serious"]);
    if (issues.length > 0) {
      lines.push(`Тест-драйв:${formatIssueList(issues)}`);
      lines.push("");
    }
  }

  // === Салон ===
  const interiorS = sec(sections, "Салон");
  if (interiorS && !hasGapDetail(interiorS, /не осмотр/)) {
    const issues = compactSectionItems(interiorS);
    if (issues.length > 0) {
      lines.push(`Салон:${formatIssueList(issues)}`);
      lines.push("");
    }
  }

  // === Missing Checks ===
  const missing: string[] = [];
  if (hasGapDetail(diagS, /не провод/)) {
    missing.push("компьютерную диагностику");
  }
  if (input.legalSkipped || (!input.legalLoaded && !input.legalSkipped)) {
    if (!input.legalLoaded) missing.push("юридическую проверку");
  }
  if (input.tdConducted === false) missing.push("тест-драйв");
  if (docsS?.status === "warn") missing.push("полную сверку документов");
  if (hasGapDetail(bodyS, /не осмотр/)) missing.push("осмотр кузова");
  if (hasGapDetail(glassS, /не осмотр/)) missing.push("осмотр остекления");
  if (hasGapDetail(underhoodS, /не осмотр/)) missing.push("осмотр подкапотного пространства");
  if (hasGapDetail(interiorS, /не осмотр/)) missing.push("осмотр салона");

  if (missing.length > 0) {
    lines.push(`Дополнительно рекомендуется выполнить: ${humanJoin(Array.from(new Set(missing)))}.`);
    lines.push("");
  }

  return lines.join("\n").trim();
}
