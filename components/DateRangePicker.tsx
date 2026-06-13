"use client";

import { CalendarRange, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
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
  compareDateValues,
  formatDateRangeLabel,
  formatDateValue,
  formatMonthTitle,
  isDateWithinRange,
  isSameDateValue,
  normalizeDateRange,
  parseDateValue
} from "@/lib/date-range";

const weekDaysByLang = {
  th: ["อ", "จ", "อ", "พ", "พ", "ศ", "ส"],
  en: ["S", "M", "T", "W", "T", "F", "S"]
} as const;

const panelMaxWidth = 268;
const panelViewportGap = 12;

type PickerView = "days" | "years";

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

function buildCalendarDays(visibleMonth: Date) {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    return {
      date,
      isCurrentMonth: date.getMonth() === month
    };
  });
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className = ""
}: {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  className?: string;
}) {
  const { lang, t } = useUi();
  const triggerId = useId();
  const panelId = `${triggerId}-panel`;
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isClient = useIsClient();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PickerView>("days");
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const [hoverDate, setHoverDate] = useState<string>("");
  const normalizedRange = useMemo(() => normalizeDateRange(startDate, endDate), [endDate, startDate]);
  const displayLabel = formatDateRangeLabel(normalizedRange.startDate, normalizedRange.endDate, lang);
  const weekDays = weekDaysByLang[lang];

  const anchorDate = useMemo(
    () => parseDateValue(normalizedRange.startDate)
      ?? parseDateValue(normalizedRange.endDate)
      ?? new Date(),
    [normalizedRange.endDate, normalizedRange.startDate]
  );

  const [visibleMonth, setVisibleMonth] = useState(() => new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1));
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);

  const draftRange = useMemo(() => normalizeDateRange(draftStart, draftEnd), [draftEnd, draftStart]);
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const yearRangeStart = visibleMonth.getFullYear() - 5;
  const years = useMemo(
    () => Array.from({ length: 24 }, (_, index) => yearRangeStart + index),
    [yearRangeStart]
  );

  const updatePanelPosition = () => {
    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    const width = getResponsivePanelWidth();
    const rect = trigger.getBoundingClientRect();
    const panelHeightEstimate = view === "years" ? 250 : 280;
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
    const nextRange = normalizeDateRange(startDate, endDate);
    const nextAnchor = parseDateValue(nextRange.startDate)
      ?? parseDateValue(nextRange.endDate)
      ?? new Date();

    setDraftStart(nextRange.startDate);
    setDraftEnd(nextRange.endDate);
    setVisibleMonth(new Date(nextAnchor.getFullYear(), nextAnchor.getMonth(), 1));
    setView("days");
    setHoverDate("");
    setOpen(true);
  };

  const commitDraft = () => {
    onStartDateChange(draftRange.startDate);
    onEndDateChange(draftRange.endDate);
    setOpen(false);
  };

  const cancelDraft = () => {
    setDraftStart(startDate);
    setDraftEnd(endDate);
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
  }, [open, view]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }

      setDraftStart(startDate);
      setDraftEnd(endDate);
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDraftStart(startDate);
        setDraftEnd(endDate);
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
  }, [open, startDate, endDate]);

  const handleDaySelect = (date: Date) => {
    const nextValue = formatDateValue(date);

    if (date.getMonth() !== visibleMonth.getMonth() || date.getFullYear() !== visibleMonth.getFullYear()) {
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }

    if (!draftRange.startDate || (draftRange.startDate && draftRange.endDate)) {
      setDraftStart(nextValue);
      setDraftEnd("");
      setHoverDate("");
      return;
    }

    if (nextValue === draftRange.startDate) {
      setDraftEnd(nextValue);
      return;
    }

    const start = parseDateValue(draftRange.startDate)!;

    if (compareDateValues(date, start) < 0) {
      setDraftEnd(draftRange.startDate);
      setDraftStart(nextValue);
    } else {
      setDraftEnd(nextValue);
    }

    setHoverDate("");
  };

  const previewEndDate = draftRange.endDate || hoverDate;
  const previewRange = normalizeDateRange(draftRange.startDate, previewEndDate);

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
              <button
                aria-expanded={view === "years"}
                className="dateRangePickerMonthButton"
                type="button"
                onClick={() => setView((current) => current === "days" ? "years" : "days")}
              >
                {formatMonthTitle(visibleMonth, lang)}
                <ChevronDown aria-hidden="true" className={view === "years" ? "isOpen" : ""} size={12} strokeWidth={2.2} />
              </button>
              {view === "days" ? (
                <div className="dateRangePickerNavActions">
                  <button
                    aria-label={lang === "th" ? "เดือนก่อนหน้า" : "Previous month"}
                    className="dateRangePickerNavButton"
                    type="button"
                    onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                  >
                    <ChevronLeft size={14} strokeWidth={2.2} />
                  </button>
                  <button
                    aria-label={lang === "th" ? "เดือนถัดไป" : "Next month"}
                    className="dateRangePickerNavButton"
                    type="button"
                    onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                  >
                    <ChevronRight size={14} strokeWidth={2.2} />
                  </button>
                </div>
              ) : null}
            </div>

            {view === "days" ? (
              <>
                <div className="dateRangePickerWeekHeader" aria-hidden="true">
                  {weekDays.map((day, index) => (
                    <span key={`${day}-${index}`}>{day}</span>
                  ))}
                </div>
                <div className="dateRangePickerGrid">
                  {calendarDays.map(({ date, isCurrentMonth }) => {
                    const dateValue = formatDateValue(date);
                    const isRangeStart = Boolean(draftRange.startDate && isSameDateValue(date, parseDateValue(draftRange.startDate)!));
                    const isRangeEnd = Boolean(previewRange.endDate && isSameDateValue(date, parseDateValue(previewRange.endDate)!));
                    const isInRange = isDateWithinRange(date, previewRange.startDate, previewRange.endDate);
                    const isSingleDay = isRangeStart && isRangeEnd;
                    const isToday = isSameDateValue(date, new Date());
                    const isPreviewEnd = Boolean(!draftRange.endDate && hoverDate && isSameDateValue(date, parseDateValue(hoverDate)!));

                    return (
                      <button
                        aria-label={dateValue}
                        aria-pressed={isRangeStart || isRangeEnd}
                        className={[
                          "dateRangePickerDay",
                          !isCurrentMonth ? "isOutside" : "",
                          isInRange ? "isInRange" : "",
                          isRangeStart ? "isRangeStart" : "",
                          isRangeEnd || isPreviewEnd ? "isRangeEnd" : "",
                          isSingleDay ? "isSingleDay" : "",
                          date.getDay() === 0 ? "isWeekStart" : "",
                          date.getDay() === 6 ? "isWeekEnd" : "",
                          isToday ? "isToday" : ""
                        ].filter(Boolean).join(" ")}
                        key={dateValue}
                        type="button"
                        onClick={() => handleDaySelect(date)}
                        onMouseEnter={() => {
                          if (draftRange.startDate && !draftRange.endDate) {
                            setHoverDate(dateValue);
                          }
                        }}
                        onMouseLeave={() => {
                          if (draftRange.startDate && !draftRange.endDate) {
                            setHoverDate("");
                          }
                        }}
                      >
                        <span
                          className={[
                            "dateRangePickerDayInner",
                            isRangeStart ? "isRangeStart" : "",
                            isRangeEnd ? "isRangeEnd" : "",
                            isPreviewEnd ? "isPreviewEnd" : "",
                            isInRange && !isRangeStart && !isRangeEnd && !isPreviewEnd ? "isInRangeMiddle" : ""
                          ].filter(Boolean).join(" ")}
                        >
                          {date.getDate()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="dateRangePickerYearGrid">
                {years.map((year) => {
                  const selected = year === visibleMonth.getFullYear();

                  return (
                    <button
                      aria-pressed={selected}
                      className={`dateRangePickerYear${selected ? " isSelected" : ""}`}
                      key={year}
                      type="button"
                      onClick={() => {
                        setVisibleMonth(new Date(year, visibleMonth.getMonth(), 1));
                        setView("days");
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
              {displayLabel || (lang === "th" ? "เลือกช่วงวันที่" : "Select date range")}
            </span>
          </button>
          {displayLabel ? (
            <button
              aria-label={lang === "th" ? "ล้างช่วงวันที่" : "Clear date range"}
              className="dateRangePickerClear"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onStartDateChange("");
                onEndDateChange("");
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
