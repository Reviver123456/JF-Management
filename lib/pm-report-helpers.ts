import type {
  PmWorkDetails,
  SavedChecklistBlock,
  SavedChecklistGroup,
  SavedSparePart
} from "@/lib/pm-data";

export type ReportFieldRef = { label: string; value?: string };

const checklistShortTitles: Record<string, string> = {
  synapse: "Synapse",
  server: "Server",
  switch: "Switch",
  storage: "Storage",
  environment: "Environment",
  diag: "DIAG"
};

/** Spare parts with any non-empty field (same filter as report footer). */
export function getReportSpareParts(details: PmWorkDetails | undefined): SavedSparePart[] {
  return details?.spareParts?.filter((part) => part.name.trim() || part.quantity.trim() || part.note.trim()) ?? [];
}

export function isReportInfoBlock(block: Extract<SavedChecklistBlock, { type: "fields" }>) {
  return block.title.includes("INFORMATION");
}

/** Field display order on report info grids (unchanged product rules). */
export function getReportInfoFieldOrder(groupKey: string, fields: ReportFieldRef[]) {
  const fallbackOrder = fields.map((field) => field.label);
  const orders: Record<string, string[]> = {
    environment: ["Customer Name", "Location"],
    server: ["Customer Name", "Manufacturer", "S/N or S/T", "Location", "Model", "ESX Version", "Host Name", "IP Address", "MT"],
    storage: ["Customer Name", "Location", "Manufacturer", "Model", "S/N or S/T", "MT"],
    switch: ["Customer Name", "Location", "Host Name", "Brand", "Model", "S/N", "IP Address"],
    synapse: ["Customer Name", "Synapse Version", "Host Name", "License Studies", "Current Studies Per Year"]
  };
  const preferredOrder = orders[groupKey] ?? fallbackOrder;
  const knownLabels = new Set(fields.map((field) => field.label));

  return [
    ...preferredOrder.filter((label) => knownLabels.has(label)),
    ...fallbackOrder.filter((label) => !preferredOrder.includes(label))
  ];
}

export function getChecklistListLabel(key: string, title: string) {
  const shortTitle = checklistShortTitles[key] ?? title;
  return `${shortTitle} PM Checklist`;
}

/**
 * Uses saved checklist snapshot when present (report preview / PDF flow).
 * Returns null when the page should build the standard fallback packet.
 */
export function resolveReportChecklistGroups(details: PmWorkDetails | undefined): SavedChecklistGroup[] | null {
  const snapshot = details?.checklistSnapshot?.filter((group) => group.sets.length > 0);
  return snapshot && snapshot.length > 0 ? snapshot : null;
}
