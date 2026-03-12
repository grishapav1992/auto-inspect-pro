/**
 * Completed reports storage — persists finished inspection reports
 * in localStorage separately from drafts.
 */

import type { ReportDraft } from "./draftStorage";
import { deleteDraft, saveDraft } from "./draftStorage";
import { generateSummary, type SummaryResult, type SummarySection } from "./summaryGenerator";
import { generateChecklist, type ChecklistItem } from "./checklistGenerator";
import { buildSummaryInputFromDraft } from "./buildSummaryInput";

export interface CompletedReport {
  id: string;
  createdAt: string;
  brand: string;
  model: string;
  generation: string;
  vin: string;
  plate: string;
  mileage: string;
  verdict: "recommended" | "with_reservations" | "not_recommended";
  verdictLabel: string;
  verdictEmoji: string;
  score: number;
  sections: SummarySection[];
  checklist: ChecklistItem[];
  summaryNote: string;
  expertConclusion?: string;
  fullInspection?: boolean;
  /** Keep full draft data for detail view */
  draft: ReportDraft;
}

const STORAGE_KEY = "completed_reports";

/**
 * loadCompletedReports — загружает массив завершённых отчётов из localStorage.
 * При ошибке парсинга возвращает пустой массив.
 */
export function loadCompletedReports(): CompletedReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * saveCompletedReport — сохраняет (или обновляет) завершённый отчёт в localStorage.
 * Новый отчёт помещается в начало списка.
 */
export function saveCompletedReport(report: CompletedReport): void {
  const reports = loadCompletedReports();
  const filtered = reports.filter((r) => r.id !== report.id);
  filtered.unshift(report);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * deleteCompletedReport — удаляет завершённый отчёт по id из localStorage.
 */
export function deleteCompletedReport(id: string): void {
  const reports = loadCompletedReports().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

/**
 * finalizeDraft — финализирует черновик: генерирует итоговый вердикт (summaryGenerator)
 * и чек-лист (checklistGenerator), сохраняет как завершённый отчёт и удаляет черновик.
 * Возвращает объект CompletedReport с оценкой, секциями и полными данными черновика.
 */
/**
 * finalizeDraftToReport — генерирует данные отчёта из черновика без сохранения/удаления.
 * Используется для пересчёта при просмотре и при финализации.
 */
export function finalizeDraftToReport(draft: ReportDraft): Omit<CompletedReport, "id" | "createdAt"> {
  const summaryInput = buildSummaryInputFromDraft(draft);

  const summary = generateSummary(summaryInput);
  const checklist = generateChecklist(summaryInput);

  const brand = draft.carResult?.brand.name ?? "";
  const model = draft.carResult?.model.model ?? "";
  const generation = draft.carResult?.generation?.generation ?? "";

  const mediaFiles = draft.mediaFiles || [];
  const hasBody = mediaFiles.some((f: any) => f.groupName === "body" && f.children && f.children.length > 0);
  const hasGlass = mediaFiles.some((f: any) => f.groupName === "glass" && f.children && f.children.length > 0);
  const hasUnderhood = mediaFiles.some((f: any) => f.groupName === "underhood" && f.children && f.children.length > 0);
  const hasStructural = mediaFiles.some((f: any) => f.groupName === "structural" && f.children && f.children.length > 0);
  const hasWheels = mediaFiles.some((f: any) => f.groupName === "wheels" && f.children && f.children.length > 0);
  const hasInterior = mediaFiles.some((f: any) => f.groupName === "interior" && f.children && f.children.length > 0);
  const fullInspection = hasBody && hasGlass && hasUnderhood && hasStructural && hasWheels && hasInterior;

  return {
    brand,
    model,
    generation: String(generation),
    vin: draft.vin,
    plate: draft.plate,
    mileage: draft.mileage,
    verdict: summary.verdict,
    verdictLabel: summary.verdictLabel,
    verdictEmoji: summary.verdictEmoji,
    score: summary.score,
    sections: summary.sections,
    checklist,
    summaryNote: draft.summaryNote ?? "",
    expertConclusion: draft.expertConclusion ?? "",
    fullInspection,
    draft,
  };
}

/**
 * finalizeDraft — финализирует черновик: генерирует итоговый вердикт,
 * сохраняет как завершённый отчёт и удаляет черновик.
 */
export function finalizeDraft(draft: ReportDraft): CompletedReport {
  const reportData = finalizeDraftToReport(draft);

  // Create a minimal draft copy — strip ALL media/diagnostic file data to save space.
  // Only keep scalar fields and inspection metadata needed for recalculation.
  const leanDraft = structuredClone(draft);
  if (Array.isArray(leanDraft.mediaFiles)) {
    for (const group of leanDraft.mediaFiles as any[]) {
      if (Array.isArray(group.children)) {
        group.children = group.children.map((child: any) => ({
          id: child.id,
          url: child.url,
          groupName: child.groupName,
          type: child.type || "image",
          elementType: child.elementType,
          inspection: child.inspection,
        }));
      }
    }
  }
  // Remove diagnostic files entirely — only count matters
  delete (leanDraft as any).diagnosticFiles;

  const report: CompletedReport = {
    id: `report-${Date.now()}`,
    createdAt: new Date().toISOString().slice(0, 10),
    ...reportData,
    draft: leanDraft,
  };

  // Delete draft FIRST to free localStorage space before writing the report
  deleteDraft(draft.id);

  try {
    saveCompletedReport(report);
  } catch (err) {
    // If still failing, try trimming old reports to make room
    if (err instanceof DOMException && (err.name === "QuotaExceededError" || err.code === 22)) {
      const existing = loadCompletedReports();
      // Remove oldest reports until it fits (keep at least current)
      while (existing.length > 0) {
        existing.pop();
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify([report, ...existing]));
          return report;
        } catch {
          continue;
        }
      }
      // Last resort: save only the current report
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([report]));
        return report;
      } catch {
        // Cannot save at all
      }
    }
    // If save fails, re-save the draft so data isn't lost
    saveDraft(draft).catch(() => {});
    throw err;
  }

  return report;
}
