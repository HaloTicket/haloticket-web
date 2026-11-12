import { getLocale } from "@/i18n";
import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react";
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
  FiAlertTriangle,
  FiLoader,
  FiRotateCcw
} from "react-icons/fi";
import PendingApprovalModal from "./components/PendingApprovalModal";
import EkycRequiredModal from "./components/create-event/EkycRequiredModal";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { eventApi } from "@/services/eventApi";
import { organizerApi } from "@/services/organizerApi";
import { userApi, getCachedUserProfile } from "@/services/userApi";
import { ekycApi } from "@/services/ekycApi";
import { TablePagination } from "@/components/common/TablePagination";

import type { UserProfile } from "@/types";
import type { OrganizerProfileData } from "@/types/organizer";

type MyEventTab = "upcoming" | "past" | "pending" | "draft";

interface OrganizerEventItem {
  id?: string;
  _id?: string;
  title?: string;
  bannerUrl?: string;
  thumbnailUrl?: string;
  posterImage?: string;
  image?: string;
  date?: string;
  datesSummary?: string;
  startTime?: string;
  endTime?: string;
  locationName?: string;
  address?: string;
  ward?: string;
  city?: string;
  location?: string;
  eventApprovalStatus?: string;
  eventStatus?: string;
  organizer?: {
    id?: string;
    userId?: string;
    name?: string;
  };
  tickets?: Array<{
    price?: number;
    totalQuantity?: number;
    quantity?: number;
  }>;
  staffAssignments?: Array<{
    id?: string;
    email?: string;
    role?: string;
  }>;
}

