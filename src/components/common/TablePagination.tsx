import React from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange
}) => {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers array (up to 5 page buttons)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="pt-4 border-t app-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
      <div className="app-text-muted font-medium">
        Hiển thị <strong className="app-text-main font-black">{startItem} - {endItem}</strong> trong tổng số{" "}
        <strong className="app-text-main font-black">{totalItems}</strong> mục
      </div>

      <div className="flex items-center gap-1.5">
        {/* Previous Button */}
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          className="w-8 h-8 rounded-xl app-bg-card border app-border flex items-center justify-center text-xs app-text-muted hover:app-text-main disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Trang trước"
        >
          <FiChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Number Buttons */}
        {getPageNumbers().map((p, idx) => {
          if (typeof p === "string") {
            return (
              <span key={`ellipsis-${idx}`} className="px-1.5 text-xs app-text-muted font-bold">
                ...
              </span>
            );
          }
          const isActive = p === currentPage;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                isActive
                  ? "bg-blue-600 dark:bg-blue-500 text-white shadow-xs scale-105"
                  : "app-bg-card border app-border app-text-muted hover:app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {p}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          type="button"
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          className="w-8 h-8 rounded-xl app-bg-card border app-border flex items-center justify-center text-xs app-text-muted hover:app-text-main disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Trang tiếp theo"
        >
          <FiChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TablePagination;
