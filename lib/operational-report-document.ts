import type { Lang } from "@/lib/i18n";
import type { ReportPeriodRange } from "@/lib/report-period";

export function formatOperationalReportDate(lang: Lang, date = new Date()) {
  return date.toLocaleDateString(lang === "th" ? "th-TH" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function getOperationalReportRefCode(kind: "plan" | "site") {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${kind === "plan" ? "PLN" : "STE"}-${stamp.slice(2)}`;
}

export function getOperationalPeriodTypeLabel(
  lang: Lang,
  periodRange: ReportPeriodRange | null
) {
  if (!periodRange) {
    return "-";
  }

  const labels: Record<string, { en: string; th: string }> = {
    daily: { th: "รายวัน", en: "Daily" },
    monthly: { th: "รายเดือน", en: "Monthly" },
    yearly: { th: "รายปี", en: "Yearly" }
  };

  const entry = labels[periodRange.period] ?? labels.monthly;
  return lang === "th" ? entry.th : entry.en;
}
