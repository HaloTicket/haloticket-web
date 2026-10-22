/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiCopy,
  FiDownload,
  FiEyeOff,
  FiGift,
  FiLock,
  FiMapPin,
  FiSearch,
  FiTag,
  FiX,
  FiPackage,
} from "react-icons/fi";
import { eventApi } from "@/services/eventApi";
import { ticketApi } from "@/services/ticketApi";
import { marketplaceApi } from "@/services/marketplaceApi";
import { getCachedUserProfile } from "@/services/userApi";
import { PATHS } from "@/routes/paths";
import { formatCurrency } from "@/utils/formatters";
import type { BookingResponse, OwnedTicketApiResponse } from "@/types";
import { GiftTicketModal, ResaleTicketModal } from "./TicketActionModals";
import { TablePagination } from "@/components/common/TablePagination";
import { OrderCard } from "./OrderCard";

export type TicketFilter = "ALL" | "UPCOMING" | "USED" | "TRANSFERRED";
export type TicketUiStatus = "UPCOMING" | "USED" | "SELLING" | "GIFTING" | "TRANSFERRED" | "CANCELLED";

export interface TicketItem {
  id: string;
  bookingId?: string;
  showtimeId?: string;
  bookingCode: string;
  hasBookingCode?: boolean;
  eventId: string;
  eventTitle: string;
  eventStartsAt?: string;
  eventTime: string;
  eventLocation: string;
  eventPoster?: string | null;
  ticketTypeName: string;
  quantity: number;
  totalAmount: number;
  originalPrice?: number;
  acquisitionType?: string;
  purchaseDate?: string;
  customerName?: string;
  rawStatus: string;
  status: TicketUiStatus;
  qrCode?: string;
  section?: string;
  row?: string;
  seatNumber?: string;
  seatName?: string;
}

/** An order groups tickets that share the same bookingCode */
export interface OrderGroup {
  orderKey: string;
  bookingCode: string;
  hasBookingCode: boolean;
  bookingStatus?: BookingResponse["status"];
  eventId: string;
  eventTitle: string;
  eventStartsAt?: string;
  eventTime: string;
  eventLocation: string;
  eventPoster?: string | null;
  tickets: TicketItem[];
  totalAmount: number;
  quantity: number;
  /** Ticket ownership status, not a payment status. */
  status: TicketUiStatus;
  rawStatus: string;
  acquisitionType?: string;
  purchaseDate?: string;
}

