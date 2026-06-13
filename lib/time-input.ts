export const hourOptions = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
export const minuteOptions = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

export function parseTimeValue(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));

  return {
    hour: String(hour).padStart(2, "0"),
    minute: String(minute).padStart(2, "0")
  };
}

export function formatTimeValue(hour: string, minute: string) {
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

export function formatTimeInputValue(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function parseTimeInputValue(raw: string) {
  const formatted = formatTimeInputValue(raw);
  const parsed = parseTimeValue(formatted);

  if (parsed) {
    return formatTimeValue(parsed.hour, parsed.minute);
  }

  return formatted;
}

export function getTimeDisplayValue(value: string, placeholder: string) {
  const parsed = parseTimeValue(value);
  return parsed ? formatTimeValue(parsed.hour, parsed.minute) : placeholder;
}
