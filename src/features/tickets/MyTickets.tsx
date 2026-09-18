import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FiCalendar,
  FiMapPin,
  FiDownload,
  FiSearch,
  FiArrowRight,
  FiCopy,
  FiCheck,
  FiX,
  FiTag,
} from "react-icons/fi";

function QrCodeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m0 14v1m8-8h-1M5 12H4m12 0a4 4 0 11-8 0 4 4 0 018 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6h2v2H6V6zm0 10h2v2H6v-2zm10-10h2v2h-2V6zm-4 4h.01M16 16h.01" />
    </svg>
  );
}
import { formatCurrency } from "@/utils/formatters";

export interface TicketItem {
  id: string;
  bookingCode: string;
  eventId?: string;
  eventTitle: string;
  eventTime: string;
  eventLocation: string;
  eventPoster?: string | null;
  ticketTypeName: string;
  quantity: number;
  totalAmount: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  paymentMethod?: string;
  purchaseDate?: string;
  status?: "UPCOMING" | "ATTENDED" | "CANCELLED" | string;
  qrCode?: string;
}

const SAMPLE_TICKETS: TicketItem[] = [
  {
    id: "booking-demo-001",
    bookingCode: "HT-849201",
    eventId: "e1",
    eventTitle: "GRAND CONCERT - HALOTICKET LIVE 2026",
    eventTime: "19:30 - 23:30, 20/10/2026",
    eventLocation: "Sân vận động Quốc gia Mỹ Đình, Hà Nội",
    eventPoster: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
    ticketTypeName: "Vé VIP (Standing)",
    quantity: 2,
    totalAmount: 4000000,
    customerName: "Trần Long Vũ",
    customerPhone: "0915020803",
    customerEmail: "vutkd23405@gmail.com",
    paymentMethod: "SEPAY (VietQR 24/7)",
    purchaseDate: "2026-09-17T16:00:00.000Z",
    status: "UPCOMING",
    qrCode: "HALOTICKET-HT-849201",
  },
  {
    id: "booking-demo-002",
    bookingCode: "HT-629104",
    eventId: "e2",
    eventTitle: "NHẠC HỘI MÙA HÈ - SUMMER MUSIC FEST",
    eventTime: "18:00 - 22:00, 15/08/2026",
    eventLocation: "Nhà thi đấu Phú Thọ, TP. Hồ Chí Minh",
    eventPoster: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
    ticketTypeName: "Khán đài A (Nồi ngồi)",
    quantity: 1,
    totalAmount: 1200000,
    customerName: "Trần Long Vũ",
    customerPhone: "0915020803",
    customerEmail: "vutkd23405@gmail.com",
    paymentMethod: "VNPAY",
    purchaseDate: "2026-08-10T14:30:00.000Z",
    status: "ATTENDED",
    qrCode: "HALOTICKET-HT-629104",
  },
];

