"use client";

import { useUi } from "@/lib/i18n";
import { normalizeStoredDateValue, parseDateInputValue } from "@/lib/date-input";

export function FormDateInput({
  value,
  onChange,
  className = "field",
  placeholder,
  id,
  "aria-label": ariaLabel
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  "aria-label"?: string;
}) {
  const { lang, t } = useUi();
  const resolvedPlaceholder = placeholder ?? t("common.datePlaceholder");

  return (
    <input
      aria-label={ariaLabel}
      autoComplete="off"
      className={className}
      id={id}
      inputMode="numeric"
      maxLength={10}
      placeholder={resolvedPlaceholder}
      type="text"
      value={normalizeStoredDateValue(value, lang)}
      onChange={(event) => onChange(parseDateInputValue(event.target.value, lang))}
    />
  );
}
