import { useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FiCalendar,
  FiMapPin,
  FiArrowRight,
  FiMoreHorizontal,
  FiDownload,
  FiTag,
  FiGift,
  FiEye,
} from "react-icons/fi";
import { FaTicketAlt } from "react-icons/fa";
import { PATHS } from "@/routes/paths";
import {
  type OrderGroup,
  type TicketItem,
  StatusBadge,
  downloadTicketAsImage,
} from "./MyTickets";

export interface OrderCardProps {
  order: OrderGroup;
  isLast?: boolean;
  isMenuOpen?: boolean;
  onToggleMenu?: (orderKey?: string) => void;
  onViewTicket?: (ticket: TicketItem) => void;
  onResale?: (ticket: TicketItem) => void;
  onGift?: (ticket: TicketItem) => void;
}

function parseOrderDate(value?: string, t?: (k: string, opt?: Record<string, unknown>) => string) {
  const date = value ? new Date(value) : null;
  const defaultMonth = t ? t("THÁNG {{m}}", { m: "09" }) : "THÁNG 09";
  if (!date || Number.isNaN(date.getTime())) {
    return { day: "30", month: defaultMonth, year: "2026" };
  }
  const day = new Intl.DateTimeFormat("vi-VN", { day: "2-digit" }).format(date);
  const m = new Intl.DateTimeFormat("vi-VN", { month: "2-digit" }).format(date);
  const month = t ? t("THÁNG {{m}}", { m }) : `THÁNG ${m}`;
  const year = String(date.getFullYear());
  return { day, month, year };
}

