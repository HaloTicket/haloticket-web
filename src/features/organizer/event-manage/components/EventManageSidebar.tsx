import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "react-router-dom";
import { PATHS } from "@/routes/paths";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { BrandLogo } from "@/components/common/BrandLogo";
import { OrganizerSidebarBackground } from "@/components/common/OrganizerSidebarBackground";
import {
  FiArrowLeft,
  FiPieChart,
  FiFileText,
  FiCheckCircle,
  FiUsers,
  FiEdit3,
  FiGrid,
  FiTag,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiRepeat
} from "react-icons/fi";
import { FaTicketAlt } from "react-icons/fa";
import { LuMegaphone } from "react-icons/lu";

/** Props của sidebar quản lý sự kiện: dữ liệu sự kiện, vai trò của người dùng, trạng thái mở (mobile) và thu gọn, cùng hàm đóng và thu gọn. */
interface EventManageSidebarProps {
  eventData?: {
    bannerUrl?: string;
    thumbnailUrl?: string;
    title?: string;
    [key: string]: unknown;
  } | null;
  myRole?: string | null;
  isSidebarOpen: boolean;
  isCollapsed: boolean;
  onCloseSidebar: () => void;
  onToggleCollapse: () => void;
}

/**
 * Sidebar điều hướng của khu quản lý sự kiện, nhóm theo mục (báo cáo, vận hành...). Mỗi mục hiện hay không tùy vai trò:
 * chủ sở hữu và quản trị có toàn quyền, quản lý xem được phần báo cáo, nhân viên check-in chỉ thấy check-in.
 */
