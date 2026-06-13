export function parseDateValue(value: string) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

export function formatDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function compareDateValues(left: Date, right: Date) {
  return left.getFullYear() - right.getFullYear()
    || left.getMonth() - right.getMonth()
    || left.getDate() - right.getDate();
}

export function isSameDateValue(left: Date, right: Date) {
  return compareDateValues(left, right) === 0;
}

export function normalizeDateRange(startDate: string, endDate: string) {
  const start = parseDateValue(startDate);
  const end = parseDateValue(endDate);

  if (!start || !end) {
    return { startDate, endDate };
  }

  if (compareDateValues(start, end) <= 0) {
    return { startDate, endDate };
  }

  return { startDate: endDate, endDate: startDate };
}

export function isDateWithinRange(date: Date, startDate: string, endDate: string) {
  const start = parseDateValue(startDate);
  const end = parseDateValue(endDate);

  if (!start || !end) {
    return false;
  }

  const min = compareDateValues(start, end) <= 0 ? start : end;
  const max = compareDateValues(start, end) <= 0 ? end : start;

  return compareDateValues(date, min) >= 0 && compareDateValues(date, max) <= 0;
}

export function getMonthStarts(anchor: Date, pastMonths = 18, futureMonths = 6) {
  const months: Date[] = [];
  const start = new Date(anchor.getFullYear(), anchor.getMonth() - pastMonths, 1);

  for (let index = 0; index <= pastMonths + futureMonths; index += 1) {
    months.push(new Date(start.getFullYear(), start.getMonth() + index, 1));
  }

  return months;
}

export function formatDateRangeLabel(startDate: string, endDate: string, lang: "th" | "en") {
  const start = parseDateValue(startDate);
  const end = parseDateValue(endDate);
  const locale = lang === "th" ? "th-TH" : "en-US";
  const formatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  if (start && end) {
    return `${formatter.format(start)} – ${formatter.format(end)}`;
  }

  if (start) {
    return formatter.format(start);
  }

  return "";
}

export function formatMonthTitle(date: Date, lang: "th" | "en") {
  return new Intl.DateTimeFormat(lang === "th" ? "th-TH" : "en-US", {
    month: "long",
    year: "numeric"
  }).format(date);
}

export function formatMonthShort(date: Date, lang: "th" | "en") {
  return new Intl.DateTimeFormat(lang === "th" ? "th-TH" : "en-US", {
    month: "short"
  }).format(date);
}

export function getCalendarDays(visibleMonth: Date) {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  for (let index = 0; index < 42; index += 1) {
    const dayNumber = index - firstWeekday + 1;
    const date = new Date(year, month, dayNumber);

    days.push({
      date,
      isCurrentMonth: date.getMonth() === month
    });
  }

  return days;
}

export function getMonthOptions(lang: "th" | "en") {
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(2024, index, 1);

    return {
      value: index,
      label: new Intl.DateTimeFormat(lang === "th" ? "th-TH" : "en-US", { month: "short" }).format(date)
    };
  });
}
