"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPaginationWindow } from "@/lib/pagination";
import { useUi } from "@/lib/i18n";

export function Pagination({
  className = "",
  endIndex,
  onPageChange,
  page,
  startIndex,
  totalItems,
  totalPages
}: {
  className?: string;
  endIndex: number;
  onPageChange: (page: number) => void;
  page: number;
  startIndex: number;
  totalItems: number;
  totalPages: number;
}) {
  const { t } = useUi();

  if (totalItems === 0) {
    return null;
  }

  const pages = getPaginationWindow(page, totalPages);
  const rootClassName = ["paginationBar", className].filter(Boolean).join(" ");

  return (
    <nav aria-label={t("pagination.label")} className={rootClassName}>
      <p className="paginationSummary">
        {t("pagination.summary")
          .replace("{start}", String(startIndex))
          .replace("{end}", String(endIndex))
          .replace("{total}", String(totalItems))}
      </p>

      {totalPages > 1 ? (
        <div className="paginationControls">
          <button
            aria-label={t("pagination.previous")}
            className="paginationButton"
            disabled={page <= 1}
            type="button"
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft size={16} />
            <span>{t("pagination.previous")}</span>
          </button>

          <div className="paginationPages">
            {pages.map((pageNumber) => (
              <button
                aria-current={pageNumber === page ? "page" : undefined}
                aria-label={`${t("pagination.page")} ${pageNumber}`}
                className={pageNumber === page ? "paginationButton active" : "paginationButton"}
                key={pageNumber}
                type="button"
                onClick={() => onPageChange(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
          </div>

          <button
            aria-label={t("pagination.next")}
            className="paginationButton"
            disabled={page >= totalPages}
            type="button"
            onClick={() => onPageChange(page + 1)}
          >
            <span>{t("pagination.next")}</span>
            <ChevronRight size={16} />
          </button>
        </div>
      ) : null}
    </nav>
  );
}
