import React from "react";
import { Link } from "react-router-dom";
import { FiChevronRight } from "react-icons/fi";

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  seeMoreLink?: string;
  tabs?: { id: string; label: string }[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  icon,
  seeMoreLink,
  tabs,
  activeTab,
  onTabChange,
  className = ""
}) => {
  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between mb-5 gap-3 ${className}`}>
      {/* Title & Tabs Group */}
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          {icon && <span className="text-brand-600 dark:text-brand-400">{icon}</span>}
          <span>{title}</span>
        </h2>

        {/* Filter Tabs if provided */}
        {tabs && tabs.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange && onTabChange(tab.id)}
                  className={`px-3.5 py-1 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-brand-600 text-white shadow-md shadow-brand-500/25"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* See More Link */}
      {seeMoreLink && (
        <Link
          to={seeMoreLink}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors self-start md:self-auto group"
        >
          <span>Xem thêm</span>
          <FiChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      )}
    </div>
  );
};

export default SectionHeader;
