import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, Link } from "react-router-dom";
import { PATHS } from "@/routes/paths";
import {
  FiCheckSquare,
  FiSearch,
  FiEye,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiCalendar,
  FiMapPin,
  FiUser,
  FiTag,
  FiX,
  FiFileText,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiImage,
  FiShield
} from "react-icons/fi";
import { eventApi } from "@/services/eventApi";
import { aiApi } from "@/services/aiApi";
import type { ApprovalEventItem } from "@/types";

interface ApprovalTicket {
  name?: string;
  price?: number;
  totalQuantity?: number;
  quantity?: number;
  description?: string;
  [key: string]: unknown;
}

interface ApprovalEventRaw {
  id?: string;
  title?: string;
  categoryName?: string;
  organizer?: { name?: string };
  author?: string;
  locationName?: string;
  address?: string;
  datesSummary?: string;
  startTime?: string;
  posterImage?: string;
  bannerUrl?: string;
  thumbnailUrl?: string;
  eventApprovalStatus?: string;
  submittedAt?: string;
  createdAt?: string;
  minPrice?: number;
  descriptionText?: string;
  description?: string;
  tickets?: ApprovalTicket[];
  customQuestions?: Record<string, unknown>[];
  galleryImages?: string[];
  [key: string]: unknown;
}

