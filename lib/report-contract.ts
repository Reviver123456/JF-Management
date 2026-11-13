import { getSiteContractItems, type SiteCatalogRecord } from "@/lib/pm-data";

export const ALL_CONTRACTS_INDEX = -1;

export function isAllContractsIndex(contractIndex: number) {
  return contractIndex === ALL_CONTRACTS_INDEX;
}

export function resolveReportContractIndices(
  site: Pick<SiteCatalogRecord, "contract" | "contractDetails"> | null | undefined,
  contractIndex: number
) {
  const contracts = getSiteContractItems(site);

  if (contracts.length === 0) {
    return [0];
  }

  if (isAllContractsIndex(contractIndex)) {
    return contracts.map((_, index) => index);
  }

  return [Math.min(Math.max(contractIndex, 0), contracts.length - 1)];
}
