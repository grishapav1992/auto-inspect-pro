/**
 * buildSummaryInput.ts
 *
 * Single source of truth for constructing SummaryInput from a ReportDraft.
 * Eliminates duplication between CreateReport (inline) and completedReportStorage.
 */

import type { SummaryInput } from "@/lib/summaryGenerator";
import type { PartInspection } from "@/types/inspection";
import type { ReportDraft } from "@/lib/draftStorage";
import type { MediaItem } from "@/components/SortableMediaGallery";
import { loadAllCustomTags } from "@/lib/customTagsLoader";
import type { MergedInspectionData } from "@/hooks/useMergedInspections";

/** Extract inspections from media group children by groupName */
function extractGroupInspections(
  mediaFiles: any[],
  groupName: string,
): Record<string, PartInspection> {
  const result: Record<string, PartInspection> = {};
  const group = mediaFiles.find((f: any) => f.groupName === groupName && f.children);
  if (group?.children) {
    for (const c of group.children) {
      if (c.inspection?.elementType) {
        result[c.inspection.elementType] = c.inspection;
      }
    }
  }
  return result;
}

/** Check if a media group has photos */
function hasGroupPhotos(mediaFiles: any[], groupName: string): boolean {
  return mediaFiles.some((f: any) => f.groupName === groupName && f.children && f.children.length > 0);
}

/** Build media children refs for linking details to media */
function buildMediaChildren(mediaFiles: any[]): SummaryInput["mediaChildren"] {
  return mediaFiles.flatMap((group: any) => {
    if (!group.children) return [];
    return group.children.map((c: any) => ({
      id: c.id,
      groupName: c.groupName || group.groupName || "body",
      type: c.type || "image",
      elementType: c.inspection?.elementType,
    }));
  });
}

/** Build group-level inspections map */
function buildGroupInspections(mediaFiles: any[]): Record<string, PartInspection> {
  return mediaFiles.reduce((acc: Record<string, any>, group: any) => {
    if (group.groupName && group.groupInspection) {
      acc[group.groupName] = group.groupInspection;
    }
    return acc;
  }, {});
}

/**
 * Build SummaryInput from a ReportDraft.
 * Used by completedReportStorage for finalization.
 */
export function buildSummaryInputFromDraft(draft: ReportDraft): SummaryInput {
  const mediaFiles: any[] = draft.mediaFiles || [];

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
    inspections: draft.inspections,
    bodyGeometryOk: draft.bodyGeometryOk,
    bodyNote: draft.bodyNote,
    bodyPaintFrom: draft.bodyPaintFrom ?? 80,
    bodyPaintTo: draft.bodyPaintTo ?? 200,
    bodyStructuralInspections: draft.bodyStructuralInspections ?? {},
    bodyUndercarriageInspections: draft.bodyUndercarriageInspections ?? {},
    structPaintFrom: draft.structPaintFrom ?? 80,
    structPaintTo: draft.structPaintTo ?? 200,
    glassInspections: draft.glassInspections ?? {},
    glassNote: draft.glassNote ?? "",
    lightingInspections: extractGroupInspections(mediaFiles, "lighting"),
    underhoodInspections: extractGroupInspections(mediaFiles, "underhood"),
    interiorInspections: extractGroupInspections(mediaFiles, "interior"),
    wheelsInspections: extractGroupInspections(mediaFiles, "wheels"),
    diagnosticsInspections: extractGroupInspections(mediaFiles, "diagnostics"),
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
    hasBodyPhotos: hasGroupPhotos(mediaFiles, "body"),
    hasGlassPhotos: hasGroupPhotos(mediaFiles, "glass"),
    hasLightingPhotos: hasGroupPhotos(mediaFiles, "lighting"),
    hasUnderhoodPhotos: hasGroupPhotos(mediaFiles, "underhood"),
    hasInteriorPhotos: hasGroupPhotos(mediaFiles, "interior"),
    hasStructuralPhotos: hasGroupPhotos(mediaFiles, "structural"),
    hasWheelsPhotos: hasGroupPhotos(mediaFiles, "wheels"),
    hasDiagnosticsPhotos: hasGroupPhotos(mediaFiles, "diagnostics"),
    mediaChildren: buildMediaChildren(mediaFiles),
    mediaGroupInspections: buildGroupInspections(mediaFiles),
    docsOwnerMatch: draft.docsOwnerMatch ?? null,
    docsVinMatch: draft.docsVinMatch ?? null,
    docsEngineMatch: draft.docsEngineMatch ?? null,
    legalLoaded: draft.legalLoaded,
    legalSkipped: draft.legalSkipped,
    adLink: draft.adLink ?? "",
    customTags: loadAllCustomTags(),
  };
}

/**
 * Build SummaryInput from live CreateReport state with pre-merged inspections.
 * Used by CreateReport for the summary step.
 */
export function buildSummaryInputFromState(params: {
  vin: string;
  vinUnreadable: boolean;
  plate: string;
  carResult: any;
  mileage: string;
  mileageMatchesClaimed: boolean;
  adLink: string;
  engineVolume: string;
  engineType: string;
  gearboxType: string;
  driveType: string;
  color: string;
  trim: string;
  ownersCount: string;
  inspectionCity: string;
  inspectionDate: string;
  merged: MergedInspectionData;
  bodyGeometryOk: boolean;
  bodyNote: string;
  bodyPaintFrom: number;
  bodyPaintTo: number;
  structPaintFrom: number;
  structPaintTo: number;
  glassNote: string;
  underhoodNote: string;
  interiorNote: string;
  wheelsNote: string;
  docsOwnerMatch: boolean | null;
  docsVinMatch: boolean | null;
  docsEngineMatch: boolean | null;
  mediaFiles: MediaItem[];
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
  diagnosticNote: string;
  diagnosticFilesCount: number;
  legalLoaded: boolean;
  legalSkipped: boolean;
}): SummaryInput {
  const { merged, mediaFiles, carResult, ...rest } = params;

  return {
    ...rest,
    carBrand: carResult?.brand?.name ?? "",
    carModel: carResult?.model?.model ?? "",
    carGeneration: String(carResult?.generation?.generation ?? ""),
    inspections: merged.mergedInspections,
    bodyStructuralInspections: merged.mergedStructural,
    bodyUndercarriageInspections: merged.mergedUndercarriage,
    glassInspections: merged.mergedGlass,
    lightingInspections: merged.mergedLighting,
    underhoodInspections: merged.mergedUnderhood,
    interiorInspections: merged.mergedInterior,
    wheelsInspections: merged.mergedWheels,
    diagnosticsInspections: merged.mergedDiagnostics,
    hasBodyPhotos: hasGroupPhotos(mediaFiles as any[], "body"),
    hasGlassPhotos: hasGroupPhotos(mediaFiles as any[], "glass"),
    hasLightingPhotos: hasGroupPhotos(mediaFiles as any[], "lighting"),
    hasUnderhoodPhotos: hasGroupPhotos(mediaFiles as any[], "underhood"),
    hasInteriorPhotos: hasGroupPhotos(mediaFiles as any[], "interior"),
    hasStructuralPhotos: hasGroupPhotos(mediaFiles as any[], "structural"),
    hasWheelsPhotos: hasGroupPhotos(mediaFiles as any[], "wheels"),
    hasDiagnosticsPhotos: hasGroupPhotos(mediaFiles as any[], "diagnostics"),
    mediaChildren: buildMediaChildren(mediaFiles as any[]),
    mediaGroupInspections: buildGroupInspections(mediaFiles as any[]),
    customTags: loadAllCustomTags(),
  };
}
