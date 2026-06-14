"use client";

import { Clock3 } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore
} from "react";
import { createPortal } from "react-dom";
import {
  formatTimeValue,
  getTimeDisplayValue,
  hourOptions,
  minuteOptions,
  parseTimeValue
} from "@/lib/time-input";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function TimeColumn({
  ariaLabel,
  columnId,
  options,
  selectedValue,
  onSelect
}: {
  ariaLabel: string;
  columnId: string;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    const selectedNode = list?.querySelector<HTMLElement>(`[data-value="${selectedValue}"]`);

    if (list && selectedNode) {
      selectedNode.scrollIntoView({ block: "center" });
    }
  }, [selectedValue]);

  return (
    <div
      aria-label={ariaLabel}
      className="timePickerColumn"
      id={columnId}
      ref={listRef}
      role="listbox"
    >
      {options.map((option) => {
        const selected = option === selectedValue;

        return (
          <button
            key={option}
            aria-selected={selected}
            className={`timePickerOption${selected ? " isSelected" : ""}`}
            data-value={option}
            role="option"
            type="button"
            onClick={() => onSelect(option)}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function TimePicker({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  className = "",
  placeholder = "--:--",
  id,
  "aria-label": ariaLabel
}: {
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
  id?: string;
  "aria-label"?: string;
}) {
  const generatedId = useId();
  const menuId = `${generatedId}-menu`;
  const hourListId = `${generatedId}-hours`;
  const minuteListId = `${generatedId}-minutes`;
  const parsed = parseTimeValue(value);
  const hour = parsed?.hour ?? "00";
  const minute = parsed?.minute ?? "00";
  const hasValue = Boolean(parsed);
  const displayValue = getTimeDisplayValue(value, placeholder);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const isClient = useIsClient();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 248;
    const viewportGap = 8;
    const gap = 6;
    const preferredWidth = Math.max(rect.width, 220);
    const maxWidth = window.innerWidth - viewportGap * 2;
    const width = Math.min(preferredWidth, maxWidth);
    let left = rect.left;

    if (window.innerWidth <= 520) {
      left = (window.innerWidth - width) / 2;
    } else {
      left = Math.min(Math.max(viewportGap, left), window.innerWidth - width - viewportGap);
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuHeight + gap && rect.top > menuHeight + gap;
    const top = openUpward
      ? Math.max(viewportGap, rect.top - menuHeight - gap)
      : rect.bottom + gap;

    setMenuStyle({
      top,
      left,
      width
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }

    updateMenuPosition();

    const frame = requestAnimationFrame(() => updateMenuPosition());

    const handlePosition = () => updateMenuPosition();

    window.addEventListener("scroll", handlePosition, true);
    window.addEventListener("resize", handlePosition);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handlePosition, true);
      window.removeEventListener("resize", handlePosition);
    };
  }, [open, value]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
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
  }, [open]);

  const commitTime = (nextHour: string, nextMinute: string) => {
    onChange?.(formatTimeValue(nextHour, nextMinute));
  };

  if (readOnly) {
    return (
      <div className={`timePicker timePickerReadOnly ${className}`.trim()}>
        <div className="timePickerReadOnlyTrigger field">
          <span className={`timePickerValue${hasValue ? "" : " isPlaceholder"}`}>{displayValue}</span>
          <Clock3 aria-hidden="true" className="timePickerIcon" size={16} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`timePicker${open ? " isOpen" : ""}${disabled ? " isDisabled" : ""} ${className}`.trim()}
      ref={rootRef}
    >
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        className="timePickerTrigger select field"
        disabled={disabled}
        id={id ?? generatedId}
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
      >
        <span className={`timePickerValue${hasValue ? "" : " isPlaceholder"}`}>{displayValue}</span>
        <Clock3 aria-hidden="true" className="timePickerIcon" size={16} />
      </button>

      {open && isClient && menuStyle ? createPortal(
        <div
          aria-label={ariaLabel}
          className="timePickerMenu"
          id={menuId}
          ref={menuRef}
          role="dialog"
          style={{
            top: menuStyle.top,
            left: menuStyle.left,
            width: menuStyle.width
          }}
        >
          <div className="timePickerColumns">
            <TimeColumn
              ariaLabel="Hours"
              columnId={hourListId}
              options={hourOptions}
              selectedValue={hour}
              onSelect={(nextHour) => commitTime(nextHour, minute)}
            />
            <span aria-hidden="true" className="timePickerSeparator">:</span>
            <TimeColumn
              ariaLabel="Minutes"
              columnId={minuteListId}
              options={minuteOptions}
              selectedValue={minute}
              onSelect={(nextMinute) => commitTime(hour, nextMinute)}
            />
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}
