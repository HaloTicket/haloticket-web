import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  FiSearch,
  FiInbox,
  FiPlus,
  FiCalendar,
  FiMapPin,
  FiPieChart,
  FiUsers,
  FiFileText,
  FiGrid,
  FiEdit3,
  FiChevronLeft,
  FiChevronRight,
  FiAlertTriangle
} from "react-icons/fi";
import PendingApprovalModal from "./components/PendingApprovalModal";

export const MyEvents: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "pending" | "draft">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPendingModal, setShowPendingModal] = useState(false);

  const tabs = [
    { id: "upcoming", label: "Sắp tới" },
    { id: "past", label: "Đã qua" },
    { id: "pending", label: "Chờ duyệt" },
    { id: "draft", label: "Nháp" }
  ];

  // Mock events list matching user's layout
  const mockEvents = [
    {
      id: "ev1",
      title: "Concert Test",
      date: "00:00, Thứ 7, 05 tháng 09 2026",
      location: "Online Event",
      status: "pending",
      image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=800&q=80"
    },
    {
      id: "ev2",
      title: "Concert Test",
      date: "18:00, Thứ 5, 20 tháng 08 2026",
      location: "IUH, Phường An Nhơn, Thành phố Hồ Chí Minh",
      status: "pending",
      image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80"
    }
  ];

  const filteredEvents = mockEvents.filter((ev) => {
    const matchesTab = ev.status === activeTab;
    const matchesQuery = ev.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesQuery;
  });

  const handleActionClick = () => {
    if (activeTab === "pending") {
      setShowPendingModal(true);
    }
  };

  return (
    <div className="w-full min-h-screen app-bg-page p-4 md:p-8 space-y-6">
      {/* Search Bar & Tab Navigation Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input Box */}
        <div className="flex items-center gap-2 app-bg-card border app-border rounded-xl p-1.5 shadow-xs max-w-md w-full">
          <div className="flex items-center gap-2 flex-1 pl-3">
            <FiSearch className="w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm sự kiện"
              className="w-full bg-transparent app-text-main text-xs focus:outline-none placeholder-zinc-400 font-medium"
            />
          </div>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
          >
            Tìm kiếm
          </button>
        </div>

        {/* Status Tabs Navigation */}
        <div className="inline-flex p-1.5 app-bg-card border app-border rounded-xl shadow-xs overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-blue-600 dark:bg-blue-500 text-white shadow-xs"
                    : "app-text-muted hover:app-text-main"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Amber Alert Box when on Pending tab */}
      {activeTab === "pending" && (
        <div className="w-full p-4 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs md:text-sm shadow-xs flex items-center gap-2.5">
          <FiAlertTriangle className="w-5 h-5 shrink-0 text-slate-900" />
          <span>
            Lưu ý: Sự kiện đang chờ duyệt. Để đảm bảo tính bảo mật cho sự kiện của bạn, quyền truy cập vào trang chỉ dành cho chủ sở hữu và quản trị viên được ủy quyền
          </span>
        </div>
      )}

      {/* Main Full Width Content List */}
      <div className="w-full space-y-6">
        {filteredEvents.length === 0 ? (
          /* Empty State Illustration */
          <div className="w-full app-bg-card border app-border rounded-2xl p-12 md:p-16 flex flex-col items-center justify-center text-center space-y-4 shadow-sm min-h-[380px]">
            <div className="w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
              <FiInbox className="w-10 h-10 stroke-[1.5]" />
            </div>

            <div className="space-y-1 max-w-sm">
              <h3 className="text-base font-extrabold app-text-main">
                Không có sự kiện nào
              </h3>
              <p className="text-xs app-text-muted leading-relaxed">
                Bạn chưa có sự kiện nào trong danh mục "{tabs.find((t) => t.id === activeTab)?.label}".
              </p>
            </div>

            <Link
              to="/organizer/create-event"
              className="mt-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer inline-flex items-center gap-2"
            >
              <FiPlus className="w-4 h-4" />
              <span>Bắt đầu tạo sự kiện</span>
            </Link>
          </div>
        ) : (
          /* List of Events Cards (Horizontal Layout with Royal Blue Theme) */
          <div className="space-y-4">
            {filteredEvents.map((ev) => (
              <div
                key={ev.id}
                className="app-bg-card border app-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
              >
                {/* Main Card Top Section */}
                <div className="p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6">
                  {/* Poster Image 16:9 */}
                  <div className="w-full sm:w-48 aspect-[16/9] rounded-xl overflow-hidden bg-slate-800 shrink-0">
                    <img src={ev.image} alt={ev.title} className="w-full h-full object-cover" />
                  </div>

                  {/* Event Information */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <h3 className="text-base md:text-lg font-extrabold app-text-main">
                      {ev.title}
                    </h3>

                    <div className="space-y-1 text-xs app-text-muted">
                      <div className="flex items-center gap-2">
                        <FiCalendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{ev.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiMapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar with 5 icons (Royal Blue Theme) */}
                <div className="border-t app-border bg-slate-50/50 dark:bg-slate-900/50 grid grid-cols-5 text-center divide-x app-border">
                  <button
                    type="button"
                    onClick={handleActionClick}
                    className="py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-[11px] font-bold app-text-muted hover:app-text-main transition-colors cursor-pointer"
                  >
                    <FiPieChart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Tổng quan</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleActionClick}
                    className="py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-[11px] font-bold app-text-muted hover:app-text-main transition-colors cursor-pointer"
                  >
                    <FiUsers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Thành viên</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleActionClick}
                    className="py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-[11px] font-bold app-text-muted hover:app-text-main transition-colors cursor-pointer"
                  >
                    <FiFileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Đơn hàng</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleActionClick}
                    className="py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-[11px] font-bold app-text-muted hover:app-text-main transition-colors cursor-pointer bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                  >
                    <FiGrid className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Sơ đồ ghế</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleActionClick}
                    className="py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-[11px] font-bold app-text-muted hover:app-text-main transition-colors cursor-pointer"
                  >
                    <FiEdit3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Chỉnh sửa</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Pagination Controls */}
        <div className="flex items-center justify-end gap-2 pt-4">
          <button
            type="button"
            className="w-8 h-8 rounded-lg app-bg-card border app-border flex items-center justify-center text-xs app-text-muted hover:app-text-main cursor-pointer"
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>
          <span className="w-8 h-8 rounded-lg bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center text-xs font-bold shadow-xs">
            1
          </span>
          <button
            type="button"
            className="w-8 h-8 rounded-lg app-bg-card border app-border flex items-center justify-center text-xs app-text-muted hover:app-text-main cursor-pointer"
          >
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal Popup: Sự Kiện Đang Chờ Duyệt */}
      {showPendingModal && (
        <PendingApprovalModal onClose={() => setShowPendingModal(false)} />
      )}
    </div>
  );
};

export default MyEvents;
