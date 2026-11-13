"use client";

import { useMemo, useState } from "react";
import { paginate } from "@/lib/pagination";

export const REPORT_LIST_PAGE_SIZE = 10;

export function useReportListPagination<T>(items: T[]) {
  const [pageState, setPageState] = useState({ itemsLength: items.length, page: 1 });
  const page = pageState.itemsLength === items.length ? pageState.page : 1;

  if (pageState.itemsLength !== items.length || pageState.page !== page) {
    setPageState({ itemsLength: items.length, page });
  }

  const pagination = useMemo(
    () => paginate(items, page, REPORT_LIST_PAGE_SIZE),
    [items, page]
  );

  const setPage = (nextPage: number) => {
    setPageState({ itemsLength: items.length, page: nextPage });
  };

  return {
    ...pagination,
    setPage
  };
}
