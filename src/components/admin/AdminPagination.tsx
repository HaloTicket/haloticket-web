import React from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useTranslation } from "react-i18next";

interface AdminPaginationProps {
  currentPage?: number;
  page?: number;
  totalPages?: number;
  totalItems?: number;
  total?: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const AdminPagination: React.FC<AdminPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  page,
  total,
  pageSize,
  onPageChange
}) => {
  const { t } = useTranslation();
  const size = Math.max(1, pageSize);
  const itemCount = Math.max(0, totalItems ?? total ?? 0);
  const pageCount = Math.max(1, totalPages ?? Math.ceil(itemCount / size));
  const activePage = Math.min(Math.max(1, currentPage ?? page ?? 1), pageCount);
  if (itemCount === 0) return null;

  const startItem = (activePage - 1) * size + 1;
  const endItem = Math.min(activePage * size, itemCount);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t app-border px-5 py-4 text-xs sm:flex-row">
      <span className="app-text-muted font-medium">
        {t("Hiển thị")} <strong className="app-text-main">{startItem}-{endItem}</strong> {t("trên tổng số")}{" "}
        <strong className="app-text-main">{itemCount}</strong> {t("mục")}
      </span>

      {pageCount > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={activePage === 1}
            onClick={() => onPageChange(activePage - 1)}
            aria-label={t("Trang trước")}
            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 app-bg-subnav app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title={t("Trang trước")}
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-1 font-bold text-xs app-text-main bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
            {activePage} / {pageCount}
          </span>

          <button
            type="button"
            disabled={activePage === pageCount}
            onClick={() => onPageChange(activePage + 1)}
            aria-label={t("Trang tiếp")}
            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 app-bg-subnav app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title={t("Trang tiếp")}
          >
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminPagination;
