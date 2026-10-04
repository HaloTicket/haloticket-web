import React from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";

interface AdminSearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
}

export const AdminSearchFilterBar: React.FC<AdminSearchFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Tìm kiếm...",
  children
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Search Input */}
      <div className="flex min-h-9 flex-1 items-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 sm:max-w-md focus-within:ring-2 focus-within:ring-blue-600/20 focus-within:border-blue-600 transition-all">
        <FiSearch className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t(searchPlaceholder)}
          aria-label={t(searchPlaceholder)}
          className="min-w-0 w-full bg-transparent text-xs font-medium app-text-main placeholder:text-slate-400 focus:outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label={t("Xóa tìm kiếm")}
            className="text-slate-400 hover:app-text-main cursor-pointer text-xs"
          >
            <FiX className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Slots */}
      {children && <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">{children}</div>}
    </div>
  );
};

export default AdminSearchFilterBar;
