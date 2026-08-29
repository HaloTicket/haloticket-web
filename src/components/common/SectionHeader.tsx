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
        <h2 className="text-xl md:text-2xl font-extrabold app-text-main flex items-center gap-2.5">
          {icon && <span className="app-text-brand">{icon}</span>}
          <span>{title}</span>
        </h2>

        {/* Filter Tabs if provided */}
        {tabs && tabs.length > 0 && (
          <div className="flex items-center gap-2 app-bg-card p-1 rounded-xl border app-border">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange && onTabChange(tab.id)}
                  className={`px-3.5 py-1 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "gradient-btn text-white shadow-md"
                      : "app-text-muted hover:app-text-main"
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
          className="inline-flex items-center gap-1 text-sm font-medium app-text-muted app-hover-text-brand transition-colors self-start md:self-auto group cursor-pointer"
        >
          <span>Xem thêm</span>
          <FiChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      )}
    </div>
  );
};

export default SectionHeader;
