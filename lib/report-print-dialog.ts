import {
  getReportExportFontLinks,
  getReportPrintFontStyles
} from "@/lib/report-export";
import { escapeHtml, sanitizeStylesForInlineHtml } from "@/lib/report-html-utils";

function getWordOfficeXml() {
  return `<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->`;
}

function getExcelOfficeXml() {
  return `<!--[if gte mso 9]>
<xml>
  <x:ExcelWorkbook>
    <x:ExcelWorksheets>
      <x:ExcelWorksheet>
        <x:Name>Report</x:Name>
        <x:WorksheetOptions>
          <x:Print>
            <x:ValidPrinterInfo/>
            <x:PaperSizeIndex>9</x:PaperSizeIndex>
          </x:Print>
        </x:WorksheetOptions>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->`;
}

function getOfficeExportStyles(exportType: "word" | "excel") {
  const officeRootClass = exportType === "excel" ? "excelExportRoot" : "wordExportRoot";

  return `
.officeExportRoot {
  width: 100%;
  max-width: 210mm;
  margin: 0 auto;
  background: #ffffff !important;
  box-sizing: border-box;
}

.officeExportRoot .reportDocumentStack {
  display: block !important;
  padding: 0 !important;
}

.officeExportRoot .templateSheet {
  width: 100% !important;
  max-width: 100% !important;
  min-height: unset !important;
  margin: 0 auto !important;
  padding: 0 !important;
  box-shadow: none !important;
  box-sizing: border-box;
  page-break-after: always;
  break-after: page;
  mso-page-orientation: portrait;
}

.officeExportRoot .templateSheet.operationalReportSheet {
  page-break-after: auto;
  break-after: auto;
}

.officeExportRoot .templateSheet:last-child {
  page-break-after: auto;
  break-after: auto;
}

.officeExportRoot .templateTable,
.officeExportRoot table {
  border-collapse: collapse;
}

.officeExportRoot img {
  max-width: 100%;
}

.${officeRootClass} * {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}`;
}

export function getPrintableStyles() {
  const appStyles = sanitizeStylesForInlineHtml(Array.from(document.styleSheets).flatMap((sheet) => {
    try {
      return Array.from(sheet.cssRules).map((rule) => rule.cssText);
    } catch {
      return [];
    }
  }).join("\n"));

  return `${appStyles}
@page {
  size: A4 portrait;
  margin: 10mm 12mm 14mm 12mm;
}

@page {
  @bottom-right {
    color: #5b6f8f;
    content: counter(page);
    font-family: "Prompt", "Noto Sans Thai", sans-serif;
    font-size: 8.5pt;
    font-weight: 600;
  }
}

@page :blank {
  @bottom-right {
    content: none;
  }
}

html,
body {
  margin: 0;
  padding: 0;
  background: #ffffff !important;
}

.printReportRoot {
  width: 100%;
  max-width: 210mm;
  margin: 0 auto;
  background: #ffffff !important;
  box-sizing: border-box;
}

.printReportRoot .reportDocumentStack {
  display: block !important;
  width: 100% !important;
  max-width: 100% !important;
  padding: 0 !important;
}

.printReportRoot .templateSheet {
  width: 100% !important;
  max-width: 100% !important;
  min-height: 297mm;
  margin: 0 auto !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  page-break-after: always;
  break-after: page;
  box-sizing: border-box;
}

.printReportRoot .templateSheet.operationalReportSheet {
  min-height: unset !important;
  page-break-after: auto;
  break-after: auto;
}

.printReportRoot .templateSheet:last-child {
  page-break-after: auto;
  break-after: auto;
}

.printReportRoot .operationalDocTableWrap {
  overflow: visible !important;
}

.printReportRoot .operationalDocTable thead {
  display: table-header-group !important;
}

.printReportRoot .operationalDocTable tr {
  break-inside: avoid-page;
  page-break-inside: avoid;
}

.printReportRoot .operationalDocFooter {
  break-inside: avoid-page;
  page-break-inside: avoid;
}

.printReportRoot * {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.printReportRoot .signatureGrid,
.printReportRoot .coverSignatureCard {
  break-inside: avoid;
  page-break-inside: avoid;
}

.printReportRoot .coverSignatureSlot {
  min-height: 54px;
  padding-bottom: 4px;
}

.printReportRoot .coverSignatureSlot img {
  display: block;
  max-width: 100%;
  max-height: 50px;
  object-fit: contain;
}

.printReportRoot .coverSignatureRule {
  width: 100%;
  height: 0;
  border-bottom: 1px solid #000000;
}

.printReportRoot .operationalReportPrintArea {
  padding: 0;
}

.printReportRoot .operationalReportPrintHeader {
  margin-bottom: 12px;
}

.printReportRoot .operationalReportPrintHeader h2 {
  margin: 0 0 4px;
  font-size: 18px;
}

.printReportRoot .operationalReportPrintHeader p {
  margin: 0;
  color: #4b5563;
  font-size: 12px;
}

.printReportRoot .templateBrandHeaderSheetCenter {
  position: relative !important;
  display: block !important;
  width: 100% !important;
  min-height: 58px !important;
  margin-bottom: 2px !important;
}

.printReportRoot .reportBrandLogoSlot {
  position: absolute !important;
  left: 0 !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
}

.printReportRoot .reportBrandTitleCenter {
  position: absolute !important;
  left: 50% !important;
  top: 50% !important;
  z-index: 1 !important;
  transform: translate(-50%, -50%) !important;
  width: max-content !important;
  max-width: min(100%, calc(100% - 280px)) !important;
  margin: 0 !important;
  text-align: center !important;
}

.printReportRoot .operationalDocPeriodCard.reportBrandAside,
.printReportRoot .reportBrandAside {
  position: absolute !important;
  right: 0 !important;
  top: 50% !important;
  z-index: 2 !important;
  transform: translateY(-50%) !important;
  width: auto !important;
  max-width: min(42vw, 220px) !important;
  align-items: flex-end !important;
  text-align: right !important;
}

.printReportRoot .operationalDocOwnerSummary {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  column-gap: 20px !important;
  row-gap: 14px !important;
}

.printReportRoot .operationalDocOwnerSummarySet {
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
  min-width: 0 !important;
  padding-bottom: 12px !important;
  border-bottom: 1px dashed #cfe0f7 !important;
}

.printReportRoot .operationalDocOwnerSummarySet:nth-last-child(-n + 2) {
  border-bottom: 0 !important;
  padding-bottom: 0 !important;
}

.printReportRoot .operationalDocOwnerSummarySet:last-child:nth-child(odd) {
  border-bottom: 0 !important;
  padding-bottom: 0 !important;
}

.printReportRoot .operationalDocOwnerSummarySet .operationalDocOwnerSummaryLine {
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  gap: 3px !important;
  width: 100% !important;
  text-align: left !important;
}`;
}

