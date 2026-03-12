/**
 * tagResolver.ts
 *
 * Single source of truth for resolving tag definitions across the entire app.
 * Every place that needs tag label/emoji/severity should call this module
 * instead of building local allTags arrays.
 */

import {
  DAMAGE_TAG_GROUPS,
  GLASS_DAMAGE_TAG_GROUPS,
  STRUCTURAL_DAMAGE_TAG_GROUPS,
  UNDERHOOD_DAMAGE_TAG_GROUPS,
  WHEELS_DAMAGE_TAG_GROUPS,
  LIGHTING_DAMAGE_TAG_GROUPS,
  INTERIOR_MAIN_TAG_GROUPS,
  INTERIOR_DASHBOARD_TAG_GROUPS,
  INTERIOR_ELEMENT_TAG_GROUPS,
  DIAGNOSTICS_TAG_GROUPS,
  ALL_TD_TAGS,
} from "@/types/inspection";
import { DIAGNOSTICS_ELEMENT_TAG_GROUPS } from "@/data/diagnosticTags";
import { loadAllCustomTags } from "@/lib/customTagsLoader";
import type { InspectionStrategy } from "@/types/inspection";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TagDefinition {
  id: string;
  label: string;
  emoji: string;
  severity: "serious" | "minor" | "unknown";
}

type TagGroup = readonly {
  title: string;
  severity?: "serious" | "minor";
  tags: readonly { id: string; label: string; emoji: string }[];
}[];

/* ------------------------------------------------------------------ */
/*  Master registry: groupName → tag groups                            */
/* ------------------------------------------------------------------ */

const GROUP_TAG_GROUPS: Record<string, TagGroup> = {
  body: DAMAGE_TAG_GROUPS,
  glass: GLASS_DAMAGE_TAG_GROUPS,
  structural: STRUCTURAL_DAMAGE_TAG_GROUPS,
  underhood: UNDERHOOD_DAMAGE_TAG_GROUPS,
  wheels: WHEELS_DAMAGE_TAG_GROUPS,
  lighting: LIGHTING_DAMAGE_TAG_GROUPS,
  interior: [...INTERIOR_MAIN_TAG_GROUPS, ...INTERIOR_DASHBOARD_TAG_GROUPS],
  diagnostics: DIAGNOSTICS_TAG_GROUPS,
};

/** Groups that have per-element-type tag overrides */
const ELEMENT_TAG_GROUPS: Record<string, Record<string, TagGroup>> = {
  interior: INTERIOR_ELEMENT_TAG_GROUPS as unknown as Record<string, TagGroup>,
  diagnostics: DIAGNOSTICS_ELEMENT_TAG_GROUPS as unknown as Record<string, TagGroup>,
};

/* ------------------------------------------------------------------ */
/*  Core resolver                                                      */
/* ------------------------------------------------------------------ */

/**
 * Resolve a single tag by id.
 *
 * Lookup order:
 * 1. element-type-specific tag groups (if groupName + elementType provided)
 * 2. group-level tag groups
 * 3. test-drive tags
 * 4. user custom tags (localStorage)
 */
export function resolveTag(
  tagId: string,
  groupName?: string,
  elementType?: string,
): TagDefinition | null {
  // 1. Element-specific tags
  if (groupName && elementType) {
    const elGroups = ELEMENT_TAG_GROUPS[groupName]?.[elementType];
    if (elGroups) {
      const found = findInGroups(tagId, elGroups);
      if (found) return found;
    }
  }

  // 2. Group-level tags
  if (groupName) {
    const gGroups = GROUP_TAG_GROUPS[groupName];
    if (gGroups) {
      const found = findInGroups(tagId, gGroups);
      if (found) return found;
    }
  }

  // 3. Try ALL groups (tag id may be unique across groups — body damage tags used in body group)
  for (const groups of Object.values(GROUP_TAG_GROUPS)) {
    const found = findInGroups(tagId, groups);
    if (found) return found;
  }

  // 3b. Try all element-level tag groups
  for (const elMap of Object.values(ELEMENT_TAG_GROUPS)) {
    for (const groups of Object.values(elMap)) {
      const found = findInGroups(tagId, groups);
      if (found) return found;
    }
  }

  // 4. Test-drive tags
  const tdTag = ALL_TD_TAGS.find(t => t.id === tagId);
  if (tdTag) return { id: tdTag.id, label: tdTag.label, emoji: tdTag.emoji, severity: "minor" };

  // 5. User custom tags
  const custom = loadAllCustomTags();
  if (custom[tagId]) {
    return { id: tagId, label: custom[tagId].label, emoji: custom[tagId].emoji, severity: "unknown" };
  }

  return null;
}

/**
 * Get tag groups to display for selection, respecting element-type overrides.
 * Used by PartInspectionModal and similar selection UIs.
 */
export function getTagGroupsForSelection(
  strategy: InspectionStrategy,
  elementType?: string,
): TagGroup {
  // Element-specific override from strategy
  if (elementType && strategy.elementTagGroups?.[elementType]) {
    return strategy.elementTagGroups[elementType] as unknown as TagGroup;
  }
  // Custom tag groups from strategy
  if (strategy.customTagGroups) {
    return strategy.customTagGroups as unknown as TagGroup;
  }
  // Default body damage tags
  return DAMAGE_TAG_GROUPS;
}

/**
 * Batch-resolve multiple tag IDs. Returns definitions in order, skipping unknowns.
 */
export function resolveTags(
  tagIds: string[],
  groupName?: string,
  elementType?: string,
): TagDefinition[] {
  return tagIds
    .map(id => resolveTag(id, groupName, elementType))
    .filter(Boolean) as TagDefinition[];
}

/**
 * Check if a tag is "serious" severity.
 */
export function isTagSerious(tagId: string, groupName?: string, elementType?: string): boolean {
  const def = resolveTag(tagId, groupName, elementType);
  return def?.severity === "serious";
}

/* ------------------------------------------------------------------ */
/*  Internals                                                          */
/* ------------------------------------------------------------------ */

function findInGroups(tagId: string, groups: TagGroup): TagDefinition | null {
  for (const group of groups) {
    const tag = group.tags.find(t => t.id === tagId);
    if (tag) {
      // Determine severity: groups with severity field use it; DAMAGE_TAG_GROUPS index 0 = serious
      let severity: "serious" | "minor" | "unknown" = "unknown";
      if ("severity" in group && group.severity) {
        severity = group.severity;
      } else {
        // DAMAGE_TAG_GROUPS: first group is serious, second is minor
        const groupIdx = (groups as any).indexOf(group);
        if (groupIdx === 0) severity = "serious";
        else if (groupIdx === 1) severity = "minor";
      }
      return { id: tag.id, label: tag.label, emoji: tag.emoji, severity };
    }
  }
  return null;
}
