import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiAlertCircle, FiArrowRight, FiCalendar, FiCheck, FiCopy, FiDownload, FiGift, FiMapPin, FiMoreHorizontal, FiSearch, FiTag, FiX } from "react-icons/fi";
import { eventApi } from "@/services/eventApi";
import { ticketApi } from "@/services/ticketApi";
import { formatCurrency } from "@/utils/formatters";
import type { OwnedTicketApiResponse } from "@/types";
import { GiftTicketModal, ResaleTicketModal } from "./TicketActionModals";

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
  purchaseDate?: string;
  customerName?: string;
  rawStatus: string;
  status: TicketUiStatus;
  qrCode?: string;
}

const STATUS_PRESENTATION: Record<TicketUiStatus, { label: string; className: string }> = {
  UPCOMING: { label: "Sắp diễn ra", className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300" },
  USED: { label: "Đã sử dụng", className: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  SELLING: { label: "Đang bán", className: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300" },
  GIFTING: { label: "Đang tặng", className: "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300" },
  TRANSFERRED: { label: "Đã chuyển nhượng", className: "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400" },
  CANCELLED: { label: "Đã hủy", className: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300" },
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
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
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
      purchaseDate: item.issuedAt || undefined,
      rawStatus,
      status: mapTicketStatus(rawStatus),
      qrCode: item.qrCode || undefined,
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
    const qrValue = ticket.qrCode || `HALOTICKET-${ticket.bookingCode}`;
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
  const presentation = STATUS_PRESENTATION[status];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${presentation.className}`}>
      {presentation.label}
    </span>
  );
}

function TicketViewer({ ticket, onClose }: { ticket: TicketItem; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const qrActive = ticket.rawStatus === "VALID";
  const code = ticket.qrCode || `HALOTICKET-${ticket.bookingCode}`;
  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border app-border app-bg-card shadow-2xl" role="dialog" aria-modal="true" aria-label="Vé điện tử">
        <div className="relative h-32 bg-slate-200 dark:bg-slate-800">
          {ticket.eventPoster && <img src={ticket.eventPoster} alt={ticket.eventTitle} className="h-full w-full object-cover" />}
          <button type="button" onClick={onClose} className="absolute right-3 top-3 rounded-full bg-slate-950/70 p-2 text-white focus:outline-none focus:ring-2 focus:ring-white" aria-label="Đóng"><FiX className="h-5 w-5" /></button>
        </div>
        <div className="space-y-5 p-5">
          <div>
            <div className="flex items-start justify-between gap-3"><h2 className="text-lg font-bold leading-snug app-text-main">{ticket.eventTitle}</h2><StatusBadge status={ticket.status} /></div>
            <p className="mt-2 flex items-center gap-2 text-sm app-text-sub"><FiCalendar className="text-blue-600" />{ticket.eventTime}</p>
            <p className="mt-1 flex items-center gap-2 text-sm app-text-sub"><FiMapPin className="text-blue-600" />{ticket.eventLocation}</p>
          </div>
          <div className="flex items-center justify-between border-y app-border py-3 text-sm"><span className="font-semibold app-text-main">{ticket.ticketTypeName} · {ticket.quantity} vé</span><span className="font-semibold app-text-main">{formatCurrency(ticket.totalAmount)}</span></div>
          {qrActive ? (
            <div className="space-y-3 text-center">
              <div className="mx-auto h-56 w-56 rounded-xl border border-slate-200 bg-white p-3"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(code)}`} alt="Mã QR check-in" className="h-full w-full object-contain" /></div>
              <p className="text-xs app-text-muted">Xuất trình mã này tại cổng check-in</p>
              <button type="button" onClick={copyCode} className="inline-flex max-w-full items-center gap-2 rounded-lg border app-border px-3 py-2 font-mono text-xs app-text-main hover:bg-slate-500/10"><span className="truncate">{code}</span>{copied ? <FiCheck className="shrink-0 text-emerald-600" /> : <FiCopy className="shrink-0" />}</button>
            </div>
          ) : (
            <div className="rounded-xl border app-border app-bg-subnav px-5 py-8 text-center"><FiAlertCircle className="mx-auto h-7 w-7 app-text-muted" /><p className="mt-2 text-sm font-semibold app-text-main">Mã QR hiện không khả dụng</p><p className="mt-1 text-xs app-text-sub">{ticket.status === "USED" ? "Vé này đã được sử dụng để check-in." : ticket.status === "CANCELLED" || ticket.status === "TRANSFERRED" ? "Vé không còn thuộc trạng thái có thể check-in." : "Vé đang được khóa trong một giao dịch."}</p></div>
          )}
          <div className="flex items-center justify-between gap-3"><p className="truncate font-mono text-xs app-text-muted">Mã vé: {ticket.bookingCode}</p>{qrActive && <button type="button" onClick={() => downloadTicketAsImage(ticket)} className="inline-flex shrink-0 items-center gap-2 rounded-xl border app-border px-3 py-2 text-xs font-semibold app-text-main hover:bg-slate-500/10"><FiDownload /> Tải vé</button>}</div>
        </div>
      </div>
    </div>
  );
}

