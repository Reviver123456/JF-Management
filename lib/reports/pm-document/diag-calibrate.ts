import type { PmWorkDetails, ReportRow, SavedChecklistBlock, SiteCatalogRecord } from "@/lib/pm-data";
import { getReportFieldValue } from "@/lib/reports/pm-document/field-utils";
import type { DiagCalibrateBlockEntry } from "@/lib/reports/pm-document/types";

export function isDiagCalibrateBlock(block: SavedChecklistBlock) {
  return block.type === "fields" && block.title.toLowerCase().startsWith("calibrate: monitor");
}

export function isFirstDiagCalibrateBlock(blocks: SavedChecklistBlock[], blockIndex: number) {
  return blocks.findIndex(isDiagCalibrateBlock) === blockIndex;
}

export function getDiagCalibrateBlocks(blocks: SavedChecklistBlock[]): DiagCalibrateBlockEntry[] {
  return blocks
    .map((block, blockIndex) => ({ block, blockIndex }))
    .filter((entry): entry is DiagCalibrateBlockEntry => isDiagCalibrateBlock(entry.block));
}

export function getDiagMonitorNumber(title: string) {
  return title.match(/monitor\s*(\d+)/i)?.[1] ?? "";
}

export function diagCalibrateStatusKey(groupKey: string, setTitle: string, blockIndex: number, title: string) {
  return `${groupKey}:calibrate-status:${setTitle}:${blockIndex}:${title}`;
}

export function normalizeCalibrateLabel(label: string) {
  return label
    .replace(/\s+/g, " ")
    .replace(/Â²/g, "²")
    .trim()
    .toLowerCase();
}

export function getDiagCalibrateValue({
  details,
  entry,
  fieldMatcher,
  groupKey,
  row,
  setTitle,
  site
}: {
  details: PmWorkDetails | undefined;
  entry: DiagCalibrateBlockEntry;
  fieldMatcher: (normalizedLabel: string) => boolean;
  groupKey: string;
  row: ReportRow;
  setTitle: string;
  site: SiteCatalogRecord | null;
}) {
  const field = entry.block.fields.find((candidate) => fieldMatcher(normalizeCalibrateLabel(candidate.label)));

  if (!field) {
    return "";
  }

  return getReportFieldValue({
    blockIndex: entry.blockIndex,
    details,
    field,
    groupKey,
    row,
    setTitle,
    site
  });
}