export const STATUS_PRESENTATION: Record<TicketUiStatus, { labelKey: string; className: string; dotColor: string }> = {
  UPCOMING: { labelKey: "Sắp diễn ra", className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300", dotColor: "bg-blue-500" },
  USED: { labelKey: "Đã sử dụng", className: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300", dotColor: "bg-slate-400" },
  SELLING: { labelKey: "Đang bán", className: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300", dotColor: "bg-amber-500" },
  GIFTING: { labelKey: "Đang tặng", className: "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300", dotColor: "bg-violet-500" },
  TRANSFERRED: { labelKey: "Đã chuyển nhượng", className: "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400", dotColor: "bg-slate-400" },
  CANCELLED: { labelKey: "Đã hủy", className: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300", dotColor: "bg-rose-500" },
};

export function mapTicketStatus(status?: string | null): TicketUiStatus {
  const s = (status || "").trim().toUpperCase();
  switch (s) {
    case "USED": return "USED";
    case "LOCKED_FOR_RESALE": return "SELLING";
    case "LOCKED_FOR_TRANSFER": return "GIFTING";
    case "TRANSFERED":
    case "TRANSFERRED": return "TRANSFERRED";
    case "REVOKED":
    case "CANCELLED": return "CANCELLED";
    case "VALID":
    case "UPCOMING":
    default:
      return "UPCOMING";
  }
}

export function formatEventTime(value?: string) {
  if (!value) return "Chưa cập nhật lịch";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật lịch";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export async function hydrateTickets(items: OwnedTicketApiResponse[]): Promise<TicketItem[]> {
  if (!items || !Array.isArray(items)) return [];
  const eventIds = [...new Set(items.map((item) => item.eventId).filter(Boolean))];
  const entries = await Promise.all(
    eventIds.map(async (eventId) => {
      try {
        const event = await eventApi.getEventById(eventId);
        return [eventId, event] as const;
      } catch {
        return [eventId, null] as const;
      }
    })
  );
  const events = new Map(entries);

  return items.map((item) => {
    const event = events.get(item.eventId);
    const rawStatus = item.status || "VALID";
    const showtime = Array.isArray(event?.showtimes)
      ? event.showtimes.find((show: { id?: string }) => show.id === item.showtimeId) : undefined;
    const startsAt = typeof showtime?.startTime === "string" ? showtime.startTime
      : typeof event?.startTime === "string" ? event.startTime : undefined;
    const isResale =
      item.acquisitionType === "RESALE" ||
      (item.bookingCode || "").startsWith("RSL-") ||
      (item.bookingCode || "").includes("RESALE");

    return {
      id: item.id,
      bookingId: item.bookingId || undefined,
      showtimeId: item.showtimeId || undefined,
      bookingCode: item.bookingCode?.trim() || item.id,
      hasBookingCode: Boolean(item.bookingCode?.trim()),
      eventId: item.eventId,
      eventTitle: String(event?.title || `Sự kiện ${item.eventId}`),
      eventStartsAt: startsAt,
      eventTime: formatEventTime(startsAt),
      eventLocation: String(event?.locationName || event?.address || "Đang cập nhật"),
      eventPoster: String(event?.posterImage || event?.bannerUrl || ""),
      ticketTypeName: item.ticketTypeName || "Vé điện tử",
      quantity: 1,
      totalAmount: item.price || 0,
      originalPrice: item.originalPrice || undefined,
      acquisitionType: isResale ? "RESALE" : (item.acquisitionType || "PRIMARY"),
      purchaseDate: item.issuedAt || undefined,
      rawStatus,
      status: mapTicketStatus(rawStatus),
      qrCode: item.qrCode || undefined,
      seatName: item.seatName || undefined,
      section: item.section || undefined,
      row: item.row || undefined,
      seatNumber: item.seatNumber || undefined,
    };
  });
}

/** Group only tickets with a real shared booking code; orphan tickets stay separate. */
export function groupTicketsIntoOrders(tickets: TicketItem[]): OrderGroup[] {
  const map = new Map<string, TicketItem[]>();
  tickets.forEach((t) => {
    const hasBookingCode = t.hasBookingCode ?? (Boolean(t.bookingCode) && t.bookingCode !== t.id);
    const key = hasBookingCode ? `booking:${t.bookingCode}` : `ticket:${t.id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  });

  return Array.from(map.entries()).map(([orderKey, group]) => {
    const first = group[0];
    const hasBookingCode = orderKey.startsWith("booking:");
    const bookingCode = hasBookingCode ? first.bookingCode : first.id;
    const totalAmount = group.reduce((sum, t) => sum + t.totalAmount, 0);
    // derive order status from tickets
    const statuses = group.map((t) => t.status);
    let orderStatus: TicketUiStatus = first.status;
    if (statuses.some((s) => s === "UPCOMING")) orderStatus = "UPCOMING";
    else if (statuses.every((s) => s === "USED")) orderStatus = "USED";
    else if (statuses.some((s) => s === "SELLING")) orderStatus = "SELLING";
    else if (statuses.some((s) => s === "GIFTING")) orderStatus = "GIFTING";
    else if (statuses.every((s) => s === "TRANSFERRED")) orderStatus = "TRANSFERRED";
    else if (statuses.every((s) => s === "CANCELLED")) orderStatus = "CANCELLED";

    return {
      orderKey,
      bookingCode,
      hasBookingCode,
      eventId: first.eventId,
      eventTitle: first.eventTitle,
      eventStartsAt: first.eventStartsAt,
      eventTime: first.eventTime,
      eventLocation: first.eventLocation,
      eventPoster: first.eventPoster,
      tickets: group,
      totalAmount,
      quantity: group.length,
      status: orderStatus,
      rawStatus: first.rawStatus,
      acquisitionType: first.acquisitionType,
      purchaseDate: first.purchaseDate,
    };
  });
}

export function downloadTicketAsImage(ticket: TicketItem) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1050;
    canvas.height = 580;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#0f172a";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#2563eb";
    context.fillRect(42, 42, 154, 38);
    context.fillStyle = "#ffffff";
    context.font = "700 16px sans-serif";
    context.fillText("HALOTICKET", 58, 68);
    context.font = "700 28px sans-serif";
    const title = ticket.eventTitle.length > 42 ? `${ticket.eventTitle.slice(0, 39)}…` : ticket.eventTitle;
    context.fillText(title, 42, 135);
    context.fillStyle = "#cbd5e1";
    context.font = "16px sans-serif";
    context.fillText(ticket.eventTime, 42, 180);
    context.fillText(ticket.eventLocation, 42, 215);
    context.fillStyle = "#ffffff";
    context.font = "700 20px sans-serif";
    context.fillText(`${ticket.ticketTypeName} · ${formatCurrency(ticket.totalAmount)}`, 42, 280);
    context.fillStyle = "#94a3b8";
    context.font = "14px monospace";
    context.fillText(`Mã vé: ${ticket.id}`, 42, 325);
    if (ticket.rawStatus !== "VALID" || !ticket.qrCode) return;
    const qrValue = ticket.qrCode;
    const image = new Image();
    image.crossOrigin = "Anonymous";
    image.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrValue)}`;
    const save = () => {
      try {
        const link = document.createElement("a");
        link.download = `HaloTicket_${ticket.id}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } catch (err) {
        console.warn("Could not download canvas image:", err);
      }
    };
    image.onload = () => {
      try {
        context.fillStyle = "#ffffff";
        context.fillRect(740, 125, 250, 250);
        context.drawImage(image, 752, 137, 226, 226);
      } catch {
        // Tainted canvas fallback
      }
      save();
    };
    image.onerror = save;
  } catch (err) {
    console.warn("Error in downloadTicketAsImage:", err);
  }
}

export function StatusBadge({ status }: { status: TicketUiStatus }) {
  const { t } = useTranslation();
  const presentation = STATUS_PRESENTATION[status];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-xs ${presentation.className}`}>
      {t(presentation.labelKey)}
    </span>
  );
}

/**
 * Modal Xem vé điện tử (đồng bộ giao diện với Chi tiết vé):
 * - Nếu vé Đang bán hoặc bị khóa: hiển thị QR mờ kèm ổ khóa đè lên và mô tả cảnh báo.
 * - Nếu vé có hiệu lực: bấm vào QR để xem, bấm cái nữa để che QR.
 * - Hiển thị đầy đủ Thông tin vé, Hạng vé, Người nhận vé, Mã vé có nút copy, nút Đăng bán lại & Tặng vé.
 */
export interface TicketViewerProps {
  ticket: TicketItem;
  onClose: () => void;
  onResale?: (ticket: TicketItem) => void;
  onGift?: (ticket: TicketItem) => void;
}

export function TicketViewer({ ticket, onClose, onResale, onGift }: TicketViewerProps) {
  const { t } = useTranslation();
  const [copiedCode, setCopiedCode] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  const isSelling = ticket.status === "SELLING" || ticket.rawStatus === "LOCKED_FOR_RESALE";
  const isLocked = isSelling || ticket.status !== "UPCOMING" || ticket.rawStatus !== "VALID" || !ticket.qrCode;
  const code = ticket.qrCode || "";

  const cachedProfile = getCachedUserProfile();
  const recipientName =
    ticket.customerName ||
    cachedProfile?.fullName?.trim() ||
    cachedProfile?.email ||
    t("Khách hàng");

  const copyBookingCode = async () => {
    const codeToCopy = ticket.bookingCode || ticket.id;
    if (!codeToCopy) return;
    await navigator.clipboard.writeText(codeToCopy);
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
      <div
        className="w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden rounded-3xl border app-border app-bg-card shadow-2xl animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-label={t("Vé điện tử")}
      >
        {/* Banner header */}
        <div className="relative h-28 sm:h-32 shrink-0 bg-slate-900">
          {ticket.eventPoster && (
            <img src={ticket.eventPoster} alt={ticket.eventTitle} className="h-full w-full object-cover filter brightness-85" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3.5 top-3.5 rounded-full bg-slate-950/70 p-2 text-white hover:bg-slate-950 transition cursor-pointer z-10"
            aria-label={t("Đóng")}
          >
            <FiX className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
            {ticket.acquisitionType === "RESALE" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs">
                <FiTag className="h-3 w-3" /> {t("Vé mua lại")}
              </span>
            )}
            <StatusBadge status={ticket.status} />
          </div>
        </div>

        {/* Scrollable body synchronized with TicketDetail */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Thông tin sự kiện cơ bản */}
          <div>
            <h2 className="text-lg sm:text-xl font-black leading-snug app-text-main">{ticket.eventTitle}</h2>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm app-text-sub">
              <p className="flex items-center gap-1.5">
                <FiCalendar className="text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{ticket.eventTime}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <FiMapPin className="text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate max-w-[240px]">{ticket.eventLocation}</span>
              </p>
            </div>
          </div>

          {/* Section: THÔNG TIN VÉ (đồng bộ hoàn toàn chi tiết vé) */}
          <div className="rounded-xl border app-border p-4 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider app-text-muted">
              {t("THÔNG TIN VÉ")}
            </h3>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-500">{t("Hạng vé")}</span>
                <span className="font-semibold app-text-main">{ticket.ticketTypeName}</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-500">{t("Số lượng")}</span>
                <span className="font-semibold app-text-main">{ticket.quantity} {t("vé")}</span>
              </div>
              {ticket.seatName && (
                <div className="py-2 flex justify-between items-center">
                  <span className="text-slate-500">{t("Chỗ ngồi / Ghế")}</span>
                  <span className="font-semibold app-text-main">{ticket.seatName}</span>
                </div>
              )}
              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-500">{t("Người nhận vé")}</span>
                <span className="font-bold app-text-main uppercase tracking-tight">{recipientName}</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-500">{ticket.acquisitionType === "RESALE" ? t("Giá mua vé bán lại") : t("Tổng tiền")}</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 font-mono text-sm">
                  {formatCurrency(ticket.totalAmount)}
                </span>
              </div>
            </div>

            {/* Box Mã vé với nút copy (chuẩn TicketDetail) */}
            <div className="mt-2 p-3 rounded-lg bg-white dark:bg-slate-900 border app-border flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                  {t("Mã vé")}
                </p>
                <p className="text-xs font-mono font-bold app-text-main truncate">
                  {ticket.bookingCode || ticket.id}
                </p>
              </div>
              <button
                type="button"
                onClick={copyBookingCode}
                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
                title={copiedCode ? t("Đã sao chép!") : t("Sao chép mã vé")}
              >
                {copiedCode ? <FiCheck className="w-4 h-4 text-emerald-600" /> : <FiCopy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Section: MÃ QR CHECK-IN (đồng bộ chi tiết vé) */}
          <div className="rounded-xl border app-border p-4 sm:p-5 bg-white dark:bg-slate-900/60 shadow-2xs flex flex-col items-center text-center space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider app-text-muted self-start">
              {t("MÃ QR CHECK-IN")}
            </h3>

            {isLocked ? (
              <div className="w-full flex flex-col items-center space-y-3">
                <div className="w-full max-w-[240px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-xs">
                  <div className="relative flex aspect-square w-full items-center justify-center p-4">
                    <img
                      src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=HALOTICKET_LOCKED"
                      alt="QR Locked"
                      className="h-full w-full object-contain filter blur-[5px] grayscale opacity-20 pointer-events-none select-none"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100/95 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-sm">
                        <FiLock className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 px-4 py-3 text-center">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      {t("Mã QR đang bị khóa")}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      {isSelling
                        ? t("Vé đang đăng bán trên sàn Marketplace. Mã QR sẽ được kích hoạt khi giao dịch kết thúc.")
                        : t("Vé đang bán, đang chuyển quyền, đã sử dụng hoặc đã hủy nên không thể dùng để check-in.")}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full py-1 flex flex-col items-center space-y-3">
                <div className="relative p-2 app-bg-card border app-border rounded-lg shadow-2xs group">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(code)}`}
                    alt="Mã QR check-in"
                    className={`w-44 h-44 object-contain transition-all duration-200 ${
                      isRevealed ? "filter-none opacity-100" : "filter blur-[6px] grayscale opacity-30 select-none"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setIsRevealed((prev) => !prev)}
                    className={`absolute inset-0 flex flex-col items-center justify-center rounded-lg cursor-pointer text-white transition-all ${
                      !isRevealed
                        ? "bg-slate-900/40 hover:bg-slate-900/55 opacity-100"
                        : "bg-slate-950/60 opacity-0 group-hover:opacity-100 backdrop-blur-[2px]"
                    }`}
                    aria-label={isRevealed ? t("Bấm để che QR") : t("Bấm để xem QR")}
                    title={isRevealed ? t("Bấm để che QR") : t("Bấm để xem QR")}
                  >
                    {!isRevealed ? (
                      <>
                        <FiLock className="w-6 h-6 mb-1 transition-transform group-hover:scale-110" />
                        <span className="text-xs font-medium">{t("Bấm để xem QR")}</span>
                      </>
                    ) : (
                      <>
                        <FiEyeOff className="w-6 h-6 mb-1 transition-transform group-hover:scale-110" />
                        <span className="text-xs font-medium">{t("Bấm để che QR")}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs font-semibold app-text-main">
                    {t("Mã vé sẵn sàng check-in")}
                  </p>
                  <p className="text-xs app-text-sub">
                    {t("Xuất trình mã này tại cổng soát vé sự kiện.")}
                  </p>
                </div>

                <div className="w-full space-y-2 pt-2 border-t app-border">
                  <button
                    type="button"
                    onClick={() => downloadTicketAsImage(ticket)}
                    className="w-full py-2 px-3 rounded-md bg-[#2166F3] hover:bg-blue-700 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <FiDownload className="w-4 h-4" />
                    <span>{t("Tải ảnh vé về máy")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRevealed((prev) => !prev)}
                    className="w-full py-1 text-xs app-text-muted hover:app-text-main font-medium transition-colors cursor-pointer"
                  >
                    {isRevealed ? t("Che mã QR bảo mật") : t("Hiện mã QR")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons: Đăng bán lại & Tặng vé (nếu hợp lệ) + Link xem chi tiết vé */}
          <div className="space-y-2.5 pt-1">
            {!isLocked && ticket.status === "UPCOMING" && ticket.rawStatus === "VALID" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {onResale && (
                  <button
                    type="button"
                    onClick={() => onResale(ticket)}
                    className="w-full py-2.5 px-4 rounded-md border border-emerald-600 bg-emerald-50/50 hover:bg-emerald-100/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                  >
                    <FiTag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t("Đăng bán vé lại")}</span>
                  </button>
                )}
                {onGift && (
                  <button
                    type="button"
                    onClick={() => onGift(ticket)}
                    className="w-full py-2.5 px-4 rounded-md border border-[#2166F3] text-[#2166F3] hover:bg-blue-50/60 dark:hover:bg-blue-950/20 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                  >
                    <FiGift className="w-4 h-4 text-[#2166F3]" />
                    <span>{t("Tặng vé cho bạn bè")}</span>
                  </button>
                )}
              </div>
            )}

            {(ticket.status === "GIFTING" || ticket.rawStatus === "LOCKED_FOR_TRANSFER") && (
              <button
                type="button"
                onClick={async () => {
                  const confirmed = window.confirm(t("Bạn có chắc chắn muốn hủy lời mời tặng vé này không? Vé sẽ được mở khóa lại để bạn sử dụng."));
                  if (!confirmed) return;
                  try {
                    const gift = await marketplaceApi.getActiveGiftByTicket(ticket.id) as { sagaId?: string };
                    if (gift?.sagaId) {
                      await marketplaceApi.cancelGift(gift.sagaId);
                      alert(t("Đã gửi yêu cầu hủy tặng vé thành công."));
                      onClose();
                      window.location.reload();
                    } else {
                      alert(t("Không tìm thấy thông tin lời mời tặng vé."));
                    }
                  } catch {
                    alert(t("Không thể hủy tặng vé lúc này. Vui lòng thử lại sau."));
                  }
                }}
                className="w-full py-2.5 px-4 rounded-md border border-rose-300 bg-rose-50/50 hover:bg-rose-100/60 dark:bg-rose-950/20 dark:border-rose-900 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <FiX className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>{t("Hủy tặng vé")}</span>
              </button>
            )}

            <Link
              to={`/my-tickets/${ticket.id}`}
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-md border app-border text-center text-xs font-semibold app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{t("Xem chi tiết vé đầy đủ")}</span>
              <FiArrowRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MyTicketsProps {
  embedded?: boolean;
}

function GiftInvitations() {
  const { t } = useTranslation();
  const [invitations, setInvitations] = useState<Awaited<ReturnType<typeof marketplaceApi.getMyGiftInvitations>>>([]);

  useEffect(() => {
    let active = true;
    marketplaceApi
      .getMyGiftInvitations()
      .then((items) => {
        if (active) setInvitations(items);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (!invitations.length) return null;

  return (
    <section className="space-y-3" aria-label={t("Lời mời nhận vé")}>
      {invitations.map((item) => {
        const expireDate = new Date(item.expiresAt);
        const timeStr = !isNaN(expireDate.getTime())
          ? expireDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) +
            ` ${t("ngày")} ` +
            expireDate.toLocaleDateString("vi-VN")
          : item.expiresAt;

        return (
          <div
            key={item.sagaId}
            className="relative overflow-hidden rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-400/20 via-amber-300/10 to-amber-400/5 p-4 sm:p-5 shadow-sm dark:border-amber-500/30 dark:from-amber-950/40 dark:via-amber-900/20 dark:to-transparent"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/30 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 text-2xl shadow-xs border border-amber-400/30">
                  🎁
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-200">
                      {t("Lời mời nhận vé")}
                    </span>
                    {item.senderName && (
                      <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {t("từ {{name}}", { name: item.senderName })}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-1 text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {item.ticketTypeName ? t("Vé sự kiện: {{name}}", { name: item.ticketTypeName }) : t("Bạn có lời mời nhận vé")}
                  </h2>
                  <p className="mt-0.5 text-xs text-amber-800/90 dark:text-amber-300/80">
                    {t("Hoàn tất nhận vé trước")} <span className="font-semibold">{timeStr}</span>
                  </p>
                </div>
              </div>

              <Link
                to={`${PATHS.GIFT_ACCEPT}?sagaId=${encodeURIComponent(item.sagaId)}`}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
              >
                {t("Nhận vé ngay →")}
              </Link>
            </div>
          </div>
        );
      })}
    </section>
  );
}

export default function MyTickets({ embedded = false }: MyTicketsProps) {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TicketFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string>();
  const [viewerTicket, setViewerTicket] = useState<TicketItem>();
  const [resaleTicket, setResaleTicket] = useState<TicketItem>();
  const [giftTicket, setGiftTicket] = useState<TicketItem>();
  const [currentPage, setCurrentPage] = useState(1);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const response = await ticketApi.getMyTickets();
      const hydrated = await hydrateTickets(Array.isArray(response) ? response : []);
      setTickets(hydrated);
    } catch (err) {
      console.error("loadTickets failed:", err);
      setLoadError(t("Không thể tải vé từ hệ thống. Hãy thử lại sau."));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!embedded) window.scrollTo(0, 0);
    let isCancelled = false;
    ticketApi.getMyTickets().then(async (response) => {
      if (isCancelled) return;
      const hydrated = await hydrateTickets(Array.isArray(response) ? response : []);
      if (!isCancelled) {
        setTickets(hydrated);
        setLoading(false);
      }
    }).catch((err) => {
      if (!isCancelled) {
        console.error("loadTickets failed:", err);
        setLoadError(t("Không thể tải vé từ hệ thống. Hãy thử lại sau."));
        setLoading(false);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [embedded, t]);

  // Group tickets into orders (1 order per bookingCode)
  const allOrders = useMemo(() => groupTicketsIntoOrders(tickets), [tickets]);

  const counts = useMemo(
    () => ({
      ALL: allOrders.length,
      UPCOMING: allOrders.filter(
        (o) =>
          o.tickets.some((t) => ["UPCOMING", "SELLING", "GIFTING"].includes(t.status)) ||
          ["UPCOMING", "SELLING", "GIFTING"].includes(o.status)
      ).length,
      USED: allOrders.filter(
        (o) => o.tickets.length > 0 && o.tickets.every((t) => t.status === "USED")
      ).length,
      TRANSFERRED: allOrders.filter(
        (o) => o.tickets.length > 0 && o.tickets.every((t) => t.status === "TRANSFERRED")
      ).length,
    }),
    [allOrders]
  );

  const filteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      const tabMatches =
        activeTab === "ALL" ||
        (activeTab === "UPCOMING" && (
          order.tickets.some((t) => ["UPCOMING", "SELLING", "GIFTING"].includes(t.status)) ||
          ["UPCOMING", "SELLING", "GIFTING"].includes(order.status)
        )) ||
        (activeTab === "USED" && order.tickets.length > 0 && order.tickets.every((t) => t.status === "USED")) ||
        (activeTab === "TRANSFERRED" && order.tickets.length > 0 && order.tickets.every((t) => t.status === "TRANSFERRED"));

      const query = searchQuery.trim().toLowerCase();
      const searchMatches =
        !query ||
        order.eventTitle.toLowerCase().includes(query) ||
        order.bookingCode.toLowerCase().includes(query) ||
        order.tickets.some(
          (ticket) =>
            ticket.ticketTypeName.toLowerCase().includes(query) ||
            ticket.seatName?.toLowerCase().includes(query) ||
            ticket.id.toLowerCase().includes(query)
        );

      return tabMatches && searchMatches;
    });
  }, [allOrders, activeTab, searchQuery]);

  // client-side pagination
  const [pageSize, setPageSize] = useState(10);
  const currentTotalElements = filteredOrders.length;
  const currentTotalPages = Math.ceil(currentTotalElements / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredOrders.slice(startIndex, startIndex + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const tabs: Array<{ value: TicketFilter; labelKey: string }> = [
    { value: "ALL", labelKey: "Tất cả" },
    { value: "UPCOMING", labelKey: "Sắp diễn ra" },
    { value: "USED", labelKey: "Đã sử dụng" },
    { value: "TRANSFERRED", labelKey: "Đã chuyển nhượng" },
  ];

  return (
    <div className={`w-full font-sans ${embedded ? "" : "flex-1 app-bg-page app-text-main pb-20"}`}>
      <div className={embedded ? "space-y-5" : "mx-auto mt-8 max-w-[1160px] space-y-5 px-4 md:px-8"}>
        {/* Header section (restored original tabs & header) */}
        <section className="rounded-2xl border app-border app-bg-card p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">{t("Tủ vé điện tử")}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight app-text-main">{t("Vé của tôi")}</h1>
              <p className="mt-1 text-sm app-text-sub">{t("Quản lý đơn hàng và vé điện tử. Nhấn vào đơn hàng để xem chi tiết mã QR.")}</p>
            </div>
            <label className="relative block w-full sm:w-72">
              <FiSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 app-text-muted" />
              <span className="sr-only">{t("Tìm kiếm")}</span>
              <input
                value={searchQuery}
                onChange={(event) => { setSearchQuery(event.target.value); setCurrentPage(1); }}
                placeholder={t("Tìm vé, đơn hàng…")}
                className="w-full rounded-xl border app-border app-bg-card py-2.5 pl-10 pr-4 text-sm app-text-main focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
          <div className="mt-5 flex gap-2 overflow-x-auto border-t app-border pt-4 pb-1 scrollbar-hide" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.value}
                onClick={() => { setActiveTab(tab.value); setCurrentPage(1); }}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-all focus:outline-none cursor-pointer border ${
                  activeTab === tab.value
                    ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "bg-transparent border-slate-200 dark:border-slate-800 app-text-sub hover:bg-slate-100 dark:hover:bg-slate-800 hover:app-text-main"
                }`}
              >
                {t(tab.labelKey)}{" "}
                <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-black ${
                  activeTab === tab.value ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 app-text-muted"
                }`}>
                  {counts[tab.value]}
                </span>
              </button>
            ))}
          </div>
        </section>

        <GiftInvitations />

        {loading ? (
          <div className="rounded-2xl border app-border app-bg-card p-12 text-center text-sm app-text-sub">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>{t("Đang tải đơn hàng…")}</span>
            </div>
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-8 text-center text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setLoadError(null);
                void loadTickets();
              }}
              className="mt-4 rounded-xl border border-current px-4 py-2 font-semibold cursor-pointer"
            >
              {t("Thử lại")}
            </button>
          </div>
        ) : filteredOrders.length ? (
          <div className="space-y-1">
            {paginatedOrders.map((order, idx) => (
              <OrderCard
                key={order.orderKey}
                order={order}
                isLast={idx === paginatedOrders.length - 1}
                isMenuOpen={openMenuId === order.orderKey}
                onToggleMenu={(key) => setOpenMenuId(key)}
                onViewTicket={(tk) => setViewerTicket(tk)}
                onResale={(tk) => setResaleTicket(tk)}
                onGift={(tk) => setGiftTicket(tk)}
              />
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-lg rounded-2xl border app-border app-bg-card p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">
              <FiPackage className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold app-text-main">{t("Không tìm thấy đơn hàng")}</h2>
            <p className="mt-2 text-sm app-text-sub">{t("Thử đổi bộ lọc hoặc tìm một sự kiện khác.")}</p>
            <Link
              to="/events"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline"
            >
              {t("Khám phá sự kiện")} <FiArrowRight />
            </Link>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && !loadError && currentTotalElements > 0 && (
        <div className="mt-8 pt-6 border-t app-border flex justify-center">
          <TablePagination
            currentPage={currentPage}
            totalPages={currentTotalPages}
            totalItems={currentTotalElements}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        </div>
      )}

      {viewerTicket && (
        <TicketViewer
          ticket={viewerTicket}
          onClose={() => setViewerTicket(undefined)}
          onResale={(t) => {
            setViewerTicket(undefined);
            setResaleTicket(t);
          }}
          onGift={(t) => {
            setViewerTicket(undefined);
            setGiftTicket(t);
          }}
        />
      )}
      {resaleTicket && (
        <ResaleTicketModal ticket={resaleTicket} onClose={() => setResaleTicket(undefined)} onChanged={() => loadTickets()} />
      )}
      {giftTicket && (
        <GiftTicketModal ticket={giftTicket} onClose={() => setGiftTicket(undefined)} onChanged={() => loadTickets()} />
      )}
    </div>
  );
}
