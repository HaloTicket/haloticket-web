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
  FiMoreHorizontal,
  FiSearch,
  FiTag,
  FiX,
} from "react-icons/fi";
import { eventApi } from "@/services/eventApi";
import { ticketApi } from "@/services/ticketApi";
import { marketplaceApi } from "@/services/marketplaceApi";
import { PATHS } from "@/routes/paths";
import { formatCurrency } from "@/utils/formatters";
import type { OwnedTicketApiResponse } from "@/types";
import { GiftTicketModal, ResaleTicketModal } from "./TicketActionModals";
import { TablePagination } from "@/components/common/TablePagination";

type TicketFilter = "ALL" | "UPCOMING" | "USED" | "TRANSFERRED";
type TicketUiStatus = "UPCOMING" | "USED" | "SELLING" | "GIFTING" | "TRANSFERRED" | "CANCELLED";

export interface TicketItem {
  id: string;
  bookingCode: string;
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

const STATUS_PRESENTATION: Record<TicketUiStatus, { labelKey: string; className: string }> = {
  UPCOMING: { labelKey: "Sắp diễn ra", className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300" },
  USED: { labelKey: "Đã sử dụng", className: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  SELLING: { labelKey: "Đang bán", className: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300" },
  GIFTING: { labelKey: "Đang tặng", className: "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300" },
  TRANSFERRED: { labelKey: "Đã chuyển nhượng", className: "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400" },
  CANCELLED: { labelKey: "Đã hủy", className: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300" },
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

function formatEventTime(value?: string) {
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

async function hydrateTickets(items: OwnedTicketApiResponse[]): Promise<TicketItem[]> {
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
    const startsAt = typeof event?.startTime === "string" ? event.startTime : undefined;
    const isResale =
      item.acquisitionType === "RESALE" ||
      (item.bookingCode || "").startsWith("RSL-") ||
      (item.bookingCode || "").includes("RESALE");

    return {
      id: item.id,
      bookingCode: item.bookingCode || item.id,
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
    context.fillText(`Mã vé: ${ticket.bookingCode}`, 42, 325);
    if (ticket.rawStatus !== "VALID" || !ticket.qrCode) return;
    const qrValue = ticket.qrCode;
    const image = new Image();
    image.crossOrigin = "Anonymous";
    image.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrValue)}`;
    const save = () => {
      try {
        const link = document.createElement("a");
        link.download = `HaloTicket_${ticket.bookingCode}.png`;
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

function StatusBadge({ status }: { status: TicketUiStatus }) {
  const { t } = useTranslation();
  const presentation = STATUS_PRESENTATION[status];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-xs ${presentation.className}`}>
      {t(presentation.labelKey)}
    </span>
  );
}

/**
 * Modal Xem vé điện tử:
 * - Nếu vé Đang bán hoặc bị khóa: hiển thị QR mờ kèm ổ khóa đè lên và mô tả cảnh báo.
 * - Nếu vé có hiệu lực: mặc định che QR bằng ổ khóa và thanh "Nhấn vào ảnh để xem mã QR" (Ảnh 1).
 */
function TicketViewer({ ticket, onClose }: { ticket: TicketItem; onClose: () => void }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  const isSelling = ticket.status === "SELLING" || ticket.rawStatus === "LOCKED_FOR_RESALE";
  const isLocked = isSelling || ticket.status !== "UPCOMING" || ticket.rawStatus !== "VALID" || !ticket.qrCode;
  const code = ticket.qrCode || "";

  const copyCode = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border app-border app-bg-card shadow-2xl animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-label={t("Vé điện tử")}
      >
        {/* Banner header */}
        <div className="relative h-28 bg-slate-900">
          {ticket.eventPoster && (
            <img src={ticket.eventPoster} alt={ticket.eventTitle} className="h-full w-full object-cover filter brightness-85" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3.5 top-3.5 rounded-full bg-slate-950/70 p-2 text-white hover:bg-slate-950 transition cursor-pointer"
            aria-label="Đóng"
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

        <div className="space-y-3 p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-black leading-snug app-text-main">{ticket.eventTitle}</h2>
            <p className="mt-2 flex items-center gap-2 text-xs sm:text-sm app-text-sub">
              <FiCalendar className="text-blue-600 shrink-0" />
              <span>{ticket.eventTime}</span>
            </p>
            <p className="mt-1 flex items-center gap-2 text-xs sm:text-sm app-text-sub">
              <FiMapPin className="text-blue-600 shrink-0" />
              <span className="truncate">{ticket.eventLocation}</span>
            </p>
          </div>

          <div className="flex items-center justify-between border-y app-border py-3 text-sm">
            <span className="font-semibold app-text-main">
              {ticket.ticketTypeName} · {ticket.quantity} {t("vé")}
            </span>
            <div className="text-right">
              <strong className="block text-blue-600 dark:text-blue-400 font-mono font-bold text-base">
                {formatCurrency(ticket.totalAmount)}
              </strong>
              <span className="text-xs app-text-sub font-medium block">
                {ticket.acquisitionType === "RESALE" ? t("Giá mua vé bán lại") : t("Giá vé")}
              </span>
            </div>
          </div>

          {/* Khối hiển thị QR Code bảo mật */}
          {isLocked ? (
            /* Ảnh 2: Vé đang bị khóa */
            <div className="overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-50 dark:bg-slate-900 shadow-md">
              <div className="relative flex aspect-square w-40 sm:w-48 mx-auto items-center justify-center p-3">
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=HALOTICKET_LOCKED"
                  alt="QR Locked"
                  className="h-full w-full object-contain filter blur-[5px] grayscale opacity-20 pointer-events-none select-none"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 shadow-lg">
                    <FiLock className="h-6 w-6" />
                  </div>
                </div>
              </div>
              <div className="border-t border-amber-500/20 bg-amber-500/10 px-4 py-3 text-center">
                <p className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                  {t("Mã QR đang bị khóa")}
                </p>
                <p className="mt-1 text-[11px] text-amber-800/80 dark:text-amber-200/80 leading-relaxed font-medium">
                  {t("Vé đang bán, đang chuyển quyền, đã sử dụng hoặc đã hủy nên không thể dùng để check-in.")}
                </p>
              </div>
            </div>
          ) : (
            /* Ảnh 1: Vé có hiệu lực - che bằng ổ khóa, nhấn để xem */
            <div className="space-y-3">
              <div className="mx-auto w-full max-w-[200px] overflow-hidden rounded-2xl border app-border bg-white dark:bg-slate-900 shadow-lg">
                <button
                  type="button"
                  onClick={() => setIsRevealed((prev) => !prev)}
                  className="group relative block w-full text-left cursor-pointer focus:outline-none"
                  aria-label={isRevealed ? t("Nhấn vào ảnh để che mã QR") : t("Nhấn vào ảnh để xem mã QR")}
                >
                  <div className="relative flex aspect-square w-full items-center justify-center bg-white p-3">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(code)}`}
                      alt="Mã QR check-in"
                      className={`h-full w-full object-contain transition-all duration-300 ${
                        isRevealed ? "filter-none opacity-100" : "filter blur-[6px] grayscale opacity-30 select-none"
                      }`}
                    />
                    {!isRevealed && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900/90 text-white shadow-lg transition-transform group-hover:scale-110">
                          <FiLock className="h-5 w-5" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dải hướng dẫn giống Ảnh 1 */}
                  <div className="bg-slate-800 hover:bg-slate-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 py-2.5 px-3 text-center transition-colors">
                    <p className="text-xs font-semibold text-white tracking-wide flex items-center justify-center gap-1.5">
                      {isRevealed ? (
                        <>
                          <FiEyeOff className="h-3.5 w-3.5" />
                          <span>{t("Nhấn vào ảnh để che mã QR")}</span>
                        </>
                      ) : (
                        <>
                          <FiLock className="h-3.5 w-3.5" />
                          <span>{t("Nhấn vào ảnh để xem mã QR")}</span>
                        </>
                      )}
                    </p>
                  </div>
                </button>
              </div>

              {isRevealed && (
                <div className="space-y-2 text-center animate-in fade-in duration-150">
                  <p className="text-[11px] app-text-muted">{t("Xuất trình mã này tại cổng check-in")}</p>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="inline-flex max-w-full items-center gap-2 rounded-lg border app-border px-3 py-1.5 font-mono text-xs app-text-main hover:bg-slate-500/10 cursor-pointer"
                  >
                    <span className="truncate max-w-[200px]">{code}</span>
                    {copied ? <FiCheck className="shrink-0 text-emerald-600" /> : <FiCopy className="shrink-0" />}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="truncate font-mono text-xs app-text-muted">{t("Mã vé:")} {ticket.bookingCode}</p>
            {!isLocked && (
              <button
                type="button"
                onClick={() => downloadTicketAsImage(ticket)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border app-border px-3 py-1.5 text-xs font-semibold app-text-main hover:bg-slate-500/10 cursor-pointer"
              >
                <FiDownload /> {t("Tải vé")}
              </button>
            )}
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
    <section className="space-y-3" aria-label="Lời mời nhận vé">
      {invitations.map((item) => {
        const expireDate = new Date(item.expiresAt);
        const timeStr = !isNaN(expireDate.getTime())
          ? expireDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) +
            " ngày " +
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
                      Lời mời nhận vé
                    </span>
                    {item.senderName && (
                      <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                        từ {item.senderName}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-1 text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {item.ticketTypeName ? `Vé sự kiện: ${item.ticketTypeName}` : "Bạn có lời mời nhận vé"}
                  </h2>
                  <p className="mt-0.5 text-xs text-amber-800/90 dark:text-amber-300/80">
                    Hoàn tất nhận vé trước <span className="font-semibold">{timeStr}</span>
                  </p>
                </div>
              </div>

              <Link
                to={`${PATHS.GIFT_ACCEPT}?sagaId=${encodeURIComponent(item.sagaId)}`}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
              >
                Nhận vé ngay →
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
    setLoading(true);
    setLoadError(null);
    try {
      const response = await ticketApi.getMyTickets();
      const hydrated = await hydrateTickets(Array.isArray(response) ? response : []);
      setTickets(hydrated);
      // Let client-side pagination handle totalPages and totalElements
    } catch (err) {
      console.error("loadTickets failed:", err);
      setLoadError(t("Không thể tải vé từ hệ thống. Hãy thử lại sau."));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!embedded) window.scrollTo(0, 0);
    loadTickets();
  }, [embedded, loadTickets]);

  const counts = useMemo(
    () => ({
      ALL: tickets.length,
      UPCOMING: tickets.filter((ticket) => ["UPCOMING", "SELLING", "GIFTING"].includes(ticket.status)).length,
      USED: tickets.filter((ticket) => ticket.status === "USED").length,
      TRANSFERRED: tickets.filter((ticket) => ticket.status === "TRANSFERRED").length,
    }),
    [tickets]
  );

  const filteredTickets = useMemo(
    () =>
      tickets.filter((ticket) => {
        const tabMatches =
          activeTab === "ALL" ||
          (activeTab === "UPCOMING" && ["UPCOMING", "SELLING", "GIFTING"].includes(ticket.status)) ||
          (activeTab === "USED" && ticket.status === "USED") ||
          (activeTab === "TRANSFERRED" && ticket.status === "TRANSFERRED");
        const query = searchQuery.trim().toLowerCase();
        return (
          tabMatches &&
          (!query ||
            ticket.eventTitle.toLowerCase().includes(query) ||
            ticket.bookingCode.toLowerCase().includes(query) ||
            ticket.ticketTypeName.toLowerCase().includes(query))
        );
      }),
    [activeTab, searchQuery, tickets]
  );
  
  // Client-side pagination
  const pageSize = 12;
  const currentTotalElements = filteredTickets.length;
  const currentTotalPages = Math.ceil(currentTotalElements / pageSize) || 1;
  const paginatedTickets = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTickets.slice(startIndex, startIndex + pageSize);
  }, [filteredTickets, currentPage, pageSize]);

  const tabs: Array<{ value: TicketFilter; labelKey: string }> = [
    { value: "ALL", labelKey: "Tất cả" },
    { value: "UPCOMING", labelKey: "Sắp diễn ra" },
    { value: "USED", labelKey: "Đã sử dụng" },
    { value: "TRANSFERRED", labelKey: "Đã chuyển nhượng" },
  ];

  return (
    <div className={`w-full font-sans ${embedded ? "" : "flex-1 app-bg-page app-text-main pb-20"}`}>
      <div className={embedded ? "space-y-5" : "mx-auto mt-8 max-w-[1160px] space-y-5 px-4 md:px-8"}>
        {/* Header section */}
        <section className="rounded-2xl border app-border app-bg-card p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">{t("Tủ vé điện tử")}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight app-text-main">{t("Vé của tôi")}</h1>
              <p className="mt-1 text-sm app-text-sub">{t("Nhấn vào vé để xem chi tiết mã QR và quản lý vé.")}</p>
            </div>
            <label className="relative block w-full sm:w-72">
              <FiSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 app-text-muted" />
              <span className="sr-only">{t("Tìm kiếm")}</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t("Tìm vé…")}
                className="w-full rounded-xl border app-border app-bg-card py-2.5 pl-10 pr-4 text-sm app-text-main focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
          <div className="mt-5 flex gap-2 overflow-x-auto border-t app-border pt-4 pb-2 scrollbar-hide" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-all focus:outline-none cursor-pointer border ${
                  activeTab === tab.value
                    ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "bg-transparent border-slate-200 dark:border-slate-800 app-text-sub hover:bg-slate-100 dark:hover:bg-slate-800 hover:app-text-main"
                }`}
              >
                {t(tab.labelKey)}{" "}
                <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-black ${activeTab === tab.value ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 app-text-muted"}`}>
                  {counts[tab.value]}
                </span>
              </button>
            ))}
          </div>
        </section>

        <GiftInvitations />

        {loading ? (
          <div className="rounded-2xl border app-border app-bg-card p-12 text-center text-sm app-text-sub">
            {t("Đang tải vé từ hệ thống…")}
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-8 text-center text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => void loadTickets()}
              className="mt-4 rounded-xl border border-current px-4 py-2 font-semibold cursor-pointer"
            >
              {t("Thử lại")}
            </button>
          </div>
        ) : filteredTickets.length ? (
          <div className="space-y-4">
            {paginatedTickets.map((ticket) => {
              const canTransact = ticket.rawStatus === "VALID";
              const isResale = ticket.acquisitionType === "RESALE";

              return (
                <article
                  key={ticket.id}
                  tabIndex={0}
                  onClick={() => setViewerTicket(ticket)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") setViewerTicket(ticket);
                  }}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl md:rounded-3xl border app-border app-bg-card app-text-main shadow-xs transition-all duration-200 hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500/50 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <button
                    type="button"
                    className="sr-only"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewerTicket(ticket);
                    }}
                  >
                    {t("Xem vé")}
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-10 min-h-[140px]">
                    {/* Cột trái: Thông tin vé (Đúng tỉ lệ 6 phần = 60% trên md) */}
                    <div className="relative p-4 sm:p-5 md:col-span-6 flex flex-col justify-between space-y-3 sm:space-y-4 app-bg-card">
                      <div className="space-y-2">
                        {/* Hàng badge: Bán lại vé (nếu resale) + Trạng thái vé */}
                        <div className="flex flex-wrap items-center gap-2">
                          {isResale && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                              <FiTag className="h-3 w-3" /> {t("Bán lại vé")}
                            </span>
                          )}
                          <StatusBadge status={ticket.status} />
                        </div>

                        {/* Tiêu đề sự kiện (Tăng kích thước, rõ nét) */}
                        <h2 className="text-base sm:text-lg lg:text-xl font-black app-text-main leading-snug tracking-tight line-clamp-1">
                          {ticket.eventTitle}
                        </h2>

                        {/* Thời gian & Địa điểm (Tăng kích thước và độ rõ ràng) */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium app-text-sub">
                          <p className="flex items-center gap-1.5">
                            <FiCalendar className="shrink-0 text-blue-600 dark:text-blue-400 h-3.5 w-3.5" />
                            <span className="truncate font-semibold app-text-main">{ticket.eventTime}</span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <FiMapPin className="shrink-0 text-blue-600 dark:text-blue-400 h-3.5 w-3.5" />
                            <span className="truncate max-w-[200px]">{ticket.eventLocation}</span>
                          </p>
                        </div>
                      </div>

                      {/* Hàng thông tin hạng vé & Giá vé đồng bộ màu sắc */}
                      <div className="pt-2 border-t app-border flex flex-wrap items-end justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-xs sm:text-sm font-bold app-text-main block">
                            {ticket.ticketTypeName}
                          </span>
                          {ticket.seatName && (
                            <span className="text-[11px] font-medium app-text-sub block">
                              Ghế: {ticket.seatName}
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          <strong className="block text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight">
                            {formatCurrency(ticket.totalAmount)}
                          </strong>
                          <span className="text-[10px] font-semibold app-text-sub block uppercase tracking-wider">
                            {isResale ? t("Giá mua vé bán lại") : t("Giá vé")}
                          </span>
                        </div>
                      </div>

                      {/* Rãnh khuyết bán nguyệt trên và dưới ở ranh giới cuống vé (chuẩn màu nền trang app-bg-page cả sáng và tối) */}
                      <span
                        aria-hidden="true"
                        className="hidden md:block absolute -top-3.5 -right-3.5 z-10 h-7 w-7 rounded-full app-bg-page border app-border"
                      />
                      <span
                        aria-hidden="true"
                        className="hidden md:block absolute -bottom-3.5 -right-3.5 z-10 h-7 w-7 rounded-full app-bg-page border app-border"
                      />
                    </div>

                    {/* Cột phải: Banner sự kiện (Đúng tỉ lệ 4 phần = 40% trên md) có đường viền nét đứt phân cách */}
                    <div className="relative md:col-span-4 border-t md:border-t-0 md:border-l border-dashed app-border h-32 sm:h-40 md:h-full min-h-[140px] overflow-hidden bg-slate-900">
                      {ticket.eventPoster ? (
                        <img
                          src={ticket.eventPoster}
                          alt={ticket.eventTitle}
                          className="h-full w-full object-cover filter brightness-90 transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-800 text-slate-500">
                          <FiTag className="h-8 w-8 opacity-40" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/40 via-transparent to-transparent pointer-events-none" />

                      {/* Nút 3 chấm menu thao tác (Nổi trên ảnh góc trên bên phải) */}
                      <div className="absolute top-3 right-3 z-20">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenMenuId((current) => (current === ticket.id ? undefined : ticket.id));
                            }}
                            aria-label="Thao tác với vé"
                            aria-expanded={openMenuId === ticket.id}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/60 hover:bg-slate-950/85 text-white backdrop-blur-xs border border-white/20 shadow-md transition cursor-pointer"
                          >
                            <FiMoreHorizontal className="h-4 w-4" />
                          </button>

                          {openMenuId === ticket.id && (
                            <div
                              onClick={(event) => event.stopPropagation()}
                              className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-xl border app-border app-bg-card py-1.5 shadow-2xl app-text-main animate-in zoom-in-95 duration-100"
                            >
                              {canTransact && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(undefined);
                                    downloadTicketAsImage(ticket);
                                  }}
                                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                  <FiDownload className="h-3.5 w-3.5 text-blue-500" /> {t("Tải vé (.PNG)")}
                                </button>
                              )}
                              {canTransact && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(undefined);
                                    setResaleTicket(ticket);
                                  }}
                                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                  <FiTag className="h-3.5 w-3.5 text-emerald-500" /> {t("Đăng bán lại")}
                                </button>
                              )}
                              {canTransact && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(undefined);
                                    setGiftTicket(ticket);
                                  }}
                                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                  <FiGift className="h-3.5 w-3.5 text-purple-500" /> {t("Tặng vé")}
                                </button>
                              )}
                              <Link
                                to={`/my-tickets/${ticket.id}`}
                                onClick={() => setOpenMenuId(undefined)}
                                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                <FiArrowRight className="h-3.5 w-3.5 text-indigo-500" /> {t("Chi tiết vé")}
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mx-auto max-w-lg rounded-2xl border app-border app-bg-card p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40">
              <FiTag className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-bold app-text-main">{t("Không tìm thấy vé phù hợp")}</h2>
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
      {!loading && !loadError && currentTotalPages > 1 && (
        <div className="mt-8 pt-6 border-t app-border flex justify-center">
          <TablePagination
            currentPage={currentPage}
            totalPages={currentTotalPages}
            totalItems={currentTotalElements}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}

      {viewerTicket && <TicketViewer ticket={viewerTicket} onClose={() => setViewerTicket(undefined)} />}
      {resaleTicket && (
        <ResaleTicketModal ticket={resaleTicket} onClose={() => setResaleTicket(undefined)} onChanged={() => loadTickets()} />
      )}
      {giftTicket && (
        <GiftTicketModal ticket={giftTicket} onClose={() => setGiftTicket(undefined)} onChanged={() => loadTickets()} />
      )}
    </div>
  );
}
