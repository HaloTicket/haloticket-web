import { useCallback, useEffect, useState, useMemo } from "react";
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
} from "react-icons/fi";
import { FaTicketAlt, FaQrcode } from "react-icons/fa";
import { ticketApi } from "@/services/ticketApi";
import { bookingApi } from "@/services/bookingApi";
import { getCachedUserProfile } from "@/services/userApi";
import { PATHS } from "@/routes/paths";
import { formatCurrency } from "@/utils/formatters";
import {
  type TicketItem,
  type OrderGroup,
  hydrateTickets,
  groupTicketsIntoOrders,
  downloadTicketAsImage,
  TicketViewer,
  StatusBadge,
} from "./MyTickets";
import { GiftTicketModal, ResaleTicketModal } from "./TicketActionModals";

export default function OrderDetail() {
  const { t } = useTranslation();
  const { orderCode } = useParams<{ orderCode: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [customerName, setCustomerName] = useState<string>("");

  const [viewerTicket, setViewerTicket] = useState<TicketItem>();
  const [resaleTicket, setResaleTicket] = useState<TicketItem>();
  const [giftTicket, setGiftTicket] = useState<TicketItem>();

  const loadOrderData = useCallback(async () => {
    if (!orderCode) return;
    setLoading(true);
    setError(null);
    try {
      const rawTickets = await ticketApi.getMyTickets();
      const hydrated = await hydrateTickets(Array.isArray(rawTickets) ? rawTickets : []);
      const orders = groupTicketsIntoOrders(hydrated);

      const normalized = orderCode.replace(/^booking:/i, "").toLowerCase();
      const targetOrder = orders.find(
        (o) =>
          o.bookingCode.toLowerCase() === normalized ||
          o.orderKey.toLowerCase() === orderCode.toLowerCase() ||
          o.orderKey.toLowerCase() === `booking:${normalized}` ||
          o.bookingCode.toLowerCase() === orderCode.toLowerCase()
      );

      if (targetOrder) {
        setOrder(targetOrder);
      } else {
        const singleTicket = hydrated.find(
          (tk) => tk.id.toLowerCase() === orderCode.toLowerCase()
        );
        if (singleTicket) {
          const fallbackOrder: OrderGroup = {
            orderKey: `ticket:${singleTicket.id}`,
            hasBookingCode: Boolean(singleTicket.bookingCode && singleTicket.bookingCode !== singleTicket.id),
            bookingCode: singleTicket.bookingCode || singleTicket.id,
            eventId: singleTicket.eventId,
            eventTitle: singleTicket.eventTitle,
            eventStartsAt: singleTicket.eventStartsAt,
            eventTime: singleTicket.eventTime,
            eventLocation: singleTicket.eventLocation,
            eventPoster: singleTicket.eventPoster,
            tickets: [singleTicket],
            totalAmount: singleTicket.totalAmount,
            quantity: 1,
            status: singleTicket.status,
            rawStatus: singleTicket.rawStatus,
            acquisitionType: singleTicket.acquisitionType,
            purchaseDate: singleTicket.purchaseDate,
          };
          setOrder(fallbackOrder);
        } else {
          setError(t("Không tìm thấy thông tin đơn hàng này trong tài khoản của bạn."));
        }
      }

      try {
        const booking = await bookingApi.getBookingById(orderCode);
        const b = booking as { customerName?: string; createdAt?: string } | null;
        if (b?.customerName && b.customerName.trim()) {
          setCustomerName(b.customerName.trim());
        }
        if (b?.createdAt && targetOrder && !targetOrder.purchaseDate) {
          targetOrder.purchaseDate = b.createdAt;
          setOrder({ ...targetOrder });
        }
      } catch {
        // fallback
      }

      const cached = getCachedUserProfile();
      if (cached?.fullName) {
        setCustomerName((prev) => prev || cached.fullName.trim());
      }
    } catch (err) {
      console.error("Failed to load order details:", err);
      setError(t("Không thể tải thông tin đơn hàng. Vui lòng thử lại sau."));
    } finally {
      setLoading(false);
    }
  }, [orderCode, t]);

  useEffect(() => {
    window.scrollTo(0, 0);
    let active = true;
    (async () => {
      if (!orderCode) return;
      try {
        const rawTickets = await ticketApi.getMyTickets();
        const hydrated = await hydrateTickets(Array.isArray(rawTickets) ? rawTickets : []);
        const orders = groupTicketsIntoOrders(hydrated);

        const normalized = orderCode.replace(/^booking:/i, "").toLowerCase();
        const targetOrder = orders.find(
          (o) =>
            o.bookingCode.toLowerCase() === normalized ||
            o.orderKey.toLowerCase() === orderCode.toLowerCase() ||
            o.orderKey.toLowerCase() === `booking:${normalized}` ||
            o.bookingCode.toLowerCase() === orderCode.toLowerCase()
        );

        if (targetOrder) {
          if (active) setOrder(targetOrder);
        } else {
          const singleTicket = hydrated.find(
            (tk) => tk.id.toLowerCase() === orderCode.toLowerCase()
          );
          if (singleTicket) {
            const fallbackOrder: OrderGroup = {
              orderKey: `ticket:${singleTicket.id}`,
              hasBookingCode: Boolean(singleTicket.bookingCode && singleTicket.bookingCode !== singleTicket.id),
              bookingCode: singleTicket.bookingCode || singleTicket.id,
              eventId: singleTicket.eventId,
              eventTitle: singleTicket.eventTitle,
              eventStartsAt: singleTicket.eventStartsAt,
              eventTime: singleTicket.eventTime,
              eventLocation: singleTicket.eventLocation,
              eventPoster: singleTicket.eventPoster,
              tickets: [singleTicket],
              totalAmount: singleTicket.totalAmount,
              quantity: 1,
              status: singleTicket.status,
              rawStatus: singleTicket.rawStatus,
              acquisitionType: singleTicket.acquisitionType,
              purchaseDate: singleTicket.purchaseDate,
            };
            if (active) setOrder(fallbackOrder);
          } else {
            if (active) setError(t("Không tìm thấy thông tin đơn hàng này trong tài khoản của bạn."));
          }
        }

        try {
          const booking = await bookingApi.getBookingById(orderCode);
          const b = booking as { customerName?: string; createdAt?: string } | null;
          if (b?.customerName && b.customerName.trim() && active) {
            setCustomerName(b.customerName.trim());
          }
          if (b?.createdAt && targetOrder && !targetOrder.purchaseDate && active) {
            targetOrder.purchaseDate = b.createdAt;
            setOrder({ ...targetOrder });
          }
        } catch {
          // ignore
        }

        const cached = getCachedUserProfile();
        if (cached?.fullName && active) {
          setCustomerName((prev) => prev || cached.fullName.trim());
        }
      } catch (err) {
        console.error("Failed to load order details:", err);
        if (active) setError(t("Không thể tải thông tin đơn hàng. Vui lòng thử lại sau."));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [orderCode, t]);

  const copyOrderCode = () => {
    if (!orderCode) return;
    navigator.clipboard.writeText(orderCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const formattedPurchaseDate = useMemo(() => {
    const rawVal = order?.purchaseDate;
    if (!rawVal) return null;
    const d = Array.isArray(rawVal)
      ? new Date(
          Number(rawVal[0]),
          Number(rawVal[1] ?? 1) - 1,
          Number(rawVal[2] ?? 1),
          Number(rawVal[3] ?? 0),
          Number(rawVal[4] ?? 0),
          Number(rawVal[5] ?? 0)
        )
      : new Date(String(rawVal));
    if (isNaN(d.getTime())) return String(rawVal);
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  }, [order]);

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

          {order && (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs text-slate-400">{t("Đơn hàng")}:</span>
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-900/50">
                {order.bookingCode}
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
        ) : error || !order ? (
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
            {/* ── ORDER HEADER & EVENT SUMMARY CARD ── */}
            <div className="overflow-hidden rounded-2xl border app-border app-bg-card shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-12">
                {/* Left: Event Poster Image */}
                <div className="lg:col-span-4 relative bg-slate-950 min-h-[220px] lg:min-h-full overflow-hidden">
                  {order.eventPoster ? (
                    <img
                      src={order.eventPoster}
                      alt={order.eventTitle}
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
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <FiCheckCircle className="w-3.5 h-3.5" />
                        {t("Đã thanh toán")}
                      </span>
                      <StatusBadge status={order.status} />
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        E-ticket
                      </span>
                    </div>

                    {/* Event Title */}
                    <h1 className="text-xl sm:text-2xl font-black app-text-main leading-tight tracking-tight">
                      {order.eventTitle}
                    </h1>

                    {/* Event Date & Location */}
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <FiCalendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="font-semibold">{order.eventTime}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <FiMapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="app-text-sub truncate">{order.eventLocation}</span>
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
                          {order.bookingCode}
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
                        {t("Số lượng")}
                      </p>
                      <p className="mt-1 text-sm font-bold text-blue-600 dark:text-blue-400">
                        {order.quantity} {t("vé")}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {t("Tổng thanh toán")}
                      </p>
                      <p className="mt-1 text-base font-black text-slate-900 dark:text-white font-mono">
                        {formatCurrency(order.totalAmount)}
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

                  {/* Link to Event Page */}
                  <div className="pt-2 flex items-center justify-between">
                    {customerName && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t("Khách hàng")}: <strong className="app-text-main">{customerName}</strong>
                      </p>
                    )}
                    <Link
                      to={`/events/${order.eventId}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>{t("Xem trang sự kiện")}</span>
                      <FiExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* ── TICKETS LIST IN THIS ORDER ── */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold app-text-main flex items-center gap-2">
                    <FaTicketAlt className="text-blue-600 dark:text-blue-400" />
                    <span>
                      {t("Danh sách vé điện tử")} ({order.tickets.length} {t("vé")})
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t("Mỗi ghế có mã QR check-in và mã vé riêng biệt. Bấm vào 'Xem vé / QR' để xuất trình vé tại sự kiện.")}
                  </p>
                </div>
              </div>

              {/* Tickets Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {order.tickets.map((tk, idx) => {
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
                            {t("Vé")} {idx + 1}/{order.quantity}
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
                              {tk.seatName || t("Vé tự do (GA)")}
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
