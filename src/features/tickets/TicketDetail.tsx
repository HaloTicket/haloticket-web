import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiCalendar,
  FiMapPin,
  FiDownload,
  FiCopy,
  FiCheck,
} from "react-icons/fi";
import { formatCurrency } from "@/utils/formatters";
import { type TicketItem, downloadTicketAsImage } from "./MyTickets";
import { ticketApi } from "@/services/ticketApi";
import { eventApi } from "@/services/eventApi";

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<TicketItem | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!id) return;
    let active = true;
    setLoadError(null);
    ticketApi.getMyTicket(id).then(async (item) => {
      if (!active) return;
      const event = await eventApi.getEventById(item.eventId);
      setTicket({
        id: item.id,
        bookingCode: item.bookingCode || item.id,
        eventId: item.eventId,
        eventTitle: String(event?.title || `Sự kiện ${item.eventId}`),
        eventTime: event?.startTime ? new Date(String(event.startTime)).toLocaleString("vi-VN") : "Chưa cập nhật lịch",
        eventLocation: String(event?.locationName || event?.address || "Đang cập nhật"),
        eventPoster: String(event?.posterImage || event?.bannerUrl || ""),
        ticketTypeName: item.ticketTypeName || "Vé điện tử",
        quantity: 1,
        totalAmount: item.price || 0,
        purchaseDate: item.issuedAt || undefined,
        status: item.status === "USED" ? "ATTENDED" : ["REVOKED", "CANCELLED"].includes(item.status || "") ? "CANCELLED" : "UPCOMING",
        qrCode: item.qrCode || undefined,
      });
    }).catch(() => { if (active) setLoadError("Không thể tải vé từ hệ thống."); });
    return () => { active = false; };
  }, [id]);

  if (loadError) {
    return <div className="w-full flex-1 app-bg-page flex items-center justify-center min-h-[450px] text-rose-600">{loadError}</div>;
  }
  if (!ticket) {
    return (
      <div className="w-full flex-1 app-bg-page flex items-center justify-center min-h-[450px]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const qrCodeString = ticket.qrCode || `HALOTICKET-${ticket.bookingCode || ticket.id}`;

  const copyCode = () => {
    navigator.clipboard.writeText(qrCodeString);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="w-full flex-1 app-bg-page app-text-main font-sans selection:bg-blue-600 selection:text-white pb-20">
      {/* Top Header Bar */}
      <div className="bg-slate-950 text-white border-b border-slate-800 py-6 px-6 md:px-16 shadow-lg">
        <div className="max-w-[1240px] mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/my-tickets")}
            className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <FiArrowLeft className="w-4 h-4" />
            <span>Quay lại tủ vé</span>
          </button>

          <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black">
            ✔ ĐÃ THANH TOÁN & CẤP VÉ
          </span>
        </div>
      </div>

      {/* Main Ticket Layout */}
      <div className="max-w-4xl mx-auto px-6 mt-8 space-y-8">
        {/* Pass Card Component */}
        <div className="app-bg-card border app-border rounded-3xl overflow-hidden shadow-2xl space-y-0">
          {/* Header Banner */}
          <div className="relative h-48 md:h-56 bg-slate-900 overflow-hidden">
            {ticket.eventPoster && (
              <img
                src={ticket.eventPoster}
                alt={ticket.eventTitle}
                className="w-full h-full object-cover filter brightness-75"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white space-y-1">
              <span className="px-3 py-1 rounded-xl bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider">
                VÉ ĐIỆN TỬ CHÍNH THỨC
              </span>
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight drop-shadow-md">
                {ticket.eventTitle}
              </h1>
            </div>
          </div>

          {/* Ticket Body Content Grid */}
          <div className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left Info Column */}
            <div className="md:col-span-7 space-y-6">
              {/* Event Time & Venue */}
              <div className="space-y-3 pb-6 border-b app-border">
                <div className="space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-500">
                    Thời gian diễn ra
                  </span>
                  <p className="text-sm font-bold flex items-center gap-2 app-text-main">
                    <FiCalendar className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>{ticket.eventTime}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-indigo-500">
                    Địa điểm tổ chức
                  </span>
                  <p className="text-sm font-bold flex items-center gap-2 app-text-main">
                    <FiMapPin className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>{ticket.eventLocation}</span>
                  </p>
                </div>
              </div>

              {/* Ticket Category & Buyer Info */}
              <div className="grid grid-cols-2 gap-4 pb-6 border-b app-border text-xs">
                <div className="space-y-1">
                  <span className="app-text-sub font-bold block">Hạng vé</span>
                  <span className="font-extrabold text-blue-500 text-sm block">
                    {ticket.ticketTypeName}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="app-text-sub font-bold block">Số lượng vé</span>
                  <span className="font-extrabold app-text-main text-sm block font-mono">
                    {ticket.quantity} vé
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="app-text-sub font-bold block">Người nhận vé</span>
                  <span className="font-extrabold app-text-main block">
                    {ticket.customerName || "Trần Long Vũ"}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="app-text-sub font-bold block">Tổng tiền</span>
                  <span className="font-extrabold text-emerald-500 text-sm block font-mono">
                    {formatCurrency(ticket.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Booking Code Banner */}
              <div className="p-4 rounded-2xl app-bg-main border app-border space-y-1">
                <span className="text-[11px] font-extrabold app-text-sub block">MÃ ĐƠN HÀNG:</span>
                <span className="font-mono font-black text-base text-blue-600 dark:text-blue-400">
                  {ticket.bookingCode}
                </span>
              </div>
            </div>

            {/* Right Column: QR Code Display Card */}
            <div className="md:col-span-5 flex flex-col items-center justify-center space-y-4 p-6 rounded-3xl app-bg-main border app-border text-center">
              <div className="w-56 h-56 bg-white rounded-2xl p-3 shadow-xl border border-slate-200 flex items-center justify-center overflow-hidden">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                    qrCodeString
                  )}`}
                  alt="QR Code Check-in"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-black uppercase text-blue-500">MÃ CHUYÊN CHECK-IN VÀO CỔNG</p>
                <div className="flex items-center justify-center gap-2 font-mono text-xs font-bold app-text-main">
                  <span>{qrCodeString}</span>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="p-1 rounded hover:bg-blue-500/10 text-blue-600 cursor-pointer"
                  >
                    {copiedCode ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => downloadTicketAsImage(ticket)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-lg shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <FiDownload className="w-4 h-4" />
                <span>Xuất Vé Dạng Hình Ảnh (.PNG)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
