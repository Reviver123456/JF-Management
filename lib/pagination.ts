export function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    endIndex: totalItems === 0 ? 0 : Math.min(start + pageSize, totalItems),
    items: items.slice(start, start + pageSize),
    page: safePage,
    startIndex: totalItems === 0 ? 0 : start + 1,
    totalItems,
    totalPages
  };
}

export function getPaginationWindow(current: number, total: number, size = 5) {
  const safeTotal = Math.max(1, total);
  const safeCurrent = Math.min(Math.max(1, current), safeTotal);
  const windowSize = Math.min(size, safeTotal);

  let start = Math.max(1, safeCurrent - Math.floor(windowSize / 2));
  let end = start + windowSize - 1;

  if (end > safeTotal) {
    end = safeTotal;
    start = Math.max(1, end - windowSize + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
