"use client";

import { useCallback, useEffect, useId, useRef, useState, type RefObject } from "react";
import { ChevronDown, Download, Eye, Mail } from "lucide-react";
import { useUi } from "@/lib/i18n";
import {
  downloadBlobFile,
  getReportExportHtml,
  prepareOfficeExportContentSync,
  sanitizeExportFileName
} from "@/lib/report-export";
import { REPORT_EMAIL_RECIPIENT, sendReportByEmail } from "@/lib/report-delivery";
import { buildOfficeExportHtml, printReportPdf } from "@/lib/report-print-dialog";

export type OperationalReportFileType = "pdf" | "word" | "excel";

export function useOperationalReportExport({
  disabled,
  exportFileTitle,
  printAreaRef
}: {
  disabled?: boolean;
  exportFileTitle: string;
  printAreaRef: RefObject<HTMLDivElement | null>;
}) {
  const { t } = useUi();
  const [exportMessage, setExportMessage] = useState("");
  const [exportHint, setExportHint] = useState(false);
  const fileStem = sanitizeExportFileName(exportFileTitle);

  const getExportContent = useCallback(() => {
    const raw = getReportExportHtml(printAreaRef.current);
    return prepareOfficeExportContentSync(raw);
  }, [printAreaRef]);

  const openPrintDialog = useCallback((forPdfDownload: boolean) => {
    const content = getExportContent();

    if (!content) {
      setExportHint(false);
      setExportMessage(t("reports.exportEmpty"));
      return false;
    }

    const didPrint = printReportPdf(content, fileStem);

    if (!didPrint) {
      setExportHint(false);
      setExportMessage(t("reports.exportPrintFailed"));
      return false;
    }

    if (forPdfDownload) {
      setExportHint(true);
      setExportMessage(t("reports.reportExportHint").replace("{title}", fileStem));
    } else {
      setExportHint(false);
      setExportMessage("");
    }

    return true;
  }, [fileStem, getExportContent, t]);

  const sendReportEmail = useCallback(async () => {
    if (disabled) {
      return;
    }

    const content = getExportContent();

    if (!content) {
      setExportHint(false);
      setExportMessage(t("reports.exportEmpty"));
      return;
    }

    setExportHint(false);

    try {
      const result = await sendReportByEmail({ title: fileStem, htmlContent: content });

      if (result === "sent") {
        setExportHint(true);
        setExportMessage(t("reports.sendEmailSuccess").replace("{email}", REPORT_EMAIL_RECIPIENT));
        return;
      }

      setExportHint(true);
      setExportMessage(t("reports.sendEmailComingSoon").replace("{email}", REPORT_EMAIL_RECIPIENT));
    } catch {
      setExportMessage(t("reports.sendEmailFailed"));
    }
  }, [disabled, fileStem, getExportContent, t]);

  const downloadReport = useCallback((downloadType: OperationalReportFileType) => {
    if (disabled) {
      return;
    }

    try {
      setExportHint(false);

      if (downloadType === "pdf") {
        openPrintDialog(true);
        return;
      }

      const content = getExportContent();

      if (!content) {
        setExportMessage(t("reports.exportEmpty"));
        return;
      }

      const isExcel = downloadType === "excel";
      const extension = isExcel ? "xls" : "doc";
      const mimeType = isExcel
        ? "application/vnd.ms-excel;charset=utf-8"
        : "application/msword;charset=utf-8";
      const blob = new Blob([
        "\ufeff",
        buildOfficeExportHtml(content, fileStem, isExcel ? "excel" : "word")
      ], { type: mimeType });
      downloadBlobFile(blob, `${fileStem}.${extension}`);
      setExportMessage("");
    } catch {
      setExportMessage(t("reports.exportDownloadFailed"));
    }
  }, [disabled, fileStem, getExportContent, openPrintDialog, t]);

  const clearExportMessage = useCallback(() => {
    setExportMessage("");
    setExportHint(false);
  }, []);

  return {
    clearExportMessage,
    downloadReport,
    exportHint,
    exportMessage,
    sendReportEmail
  };
}

function OperationalReportFormatMenu({
  disabled,
  onSelect
}: {
  disabled?: boolean;
  onSelect: (type: OperationalReportFileType) => void;
}) {
  const { t } = useUi();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="reportExportMenu" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        className="button subtle operationalReportToolbarMenu"
        disabled={disabled}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <Download size={16} />
        {t("reports.exportAction")}
        <ChevronDown className={open ? "reportExportMenuChevron open" : "reportExportMenuChevron"} size={16} />
      </button>
      {open ? (
        <div className="reportExportMenuPanel" id={menuId} role="menu">
          {(["pdf", "word", "excel"] as const).map((type) => (
            <button
              className="reportExportMenuItem"
              key={type}
              role="menuitem"
              type="button"
              onClick={() => {
                onSelect(type);
                setOpen(false);
              }}
            >
              {type === "pdf" ? "PDF" : type === "word" ? "Word" : "Excel"}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function OperationalReportToolbarActions({
  disabled = false,
  onExport,
  onPreview,
  onSendEmail,
  showPreviewButton = true
}: {
  disabled?: boolean;
  onExport: (type: OperationalReportFileType) => void;
  onPreview?: () => void;
  onSendEmail: () => void;
  showPreviewButton?: boolean;
}) {
  const { t } = useUi();

  return (
    <div className="operationalReportToolbarActions">
      <button className="button subtle" disabled={disabled} type="button" onClick={onSendEmail}>
        <Mail size={16} />
        {t("reports.sendEmail")}
      </button>
      <OperationalReportFormatMenu disabled={disabled} onSelect={onExport} />
      {showPreviewButton && onPreview ? (
        <button className="button primary" disabled={disabled} type="button" onClick={onPreview}>
          <Eye size={16} />
          {t("reports.preview")}
        </button>
      ) : null}
    </div>
  );
}

export function OperationalReportExportFeedback({
  exportHint,
  exportMessage
}: {
  exportHint: boolean;
  exportMessage: string;
}) {
  if (!exportMessage) {
    return null;
  }

  return (
    <p className={exportHint ? "reportExportMessage reportExportHint" : "reportExportMessage"}>
      {exportMessage}
    </p>
  );
}
