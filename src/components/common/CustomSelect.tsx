import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useFloating, autoUpdate, offset, flip, shift, size } from "@floating-ui/react-dom";
import { FiChevronDown, FiCheck } from "react-icons/fi";

export interface CustomSelectOption {
  value: string;
  label: string;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  className = "",
  icon,
  disabled = false
}: CustomSelectProps) {
  const { t } = useTranslation();
  const displayPlaceholder = placeholder || t("Chọn...");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { refs, floatingStyles } = useFloating({
    middleware: [
      offset(4),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
          });
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // check if click is outside both the button and the floating dropdown
      const isOutsideButton = containerRef.current && !containerRef.current.contains(e.target as Node);
      const isOutsideDropdown = refs.floating.current && !(refs.floating.current as Node).contains(e.target as Node);
      
      if (isOutsideButton && isOutsideDropdown) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [refs.floating]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        ref={refs.setReference}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={`flex min-h-9 w-full items-center justify-between gap-2 rounded-md border app-border app-bg-card px-3 text-xs font-medium app-text-main shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
      >
        <span className="flex items-center gap-2 truncate">
          {icon}
          {selectedOption ? selectedOption.label : displayPlaceholder}
        </span>
        <FiChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180 text-blue-500" : "app-text-muted"
          }`}
        />
      </button>

      {open && createPortal(
        <div
          ref={refs.setFloating}
          className="floating-dropdown"
          style={{ ...floatingStyles, zIndex: 99999, pointerEvents: "auto" }}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopPropagation();
          }}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div className="max-h-60 w-full overflow-auto rounded-lg border app-border app-bg-card p-1 shadow-xl animate-in fade-in zoom-in-95 duration-150 scrollbar-thin">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-xs app-text-muted text-center">{t("Trống")}</div>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                      : "app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <FiCheck className="h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })
          )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
