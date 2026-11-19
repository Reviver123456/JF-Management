import { getDisplayPmOrderNo } from "@/lib/pm-order-no";
import type {
  PmWorkDetails,
  ReportRow,
  SavedChecklistBlock,
  SavedChecklistField,
  SavedSparePart,
  SiteCatalogRecord
} from "@/lib/pm-data";
import type { FieldRow, ReportField } from "@/lib/reports/pm-document/types";

export function stripFieldColon(label: string) {
  return label.trim().replace(/\s*:$/, "");
}

export function formatFieldLabel(label: string) {
  const trimmedLabel = label.trim();
  return trimmedLabel.endsWith(":") ? trimmedLabel : `${trimmedLabel} :`;
}

export function fieldKey(groupKey: string, setTitle: string, blockIndex: number, label: string) {
  return `${groupKey}:field:${setTitle}:${blockIndex}:${label}`;
}

export function radioKey(groupKey: string, setTitle: string, blockIndex: number, label: string) {
  return `${groupKey}:radio:${setTitle}:${blockIndex}:${label}`;
}

export function checkKey(resultPrefix: string, title: string, item: string) {
  return `${resultPrefix}:${title}:${item}`;
}

export function chunkReportFields(fields: ReportField[]): FieldRow[] {
  const rows: FieldRow[] = [];

  for (let index = 0; index < fields.length; index += 2) {
    rows.push(fields.slice(index, index + 2));
  }

  return rows;
}

export function formatSparePart(part: SavedSparePart | undefined) {
  if (!part) {
    return "";
  }

  return [part.name, part.quantity ? `(${part.quantity})` : "", part.note].filter(Boolean).join(" ");
}

export function formatFreeTotalDetail(freeValue: string, totalValue: string) {
  return freeValue || totalValue ? `Free/Total(GB) ${freeValue}/${totalValue}` : "";
}

export function formatDefinitionDate(value: string) {
  const dateParts = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return dateParts ? `${dateParts[3]}/${dateParts[2]}/${dateParts[1]}` : value;
}

export function getSavedFieldValueByLabel(
  details: PmWorkDetails | undefined,
  groupKey: string,
  setTitle: string,
  label: string
) {
  return getSavedFieldValueByLabels(details, groupKey, setTitle, [label]);
}

export function getSavedFieldValueByLabels(
  details: PmWorkDetails | undefined,
  groupKey: string,
  setTitle: string,
  labels: string[]
) {
  const fieldValues = details?.fieldValues;

  if (!fieldValues) {
    return "";
  }

  const keyPrefix = `${groupKey}:field:${setTitle}:`;

  for (const label of labels) {
    const keySuffix = `:${label}`;
    const value = Object.entries(fieldValues).find(([key]) => key.startsWith(keyPrefix) && key.endsWith(keySuffix))?.[1] ?? "";

    if (value) {
      return value;
    }
  }

  return "";
}

export function getSynapseChecklistDetail(
  details: PmWorkDetails | undefined,
  groupKey: string,
  setTitle: string,
  item: string
) {
  if (groupKey !== "synapse") {
    return null;
  }

  const normalizedItem = item.trim().toLowerCase();

  if (normalizedItem === "free space capacity: database o:") {
    return formatFreeTotalDetail(
      getSavedFieldValueByLabel(details, groupKey, setTitle, "Database O: Free (GB)"),
      getSavedFieldValueByLabel(details, groupKey, setTitle, "Database O: Total (GB)")
    );
  }

  if (normalizedItem === "free space capacity: warm database") {
    return formatFreeTotalDetail(
      getSavedFieldValueByLabel(details, groupKey, setTitle, "Warm DB Free (GB)"),
      getSavedFieldValueByLabel(details, groupKey, setTitle, "Warm DB Total (GB)")
    );
  }

  if (normalizedItem === "antivirus definition" || normalizedItem === "antivirus definition date") {
    const definitionDate = getSavedFieldValueByLabels(details, groupKey, setTitle, ["Antivirus Definition Date", "Definition Date"]);
    return ["Definition Date", formatDefinitionDate(definitionDate)].filter(Boolean).join(" ");
  }

  return null;
}

export function getChecklistDetail({
  details,
  groupKey,
  item,
  resultKey,
  setTitle
}: {
  details: PmWorkDetails | undefined;
  groupKey: string;
  item: string;
  resultKey: string;
  setTitle: string;
}) {
  const synapseDetail = getSynapseChecklistDetail(details, groupKey, setTitle, item);

  if (synapseDetail !== null) {
    return synapseDetail;
  }

  return details?.checkNotes?.[resultKey] ?? "";
}

export function getFallbackFieldValue(label: string, row: ReportRow, site: SiteCatalogRecord | null) {
  const normalizedLabel = stripFieldColon(label).toLowerCase();

  if (normalizedLabel === "customer name") {
    return row.customer;
  }

  if (normalizedLabel === "location") {
    return site?.address || site?.department || row.province;
  }

  if (normalizedLabel === "pm order no" || normalizedLabel === "pm order no.") {
    return getDisplayPmOrderNo({
      date: row.date,
      jobId: row.jobId,
      workDetails: row.workDetails
    });
  }

  return "";
}

export function getReportFieldValue({
  blockIndex,
  details,
  field,
  groupKey,
  row,
  setTitle,
  site
}: {
  blockIndex: number;
  details: PmWorkDetails | undefined;
  field: SavedChecklistField;
  groupKey: string;
  row: ReportRow;
  setTitle: string;
  site: SiteCatalogRecord | null;
}) {
  const savedValue = details?.fieldValues?.[fieldKey(groupKey, setTitle, blockIndex, field.label)];

  if (savedValue?.trim()) {
    return savedValue;
  }

  if (field.value?.trim()) {
    return field.value;
  }

  return getFallbackFieldValue(field.label, row, site);
}

export function getReportRadioValue({
  block,
  blockIndex,
  details,
  groupKey,
  setTitle
}: {
  block: Extract<SavedChecklistBlock, { type: "radios" }>;
  blockIndex: number;
  details: PmWorkDetails | undefined;
  groupKey: string;
  setTitle: string;
}) {
  return details?.radioValues?.[radioKey(groupKey, setTitle, blockIndex, block.label)] ?? block.items[0] ?? "";
}

export function shouldSkipReportBlock(groupKey: string, block: SavedChecklistBlock) {
  if (groupKey !== "diag") {
    return false;
  }

  return (block.type === "fields" && (block.title === "DIAG INFORMATION" || block.title === "DEFINITION DATE"))
    || (block.type === "radios" && block.label === "Antivirus");
}

export function shouldHideReportFieldBlock(groupKey: string, block: Extract<SavedChecklistBlock, { type: "fields" }>) {
  return groupKey === "synapse" && block.title === "FREE SPACE (GB)";
}

export function getVisibleReportFields(groupKey: string, block: Extract<SavedChecklistBlock, { type: "fields" }>) {
  if (groupKey === "synapse") {
    return block.fields.filter((field) => field.label !== "Antivirus Definition Date");
  }

  return block.fields;
}