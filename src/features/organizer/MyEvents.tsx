import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FiSearch, FiInbox, FiPlus, FiCalendar, FiMapPin, FiEye, FiEdit3 } from "react-icons/fi";
import { PATHS } from "@/routes/paths";

export const MyEvents: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "pending" | "draft">("upcoming");
  const [searchQuery, setSearchQuery] = useState("");

  const tabs = [
    { id: "upcoming", label: "Sắp tới" },
    { id: "past", label: "Đã qua" },
    { id: "pending", label: "Chờ duyệt" },
    { id: "draft", label: "Nháp" }
  ];

  // mock events list 
  const mockEvents = [
    {
      id: "ev1",
      title: "Đêm Nhạc Đỉnh Cao Halo Concert 2026",
      date: "15/10/2026 - 18:00",
      location: "Sân vận động Mỹ Đình, Hà Nội",
      status: "upcoming",
      sold: "350 / 500",
      priceRange: "450.000 - 1.500.000 đ"
    }
  ];

  const filteredEvents = mockEvents.filter((ev) => {
    const matchesTab = ev.status === activeTab;
    const matchesQuery = ev.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesQuery;
  });

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
              placeholder="Tìm kiếm sự kiện..."
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
                className={`px-5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "app-text-muted hover:app-text-main"
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Full Width Content List */}
      <div className="w-full">
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
                Bạn chưa có sự kiện nào trong danh mục "{tabs.find((t) => t.id === activeTab)?.label}". Hãy tạo sự kiện mới để tiếp cận khán giả ngay hôm nay!
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
          /* List of Events Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((ev) => (
              <div
                key={ev.id}
                className="app-bg-card border app-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-extrabold rounded-lg">
                      Sắp diễn ra
                    </span>
                    <span className="text-xs font-bold app-text-muted">Vé: {ev.sold}</span>
                  </div>

                  <h4 className="text-sm font-extrabold app-text-main line-clamp-2">
                    {ev.title}
                  </h4>

                  <div className="space-y-1.5 text-xs app-text-muted pt-1">
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

                <div className="px-5 py-3 app-bg-subnav border-t app-border flex items-center justify-between">
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                    {ev.priceRange}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="p-2 rounded-lg app-text-muted hover:app-text-main cursor-pointer"
                      title="Xem chi tiết"
                    >
                      <FiEye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="p-2 rounded-lg app-text-muted hover:app-text-main cursor-pointer"
                      title="Chỉnh sửa"
                    >
                      <FiEdit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyEvents;