export const MyEvents: React.FC = () => {
  const { t: translate } = useTranslation();
  const [activeTab, setActiveTab] = useState<MyEventTab>("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [selectedPendingEvent, setSelectedPendingEvent] = useState<OrganizerEventItem | null>(null);
  const [cancellingEvent, setCancellingEvent] = useState<OrganizerEventItem | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showEkycModal, setShowEkycModal] = useState(false);
  const [eventsList, setEventsList] = useState<OrganizerEventItem[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [myOrganizerProfile, setMyOrganizerProfile] = useState<OrganizerProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleCreateEventClick = async (e: React.MouseEvent) => {
    try {
      const eligibility = await ekycApi.getOrganizerEligibility();
      if (eligibility && !eligibility.eligible) {
        e.preventDefault();
        setShowEkycModal(true);
      }
    } catch {
      // if error or endpoint offline, proceed
    }
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // bumped to read the list again after the organiser takes a review request back
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchEvents = async () => {
      try {
        const user = await userApi.getProfile();
        if (!active) return;
        setCurrentUser(user);

        if (user && user.id) {
          const orgProf = await organizerApi.getOrganizerProfile(user.id);
          if (active) setMyOrganizerProfile(orgProf);
        }

        const data = await eventApi.getAllEvents();
        if (active && Array.isArray(data)) {
          setEventsList(data);
        }
      } catch (err) {
        console.error("Failed to load events from backend:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    fetchEvents();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const handleCancelApproval = async () => {
    if (!cancellingEvent?.id) return;
    setIsCancelling(true);
    try {
      await eventApi.cancelApprovalRequest(cancellingEvent.id);
      setCancellingEvent(null);
      setShowPendingModal(false);
      setReloadKey((key) => key + 1);
    } catch (err) {
      console.error("Failed to cancel approval request:", err);
    } finally {
      setIsCancelling(false);
    }
  };

  const isMyEvent = (ev: OrganizerEventItem): boolean => {
    const user = currentUser || getCachedUserProfile();
    if (!user) return false;

    const currentUserId = user.id || user.keycloakId;
    const currentEmail = user.email;

    const orgUserId = ev.organizer?.userId;
    const orgId = ev.organizer?.id;
    const orgName = (ev.organizer?.name || "").toLowerCase();

    // check staff assignments
    if (ev.staffAssignments && ev.staffAssignments.some(s => s.email === currentEmail)) {
      return true;
    }

    // direct match on organizer userId
    if (orgUserId && currentUserId && orgUserId === currentUserId) return true;

    // match on organizer profile id or name
    if (myOrganizerProfile) {
      if (orgId && myOrganizerProfile.id && orgId === myOrganizerProfile.id) return true;
      if (orgName && myOrganizerProfile.name && orgName === myOrganizerProfile.name.toLowerCase()) return true;
    }

    // match on full name or email of user
    if (user.fullName && orgName && orgName === user.fullName.toLowerCase()) return true;
    if (currentEmail && orgName && orgName === currentEmail.toLowerCase()) return true;

    return false;
  };

  const getEventTabStatus = (ev: OrganizerEventItem): string => {
    if (ev.endTime && new Date(ev.endTime) < new Date()) {
      return "past";
    }

    const status = (ev.eventApprovalStatus || ev.eventStatus || "").toUpperCase();
    if (status === "PENDING") return "pending";
    if (status === "DRAFT") return "draft";
    if (status === "ENDED" || status === "PASSED" || status === "COMPLETED") return "past";
    if (status === "APPROVED" || status === "UPCOMING" || status === "ACTIVE" || status === "ONGOING") return "upcoming";
    return "pending"; // default newly created events to pending
  };

  const myEventsOnly = eventsList.filter(isMyEvent);

  const tabs: Array<{ id: MyEventTab; label: string; count: number }> = [
    { id: "upcoming", label: translate("Sắp tới"), count: myEventsOnly.filter(ev => getEventTabStatus(ev) === "upcoming").length },
    { id: "past", label: translate("Đã qua"), count: myEventsOnly.filter(ev => getEventTabStatus(ev) === "past").length },
    { id: "pending", label: translate("Chờ duyệt"), count: myEventsOnly.filter(ev => getEventTabStatus(ev) === "pending").length },
    { id: "draft", label: translate("Nháp"), count: myEventsOnly.filter(ev => getEventTabStatus(ev) === "draft").length }
  ];

  const filteredEvents = myEventsOnly.filter((ev) => {
    const evTabStatus = getEventTabStatus(ev);
    const matchesTab = evTabStatus === activeTab;
    const matchesQuery = (ev.title || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesQuery;
  });

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleActionClick = (ev?: OrganizerEventItem) => {
    if (activeTab === "pending" || ev?.eventApprovalStatus === "PENDING" || ev?.eventApprovalStatus === "UPDATE_PENDING") {
      if (ev) setSelectedPendingEvent(ev);
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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={translate("Tìm kiếm sự kiện")}
              className="w-full bg-transparent app-text-main text-xs focus:outline-none placeholder-zinc-400 font-medium"
            />
          </div>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
          >
            {translate("Tìm kiếm")} </button>
        </div>

        {/* Status Tabs Navigation */}
        <div className="inline-flex p-1.5 app-bg-card border app-border rounded-xl shadow-xs overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 flex items-center gap-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "app-text-muted hover:app-text-main hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span>{translate(tab.label)}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  activeTab === tab.id 
                    ? "bg-white/20 text-white" 
                    : "bg-slate-100 dark:bg-slate-800 app-text-muted"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Amber Alert Box when on Pending tab */}
      {activeTab === "pending" && (
        <div className="w-full p-4 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs md:text-sm shadow-xs flex items-center gap-2.5">
          <FiAlertTriangle className="w-5 h-5 shrink-0 text-slate-900" />
          <span>
            {translate("Lưu ý: Sự kiện đang chờ duyệt. Để đảm bảo tính bảo mật cho sự kiện của bạn, quyền truy cập vào trang chỉ dành cho chủ sở hữu và quản trị viên được ủy quyền")} </span>
        </div>
      )}

      {/* Main Full Width Content List */}
      <div className="w-full space-y-6">
        {isLoading ? (
          <div className="w-full app-bg-card border app-border rounded-2xl p-12 flex flex-col items-center justify-center space-y-3 min-h-[300px]">
            <FiLoader className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs font-bold app-text-muted">{translate("Đang tải danh sách sự kiện...")}</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          /* Empty State Illustration */
          <div className="w-full app-bg-card border app-border rounded-2xl p-12 md:p-16 flex flex-col items-center justify-center text-center space-y-4 shadow-sm min-h-[380px]">
            <div className="w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
              <FiInbox className="w-10 h-10 stroke-[1.5]" />
            </div>

            <div className="space-y-1 max-w-sm">
              <h3 className="text-base font-extrabold app-text-main">
                {translate("Không có sự kiện nào")} </h3>
              <p className="text-xs app-text-muted leading-relaxed">
                {translate("Bạn chưa có sự kiện nào trong danh mục \"")}{translate(tabs.find((t) => t.id === activeTab)?.label ?? "")}".
              </p>
            </div>

            <Link
              to="/organizer/create-event"
              onClick={handleCreateEventClick}
              className="mt-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer inline-flex items-center gap-2"
            >
              <FiPlus className="w-4 h-4" />
              <span>{translate("Bắt đầu tạo sự kiện")}</span>
            </Link>
          </div>
        ) : (
          /* List of Events Cards (Horizontal Layout with Royal Blue Theme) */
          <div className="space-y-4">
            {paginatedEvents.map((ev, idx) => {
              const eventImg = ev.bannerUrl || ev.thumbnailUrl || ev.posterImage || ev.image || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=800&q=80";
              const eventDate = ev.date || ev.datesSummary || (ev.startTime ? new Date(ev.startTime).toLocaleString(getLocale(), { dateStyle: "full", timeStyle: "short" }) : translate("Sắp diễn ra"));
              const locationParts = [ev.locationName, ev.address, ev.ward, ev.city].filter(Boolean);
              const eventLocation = locationParts.length > 0 ? locationParts.join(", ") : (ev.location || translate("Sự kiện trực tuyến"));

              return (
                <div
                  key={ev.id || ev._id || `event-item-${idx}`}
                  className="app-bg-card border app-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
                >
                  {/* Main Card Top Section */}
                  <div className="p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6">
                    {/* Poster Image 16:9 */}
                    <div className="w-full sm:w-48 aspect-[16/9] rounded-xl overflow-hidden bg-slate-800 shrink-0">
                      <img src={eventImg} alt={ev.title || translate("Sự kiện")} className="w-full h-full object-cover" />
                    </div>

                    {/* Event Information */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h3 className="text-base md:text-lg font-extrabold app-text-main">
                          {ev.title}
                        </h3>
                        {activeTab === "upcoming" && (
                          <Link
                            to={`/organizer/events/${ev.id || 'event-demo'}/manage`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all shrink-0"
                          >
                            <FiGrid className="w-3.5 h-3.5" />
                            {translate("Quản trị sự kiện")}
                          </Link>
                        )}
                      </div>

                      <div className="space-y-1 text-xs app-text-muted">
                        <div className="flex items-center gap-2">
                          <FiCalendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span>{translate(eventDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FiMapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="truncate">{eventLocation}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Bar with 5 icons (Royal Blue Theme) */}
                  <div className="border-t app-border bg-slate-50/50 dark:bg-slate-900/50 grid grid-cols-5 text-center divide-x app-border">
                    {activeTab === "upcoming" ? (
                      <>
                        <Link
                          to={`/organizer/events/${ev.id || 'event-demo'}/manage/overview`}
                          className="py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-[11px] font-bold app-text-muted hover:app-text-main hover:bg-blue-500/10 transition-colors"
                        >
                          <FiPieChart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>{translate("Tổng quan")}</span>
                        </Link>

                        <Link
                          to={`/organizer/events/${ev.id || 'event-demo'}/manage/members`}
                          className="py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-[11px] font-bold app-text-muted hover:app-text-main hover:bg-blue-500/10 transition-colors"
                        >
                          <FiUsers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>{translate("Thành viên")}</span>
                        </Link>

                        <Link
                          to={`/organizer/events/${ev.id || 'event-demo'}/manage/orders`}
                          className="py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-[11px] font-bold app-text-muted hover:app-text-main hover:bg-blue-500/10 transition-colors"
                        >
                          <FiFileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>{translate("Đơn hàng")}</span>
                        </Link>

                        <Link
                          to={`/organizer/events/${ev.id || 'event-demo'}/manage/seating`}
                          className="py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-[11px] font-bold app-text-muted hover:app-text-main hover:bg-blue-500/10 transition-colors bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                        >
                          <FiGrid className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>{translate("Sơ đồ ghế")}</span>
                        </Link>

                        <Link
                          to={`/organizer/events/${ev.id || 'event-demo'}/manage/edit`}
                          className="py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline transition-colors"
                        >
                          <FiEdit3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>{translate("Chỉnh sửa")}</span>
                        </Link>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleActionClick(ev)}
                          className="py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-[11px] font-bold app-text-muted hover:app-text-main transition-colors cursor-pointer"
                        >
                          <FiPieChart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>{translate("Tổng quan")}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleActionClick(ev)}
                          className="py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-[11px] font-bold app-text-muted hover:app-text-main transition-colors cursor-pointer"
                        >
                          <FiUsers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>{translate("Thành viên")}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleActionClick(ev)}
                          className="py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-[11px] font-bold app-text-muted hover:app-text-main transition-colors cursor-pointer"
                        >
                          <FiFileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>{translate("Đơn hàng")}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleActionClick(ev)}
                          className="py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-[11px] font-bold app-text-muted hover:app-text-main transition-colors cursor-pointer bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                        >
                          <FiGrid className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>{translate("Sơ đồ ghế")}</span>
                        </button>

                        <Link
                          to={`/organizer/create-event?id=${ev.id}`}
                          className="py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline transition-colors cursor-pointer"
                        >
                          <FiEdit3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>{ev.eventApprovalStatus === "DRAFT" || ev.eventStatus === "DRAFT" ? translate("Tiếp tục tạo nháp") : translate("Chỉnh sửa")}</span>
                        </Link>

                        {ev.eventApprovalStatus === "PENDING" && (
                          <button
                            type="button"
                            onClick={() => setCancellingEvent(ev)}
                            className="py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                            title={translate("Hủy yêu cầu duyệt")}
                          >
                            <FiRotateCcw className="w-4 h-4" />
                            <span>{translate("Hủy duyệt")}</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Table Pagination */}
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredEvents.length}
              pageSize={pageSize}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            />
          </div>
        )}
      </div>

      {/* Modal Popup: Sự Kiện Đang Chờ Duyệt */}
      {showPendingModal && (
        <PendingApprovalModal
          onClose={() => setShowPendingModal(false)}
          onCancelApproval={
            selectedPendingEvent
              ? () => {
                  setCancellingEvent(selectedPendingEvent);
                  setShowPendingModal(false);
                }
              : undefined
          }
        />
      )}

      {/* Confirmation Modal: Hoàn tác yêu cầu duyệt */}
      <ConfirmModal
        isOpen={Boolean(cancellingEvent)}
        title={translate("Hủy yêu cầu duyệt sự kiện")}
        message={translate(
          'Bạn có chắc chắn muốn hủy yêu cầu duyệt cho sự kiện "{{title}}"? Sự kiện sẽ được chuyển về trạng thái Bản nháp để bạn có thể tiếp tục chỉnh sửa.',
          { title: cancellingEvent?.title || "" }
        )}
        confirmText={translate("Hủy yêu cầu")}
        cancelText={translate("Đóng")}
        type="warning"
        isLoading={isCancelling}
        onConfirm={handleCancelApproval}
        onCancel={() => setCancellingEvent(null)}
      />

      {/* Modal Popup: Yêu cầu xác thực eKYC */}
      <EkycRequiredModal isOpen={showEkycModal} onClose={() => setShowEkycModal(false)} />
    </div>
  );
};

export default MyEvents;
