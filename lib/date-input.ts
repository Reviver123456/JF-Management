export const BUDDHIST_ERA_OFFSET = 543;

export type DateInputLang = "th" | "en";

export function usesBuddhistEra(lang: DateInputLang) {
  return lang === "th";
}

export function toDisplayYear(ceYear: number, lang: DateInputLang) {
  if (!Number.isFinite(ceYear)) {
    return ceYear;
  }

  return usesBuddhistEra(lang) ? ceYear + BUDDHIST_ERA_OFFSET : ceYear;
}

export function toStorageYear(displayYear: number, lang: DateInputLang) {
  if (!Number.isFinite(displayYear)) {
    return displayYear;
  }

  if (!usesBuddhistEra(lang)) {
    return displayYear;
  }

  // Thai UI: 4-digit years from 2400 upward are treated as พ.ศ.
  if (displayYear >= 2400) {
    return displayYear - BUDDHIST_ERA_OFFSET;
  }

  return displayYear;
}

export function formatDateInputValue(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function formatDisplayDate(day: string, month: string, ceYear: string, lang: DateInputLang) {
  const displayYear = toDisplayYear(Number(ceYear), lang);
  return `${day}/${month}/${String(displayYear).padStart(4, "0")}`;
}

export function normalizeStoredDateValue(value: string, lang: DateInputLang = "en") {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const year = match?.[1];
    const month = match?.[2];
    const day = match?.[3];

    return year && month && day ? formatDisplayDate(day, month, year, lang) : trimmed;
  }

  const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (slashMatch) {
    const [, day, month, ceYear] = slashMatch;
    return formatDisplayDate(day, month, ceYear, lang);
  }

  if (/^\d+$/.test(trimmed) || trimmed.includes("/")) {
    return formatDateInputValue(trimmed);
  }

  return trimmed;
}

export function parseDateInputValue(raw: string, lang: DateInputLang = "en") {
  const trimmed = raw.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  const formatted = formatDateInputValue(trimmed);
  const slashMatch = formatted.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!slashMatch) {
    return formatted;
  }

  const [, day, month, displayYear] = slashMatch;
  const ceYear = toStorageYear(Number(displayYear), lang);

  return `${day}/${month}/${String(ceYear).padStart(4, "0")}`;
}

export function isDateLikeField(field: { label: string; type?: string; placeholder?: string }) {
  return field.type === "date"
    || field.placeholder === "DD/MM/YYYY"
    || /date/i.test(field.label);
}