export const EventManageSidebar: React.FC<EventManageSidebarProps> = ({
  eventData,
  myRole,
  isSidebarOpen,
  isCollapsed,
  onCloseSidebar,
  onToggleCollapse
}) => {
  const { t } = useTranslation();
  const { eventId } = useParams<{ eventId: string }>();
  const location = useLocation();

  const isFullAccess = myRole === "OWNER" || myRole === "ADMIN";
  const isManager = myRole === "MANAGER";

  const allNavGroups = [
    {
      groupTitle: t("BÁO CÁO"),
      items: [
        {
          label: t("Phân tích"),
          path: `/organizer/events/${eventId}/manage/overview`,
          icon: <FiPieChart className="w-4.5 h-4.5 shrink-0" />,
          visible: isFullAccess || isManager,
        },
        {
          label: t("Danh sách đơn hàng"),
          path: `/organizer/events/${eventId}/manage/orders`,
          icon: <FiFileText className="w-4.5 h-4.5 shrink-0" />,
          visible: isFullAccess || isManager,
        },
        {
          label: t("Check-in"),
          path: `/organizer/events/${eventId}/manage/checkin`,
          icon: <FiCheckCircle className="w-4.5 h-4.5 shrink-0" />,
          visible: true, // everyone can see check-in
        },
      ],
    },
    {
      groupTitle: t("CÀI ĐẶT SỰ KIỆN"),
      items: [
        {
          label: t("Thành viên"),
          path: `/organizer/events/${eventId}/manage/members`,
          icon: <FiUsers className="w-4.5 h-4.5 shrink-0" />,
          visible: isFullAccess || isManager,
        },
        {
          label: t("Chỉnh sửa"),
          path: `/organizer/events/${eventId}/manage/edit`,
          icon: <FiEdit3 className="w-4.5 h-4.5 shrink-0" />,
          visible: isFullAccess,
        },
        {
          label: t("Thiết kế sơ đồ ghế"),
          path: `/organizer/events/${eventId}/manage/seating`,
          icon: <FiGrid className="w-4.5 h-4.5 shrink-0" />,
          visible: isFullAccess,
        },
        {
          label: t("Cài đặt hạng vé"),
          path: `/organizer/events/${eventId}/manage/ticket-assign`,
          icon: <FaTicketAlt className="w-4 h-4 shrink-0" />,
          visible: isFullAccess,
        },
        {
          label: t("Chuyển nhượng vé"),
          path: PATHS.EVENT_MANAGE_TRANSFERS(eventId!),
          icon: <FiRepeat className="w-4.5 h-4.5 shrink-0" />,
          visible: isFullAccess || isManager,
        },
        {
          label: t("Quản lý suất diễn"),
          path: `/organizer/events/${eventId}/manage/showtimes`,
          icon: <FiClock className="w-4 h-4 shrink-0" />,
          visible: isFullAccess,
        },
      ],
    },
    {
      groupTitle: t("MARKETING"),
      items: [
        {
          label: t("Thông báo"),
          path: PATHS.EVENT_MANAGE_ANNOUNCEMENTS(eventId!),
          icon: <LuMegaphone className="w-4.5 h-4.5 shrink-0" />,
          visible: myRole === "OWNER" || isManager,
        },
        {
          label: t("Voucher"),
          path: `/organizer/events/${eventId}/manage/vouchers`,
          icon: <FiTag className="w-4.5 h-4.5 shrink-0" />,
          visible: isFullAccess,
        },
      ],
    },
  ];

  const navGroups = allNavGroups.map(group => ({
    ...group,
    items: group.items.filter(item => item.visible)
  })).filter(group => group.items.length > 0);

  return (
    <>
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen isolate bg-[#eef5ff] dark:bg-[#0b0f17] border-r border-blue-200/70 dark:border-white/10 flex flex-col transition-all duration-300 ${isCollapsed ? "w-20" : "w-64"
          } ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="relative flex-1 min-h-0 flex flex-col">
          <OrganizerSidebarBackground />

          <div className="relative z-10 flex-1 overflow-y-auto no-scrollbar p-3.5 space-y-4">
            {/* Thương hiệu và nút thu gọn ở đầu sidebar */}
            <div
              className={`pb-3 border-b border-blue-200/70 dark:border-white/10 flex ${isCollapsed ? "flex-col items-center gap-2.5" : "items-center justify-between"
                }`}
            >
              <Link
                to={PATHS.MY_EVENTS}
                className={`flex group min-w-0 ${isCollapsed ? "items-center justify-center" : "flex-col items-start gap-1"}`}
                title={t("HaloTicket - Trang quản trị sự kiện")}
              >
                {isCollapsed ? (
                  <BrandLogo variant="mark" className="h-9 w-11 shrink-0 transition-transform group-hover:scale-105" />
                ) : (
                  <>
                    <BrandLogo className="h-8 w-[120px] shrink-0 transition-opacity group-hover:opacity-90" />
                    <span className="pl-0.5 text-[11px] font-extrabold tracking-tight text-blue-600 dark:text-blue-400 block leading-none truncate max-w-full">
                      {t("Quản trị sự kiện")}
                    </span>
                  </>
                )}
              </Link>

              {/* Nút đóng trên màn hình nhỏ */}
              <button
                type="button"
                onClick={onCloseSidebar}
                className="lg:hidden p-1.5 rounded-lg app-text-muted hover:app-text-main cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>

              {/* Nút thu gọn hoặc mở rộng trên máy tính */}
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1.5 rounded-lg border border-blue-200/70 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                title={isCollapsed ? t("Mở rộng menu") : t("Thu gọn menu")}
              >
                {isCollapsed ? <FiChevronRight className="w-4 h-4" /> : <FiChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            {/* Liên kết quay nhanh về danh sách sự kiện của tôi */}
            <Link
              to={PATHS.MY_EVENTS}
              onClick={onCloseSidebar}
              className={`flex items-center gap-3 text-xs font-bold transition-all group p-2.5 rounded-xl border border-blue-200/70 dark:border-white/10 bg-white/55 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/10 ${isCollapsed ? "justify-center" : ""
                }`}
              title={t("Quay lại Sự kiện của tôi")}
            >
              <FiArrowLeft className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 transition-transform group-hover:-translate-x-1" />
              {!isCollapsed && <span>{t("Sự kiện của tôi")}</span>}
            </Link>

            {/* Thẻ banner tên sự kiện */}
            <div className={`p-2.5 bg-white/65 dark:bg-white/5 backdrop-blur-xs rounded-xl border border-blue-200/70 dark:border-white/10 flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-blue-600 shrink-0">
                <img
                  src={
                    eventData?.bannerUrl ||
                    eventData?.thumbnailUrl ||
                    "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=300&q=80"
                  }
                  alt="Event Banner"
                  className="w-full h-full object-cover"
                />
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-extrabold app-text-main truncate">
                    {eventData?.title || t("Sự kiện của tôi")}
                  </h4>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                    {t("Đang diễn ra")}
                  </span>
                </div>
              )}
            </div>

            {/* Các liên kết điều hướng */}
            <nav className="space-y-4 pt-1">
              {navGroups.map((group) => (
                <div key={group.groupTitle} className="space-y-1.5">
                  {!isCollapsed && (
                    <h5 className="px-3.5 text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-widest uppercase">
                      {group.groupTitle}
                    </h5>
                  )}
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={onCloseSidebar}
                          title={isCollapsed ? item.label : undefined}
                          className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isCollapsed ? "justify-center px-0" : ""
                            } ${isActive
                              ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
                              : "text-slate-800 dark:text-slate-100 hover:bg-white/70 dark:hover:bg-white/10"
                            }`}
                        >
                          {item.icon}
                          {!isCollapsed && <span>{item.label}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Chuyển ngôn ngữ ở chân sidebar */}
        <div className={`relative z-20 shrink-0 px-3.5 py-3 border-t border-blue-300/60 dark:border-white/10 bg-gradient-to-b from-[#b3d2fe] to-[#c7dffe] dark:from-[#0a0f1b] dark:to-[#080d17] flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
          {!isCollapsed && <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{t("Ngôn ngữ")}</span>}
          <LanguageSwitcher direction="up" />
        </div>
      </aside>

      {/* Lớp nền mờ trên màn hình nhỏ */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseSidebar}
        />
      )}
    </>
  );
};

export default EventManageSidebar;
