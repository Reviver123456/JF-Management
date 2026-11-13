"use client";

import { CalendarRange, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from "react";
import { createPortal } from "react-dom";
import { useUi } from "@/lib/i18n";
import {
  formatMonthRangeLabel,
  formatMonthValue,
  formatYearRangeLabel,
  formatYearValue,
  getMonthOptions,
  isYmWithinRange,
  isYearWithinRange,
  normalizeYmRange,
  normalizeYearRange
} from "@/lib/date-range";

const panelMaxWidth = 268;
const panelViewportGap = 12;

export type PeriodRangePickerGranularity = "month" | "year";

function getCurrentYear() {
  return new Date().getFullYear();
}

function resolveVisibleYear(
  granularity: PeriodRangePickerGranularity,
  start: string,
  end: string
) {
  const currentYear = getCurrentYear();
  const source = start.trim() || end.trim();

  if (!source) {
    return currentYear;
  }

  if (granularity === "month") {
    const year = Number(source.slice(0, 4));
    return Number.isFinite(year) && year >= 1000 && year <= 9999 ? year : currentYear;
  }

  const year = Number(source);
  return Number.isFinite(year) && year >= 1000 && year <= 9999 ? year : currentYear;
}

function getResponsivePanelWidth() {
  return Math.min(panelMaxWidth, window.innerWidth - panelViewportGap * 2);
}

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function handleGranularitySelect(
  value: string,
  draftStart: string,
  draftEnd: string,
  setDraftStart: (value: string) => void,
  setDraftEnd: (value: string) => void,
  setHoverValue: (value: string) => void
) {
  const range = normalizeYmRange(draftStart, draftEnd);

  if (!range.start || (range.start && range.end)) {
    setDraftStart(value);
    setDraftEnd("");
    setHoverValue("");
    return;
  }

  if (value === range.start) {
    setDraftEnd(value);
    return;
  }

  if (value < range.start) {
    setDraftEnd(range.start);
    setDraftStart(value);
  } else {
    setDraftEnd(value);
  }

  setHoverValue("");
}

function handleYearSelect(
  value: string,
  draftStart: string,
  draftEnd: string,
  setDraftStart: (value: string) => void,
  setDraftEnd: (value: string) => void,
  setHoverValue: (value: string) => void
) {
  const range = normalizeYearRange(draftStart, draftEnd);

  if (!range.start || (range.start && range.end)) {
    setDraftStart(value);
    setDraftEnd("");
    setHoverValue("");
    return;
  }

  if (value === range.start) {
    setDraftEnd(value);
    return;
  }

  if (Number(value) < Number(range.start)) {
    setDraftEnd(range.start);
    setDraftStart(value);
  } else {
    setDraftEnd(value);
  }

  setHoverValue("");
}

export function PeriodRangePicker({
  className = "",
  endValue,
  granularity,
  onEndValueChange,
  onStartValueChange,
  startValue
}: {
  className?: string;
  endValue: string;
  granularity: PeriodRangePickerGranularity;
  onEndValueChange: (value: string) => void;
  onStartValueChange: (value: string) => void;
  startValue: string;
}) {
  const { lang, t } = useUi();
  const triggerId = useId();
  const panelId = `${triggerId}-panel`;
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isClient = useIsClient();
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const [hoverValue, setHoverValue] = useState("");
  const monthOptions = useMemo(() => getMonthOptions(lang), [lang]);
  const normalizedRange = useMemo(
    () => (granularity === "month"
      ? normalizeYmRange(startValue, endValue)
      : normalizeYearRange(startValue, endValue)),
    [endValue, granularity, startValue]
  );
  const displayLabel = granularity === "month"
    ? formatMonthRangeLabel(normalizedRange.start, normalizedRange.end, lang)
    : formatYearRangeLabel(normalizedRange.start, normalizedRange.end, lang);

  const anchorYear = useMemo(
    () => resolveVisibleYear(granularity, normalizedRange.start, normalizedRange.end),
    [granularity, normalizedRange.end, normalizedRange.start]
  );

  const [visibleYear, setVisibleYear] = useState(() => getCurrentYear());
  const [draftStart, setDraftStart] = useState(startValue);
  const [draftEnd, setDraftEnd] = useState(endValue);

  const draftRange = useMemo(
    () => (granularity === "month"
      ? normalizeYmRange(draftStart, draftEnd)
      : normalizeYearRange(draftStart, draftEnd)),
    [draftEnd, draftStart, granularity]
  );
  const previewEndValue = draftRange.end || hoverValue;
  const previewRange = granularity === "month"
    ? normalizeYmRange(draftRange.start, previewEndValue)
    : normalizeYearRange(draftRange.start, previewEndValue);

  const yearRangeStart = visibleYear - 5;
  const years = useMemo(
    () => Array.from({ length: 24 }, (_, index) => yearRangeStart + index),
    [yearRangeStart]
  );

  const placeholder = granularity === "month"
    ? (lang === "th" ? "เลือกช่วงเดือน" : "Select month range")
    : (lang === "th" ? "เลือกช่วงปี" : "Select year range");

  const updatePanelPosition = () => {
    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    const width = getResponsivePanelWidth();
    const rect = trigger.getBoundingClientRect();
    const panelHeightEstimate = 250;
    let left = rect.left;

    if (window.innerWidth <= 520) {
      left = (window.innerWidth - width) / 2;
    } else {
      left = Math.min(Math.max(panelViewportGap, left), window.innerWidth - width - panelViewportGap);
    }

    let top = rect.bottom + 8;

    if (top + panelHeightEstimate > window.innerHeight - panelViewportGap) {
      top = Math.max(panelViewportGap, rect.top - panelHeightEstimate - 8);
    }

    setPanelStyle({ top, left, width });
  };

  const openPanel = () => {
    const nextRange = granularity === "month"
      ? normalizeYmRange(startValue, endValue)
      : normalizeYearRange(startValue, endValue);

    setDraftStart(nextRange.start);
    setDraftEnd(nextRange.end);
    setVisibleYear(resolveVisibleYear(granularity, nextRange.start, nextRange.end));
    setHoverValue("");
    setOpen(true);
  };

  useEffect(() => {
    if (!open) {
      setVisibleYear(anchorYear);
    }
  }, [anchorYear, granularity, open]);

  const commitDraft = () => {
    onStartValueChange(draftRange.start);
    onEndValueChange(draftRange.end);
    setOpen(false);
  };

  const cancelDraft = () => {
    setDraftStart(startValue);
    setDraftEnd(endValue);
    setOpen(false);
  };

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    updatePanelPosition();

    const handlePosition = () => updatePanelPosition();

    window.addEventListener("scroll", handlePosition, true);
    window.addEventListener("resize", handlePosition);

    return () => {
      window.removeEventListener("scroll", handlePosition, true);
      window.removeEventListener("resize", handlePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }

      setDraftStart(startValue);
      setDraftEnd(endValue);
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDraftStart(startValue);
        setDraftEnd(endValue);
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, startValue, endValue]);

  const panel = open && panelStyle && isClient
    ? createPortal(
        <div
          className="dateRangePickerPanel"
          id={panelId}
          ref={panelRef}
          role="dialog"
          aria-labelledby={triggerId}
          style={{
            top: panelStyle.top,
            left: panelStyle.left,
            width: panelStyle.width
          }}
        >
          <div aria-label={t("common.dateRange")} className="dateRangePickerBody">
            <div className="dateRangePickerNav">
              <button className="dateRangePickerMonthButton" type="button">
                {new Intl.DateTimeFormat(lang === "th" ? "th-TH" : "en-US", { year: "numeric" }).format(new Date(visibleYear, 0, 1))}
              </button>
              {granularity === "month" ? (
                <div className="dateRangePickerNavActions">
                  <button
                    aria-label={lang === "th" ? "ปีก่อนหน้า" : "Previous year"}
                    className="dateRangePickerNavButton"
                    type="button"
                    onClick={() => setVisibleYear((current) => current - 1)}
                  >
                    <ChevronLeft size={14} strokeWidth={2.2} />
                  </button>
                  <button
                    aria-label={lang === "th" ? "ปีถัดไป" : "Next year"}
                    className="dateRangePickerNavButton"
                    type="button"
                    onClick={() => setVisibleYear((current) => current + 1)}
                  >
                    <ChevronRight size={14} strokeWidth={2.2} />
                  </button>
                </div>
              ) : (
                <div className="dateRangePickerNavActions">
                  <button
                    aria-label={lang === "th" ? "ปีย้อนหลัง" : "Earlier years"}
                    className="dateRangePickerNavButton"
                    type="button"
                    onClick={() => setVisibleYear((current) => current - 12)}
                  >
                    <ChevronLeft size={14} strokeWidth={2.2} />
                  </button>
                  <button
                    aria-label={lang === "th" ? "ปีถัดไป" : "Later years"}
                    className="dateRangePickerNavButton"
                    type="button"
                    onClick={() => setVisibleYear((current) => current + 12)}
                  >
                    <ChevronRight size={14} strokeWidth={2.2} />
                  </button>
                </div>
              )}
            </div>

            {granularity === "month" ? (
              <div className="dateRangePickerYearGrid dateRangePickerMonthGrid">
                {monthOptions.map((month) => {
                  const value = formatMonthValue(visibleYear, month.value);
                  const isRangeStart = draftRange.start === value;
                  const isRangeEnd = previewRange.end === value;
                  const isInRange = isYmWithinRange(value, previewRange.start, previewRange.end);
                  const isSingle = isRangeStart && isRangeEnd;

                  return (
                    <button
                      aria-label={value}
                      aria-pressed={isRangeStart || isRangeEnd}
                      className={[
                        "dateRangePickerYear",
                        isInRange ? "isInRange" : "",
                        isRangeStart ? "isRangeStart" : "",
                        isRangeEnd ? "isRangeEnd" : "",
                        isSingle ? "isSingle" : ""
                      ].filter(Boolean).join(" ")}
                      key={value}
                      type="button"
                      onClick={() => handleGranularitySelect(value, draftStart, draftEnd, setDraftStart, setDraftEnd, setHoverValue)}
                      onMouseEnter={() => {
                        if (draftRange.start && !draftRange.end) {
                          setHoverValue(value);
                        }
                      }}
                      onMouseLeave={() => {
                        if (draftRange.start && !draftRange.end) {
                          setHoverValue("");
                        }
                      }}
                    >
                      {month.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="dateRangePickerYearGrid">
                {years.map((year) => {
                  const value = formatYearValue(year);
                  const isRangeStart = draftRange.start === value;
                  const isRangeEnd = previewRange.end === value;
                  const isInRange = isYearWithinRange(value, previewRange.start, previewRange.end);
                  const isSingle = isRangeStart && isRangeEnd;

                  return (
                    <button
                      aria-label={value}
                      aria-pressed={isRangeStart || isRangeEnd}
                      className={[
                        "dateRangePickerYear",
                        isInRange ? "isInRange" : "",
                        isRangeStart ? "isRangeStart" : "",
                        isRangeEnd ? "isRangeEnd" : "",
                        isSingle ? "isSingle" : ""
                      ].filter(Boolean).join(" ")}
                      key={value}
                      type="button"
                      onClick={() => handleYearSelect(value, draftStart, draftEnd, setDraftStart, setDraftEnd, setHoverValue)}
                      onMouseEnter={() => {
                        if (draftRange.start && !draftRange.end) {
                          setHoverValue(value);
                        }
                      }}
                      onMouseLeave={() => {
                        if (draftRange.start && !draftRange.end) {
                          setHoverValue("");
                        }
                      }}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="dateRangePickerFooter">
            <button className="dateRangePickerFooterButton" type="button" onClick={cancelDraft}>
              {t("common.cancel")}
            </button>
            <button className="dateRangePickerFooterButton isPrimary" type="button" onClick={commitDraft}>
              {lang === "th" ? "ตกลง" : "OK"}
            </button>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div className={`dateRangePicker${open ? " isOpen" : ""}`} ref={rootRef}>
        <div className="dateRangePickerControl">
          <button
            aria-expanded={open}
            aria-haspopup="dialog"
            className={["dateRangePickerTrigger", "field", className].filter(Boolean).join(" ")}
            id={triggerId}
            ref={triggerRef}
            type="button"
            onClick={() => {
              if (open) {
                cancelDraft();
              } else {
                openPanel();
              }
            }}
          >
            <CalendarRange aria-hidden="true" className="dateRangePickerTriggerIcon" size={16} strokeWidth={2.1} />
            <span className={`dateRangePickerTriggerLabel${displayLabel ? "" : " isPlaceholder"}`}>
              {displayLabel || placeholder}
            </span>
          </button>
          {displayLabel ? (
            <button
              aria-label={lang === "th" ? "ล้างช่วงวันที่" : "Clear range"}
              className="dateRangePickerClear"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onStartValueChange("");
                onEndValueChange("");
              }}
            >
              <X size={14} strokeWidth={2.2} />
            </button>
          ) : null}
        </div>
      </div>
      {panel}
    </>
  );
}
