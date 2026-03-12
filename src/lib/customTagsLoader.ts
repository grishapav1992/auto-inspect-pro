/**
 * customTagsLoader.ts
 *
 * Loads all user-created custom tags from localStorage and returns
 * a flat map: tagId → { label, emoji }. Used by summary generators
 * and other non-React code that cannot access UserTagContext.
 */

const STORAGE_KEY = "user_custom_tags_v2";

interface UserTag {
  id: string;
  label: string;
  emoji: string;
}

interface GroupConfig {
  userTags: UserTag[];
  disabledDefaults: string[];
  order: string[];
}

type UserTagStore = Record<string, GroupConfig>;

/**
 * loadAllCustomTags — reads localStorage and returns a flat map of all
 * user-created tag IDs to their label+emoji for label resolution.
 */
export function loadAllCustomTags(): Record<string, { label: string; emoji: string }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const store: UserTagStore = JSON.parse(raw);
    const result: Record<string, { label: string; emoji: string }> = {};
    for (const config of Object.values(store)) {
      if (config.userTags) {
        for (const tag of config.userTags) {
          result[tag.id] = { label: tag.label, emoji: tag.emoji };
        }
      }
    }
    return result;
  } catch {
    return {};
  }
}
