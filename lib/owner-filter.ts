import { normalizeOwnerName } from "@/lib/pm-data";

export const ALL_OWNERS_VALUE = "__all";

export function isAllOwners(activeOwner: string | null | undefined) {
  return activeOwner === ALL_OWNERS_VALUE;
}

export function resolveActiveOwner({
  selectedOwner = "",
  ownerParam = "",
  userName = "",
  defaultToUser = true
}: {
  selectedOwner?: string;
  ownerParam?: string;
  userName?: string;
  defaultToUser?: boolean;
}) {
  if (selectedOwner) {
    return selectedOwner;
  }

  if (ownerParam) {
    return ownerParam;
  }

  if (defaultToUser && userName) {
    return userName;
  }

  return ALL_OWNERS_VALUE;
}

export function buildUniqueOwnerOptions(...ownerLists: string[][]) {
  const seenOwners = new Set<string>();

  return ownerLists
    .flat()
    .map((owner) => owner.trim())
    .filter((owner) => {
      const normalizedOwner = normalizeOwnerName(owner);

      if (!normalizedOwner || seenOwners.has(normalizedOwner)) {
        return false;
      }

      seenOwners.add(normalizedOwner);
      return true;
    });
}

export function buildOwnerQuery(activeOwner: string) {
  if (!activeOwner) {
    return "";
  }

  return `owner=${encodeURIComponent(activeOwner)}`;
}

export function appendOwnerQuery(path: string, activeOwner: string) {
  const ownerQuery = buildOwnerQuery(activeOwner);

  if (!ownerQuery) {
    return path;
  }

  return path.includes("?") ? `${path}&${ownerQuery}` : `${path}?${ownerQuery}`;
}

export function readOwnerSearchParam() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("owner") ?? "";
}
