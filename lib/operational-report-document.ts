import type { Lang } from "@/lib/i18n";

export function formatOperationalReportDate(lang: Lang, date = new Date()) {
  return date.toLocaleDateString(lang === "th" ? "th-TH" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}