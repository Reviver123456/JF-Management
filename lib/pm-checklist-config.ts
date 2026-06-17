import { getSiteContractAt, type SiteCatalogRecord } from "./pm-data";

export const pmChecklistKeys = ["synapse", "server", "switch", "storage", "environment", "diag"] as const;

export type PmChecklistKey = (typeof pmChecklistKeys)[number];

export type PmChecklistConfig = {
  customItems: Partial<Record<PmChecklistKey, string[]>>;
  customItemsBySection: Partial<Record<PmChecklistKey, Record<string, string[]>>>;
  diagMonitorCounts: Record<number, 1 | 2>;
  itemLabelsBySection: Partial<Record<PmChecklistKey, Record<string, Record<string, string>>>>;
  removedDefaultItemsBySection: Partial<Record<PmChecklistKey, Record<string, string[]>>>;
  selectedTabs: PmChecklistKey[];
  setCounts: Record<PmChecklistKey, number>;
  selectedItems: Partial<Record<PmChecklistKey, string[]>>;
};

const storageKey = "pm-site-checklist-configs";

export const defaultPmChecklistConfig: PmChecklistConfig = {
  customItems: {},
  customItemsBySection: {},
  diagMonitorCounts: {},
  itemLabelsBySection: {},
  removedDefaultItemsBySection: {},
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
  const customItems = pmChecklistKeys.reduce((items, key) => {
    const currentItems = value?.customItems?.[key];
    if (Array.isArray(currentItems)) {
      items[key] = [...new Set(currentItems.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()))];
    }

    return items;
  }, {} as Partial<Record<PmChecklistKey, string[]>>);
  const customItemsBySection = pmChecklistKeys.reduce((items, key) => {
    const sections = value?.customItemsBySection?.[key];

    if (sections && typeof sections === "object" && !Array.isArray(sections)) {
      const normalizedSections = Object.entries(sections).reduce((sectionItems, [sectionId, currentItems]) => {
        if (Array.isArray(currentItems)) {
          sectionItems[sectionId] = [...new Set(currentItems.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()))];
        }

        return sectionItems;
      }, {} as Record<string, string[]>);

      if (Object.keys(normalizedSections).length > 0) {
        items[key] = normalizedSections;
      }
    }

    return items;
  }, {} as Partial<Record<PmChecklistKey, Record<string, string[]>>>);
  const itemLabelsBySection = pmChecklistKeys.reduce((items, key) => {
    const sections = value?.itemLabelsBySection?.[key];

    if (sections && typeof sections === "object" && !Array.isArray(sections)) {
      const normalizedSections = Object.entries(sections).reduce((sectionItems, [sectionId, currentItems]) => {
        if (currentItems && typeof currentItems === "object" && !Array.isArray(currentItems)) {
          const labels = Object.entries(currentItems).reduce((labelItems, [item, label]) => {
            if (typeof label === "string" && item.trim() && label.trim()) {
              labelItems[item] = label.trim();
            }

            return labelItems;
          }, {} as Record<string, string>);

          if (Object.keys(labels).length > 0) {
            sectionItems[sectionId] = labels;
          }
        }

        return sectionItems;
      }, {} as Record<string, Record<string, string>>);

      if (Object.keys(normalizedSections).length > 0) {
        items[key] = normalizedSections;
      }
    }

    return items;
  }, {} as Partial<Record<PmChecklistKey, Record<string, Record<string, string>>>>);
  const removedDefaultItemsBySection = pmChecklistKeys.reduce((items, key) => {
    const sections = value?.removedDefaultItemsBySection?.[key];

    if (sections && typeof sections === "object" && !Array.isArray(sections)) {
      const normalizedSections = Object.entries(sections).reduce((sectionItems, [sectionId, currentItems]) => {
        if (Array.isArray(currentItems)) {
          sectionItems[sectionId] = [...new Set(currentItems.filter((item): item is string => typeof item === "string" && item.trim().length > 0))];
        }

        return sectionItems;
      }, {} as Record<string, string[]>);

      if (Object.keys(normalizedSections).length > 0) {
        items[key] = normalizedSections;
      }
    }

    return items;
  }, {} as Partial<Record<PmChecklistKey, Record<string, string[]>>>);
  const diagMonitorCounts = Object.entries(value?.diagMonitorCounts ?? {}).reduce<Record<number, 1 | 2>>((counts, [setId, count]) => {
    const numericSetId = Number(setId);

    if (Number.isInteger(numericSetId) && numericSetId > 0 && (count === 1 || count === 2)) {
      counts[numericSetId] = count;
    }

    return counts;
  }, {});

  return {
    customItems,
    customItemsBySection,
    diagMonitorCounts,
    itemLabelsBySection,
    removedDefaultItemsBySection,
    selectedTabs,
    setCounts: pmChecklistKeys.reduce((counts, key) => {
      const count = value?.setCounts?.[key];
      counts[key] = typeof count === "number" && Number.isInteger(count) && count > 0 ? count : 1;
      return counts;
    }, {} as Record<PmChecklistKey, number>),
    selectedItems
  };
}

export function normalizePmChecklistConfig(value: unknown): PmChecklistConfig {
  return value && typeof value === "object" && !Array.isArray(value)
    ? normalizeConfig(value as Partial<PmChecklistConfig>)
    : defaultPmChecklistConfig;
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

export function readSiteContractChecklistConfig(
  site: Pick<SiteCatalogRecord, "id" | "contract" | "contractDetails"> | null | undefined,
  contractIndex: number
): PmChecklistConfig {
  const contract = getSiteContractAt(site, contractIndex);
  const contractConfig = contract.checklistConfig;

  if (contractConfig) {
    return normalizePmChecklistConfig(contractConfig);
  }

  if (contractIndex === 0 && site?.contractDetails?.checklistConfig) {
    return normalizePmChecklistConfig(site.contractDetails.checklistConfig);
  }

  if (contractIndex === 0 && site?.id) {
    return readSitePmChecklistConfig(site.id);
  }

  return defaultPmChecklistConfig;
}
