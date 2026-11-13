"use client";

import { useCallback, type RefObject } from "react";
import { Pagination } from "@/components/Pagination";

export function ReportListPagination({
  endIndex,
  onPageChange,
  page,
  scrollTargetRef,
  startIndex,
  totalItems,
  totalPages
}: {
  endIndex: number;
  onPageChange: (page: number) => void;
  page: number;
  scrollTargetRef?: RefObject<HTMLElement | null>;
  startIndex: number;
  totalItems: number;
  totalPages: number;
}) {
  const goToPage = useCallback((nextPage: number) => {
    onPageChange(nextPage);
    window.requestAnimationFrame(() => {
      scrollTargetRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [onPageChange, scrollTargetRef]);

  if (totalItems === 0) {
    return null;
  }

  return (
    <Pagination
      className="paginationBarBottom"
      endIndex={endIndex}
      page={page}
      startIndex={startIndex}
      totalItems={totalItems}
      totalPages={totalPages}
      onPageChange={goToPage}
    />
  );
}
