export interface AdminStatusTabOption {
  value: string;
  label: string;
  count?: number;
}

export interface AdminStatusTabsProps {
  value: string;
  options: AdminStatusTabOption[];
  onChange: (value: string) => void;
}

export function AdminStatusTabs({ value, options, onChange }: AdminStatusTabsProps) {
  const { t } = useTranslation();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  return <div role="tablist" className="flex max-w-full gap-1 overflow-x-auto border-b app-border" aria-label={t("Trạng thái")}>
    {options.map((option, index) => <button key={option.value} ref={(node) => { tabRefs.current[index] = node; }} type="button" role="tab" tabIndex={value === option.value ? 0 : -1} aria-selected={value === option.value} onClick={() => onChange(option.value)} onKeyDown={(event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + options.length) % options.length;
      onChange(options[next].value);
      tabRefs.current[next]?.focus();
    }} className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-blue-500 ${value === option.value ? "border-blue-600 app-text-brand" : "border-transparent app-text-muted hover:app-text-main"}`}>
      {option.label}{option.count !== undefined && <span className="ml-1.5 rounded-full app-bg-subnav px-1.5 py-0.5 text-xs app-text-main">{option.count}</span>}
    </button>)}
  </div>;
}

export default AdminStatusTabs;
import { useRef } from "react";
import { useTranslation } from "react-i18next";
