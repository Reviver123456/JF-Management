"use client";

import { useCallback, useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { AppSelect } from "@/components/AppSelect";
import { ReportDocumentPacket } from "@/components/reports/pm-document/packet";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { useUi } from "@/lib/i18n";
import { downloadWorkPhotosZip } from "@/lib/pm-photos";
import type { PmJobRecord } from "@/lib/pm-data";
import { getSiteContractItems, getSiteContractLabel } from "@/lib/pm-data";
import { deliverReportByEmail } from "@/lib/report-email-client";
import { ALL_CONTRACTS_INDEX } from "@/lib/report-contract";
import {
  getReportExportHtml,
  getReportExportTitle,
  prepareOfficeExportContentSync
} from "@/lib/report-export";
import { printReportPdf } from "@/lib/report-print-dialog";
import type { PreviewState } from "@/lib/reports/pm-report-preview-state";
import { useReportPreviewScale } from "@/lib/use-report-preview-scale";

export type { PreviewState } from "@/lib/reports/pm-report-preview-state";

export function PmReportPreviewPage({
  onClose,
  onContractIndexChange,
  pmJobs,
  preview,
  responsibleName,
  responsibleSignature
}: {
  onClose: () => void;
  onContractIndexChange: (contractIndex: number) => void;
  pmJobs: PmJobRecord[];
  preview: PreviewState;
  responsibleName: string;
  responsibleSignature: string;
}) {
  const { t } = useUi();
  const [exportMessage, setExportMessage] = useState("");
  const [exportHint, setExportHint] = useState(false);
  const contracts = getSiteContractItems(preview.site);

  const { viewportRef, scaleShellRef, documentRef } = useReportPreviewScale(true);

  const getReportExportContent = useCallback(() => {
    return getReportExportHtml(documentRef.current);
  }, [documentRef]);

  const openReportPrintDialog = useCallback((options?: { forPdfDownload?: boolean }) => {
    const content = getReportExportContent();

    if (!content) {
      setExportHint(false);
      setExportMessage("ไม่พบเนื้อหารายงาน กรุณากดพรีวิวแล้วลองใหม่ หรือรอสักครู่แล้วลองอีกครั้ง");
      return false;
    }

    const didPrint = printReportPdf(
      prepareOfficeExportContentSync(content),
      getReportExportTitle(preview.row)
    );

    if (!didPrint) {
      setExportHint(false);
      setExportMessage("ไม่สามารถเปิดหน้าพิมพ์ได้ กรุณาลองใหม่อีกครั้ง");
      return false;
    }

    if (options?.forPdfDownload) {
      setExportHint(true);
      setExportMessage(
        `เปิดหน้าต่างพิมพ์แล้ว — เลือก Save as PDF / บันทึกเป็น PDF ชื่อไฟล์ควรเป็น "${getReportExportTitle(preview.row)}"`
      );
    } else {
      setExportHint(false);
      setExportMessage("");
    }

    return true;
  }, [getReportExportContent, preview.row]);

  const sendReportEmail = useCallback(async () => {
    const content = getReportExportContent();

    if (!content) {
      setExportHint(false);
      setExportMessage(t("reports.exportEmpty"));
      return;
    }

    const title = getReportExportTitle(preview.row);
    await deliverReportByEmail({
      htmlContent: prepareOfficeExportContentSync(content),
      setExportHint,
      setExportMessage,
      t,
      title
    });
  }, [getReportExportContent, preview.row, t]);

  const exportReportPdf = () => {
    setExportHint(false);
    openReportPrintDialog({ forPdfDownload: true });
  };

  const exportReportPhotos = () => {
    setExportHint(false);

    const didDownload = downloadWorkPhotosZip({
      archiveName: getReportExportTitle(preview.row),
      photosValue: preview.row.workDetails?.photos
    });

    if (!didDownload) {
      setExportMessage(t("reports.noPhotosToDownload"));
      return;
    }

    setExportMessage("");
  };

  return (
    <div className="reportEditorPage reportEditorPagePreview">
      <header className="reportEditorHeader reportEditorHeaderPreview">
        <button
          aria-label={t("common.back")}
          className="reportEditorBackButton"
          type="button"
          onClick={onClose}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="reportEditorHeaderMain">
          <h1>{preview.title}</h1>
          <label className="reportEditorContractField">
            <span>{t("pm.selectContract")}</span>
            <AppSelect className="select" value={String(preview.contractIndex)} onChange={(event) => onContractIndexChange(Number(event.target.value))}>
              <option value={String(ALL_CONTRACTS_INDEX)}>{t("common.all")}</option>
              {contracts.map((contract, index) => (
                <option key={index} value={index}>{getSiteContractLabel(contract, index)}</option>
              ))}
            </AppSelect>
          </label>
        </div>
        <div className="reportEditorHeaderActions">
          <button className="button subtle" type="button" onClick={sendReportEmail}>
            <Mail size={16} />
            {t("reports.sendEmail")}
          </button>
          <ReportExportMenu onExportPdf={exportReportPdf} onExportPhotos={exportReportPhotos} />
        </div>
      </header>

      {exportMessage ? (
        <p className={exportHint ? "reportExportMessage reportExportHint" : "reportExportMessage"}>{exportMessage}</p>
      ) : null}

      <div
        ref={viewportRef}
        className="reportPreviewViewport"
        aria-hidden={false}
      >
        <div ref={scaleShellRef} className="reportPreviewScaleShell">
          <div ref={documentRef} className="reportDocumentStack">
            <ReportDocumentPacket
              contractIndex={preview.contractIndex}
              pmJobs={pmJobs}
              responsibleName={responsibleName}
              responsibleSignature={responsibleSignature}
              row={preview.row}
              site={preview.site}
            />
          </div>
        </div>
      </div>
    </div>
  );
}