export const EventApproval: React.FC = () => {
  const { t: translate } = useTranslation();
  const [searchParams] = useSearchParams();
  const eventIdParam = searchParams.get("eventId");

  const [activeTab, setActiveTab] = useState<"PENDING" | "UPDATE_PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 4;

  const [eventsList, setEventsList] = useState<ApprovalEventItem[]>([]);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // load real event approval records from backend CSDL
  const loadApprovalEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await eventApi.getApprovalEvents(activeTab);
      if (Array.isArray(data)) {
        const formatTimestamp = (rawDate?: string) => {
          if (!rawDate) return translate("Vừa gửi");
          const cleaned = String(rawDate).replace(/^Gửi lúc:\s*/i, "").trim();
          const d = new Date(cleaned);
          if (!isNaN(d.getTime())) {
            return d.toLocaleString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
              year: "numeric"
            });
          }
          return cleaned;
        };

        const formatDatesSummary = (summary?: string, startTime?: string) => {
          if (summary) {
            return summary.replace(/\s*Tháng\s*0?/gi, "/");
          }
          if (startTime) {
            const d = new Date(startTime);
            if (!isNaN(d.getTime())) {
              return d.toLocaleString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
              });
            }
          }
          return translate("Thời gian dự kiến");
        };

        const formattedList: ApprovalEventItem[] = (data as ApprovalEventRaw[]).map((item) => ({
          ...item,
          id: item.id || `EV_${Date.now()}`,
          title: item.title || translate("Sự kiện chưa đặt tên"),
          categoryName: item.categoryName || translate("Thể loại chung"),
          organizerName: item.organizer?.name || item.author || translate("Ban Tổ Chức"),
          locationName: item.locationName || translate("Địa điểm chưa xác định"),
          address: item.address || item.locationName || translate("Địa chỉ chi tiết"),
          datesSummary: formatDatesSummary(item.datesSummary, item.startTime),
          posterImage: item.posterImage || item.bannerUrl || item.thumbnailUrl || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80",
          bannerUrl: item.bannerUrl || item.posterImage || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80",
          eventApprovalStatus: ((item.eventApprovalStatus || "PENDING").toUpperCase() as "PENDING" | "APPROVED" | "REJECTED"),
          submittedAt: formatTimestamp(item.submittedAt || item.createdAt),
          minPrice: item.minPrice || 0,
          descriptionText: item.descriptionText || item.description || translate("Nội dung mô tả chưa cập nhật."),
          tickets: (() => {
            const raw = Array.isArray(item.tickets) ? item.tickets : [];
            const seen = new Set<string>();
            return raw.filter((t: any) => {
              if (t.ticketTypeStatus === "HIDDEN" || t.status === "HIDDEN") return false;
              const nameKey = (t.name || "").trim().toLowerCase();
              if (!nameKey || seen.has(nameKey)) return false;
              seen.add(nameKey);
              return true;
            });
          })(),
          customQuestions: Array.isArray(item.customQuestions) ? item.customQuestions : [],
          galleryImages: Array.isArray(item.galleryImages) ? item.galleryImages : []
        }));

        // sort events list newest first
        formattedList.sort((a, b) => {
          const timeA = new Date(a.createdAt || a.submittedAt || 0).getTime();
          const timeB = new Date(b.createdAt || b.submittedAt || 0).getTime();
          if (!isNaN(timeA) && !isNaN(timeB) && timeA > 0 && timeB > 0) {
            return timeB - timeA;
          }
          return String(b.id).localeCompare(String(a.id));
        });

        setEventsList(formattedList);
      }
    } catch (err) {
      console.error("Failed to load approval events", err);
      showToast(translate("Không thể tải danh sách sự kiện từ hệ thống"), "error");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, translate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadApprovalEvents();
    }, 0);
    window.addEventListener("approval-events-updated", loadApprovalEvents);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("approval-events-updated", loadApprovalEvents);
    };
  }, [loadApprovalEvents]);

  const filteredEvents = eventsList.filter((item) => {
    const status = item.eventApprovalStatus || "PENDING";
    const matchesTab = activeTab === "ALL" ? true : status === activeTab;
    const matchesQuery =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.organizerName && item.organizerName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesQuery;
  });

  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1;
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Toast Banner */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[9999] px-5 py-3.5 rounded-xl shadow-2xl border text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-bottom-4 duration-200 ${toast.type === "success"
            ? "bg-emerald-600 text-white border-emerald-500"
            : toast.type === "error"
              ? "bg-rose-600 text-white border-rose-500"
              : "bg-blue-600 text-white border-blue-500"
            }`}
        >
          {toast.type === "success" ? <FiCheckCircle className="w-4 h-4 shrink-0" /> : <FiAlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header & Filter Controls */}
      <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold app-text-main flex items-center gap-2">
              <FiCheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{translate("Kiểm Duyệt Yêu Cầu Đăng Tải & Cập Nhật Sự Kiện")}</span>
            </h2>
            <p className="text-xs app-text-muted mt-0.5">
              {translate("Đánh giá hồ sơ pháp lý, địa điểm, hạng vé và thông tin Ban Tổ Chức trước khi công khai mở bán vé.")}
            </p>
          </div>

          <button
            type="button"
            onClick={loadApprovalEvents}
            className="p-2 bg-slate-50 dark:bg-slate-800/80 text-app-text-main rounded-md border border-slate-200 dark:border-slate-700 hover:border-blue-500 cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
            title={translate("Tải lại dữ liệu")}
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
            <span>{translate("Làm mới")}</span>
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 app-bg-subnav p-1 rounded-lg border border-slate-200 dark:border-slate-800 w-full sm:w-auto flex-wrap">
            {(["PENDING", "UPDATE_PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === tab
                  ? "bg-blue-600 text-white shadow-xs"
                  : "app-text-muted hover:app-text-main"
                  }`}
              >
                <span>
                  {tab === "PENDING"
                    ? translate("Chờ duyệt mới")
                    : tab === "UPDATE_PENDING"
                      ? translate("Cần xem xét cập nhật")
                      : tab === "APPROVED"
                        ? translate("Đã duyệt")
                        : tab === "REJECTED"
                          ? translate("Bị từ chối")
                          : translate("Tất cả")}
                </span>
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 w-full sm:w-64">
            <FiSearch className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={translate("Tìm tên sự kiện, BTC...")}
              className="w-full bg-transparent app-text-main text-xs focus:outline-none placeholder-slate-400 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Events Approval List Table */}
      <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs table-fixed min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 app-text-muted font-bold text-[11px] uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/30">
                <th className="py-3 px-4 w-[24%]">{translate("Sự kiện & BTC")}</th>
                <th className="py-3 px-4 w-[18%]">{translate("Thể loại & Địa điểm")}</th>
                <th className="py-3 px-4 w-[22%]">{translate("Thời gian diễn ra")}</th>
                <th className="py-3 px-4 w-[11%]">{translate("Giá vé từ")}</th>
                <th className="py-3 px-4 w-[14%] text-center">{translate("Trạng thái duyệt")}</th>
                <th className="py-3 px-4 w-[11%] text-right">{translate("Thao tác Admin")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center app-text-muted">
                    <FiCheckSquare className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                    <p className="font-bold">{translate("Không tìm thấy yêu cầu sự kiện nào.")}</p>
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((item) => {
                  const status = item.eventApprovalStatus || "PENDING";
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4 overflow-hidden">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <img
                            src={item.posterImage || item.bannerUrl}
                            alt=""
                            className="w-11 h-11 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs app-text-main truncate" title={item.title}>{item.title}</p>
                            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 mt-0.5 truncate" title={item.organizerName}>
                              <FiUser className="w-3 h-3 shrink-0" />
                              <span className="truncate">{item.organizerName}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 space-y-0.5 overflow-hidden">
                        <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold border border-blue-200 dark:border-blue-900 inline-block truncate max-w-full">
                          {item.categoryName}
                        </span>
                        <p className="text-[11px] font-semibold app-text-main flex items-center gap-1 truncate" title={item.locationName}>
                          <FiMapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{item.locationName}</span>
                        </p>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-[11px] overflow-hidden">
                        <div className="flex items-center gap-1 app-text-main font-semibold truncate" title={item.datesSummary}>
                          <FiCalendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{item.datesSummary}</span>
                        </div>
                        <p className="text-[10px] app-text-muted mt-0.5 truncate">{translate("Gửi lúc:")} {item.submittedAt}</p>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {item.minPrice ? `${item.minPrice.toLocaleString("vi-VN")} đ` : translate("Miễn phí")}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {status === "APPROVED" ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[11px] font-extrabold border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                            <FiCheckCircle className="w-3 h-3" /> {translate("Đã phê duyệt")}
                          </span>
                        ) : status === "UPDATE_PENDING" ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[11px] font-extrabold border border-indigo-200 dark:border-indigo-800 inline-flex items-center gap-1 animate-pulse">
                            <FiRefreshCw className="w-3 h-3 animate-spin" /> {translate("Cần xem xét cập nhật")}
                          </span>
                        ) : status === "REJECTED" ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[11px] font-extrabold border border-rose-200 dark:border-rose-800 inline-flex items-center gap-1">
                            <FiXCircle className="w-3 h-3" /> {translate("Bị từ chối")}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-[11px] font-extrabold border border-amber-200 dark:border-amber-800 inline-flex items-center gap-1 animate-pulse">
                            <FiAlertTriangle className="w-3 h-3" /> {translate("Chờ phê duyệt mới")}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          to={PATHS.ADMIN_EVENT_APPROVAL_DETAIL(item.id)}
                          className="px-3 py-1.5 min-h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <FiEye className="w-3.5 h-3.5" />
                          <span>{translate("Xem hồ sơ")}</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="app-text-muted font-medium">
              {translate("Hiển thị")} <strong className="app-text-main">{paginatedEvents.length}</strong> / <strong className="app-text-main">{filteredEvents.length}</strong> {translate("sự kiện")}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 app-bg-card disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 font-semibold text-slate-700 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 app-bg-card disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default EventApproval;
