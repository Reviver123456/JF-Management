"use client";

import type { ReactNode } from "react";
import type { ReportStatItem } from "@/components/reports/ReportStatSummary";

export function OperationalReportDocumentBody({ children }: { children: ReactNode }) {
  return <div className="templateBody operationalDocBody">{children}</div>;
}

export type OperationalDocSummaryItem = ReportStatItem & {
  emphasis?: "metric" | "meta";
};

export function OperationalReportDocumentSummary({
  items
}: {
  items: OperationalDocSummaryItem[];
}) {
  return (
    <section className="operationalDocSummaryGrid">
      {items.map((item) => (
        <article
          className={[
            "operationalDocSummaryItem",
            item.emphasis === "metric" ? "isMetric" : "",
            item.tone === "success" ? "success" : "",
            item.tone === "warning" ? "warning" : ""
          ].filter(Boolean).join(" ")}
          key={item.label}
        >
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </section>
  );
}

export function OperationalReportSectionHead({
  title
}: {
  title: string;
}) {
  return (
    <header className="operationalDocSectionHead">
      <strong>{title}</strong>
    </header>
  );
}

export function OperationalReportDocumentTable({
  children,
  emptyMessage
}: {
  children: ReactNode;
  emptyMessage?: string;
}) {
  if (emptyMessage) {
    return <p className="operationalDocEmpty">{emptyMessage}</p>;
  }

  return (
    <div className="operationalDocTableWrap">
      <table className="operationalDocTable">{children}</table>
    </div>
  );
}

export function OperationalReportDocStatus({
  label,
  status
}: {
  label: string;
  status: "abnormal" | "completed" | "inProgress" | "pending";
}) {
  return <span className={`operationalDocStatus ${status}`}>{label}</span>;
}

export function OperationalReportDocumentFooter({
  generatedLabel,
  generatedValue,
  line
}: {
  generatedLabel: string;
  generatedValue: string;
  line: string;
}) {
  return (
    <footer className="operationalDocFooter">
      <span>{line}</span>
      <span>
        {generatedLabel}: {generatedValue}
      </span>
    </footer>
  );
}
