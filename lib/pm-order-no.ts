const pmOrderNoPattern = /^\d{8}$/;
const legacyPmOrderNoPattern = /^\d{6}$/;
const legacyPmOrderIdPattern = /^PM-(\d{6})(?:\D|$)/i;
const maxPmOrderSequence = 9999;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseIsoDateParts(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2])
  };
}

function parseReportDateParts(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[3]),
    month: Number(match[2])
  };
}

export function getPmOrderMonthPrefix(referenceDate: string) {
  const isoParts = parseIsoDateParts(referenceDate);
  const displayParts = isoParts ? null : parseReportDateParts(referenceDate);
  const parts = isoParts ?? displayParts;

  if (!parts || parts.month < 1 || parts.month > 12) {
    return "";
  }

  const yearSuffix = String(parts.year % 100).padStart(2, "0");
  const month = String(parts.month).padStart(2, "0");
  return `${yearSuffix}${month}`;
}

function parsePmOrderNo(value: string) {
  if (pmOrderNoPattern.test(value)) {
    return {
      prefix: value.slice(0, 4),
      sequence: Number(value.slice(4))
    };
  }

  return null;
}

export function normalizePmOrderNo(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmedValue = value.trim();
  if (pmOrderNoPattern.test(trimmedValue) || legacyPmOrderNoPattern.test(trimmedValue)) {
    return trimmedValue;
  }

  return "";
}

export function getPmOrderNoFromWorkDetails(details: unknown) {
  return isRecord(details) ? normalizePmOrderNo(details.pmOrderNo) : "";
}

export function getDisplayPmOrderNo({
  date,
  jobId,
  visitDate,
  workDetails
}: {
  date?: string;
  jobId: string;
  visitDate?: string;
  workDetails?: unknown;
}) {
  const savedOrderNo = getPmOrderNoFromWorkDetails(workDetails);

  if (savedOrderNo) {
    return savedOrderNo;
  }

  const legacyOrderNo = jobId.match(legacyPmOrderIdPattern)?.[1] ?? "";
  if (legacyOrderNo) {
    return legacyOrderNo;
  }

  const referenceDate = visitDate ?? date ?? "";
  const prefix = referenceDate ? getPmOrderMonthPrefix(referenceDate) : "";

  if (prefix) {
    return `${prefix}${getStableFallbackSequence(jobId)}`;
  }

  return getStableFallbackPmOrderNo(jobId);
}

function getStableFallbackSequence(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return String((hash % maxPmOrderSequence) + 1).padStart(4, "0");
}

function getStableFallbackPmOrderNo(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return String((hash % 999999) + 1).padStart(6, "0");
}

export function getNextPmOrderNos(existingOrderNos: unknown[], count: number, referenceDate: string) {
  const monthPrefix = getPmOrderMonthPrefix(referenceDate);

  if (!monthPrefix) {
    throw new Error("Invalid PM visit date.");
  }

  const usedOrderNos = new Set<string>();
  let maxSequence = 0;

  existingOrderNos.forEach((value) => {
    const orderNo = normalizePmOrderNo(value);

    if (!orderNo) {
      return;
    }

    usedOrderNos.add(orderNo);

    const parts = parsePmOrderNo(orderNo);
    if (!parts || parts.prefix !== monthPrefix || !Number.isFinite(parts.sequence)) {
      return;
    }

    maxSequence = Math.max(maxSequence, parts.sequence);
  });

  const nextOrderNos: string[] = [];
  let sequence = maxSequence;

  while (nextOrderNos.length < count) {
    sequence += 1;

    if (sequence > maxPmOrderSequence) {
      throw new Error(`PM Order No. has reached the monthly limit for ${monthPrefix}.`);
    }

    const orderNo = `${monthPrefix}${String(sequence).padStart(4, "0")}`;

    if (!usedOrderNos.has(orderNo)) {
      usedOrderNos.add(orderNo);
      nextOrderNos.push(orderNo);
    }
  }

  return nextOrderNos;
}
