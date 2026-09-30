import type { ReactNode } from "react";
import { FiChevronDown } from "react-icons/fi";

export interface SelectOption {
  label: string;
  value: string;
  icon?: ReactNode;
}

export interface AdminSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  icon?: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function AdminSelect({ value, onChange, options, placeholder = "Chọn...", icon, className = "", ariaLabel }: AdminSelectProps) {
  return <span className={`relative inline-flex min-w-36 items-center text-sm ${className}`}>
    {icon && <span aria-hidden="true" className="pointer-events-none absolute left-3 app-text-muted">{icon}</span>}
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel ?? placeholder}
      className={`min-h-11 w-full appearance-none rounded-lg border app-border app-bg-card py-2 pr-9 text-sm font-medium app-text-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${icon ? "pl-9" : "pl-3"}`}
    >
      {!options.some((option) => option.value === value) && <option value={value}>{placeholder}</option>}
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    <FiChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 app-text-muted" />
  </span>;
}

export default AdminSelect;
