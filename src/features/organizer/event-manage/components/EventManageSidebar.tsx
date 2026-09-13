import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { PATHS } from "@/routes/paths";
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
  FiChevronRight
} from "react-icons/fi";
import { FaTicketAlt } from "react-icons/fa";

interface EventManageSidebarProps {
  eventData?: {
    bannerUrl?: string;
    thumbnailUrl?: string;
    title?: string;
    [key: string]: unknown;
  } | null;
  isSidebarOpen: boolean;
  isCollapsed: boolean;
  onCloseSidebar: () => void;
  onToggleCollapse: () => void;
}

export const EventManageSidebar: React.FC<EventManageSidebarProps> = ({
  eventData,
  isSidebarOpen,
  isCollapsed,
  onCloseSidebar,
  onToggleCollapse
}) => {
  const { eventId } = useParams<{ eventId: string }>();
  const location = useLocation();

  const navGroups = [
    {
      groupTitle: "BÁO CÁO",
      items: [
        {
          label: "Phân tích",
          path: `/organizer/events/${eventId}/manage/overview`,
          icon: <FiPieChart className="w-4.5 h-4.5 shrink-0" />,
        },
        {
          label: "Danh sách đơn hàng",
          path: `/organizer/events/${eventId}/manage/orders`,
          icon: <FiFileText className="w-4.5 h-4.5 shrink-0" />,
        },
        {
          label: "Check-in",
          path: `/organizer/events/${eventId}/manage/checkin`,
          icon: <FiCheckCircle className="w-4.5 h-4.5 shrink-0" />,
        },
      ],
    },
    {
      groupTitle: "CÀI ĐẶT SỰ KIỆN",
      items: [
        {
          label: "Thành viên",
          path: `/organizer/events/${eventId}/manage/members`,
          icon: <FiUsers className="w-4.5 h-4.5 shrink-0" />,
        },
        {
          label: "Chỉnh sửa",
          path: `/organizer/events/${eventId}/manage/edit`,
          icon: <FiEdit3 className="w-4.5 h-4.5 shrink-0" />,
        },
        {
          label: "Thiết kế sơ đồ ghế",
          path: `/organizer/events/${eventId}/manage/seating`,
          icon: <FiGrid className="w-4.5 h-4.5 shrink-0" />,
        },
        {
          label: "Cài đặt hạng vé",
          path: `/organizer/events/${eventId}/manage/ticket-assign`,
          icon: <FaTicketAlt className="w-4 h-4 shrink-0" />,
        },
      ],
    },
    {
      groupTitle: "MARKETING",
      items: [
        {
          label: "Voucher",
          path: `/organizer/events/${eventId}/manage/vouchers`,
          icon: <FiTag className="w-4.5 h-4.5 shrink-0" />,
        },
      ],
    },
  ];

  return (
    <>
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen app-bg-card border-r app-border flex flex-col justify-between p-3.5 transition-all duration-300 ${isCollapsed ? "w-20" : "w-64"
          } ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="space-y-4 overflow-y-auto no-scrollbar">
          {/* Header Brand & Collapse Toggle */}
          <div
            className={`pb-3 border-b app-border flex ${isCollapsed ? "flex-col items-center gap-2.5" : "items-center justify-between"
              }`}
          >
            <Link
              to={PATHS.MY_EVENTS}
              className={`flex items-center gap-2.5 group ${isCollapsed ? "justify-center" : ""}`}
              title="HaloTicket - Trang quản trị sự kiện"
            >
              <div className="w-9.5 h-9.5 rounded-xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white font-bold shadow-md shrink-0 group-hover:scale-105 transition-transform">
                <FaTicketAlt className="w-4 h-4 transform -rotate-12" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <span className="text-sm font-extrabold tracking-tight text-blue-600 dark:text-blue-400 block leading-none truncate">
                    Quản trị sự kiện
                  </span>
                  <span className="text-[10px] app-text-muted font-semibold block mt-0.5">
                    HaloTicket Portal
                  </span>
                </div>
              )}
            </Link>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={onCloseSidebar}
              className="lg:hidden p-1.5 rounded-lg app-text-muted hover:app-text-main cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>

            {/* Desktop Collapse/Expand Button */}
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg border app-border app-text-muted hover:app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title={isCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
            >
              {isCollapsed ? <FiChevronRight className="w-4 h-4" /> : <FiChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick Back Link to My Events */}
          <Link
            to={PATHS.MY_EVENTS}
            onClick={onCloseSidebar}
            className={`flex items-center gap-3 text-xs font-bold app-text-muted hover:app-text-main transition-all group p-2.5 rounded-xl border app-border hover:bg-slate-100 dark:hover:bg-slate-800 ${isCollapsed ? "justify-center" : ""
              }`}
            title="Quay lại Sự kiện của tôi"
          >
            <FiArrowLeft className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 transition-transform group-hover:-translate-x-1" />
            {!isCollapsed && <span>Sự kiện của tôi</span>}
          </Link>

          {/* Event Header Banner Card */}
          <div className={`p-2.5 app-bg-subnav rounded-xl border app-border flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
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
                  {eventData?.title || "Sự kiện của tôi"}
                </h4>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                  Đang diễn ra
                </span>
              </div>
            )}
          </div>

          {/* Navigation Links with Spacious Hover Spacing */}
          <nav className="space-y-4 pt-1">
            {navGroups.map((group) => (
              <div key={group.groupTitle} className="space-y-1.5">
                {!isCollapsed && (
                  <h5 className="px-3.5 text-[10px] font-black app-text-muted tracking-widest uppercase">
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
                            ? "bg-blue-600 text-white shadow-xs"
                            : "app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
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

        {/* Footer Language Switcher */}
        <div className={`pt-3 border-t app-border flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
          {!isCollapsed && <span className="text-xs font-bold app-text-muted">Ngôn ngữ</span>}
          <button
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl app-bg-subnav border app-border text-xs font-bold app-text-main cursor-pointer shadow-xs"
          >
            <span className="text-sm">🇻🇳</span>
            {!isCollapsed && <span>Vie</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Backdrop */}
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
