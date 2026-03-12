/**
 * completionContract.ts
 *
 * Single source of truth for determining whether an inspection part
 * is "filled" (complete). Used by InspectionGroupButton, PartInspectionModal,
 * SortableMediaGallery, and checklistGenerator.
 */

import type { PartInspection } from "@/types/inspection";

/**
 * Determines if a PartInspection is considered "filled" (has meaningful data).
 * An inspection is filled when it has any of: noDamage flag, tags, note, audio, or elementType.
 */
export function isInspectionFilled(ins: PartInspection): boolean {
  return (
    ins.noDamage ||
    ins.tags.length > 0 ||
    (!!ins.note && ins.note.trim().length > 0) ||
    (!!ins.audioRecordings && ins.audioRecordings.length > 0) ||
    !!ins.elementType
  );
}

/**
 * Same logic but for the PartState shape used in PartInspectionModal.
 * When elementTypes are required, elementType must be set.
 */
export function isPartStateFilled(
  state: {
    noDamage: boolean;
    tags: string[];
    note: string;
    audioRecordings: string[];
    elementType: string;
  },
  requireElementType: boolean = false,
): boolean {
  if (requireElementType && !state.elementType) return false;
  return (
    state.noDamage ||
    state.tags.length > 0 ||
    (!!state.note && state.note.trim().length > 0) ||
    (state.audioRecordings && state.audioRecordings.length > 0) ||
    !!state.elementType
  );
}
