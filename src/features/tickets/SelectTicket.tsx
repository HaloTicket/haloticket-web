import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiPlus, FiMinus, FiCalendar, FiMapPin, FiX, FiLayers, FiCheckCircle, FiTrash2, FiClock } from "react-icons/fi";
import { eventApi } from "@/services/eventApi";
import { ticketApi } from "@/services/ticketApi";
import type { SeatMapDocument, ZoneBlock, SeatTier } from "@/types/seating";
import { SeatCanvas } from "@/features/organizer/event-manage/components/seating/SeatCanvas";
import { PRESET_TEMPLATES } from "@/mock/presetTemplates";
import { formatCurrency } from "@/utils/formatters";

export interface CartTicketItem {
  zoneId: string;
  zoneName: string;
  tierId?: string;
  tierName: string;
  price: number;
  quantity: number;
  color?: string;
  maxPerOrder?: number;
  minPerOrder?: number;
}

export default function SelectTicket() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [eventData, setEventData] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<SeatTier[]>([]);
  const [seatMap, setSeatMap] = useState<SeatMapDocument | null>(null);
  const [seatStatusMap, setSeatStatusMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // cart of selected tickets from multiple zones
  const [cart, setCart] = useState<CartTicketItem[]>([]);

  // selected zone for quantity selector modal
  const [activeZoneModal, setActiveZoneModal] = useState<ZoneBlock | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);

  // unfinished order modal state (Ảnh 5)
  const [unfinishedOrder, setUnfinishedOrder] = useState<any | null>(null);
  const [pendingTimerSeconds, setPendingTimerSeconds] = useState<number>(0);

  // scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // check for unfinished pending order on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("haloticket_pending_order");
      if (saved) {
        const parsed = JSON.parse(saved);
        const expiresAt = parsed.expiresAt || (parsed.timestamp ? parsed.timestamp + 15 * 60 * 1000 : null);
        const now = Date.now();
        if (expiresAt && expiresAt > now) {
          setUnfinishedOrder(parsed);
          setPendingTimerSeconds(Math.floor((expiresAt - now) / 1000));
        } else if (!expiresAt) {
          setUnfinishedOrder(parsed);
          setPendingTimerSeconds(14 * 60 + 41);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // timer countdown for unfinished order modal
  useEffect(() => {
    if (!unfinishedOrder || pendingTimerSeconds <= 0) return;
    const timer = setInterval(() => {
      setPendingTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setUnfinishedOrder(null);
          localStorage.removeItem("haloticket_pending_order");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [unfinishedOrder, pendingTimerSeconds]);

  const formatTimerMinutes = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${pad(mins)}:${pad(secs)}`;
  };

  // fetch event details, ticket types, and seat layout
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (!id) return;
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        // 1. fetch event detail
        const ev = await eventApi.getEventById(id!);
        if (isMounted && ev) {
          setEventData(ev);
        }

        // 2. fetch ticket types
        let mappedTiers: SeatTier[] = [];
        const types = await ticketApi.getTicketTypesByEventId(id!);
        if (types && types.length > 0) {
          const colors = ["#b45309", "#047857", "#c2410c", "#0284c7", "#1d4ed8", "#be185d", "#475569", "#f59e0b"];
          mappedTiers = types.map((t: any, idx: number) => ({
            id: t.id,
            name: t.name || "Vé Thường",
            price: t.price || 0,
            color: colors[idx % colors.length],
            isFree: t.isFree ?? t.price === 0,
            totalQuantity: t.totalQuantity ?? 100,
            minPerOrder: t.minPerOrder ?? 1,
            maxPerOrder: t.maxPerOrder ?? 5,
            startSaleDate: t.startSaleDate,
            endSaleDate: t.endSaleDate,
            description: t.description || "",
          }));
          if (isMounted) {
            setTicketTypes(mappedTiers);
          }
        }

        // 3. fetch seat layout from backend DB or localStorage or fallback to preset
        let doc: SeatMapDocument | null = null;
        const layoutData = await ticketApi.getSeatLayoutByEventId(id!);
        if (layoutData?.draftJson) {
          try {
            doc = JSON.parse(layoutData.draftJson) as SeatMapDocument;
          } catch (e) {
            console.warn("Failed parsing backend layout draftJson:", e);
          }
        }

        if (!doc) {
          const evTitle = (ev as any)?.title;
          const localStr =
            localStorage.getItem(`haloticket_seatmap_draft_${id}`) ||
            (evTitle ? localStorage.getItem(`haloticket_seatmap_draft_${evTitle}`) : null);
          if (localStr) {
            try {
              doc = JSON.parse(localStr) as SeatMapDocument;
            } catch (e) {
              console.warn("Failed parsing localStorage seatmap draft:", e);
            }
          }
        }

        if (isMounted) {
          if (doc) {
            setSeatMap(doc);
          } else if (layoutData?.zones && Array.isArray(layoutData.zones) && layoutData.zones.length > 0) {
            const syncedZones: Record<string, ZoneBlock> = {};
            layoutData.zones.forEach((z: any) => {
              syncedZones[z.id || `zone_${Date.now()}`] = {
                id: z.id || `zone_${Date.now()}`,
                name: z.name || "Khu vực",
                tierId: z.ticketTypeId || undefined,
                shape: (z.shapeType || "rectangle").toString().toLowerCase() as any,
                color: z.colorCode || z.fillColor || "#3b82f6",
                fillColor: z.fillColor || z.colorCode || "#3b82f6",
                strokeColor: z.strokeColor || "#2563eb",
                curvature: z.curvature ?? 16,
                x: z.x ?? 100,
                y: z.y ?? 100,
                width: z.width ?? 300,
                height: z.height ?? 180,
                rotation: z.rotation ?? 0,
                capacity: z.capacity,
              };
            });
            setSeatMap({
              version: "2.0",
              timestamp: new Date().toISOString(),
              canvasSettings: { width: 1500, height: 1050, gridSize: 20, snapEnabled: true, showGrid: true },
              zones: syncedZones,
              stages: [],
              structures: [],
              seats: [],
              ticketTiers: mappedTiers,
            });
          } else {
            setSeatMap(PRESET_TEMPLATES[0] as unknown as SeatMapDocument);
          }
        }

        // 4. fetch realtime seat status map
        const statusData = await ticketApi.getSeatStatus(id!);
        if (isMounted && statusData) {
          setSeatStatusMap(statusData);
        }
      } catch (err) {
        console.warn("Failed loading ticket selection data:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    const interval = setInterval(async () => {
      if (id) {
        const statusData = await ticketApi.getSeatStatus(id);
        if (isMounted && statusData) {
          setSeatStatusMap(statusData);
        }
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [id]);

  // Extract combined zones list
  const zonesList = useMemo(() => {
    if (!seatMap || !seatMap.zones) return [];
    return Object.values(seatMap.zones);
  }, [seatMap]);

  // Compute Price Legend Panel
  const priceLegend = useMemo(() => {
    if (zonesList.length > 0) {
      return zonesList.map((z, idx) => {
        const tier = ticketTypes.find((t) => t.id === z.tierId);
        const price = z.price ?? tier?.price ?? 1000000 + (idx % 4) * 500000;
        const colors = ["#f59e0b", "#9333ea", "#2563eb", "#10b981", "#f97316", "#ec4899", "#475569", "#06b6d4"];
        const color = z.color || tier?.color || colors[idx % colors.length];
        return {
          id: z.id,
          name: z.name,
          price,
          color,
          tierId: z.tierId,
          tierName: tier?.name || z.name,
          capacity: z.capacity || seatMap?.seats?.filter((s) => s.zoneId === z.id).length || 100,
        };
      });
    }

    if (ticketTypes.length > 0) {
      return ticketTypes.map((t) => ({
        id: t.id,
        name: t.name,
        price: t.price,
        color: t.color || "#10b981",
        tierId: t.id,
        tierName: t.name,
        capacity: t.totalQuantity || 100,
      }));
    }

    return [
      { id: "z1", name: "Khu VVIP", price: 5000000, color: "#7c3aed", tierName: "VVIP", capacity: 100 },
      { id: "z2", name: "Khu VIP", price: 3000000, color: "#2563eb", tierName: "VIP", capacity: 200 },
      { id: "z3", name: "Khán đài A (Standing)", price: 1500000, color: "#0891b2", tierName: "GA", capacity: 500 },
    ];
  }, [zonesList, ticketTypes, seatMap]);

  // Handle Zone selection click
  const handleZoneClick = (zone: any) => {
    setErrorMessage(null);
    const status = seatStatusMap[zone.id];
    if (status === "HOLDING") {
      setErrorMessage("Khu vực này đang được giữ tạm 15 phút bởi khách hàng khác.");
      return;
    } else if (status === "SOLD") {
      setErrorMessage("Khu vực này đã được bán hết vé.");
      return;
    }

    const tier = ticketTypes.find((t) => t.id === zone.tierId);
    const price = zone.price ?? tier?.price ?? priceLegend.find((p) => p.id === zone.id || p.name === zone.name)?.price ?? 1000000;
    const minQty = tier?.minPerOrder || 1;

    const existingInCart = cart.find((item) => item.zoneId === zone.id);
    const initialQty = existingInCart ? existingInCart.quantity : minQty;

    setActiveZoneModal({
      ...zone,
      price,
      maxPerOrder: tier?.maxPerOrder || 4,
      minPerOrder: minQty,
    });
    setSelectedQuantity(initialQty);
  };

  // Confirm Zone Selection & Add/Update Ticket to Cart (Multiple Zone selection!)
  const handleConfirmAddZoneToCart = () => {
    setErrorMessage(null);
    if (!activeZoneModal) return;

    const tier = ticketTypes.find((t) => t.id === activeZoneModal.tierId);
    const maxQty = tier?.maxPerOrder || activeZoneModal.maxPerOrder || 4;
    const minQty = tier?.minPerOrder || activeZoneModal.minPerOrder || 1;

    if (selectedQuantity > maxQty) {
      setErrorMessage(`Bạn chỉ được đặt tối đa ${maxQty} vé trong khu vực này.`);
      return;
    }

    if (selectedQuantity < minQty) {
      setErrorMessage(`Số lượng vé tối thiểu cho khu vực này là ${minQty} vé.`);
      return;
    }

    const price = activeZoneModal.price ?? tier?.price ?? 1000000;

    setCart((prevCart) => {
      const exists = prevCart.some((item) => item.zoneId === activeZoneModal.id);
      if (exists) {
        return prevCart.map((item) =>
          item.zoneId === activeZoneModal.id
            ? { ...item, quantity: selectedQuantity, price }
            : item
        );
      } else {
        const newItem: CartTicketItem = {
          zoneId: activeZoneModal.id,
          zoneName: activeZoneModal.name,
          tierId: activeZoneModal.tierId,
          tierName: `${activeZoneModal.name} (${tier?.name || "Vé Thường"})`,
          price,
          quantity: selectedQuantity,
          color: activeZoneModal.color || "#3b82f6",
          maxPerOrder: maxQty,
          minPerOrder: minQty,
        };
        return [...prevCart, newItem];
      }
    });

    setActiveZoneModal(null);
  };

  const handleUpdateCartItemQty = (zoneId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.zoneId === zoneId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            const maxQty = item.maxPerOrder || 4;
            return { ...item, quantity: Math.min(maxQty, nextQty) };
          }
          return item;
        })
        .filter(Boolean) as CartTicketItem[]
    );
  };

  const handleRemoveCartItem = (zoneId: string) => {
    setCart((prev) => prev.filter((item) => item.zoneId !== zoneId));
  };

  const cartTotalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const cartTotalTickets = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Proceed to Checkout Step with all selected tickets
  const handleProceedToCheckout = () => {
    if (cart.length === 0 || cartTotalTickets === 0) return;

    const firstItem = cart[0];
    const ticketSummaryText = cart.map((c) => `${c.quantity}x ${c.zoneName}`).join(", ");
    const expiresAt = Date.now() + 15 * 60 * 1000;

    const bookingPayload = {
      eventId: id,
      eventTitle: eventData?.title || "Sự kiện HaloTicket 2026",
      eventTime: eventData?.startTime
        ? `${new Date(eventData.startTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} ${new Date(eventData.startTime).toLocaleDateString("vi-VN")}`
        : "19:00 - 23:59, 18/10/2026",
      eventLocation: eventData?.locationName || eventData?.address || "Trung tâm Sự kiện HaloTicket",
      eventPoster: eventData?.thumbnailUrl || eventData?.posterImage || eventData?.bannerUrl || eventData?.image || null,
      zoneId: firstItem.zoneId,
      zoneName: firstItem.zoneName,
      ticketTypeName: ticketSummaryText,
      cartItems: cart,
      price: cart[0].price,
      quantity: cartTotalTickets,
      totalAmount: cartTotalAmount,
      timestamp: Date.now(),
      expiresAt,
    };

    localStorage.setItem("halotticket_pending_order", JSON.stringify(bookingPayload));
    navigate(`/checkout?eventId=${id}&qty=${cartTotalTickets}`);
  };

  if (isLoading) {
    return (
      <div className="w-full flex-1 app-bg-page app-text-main flex items-center justify-center min-h-[450px]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-extrabold app-text-sub">Đang tải sơ đồ thiết kế ghế thực tế...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col font-sans app-bg-page select-none overflow-hidden">
      {/* Sub-Header Bar */}
      <div className="h-14 px-6 md:px-12 app-bg-card backdrop-blur-md border-b app-border flex items-center justify-between z-20 shrink-0 shadow-2xs">
        <button
          type="button"
          onClick={() => navigate(`/events/${id}`)}
          className="flex items-center gap-2 app-text-brand hover:underline font-extrabold text-xs md:text-sm transition-colors cursor-pointer"
        >
          <FiArrowLeft className="w-4 h-4" />
          <span>Trở về chi tiết sự kiện</span>
        </button>

        <div className="text-center">
          <h2 className="text-xs md:text-sm font-black app-text-main uppercase tracking-tight">
            Bước 1: Chọn khu vực vé trên sơ đồ
          </h2>
          <p className="text-[11px] app-text-sub hidden sm:block font-medium">
            Bạn có thể nhấp chọn vé ở nhiều khu vực khác nhau trước khi tiến hành thanh toán
          </p>
        </div>

        <div className="text-right text-xs font-extrabold text-blue-500 hidden sm:block">
          Sơ đồ trực quan 2D
        </div>
      </div>

      {/* Error Toast Alert */}
      {errorMessage && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 text-rose-500 px-6 py-2.5 text-xs font-extrabold flex items-center justify-between z-30 animate-in fade-in duration-200">
          <span>⚠️ {errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="hover:opacity-80 p-1 cursor-pointer"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Interactive Studio Grid */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden min-h-[600px]">
        {/* Left Interactive 2D SeatMap Canvas */}
        <div className="flex-1 relative app-bg-page flex flex-col p-2 lg:p-4 overflow-hidden min-h-[550px]">
          <SeatCanvas
            seats={seatMap?.seats || []}
            stages={seatMap?.stages || []}
            structures={seatMap?.structures || []}
            zones={seatMap?.zones || {}}
            tiers={ticketTypes}
            canvasSettings={seatMap?.canvasSettings || { width: 1500, height: 1050, gridSize: 20, snapEnabled: true, showGrid: true }}
            selectedSeatIds={[]}
            setSelectedSeatIds={() => {}}
            selectedStageId={null}
            setSelectedStageId={() => {}}
            selectedStructureId={null}
            setSelectedStructureId={() => {}}
            selectedZoneId={activeZoneModal?.id || null}
            setSelectedZoneId={(zId) => {
              if (zId && seatMap?.zones?.[zId]) {
                handleZoneClick(seatMap.zones[zId]);
              }
            }}
            onUpdateSeats={() => {}}
            onUpdateStages={() => {}}
            onUpdateStructures={() => {}}
            onUpdateZones={() => {}}
            onDeleteSelected={() => {}}
            isAttendeeMode={true}
            attendeeCart={[]}
            onToggleAttendeeSeat={() => {}}
            onSelectZoneAttendee={(zone) => {
              handleZoneClick(zone);
            }}
          />
        </div>

        {/* Right Event Info, Selected Ticket Cart & Ticket Price Legend Panel */}
        <div className="w-full lg:w-[410px] app-bg-card border-t lg:border-t-0 lg:border-l app-border flex flex-col justify-between z-20 shrink-0">
          <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)]">
            {/* Event Header Info */}
            <div className="space-y-2 border-b app-border pb-3">
              <h1 className="text-base font-black app-text-main leading-snug uppercase tracking-tight">
                {eventData?.title || "SỰ KIỆN NỔI BẬT HALOTICKET"}
              </h1>

              <div className="space-y-1.5 text-xs font-medium app-text-sub">
                <div className="flex items-center gap-2">
                  <FiCalendar className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>
                    {eventData?.startTime
                      ? `${new Date(eventData.startTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} — ${new Date(eventData.startTime).toLocaleDateString("vi-VN")}`
                      : "19:00, 18 Tháng 10, 2026"}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <FiMapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span className="leading-snug">{eventData?.locationName || eventData?.address || "Trung tâm Sự kiện HaloTicket"}</span>
                </div>
              </div>
            </div>

            {/* Selected Tickets Cart List */}
            {cart.length > 0 && (
              <div className="space-y-3 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
                    <FiLayers className="w-4 h-4" />
                    Danh sách vé đã chọn ({cartTotalTickets} vé)
                  </span>
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer"
                  >
                    Xóa tất cả
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.zoneId}
                      className="flex items-center justify-between p-2.5 rounded-xl app-bg-card border app-border text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color || "#3b82f6" }} />
                        <div className="min-w-0">
                          <div className="font-extrabold app-text-main truncate">{item.zoneName}</div>
                          <div className="text-[10px] app-text-sub font-mono">{formatCurrency(item.price)} / vé</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 bg-slate-500/10 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => handleUpdateCartItemQty(item.zoneId, -1)}
                            className="w-5 h-5 rounded flex items-center justify-center app-bg-main border app-border font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="w-4 text-center font-mono font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateCartItemQty(item.zoneId, 1)}
                            className="w-5 h-5 rounded flex items-center justify-center bg-blue-600 text-white font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCartItem(item.zoneId)}
                          className="p-1 text-rose-400 hover:text-rose-600 cursor-pointer"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ticket Price Legend Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black app-text-main uppercase tracking-wider flex items-center gap-1.5">
                  <span>Bảng Hạng Vé & Giá Mở Bán</span>
                </h3>
                <span className="text-[10px] font-bold app-text-sub font-mono">
                  {priceLegend.length} Khu vực
                </span>
              </div>

              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {priceLegend.map((item, idx) => {
                  const inCartItem = cart.find((c) => c.zoneId === item.id);
                  return (
                    <div
                      key={idx}
                      onClick={() =>
                        handleZoneClick({
                          id: item.id,
                          name: item.name,
                          price: item.price,
                          color: item.color,
                          tierId: item.tierId,
                        })
                      }
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-xs group ${
                        inCartItem
                          ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30"
                          : "app-bg-main border app-border hover:border-blue-500/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <span
                          className="w-4 h-4 rounded-lg shrink-0 border border-black/20 shadow-2xs group-hover:scale-110 transition-transform"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-extrabold app-text-main truncate block flex items-center gap-1.5">
                            <span>{item.name}</span>
                            {inCartItem && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-600 text-white text-[9px] font-bold font-mono">
                                Đã chọn x{inCartItem.quantity}
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] app-text-sub block font-mono">
                            {item.capacity} chỗ mở bán
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono shrink-0">
                        {formatCurrency(item.price)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="p-4 app-bg-card border-t app-border">
            {cart.length > 0 ? (
              <button
                type="button"
                onClick={handleProceedToCheckout}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Tiếp tục thanh toán ({cartTotalTickets} vé - {formatCurrency(cartTotalAmount)})</span>
                <span>»</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="w-full py-3.5 rounded-xl app-bg-main border app-border app-text-sub font-extrabold text-xs flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
              >
                <span>Vui lòng chọn khu vực vé trên sơ đồ</span>
                <span>»</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Zone Quantity Selection Modal */}
      {activeZoneModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setActiveZoneModal(null)}
        >
          <div
            className="w-full max-w-md app-bg-card app-text-main rounded-3xl border app-border shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b app-border pb-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/20"
                  style={{ backgroundColor: activeZoneModal.color || "#3b82f6" }}
                />
                <h3 className="text-base font-black app-text-main">
                  Khu vực: {activeZoneModal.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveZoneModal(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center app-text-sub hover:app-text-main hover:bg-slate-500/10 transition-colors cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Price Banner */}
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-xs">
              <span className="font-extrabold app-text-sub">Giá mở bán / vé:</span>
              <span className="font-black text-blue-600 dark:text-blue-400 text-sm font-mono">
                {formatCurrency(activeZoneModal.price ?? 1000000)}
              </span>
            </div>

            {/* Quantity Selector Counter */}
            <div className="flex items-center justify-between p-4 rounded-2xl app-bg-main border app-border">
              <span className="text-xs font-extrabold app-text-main">Số lượng vé chọn mua:</span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-xl border app-border app-bg-card hover:border-blue-500 font-bold app-text-main text-base flex items-center justify-center cursor-pointer transition-colors"
                >
                  -
                </button>
                <span className="w-8 text-center font-mono font-black text-sm app-text-main">
                  {selectedQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedQuantity((q) => Math.min(10, q + 1))}
                  className="w-9 h-9 rounded-xl border border-blue-500 bg-blue-600 text-white font-bold text-base flex items-center justify-center cursor-pointer transition-transform active:scale-95 shadow-xs"
                >
                  +
                </button>
              </div>
            </div>

            {/* Total Summary */}
            <div className="flex items-center justify-between pt-2 border-t app-border text-xs font-bold">
              <span className="app-text-sub">Tổng giá trị khu vực:</span>
              <span className="text-base font-black text-blue-600 dark:text-blue-400 font-mono">
                {formatCurrency((activeZoneModal.price ?? 1000000) * selectedQuantity)}
              </span>
            </div>

            {/* Add to Cart Action Button */}
            <button
              type="button"
              onClick={handleConfirmAddZoneToCart}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <FiCheckCircle className="w-4 h-4" />
              <span>Thêm {selectedQuantity} vé vào danh sách</span>
            </button>
          </div>
        </div>
      )}

      {/* Unfinished Order Modal (Ảnh 5) */}
      {unfinishedOrder && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm app-bg-card rounded-3xl border app-border shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-black app-text-main">Đơn hàng chưa hoàn thành</h3>
            <p className="text-xs font-bold app-text-sub leading-relaxed">
              Bạn đang có đơn hàng chưa hoàn tất. Bạn có muốn tiếp tục?
            </p>

            {/* Item Bullet List */}
            <div className="py-2.5 px-4 rounded-2xl app-bg-main border app-border text-xs font-bold text-left space-y-1">
              {unfinishedOrder.cartItems && Array.isArray(unfinishedOrder.cartItems) ? (
                unfinishedOrder.cartItems.map((c: any, i: number) => (
                  <div key={i} className="app-text-main flex items-center gap-2 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span>{c.quantity} x {c.zoneName}</span>
                  </div>
                ))
              ) : (
                <div className="app-text-main flex items-center gap-2 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <span>{unfinishedOrder.quantity || 1} x {unfinishedOrder.zoneName || "Vé Sự kiện"}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => navigate(`/checkout?eventId=${unfinishedOrder.eventId || id}`)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Quay lại đơn cũ ({formatTimerMinutes(pendingTimerSeconds)})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUnfinishedOrder(null);
                  localStorage.removeItem("haloticket_pending_order");
                }}
                className="w-full py-2.5 rounded-2xl app-bg-main border app-border app-text-muted hover:app-text-main font-extrabold text-xs transition-colors cursor-pointer"
              >
                Hủy đơn, Mua vé mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
