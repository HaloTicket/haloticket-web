import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FiArrowLeft,
  FiCalendar,
  FiMapPin,
  FiDownload,
  FiCopy,
  FiCheck,
  FiLock,
  FiEyeOff,
  FiTag,
  FiShield,
} from "react-icons/fi";
import { formatCurrency } from "@/utils/formatters";
import { type TicketItem, downloadTicketAsImage, mapTicketStatus } from "./MyTickets";
import { ticketApi } from "@/services/ticketApi";
import { eventApi } from "@/services/eventApi";

export default function TicketDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<TicketItem | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isQrRevealed, setIsQrRevealed] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!id) return;
    let active = true;
    ticketApi
      .getMyTicket(id)
      .then(async (item) => {
        if (!active) return;
        const event = await eventApi.getEventById(item.eventId);
        setTicket({
          id: item.id,
          bookingCode: item.bookingCode || item.id,
          eventId: item.eventId,
          eventTitle: String(event?.title || `Sự kiện ${item.eventId}`),
          eventTime: event?.startTime
            ? new Date(String(event.startTime)).toLocaleString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : "Chưa cập nhật lịch",
          eventLocation: String(event?.locationName || event?.address || "Đang cập nhật"),
          eventPoster: String(event?.posterImage || event?.bannerUrl || ""),
          ticketTypeName: item.ticketTypeName || "Vé điện tử",
          quantity: 1,
          totalAmount: item.price || 0,
          originalPrice: item.originalPrice || undefined,
          acquisitionType: item.acquisitionType || "PRIMARY",
          purchaseDate: item.issuedAt || undefined,
          rawStatus: item.status || "VALID",
          status: mapTicketStatus(item.status),
          qrCode: item.qrCode || undefined,
        });
      })
      .catch(() => {
        if (active) setLoadError(t("Không thể tải vé từ hệ thống. Hãy thử lại sau."));
      });
    return () => {
      active = false;
    };
  }, [id, t]);

  if (loadError) {
    return (
      <div className="w-full flex-1 app-bg-page flex items-center justify-center min-h-[450px] text-rose-600">
        {loadError}
      </div>
    );
  }
  if (!ticket) {
    return (
      <div className="w-full flex-1 app-bg-page flex items-center justify-center min-h-[450px]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isSelling = ticket.status === "SELLING" || ticket.rawStatus === "LOCKED_FOR_RESALE";
  const isLocked = isSelling || ticket.status !== "UPCOMING" || ticket.rawStatus !== "VALID" || !ticket.qrCode;
  const qrCodeString = ticket.qrCode || "";

  const copyCode = () => {
    if (!qrCodeString) return;
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
            <span>{t("Quay lại tủ vé")}</span>
          </button>

          {isSelling ? (
            <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black flex items-center gap-1.5">
              <FiLock className="h-3.5 w-3.5" />
              <span>{t("VÉ ĐANG ĐĂNG BÁN - TẠM KHÓA QR")}</span>
            </span>
          ) : isLocked ? (
            <span className="px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-black flex items-center gap-1.5">
              <FiLock className="h-3.5 w-3.5" />
              <span>{t("VÉ KHÔNG THỂ CHECK-IN")}</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black flex items-center gap-1.5">
              <FiShield className="h-3.5 w-3.5" />
              <span>{t("VÉ CÓ HIỆU LỰC")}</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Ticket Layout */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
        {/* Pass Card Component */}
        <div className="app-bg-card border app-border rounded-3xl overflow-hidden shadow-xl space-y-0">
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
            <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider">
                  {t("VÉ ĐIỆN TỬ CHÍNH THỨC")}
                </span>
                {ticket.acquisitionType === "RESALE" && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider shadow-sm">
                    <FiTag className="h-3 w-3" />
                    {t("VÉ MUA TỪ SÀN BÁN LẠI")}
                  </span>
                )}
              </div>
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
                    {t("Thời gian diễn ra")}
                  </span>
                  <p className="text-sm font-bold flex items-center gap-2 app-text-main">
                    <FiCalendar className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>{ticket.eventTime}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-indigo-500">
                    {t("Địa điểm tổ chức")}
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
                  <span className="app-text-sub font-bold block">{t("Hạng vé")}</span>
                  <span className="font-extrabold text-blue-500 text-sm block">
                    {ticket.ticketTypeName}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="app-text-sub font-bold block">{t("Số lượng vé")}</span>
                  <span className="font-extrabold app-text-main text-sm block font-mono">
                    {ticket.quantity} {t("vé")}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="app-text-sub font-bold block">{t("Người nhận vé")}</span>
                  <span className="font-extrabold app-text-main block">
                    {ticket.customerName || "Trần Long Vũ"}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="app-text-sub font-bold block">
                    {ticket.acquisitionType === "RESALE" ? t("Giá mua vé bán lại") : t("Tổng tiền")}
                  </span>
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm block font-mono">
                      {formatCurrency(ticket.totalAmount)}
                    </span>
                    {ticket.acquisitionType === "RESALE" && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        <FiTag className="h-3 w-3" /> {t("Vé mua lại")}
                      </span>
                    )}
                    {ticket.originalPrice && ticket.originalPrice !== ticket.totalAmount && (
                      <span className="block text-[11px] app-text-muted line-through">
                        {t("Giá gốc:")} {formatCurrency(ticket.originalPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Booking Code Banner */}
              <div className="p-4 rounded-2xl app-bg-subnav border app-border space-y-1">
                <span className="text-[11px] font-extrabold app-text-sub block">{t("Mã vé:")}</span>
                <span className="font-mono font-black text-base text-blue-600 dark:text-blue-400 tracking-wider">
                  {ticket.bookingCode}
                </span>
              </div>
            </div>

            {/* Right Column: QR Code Display Card */}
            <div className="md:col-span-5 flex flex-col items-center justify-center space-y-4 p-6 rounded-3xl app-bg-subnav border app-border text-center">
              {isLocked ? (
                /* Khối QR đang bị khóa (Ảnh 2 của người dùng) */
                <div className="w-full max-w-[280px] overflow-hidden rounded-2xl border border-amber-500/30 app-bg-card shadow-lg">
                  <div className="relative flex aspect-square w-full items-center justify-center bg-slate-50 dark:bg-slate-800 p-4">
                    <img
                      src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=HALOTICKET_LOCKED"
                      alt="QR Locked"
                      className="h-full w-full object-contain filter blur-[5px] grayscale opacity-20 pointer-events-none select-none"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 shadow-xl backdrop-blur-xs">
                        <FiLock className="h-7 w-7" />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-amber-500/20 bg-amber-500/10 px-4 py-3.5 text-center">
                    <p className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                      {t("Mã QR đang bị khóa")}
                    </p>
                    <p className="mt-1 text-[11px] text-amber-800/80 dark:text-amber-200/80 leading-relaxed font-medium">
                      {t("Vé đang bán, đang chuyển quyền, đã sử dụng hoặc đã hủy nên không thể dùng để check-in.")}
                    </p>
                  </div>
                </div>
              ) : (
                /* Khối QR có hiệu lực: Che bằng ổ khóa như Ảnh 1, nhấn để xem */
                <>
                  <div className="w-full max-w-[260px] overflow-hidden rounded-2xl border app-border app-bg-card shadow-xl">
                    <button
                      type="button"
                      onClick={() => setIsQrRevealed((prev) => !prev)}
                      className="group relative block w-full text-left cursor-pointer focus:outline-none"
                      aria-label={isQrRevealed ? t("Nhấn vào ảnh để che mã QR") : t("Nhấn vào ảnh để xem mã QR")}
                    >
                      <div className="relative flex aspect-square w-full items-center justify-center bg-white p-3">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                            qrCodeString
                          )}`}
                          alt="Mã QR check-in"
                          className={`h-full w-full object-contain transition-all duration-300 ${
                            isQrRevealed ? "filter-none opacity-100" : "filter blur-[6px] grayscale opacity-30 select-none"
                          }`}
                        />

                        {!isQrRevealed && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900/90 text-white shadow-xl transition-transform group-hover:scale-110">
                              <FiLock className="h-6 w-6" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Thanh hướng dẫn bên dưới đúng như Ảnh 1 */}
                      <div className="bg-slate-800 hover:bg-slate-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 py-2.5 px-3 text-center transition-colors">
                        <p className="text-xs font-semibold text-white tracking-wide flex items-center justify-center gap-1.5">
                          {isQrRevealed ? (
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

                  {/* Khi đã mở xem QR thì mới hiển thị mã text và nút xuất vé */}
                  {isQrRevealed && (
                    <div className="space-y-3 w-full animate-in fade-in duration-200">
                      <div className="space-y-1">
                        <p className="text-[11px] font-black uppercase text-blue-500">{t("MÃ CHUYÊN CHECK-IN VÀO CỔNG")}</p>
                        <div className="flex items-center justify-center gap-2 font-mono text-xs font-bold app-text-main">
                          <span className="truncate max-w-[200px]">{qrCodeString}</span>
                          <button
                            type="button"
                            onClick={copyCode}
                            className="p-1 rounded hover:bg-blue-500/10 text-blue-600 cursor-pointer"
                            aria-label="Sao chép mã"
                          >
                            {copiedCode ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => downloadTicketAsImage(ticket)}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <FiDownload className="w-4 h-4" />
                        <span>{t("Xuất Vé Dạng Hình Ảnh (.PNG)")}</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