interface MyTicketsProps { embedded?: boolean }

export default function MyTickets({ embedded = false }: MyTicketsProps) {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TicketFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string>();
  const [viewerTicket, setViewerTicket] = useState<TicketItem>();
  const [resaleTicket, setResaleTicket] = useState<TicketItem>();
  const [giftTicket, setGiftTicket] = useState<TicketItem>();

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await ticketApi.getMyTickets();
      const hydrated = await hydrateTickets(Array.isArray(response) ? response : []);
      setTickets(hydrated);
    } catch (err) {
      console.error("loadTickets failed:", err);
      setLoadError("Không thể tải vé từ hệ thống. Hãy thử lại sau.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!embedded) window.scrollTo(0, 0);
    void loadTickets();
  }, [embedded, loadTickets]);

  const counts = useMemo(() => ({
    ALL: tickets.length,
    UPCOMING: tickets.filter((ticket) => ["UPCOMING", "SELLING", "GIFTING"].includes(ticket.status)).length,
    USED: tickets.filter((ticket) => ticket.status === "USED").length,
    TRANSFERRED: tickets.filter((ticket) => ticket.status === "TRANSFERRED").length,
  }), [tickets]);

  const filteredTickets = useMemo(() => tickets.filter((ticket) => {
    const tabMatches = activeTab === "ALL"
      || (activeTab === "UPCOMING" && ["UPCOMING", "SELLING", "GIFTING"].includes(ticket.status))
      || (activeTab === "USED" && ticket.status === "USED")
      || (activeTab === "TRANSFERRED" && ticket.status === "TRANSFERRED");
    const query = searchQuery.trim().toLowerCase();
    return tabMatches && (!query || ticket.eventTitle.toLowerCase().includes(query) || ticket.bookingCode.toLowerCase().includes(query) || ticket.ticketTypeName.toLowerCase().includes(query));
  }), [activeTab, searchQuery, tickets]);

  const tabs: Array<{ value: TicketFilter; label: string }> = [
    { value: "ALL", label: "Tất cả" },
    { value: "UPCOMING", label: "Sắp diễn ra" },
    { value: "USED", label: "Đã sử dụng" },
    { value: "TRANSFERRED", label: "Đã chuyển nhượng" },
  ];

  return (
    <div className={`w-full font-sans ${embedded ? "" : "flex-1 app-bg-page app-text-main pb-20"}`}>
      <div className={embedded ? "space-y-5" : "mx-auto mt-8 max-w-[1120px] space-y-5 px-5 md:px-8"}>
        <section className="rounded-2xl border app-border app-bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Tủ vé điện tử</p><h1 className="mt-1 text-2xl font-bold tracking-tight app-text-main">Vé của tôi</h1><p className="mt-1 text-sm app-text-sub">Xem vé, quản lý check-in và chuyển quyền sở hữu.</p></div>
            <label className="relative block w-full sm:w-72"><FiSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 app-text-muted" /><span className="sr-only">Tìm vé</span><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm vé…" className="w-full rounded-xl border app-border app-bg-card py-2.5 pl-10 pr-4 text-sm app-text-main focus:outline-none focus:ring-2 focus:ring-blue-500" /></label>
          </div>
          <div className="mt-5 flex gap-1 overflow-x-auto border-t app-border pt-4" role="tablist">
            {tabs.map((tab) => <button key={tab.value} type="button" role="tab" aria-selected={activeTab === tab.value} onClick={() => setActiveTab(tab.value)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${activeTab === tab.value ? "bg-blue-600 text-white" : "app-text-sub hover:bg-slate-500/10 hover:app-text-main"}`}>{tab.label} <span className={activeTab === tab.value ? "text-blue-100" : "app-text-muted"}>{counts[tab.value]}</span></button>)}
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border app-border app-bg-card p-12 text-center text-sm app-text-sub">Đang tải vé từ hệ thống…</div>
        ) : loadError ? (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-8 text-center text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"><p>{loadError}</p><button type="button" onClick={() => void loadTickets()} className="mt-4 rounded-xl border border-current px-4 py-2 font-semibold">Thử lại</button></div>
        ) : filteredTickets.length ? (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => {
              const canTransact = ticket.rawStatus === "VALID";
              return (
                <article key={ticket.id} className="relative overflow-visible rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="h-28 w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 sm:h-22 sm:w-32">
                      {ticket.eventPoster ? (
                        <img src={ticket.eventPoster} alt={ticket.eventTitle} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center"><FiTag className="h-5 w-5 text-slate-400" /></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900 dark:text-slate-100">{ticket.eventTitle}</h2>
                        <StatusBadge status={ticket.status} />
                      </div>
                      <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:gap-4">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <FiCalendar className="shrink-0 text-slate-400 h-3.5 w-3.5" />
                          <span className="truncate">{ticket.eventTime}</span>
                        </span>
                        <span className="flex min-w-0 items-center gap-1.5">
                          <FiMapPin className="shrink-0 text-slate-400 h-3.5 w-3.5" />
                          <span className="truncate">{ticket.eventLocation}</span>
                        </span>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-3 text-xs">
                        <span className="text-slate-500 font-medium">{ticket.ticketTypeName} · {ticket.quantity} vé</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{formatCurrency(ticket.totalAmount)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-end gap-2 sm:pl-2">
                      <button
                        type="button"
                        onClick={() => setViewerTicket(ticket)}
                        className="rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Xem vé
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId((current) => current === ticket.id ? undefined : ticket.id)}
                          aria-label="Thao tác với vé"
                          aria-expanded={openMenuId === ticket.id}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <FiMoreHorizontal className="h-4 w-4 text-slate-500" />
                        </button>
                        {openMenuId === ticket.id && (
                          <div className="absolute bottom-11 right-0 z-20 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                            {canTransact && (
                              <button
                                type="button"
                                onClick={() => { setOpenMenuId(undefined); downloadTicketAsImage(ticket); }}
                                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60"
                              >
                                <FiDownload className="h-3.5 w-3.5 text-slate-400" /> Tải vé
                              </button>
                            )}
                            {canTransact && (
                              <button
                                type="button"
                                onClick={() => { setOpenMenuId(undefined); setResaleTicket(ticket); }}
                                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60"
                              >
                                <FiTag className="h-3.5 w-3.5 text-slate-400" /> Đăng bán lại
                              </button>
                            )}
                            {canTransact && (
                              <button
                                type="button"
                                onClick={() => { setOpenMenuId(undefined); setGiftTicket(ticket); }}
                                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60"
                              >
                                <FiGift className="h-3.5 w-3.5 text-slate-400" /> Tặng vé
                              </button>
                            )}
                            <Link
                              to={`/my-tickets/${ticket.id}`}
                              onClick={() => setOpenMenuId(undefined)}
                              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60"
                            >
                              <FiArrowRight className="h-3.5 w-3.5 text-slate-400" /> Chi tiết
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 truncate border-t border-slate-100 pt-2 font-mono text-[11px] text-slate-400 dark:border-slate-800">
                    Mã vé: {ticket.bookingCode}
                  </p>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mx-auto max-w-lg rounded-2xl border app-border app-bg-card p-10 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40"><FiTag className="h-5 w-5" /></div><h2 className="mt-4 text-lg font-bold app-text-main">Không tìm thấy vé phù hợp</h2><p className="mt-2 text-sm app-text-sub">Thử đổi bộ lọc hoặc tìm một sự kiện khác.</p><Link to="/events" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline">Khám phá sự kiện <FiArrowRight /></Link></div>
        )}
      </div>

      {viewerTicket && <TicketViewer ticket={viewerTicket} onClose={() => setViewerTicket(undefined)} />}
      {resaleTicket && <ResaleTicketModal ticket={resaleTicket} onClose={() => setResaleTicket(undefined)} onChanged={loadTickets} />}
      {giftTicket && <GiftTicketModal ticket={giftTicket} onClose={() => setGiftTicket(undefined)} onChanged={loadTickets} />}
    </div>
  );
}