export function OrderCard({
  order,
  isLast = false,
  isMenuOpen = false,
  onToggleMenu,
  onResale,
  onGift,
}: OrderCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  const date = parseOrderDate(order.eventStartsAt, t);
  const orderUrl = PATHS.ORDER_DETAIL(order.bookingCode);
  const uniqueSeats = Array.from(new Set(order.tickets.map((tk) => tk.seatName).filter(Boolean))) as string[];
  const seats = uniqueSeats.length === 1 && uniqueSeats[0].startsWith("Vé tự do")
    ? uniqueSeats[0]
    : uniqueSeats.join(", ");
  const firstTicket = order.tickets[0];
  const transactionTicket = order.tickets.find(
    (ticket) => ticket.status === "UPCOMING" && ticket.rawStatus === "VALID",
  );

  // close menu when clicking outside
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onToggleMenu?.(undefined);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen, onToggleMenu]);

  return (
    <div className="relative flex items-stretch gap-4 md:gap-6 group">
      {/* ── LEFT DESKTOP TIMELINE COLUMN (Requested by user) ── */}
      <div className="hidden md:flex flex-col items-center shrink-0 w-10 relative">
        {/* Timeline circular dot marker */}
        <div className="w-10 h-10 rounded-full border-2 border-blue-500 bg-white dark:bg-slate-900 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm z-10 group-hover:scale-110 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 transition-all duration-200">
          <FaTicketAlt className="w-4 h-4" />
        </div>
        {/* Vertical line connecting to next order */}
        {!isLast && (
          <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-800 my-2" />
        )}
      </div>

      {/* ── MAIN ORDER CARD (Ticketbox ticket-stub design, fully synchronized light & dark) ── */}
      <article
        onClick={() => navigate(orderUrl)}
        className="flex-1 mb-5 md:mb-6 rounded-2xl border app-border app-bg-card shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden relative cursor-pointer group/card"
      >
        <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] md:grid-cols-[130px_1fr] min-h-[140px]">
          {/* ── LEFT DATE STUB ── */}
          <div className="relative flex sm:flex-col items-center justify-center gap-1 sm:gap-0.5 p-3.5 sm:p-4 text-center bg-slate-50 dark:bg-slate-800/60 border-b sm:border-b-0 sm:border-r-2 sm:border-dashed border-slate-200 dark:border-slate-700/80 shrink-0">
            {/* Semicircular notch cutouts on divider (adapts to app-bg-page) */}
            <span
              aria-hidden="true"
              className="hidden sm:block absolute -top-3.5 -right-3.5 z-10 w-7 h-7 rounded-full bg-[var(--bg-page)] border app-border"
            />
            <span
              aria-hidden="true"
              className="hidden sm:block absolute -bottom-3.5 -right-3.5 z-10 w-7 h-7 rounded-full bg-[var(--bg-page)] border app-border"
            />

            <div className="flex sm:flex-col items-baseline sm:items-center gap-2 sm:gap-0">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-none">
                {date.day}
              </span>
              <span className="text-xs sm:text-[13px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mt-1">
                {date.month}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                {date.year}
              </span>
            </div>
          </div>

          {/* ── RIGHT CONTENT SECTION ── */}
          <div className="p-4 sm:p-5 flex flex-col justify-between min-w-0 relative">
            {/* Top row: Badges + 3-dot action button */}
            <div className="flex items-start justify-between gap-3 pr-10">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={order.status} />
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                  E-ticket
                </span>
                {order.acquisitionType === "RESALE" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                    <FiTag className="w-3 h-3" />
                    {t("Vé mua lại")}
                  </span>
                )}
              </div>
            </div>

            {/* Event Title */}
            <h2 className="mt-2.5 text-base sm:text-lg font-bold app-text-main group-hover/card:text-blue-600 dark:group-hover/card:text-blue-400 transition-colors line-clamp-2 leading-snug">
              {order.eventTitle}
            </h2>

            {/* Facts: Code, Time, Location */}
            <div className="mt-3 space-y-1.5 text-xs sm:text-sm">
              <div className="flex items-center gap-2 app-text-sub font-mono">
                <FaTicketAlt className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate">
                  {order.hasBookingCode ? `${t("Mã đơn")}: ${order.bookingCode}` : `${t("Mã vé")}: ${order.bookingCode}`}
                </span>
              </div>
              <div className="flex items-center gap-2 app-text-sub">
                <FiCalendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{order.eventTime}</span>
              </div>
              <div className="flex items-center gap-2 app-text-sub">
                <FiMapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate">{order.eventLocation}</span>
              </div>
            </div>

            {/* Bottom summary bar */}
            <div className="mt-4 pt-3 border-t app-border flex items-center justify-between gap-3 text-xs sm:text-sm">
              <span className="flex items-center gap-1.5 font-bold app-text-main truncate">
                <FaTicketAlt className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  {order.quantity} {t("vé")}
                  {seats ? ` · ${seats}` : ""}
                </span>
              </span>

              <span className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 group-hover/card:translate-x-0.5 transition-transform shrink-0">
                <span>{t("Xem đơn hàng")}</span>
                <FiArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>

        {/* ── 3-DOT ACTION MENU BUTTON (Top Right Corner - Preserved as requested) ── */}
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3.5 right-3.5 z-20"
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleMenu?.(isMenuOpen ? undefined : order.orderKey);
            }}
            aria-label={t("Thao tác với đơn hàng")}
            aria-expanded={isMenuOpen}
            className="flex h-8 w-8 items-center justify-center rounded-full border app-border bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white shadow-xs backdrop-blur-xs transition cursor-pointer"
          >
            <FiMoreHorizontal className="h-4 w-4" />
          </button>

          {isMenuOpen && (
            <div
              className="absolute right-0 top-10 z-30 w-52 overflow-hidden rounded-xl border app-border app-bg-card py-1.5 shadow-2xl app-text-main animate-in zoom-in-95 duration-100"
            >
              <Link
                to={orderUrl}
                onClick={() => onToggleMenu?.(undefined)}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FiEye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>{t("Xem chi tiết đơn hàng")}</span>
              </Link>

              {firstTicket && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleMenu?.(undefined);
                    downloadTicketAsImage(firstTicket);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <FiDownload className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{t("Tải vé (.PNG)")}</span>
                </button>
              )}

              {transactionTicket && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onToggleMenu?.(undefined);
                      onResale?.(transactionTicket);
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <FiTag className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{t("Đăng bán lại")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onToggleMenu?.(undefined);
                      onGift?.(transactionTicket);
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <FiGift className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    <span>{t("Tặng vé")}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

export default OrderCard;