// canvas image export helper function
export function downloadTicketAsImage(ticket: TicketItem) {
  const canvas = document.createElement("canvas");
  canvas.width = 1050;
  canvas.height = 580;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // background gradient
  const gradient = ctx.createLinearGradient(0, 0, 1050, 580);
  gradient.addColorStop(0, "#090d16");
  gradient.addColorStop(0.5, "#1e293b");
  gradient.addColorStop(1, "#0f172a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1050, 580);

  // outer border & glow frame
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, 1026, 556);

  // header brand tag
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(45, 45, 150, 38);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("HALOTICKET", 60, 70);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("VÉ ĐIỆN TỬ CHÍNH THỨC • OFFICIAL E-TICKET PASS", 215, 70);

  // horizontal divider line
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(45, 100);
  ctx.lineTo(1005, 100);
  ctx.stroke();

  // event title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px sans-serif";
  const titleText = (ticket.eventTitle || "SỰ KIỆN HALOTICKET").toUpperCase();
  ctx.fillText(titleText.length > 45 ? titleText.substring(0, 42) + "..." : titleText, 45, 145);

  // event details
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "15px sans-serif";
  ctx.fillText(`Thời gian:  ${ticket.eventTime}`, 45, 185);
  ctx.fillText(`Địa điểm:  ${ticket.eventLocation}`, 45, 220);

  // section divider line
  ctx.strokeStyle = "#334155";
  ctx.beginPath();
  ctx.moveTo(45, 245);
  ctx.lineTo(690, 245);
  ctx.stroke();

  // attendee & ticket info
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("HỌ VÀ TÊN NGƯỜI NHẬN VÉ", 45, 275);
  ctx.fillText("HẠNG VÉ & SỐ LƯỢNG", 370, 275);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(ticket.customerName || "Khách hàng HaloTicket", 45, 305);
  ctx.fillText(`${ticket.quantity || 1}x ${ticket.ticketTypeName}`, 370, 305);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "14px sans-serif";
  ctx.fillText(`Số điện thoại: ${ticket.customerPhone || "0915020803"}`, 45, 335);
  ctx.fillText(`Mã vé: ${ticket.bookingCode || ticket.id}`, 370, 335);

  // payment status banner
  ctx.fillStyle = "#10b981";
  ctx.font = "bold 18px sans-serif";
  const priceText = formatCurrency(ticket.totalAmount || 0);
  ctx.fillText(`ĐÃ THANH TOÁN (${priceText})`, 45, 395);

  // check-in code box
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(45, 435, 645, 65);
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(45, 435, 645, 65);

  ctx.fillStyle = "#60a5fa";
  ctx.font = "bold 16px monospace";
  const qrString = ticket.qrCode || `HALOTICKET-${ticket.bookingCode || ticket.id}`;
  ctx.fillText(`MÃ CHECK-IN: ${qrString}`, 65, 474);

  // vertical divider before qr code
  ctx.strokeStyle = "#334155";
  ctx.beginPath();
  ctx.moveTo(715, 115);
  ctx.lineTo(715, 520);
  ctx.stroke();

  // draw qr code image on canvas
  const qrImg = new Image();
  qrImg.crossOrigin = "Anonymous";
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrString)}`;
  qrImg.src = qrApiUrl;

  const triggerDownload = () => {
    const link = document.createElement("a");
    link.download = `Ve_HaloTicket_${ticket.bookingCode || ticket.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  qrImg.onload = () => {
    // white background card for QR code
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(740, 140, 245, 245);
    ctx.drawImage(qrImg, 752, 152, 221, 221);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("QUÉT MÃ ĐỂ VÀO CỔNG", 760, 420);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px sans-serif";
    ctx.fillText("Xuất vé từ HaloTicket.vn", 760, 445);

    triggerDownload();
  };

  // fallback if image load takes time
  setTimeout(() => {
    if (!qrImg.complete) {
      triggerDownload();
    }
  }, 1000);
}

interface MyTicketsProps {
  embedded?: boolean;
}

