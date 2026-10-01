import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
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
  const [selectedEvent, setSelectedEvent] = useState<ApprovalEventItem | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("Hình ảnh poster/banner không đạt tiêu chuẩn bản quyền");
  const [rejectNotes, setRejectNotes] = useState("");
  const [flaggedFields, setFlaggedFields] = useState<string[]>(["posterImage"]);
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

  // AI Risk Score State
  const [riskScore, setRiskScore] = useState<{ risk_score: number, risk_level: string, reasons: string[] } | null>(null);
  const [isAnalyzingRisk, setIsAnalyzingRisk] = useState(false);

  useEffect(() => {
    if (selectedEvent) {
      const fetchRisk = async () => {
        setIsAnalyzingRisk(true);
        try {
          const res = await aiApi.analyzeRiskScore(
            selectedEvent.id, 
            selectedEvent.title, 
            selectedEvent.descriptionText || selectedEvent.description || "", 
            selectedEvent.organizerName || ""
          );
          setRiskScore(res);
        } catch (err) {
          console.error("Failed to analyze risk score:", err);
          // Only show error internally, fallback gracefully
          setRiskScore({ risk_score: 0, risk_level: "UNKNOWN", reasons: ["Không thể kết nối với dịch vụ đánh giá rủi ro AI."] });
        } finally {
          setIsAnalyzingRisk(false);
        }
      };
      fetchRisk();
    } else {
      setRiskScore(null);
    }
  }, [selectedEvent]);

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

  // auto-open modal if eventId is passed via URL search parameters
  useEffect(() => {
    if (eventIdParam && eventsList.length > 0) {
      const match = eventsList.find((e) => e.id === eventIdParam || String(e.id) === String(eventIdParam));
      if (match) {
        const timer = setTimeout(() => {
          setSelectedEvent(match);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [eventIdParam, eventsList]);

  // handle approve event
  const handleApprove = async (id: string) => {
    // optimistic UI
    setEventsList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, eventApprovalStatus: "APPROVED" } : item))
    );

    const res = await eventApi.approveEvent(id);
    if (res) {
      showToast(`${translate("Đã PHÊ DUYỆT thành công sự kiện")} "${selectedEvent?.title || id}"!`);
    }
    setSelectedEvent(null);
    loadApprovalEvents();
    window.dispatchEvent(new CustomEvent("approval-events-updated"));
  };

  // handle reject event
  const handleRejectSubmit = async () => {
    if (!selectedEvent) return;

    // optimistic UI
    setEventsList((prev) =>
      prev.map((item) => (item.id === selectedEvent.id ? { ...item, eventApprovalStatus: "REJECTED" } : item))
    );

    const notesPayload = JSON.stringify({
      flaggedFields,
      noteText: rejectNotes,
    });

    const res = await eventApi.rejectEvent(selectedEvent.id, rejectReason, notesPayload);
    if (res) {
      showToast(`${translate("Đã TỪ CHỐI phê duyệt sự kiện")} "${selectedEvent.title}"!`, "info");
    }
    setShowRejectModal(false);
    setSelectedEvent(null);
    loadApprovalEvents();
    window.dispatchEvent(new CustomEvent("approval-events-updated"));
  };

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
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(item)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
                        >
                          <FiEye className="w-3.5 h-3.5" />
                          <span>{translate("Xem hồ sơ")}</span>
                        </button>
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

      {/* Comprehensive Full Event Inspection Modal */}
      {selectedEvent && !showRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200 no-scrollbar my-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                  {translate("Mã Hồ Sơ Sự Kiện:")} {selectedEvent.id}
                </span>
                <h3 className="text-lg font-black app-text-main mt-0.5">{selectedEvent.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Banner & Poster Preview */}
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 h-52 bg-slate-900 shadow-inner">
              <img src={selectedEvent.bannerUrl || selectedEvent.posterImage} alt="" className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <img src={selectedEvent.posterImage} alt="" className="w-20 h-20 rounded-xl object-cover border-2 border-white shadow-lg shrink-0" />
                  <div className="text-white drop-shadow-md">
                    <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-extrabold inline-block mb-1">
                      {selectedEvent.categoryName}
                    </span>
                    <h4 className="text-sm font-black">{selectedEvent.organizerName}</h4>
                    <p className="text-[11px] opacity-90">{selectedEvent.datesSummary}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Risk Scoring Banner */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row gap-4 items-start ${
              isAnalyzingRisk ? "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" :
              riskScore?.risk_level === "HIGH" ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50" :
              riskScore?.risk_level === "MEDIUM" ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50" :
              "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50"
            }`}>
              <div className="flex items-center justify-center w-14 h-14 rounded-full shrink-0 shadow-inner bg-white dark:bg-zinc-800 border border-slate-100 dark:border-slate-700">
                {isAnalyzingRisk ? (
                  <FiRefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                ) : (
                  <span className={`text-xl font-black ${
                    riskScore?.risk_level === "HIGH" ? "text-rose-600" :
                    riskScore?.risk_level === "MEDIUM" ? "text-amber-600" :
                    "text-emerald-600"
                  }`}>
                    {riskScore?.risk_score || 0}
                  </span>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <FiShield className={`w-4 h-4 ${
                    isAnalyzingRisk ? "text-blue-500" :
                    riskScore?.risk_level === "HIGH" ? "text-rose-600" :
                    riskScore?.risk_level === "MEDIUM" ? "text-amber-600" :
                    "text-emerald-600"
                  }`} />
                  <span className="app-text-main">AI Phân Tích Rủi Ro (Risk Scoring)</span>
                  {!isAnalyzingRisk && riskScore && (
                    <span className={`px-2 py-0.5 text-[10px] uppercase font-black rounded ${
                      riskScore.risk_level === "HIGH" ? "bg-rose-600 text-white" :
                      riskScore.risk_level === "MEDIUM" ? "bg-amber-500 text-white" :
                      riskScore.risk_level === "UNKNOWN" ? "bg-slate-500 text-white" :
                      "bg-emerald-500 text-white"
                    }`}>
                      {riskScore.risk_level}
                    </span>
                  )}
                </h4>
                {isAnalyzingRisk ? (
                  <p className="text-xs app-text-muted">Đang phân tích thông tin sự kiện và lịch sử BTC...</p>
                ) : (
                  <ul className="text-xs app-text-muted list-disc list-inside space-y-0.5 pl-1">
                    {riskScore?.reasons.map((reason, idx) => (
                      <li key={idx} className="leading-tight">{reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Organizer Legal & Profile Section */}
            <div className="p-4 rounded-xl app-bg-subnav border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold app-text-main flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <FiShield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{translate("Hồ Sơ Pháp Lý & Thanh Toán Ban Tổ Chức")}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] app-text-muted font-bold block uppercase">{translate("Đơn vị đăng ký (Tax Name)")}</span>
                  <p className="font-extrabold app-text-main">{selectedEvent.taxName || selectedEvent.organizerName || translate("Chưa cập nhật")}</p>
                </div>
                <div>
                  <span className="text-[10px] app-text-muted font-bold block uppercase">{translate("Mã số thuế (Tax Code)")}</span>
                  <p className="font-extrabold text-blue-600 dark:text-blue-400">{selectedEvent.taxCode || "0312345678"}</p>
                </div>
                <div>
                  <span className="text-[10px] app-text-muted font-bold block uppercase">{translate("Loại hình kinh doanh")}</span>
                  <p className="font-extrabold app-text-main">{selectedEvent.businessType === "company" ? translate("Doanh nghiệp / Công ty") : translate("Cá nhân / Đơn vị tư nhân")}</p>
                </div>
                <div>
                  <span className="text-[10px] app-text-muted font-bold block uppercase">{translate("Chủ tài khoản nhận tiền")}</span>
                  <p className="font-extrabold app-text-main">{selectedEvent.accountHolder || selectedEvent.organizerName}</p>
                </div>
                <div>
                  <span className="text-[10px] app-text-muted font-bold block uppercase">{translate("Số tài khoản ngân hàng")}</span>
                  <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{selectedEvent.accountNumber || "999988887777"}</p>
                </div>
                <div>
                  <span className="text-[10px] app-text-muted font-bold block uppercase">{translate("Ngân hàng & Chi nhánh")}</span>
                  <p className="font-semibold app-text-main">{selectedEvent.bankName || "Vietcombank"} ({selectedEvent.bankBranch || "Chi nhánh chính"})</p>
                </div>
              </div>
            </div>

            {/* Event Location & Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl app-bg-subnav border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">{translate("Địa điểm diễn ra")}</span>
                <p className="font-bold app-text-main flex items-center gap-1.5">
                  <FiMapPin className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{selectedEvent.locationName}</span>
                </p>
                <p className="text-[11px] app-text-muted">{selectedEvent.address}</p>
              </div>

              <div className="p-3.5 rounded-xl app-bg-subnav border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">{translate("Thời gian diễn ra sự kiện")}</span>
                <p className="font-bold app-text-main flex items-center gap-1.5">
                  <FiCalendar className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{selectedEvent.datesSummary}</span>
                </p>
              </div>
            </div>

            {/* Gallery Images Collection */}
            {selectedEvent.galleryImages && selectedEvent.galleryImages.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold app-text-main flex items-center gap-1.5">
                  <FiImage className="w-4 h-4 text-blue-600" />
                  <span>{translate("Bộ sưu tập hình ảnh sự kiện")} ({selectedEvent.galleryImages.length} {translate("ảnh")})</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {selectedEvent.galleryImages.map((img, idx) => (
                    <img key={idx} src={img} alt="" className="w-full h-24 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shadow-xs hover:scale-105 transition-transform" />
                  ))}
                </div>
              </div>
            )}

            {/* Ticket Breakdown */}
            {selectedEvent.tickets && selectedEvent.tickets.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold app-text-main flex items-center gap-1.5">
                  <FiTag className="w-4 h-4 text-blue-600" />
                  <span>{translate("Cấu hình các loại vé đăng ký")} ({selectedEvent.tickets.length} {translate("hạng vé")})</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {selectedEvent.tickets.map((t: ApprovalTicket, i: number) => (
                    <div key={i} className="p-3 rounded-xl app-bg-subnav border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                      <span className="font-extrabold app-text-main block truncate">{t.name}</span>
                      <span className="text-blue-600 dark:text-blue-400 font-extrabold text-sm block">
                        {t.price ? `${t.price.toLocaleString("vi-VN")} đ` : translate("Miễn phí")}
                      </span>
                      <span className="text-[11px] app-text-muted block font-medium">{translate("Số lượng:")} {t.totalQuantity || t.quantity || 100} {translate("vé")}</span>
                      {t.description && <p className="text-[10px] app-text-muted italic leading-tight">{t.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold app-text-main flex items-center gap-1.5">
                <FiFileText className="w-4 h-4 text-blue-600" />
                <span>{translate("Nội dung mô tả chi tiết sự kiện")}</span>
              </h4>
              <div className="p-4 rounded-xl app-bg-subnav border border-slate-200 dark:border-slate-800 text-xs app-text-main whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                {selectedEvent.descriptionText || selectedEvent.description}
              </div>
            </div>

            {/* Rejection Info Callout if Rejected */}
            {selectedEvent.eventApprovalStatus === "REJECTED" && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <FiAlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{translate("Sự kiện này đã bị từ chối phê duyệt")}</span>
                </p>
                <p><strong>{translate("Lý do:")}</strong> {selectedEvent.rejectionReason}</p>
                {selectedEvent.rejectionNotes && <p><strong>{translate("Ghi chú:")}</strong> {selectedEvent.rejectionNotes}</p>}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white font-bold text-xs rounded-xl border border-rose-200 dark:border-rose-900 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <FiXCircle className="w-4 h-4" />
                <span>{translate("Từ chối duyệt")}</span>
              </button>

              <button
                type="button"
                onClick={() => handleApprove(selectedEvent.id)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5 active:scale-95"
              >
                <FiCheckCircle className="w-4 h-4" />
                <span>
                  {selectedEvent.eventApprovalStatus === "UPDATE_PENDING"
                    ? translate("Phê duyệt cập nhật ngay")
                    : translate("Phê duyệt sự kiện ngay")}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectModal && selectedEvent && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 my-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center gap-2.5 text-rose-500">
              <FiAlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-extrabold app-text-main">{translate("Từ chối duyệt sự kiện")}</h3>
            </div>

            <p className="text-xs app-text-muted leading-relaxed">
              {translate("Bạn đang từ chối duyệt sự kiện")} <strong className="app-text-main">"{selectedEvent.title}"</strong>. {translate("Đánh dấu các mục thông tin không đạt và nhập ghi chú để gửi về cho Ban Tổ Chức sửa đổi.")}
            </p>

            <div className="space-y-3">
              <label className="text-xs font-semibold app-text-main block">{translate("Lý do chính từ chối")}</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl p-3 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
              >
                <option value="Hình ảnh poster/banner không đạt tiêu chuẩn bản quyền" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{translate("Hình ảnh poster/banner không đạt tiêu chuẩn bản quyền")}</option>
                <option value="Thiếu giấy phép tổ chức biểu diễn nghệ thuật/thể thao" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{translate("Thiếu giấy phép tổ chức biểu diễn nghệ thuật/thể thao")}</option>
                <option value="Nội dung mô tả chưa rõ ràng hoặc vi phạm thuần phong mỹ tục" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{translate("Nội dung mô tả chưa rõ ràng hoặc vi phạm thuần phong mỹ tục")}</option>
                <option value="Giá vé hoặc thông tin địa điểm chưa chính xác" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{translate("Giá vé hoặc thông tin địa điểm chưa chính xác")}</option>
                <option value="Khác" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{translate("Lý do khác...")}</option>
              </select>

              {/* Checkbox Checklist for Section Flagging */}
              <div className="space-y-2 p-3.5 rounded-xl app-bg-subnav border border-slate-200 dark:border-slate-800">
                <label className="text-xs font-extrabold app-text-main block">{translate("Đánh dấu các mục không chấp nhận (Bôi đỏ phía BTC):")}</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: "posterImage", label: "Poster & Banner" },
                    { id: "title", label: "Tên & Mô tả sự kiện" },
                    { id: "dates", label: "Thời gian diễn ra" },
                    { id: "tickets", label: "Danh sách Hạng vé" },
                    { id: "location", label: "Địa điểm sự kiện" },
                    { id: "paymentInfo", label: "Thông tin thanh toán / MST" },
                  ].map((field) => {
                    const isChecked = flaggedFields.includes(field.id);
                    return (
                      <label key={field.id} className="flex items-center gap-2 cursor-pointer font-semibold app-text-main text-[11px]">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFlaggedFields((prev) => [...prev, field.id]);
                            } else {
                              setFlaggedFields((prev) => prev.filter((f) => f !== field.id));
                            }
                          }}
                          className="w-4 h-4 rounded accent-rose-600"
                        />
                        <span>{field.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <textarea
                rows={3}
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder={translate("Nhập ghi chú hướng dẫn BTC chi tiết những mục cần sửa đổi...")}
                className="w-full app-bg-subnav app-text-main text-xs rounded-xl p-3 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 app-bg-subnav app-text-main text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer"
              >
                {translate("Hủy bỏ")}
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
              >
                {translate("Xác nhận từ chối")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventApproval;
