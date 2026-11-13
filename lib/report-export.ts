import { REPORT_PAGE_WIDTH } from "@/lib/use-report-preview-scale";

export const REPORT_PRINT_FONT_FAMILY = '"Prompt", "Noto Sans Thai", sans-serif';

export function getReportExportFontLinks() {
  return `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Prompt:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">
`.trim();
}

export function getReportPrintFontStyles() {
  return `
html,
body,
.printReportRoot,
.printReportRoot .templateSheet,
.officeExportRoot,
.officeExportRoot .templateSheet {
  font-family: ${REPORT_PRINT_FONT_FAMILY} !important;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.printReportRoot .templateSheet {
  font-size: 10.5px;
  color: #0f2147;
}
`.trim();
}

export function sanitizeExportFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim() || "pm-report";
}

export function getReportHospitalName(row: { customer: string; site: string }) {
  return row.customer.trim() || row.site.trim();
}

export function getReportExportTitle(row: { customer: string; site: string }) {
  return sanitizeExportFileName(getReportHospitalName(row));
}

export function downloadBlobFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function getReportExportHtml(documentNode: HTMLDivElement | null) {
  if (!documentNode) {
    return "";
  }

  const clone = documentNode.cloneNode(true) as HTMLDivElement;
  clone.style.transform = "none";
  clone.style.transformOrigin = "";
  clone.style.width = "100%";
  clone.style.maxWidth = `${REPORT_PAGE_WIDTH}px`;

  clone.querySelectorAll<HTMLElement>("[style]").forEach((element) => {
    element.style.removeProperty("transform");
    element.style.removeProperty("transform-origin");
  });

  return clone.innerHTML.trim();
}

export function prepareOfficeExportContentSync(content: string) {
  if (!content.trim()) {
    return "";
  }

  const container = document.createElement("div");
  container.innerHTML = content;

  container.querySelectorAll("img").forEach((image) => {
    const source = image.getAttribute("src");
    image.removeAttribute("srcset");
    image.removeAttribute("sizes");

    if (!source) {
      return;
    }

    try {
      image.setAttribute("src", new URL(source, window.location.origin).href);
    } catch {
      image.setAttribute("src", source);
    }
  });

  return container.innerHTML;
}
