"use client";

import { useEffect, useMemo, useState } from "react";
import { paginate } from "@/lib/pagination";

export const REPORT_LIST_PAGE_SIZE = 10;

export function useReportListPagination<T>(items: T[]) {
  const [page, setPage] = useState(1);
  const itemsKey = items.length;

  const pagination = useMemo(
    () => paginate(items, page, REPORT_LIST_PAGE_SIZE),
    [items, page]
  );

  useEffect(() => {
    setPage(1);
  }, [itemsKey]);

  return {
    ...pagination,
    setPage
  };
}