export function buildPdfPrintHtml(content: string, title: string) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <base href="${typeof window !== "undefined" ? window.location.origin : ""}">
    <title>${escapeHtml(title)}</title>
    ${getReportExportFontLinks()}
    <style>${getPrintableStyles()}${getReportPrintFontStyles()}</style>
  </head>
  <body>
    <main class="reportsPage printReportRoot">${content}</main>
  </body>
</html>`;
}

export function buildOfficeExportHtml(content: string, title: string, exportType: "word" | "excel") {
  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns:x="urn:schemas-microsoft-com:office:excel">
  <head>
    <meta charset="utf-8">
    <base href="${typeof window !== "undefined" ? window.location.origin : ""}">
    <title>${escapeHtml(title)}</title>
    ${getReportExportFontLinks()}
    ${exportType === "word" ? getWordOfficeXml() : getExcelOfficeXml()}
    <style>${getPrintableStyles()}${getReportPrintFontStyles()}${getOfficeExportStyles(exportType)}</style>
  </head>
  <body>
    <main class="reportsPage printReportRoot officeExportRoot ${exportType === "excel" ? "excelExportRoot" : "wordExportRoot"}">${content}</main>
  </body>
</html>`;
}

function scheduleReportPrint({
  frameDocument,
  frameWindow,
  onRestored,
  title
}: {
  frameDocument: Document;
  frameWindow: Window;
  onRestored: () => void;
  title: string;
}) {
  const triggerPrint = () => {
    frameDocument.title = title;
    frameWindow.focus();
    frameWindow.print();
  };

  const waitForImages = Array.from(frameDocument.images).map((image) => (
    image.complete
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      })
  ));

  const waitForFonts = frameDocument.fonts?.ready ?? Promise.resolve();

  const handleAfterPrint = () => {
    onRestored();

    if (frameWindow.opener) {
      frameWindow.close();
    }
  };

  frameWindow.addEventListener("afterprint", handleAfterPrint, { once: true });

  void Promise.all([waitForFonts, ...waitForImages]).then(() => {
    window.setTimeout(triggerPrint, 350);
  });
}

let reportPrintFrame: HTMLIFrameElement | null = null;

function getReportPrintFrame() {
  if (typeof document === "undefined") {
    throw new Error("document is not available");
  }

  if (reportPrintFrame?.isConnected) {
    return reportPrintFrame;
  }

  reportPrintFrame = document.createElement("iframe");
  reportPrintFrame.setAttribute("title", "PM report print");
  reportPrintFrame.setAttribute("aria-hidden", "true");
  reportPrintFrame.style.position = "fixed";
  reportPrintFrame.style.left = "-10000px";
  reportPrintFrame.style.top = "0";
  reportPrintFrame.style.width = "210mm";
  reportPrintFrame.style.height = "297mm";
  reportPrintFrame.style.border = "0";
  reportPrintFrame.style.opacity = "0";
  reportPrintFrame.style.pointerEvents = "none";
  document.body.appendChild(reportPrintFrame);
  return reportPrintFrame;
}

export function printReportPdf(content: string, title: string): boolean {
  if (!content.trim() || typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  const printableHtml = buildPdfPrintHtml(content, title);
  const previousDocumentTitle = document.title;
  const restoreDocumentTitle = () => {
    document.title = previousDocumentTitle;
  };

  document.title = title;

  const printFrame = getReportPrintFrame();
  const frameWindow = printFrame.contentWindow;
  const frameDocument = printFrame.contentDocument ?? frameWindow?.document;

  if (frameWindow && frameDocument) {
    printFrame.setAttribute("title", title);
    frameDocument.open();
    frameDocument.write(printableHtml);
    frameDocument.close();
    frameDocument.title = title;

    scheduleReportPrint({
      frameDocument,
      frameWindow,
      title,
      onRestored: () => {
        restoreDocumentTitle();
        printFrame.setAttribute("title", "PM report print");
      }
    });

    return true;
  }

  const printWindow = window.open("", "_blank", "width=1200,height=900");

  if (!printWindow) {
    document.title = previousDocumentTitle;
    return false;
  }

  printWindow.document.open();
  printWindow.document.write(printableHtml);
  printWindow.document.close();
  printWindow.document.title = title;

  scheduleReportPrint({
    frameDocument: printWindow.document,
    frameWindow: printWindow,
    title,
    onRestored: restoreDocumentTitle
  });

  return true;
}
