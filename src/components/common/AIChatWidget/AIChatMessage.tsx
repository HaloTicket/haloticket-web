import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { AiChatMessage } from '../../../types/ai';
import { 
  Bot, 
  User, 
  Calendar, 
  Clock, 
  Plus, 
  Minus, 
  ArrowRight, 
  ExternalLink, 
  Armchair, 
  Users, 
  Ticket, 
  Map,
  CreditCard,
  AlertCircle,
  Maximize2,
  Loader2,
  X
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ticketApi } from '@/services/ticketApi';
import { eventApi } from '@/services/eventApi';
import type { SeatMapDocument, SeatTier } from '@/types/seating';
import { formatCurrency } from '@/utils/formatters';
import { SeatCanvas } from '@/features/organizer/event-manage/components/seating/SeatCanvas';

interface InteractiveTicketSelectorProps {
  data: any;
  onSendMessage?: (text: string, hiddenContext?: string) => void;
}

const InteractiveTicketSelector: React.FC<InteractiveTicketSelectorProps> = ({ data, onSendMessage }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const showtimes = data.showtimes || [];
  const eventId = data.event_id;
  const eventTitle = data.event_title || t("Sự kiện");
  const hasSeatmap = Boolean(data.has_seatmap);

  // active showtime index
  const [selectedShowtimeIdx, setSelectedShowtimeIdx] = useState(0);
  // quantities for current tickets: { [ticketId]: number }
  const [ticketQuantities, setTicketQuantities] = useState<Record<string, number>>({});

  if (!showtimes || showtimes.length === 0) {
    return null;
  }

  const currentShowtime = showtimes[selectedShowtimeIdx] || showtimes[0];
  const tickets = currentShowtime.tickets || [];

  const updateQuantity = (ticketId: string, delta: number, max: number = 10) => {
    setTicketQuantities(prev => {
      const current = prev[ticketId] || 0;
      const next = Math.max(0, Math.min(max, current + delta));
      return { ...prev, [ticketId]: next };
    });
  };

  const totalSelectedTickets = Object.values(ticketQuantities).reduce((a, b) => a + b, 0);
  const totalAmount = tickets.reduce((sum: number, tItem: any) => {
    const qty = ticketQuantities[tItem.id] || 0;
    return sum + qty * (tItem.price || 0);
  }, 0);

  // status badge styling
  const getStatusBadge = (status: string, label: string) => {
    switch (status) {
      case 'ON_SALE':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {label || t("Đang bán")}
          </span>
        );
      case 'SALE_ENDED':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-300 dark:border-gray-700 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            {label || t("Ngừng bán")}
          </span>
        );
      case 'SOLD_OUT':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            {label || t("Hết vé")}
          </span>
        );
      case 'UPCOMING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            {label || t("Sắp mở bán")}
          </span>
        );
    }
  };

  const handleProceedToCheckout = () => {
    if (totalSelectedTickets === 0 || currentShowtime.status !== 'ON_SALE') return;

    const cart = tickets
      .filter((tItem: any) => (ticketQuantities[tItem.id] || 0) > 0)
      .map((tItem: any) => ({
        id: tItem.id,
        name: tItem.name,
        price: Number(tItem.price) || 0,
        quantity: ticketQuantities[tItem.id],
        zoneId: tItem.id,
        zoneName: tItem.name,
        tierId: tItem.id,
        is_seated: Boolean(tItem.is_seated),
      }));

    if (cart.length === 0) return;

    // generate GA or ticket placeholder seat identifiers
    const gaSeatIds: string[] = [];
    cart.forEach((c: any) => {
      for (let i = 0; i < c.quantity; i++) {
        gaSeatIds.push(`${c.zoneId}-AI-${Date.now()}-${i + 1}`);
      }
    });

    const summaryText = cart.map((c: any) => `${c.quantity}x ${c.name}`).join(", ");

    const bookingPayload = {
      eventId: String(eventId),
      showtimeId: String(currentShowtime.id),
      eventTitle: eventTitle,
      eventTime: currentShowtime.start_time || "19:00, 2026",
      eventLocation: t("Địa điểm HaloTicket"),
      eventPoster: null,
      zoneId: cart[0]?.zoneId,
      zoneName: cart[0]?.zoneName,
      ticketTypeName: summaryText,
      cartItems: cart,
      items: cart.map((c: any) => ({
        ticketTypeId: c.id,
        quantity: c.quantity,
        unitPrice: c.price,
      })),
      seatIds: gaSeatIds,
      seatNames: {},
      price: cart[0]?.price || 0,
      quantity: totalSelectedTickets,
      totalAmount: totalAmount,
      timestamp: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000,
    };

    localStorage.setItem("haloticket_pending_order", JSON.stringify(bookingPayload));
    navigate(`/checkout?eventId=${eventId}&showtimeId=${currentShowtime.id}&qty=${totalSelectedTickets}`);
  };

  const isShowtimeNotOpen = currentShowtime.status === 'UPCOMING' || currentShowtime.status === 'SALE_ENDED' || currentShowtime.status === 'SOLD_OUT';

  return (
    <div className="mt-2.5 flex flex-col gap-2.5 p-3 bg-white dark:bg-[#222226] rounded-xl border border-brand-primary/30 shadow-xs w-full animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-1.5 border-b border-gray-100 dark:border-gray-800 pb-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-extrabold text-brand-primary text-xs sm:text-sm truncate">{eventTitle}</h4>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
            <Ticket size={11} className="text-brand-primary shrink-0" />
            <span className="truncate">{t("Suất diễn & Bảng giá vé")}</span>
          </p>
        </div>
        
        {hasSeatmap && (
          <button
            type="button"
            onClick={() => onSendMessage?.(t("Tôi muốn xem sơ đồ ghế của sự kiện này"), `(Mã: ${eventId})`)}
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 rounded-lg transition-colors cursor-pointer shrink-0"
            title={t("Xem sơ đồ chỗ ngồi")}
          >
            <Map size={12} />
            <span>{t("Sơ đồ ghế")}</span>
          </button>
        )}
      </div>

      {/* Showtimes Selector: Horizontal Scrollable List */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px] font-bold text-gray-700 dark:text-gray-300">
          <span className="flex items-center gap-1">
            <Calendar size={12} className="text-brand-primary" />
            <span>{t("Chọn Suất diễn:")}</span>
          </span>
          <span className="text-[10px] text-gray-400 font-normal">({showtimes.length} {t("suất")})</span>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {showtimes.map((st: any, idx: number) => {
            const isSelected = selectedShowtimeIdx === idx;
            return (
              <button
                key={st.id || idx}
                type="button"
                onClick={() => {
                  setSelectedShowtimeIdx(idx);
                  setTicketQuantities({}); // reset quantities when switching showtime
                }}
                className={`shrink-0 p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 min-w-[140px] max-w-[200px] ${
                  isSelected
                    ? "border-brand-primary bg-brand-primary/10 shadow-xs ring-1 ring-brand-primary/40"
                    : "border-gray-200 dark:border-gray-700 hover:border-brand-primary/40 bg-gray-50/70 dark:bg-[#2a2a2e]"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs font-bold truncate ${isSelected ? "text-brand-primary" : "text-gray-800 dark:text-zinc-200"}`}>
                    {st.name}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  {st.start_time ? (
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate">
                      <Clock size={10} className="shrink-0" />
                      <span className="truncate">{st.start_time}</span>
                    </span>
                  ) : <span />}
                  {getStatusBadge(st.status, st.status_label)}
                </div>
              </button>
            );
          })}
        </div>

        {/* Notice banner if showtime is not open for sale */}
        {isShowtimeNotOpen && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
            <AlertCircle size={14} className="shrink-0" />
            <span>
              {currentShowtime.status === 'UPCOMING'
                ? t("Suất diễn này sắp mở bán. Vé chưa thể chọn vào lúc này.")
                : currentShowtime.status === 'SALE_ENDED'
                ? t("Suất diễn này đã ngừng bán vé online.")
                : t("Suất diễn này đã bán hết vé.")}
            </span>
          </div>
        )}
      </div>

      {/* Ticket Types for Selected Showtime */}
      <div className="flex flex-col gap-1.5 mt-0.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">
            {t("Hạng vé thuộc")} <span className="text-brand-primary">{currentShowtime.name}</span>:
          </label>
          {currentShowtime.status === 'SALE_ENDED' && (
            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium shrink-0">
              {t("Ngừng bán online")}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {tickets.map((tItem: any) => {
            const qty = ticketQuantities[tItem.id] || 0;
            const isTicketSoldOut = tItem.status === 'SOLD_OUT' || (tItem.total_quantity !== undefined && tItem.total_quantity <= 0);
            const isDisabled = isTicketSoldOut || isShowtimeNotOpen;

            return (
              <div
                key={tItem.id}
                className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                  qty > 0
                    ? "border-brand-primary/60 bg-brand-primary/5 dark:bg-brand-primary/10 shadow-xs"
                    : "border-gray-200 dark:border-gray-700/60 bg-gray-50/70 dark:bg-[#1e1e22]"
                } ${isDisabled ? "opacity-60" : ""}`}
              >
                {/* Ticket Info */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs text-gray-900 dark:text-white truncate">
                      {tItem.name}
                    </span>
                    
                    {hasSeatmap && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium flex items-center gap-0.5 ${
                        tItem.is_seated 
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                          : "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                      }`}>
                        {tItem.is_seated ? <Armchair size={9} /> : <Users size={9} />}
                        {tItem.is_seated ? t("Ghế") : t("Đứng")}
                      </span>
                    )}

                    {isTicketSoldOut && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                        {t("Hết")}
                      </span>
                    )}
                  </div>

                  {tItem.description && (
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                      {tItem.description}
                    </p>
                  )}

                  <div className="text-xs font-black text-orange-500 mt-0.5">
                    {tItem.price > 0 ? `${Number(tItem.price).toLocaleString("vi-VN")} đ` : t("Miễn phí")}
                  </div>
                </div>

                {/* Right: Quantity Controls or Status Tag */}
                {isShowtimeNotOpen ? (
                  <div className="shrink-0 flex items-center">
                    {currentShowtime.status === 'UPCOMING' && (
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-300/60 dark:border-amber-800/60">
                        {t("Sắp mở bán")}
                      </span>
                    )}
                    {currentShowtime.status === 'SALE_ENDED' && (
                      <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-300/60 dark:border-gray-700">
                        {t("Ngừng bán online")}
                      </span>
                    )}
                    {currentShowtime.status === 'SOLD_OUT' && (
                      <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-300/60 dark:border-rose-800/60">
                        {t("Hết vé")}
                      </span>
                    )}
                  </div>
                ) : isTicketSoldOut ? (
                  <div className="shrink-0 flex items-center">
                    <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-300/60 dark:border-rose-800/60">
                      {t("Hết vé")}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center bg-white dark:bg-[#2b2b30] rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs shrink-0">
                    <button
                      type="button"
                      disabled={qty === 0}
                      onClick={() => updateQuantity(tItem.id, -1, tItem.max_per_order || 10)}
                      className="w-7 h-7 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l-lg disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      title={t("Giảm")}
                    >
                      <Minus size={12} />
                    </button>
                    
                    <span className="w-7 text-center font-bold text-xs text-gray-900 dark:text-white select-none">
                      {qty}
                    </span>

                    <button
                      type="button"
                      disabled={qty >= (tItem.max_per_order || 10)}
                      onClick={() => updateQuantity(tItem.id, 1, tItem.max_per_order || 10)}
                      className="w-7 h-7 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-lg disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      title={t("Tăng")}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary and Action Buttons */}
      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">
            {t("Tổng cộng")}: <strong className="text-gray-900 dark:text-white font-bold">{totalSelectedTickets} {t("vé")}</strong>
          </span>
          <span className="text-sm font-black text-orange-500">
            {totalAmount.toLocaleString("vi-VN")} đ
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          {/* Direct Proceed to Checkout Button */}
          <button
            type="button"
            disabled={totalSelectedTickets === 0 || currentShowtime.status !== 'ON_SALE'}
            onClick={handleProceedToCheckout}
            className="w-full py-2.5 text-center text-xs font-bold text-white gradient-btn rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
          >
            <CreditCard size={14} />
            <span>{t("Tiếp tục thanh toán")}</span>
            <ArrowRight size={13} />
          </button>

          {/* Seatmap link if event has seatmap */}
          {hasSeatmap && (
            <a
              href={`/events/${eventId}/select-ticket?showtimeId=${currentShowtime.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-1.5 text-center text-[11px] font-semibold text-brand-primary hover:underline flex items-center justify-center gap-1"
            >
              <Map size={12} />
              <span>{t("Hoặc tự chọn ghế trên sơ đồ")}</span>
              <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

interface InteractiveSeatmapViewerProps {
  eventId: string;
  eventTitle?: string;
  seatmapImageUrl?: string;
  onSendMessage?: (content: string, hiddenContext?: string) => void;
}

const InteractiveSeatmapViewer: React.FC<InteractiveSeatmapViewerProps> = ({
  eventId,
  eventTitle: initialEventTitle,
  seatmapImageUrl,
  onSendMessage,
}) => {
  const { t } = useTranslation();
  const [eventTitle, setEventTitle] = useState(initialEventTitle || "");
  const [seatMap, setSeatMap] = useState<SeatMapDocument | null>(null);
  const [tiers, setTiers] = useState<SeatTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    async function loadLayout() {
      try {
        setIsLoading(true);

        if (!initialEventTitle) {
          eventApi.getEventById(eventId).then((ev: any) => {
            if (isMounted && ev?.title) {
              setEventTitle(ev.title);
            }
          }).catch(() => {});
        }

        const [layoutData, ticketTypes] = await Promise.all([
          ticketApi.getSeatLayoutByEventId(eventId),
          ticketApi.getTicketTypesByEventId(eventId),
        ]);

        if (!isMounted) return;

        const mappedTiers: SeatTier[] = (ticketTypes || []).map((tt: any) => ({
          id: tt.id,
          name: tt.name,
          price: Number(tt.price) || 0,
          color: tt.colorCode || tt.color || "#3b82f6",
          description: tt.description,
          totalQuantity: tt.totalQuantity,
        }));
        setTiers(mappedTiers);

        let doc: SeatMapDocument | null = null;
        if (layoutData?.draftJson) {
          try {
            doc = JSON.parse(layoutData.draftJson) as SeatMapDocument;
          } catch (e) {
            console.warn("Failed parsing seatmap draftJson:", e);
          }
        }

        if (!doc) {
          const localStr = localStorage.getItem(`haloticket_seatmap_draft_${eventId}`);
          if (localStr) {
            try {
              doc = JSON.parse(localStr) as SeatMapDocument;
            } catch {}
          }
        }

        if (doc) {
          if ((!doc.ticketTiers || doc.ticketTiers.length === 0) && mappedTiers.length > 0) {
            doc.ticketTiers = mappedTiers;
          }
          setSeatMap(doc);
        }
      } catch (err) {
        console.error("Error loading seat layout in AI Chat:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadLayout();
    return () => {
      isMounted = false;
    };
  }, [eventId, initialEventTitle]);

  const hasCanvas = Boolean(
    seatMap && (
      (seatMap.zones && Object.keys(seatMap.zones).length > 0) ||
      (seatMap.seats && seatMap.seats.length > 0) ||
      (seatMap.stages && seatMap.stages.length > 0)
    )
  );

  const renderCanvasContent = (full: boolean) => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 text-gray-500 text-xs py-16">
          <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
          <span>{t("Đang tải sơ đồ ghế sự kiện...")}</span>
        </div>
      );
    }
    if (hasCanvas && seatMap) {
      return (
        <SeatCanvas
          seats={seatMap.seats || []}
          stages={seatMap.stages || []}
          structures={seatMap.structures || []}
          zones={seatMap.zones || {}}
          tiers={tiers.length > 0 ? tiers : seatMap.ticketTiers || []}
          seatStatusMap={{}}
          canvasSettings={seatMap.canvasSettings || { width: 1500, height: 1050, gridSize: 20, snapEnabled: true, showGrid: true }}
          selectedSeatIds={selectedSeatIds}
          setSelectedSeatIds={setSelectedSeatIds}
          selectedStageId={selectedStageId}
          setSelectedStageId={setSelectedStageId}
          selectedStructureId={selectedStructureId}
          setSelectedStructureId={setSelectedStructureId}
          selectedZoneId={selectedZoneId}
          setSelectedZoneId={setSelectedZoneId}
          onUpdateSeats={() => {}}
          onUpdateStages={() => {}}
          onUpdateStructures={() => {}}
          onUpdateZones={() => {}}
          onDeleteSelected={() => {}}
          isAttendeeMode={true}
          attendeeCart={[]}
          onToggleAttendeeSeat={() => {}}
          onSelectZoneAttendee={() => {}}
          isFullscreen={full}
          onToggleFullscreen={() => setIsFullscreen(!full)}
        />
      );
    }
    if (seatmapImageUrl) {
      return (
        <div className="relative w-full h-full group flex items-center justify-center p-2">
          <img
            src={seatmapImageUrl}
            alt="Seatmap"
            className="max-w-full max-h-full object-contain cursor-pointer hover:scale-105 transition-transform duration-200 rounded-lg"
            onClick={() => window.open(seatmapImageUrl, "_blank")}
          />
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => window.open(seatmapImageUrl, "_blank")}
              className="bg-black/70 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-sm cursor-pointer"
            >
              {t("Phóng to ảnh")}
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="p-6 text-center text-xs text-gray-500 dark:text-gray-400">
        {t("Sự kiện chưa có sơ đồ khán phòng chi tiết. Bạn có thể chọn mua vé trực tiếp từ bảng hạng vé.")}
      </div>
    );
  };

  return (
    <>
      <div className="mt-2.5 flex flex-col gap-2 p-3 bg-white dark:bg-[#222226] rounded-xl border border-brand-primary/30 shadow-xs w-full overflow-hidden animate-in fade-in-50 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-2 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Map size={14} className="text-brand-primary shrink-0" />
            <h4 className="font-extrabold text-xs text-gray-900 dark:text-white truncate">
              {t("Sơ đồ ghế")}: <span className="text-brand-primary">{eventTitle || t("Sự kiện")}</span>
            </h4>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="p-1 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              title={t("Phóng to toàn màn hình")}
            >
              <Maximize2 size={13} />
            </button>

            {eventId && (
              <a
                href={`/events/${eventId}/select-ticket`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-brand-primary hover:underline flex items-center gap-1 bg-brand-primary/10 px-2 py-0.5 rounded-md"
              >
                <span>{t("Đặt vé & chọn ghế")}</span>
                <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>

        {/* Main Canvas / Image Area */}
        <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-950/5 dark:bg-black/30 flex items-center justify-center h-[380px] sm:h-[430px]">
          {renderCanvasContent(false)}
        </div>

        {/* Legend & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] shrink-0">
          {tiers.length > 0 ? (
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-0.5 max-w-full">
              <span className="text-gray-400 text-[10px] font-bold shrink-0">{t("Hạng vé:")}</span>
              {tiers.map((tr) => (
                <span
                  key={tr.id}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[10px] font-medium shrink-0"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: tr.color || "#3b82f6" }}
                  />
                  <span className="font-bold text-gray-800 dark:text-zinc-200">{tr.name}</span>
                  <span className="text-orange-500 font-bold">{formatCurrency(tr.price)}</span>
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[10px] text-gray-400">{t("Sơ đồ tương tác: Cuộn chuột để phóng to/thu nhỏ, kéo để di chuyển")}</span>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onSendMessage?.(t("Tôi muốn chọn hạng vé của sự kiện này"), `(Mã: ${eventId})`)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-brand-primary text-white hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1"
            >
              <Ticket size={11} />
              <span>{t("Chọn số lượng vé")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Portal Modal */}
      {isFullscreen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center animate-in fade-in duration-200">
            <div className="relative w-full h-full max-w-7xl max-h-[96vh] rounded-2xl bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-zinc-900/80 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                    <Map size={16} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-900 dark:text-white truncate">
                      {t("Sơ đồ ghế")}: <span className="text-brand-primary">{eventTitle || t("Sự kiện")}</span>
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {t("Xem trực tiếp khán đài, sân khấu và các hạng vé")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {eventId && (
                    <a
                      href={`/events/${eventId}/select-ticket`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary/90 px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <span>{t("Đặt vé & chọn ghế")}</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsFullscreen(false)}
                    className="p-1.5 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    title={t("Đóng")}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Fullscreen Canvas Area */}
              <div className="relative flex-1 min-h-0 w-full p-2 sm:p-4 bg-gray-100/50 dark:bg-black/40 flex flex-col overflow-hidden">
                <div className="relative flex-1 min-h-0 w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                  {renderCanvasContent(true)}
                </div>
              </div>

              {/* Footer Legend */}
              {tiers.length > 0 && (
                <div className="flex items-center justify-between gap-3 px-5 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-zinc-900/80 text-xs shrink-0 overflow-x-auto">
                  <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
                    <span className="font-bold text-gray-400 text-[11px] shrink-0">{t("Bảng giá vé:")}</span>
                    {tiers.map((tier) => (
                      <div
                        key={tier.id}
                        className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 text-[11px]"
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
                        <span className="font-bold text-gray-900 dark:text-white">{tier.name}</span>
                        <span className="text-orange-500 font-extrabold">{formatCurrency(tier.price)}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFullscreen(false)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors shrink-0"
                  >
                    {t("Đóng")}
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

interface AIChatMessageProps {
  message: AiChatMessage;
  onSendMessage?: (text: string, hiddenContext?: string) => void;
}

const AIChatMessage: React.FC<AIChatMessageProps> = ({ message, onSendMessage }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isUser = message.sender === 'user';
  const hasRichActions = Boolean(message.actions && message.actions.length > 0);

  return (
    <div className={`flex w-full mb-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-brand-primary flex items-center justify-center text-white mr-1.5 flex-shrink-0 shadow-sm mt-0.5">
          <Bot size={15} />
        </div>
      )}

      <div className={`${
        isUser
          ? 'max-w-[85%] bg-brand-primary text-white rounded-2xl rounded-tr-sm'
          : hasRichActions
            ? 'w-full max-w-full bg-white dark:bg-[#1e1e22] text-text-main rounded-2xl rounded-tl-sm border border-gray-100 dark:border-gray-800'
            : 'max-w-[88%] bg-white dark:bg-[#1e1e22] text-text-main rounded-2xl rounded-tl-sm border border-gray-100 dark:border-gray-800'
      } px-3.5 py-2.5 shadow-xs overflow-hidden`}>
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        ) : (
          message.text ? (
            <div className="text-sm prose dark:prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-table:my-2 prose-td:p-1.5 prose-th:p-1.5 prose-td:border prose-th:border prose-a:text-blue-500">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
            </div>
          ) : null
        )}

        {/* if the AI ​​calls a tool to highlight a seat or requests confirmation */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs flex flex-col gap-1.5">
            {message.actions.map((action, idx) => {
              if (action.action === 'HIGHLIGHT_SEATS') {
                return (
                  <div key={idx} className="flex items-center text-brand-primary dark:text-brand-accent font-medium bg-brand-primary/10 px-2.5 py-1.5 rounded-md">
                    {t("Đã khoanh vùng")} {action.database_data?.seats?.length || 0} {t("ghế")} ({action.database_data?.seats?.join(', ')}) {t("trên sơ đồ!")}
                  </div>
                );
              }
              
              if (action.action === 'USER_CONFIRMATION_REQUIRED') {
                const actionType = action.extracted_args?.action_type;
                const rawData = action.extracted_args?.data;
                let parsed: any = null;
                try {
                  parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
                } catch {
                  parsed = null;
                }

                const eventId = parsed?.event_id;
                const eventTitle = parsed?.event_title || parsed?.event || t("Sự kiện đã chọn");
                const tierName = parsed?.tier_name || parsed?.tier;
                const quantity = parsed?.quantity || parsed?.num_seats || (parsed?.seats?.length ? parsed.seats.length : 1);
                const seats = Array.isArray(parsed?.seats) ? parsed.seats.join(", ") : parsed?.seats;
                const totalPrice = parsed?.total_price || parsed?.total;

                return (
                  <div key={idx} className="mt-2.5 flex flex-col gap-2 p-3 bg-gradient-to-br from-brand-primary/5 to-blue-500/10 border border-brand-primary/30 rounded-xl shadow-xs animate-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between border-b border-brand-primary/20 pb-1.5">
                      <p className="font-extrabold text-brand-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        {t("Xác nhận thông tin đặt vé")}
                      </p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary font-bold">
                        {actionType === 'BOOK_TICKETS' ? t('Giữ chỗ') : actionType}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-text-main dark:text-white text-xs sm:text-sm line-clamp-1">
                        {eventTitle}
                      </div>
                      {tierName && (
                        <div className="flex justify-between items-center text-text-muted">
                          <span>{t("Hạng vé:")}</span>
                          <span className="font-semibold text-text-main dark:text-zinc-200">{tierName}</span>
                        </div>
                      )}
                      {seats && (
                        <div className="flex justify-between items-center text-text-muted">
                          <span>{t("Vị trí ghế:")}</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{seats}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-text-muted">
                        <span>{t("Số lượng:")}</span>
                        <span className="font-semibold text-text-main dark:text-zinc-200">{quantity} {t("vé")}</span>
                      </div>
                      {totalPrice && (
                        <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-gray-200 dark:border-gray-700">
                          <span className="font-bold text-text-main dark:text-white">{t("Tổng tiền tạm tính:")}</span>
                          <span className="font-black text-sm text-orange-500">
                            {Number(totalPrice).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const saved = localStorage.getItem("haloticket_pending_order");
                          if (saved && eventId) {
                            navigate(`/checkout?eventId=${eventId}`);
                          } else if (eventId) {
                            navigate(`/events/${eventId}/select-ticket`);
                          } else {
                            navigate('/events');
                          }
                        }}
                        className="flex-1 py-2 text-center bg-brand-primary hover:bg-brand-secondary text-white font-bold text-xs rounded-lg shadow-sm transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <CreditCard size={13} />
                        <span>{t("Xác nhận & Tới trang Thanh toán")}</span>
                        <ArrowRight size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onSendMessage?.(t("Tôi muốn đổi ý hoặc tìm vé khác"))}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold text-xs rounded-lg transition active:scale-95 cursor-pointer"
                      >
                        {t("Chọn lại")}
                      </button>
                    </div>
                  </div>
                );
              }
              
              if (action.action === 'SHOW_EVENT_CARDS') {
                try {
                  const dataStr = action.database_data;
                  const parsed = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr;
                  const events = typeof parsed?.data === 'string' ? JSON.parse(parsed.data) : (parsed?.data || []);
                  
                  if (!Array.isArray(events) || events.length === 0) return null;
                  return (
                    <div key={idx} className="mt-2.5 flex flex-col gap-2 w-full">
                      <p className="font-bold text-text-main dark:text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-brand-primary"></span>
                        {t("Gợi ý sự kiện dành cho bạn:")}
                      </p>
                      <div className="flex flex-col gap-2">
                        {events.map((evt: any, i: number) => (
                          <div key={i} className="flex gap-2.5 p-2.5 bg-white dark:bg-[#27272a] rounded-xl border border-gray-200 dark:border-gray-700/60 shadow-xs hover:shadow-md transition-shadow">
                            {evt.banner_url ? (
                              <img src={evt.banner_url} alt={evt.title} className="w-16 h-20 sm:w-20 sm:h-24 object-cover rounded-lg flex-shrink-0" />
                            ) : (
                              <div className="w-16 h-20 sm:w-20 sm:h-24 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 text-xs text-center p-1 flex-shrink-0">{t("Không có ảnh")}</div>
                            )}
                            <div className="flex flex-col flex-1 min-w-0">
                              <h4 className="font-bold text-brand-primary text-xs sm:text-sm line-clamp-2 leading-tight mb-0.5" title={evt.title}>{evt.title}</h4>
                              <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate">
                                {evt.location || t('Chưa cập nhật')}
                              </p>
                              {evt.dates_summary && (
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                                  {evt.dates_summary}
                                </p>
                              )}
                              <p className="text-xs font-bold text-orange-500 mt-auto pt-1">
                                {t("Từ")} {evt.min_price ? Number(evt.min_price).toLocaleString('vi-VN') : 0} đ
                              </p>
                              <div className="mt-1.5 flex gap-1.5">
                                <a href={`/events/${evt.event_id}`} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-[10px] sm:text-[11px] font-semibold text-brand-primary border border-brand-primary hover:bg-brand-primary/10 py-1 rounded-lg transition-colors">
                                  {t("Chi tiết")}
                                </a>
                                <button onClick={() => onSendMessage?.(`${t("Tôi muốn chọn sự kiện")} "${evt.title}"`, `(Mã: ${evt.event_id})`)} className="flex-1 text-center text-[10px] sm:text-[11px] font-semibold text-white bg-brand-primary hover:bg-brand-secondary py-1 rounded-lg transition-colors cursor-pointer">
                                  {t("Chọn sự kiện")}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                } catch {
                  return null;
                }
              }

              if (action.action === 'SHOW_SEATMAP') {
                try {
                  const rawData = action.database_data || action.extracted_args?.data;
                  let parsedData: any = null;
                  if (typeof rawData === 'string' && (rawData.startsWith('{') || rawData.startsWith('['))) {
                    try {
                      parsedData = JSON.parse(rawData);
                    } catch {}
                  } else if (typeof rawData === 'object') {
                    parsedData = rawData;
                  }

                  const eventId = action.extracted_args?.event_id || parsedData?.event_id;
                  const eventTitle = parsedData?.event_title;
                  const seatmapUrl = parsedData?.seatmap_image_url || (typeof parsedData?.data === 'string' ? parsedData.data : (typeof rawData === 'string' && !rawData.startsWith('{') ? rawData : null));

                  if (!eventId && !seatmapUrl) return null;

                  return (
                    <InteractiveSeatmapViewer
                      key={idx}
                      eventId={eventId}
                      eventTitle={eventTitle}
                      seatmapImageUrl={seatmapUrl}
                      onSendMessage={onSendMessage}
                    />
                  );
                } catch {
                  return null;
                }
              }

              if (action.action === 'SHOW_TICKET_TYPES') {
                try {
                  const dataStr = action.database_data;
                  const parsed = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr;
                  
                  // New rich format with showtimes & status
                  if (parsed?.showtimes && Array.isArray(parsed.showtimes)) {
                    return (
                      <InteractiveTicketSelector
                        key={idx}
                        data={parsed}
                        onSendMessage={onSendMessage}
                      />
                    );
                  }

                  // Fallback for legacy flat array
                  const tickets = typeof parsed?.data === 'string' ? JSON.parse(parsed.data) : (parsed?.data || []);
                  if (Array.isArray(tickets) && tickets.length > 0) {
                    const fallbackData = {
                      event_id: parsed?.event_id || action.extracted_args?.event_id || '',
                      event_title: t("Bảng giá vé sự kiện"),
                      has_seatmap: false,
                      showtimes: [
                        {
                          id: 'st_default',
                          name: t("Suất diễn chính"),
                          status: 'ON_SALE',
                          status_label: t("Đang mở bán"),
                          tickets: tickets.map((tk: any, tIdx: number) => ({
                            id: tk.id || `tk_${tIdx}`,
                            name: tk.name,
                            price: tk.price,
                            description: tk.description,
                            status: tk.status || 'ACTIVE',
                            is_seated: false
                          }))
                        }
                      ]
                    };
                    return (
                      <InteractiveTicketSelector
                        key={idx}
                        data={fallbackData}
                        onSendMessage={onSendMessage}
                      />
                    );
                  }
                  return null;
                } catch {
                  return null;
                }
              }
              
              return null;
            })}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 ml-2 flex-shrink-0 shadow-sm">
          <User size={18} />
        </div>
      )}
    </div>
  );
};

export default AIChatMessage;
