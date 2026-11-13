export type ReportSection = "pm" | "plan" | "site";

export const REPORT_SECTIONS: ReportSection[] = ["pm", "plan", "site"];

export function parseReportSection(value: string | null | undefined): ReportSection {
  if (value && REPORT_SECTIONS.includes(value as ReportSection)) {
    return value as ReportSection;
  }

  return "pm";
}

export function reportSectionHref(section: ReportSection) {
  return `/reports?section=${section}`;
}
