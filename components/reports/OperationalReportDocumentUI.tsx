"use client";

import type { ReactNode } from "react";

export function OperationalReportDocumentBody({ children }: { children: ReactNode }) {
  return <div className="templateBody operationalDocBody">{children}</div>;
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
