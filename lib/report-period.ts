export type ReportPeriodType = "daily" | "monthly" | "yearly";

export type ReportPeriodRange = {
  end: string;
  label: string;
  period: ReportPeriodType;
  start: string;
};

export type ReportPeriodInput = {
  anchor: string;
  anchorEnd: string;
  anchorStart: string;
  dailyEndDate: string;
  dailyStartDate: string;
};

function isYmd(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function isYm(value: string) {
  return /^\d{4}-\d{2}$/.test(value.trim());
}

function isYearValue(value: string) {
  return /^\d{4}$/.test(value.trim());
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function resolveAnchors(input: ReportPeriodInput) {
  const start = input.anchorStart.trim() || input.anchor.trim();
  const end = input.anchorEnd.trim() || input.anchor.trim() || start;

  return { start, end };
}

export function getDefaultPeriodAnchor(period: ReportPeriodType, todayIso = new Date().toISOString().slice(0, 10)) {
  if (period === "monthly") {
    return todayIso.slice(0, 7);
  }

  if (period === "yearly") {
    return todayIso.slice(0, 4);
  }

  return todayIso;
}

export function getPeriodRange(period: ReportPeriodType, input: ReportPeriodInput): ReportPeriodRange | null {
  if (period === "daily") {
    const start = input.dailyStartDate.trim();
    const end = (input.dailyEndDate || input.dailyStartDate).trim();

    if (!isYmd(start) || !isYmd(end)) {
      return null;
    }

    if (end < start) {
      return null;
    }

    return {
      period,
      start,
      end,
      label: start === end ? start : `${start} – ${end}`
    };
  }

  if (period === "monthly") {
    const { start, end } = resolveAnchors(input);

    if (!isYm(start) || !isYm(end)) {
      return null;
    }

    if (end < start) {
      return null;
    }

    const startMatch = start.match(/^(\d{4})-(\d{2})$/);
    const endMatch = end.match(/^(\d{4})-(\d{2})$/);

    if (!startMatch || !endMatch) {
      return null;
    }

    const startMonth = Number(startMatch[2]);
    const endYear = Number(endMatch[1]);
    const endMonth = Number(endMatch[2]);

    if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12) {
      return null;
    }

    const endDay = lastDayOfMonth(endYear, endMonth);

    return {
      period,
      start: `${start}-01`,
      end: `${endYear}-${String(endMonth).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`,
      label: start === end ? start : `${start} – ${end}`
    };
  }

  const { start, end } = resolveAnchors(input);

  if (!isYearValue(start) || !isYearValue(end)) {
    return null;
  }

  const startYear = Number(start);
  const endYear = Number(end);

  if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || startYear < 2000 || endYear > 3000) {
    return null;
  }

  if (endYear < startYear) {
    return null;
  }

  return {
    period: "yearly",
    start: `${startYear}-01-01`,
    end: `${endYear}-12-31`,
    label: startYear === endYear ? String(startYear) : `${startYear} – ${endYear}`
  };
}

export function isDateWithinPeriod(date: string, range: ReportPeriodRange) {
  const normalized = date.trim().slice(0, 10);
  return normalized >= range.start && normalized <= range.end;
}
