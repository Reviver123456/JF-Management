"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { useUi } from "@/lib/i18n";

export function ReportExportMenu({
  onExportPdf,
  onExportPhotos
}: {
  onExportPdf: () => void;
  onExportPhotos: () => void;
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
        className="button primary reportExportMenuTrigger"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <Download size={16} />
        {t("reports.exportAction")}
        <ChevronDown className={open ? "reportExportMenuChevron open" : "reportExportMenuChevron"} size={16} />
      </button>
      {open ? (
        <div className="reportExportMenuPanel" id={menuId} role="menu">
          <button
            className="reportExportMenuItem"
            role="menuitem"
            type="button"
            onClick={() => {
              onExportPdf();
              setOpen(false);
            }}
          >
            PDF
          </button>
          <button
            className="reportExportMenuItem"
            role="menuitem"
            type="button"
            onClick={() => {
              onExportPhotos();
              setOpen(false);
            }}
          >
            {t("reports.fileTypePhotos")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
