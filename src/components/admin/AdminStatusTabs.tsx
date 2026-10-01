import { useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface AdminStatusTabOption {
  value: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

export interface AdminStatusTabsProps {
  value: string;
  options: AdminStatusTabOption[];
  onChange: (value: string) => void;
}

export function AdminStatusTabs({ value, options, onChange }: AdminStatusTabsProps) {
  const { t } = useTranslation();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div
      role="tablist"
      className="flex max-w-full gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-border px-3 sm:px-4 pt-1"
      aria-label={t("Trạng thái")}
    >
      {options.map((option, index) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            tabIndex={isActive ? 0 : -1}
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (
                event.key !== "ArrowRight" &&
                event.key !== "ArrowLeft" &&
                event.key !== "Home" &&
                event.key !== "End"
              )
                return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                  ? options.length - 1
                  : (index + (event.key === "ArrowRight" ? 1 : -1) + options.length) %
                    options.length;
              onChange(options[next].value);
              tabRefs.current[next]?.focus();
            }}
            className={`group relative flex items-center gap-2 py-3 px-3.5 text-xs font-medium whitespace-nowrap transition-all border-b-2 -mb-px cursor-pointer ${
              isActive
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/80"
            }`}
          >
            {option.icon && (
              <span
                className={`h-4 w-4 shrink-0 transition-colors flex items-center justify-center ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-muted-foreground group-hover:text-foreground"
                }`}
                aria-hidden="true"
              >
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                  isActive
                    ? "bg-blue-600/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold"
                    : "bg-muted text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground"
                }`}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default AdminStatusTabs;
