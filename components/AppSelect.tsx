"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  Children,
  isValidElement,
  useSyncExternalStore,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type AppSelectChangeEvent = {
  target: {
    value: string;
  };
};

function collectOptions(children: ReactNode): SelectOption[] {
  const options: SelectOption[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child) || child.type !== "option") {
      return;
    }

    const option = child as ReactElement<{ value?: string; disabled?: boolean; children?: ReactNode }>;
    const label = String(option.props.children ?? "").trim();
    const value = option.props.value === undefined || option.props.value === null
      ? label
      : String(option.props.value);

    options.push({
      value,
      label: label || value,
      disabled: option.props.disabled
    });
  });

  return options;
}

function getSelectedOption(options: SelectOption[], value: string) {
  return options.find((option) => option.value === value);
}

function getDisplayLabel(options: SelectOption[], value: string) {
  const selected = getSelectedOption(options, value);

  if (selected) {
    return selected.label;
  }

  const placeholder = options.find((option) => option.disabled && option.value === "");

  return placeholder?.label ?? "";
}

function truncateSelectLabel(label: string, maxLength?: number) {
  if (!maxLength || label.length <= maxLength) {
    return label;
  }

  return `${label.slice(0, maxLength)}...`;
}

function getFirstName(label: string) {
  const trimmed = label.trim();

  if (!trimmed) {
    return trimmed;
  }

  const spaceIndex = trimmed.indexOf(" ");

  if (spaceIndex === -1) {
    return trimmed;
  }

  return trimmed.slice(0, spaceIndex);
}

function formatSelectLabel(label: string, firstNameOnly?: boolean, labelMaxLength?: number) {
  const formatted = firstNameOnly ? getFirstName(label) : label;
  return truncateSelectLabel(formatted, labelMaxLength);
}

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function AppSelect({
  value: controlledValue,
  defaultValue = "",
  onChange,
  disabled = false,
  className = "",
  id,
  "aria-label": ariaLabel,
  labelMaxLength,
  firstNameOnly = false,
  children
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (event: AppSelectChangeEvent) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
  labelMaxLength?: number;
  firstNameOnly?: boolean;
  children: ReactNode;
}) {
  const generatedId = useId();
  const listboxId = `${generatedId}-listbox`;
  const options = useMemo(() => collectOptions(children), [children]);
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = isControlled ? controlledValue : internalValue;
  const [open, setOpen] = useState(false);
  const isClient = useIsClient();
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedLabel = getDisplayLabel(options, value);
  const displaySelectedLabel = formatSelectLabel(selectedLabel, firstNameOnly, labelMaxLength);
  const hasValue = Boolean(getSelectedOption(options, value));
  const selectableOptions = options.filter((option) => !option.disabled);

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const menuMaxHeight = 240;
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuMaxHeight + gap && rect.top > menuMaxHeight + gap;
    const top = openUpward
      ? Math.max(8, rect.top - menuMaxHeight - gap)
      : rect.bottom + gap;

    setMenuStyle({
      top,
      left: rect.left,
      width: rect.width
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    updateMenuPosition();

    const handlePosition = () => updateMenuPosition();

    window.addEventListener("scroll", handlePosition, true);
    window.addEventListener("resize", handlePosition);

    return () => {
      window.removeEventListener("scroll", handlePosition, true);
      window.removeEventListener("resize", handlePosition);
    };
  }, [open, options.length, selectedLabel]);

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

  const commitValue = (nextValue: string) => {
    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onChange?.({ target: { value: nextValue } });
    setOpen(false);
    triggerRef.current?.focus();
  };

  const toggleOpen = () => {
    if (disabled || selectableOptions.length === 0) {
      return;
    }

    setOpen((current) => !current);
  };

  const menu = open && menuStyle && isClient
    ? createPortal(
        <div
          className="appSelectMenu"
          id={listboxId}
          ref={menuRef}
          role="listbox"
          aria-labelledby={id ?? generatedId}
          style={{
            top: menuStyle.top,
            left: menuStyle.left,
            width: menuStyle.width
          }}
        >
          {options.map((option) => {
            const selected = option.value === value;
            const displayLabel = formatSelectLabel(option.label, firstNameOnly, labelMaxLength);
            const showFullLabel = firstNameOnly
              ? option.label.trim() !== displayLabel
              : option.label.length > (labelMaxLength ?? Number.MAX_SAFE_INTEGER);

            return (
              <button
                key={`${option.value}-${option.label}`}
                aria-label={option.label}
                aria-selected={selected}
                className={`appSelectOption${selected ? " isSelected" : ""}${option.disabled ? " isDisabled" : ""}`}
                disabled={option.disabled}
                role="option"
            title={showFullLabel ? option.label : undefined}
                type="button"
                onClick={() => {
                  if (!option.disabled) {
                    commitValue(option.value);
                  }
                }}
              >
                <span className="appSelectOptionLabel">{displayLabel}</span>
                {selected ? <Check aria-hidden="true" className="appSelectOptionCheck" size={15} strokeWidth={2.2} /> : null}
              </button>
            );
          })}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div
        className={`appSelect${open ? " isOpen" : ""}${disabled ? " isDisabled" : ""}`}
        data-open={open ? "true" : "false"}
        ref={rootRef}
      >
        <button
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          className={["appSelectTrigger", "select", className].filter(Boolean).join(" ")}
          disabled={disabled}
          id={id ?? generatedId}
          ref={triggerRef}
          type="button"
          onClick={toggleOpen}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen(true);
            }
          }}
        >
          <span
            className={`appSelectValue${hasValue ? "" : " isPlaceholder"}`}
            title={selectedLabel.trim() !== displaySelectedLabel ? selectedLabel : undefined}
          >
            {displaySelectedLabel || "\u00a0"}
          </span>
          <ChevronDown aria-hidden="true" className="appSelectChevron" size={16} strokeWidth={2.2} />
        </button>
      </div>
      {menu}
    </>
  );
}
