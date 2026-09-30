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
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
      {/* Search Input */}
      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 flex-1 sm:max-w-md">
        <FiSearch className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t(searchPlaceholder)}
          aria-label={t(searchPlaceholder)}
          className="w-full bg-transparent text-xs app-text-main placeholder-slate-400 focus:outline-none font-medium"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label={t("Xóa tìm kiếm")}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
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
