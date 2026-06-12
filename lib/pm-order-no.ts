const pmOrderNoPattern = /^\d{6}$/;
const legacyPmOrderNoPattern = /^PM-(\d{6})(?:\D|$)/i;
const maxPmOrderNo = 999999;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizePmOrderNo(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmedValue = value.trim();
  return pmOrderNoPattern.test(trimmedValue) ? trimmedValue : "";
}

export function getPmOrderNoFromWorkDetails(details: unknown) {
  return isRecord(details) ? normalizePmOrderNo(details.pmOrderNo) : "";
}

export function getDisplayPmOrderNo({
  jobId,
  workDetails
}: {
  jobId: string;
  workDetails?: unknown;
}) {
  const savedOrderNo = getPmOrderNoFromWorkDetails(workDetails);

  if (savedOrderNo) {
    return savedOrderNo;
  }

  const legacyOrderNo = jobId.match(legacyPmOrderNoPattern)?.[1] ?? "";
  return legacyOrderNo || getStableFallbackPmOrderNo(jobId);
}

function getStableFallbackPmOrderNo(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return String((hash % maxPmOrderNo) + 1).padStart(6, "0");
}

export function getNextPmOrderNos(existingOrderNos: unknown[], count: number) {
  const usedOrderNos = new Set<string>();
  let maxOrderNo = 0;

  existingOrderNos.forEach((value) => {
    const orderNo = normalizePmOrderNo(value);

    if (!orderNo) {
      return;
    }

    usedOrderNos.add(orderNo);
    maxOrderNo = Math.max(maxOrderNo, Number(orderNo));
  });

  const nextOrderNos: string[] = [];
  let cursor = maxOrderNo;

  while (nextOrderNos.length < count) {
    cursor += 1;

    if (cursor > maxPmOrderNo) {
      throw new Error("PM Order No. has reached the 6-digit limit.");
    }

    const orderNo = String(cursor).padStart(6, "0");

    if (!usedOrderNos.has(orderNo)) {
      usedOrderNos.add(orderNo);
      nextOrderNos.push(orderNo);
    }
  }

  return nextOrderNos;
}