export default function MyTickets({ embedded = false }: MyTicketsProps) {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [activeTab, setActiveTab] = useState<"ALL" | "UPCOMING" | "ATTENDED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // qr modal state
  const [selectedQrTicket, setSelectedQrTicket] = useState<TicketItem | null>(null);
  const [copiedQrCode, setCopiedQrCode] = useState(false);

  useEffect(() => {
    if (!embedded) {
      window.scrollTo(0, 0);
    }

    // load tickets from localStorage or fallback to sample tickets
    try {
      const saved = localStorage.getItem("haloticket_my_tickets");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTickets(parsed);
          return;
        }
      }
    } catch {
      // fallback below
    }
    setTickets(SAMPLE_TICKETS);
  }, [embedded]);

  const filteredTickets = tickets.filter((t) => {
    const matchesTab =
      activeTab === "ALL"
        ? true
        : activeTab === "UPCOMING"
        ? t.status !== "ATTENDED" && t.status !== "CANCELLED"
        : t.status === "ATTENDED";

    const matchesSearch =
      t.eventTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.bookingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ticketTypeName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const copyQrCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedQrCode(true);
    setTimeout(() => setCopiedQrCode(false), 2000);
  };

  return (
    <div className={`w-full font-sans selection:bg-blue-600 selection:text-white ${embedded ? "" : "flex-1 app-bg-page app-text-main pb-20"}`}>
      {/* Top Hero Banner (Only when NOT embedded) */}
      {!embedded && (
        <div className="bg-slate-950 text-white border-b border-slate-800 py-10 px-6 md:px-16 relative overflow-hidden shadow-xl">
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-[1240px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <span className="px-3.5 py-1 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-wider shadow-sm">
                TỦ VÉ ĐIỆN TỬ
              </span>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white drop-shadow-md">
                Vé Của Tôi
              </h1>
              <p className="text-xs md:text-sm text-slate-400 font-medium">
                Quản lý danh sách vé đã mua, xem mã QR check-in và xuất hình ảnh vé lưu trữ.
              </p>
            </div>

            {/* Search Input Box */}
            <div className="relative min-w-[260px] md:min-w-[320px]">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên sự kiện, mã vé..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white text-xs font-bold placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-inner"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className={embedded ? "space-y-6" : "max-w-[1240px] mx-auto px-6 md:px-16 mt-8 space-y-6"}>
        {/* Header & Controls in Embedded Mode */}
        {embedded && (
          <div className="rounded-2xl app-bg-card border app-border p-5 shadow-sm sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b app-border pb-5">
              <div>
                <h3 className="text-xl font-bold app-text-main">Vé của tôi</h3>
                <p className="text-xs sm:text-sm app-text-muted mt-1">
                  Danh sách vé điện tử đã mua, xem mã QR check-in và xuất hình ảnh vé.
                </p>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-72 shrink-0">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm tên sự kiện, mã vé..."
                  className="w-full pl-10 pr-4 py-2 text-xs app-bg-subnav app-text-main border app-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Navigation Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveTab("ALL")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "ALL"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "app-bg-subnav border app-border app-text-main hover:bg-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                Tất cả ({tickets.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("UPCOMING")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "UPCOMING"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "app-bg-subnav border app-border app-text-main hover:bg-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                Sắp diễn ra ({tickets.filter((t) => t.status !== "ATTENDED" && t.status !== "CANCELLED").length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ATTENDED")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "ATTENDED"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "app-bg-subnav border app-border app-text-main hover:bg-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                Đã tham gia ({tickets.filter((t) => t.status === "ATTENDED").length})
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs in Standalone Mode */}
        {!embedded && (
          <div className="flex items-center gap-2 border-b app-border pb-3 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "ALL"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "app-bg-card border app-border app-text-sub hover:app-text-main"
              }`}
            >
              Tất cả vé ({tickets.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("UPCOMING")}
              className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "UPCOMING"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "app-bg-card border app-border app-text-sub hover:app-text-main"
              }`}
            >
              Sắp diễn ra (
              {tickets.filter((t) => t.status !== "ATTENDED" && t.status !== "CANCELLED").length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ATTENDED")}
              className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "ATTENDED"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "app-bg-card border app-border app-text-sub hover:app-text-main"
              }`}
            >
              Đã tham gia ({tickets.filter((t) => t.status === "ATTENDED").length})
            </button>
          </div>
        )}

        {/* Ticket List Cards Grid */}
        {filteredTickets.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="relative app-bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row group"
              >
                {/* Left Side: Compact Event Poster Image & Status Tag */}
                <div className="relative md:w-40 shrink-0 h-32 md:h-auto bg-slate-900 overflow-hidden">
                  {ticket.eventPoster ? (
                    <img
                      src={ticket.eventPoster}
                      alt={ticket.eventTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 flex items-center justify-center p-3 text-center text-white">
                      <FiTag className="w-8 h-8 text-blue-400 opacity-60" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent md:hidden" />

                  {/* Status Badge */}
                  <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-md backdrop-blur-md bg-emerald-500/90 text-white">
                    {ticket.status === "ATTENDED" ? "Đã Check-in" : "Đã Thanh Toán"}
                  </span>
                </div>

                {/* Perforated Vertical Dashed Line Divider + Top & Bottom Semicircular Cutouts (Between Poster & Main Content) */}
                <div className="hidden md:flex relative flex-col justify-between items-center w-0 border-r-2 border-dashed border-slate-300 dark:border-slate-700 my-1">
                  {/* Top Notch Cutout */}
                  <div className="absolute -top-3.5 -left-[14px] w-7 h-7 rounded-full app-bg-page border app-border z-10" />
                  {/* Bottom Notch Cutout */}
                  <div className="absolute -bottom-3.5 -left-[14px] w-7 h-7 rounded-full app-bg-page border app-border z-10" />
                </div>

                {/* Mobile Perforated Horizontal Line */}
                <div className="md:hidden relative border-t-2 border-dashed border-slate-300 dark:border-slate-700 my-1 mx-4">
                  <div className="absolute -left-7 -top-[14px] w-7 h-7 rounded-full app-bg-page border app-border z-10" />
                  <div className="absolute -right-7 -top-[14px] w-7 h-7 rounded-full app-bg-page border app-border z-10" />
                </div>

                {/* Center Content Section */}
                <div className="p-3.5 md:p-4 flex-1 flex flex-col justify-between min-w-0">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                        Mã vé: {ticket.bookingCode}
                      </span>
                      <span className="text-[11px] font-mono app-text-muted">
                        {new Date(ticket.purchaseDate || Date.now()).toLocaleDateString("vi-VN")}
                      </span>
                    </div>

                    <h3 className="text-sm md:text-base font-extrabold app-text-main truncate leading-snug">
                      {ticket.eventTitle}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium app-text-sub">
                      <p className="flex items-center gap-1.5 truncate">
                        <FiCalendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{ticket.eventTime}</span>
                      </p>
                      <p className="flex items-center gap-1.5 truncate">
                        <FiMapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate max-w-[200px]">{ticket.eventLocation}</span>
                      </p>
                    </div>
                  </div>

                  {/* Ticket Details Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="px-2.5 py-0.5 rounded-lg app-bg-subnav border app-border text-[11px] font-bold app-text-main">
                      Hạng vé: <strong className="text-blue-500">
                        {ticket.ticketTypeName.replace(/seat_\d+_(\d+)_(\d+)/g, (_, r, c) => `Hàng ${String.fromCharCode(65 + parseInt(r))} - Ghế ${parseInt(c) + 1}`)}
                      </strong>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg app-bg-subnav border app-border text-[11px] font-bold app-text-main">
                      {ticket.quantity} vé
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg app-bg-subnav border app-border text-[11px] font-extrabold text-emerald-500">
                      {formatCurrency(ticket.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Right Side: Ticket Action Buttons */}
                <div className="p-3 md:p-4 md:w-44 shrink-0 flex flex-row md:flex-col items-center justify-center gap-2">
                  {/* Xem QR Code Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedQrTicket(ticket)}
                    className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                  >
                    <QrCodeIcon className="w-4 h-4" />
                    <span>Xem QR</span>
                  </button>

                  {/* Xuất Ảnh Vé Button */}
                  <button
                    type="button"
                    onClick={() => downloadTicketAsImage(ticket)}
                    className="w-full py-2 px-3 rounded-xl app-bg-card border app-border hover:border-blue-500 text-xs font-bold app-text-main hover:text-blue-500 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <FiDownload className="w-3.5 h-3.5" />
                    <span>Xuất Ảnh</span>
                  </button>

                  {/* Xem Chi Tiết Link */}
                  <Link
                    to={`/my-tickets/${ticket.id}`}
                    className="text-[11px] font-bold text-blue-500 hover:underline flex items-center justify-center gap-1 mt-0.5"
                  >
                    <span>Chi tiết</span>
                    <FiArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="app-bg-card border app-border rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
              <QrCodeIcon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black app-text-main">Chưa có vé nào trong danh sách</h3>
            <p className="text-xs app-text-sub leading-relaxed">
              Bạn chưa mua vé sự kiện nào hoặc chưa có đơn hàng phù hợp với bộ lọc hiện tại.
            </p>
            <Link
              to="/events"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
            >
              <span>Khám phá sự kiện ngay</span>
              <FiArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Ticket QR Code Display Modal */}
      {selectedQrTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md app-bg-card border app-border rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 app-text-main animate-scaleUp text-center">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b app-border pb-4">
              <h3 className="text-base font-black uppercase tracking-tight app-text-main">
                Mã QR Check-in Vé Điện Tử
              </h3>
              <button
                type="button"
                onClick={() => setSelectedQrTicket(null)}
                className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Event Name */}
            <div className="space-y-1">
              <p className="text-xs font-black text-blue-500 uppercase">{selectedQrTicket.eventTitle}</p>
              <p className="text-xs app-text-sub font-semibold">
                {selectedQrTicket.ticketTypeName.replace(/seat_\d+_(\d+)_(\d+)/g, (_, r, c) => `Hàng ${String.fromCharCode(65 + parseInt(r))} - Ghế ${parseInt(c) + 1}`)} (x{selectedQrTicket.quantity})
              </p>
            </div>

            {/* Large QR Code Display Card */}
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-64 h-64 bg-white rounded-3xl p-4 shadow-xl border border-slate-200 flex items-center justify-center overflow-hidden">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                    selectedQrTicket.qrCode || `HALOTICKET-${selectedQrTicket.bookingCode}`
                  )}`}
                  alt="Ticket QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Code Box */}
              <div className="flex items-center justify-center gap-2 p-3 rounded-2xl app-bg-main border app-border w-full">
                <span className="font-mono font-black text-sm text-blue-500 tracking-wider">
                  {selectedQrTicket.qrCode || `HALOTICKET-${selectedQrTicket.bookingCode}`}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyQrCode(selectedQrTicket.qrCode || `HALOTICKET-${selectedQrTicket.bookingCode}`)
                  }
                  className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 cursor-pointer transition-colors"
                  title="Sao chép mã"
                >
                  {copiedQrCode ? <FiCheck className="w-4 h-4 text-emerald-500" /> : <FiCopy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedQrTicket(null)}
                className="w-1/2 py-3 rounded-2xl app-bg-main border app-border font-extrabold text-xs app-text-sub hover:app-text-main transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => downloadTicketAsImage(selectedQrTicket)}
                className="w-1/2 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <FiDownload className="w-4 h-4" />
                <span>Tải Vé Hình Ảnh</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
