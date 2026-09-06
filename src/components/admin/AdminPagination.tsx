import React from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const AdminPagination: React.FC<AdminPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange
}) => {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
      <span className="app-text-muted font-medium">
        Hiển thị <strong className="app-text-main">{startItem}-{endItem}</strong> trong tổng số{" "}
        <strong className="app-text-main">{totalItems}</strong> mục
      </span>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 app-bg-subnav app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title="Trang trước"
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-1 font-bold text-xs app-text-main bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
            {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 app-bg-subnav app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title="Trang tiếp"
          >
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminPagination;
