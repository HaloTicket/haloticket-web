import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiPlus, FiMinus, FiRotateCcw, FiCalendar, FiMapPin, FiX } from "react-icons/fi";
import { eventApi } from "@/services/eventApi";
import { ticketApi } from "@/services/ticketApi";
import type { SeatMapDocument, ZoneBlock, SeatTier } from "@/types/seating";
import { PRESET_TEMPLATES } from "@/mock/presetTemplates";
import { formatCurrency } from "@/utils/formatters";

export default function SelectTicket() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [eventData, setEventData] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<SeatTier[]>([]);
  const [seatMap, setSeatMap] = useState<SeatMapDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // zoom & pan state for canvas
  const [zoomLevel, setZoomLevel] = useState(1);

  // selected zone for modal
  const [activeZoneModal, setActiveZoneModal] = useState<ZoneBlock | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(0);

  // selected cart items state
  const [selectedTicketInfo, setSelectedTicketInfo] = useState<{
    zoneId?: string;
    zoneName?: string;
    tierId?: string;
    tierName: string;
    price: number;
    quantity: number;
  } | null>(null);

  // fetch event details, ticket types, and seat map
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (!id) return;
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        // fetch event detail
        const ev = await eventApi.getEventById(id!);
        if (isMounted && ev) {
          setEventData(ev);
        }

        // fetch ticket types
        const types = await ticketApi.getTicketTypesByEventId(id!);
        if (isMounted && types && types.length > 0) {
          const colors = ["#b45309", "#047857", "#c2410c", "#0284c7", "#1d4ed8", "#be185d", "#475569"];
          const mappedTiers: SeatTier[] = types.map((t, idx) => ({
            id: t.id,
            name: t.name,
            price: t.price || 0,
            color: colors[idx % colors.length],
            description: t.description || undefined,
          }));
          setTicketTypes(mappedTiers);
        }

        // fetch seat layout
        const layoutData = await ticketApi.getSeatLayoutByEventId(id!);
        if (isMounted && layoutData && layoutData.draftJson) {
          try {
            const parsed = JSON.parse(layoutData.draftJson) as SeatMapDocument;
            setSeatMap(parsed);
          } catch {
            // fallback
          }
        } else if (isMounted) {
          // check fallback preset if ID matches sample
          const sample = PRESET_TEMPLATES[0];
          setSeatMap(sample as unknown as SeatMapDocument);
        }
      } catch (err) {
        console.warn("Failed loading ticket selection data:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // combined tiers & zones
  const zonesList = useMemo(() => {
    if (!seatMap || !seatMap.zones) return [];
    return Object.values(seatMap.zones);
  }, [seatMap]);

  // effective price legend
  const priceLegend = useMemo(() => {
    if (zonesList.length > 0) {
      return zonesList.map((z, idx) => {
        const tier = ticketTypes.find((t) => t.id === z.tierId);
        const price = z.price ?? tier?.price ?? 1000000 + (idx % 4) * 500000;
        const colors = ["#b45309", "#047857", "#c2410c", "#0284c7", "#1d4ed8", "#be185d", "#475569"];
        const color = z.color || tier?.color || colors[idx % colors.length];
        return {
          id: z.id,
          name: z.name,
          price,
          color,
          tierId: z.tierId,
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
      }));
    }

    // mock tiers matching TicketBox screenshot
    return [
      { id: "z1", name: "Bạch Mã 1 (Standing)", price: 4000000, color: "#d97706" },
      { id: "z2", name: "Bạch Mã 2 (Standing)", price: 4000000, color: "#b45309" },
      { id: "z3", name: "Hắc Mã 1 (Standing)", price: 4000000, color: "#047857" },
      { id: "z4", name: "Hắc Mã 2 (Standing)", price: 4000000, color: "#065f46" },
      { id: "z5", name: "Hoả Tầm 1 (Standing)", price: 3000000, color: "#ea580c" },
      { id: "z6", name: "Hoả Tầm 2 (Standing)", price: 3000000, color: "#c2410c" },
      { id: "z7", name: "Hoả Lệnh 1 (Standing)", price: 2000000, color: "#f97316" },
      { id: "z8", name: "Hoả Lệnh 2 (Standing)", price: 2000000, color: "#e11d48" },
      { id: "z9", name: "Chiến Tướng 1 (Standing)", price: 1500000, color: "#0891b2" },
      { id: "z10", name: "Chiến Tướng 2 (Standing)", price: 1500000, color: "#0284c7" },
      { id: "z11", name: "Kỵ Sĩ 1 (Standing)", price: 1000000, color: "#1e3a8a" },
      { id: "z12", name: "Kỵ Sĩ 2 (Standing)", price: 1000000, color: "#312e81" },
    ];
  }, [zonesList, ticketTypes]);

  // handle opening zone modal
  const handleZoneClick = (zone: any) => {
    const tier = ticketTypes.find((t) => t.id === zone.tierId);
    const price = zone.price ?? tier?.price ?? priceLegend.find((p) => p.name === zone.name)?.price ?? 2000000;
    const currentQty = selectedTicketInfo?.zoneId === zone.id ? selectedTicketInfo.quantity : 1;

    setActiveZoneModal({
      ...zone,
      price,
    });
    setSelectedQuantity(currentQty);
  };

  // confirm zone selection & proceed to checkout
  const handleConfirmSelection = () => {
    if (!activeZoneModal || selectedQuantity <= 0) return;

    const tier = ticketTypes.find((t) => t.id === activeZoneModal.tierId);
    const price = activeZoneModal.price ?? tier?.price ?? 2000000;

    const bookingPayload = {
      eventId: id,
      eventTitle: eventData?.title || "[CONCERT] ANH TRAI VƯỢT NGÀN CHÔNG GAI 2026",
      eventTime: eventData?.startTime ? new Date(eventData.startTime).toLocaleString("vi-VN") : "19:00 - 23:59, 18 Tháng 10, 2026",
      eventLocation: eventData?.locationName || "KĐT Phú Long - Bình Trưng Và The Global City",
      zoneId: activeZoneModal.id,
      zoneName: activeZoneModal.name,
      ticketTypeName: `${activeZoneModal.name} (Standing)`,
      price,
      quantity: selectedQuantity,
      totalAmount: price * selectedQuantity,
    };

    localStorage.setItem("haloticket_pending_order", JSON.stringify(bookingPayload));
    navigate(`/checkout?eventId=${id}&zoneId=${activeZoneModal.id}&qty=${selectedQuantity}`);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      setZoomLevel((prev) => Math.min(2.5, Math.round((prev + 0.15) * 100) / 100));
    } else {
      setZoomLevel((prev) => Math.max(0.5, Math.round((prev - 0.15) * 100) / 100));
    }
  };

  const currentTotal = (selectedTicketInfo?.price || (activeZoneModal?.price ?? 0)) * (selectedTicketInfo?.quantity || selectedQuantity);

  if (isLoading) {
    return (
      <div className="w-full flex-1 app-bg-page app-text-main flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold app-text-sub">Đang tải sơ đồ chọn vé...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col font-sans app-bg-page select-none overflow-hidden">
      {/* Sub-Header Bar */}
      <div className="h-14 px-6 md:px-12 app-bg-card backdrop-blur-md border-b app-border flex items-center justify-between z-20 shrink-0">
        <button
          type="button"
          onClick={() => navigate(`/events/${id}`)}
          className="flex items-center gap-2 app-text-brand hover:underline font-extrabold text-xs md:text-sm transition-colors cursor-pointer"
        >
          <FiArrowLeft className="w-4 h-4" />
          <span>Trở về chi tiết sự kiện</span>
        </button>

        <div className="text-center">
          <h2 className="text-xs md:text-sm font-extrabold app-text-main">Bước 1: Chọn khu vực vé</h2>
          <p className="text-[11px] app-text-sub hidden sm:block">Nhấp chọn khu vực hoặc cuộn chuột để phóng to / thu nhỏ</p>
        </div>

        <div className="text-right text-xs font-bold app-text-sub hidden sm:block">
          Sơ đồ khu vực
        </div>
      </div>

      {/* Main Selection Area */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* Left Interactive Canvas Area (Supports Mouse Wheel Zoom) */}
        <div
          className="flex-1 relative app-bg-page flex items-center justify-center p-4 overflow-auto min-h-[500px]"
          onWheel={handleWheel}
        >
          {/* Top-Left Zoom Controls */}
          <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
              className="w-10 h-10 rounded-xl app-bg-card border app-border app-text-main hover:border-brand-primary flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-105 active:scale-95"
              title="Phóng to"
            >
              <FiPlus className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="w-10 h-10 rounded-xl app-bg-card border app-border app-text-main hover:border-brand-primary flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-105 active:scale-95"
              title="Đặt lại góc nhìn"
            >
              <FiRotateCcw className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
              className="w-10 h-10 rounded-xl app-bg-card border app-border app-text-main hover:border-brand-primary flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-105 active:scale-95"
              title="Thu nhỏ"
            >
              <FiMinus className="w-5 h-5" />
            </button>
          </div>

          {/* Interactive Seat Map Container */}
          <div
            className="transition-transform duration-200 ease-out origin-center flex items-center justify-center"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <svg
              viewBox="0 0 1000 700"
              className="w-[850px] h-[580px] drop-shadow-2xl"
            >
              {/* Stage Logo & Center Icon */}
              <g transform="translate(420, 20)">
                <polygon
                  points="30,0 130,0 160,80 130,160 30,160 0,80"
                  fill="#1e293b"
                  stroke="#475569"
                  strokeWidth="3"
                />
                <text x="80" y="90" fill="#94a3b8" fontSize="28" fontWeight="bold" textAnchor="middle">M</text>
              </g>

              {/* Sample Zones */}
              <g onClick={() => handleZoneClick({ id: "z_cui_lua_1", name: "CỦI LỬA 1", price: 1000000, color: "#64748b" })} className="cursor-pointer hover:opacity-80 transition-opacity">
                <rect x="140" y="270" width="35" height="130" fill="#cbd5e1" stroke="#334155" strokeWidth="2" rx="4" transform="rotate(12 140 270)" />
                <text x="148" y="340" fill="#0f172a" fontSize="10" fontWeight="bold" transform="rotate(102 148 340)">CỦI LỬA 1</text>
              </g>

              <g onClick={() => handleZoneClick({ id: "z_dien_anh_1", name: "ĐIỆN ẢNH 1", price: 1000000, color: "#94a3b8" })} className="cursor-pointer hover:opacity-80 transition-opacity">
                <rect x="180" y="260" width="35" height="130" fill="#e2e8f0" stroke="#334155" strokeWidth="2" rx="4" transform="rotate(12 180 260)" />
                <text x="188" y="330" fill="#0f172a" fontSize="10" fontWeight="bold" transform="rotate(102 188 330)">ĐIỆN ẢNH 1</text>
              </g>

              <g onClick={() => handleZoneClick({ id: "z_ky_si_1", name: "KỲ SĨ 1", price: 1000000, color: "#3b82f6" })} className="cursor-pointer hover:opacity-80 transition-opacity">
                <polygon points="220,240 255,240 260,390 225,390" fill="#e2e8f0" stroke="#334155" strokeWidth="2" />
                <text x="238" y="315" fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle">KỲ SĨ 1</text>
              </g>

              <g onClick={() => handleZoneClick({ id: "z_chien_tuong_1", name: "CHIẾN TƯỚNG 1", price: 1500000, color: "#0891b2" })} className="cursor-pointer hover:opacity-80 transition-opacity">
                <polygon points="257,235 285,235 285,390 262,390" fill="#0891b2" stroke="#0e7490" strokeWidth="2" />
                <text x="272" y="315" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle" writingMode="tb">CHIẾN TƯỚNG 1</text>
              </g>

              <g onClick={() => handleZoneClick({ id: "z_hoa_lenh_1", name: "HOẢ LỆNH 1", price: 2000000, color: "#f97316" })} className="cursor-pointer hover:opacity-80 transition-opacity">
                <polygon points="287,235 325,235 325,390 287,390" fill="#475569" stroke="#334155" strokeWidth="2" />
                <text x="306" y="315" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle" writingMode="tb">HOẢ LỆNH 1</text>
              </g>

              <g onClick={() => handleZoneClick({ id: "z_hoa_tam_1", name: "HOẢ TẦM 1", price: 3000000, color: "#ea580c" })} className="cursor-pointer hover:opacity-80 transition-opacity">
                <polygon points="328,290 368,340 368,430 328,430" fill="#ea580c" stroke="#c2410c" strokeWidth="2" />
                <text x="345" y="370" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle" writingMode="tb">HOẢ TẦM 1</text>
              </g>

              <g onClick={() => handleZoneClick({ id: "z_hoa_tam_2", name: "HOẢ TẦM 2", price: 3000000, color: "#ea580c" })} className="cursor-pointer hover:opacity-80 transition-opacity">
                <polygon points="372,340 412,290 412,430 372,430" fill="#ea580c" stroke="#c2410c" strokeWidth="2" />
                <text x="390" y="370" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle" writingMode="tb">HOẢ TẦM 2</text>
              </g>

              <g onClick={() => handleZoneClick({ id: "z_hoa_lenh_2", name: "HOẢ LỆNH 2", price: 2000000, color: "#f97316" })} className="cursor-pointer hover:opacity-80 transition-opacity">
                <polygon points="415,235 453,235 453,390 415,390" fill="#f97316" stroke="#c2410c" strokeWidth="2" />
                <text x="434" y="315" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle" writingMode="tb">HOẢ LỆNH 2</text>
              </g>

              <g onClick={() => handleZoneClick({ id: "z_chien_tuong_2", name: "CHIẾN TƯỚNG 2", price: 1500000, color: "#0891b2" })} className="cursor-pointer hover:opacity-80 transition-opacity">
                <polygon points="455,235 483,235 478,390 455,390" fill="#0891b2" stroke="#0e7490" strokeWidth="2" />
                <text x="468" y="315" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle" writingMode="tb">CHIẾN TƯỚNG 2</text>
              </g>

              <g onClick={() => handleZoneClick({ id: "z_ky_si_2", name: "KỲ SĨ 2", price: 1000000, color: "#3b82f6" })} className="cursor-pointer hover:opacity-80 transition-opacity">
                <polygon points="485,240 520,240 515,390 480,390" fill="#e2e8f0" stroke="#334155" strokeWidth="2" />
                <text x="500" y="315" fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle">KỲ SĨ 2</text>
              </g>

              <g onClick={() => handleZoneClick({ id: "z_my_nam_1", name: "MỸ NAM 1", price: 1500000, color: "#0369a1" })} className="cursor-pointer hover:opacity-80 transition-opacity">
                <rect x="145" y="470" width="70" height="150" fill="#0369a1" stroke="#075985" strokeWidth="2" rx="6" transform="rotate(-32 145 470)" />
                <text x="175" y="540" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle" transform="rotate(-32 175 540)">MỸ NAM 1</text>
              </g>

              <g onClick={() => handleZoneClick({ id: "z_my_nam_2", name: "MỸ NAM 2", price: 1500000, color: "#0369a1" })} className="cursor-pointer hover:opacity-80 transition-opacity">
                <rect x="525" y="430" width="70" height="150" fill="#0369a1" stroke="#075985" strokeWidth="2" rx="6" transform="rotate(32 525 430)" />
                <text x="560" y="500" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle" transform="rotate(32 560 500)">MỸ NAM 2</text>
              </g>

              <g onClick={() => handleZoneClick({ id: "z_svip_1", name: "S-VIP 1", price: 5000000, color: "#e2e8f0" })} className="cursor-pointer hover:opacity-80 transition-opacity">
                <rect x="280" y="510" width="90" height="25" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" rx="2" />
                <text x="325" y="527" fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle">S-VIP 1</text>
              </g>
              <g onClick={() => handleZoneClick({ id: "z_svip_2", name: "S-VIP 2", price: 5000000, color: "#e2e8f0" })} className="cursor-pointer hover:opacity-80 transition-opacity">
                <rect x="372" y="510" width="90" height="25" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" rx="2" />
                <text x="417" y="527" fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle">S-VIP 2</text>
              </g>

              <g onClick={() => handleZoneClick({ id: "z_vinh_quy_1", name: "VINH QUY 1", price: 3500000, color: "#581c87" })} className="cursor-pointer hover:opacity-80 transition-opacity">
                <rect x="280" y="540" width="90" height="50" fill="#581c87" stroke="#3b0764" strokeWidth="2" rx="3" />
                <text x="325" y="570" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">VINH QUY 1</text>
              </g>
              <g onClick={() => handleZoneClick({ id: "z_vinh_quy_2", name: "VINH QUY 2", price: 3500000, color: "#581c87" })} className="cursor-pointer hover:opacity-80 transition-opacity">
                <rect x="372" y="540" width="90" height="50" fill="#581c87" stroke="#3b0764" strokeWidth="2" rx="3" />
                <text x="417" y="570" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">VINH QUY 2</text>
              </g>

              <g onClick={() => handleZoneClick({ id: "z_soan_nhac_1", name: "SOẠN NHẠC 1", price: 2500000, color: "#0284c7" })} className="cursor-pointer hover:opacity-80 transition-opacity">
                <rect x="255" y="595" width="115" height="40" fill="#0284c7" stroke="#0369a1" strokeWidth="2" rx="3" />
                <text x="312" y="620" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">SOẠN NHẠC 1</text>
              </g>
              <g onClick={() => handleZoneClick({ id: "z_soan_nhac_2", name: "SOẠN NHẠC 2", price: 2500000, color: "#0284c7" })} className="cursor-pointer hover:opacity-80 transition-opacity">
                <rect x="372" y="595" width="115" height="40" fill="#0284c7" stroke="#0369a1" strokeWidth="2" rx="3" />
                <text x="430" y="620" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">SOẠN NHẠC 2</text>
              </g>

              <g onClick={() => handleZoneClick({ id: "z_lam_manh_1", name: "LÀM MẠNH 1", price: 1800000, color: "#2563eb" })} className="cursor-pointer hover:opacity-80 transition-opacity">
                <rect x="255" y="640" width="115" height="40" fill="#2563eb" stroke="#1d4ed8" strokeWidth="2" rx="3" />
                <text x="312" y="665" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">LÀM MẠNH 1</text>
              </g>
              <g onClick={() => handleZoneClick({ id: "z_lam_manh_2", name: "LÀM MẠNH 2", price: 1800000, color: "#2563eb" })} className="cursor-pointer hover:opacity-80 transition-opacity">
                <rect x="372" y="640" width="115" height="40" fill="#2563eb" stroke="#1d4ed8" strokeWidth="2" rx="3" />
                <text x="430" y="665" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">LÀM MẠNH 2</text>
              </g>
            </svg>
          </div>
        </div>

        {/* Right Event & Ticket Prices Sidebar */}
        <div className="w-full lg:w-[380px] app-bg-card border-t lg:border-t-0 lg:border-l app-border flex flex-col justify-between z-20 shrink-0">
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
            {/* Event Header Info */}
            <div className="space-y-3">
              <h1 className="text-base font-extrabold app-text-main leading-snug uppercase tracking-tight">
                {eventData?.title || "[CONCERT] ANH TRAI VƯỢT NGÀN CHÔNG GAI 2026 - DAY 1 & DAY 2"}
              </h1>

              <div className="space-y-2 text-xs app-text-sub">
                <div className="flex items-center gap-2">
                  <FiCalendar className="w-4 h-4 app-text-brand shrink-0" />
                  <span>{eventData?.datesSummary || "19:00 - 23:59, 18 Tháng 10, 2026"}</span>
                </div>
                <div className="flex items-start gap-2">
                  <FiMapPin className="w-4 h-4 app-text-brand shrink-0 mt-0.5" />
                  <span className="leading-snug">{eventData?.locationName || "KĐT Phú Long - Bình Trưng Và The Global City"}</span>
                </div>
              </div>
            </div>

            {/* Ticket Prices List Header */}
            <div className="pt-4 border-t app-border">
              <h3 className="text-xs font-bold app-text-sub uppercase tracking-wider mb-4">Bảng giá vé</h3>

              <div className="space-y-2 font-mono">
                {priceLegend.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleZoneClick({ id: item.id, name: item.name, price: item.price, color: item.color, tierId: item.tierId })}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:app-bg-page cursor-pointer transition-colors border border-transparent hover:app-border"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <span
                        className="w-8 h-5 rounded-md shrink-0 border border-black/10 shadow-xs"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs font-bold app-text-main truncate">{item.name}</span>
                    </div>
                    <span className="text-xs font-extrabold app-text-brand shrink-0">
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Action Footer Button */}
          <div className="p-4 app-bg-card border-t app-border">
            {selectedTicketInfo && selectedTicketInfo.quantity > 0 ? (
              <button
                type="button"
                onClick={() => {
                  const bookingPayload = {
                    eventId: id,
                    eventTitle: eventData?.title || "[CONCERT] ANH TRAI VƯỢT NGÀN CHÔNG GAI 2026",
                    eventTime: eventData?.datesSummary || "19:00 - 23:59, 18 Tháng 10, 2026",
                    eventLocation: eventData?.locationName || "KĐT Phú Long - Bình Trưng Và The Global City",
                    zoneId: selectedTicketInfo.zoneId,
                    zoneName: selectedTicketInfo.zoneName,
                    ticketTypeName: selectedTicketInfo.tierName,
                    price: selectedTicketInfo.price,
                    quantity: selectedTicketInfo.quantity,
                    totalAmount: selectedTicketInfo.price * selectedTicketInfo.quantity,
                  };
                  localStorage.setItem("haloticket_pending_order", JSON.stringify(bookingPayload));
                  navigate(`/checkout?eventId=${id}&qty=${selectedTicketInfo.quantity}`);
                }}
                className="w-full py-3.5 rounded-xl gradient-btn text-white font-extrabold text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Tiếp tục - {formatCurrency(currentTotal)}</span>
                <span>»</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="w-full py-3.5 rounded-xl app-bg-page border app-border app-text-sub font-extrabold text-sm flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
              >
                <span>Vui lòng chọn vé</span>
                <span>»</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Zone Selection Centered Modal */}
      {activeZoneModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveZoneModal(null)}
        >
          <div
            className="w-full max-w-md app-bg-card app-text-main rounded-2xl border app-border shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b app-border pb-3">
              <h3 className="text-lg font-black app-text-main">Khu {activeZoneModal.name}</h3>
              <button
                type="button"
                onClick={() => setActiveZoneModal(null)}
                className="p-1 rounded-full app-text-sub hover:app-text-main hover:app-bg-page transition-colors cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Note */}
            <p className="text-xs font-bold text-amber-500 text-center">
              Lưu ý: Bạn chỉ có thể chọn vé trong 1 khu vực
            </p>

            {/* Ticket Quantity Row */}
            <div className="flex items-center justify-between p-3.5 rounded-xl app-bg-page border app-border">
              <span className="text-sm font-extrabold app-text-brand">
                {activeZoneModal.name} (Standing)
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedQuantity((q) => Math.max(0, q - 1))}
                  className="w-9 h-9 rounded-lg border app-border app-bg-card hover:border-brand-primary font-bold app-text-main text-lg flex items-center justify-center transition-colors cursor-pointer"
                >
                  -
                </button>
                <span className="w-8 text-center font-mono font-extrabold text-base app-text-main">
                  {selectedQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedQuantity((q) => Math.min(10, q + 1))}
                  className="w-9 h-9 rounded-lg border border-brand-primary app-bg-card font-bold app-text-brand text-lg flex items-center justify-center transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Change Zone Link */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setActiveZoneModal(null)}
                className="text-xs font-extrabold app-text-brand hover:underline cursor-pointer"
              >
                Chọn khu vực khác
              </button>
            </div>

            {/* Action Submit Button */}
            {selectedQuantity > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedTicketInfo({
                    zoneId: activeZoneModal.id,
                    zoneName: activeZoneModal.name,
                    tierName: `${activeZoneModal.name} (Standing)`,
                    price: activeZoneModal.price ?? 2000000,
                    quantity: selectedQuantity,
                  });
                  handleConfirmSelection();
                }}
                className="w-full py-3.5 rounded-xl gradient-btn text-white font-extrabold text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Tiếp tục - {formatCurrency((activeZoneModal.price ?? 2000000) * selectedQuantity)}</span>
                <span>»</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="w-full py-3.5 rounded-xl app-bg-page border app-border app-text-sub font-extrabold text-sm flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
              >
                <span>Vui lòng chọn vé</span>
                <span>»</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
