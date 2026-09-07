import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
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
  useTranslation();
  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between mb-5 gap-3 ${className}`}>
      {/* Title & Tabs Group */}
      <div className="flex flex-wrap items-center gap-4">
        {title && (
          <h2 className="text-xl md:text-2xl font-extrabold app-text-main flex items-center gap-2.5 tracking-tight">
            {icon && <span className="app-text-brand">{icon}</span>}
            <span>{translate(title)}</span>
          </h2>
        )}

        {/* Filter Tabs with Smooth Button Transition Animation */}
        {tabs && tabs.length > 0 && (
          <div className="relative flex items-center bg-slate-200/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-300/60 dark:border-slate-700/60">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange && onTabChange(tab.id)}
                  className={`relative z-10 px-4 py-1.5 text-xs md:text-sm font-extrabold rounded-lg transition-all duration-300 ease-in-out cursor-pointer ${
                    isActive
                      ? "bg-blue-600 dark:bg-blue-500 text-white shadow-sm"
                      : "app-text-muted hover:app-text-main scale-100"
                  }`}
                >
                  {translate(tab.label)}
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
          className="inline-flex items-center gap-1 text-sm font-semibold app-text-muted app-hover-text-brand transition-colors self-start md:self-auto group cursor-pointer"
        >
          <span>{translate("Xem thêm")}</span>
          <FiChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      )}
    </div>
  );
};

export default SectionHeader;
