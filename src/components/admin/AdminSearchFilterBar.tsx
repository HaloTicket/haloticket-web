import React from "react";
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
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={t(searchPlaceholder)}
        aria-label={t(searchPlaceholder)}
        className="min-h-9 min-w-[220px] flex-[1_1_220px] rounded-md border app-border app-bg-card px-3 text-xs font-medium app-text-main placeholder:app-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
      />

      {/* Filter Slots */}
      {children && <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">{children}</div>}
    </div>
  );
};

export default AdminSearchFilterBar;
