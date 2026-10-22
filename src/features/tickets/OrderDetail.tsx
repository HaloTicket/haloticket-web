import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FiArrowLeft,
  FiCalendar,
  FiMapPin,
  FiDownload,
  FiCopy,
  FiCheck,
  FiTag,
  FiGift,
  FiPackage,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiExternalLink,
  FiRefreshCw,
  FiInfo,
} from "react-icons/fi";
import { FaTicketAlt, FaQrcode } from "react-icons/fa";
import { ticketApi } from "@/services/ticketApi";
import { bookingApi } from "@/services/bookingApi";
import { eventApi } from "@/services/eventApi";
import { getCachedUserProfile } from "@/services/userApi";
import { PATHS } from "@/routes/paths";
import { formatCurrency } from "@/utils/formatters";
import type { BookingDetailResponse } from "@/types";
import {
  type TicketItem,
  hydrateTickets,
  downloadTicketAsImage,
  TicketViewer,
  StatusBadge,
  formatEventTime,
  parseApiDateTime,
} from "./MyTickets";
import { GiftTicketModal, ResaleTicketModal } from "./TicketActionModals";

// polling interval schedule: 2s for first 10s (5 x 2s), then backed off up to ~40s
const POLL_INTERVALS = [2000, 2000, 2000, 2000, 2000, 3000, 4000, 5000, 6000, 6000, 6000];

