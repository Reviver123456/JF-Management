export const pmChecklistKeys = ["synapse", "server", "switch", "storage", "environment", "diag"] as const;

export type PmChecklistKey = (typeof pmChecklistKeys)[number];

export type PmChecklistConfig = {
  selectedTabs: PmChecklistKey[];
  setCounts: Record<PmChecklistKey, number>;
  selectedItems: Partial<Record<PmChecklistKey, string[]>>;
};

const storageKey = "pm-site-checklist-configs";

export const defaultPmChecklistConfig: PmChecklistConfig = {
  selectedTabs: [...pmChecklistKeys],
  setCounts: {
    synapse: 1,
    server: 1,
    switch: 1,
    storage: 1,
    environment: 1,
    diag: 1
  },
  selectedItems: {}
};

function normalizeConfig(value: Partial<PmChecklistConfig> | undefined): PmChecklistConfig {
  const selectedTabs = value?.selectedTabs
    ? pmChecklistKeys.filter((key) => value.selectedTabs?.includes(key)) as PmChecklistKey[]
    : defaultPmChecklistConfig.selectedTabs;
  const selectedItems = pmChecklistKeys.reduce((items, key) => {
    const currentItems = value?.selectedItems?.[key];
    if (Array.isArray(currentItems)) {
      items[key] = [...new Set(currentItems.filter((item): item is string => typeof item === "string"))];
    }

    return items;
  }, {} as Partial<Record<PmChecklistKey, string[]>>);

  return {
    selectedTabs,
    setCounts: pmChecklistKeys.reduce((counts, key) => {
      const count = value?.setCounts?.[key];
      counts[key] = typeof count === "number" && Number.isInteger(count) && count > 0 ? count : 1;
      return counts;
    }, {} as Record<PmChecklistKey, number>),
    selectedItems
  };
}

function readStore(): Record<string, PmChecklistConfig> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) as Record<string, Partial<PmChecklistConfig>> : {};
    return Object.fromEntries(
      Object.entries(parsed).map(([siteId, config]) => [siteId, normalizeConfig(config)])
    );
  } catch {
    return {};
  }
}

export function readSitePmChecklistConfig(siteId: string): PmChecklistConfig {
  return readStore()[siteId] ?? defaultPmChecklistConfig;
}

export function writeSitePmChecklistConfig(siteId: string, config: PmChecklistConfig) {
  if (typeof window === "undefined") {
    return;
  }

  const store = readStore();
  store[siteId] = normalizeConfig(config);
  window.localStorage.setItem(storageKey, JSON.stringify(store));
}
