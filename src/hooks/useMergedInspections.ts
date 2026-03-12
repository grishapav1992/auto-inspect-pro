import { useMemo } from "react";
import type { PartInspection } from "@/types/inspection";
import { STRUCTURAL_PARTS } from "@/types/inspection";
import type { MediaItem } from "@/components/SortableMediaGallery";

export interface MergedInspectionData {
  mergedInspections: Record<string, PartInspection>;
  mergedStructural: Record<string, PartInspection>;
  mergedUndercarriage: Record<string, PartInspection>;
  mergedGlass: Record<string, PartInspection>;
  mergedLighting: Record<string, PartInspection>;
  mergedUnderhood: Record<string, PartInspection>;
  mergedInterior: Record<string, PartInspection>;
  mergedWheels: Record<string, PartInspection>;
  mergedDiagnostics: Record<string, PartInspection>;
}

/**
 * Извлекает инспекции из группы медиафайлов по имени группы.
 */
function extractGroupInspections(
  mediaFiles: MediaItem[],
  groupName: string,
): Record<string, PartInspection> {
  const result: Record<string, PartInspection> = {};
  const group = mediaFiles.find(f => f.groupName === groupName && f.children);
  if (group?.children) {
    for (const child of group.children) {
      if (child.inspection && child.inspection.elementType) {
        const partId = child.inspection.elementType;
        if (!result[partId]) result[partId] = child.inspection;
      }
    }
  }
  return result;
}

/**
 * useMergedInspections — мемоизирует слияние данных инспекций из разделов
 * с данными из медиа-галереи. Ранее эта логика выполнялась inline в рендере summary.
 */
export function useMergedInspections(
  inspections: Record<string, PartInspection>,
  bodyStructuralInspections: Record<string, PartInspection>,
  bodyUndercarriageInspections: Record<string, PartInspection>,
  glassInspections: Record<string, PartInspection>,
  mediaFiles: MediaItem[],
): MergedInspectionData {
  return useMemo(() => {
    // Merge body
    const mergedInspections = { ...inspections };
    const bodyMedia = extractGroupInspections(mediaFiles, "body");
    for (const [partId, ins] of Object.entries(bodyMedia)) {
      const existing = mergedInspections[partId];
      if (!existing || existing.tags.length === 0) {
        mergedInspections[partId] = ins;
      }
    }

    // Merge structural
    const mergedStructural = { ...bodyStructuralInspections };
    const mergedUndercarriage = { ...bodyUndercarriageInspections };
    const structMedia = extractGroupInspections(mediaFiles, "structural");
    for (const [partId, ins] of Object.entries(structMedia)) {
      const isStructural = STRUCTURAL_PARTS.some(p => p.id === partId);
      if (isStructural) {
        if (!mergedStructural[partId]) mergedStructural[partId] = ins;
      } else {
        if (!mergedUndercarriage[partId]) mergedUndercarriage[partId] = ins;
      }
    }

    // Merge glass
    const mergedGlass = { ...glassInspections };
    const glassMedia = extractGroupInspections(mediaFiles, "glass");
    for (const [partId, ins] of Object.entries(glassMedia)) {
      if (!mergedGlass[partId]) mergedGlass[partId] = ins;
    }

    // Simple group merges
    const mergedLighting = extractGroupInspections(mediaFiles, "lighting");
    const mergedUnderhood = extractGroupInspections(mediaFiles, "underhood");
    const mergedInterior = extractGroupInspections(mediaFiles, "interior");
    const mergedWheels = extractGroupInspections(mediaFiles, "wheels");
    const mergedDiagnostics = extractGroupInspections(mediaFiles, "diagnostics");

    return {
      mergedInspections,
      mergedStructural,
      mergedUndercarriage,
      mergedGlass,
      mergedLighting,
      mergedUnderhood,
      mergedInterior,
      mergedWheels,
      mergedDiagnostics,
    };
  }, [inspections, bodyStructuralInspections, bodyUndercarriageInspections, glassInspections, mediaFiles]);
}
