import React, { useState } from "react";
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
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onSizeChange?: (size: number) => void;
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
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  onSizeChange,
}) => {
  const { t } = useTranslation();
  const [internalSize, setInternalSize] = useState<number | null>(null);

  const currentSize = Math.max(1, internalSize ?? pageSize ?? sizeProp ?? 10);
  const itemCount = Math.max(0, totalItems ?? total ?? totalElements ?? 0);
  const pageCount = Math.max(1, totalPages ?? Math.ceil(itemCount / currentSize));
  const activePage = Math.min(Math.max(1, currentPage ?? page ?? 1), pageCount);

  if (itemCount === 0) return null;

  const startItem = (activePage - 1) * currentSize + 1;
  const endItem = Math.min(activePage * currentSize, itemCount);

  const handleSizeChange = (newSize: number) => {
    setInternalSize(newSize);
    if (onPageSizeChange) onPageSizeChange(newSize);
    if (onSizeChange) onSizeChange(newSize);
    onPageChange(1);
  };

  const defaultOptions = Array.from(new Set([currentSize, 10, 20, 50])).sort((a, b) => a - b);
  const options = pageSizeOptions ?? defaultOptions;

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
      <div className="flex items-center gap-3">
        {/* Page Size Selector */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{t("Số dòng:")}</span>
          <select
            value={currentSize}
            onChange={(e) => handleSizeChange(Number(e.target.value))}
            aria-label={t("Số dòng trên trang")}
            className="h-8 px-2 rounded-lg border border-border bg-muted/40 font-semibold text-foreground outline-none cursor-pointer"
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Next / Prev Navigation */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={activePage <= 1 || loading}
            onClick={() => onPageChange(Math.max(activePage - 1, 1))}
            aria-label={t("Trang trước")}
            title={t("Trang trước")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-1 font-bold text-foreground">
            {activePage} / {pageCount}
          </span>

          <button
            type="button"
            disabled={activePage >= pageCount || loading}
            onClick={() => onPageChange(Math.min(activePage + 1, pageCount))}
            aria-label={t("Trang tiếp")}
            title={t("Trang tiếp")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPagination;
