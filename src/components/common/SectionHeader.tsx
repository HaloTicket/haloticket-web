import { useTranslation } from "react-i18next";
import React from "react";
import { Link } from "react-router-dom";
import { FiChevronRight } from "react-icons/fi";

/** Props của đầu mục: tiêu đề, biểu tượng, liên kết "Xem thêm", danh sách tab và tab đang chọn cùng callback đổi tab. */
interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  seeMoreLink?: string;
  tabs?: { id: string; label: string }[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

/** Đầu một khối nội dung trang chủ: tiêu đề, các tab lọc tùy chọn và liên kết xem thêm; tiêu đề và nhãn tab được dịch qua i18n. */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  icon,
  seeMoreLink,
  tabs,
  activeTab,
  onTabChange,
  className = ""
}) => {
  const { t: translate } = useTranslation();
  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between mb-5 gap-3 ${className}`}>
      {/* Nhóm tiêu đề và tab */}
      <div className="flex flex-wrap items-center gap-4">
        {title && (
          <h2 className="text-xl md:text-2xl font-extrabold app-text-main flex items-center gap-2.5 tracking-tight">
            {icon && <span className="app-text-brand">{icon}</span>}
            <span>{translate(title)}</span>
          </h2>
        )}

        {/* Tab lọc có hiệu ứng chuyển nút mượt */}
        {tabs && tabs.length > 0 && (
          <div className="relative flex items-center app-bg-subnav p-1 rounded-xl border app-border">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange && onTabChange(tab.id)}
                  className={`relative z-10 px-4 py-1.5 text-xs md:text-sm font-extrabold rounded-lg transition-all duration-300 ease-in-out cursor-pointer ${
                    isActive
                      ? "gradient-btn shadow-sm"
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

      {/* Liên kết xem thêm */}
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
