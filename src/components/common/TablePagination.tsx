import React from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { CustomSelect } from "./CustomSelect";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
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

      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        <label className="flex items-center gap-2 app-text-muted">
          <span>Số dòng:</span>
          <div className="w-20">
            <CustomSelect
              options={[
                { value: "10", label: "10" },
                { value: "20", label: "20" },
                { value: "50", label: "50" },
              ]}
              value={pageSize.toString()}
              onChange={(val) => onPageSizeChange(Number(val))}
            />
          </div>
        </label>
        <div className="flex items-center gap-1.5">
        {/* Previous Button */}
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          className="h-11 w-11 sm:h-9 sm:w-9 rounded-xl app-bg-card border app-border flex items-center justify-center text-xs app-text-muted hover:app-text-main disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Trang trước"
        >
          <FiChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Number Buttons */}
        {getPageNumbers().map((p, idx) => {
          if (typeof p === "string") {
            return (
              <span key={`ellipsis-${idx}`} className="h-11 px-1.5 text-xs app-text-muted font-bold inline-flex items-center">
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
              className={`h-11 w-11 sm:h-9 sm:w-9 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
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
          className="h-11 w-11 sm:h-9 sm:w-9 rounded-xl app-bg-card border app-border flex items-center justify-center text-xs app-text-muted hover:app-text-main disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Trang tiếp theo"
        >
          <FiChevronRight className="w-4 h-4" />
        </button>
        </div>
      </div>
    </div>
  );
};

export default TablePagination;