export default function OrderDetail() {
  const { t } = useTranslation();
  const { orderCode } = useParams<{ orderCode: string }>();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<BookingDetailResponse | null>(null);
  const [eventData, setEventData] = useState<Record<string, unknown> | null>(null);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [customerName, setCustomerName] = useState<string>("");

  // polling timeout
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // modals
  const [viewerTicket, setViewerTicket] = useState<TicketItem>();
  const [resaleTicket, setResaleTicket] = useState<TicketItem>();
  const [giftTicket, setGiftTicket] = useState<TicketItem>();

  const normalizedCode = useMemo(() => {
    return (orderCode || "").replace(/^booking:/i, "").trim();
  }, [orderCode]);

  // total expected tickets from booking items
  const expectedTotalQuantity = useMemo(() => {
    if (!booking?.items || !Array.isArray(booking.items)) return 0;
    return booking.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  }, [booking]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // poll for tickets function
  const pollTickets = useCallback(
    async (bookingId: string, expectedCount: number, step = 0) => {
      if (!isMountedRef.current) return;

      try {
        const rawTickets = await ticketApi.getMyTickets();
        if (!isMountedRef.current) return;

        // strictly filter by bookingId
        const matchingRaw = rawTickets.filter((tk) => tk.bookingId === bookingId);
        if (matchingRaw.length > 0) {
          const hydrated = await hydrateTickets(matchingRaw);
          if (isMountedRef.current) {
            setTickets(hydrated);
          }
        }

        // if all tickets have been issued, stop polling
        if (matchingRaw.length >= expectedCount && expectedCount > 0) {
          stopPolling();
          return;
        }

        // check if there are more steps in schedule
        if (step < POLL_INTERVALS.length) {
          const nextInterval = POLL_INTERVALS[step];
          pollTimerRef.current = setTimeout(() => {
            pollTickets(bookingId, expectedCount, step + 1);
          }, nextInterval);
        } else {
          // reached timeout (~40s) without all tickets
          if (isMountedRef.current) {
            stopPolling();
            setPollTimedOut(true);
          }
        }
      } catch (err) {
        console.warn("Polling tickets error:", err);
        // continue polling next step without showing error toast
        if (step < POLL_INTERVALS.length && isMountedRef.current) {
          pollTimerRef.current = setTimeout(() => {
            pollTickets(bookingId, expectedCount, step + 1);
          }, POLL_INTERVALS[step]);
        } else if (isMountedRef.current) {
          stopPolling();
          setPollTimedOut(true);
        }
      }
    },
    [stopPolling]
  );

  // main loader for order data
  const loadOrderData = useCallback(
    async (isManualReload = false) => {
      if (!normalizedCode) return;
      if (!isManualReload) {
        setLoading(true);
      }
      setError(null);
      if (isManualReload) {
        setPollTimedOut(false);
      }

      try {
        // 1. fetch booking details from booking-service
        let bookingInfo: BookingDetailResponse | null = await bookingApi.getBookingByCode(normalizedCode);

        // fallback: if not found by code, try by ID in case route param was UUID
        if (!bookingInfo) {
          const fallbackResp = await bookingApi.getBookingById(normalizedCode);
          if (fallbackResp && fallbackResp.bookingCode) {
            bookingInfo = await bookingApi.getBookingByCode(fallbackResp.bookingCode);
          }
        }

        if (!bookingInfo) {
          setError(t("Không tìm thấy thông tin đơn hàng này trong tài khoản của bạn."));
          setLoading(false);
          return;
        }

        if (!isMountedRef.current) return;
        setBooking(bookingInfo);

        // 2. fetch event information
        if (bookingInfo.eventId) {
          try {
            const evt = await eventApi.getEventById(bookingInfo.eventId);
            if (isMountedRef.current) {
              setEventData(evt);
            }
          } catch {
            // non-fatal
          }
        }

        // 3. fetch tickets from ticketApi filtered strictly by bookingId
        const rawTickets = await ticketApi.getMyTickets();
        if (!isMountedRef.current) return;

        const matchingRaw = rawTickets.filter((tk) => tk.bookingId === bookingInfo.id);
        const hydrated = await hydrateTickets(matchingRaw);

        if (isMountedRef.current) {
          setTickets(hydrated);
        }

        // 4. calculate expected total quantity
        const totalExpected = (bookingInfo.items || []).reduce(
          (sum, it) => sum + (it.quantity || 1),
          0
        );

        // 5. check if we need to poll for issuance
        const isPaid = bookingInfo.status === "PAID" || bookingInfo.status === "CONFIRMED";
        if (isPaid && hydrated.length < totalExpected) {
          setPollTimedOut(false);
          // start polling
          stopPolling();
          pollTickets(bookingInfo.id, totalExpected, 0);
        } else {
          stopPolling();
        }

        // 6. get user profile customer name
        const cached = getCachedUserProfile();
        if (cached?.fullName && isMountedRef.current) {
          setCustomerName(cached.fullName.trim());
        }
      } catch (err) {
        console.error("Failed to load order details:", err);
        if (isMountedRef.current) {
          setError(t("Không thể tải thông tin đơn hàng. Vui lòng thử lại sau."));
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [normalizedCode, pollTickets, stopPolling, t]
  );

  // mount, unmount cleanup, and focus/visibility refetch
  useEffect(() => {
    isMountedRef.current = true;
    window.scrollTo(0, 0);
    loadOrderData();

    const handleFocus = () => {
      loadOrderData();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadOrderData();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isMountedRef.current = false;
      stopPolling();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadOrderData, stopPolling]);

  const copyOrderCode = () => {
    if (!booking?.bookingCode && !normalizedCode) return;
    navigator.clipboard.writeText(booking?.bookingCode || normalizedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const formattedPurchaseDate = useMemo(() => {
    const rawVal = booking?.createdAt;
    if (!rawVal) return null;
    const d = parseApiDateTime(rawVal) || new Date(rawVal);
    if (isNaN(d.getTime())) return String(rawVal);
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  }, [booking?.createdAt]);

  // showtime information from event showtimes
  const showtimeInfo = useMemo(() => {
    if (!eventData || !booking?.showtimeId) return null;
    const showtimes = Array.isArray(eventData.showtimes) ? (eventData.showtimes as Array<{ id?: string; startTime?: string; endTime?: string }>) : [];
    return showtimes.find((st) => st.id === booking.showtimeId);
  }, [eventData, booking?.showtimeId]);

  const eventStartTime = showtimeInfo?.startTime || (eventData?.startTime as string | undefined);
  const formattedEventTime = formatEventTime(eventStartTime);

  const isPaidStatus = booking?.status === "PAID" || booking?.status === "CONFIRMED";
  const isIssuingTickets = isPaidStatus && tickets.length < expectedTotalQuantity;

  return (
    <div className="min-h-screen app-bg-page app-text-main pb-24">
      {/* ── TOP BREADCRUMB / NAV ── */}
      <div className="border-b app-border bg-white dark:bg-slate-900 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(PATHS.MY_TICKETS)}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            <FiArrowLeft className="w-4 h-4" />
            <span>{t("Quay lại Vé của tôi")}</span>
          </button>

          {booking && (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs text-slate-400">{t("Đơn hàng")}:</span>
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-900/50">
                {booking.bookingCode}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6">
        {loading ? (
          <div className="rounded-2xl border app-border app-bg-card p-16 text-center shadow-xs">
            <div className="flex flex-col items-center gap-3">
              <div className="w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium app-text-sub">{t("Đang tải thông tin đơn hàng...")}</span>
            </div>
          </div>
        ) : error || !booking ? (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30 p-10 text-center shadow-xs">
            <FiAlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-rose-700 dark:text-rose-300">{error || t("Không tìm thấy đơn hàng")}</h2>
            <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">
              {t("Vui lòng kiểm tra lại mã đơn hàng hoặc quay lại danh sách vé của bạn.")}
            </p>
            <button
              type="button"
              onClick={() => navigate(PATHS.MY_TICKETS)}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              <FiArrowLeft className="w-4 h-4" />
              <span>{t("Xem danh sách đơn hàng")}</span>
            </button>
          </div>
        ) : (
          <>
            {/* ── ISSUING / POLLING STATUS BANNER ── */}
            {isIssuingTickets && !pollTimedOut && (
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent p-5 sm:p-6 shadow-xs dark:border-blue-900 dark:from-blue-950/40">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <FiRefreshCw className="w-5 h-5 animate-spin" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {t("Thanh toán thành công! Hệ thống đang phát hành vé điện tử...")}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {t("Đang khởi tạo mã QR và vị trí vé (Đã phát hành {{current}}/{{total}} vé). Vui lòng đợi trong giây lát.", {
                          current: tickets.length,
                          total: expectedTotalQuantity,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                    <span>{t("Đang xử lý")}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── POLLING TIMED OUT BANNER (Non-blocking, helpful reload) ── */}
            {isIssuingTickets && pollTimedOut && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/30 p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                      <FiInfo className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-amber-900 dark:text-amber-200">
                        {t("Thanh toán đã được ghi nhận, vé sẽ xuất hiện trong ít phút")}
                      </h2>
                      <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                        {t("Hệ thống đang hoàn tất xử lý vé qua hàng đợi. Bạn có thể nhấn 'Tải lại' hoặc quay lại sau mà không cần thao tác gì thêm.")}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadOrderData(true)}
                    className="inline-flex shrink-0 items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    <FiRefreshCw className="w-3.5 h-3.5" />
                    <span>{t("Tải lại")}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── ORDER HEADER & EVENT SUMMARY CARD ── */}
            <div className="overflow-hidden rounded-2xl border app-border app-bg-card shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-12">
                {/* Left: Event Poster Image */}
                <div className="lg:col-span-4 relative bg-slate-950 min-h-[220px] lg:min-h-full overflow-hidden">
                  {eventData?.posterImage ? (
                    <img
                      src={String(eventData.posterImage || "")}
                      alt={String(eventData.title || "")}
                      className="w-full h-full object-cover filter brightness-95"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-500 min-h-[200px]">
                      <FiPackage className="h-12 w-12 opacity-30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent lg:hidden" />
                </div>

                {/* Right: Order & Event Details */}
                <div className="lg:col-span-8 p-6 sm:p-7 flex flex-col justify-between space-y-6">
                  <div>
                    {/* Status & Badges row */}
                    <div className="flex flex-wrap items-center gap-2.5 mb-3">
                      {booking.status === "PAID" || booking.status === "CONFIRMED" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <FiCheckCircle className="w-3.5 h-3.5" />
                          {t("Đã thanh toán")}
                        </span>
                      ) : booking.status === "PENDING" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <FiClock className="w-3.5 h-3.5" />
                          {t("Chờ thanh toán")}
                        </span>
                      ) : booking.status === "CANCELLED" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <FiAlertCircle className="w-3.5 h-3.5" />
                          {t("Đã hủy")}
                        </span>
                      ) : booking.status === "EXPIRED" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                          <FiClock className="w-3.5 h-3.5" />
                          {t("Đã hết hạn")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          <FiRefreshCw className="w-3.5 h-3.5" />
                          {t("Đã hoàn tiền")}
                        </span>
                      )}

                      {tickets.length > 0 && <StatusBadge status={tickets[0].status} />}
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        E-ticket
                      </span>
                    </div>

                    {/* Event Title */}
                    <h1 className="text-xl sm:text-2xl font-black app-text-main leading-tight tracking-tight">
                      {String(eventData?.title || t("Sự kiện HaloTicket"))}
                    </h1>

                    {/* Event Date & Location */}
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <FiCalendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="font-semibold">{formattedEventTime}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <FiMapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="app-text-sub truncate">
                          {String(eventData?.locationName || eventData?.address || t("Đang cập nhật địa điểm"))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Order Meta Grid */}
                  <div className="pt-4 border-t app-border grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {t("Mã đơn hàng")}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold app-text-main truncate">
                          {booking.bookingCode}
                        </span>
                        <button
                          type="button"
                          onClick={copyOrderCode}
                          aria-label={t("Sao chép mã đơn hàng")}
                          className="text-slate-400 hover:text-blue-600 cursor-pointer"
                        >
                          {copiedCode ? <FiCheck className="w-3.5 h-3.5 text-emerald-500" /> : <FiCopy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {t("Số lượng vé")}
                      </p>
                      <p className="mt-1 text-sm font-bold text-blue-600 dark:text-blue-400">
                        {expectedTotalQuantity} {t("vé")}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {t("Tổng thanh toán")}
                      </p>
                      <p className="mt-1 text-base font-black text-slate-900 dark:text-white font-mono">
                        {formatCurrency(booking.totalAmount)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {t("Thời gian đặt")}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {formattedPurchaseDate || t("Đã ghi nhận")}
                      </p>
                    </div>
                  </div>

                  {/* Customer & Event Page Link */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {customerName && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t("Khách hàng")}: <strong className="app-text-main">{customerName}</strong>
                      </p>
                    )}
                    <Link
                      to={`/events/${booking.eventId}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>{t("Xem trang sự kiện")}</span>
                      <FiExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* ── ORDER ITEMS BREAKDOWN ── */}
            {booking.items && booking.items.length > 0 && (
              <div className="rounded-2xl border app-border app-bg-card p-5 sm:p-6 shadow-xs space-y-4">
                <h2 className="text-base font-bold app-text-main flex items-center gap-2">
                  <FiPackage className="text-blue-600 dark:text-blue-400" />
                  <span>{t("Chi tiết các hạng vé đã đặt")}</span>
                </h2>
                <div className="divide-y app-border overflow-hidden rounded-xl border app-border bg-slate-50/50 dark:bg-slate-900/40">
                  {booking.items.map((item, idx) => (
                    <div
                      key={item.ticketTypeId || idx}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm border-none"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold app-text-main">{item.ticketTypeName}</span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatCurrency(item.unitPrice)} × {item.quantity} {t("vé")}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white sm:text-right">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TICKETS LIST IN THIS ORDER ── */}
            {tickets.length > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold app-text-main flex items-center gap-2">
                      <FaTicketAlt className="text-blue-600 dark:text-blue-400" />
                      <span>
                        {t("Danh sách vé điện tử")} ({tickets.length}/{expectedTotalQuantity} {t("vé")})
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {t("Mỗi ghế có mã QR check-in và mã vé riêng biệt. Bấm vào 'Xem vé / QR' để xuất trình vé tại sự kiện.")}
                    </p>
                  </div>
                </div>

                {/* Tickets Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tickets.map((tk, idx) => {
                    const isEligible = tk.status === "UPCOMING" && tk.rawStatus === "VALID";
                    return (
                      <div
                        key={tk.id}
                        className="group relative overflow-hidden rounded-2xl border app-border app-bg-card shadow-xs transition-all duration-200 hover:shadow-md hover:border-blue-400/50"
                      >
                        {/* Ticket Card Header */}
                        <div className="px-5 py-3.5 bg-slate-50/70 dark:bg-slate-900/60 border-b app-border flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white font-mono font-extrabold text-[11px] uppercase tracking-wide">
                              {t("Vé")} {idx + 1}/{expectedTotalQuantity || tickets.length}
                            </span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {tk.ticketTypeName}
                            </span>
                          </div>
                          <StatusBadge status={tk.status} />
                        </div>

                        {/* Ticket Card Body */}
                        <div className="p-5 space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {t("Vị trí / Ghế")}
                              </p>
                              <p className="mt-0.5 text-sm font-black text-slate-900 dark:text-white">
                                {tk.seatName || t("Vé tự do")}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {t("Giá vé")}
                              </p>
                              <p className="mt-0.5 text-sm font-black text-slate-900 dark:text-white font-mono">
                                {formatCurrency(tk.totalAmount)}
                              </p>
                            </div>
                          </div>

                          {/* Ticket Code */}
                          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-between">
                            <div className="min-w-0">
                              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                                {t("Mã vé")}
                              </span>
                              <p className="font-mono text-xs font-bold app-text-main truncate">
                                {tk.id}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(tk.id);
                              }}
                              title={t("Sao chép mã vé")}
                              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                            >
                              <FiCopy className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Primary Action Button: Xem vé / QR */}
                          <div className="pt-1 space-y-2">
                            <button
                              type="button"
                              onClick={() => setViewerTicket(tk)}
                              className="w-full py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 active:scale-[0.98] text-white font-extrabold text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              <FaQrcode className="w-4 h-4" />
                              <span>{t("Xem vé / QR")}</span>
                            </button>

                            {/* Quick sub-actions */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => downloadTicketAsImage(tk)}
                                className="py-2 px-3 rounded-lg border app-border text-xs font-semibold app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <FiDownload className="w-3.5 h-3.5 text-blue-500" />
                                <span>{t("Tải vé (.PNG)")}</span>
                              </button>

                              <Link
                                to={`/my-tickets/${tk.id}`}
                                className="py-2 px-3 rounded-lg border app-border text-xs font-semibold app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                              >
                                <span>{t("Chi tiết")}</span>
                                <FiExternalLink className="w-3.5 h-3.5 text-slate-400" />
                              </Link>
                            </div>

                            {/* Resale and Gift buttons if eligible */}
                            {isEligible && (
                              <div className="grid grid-cols-2 gap-2 pt-1 border-t app-border">
                                <button
                                  type="button"
                                  onClick={() => setResaleTicket(tk)}
                                  className="py-2 px-3 rounded-lg border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <FiTag className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{t("Đăng bán lại")}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setGiftTicket(tk)}
                                  className="py-2 px-3 rounded-lg border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <FiGift className="w-3.5 h-3.5 text-blue-600" />
                                  <span>{t("Tặng vé")}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* ── CHECK-IN INSTRUCTIONS CARD ── */}
            <div className="rounded-2xl border app-border app-bg-card p-6 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold app-text-main flex items-center gap-2">
                <FiClock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{t("Hướng dẫn sử dụng vé & Check-in")}</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400 list-disc list-inside leading-relaxed">
                <li>
                  {t("Xuất trình mã QR trực tiếp trên màn hình điện thoại hoặc ảnh tải về tại cổng soát vé sự kiện.")}
                </li>
                <li>
                  {t("Mỗi mã QR chỉ có hiệu lực cho một lượt check-in duy nhất tương ứng với một ghế ngồi.")}
                </li>
                <li>
                  {t("Không chia sẻ ảnh chụp mã QR lên mạng xã hội hoặc người lạ để tránh rủi ro vé bị sử dụng trước.")}
                </li>
                <li>
                  {t("Mọi sự cố hoặc thắc mắc, vui lòng liên hệ hotline HaloTicket: 1900.6408 hoặc email support@haloticket.vn.")}
                </li>
              </ul>
            </div>
          </>
        )}
      </div>

      {/* ── MODALS ── */}
      {viewerTicket && (
        <TicketViewer
          ticket={viewerTicket}
          onClose={() => setViewerTicket(undefined)}
          onResale={(tk) => {
            setViewerTicket(undefined);
            setResaleTicket(tk);
          }}
          onGift={(tk) => {
            setViewerTicket(undefined);
            setGiftTicket(tk);
          }}
        />
      )}

      {resaleTicket && (
        <ResaleTicketModal
          ticket={resaleTicket}
          onClose={() => setResaleTicket(undefined)}
          onChanged={() => loadOrderData()}
        />
      )}

      {giftTicket && (
        <GiftTicketModal
          ticket={giftTicket}
          onClose={() => setGiftTicket(undefined)}
          onChanged={() => loadOrderData()}
        />
      )}
    </div>
  );
}
