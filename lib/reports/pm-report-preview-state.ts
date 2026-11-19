import type { ReportRow, SiteCatalogRecord } from "@/lib/pm-data";
import type { ReportSection } from "@/lib/report-section-nav";

export type PreviewState = {
  contractIndex: number;
  row: ReportRow;
  section: ReportSection;
  site: SiteCatalogRecord | null;
  title: string;
};