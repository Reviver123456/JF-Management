import { normalizePmChecklistConfig, type PmChecklistConfig, type PmChecklistKey, pmChecklistKeys } from "@/lib/pm-checklist-config";
import {
  getSiteContractItems,
  OPERATING_SYSTEM_OPTIONS,
  type PmScoreBreakdown,
  type SiteContractDetails,
  type SiteContractItem
} from "@/lib/pm-data";

export const OPERATING_SYSTEM_SCORES: Record<(typeof OPERATING_SYSTEM_OPTIONS)[number], number> = {
  "VM Ware ESXI": 1,
  Proxmox: 2,
  "Hyper V": 2.5
};

export const CATEGORY_SCORE_PER_SET: Record<PmChecklistKey, number> = {
  synapse: 0.5,
  server: 1,
  switch: 0.5,
  storage: 1,
  environment: 0.5,
  diag: 1
};

export function getOperatingSystemScore(operatingSystem: string | undefined) {
  const normalized = operatingSystem?.trim() ?? "";

  if (!normalized) {
    return 0;
  }

  return OPERATING_SYSTEM_SCORES[normalized as keyof typeof OPERATING_SYSTEM_SCORES] ?? 0;
}

export function calculateContractPmScore(
  operatingSystem: string | undefined,
  checklistConfig: PmChecklistConfig | unknown
): PmScoreBreakdown {
  const config = normalizePmChecklistConfig(
    checklistConfig && typeof checklistConfig === "object" ? checklistConfig as Partial<PmChecklistConfig> : undefined
  );
  const operatingSystemScore = getOperatingSystemScore(operatingSystem);
  const categories: Record<string, number> = {};
  let categoryTotal = 0;

  for (const key of pmChecklistKeys) {
    if (!config.selectedTabs.includes(key)) {
      continue;
    }

    const setCount = Math.max(0, Math.trunc(config.setCounts[key] ?? 0));
    const points = setCount * CATEGORY_SCORE_PER_SET[key];

    if (points > 0) {
      categories[key] = points;
      categoryTotal += points;
    }
  }

  return {
    operatingSystem: operatingSystemScore,
    categories,
    total: operatingSystemScore + categoryTotal
  };
}

function enrichContractItem(contract: SiteContractItem): SiteContractItem {
  const breakdown = calculateContractPmScore(contract.operatingSystem, contract.checklistConfig);

  return {
    ...contract,
    pmScore: breakdown.total,
    pmScoreBreakdown: breakdown
  };
}

export function syncContractDetailsPmScores(
  contractDetails: SiteContractDetails,
  fallbackContractNumber = ""
): SiteContractDetails {
  const siteLike = {
    contract: fallbackContractNumber || contractDetails.contractNumber || "",
    contractDetails
  };
  const enrichedContracts = getSiteContractItems(siteLike).map(enrichContractItem);
  const primaryContract = enrichedContracts[0];

  return {
    ...contractDetails,
    contractCount: String(Math.min(6, Math.max(1, enrichedContracts.length))),
    contracts: enrichedContracts,
    pmScore: primaryContract?.pmScore ?? 0,
    pmScoreBreakdown: primaryContract?.pmScoreBreakdown
  };
}