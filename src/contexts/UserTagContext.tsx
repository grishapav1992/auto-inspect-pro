import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface UserTag {
  id: string;
  label: string;
  emoji: string;
}

interface GroupConfig {
  /** User-created tags */
  userTags: UserTag[];
  /** IDs of disabled default tags */
  disabledDefaults: string[];
  /** Ordered list of all tag IDs (both default + user). If empty, natural order is used. */
  order: string[];
}

type UserTagStore = Record<string, GroupConfig>;

interface UserTagContextValue {
  getTags: (groupKey: string) => UserTag[];
  addTag: (groupKey: string, tag: Omit<UserTag, "id">) => UserTag;
  removeTag: (groupKey: string, tagId: string) => void;
  getDisabledDefaults: (groupKey: string) => string[];
  toggleDefault: (groupKey: string, tagId: string) => void;
  getOrder: (groupKey: string) => string[];
  setOrder: (groupKey: string, order: string[]) => void;
  moveTag: (groupKey: string, tagId: string, direction: "up" | "down") => void;
}

const STORAGE_KEY = "user_custom_tags_v2";

const UserTagContext = createContext<UserTagContextValue | null>(null);

const emptyConfig: GroupConfig = { userTags: [], disabledDefaults: [], order: [] };

/**
 * loadStore — загружает хранилище пользовательских тегов из localStorage.
 * Поддерживает миграцию со старого формата v1 (массив тегов → GroupConfig).
 */
function loadStore(): UserTagStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    // Migrate from v1
    const v1 = localStorage.getItem("user_custom_tags");
    if (v1) {
      const old: Record<string, UserTag[]> = JSON.parse(v1);
      const migrated: UserTagStore = {};
      for (const [key, tags] of Object.entries(old)) {
        migrated[key] = { userTags: tags, disabledDefaults: [], order: [] };
      }
      localStorage.removeItem("user_custom_tags");
      return migrated;
    }
    return {};
  } catch {
    return {};
  }
}

/** saveStore — сериализует и записывает хранилище тегов в localStorage. */
function saveStore(store: UserTagStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/** getConfig — возвращает конфигурацию группы тегов или пустой объект по умолчанию. */
function getConfig(store: UserTagStore, key: string): GroupConfig {
  return store[key] || emptyConfig;
}

export function UserTagProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<UserTagStore>(loadStore);

  useEffect(() => {
    saveStore(store);
  }, [store]);

  const getTags = useCallback(
    (groupKey: string): UserTag[] => getConfig(store, groupKey).userTags,
    [store]
  );

  const addTag = useCallback(
    (groupKey: string, tag: Omit<UserTag, "id">): UserTag => {
      const newTag: UserTag = {
        id: `user_${groupKey}_${Date.now()}`,
        label: tag.label,
        emoji: tag.emoji,
      };
      setStore((prev) => {
        const cfg = getConfig(prev, groupKey);
        const newOrder = cfg.order.length > 0 ? [...cfg.order, newTag.id] : [];
        return {
          ...prev,
          [groupKey]: { ...cfg, userTags: [...cfg.userTags, newTag], order: newOrder },
        };
      });
      return newTag;
    },
    []
  );

  const removeTag = useCallback(
    (groupKey: string, tagId: string) => {
      setStore((prev) => {
        const cfg = getConfig(prev, groupKey);
        return {
          ...prev,
          [groupKey]: {
            ...cfg,
            userTags: cfg.userTags.filter((t) => t.id !== tagId),
            order: cfg.order.filter((id) => id !== tagId),
          },
        };
      });
    },
    []
  );

  const getDisabledDefaults = useCallback(
    (groupKey: string): string[] => getConfig(store, groupKey).disabledDefaults,
    [store]
  );

  const toggleDefault = useCallback(
    (groupKey: string, tagId: string) => {
      setStore((prev) => {
        const cfg = getConfig(prev, groupKey);
        const disabled = cfg.disabledDefaults.includes(tagId)
          ? cfg.disabledDefaults.filter((id) => id !== tagId)
          : [...cfg.disabledDefaults, tagId];
        return { ...prev, [groupKey]: { ...cfg, disabledDefaults: disabled } };
      });
    },
    []
  );

  const getOrder = useCallback(
    (groupKey: string): string[] => getConfig(store, groupKey).order,
    [store]
  );

  const setOrderFn = useCallback(
    (groupKey: string, order: string[]) => {
      setStore((prev) => {
        const cfg = getConfig(prev, groupKey);
        return { ...prev, [groupKey]: { ...cfg, order } };
      });
    },
    []
  );

  const moveTag = useCallback(
    (groupKey: string, tagId: string, direction: "up" | "down") => {
      setStore((prev) => {
        const cfg = getConfig(prev, groupKey);
        const order = [...cfg.order];
        const idx = order.indexOf(tagId);
        if (idx === -1) return prev;
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= order.length) return prev;
        [order[idx], order[swapIdx]] = [order[swapIdx], order[idx]];
        return { ...prev, [groupKey]: { ...cfg, order } };
      });
    },
    []
  );

  return (
    <UserTagContext.Provider value={{
      getTags, addTag, removeTag,
      getDisabledDefaults, toggleDefault,
      getOrder, setOrder: setOrderFn, moveTag,
    }}>
      {children}
    </UserTagContext.Provider>
  );
}

export function useUserTags() {
  const ctx = useContext(UserTagContext);
  if (!ctx) throw new Error("useUserTags must be used within UserTagProvider");
  return ctx;
}
