import React, { useMemo } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useTranslation } from "react-i18next";

export interface AdminPaginationProps {
  currentPage?: number;
  page?: number;
  totalPages?: number;
  totalItems?: number;
  total?: number;
  totalElements?: number;
  pageSize?: number;
  size?: number;
  loading?: boolean;
  itemLabel?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

function getPaginationItems(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export const AdminPagination: React.FC<AdminPaginationProps> = ({
  currentPage,
  page,
  totalPages,
  totalItems,
  total,
  totalElements,
  pageSize,
  size: sizeProp,
  loading = false,
  itemLabel,
  onPageChange,
  onPageSizeChange,
}) => {
  const { t } = useTranslation();
  const currentSize = Math.max(1, pageSize ?? sizeProp ?? 10);
  const itemCount = Math.max(0, totalItems ?? total ?? totalElements ?? 0);
  const pageCount = Math.max(1, totalPages ?? Math.ceil(itemCount / currentSize));
  const activePage = Math.min(Math.max(1, currentPage ?? page ?? 1), pageCount);

  const paginationItems = useMemo(
    () => getPaginationItems(activePage, pageCount),
    [activePage, pageCount]
  );

  if (itemCount === 0) return null;

  const startItem = (activePage - 1) * currentSize + 1;
  const endItem = Math.min(activePage * currentSize, itemCount);

  const handleSizeChange = (newSize: number) => {
    onPageSizeChange(newSize);
  };

  const options = [10, 20, 50];

  return (
    <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs select-none bg-card">
      {/* Page Info */}
      <div className="text-muted-foreground font-medium">
        {t("Hiển thị")}{" "}
        <span className="font-bold text-foreground">{startItem}-{endItem}</span>
        {" "}{t("trên tổng số")}{" "}
        <span className="font-bold text-foreground">{itemCount}</span> {itemLabel || t("mục")}
      </div>

      {/* Page Switcher */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Page Size Selector */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{t("Số dòng:")}</span>
          <select
            value={currentSize}
            onChange={(e) => handleSizeChange(Number(e.target.value))}
            aria-label={t("Số dòng trên trang")}
            className="min-h-11 px-2.5 rounded-lg border border-border bg-muted/40 font-semibold text-foreground outline-none cursor-pointer focus:ring-2 focus:ring-blue-600/20"
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Numbered Page Navigation */}
        <nav aria-label={t("Phân trang")} className="flex items-center gap-1.5 sm:gap-2">
          {/* Accessible indicator for screen readers and tests */}
          <span className="sr-only">{activePage} / {pageCount}</span>

          {/* Previous Page Button */}
          <button
            type="button"
            disabled={activePage <= 1 || loading}
            onClick={() => onPageChange(Math.max(activePage - 1, 1))}
            aria-label={t("Trang trước")}
            title={t("Trang trước")}
            className="h-11 w-11 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <FiChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Numbered Buttons */}
          {paginationItems.map((item, idx) => {
            if (item === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="h-11 w-11 sm:h-9 sm:w-9 inline-flex items-center justify-center text-slate-400 font-semibold select-none"
                >
                  …
                </span>
              );
            }
            const pageNum = item as number;
            const isActive = pageNum === activePage;
            return (
              <button
                key={pageNum}
                type="button"
                aria-current={isActive ? "page" : undefined}
                aria-label={t("Trang {{page}}", { page: pageNum })}
                disabled={loading}
                onClick={() => onPageChange(pageNum)}
                className={`h-11 w-11 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          {/* Next Page Button */}
          <button
            type="button"
            disabled={activePage >= pageCount || loading}
            onClick={() => onPageChange(Math.min(activePage + 1, pageCount))}
            aria-label={t("Trang tiếp")}
            title={t("Trang tiếp")}
            className="h-11 w-11 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <FiChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </nav>
      </div>
    </div>
  );
};

export default AdminPagination;
