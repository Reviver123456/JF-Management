"use client";

import { type ReactNode, type RefObject, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useUi } from "@/lib/i18n";
import { useReportPreviewScale } from "@/lib/use-report-preview-scale";
import {
  OperationalReportExportFeedback,
  OperationalReportToolbarActions,
  useOperationalReportExport
} from "@/components/reports/OperationalReportExportBar";
import {
  OperationalReportFilters,
  type OperationalReportFilterProps
} from "@/components/reports/OperationalReportFilters";

export function OperationalReportPreviewLayout({
  disabled = false,
  documentNode,
  exportFileTitle,
  filterProps,
  headerSubtitle,
  headerTitle,
  listNode
}: {
  disabled?: boolean;
  documentNode: ReactNode;
  exportFileTitle: string;
  filterProps: OperationalReportFilterProps;
  headerSubtitle: string;
  headerTitle: string;
  listNode: ReactNode;
}) {
  const { t } = useUi();
  const [previewOpen, setPreviewOpen] = useState(false);
  const { viewportRef, scaleShellRef, documentRef } = useReportPreviewScale(previewOpen && !disabled);
  const exportState = useOperationalReportExport({
    disabled,
    exportFileTitle,
    printAreaRef: documentRef as RefObject<HTMLDivElement | null>
  });

  const openPreview = () => {
    if (disabled) {
      return;
    }

    exportState.clearExportMessage();
    setPreviewOpen(true);
  };

  const toolbarActions = (
    <OperationalReportToolbarActions
      disabled={disabled}
      showPreviewButton={!previewOpen}
      onExport={exportState.downloadReport}
      onSendEmail={exportState.sendReportEmail}
      onPreview={previewOpen ? undefined : openPreview}
    />
  );

  const documentViewport = (
    <div
      ref={viewportRef}
      className={previewOpen ? "reportPreviewViewport operationalReportPreviewViewport" : "reportDocumentHidden"}
      aria-hidden={!previewOpen}
    >
      <div ref={scaleShellRef} className="reportPreviewScaleShell">
        <div ref={documentRef} className="reportDocumentStack">
          <section className="templateSheet operationalReportSheet">
            {documentNode}
          </section>
        </div>
      </div>
    </div>
  );

  const exportFeedback = (
    <OperationalReportExportFeedback
      exportHint={exportState.exportHint}
      exportMessage={exportState.exportMessage}
    />
  );

  if (previewOpen) {
    return (
      <div className="reportEditorPage reportEditorPagePreview operationalReportEditor">
        <header className="reportEditorHeader reportEditorHeaderPreview">
          <button
            aria-label={t("common.back")}
            className="reportEditorBackButton"
            type="button"
            onClick={() => setPreviewOpen(false)}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="reportEditorHeaderMain">
            <h1>{headerTitle}</h1>
            <p>{headerSubtitle}</p>
          </div>
          <div className="reportEditorHeaderActions">
            {toolbarActions}
          </div>
        </header>
        {exportFeedback}
        {documentViewport}
      </div>
    );
  }

  return (
    <>
      <section className="toolbar reportToolbar operationalReportToolbar operationalReportToolbarWithActions">
        <OperationalReportFilters {...filterProps} embedded />
        {toolbarActions}
      </section>
      {exportFeedback}
      <div className="reportAnalyticsPanel">
        {listNode}
      </div>
      {documentViewport}
    </>
  );
}
