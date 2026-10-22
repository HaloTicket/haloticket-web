import { useState, useEffect, useMemo, useCallback } from "react";
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
  FiGift,
} from "react-icons/fi";
import { formatCurrency } from "@/utils/formatters";
import { type TicketItem, downloadTicketAsImage, mapTicketStatus } from "./MyTickets";
import { ticketApi } from "@/services/ticketApi";
import { eventApi } from "@/services/eventApi";
import { bookingApi } from "@/services/bookingApi";
import { userApi, getCachedUserProfile } from "@/services/userApi";
import { marketplaceApi } from "@/services/marketplaceApi";
import { GiftTicketModal, ResaleTicketModal } from "./TicketActionModals";
import { PATHS } from "@/routes/paths";

export default function TicketDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<TicketItem | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isQrRevealed, setIsQrRevealed] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showResaleModal, setShowResaleModal] = useState(false);
  const [recipientName, setRecipientName] = useState<string>("");
  const [activeListingId, setActiveListingId] = useState<string | null>(null);
  const [isCancellingResale, setIsCancellingResale] = useState(false);
  const [activeGiftSagaId, setActiveGiftSagaId] = useState<string | null>(null);
  const [isCancellingGift, setIsCancellingGift] = useState(false);
  const [showCancelGiftModal, setShowCancelGiftModal] = useState(false);

  const loadTicketData = useCallback(async (ticketId: string) => {
    try {
      const item = await ticketApi.getMyTicket(ticketId);
      const event = await eventApi.getEventById(item.eventId).catch(() => null);

      // 1. fetch real recipient name from booking or authenticated user profile
      let realName = (item as unknown as { customerName?: string }).customerName;
      if (!realName && item.bookingCode) {
        try {
          const booking = await bookingApi.getBookingById(item.bookingCode);
          const bCustomerName = (booking as unknown as { customerName?: string })?.customerName;
          if (bCustomerName && bCustomerName.trim()) {
            realName = bCustomerName.trim();
          }
        } catch {
          // ignore
        }
      }
      if (!realName) {
        try {
          const profile = await userApi.getProfile();
          realName = profile.fullName?.trim() || profile.email;
        } catch {
          const cached = getCachedUserProfile();
          if (cached) {
            realName = cached.fullName?.trim() || cached.email;
          }
        }
      }
      setRecipientName(realName || t("Khách hàng"));

      // 2. format event date/time
      const startTimeStr = event?.startTime ? String(event.startTime) : "";
      const formattedTime = startTimeStr
        ? new Intl.DateTimeFormat("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }).format(new Date(startTimeStr))
        : t("Chưa cập nhật lịch");

      const rawStatus = item.status || "VALID";
      const isResale =
        item.acquisitionType === "RESALE" ||
        (item.bookingCode || "").startsWith("RSL-") ||
        (item.bookingCode || "").includes("RESALE");

      setTicket({
        id: item.id,
        bookingCode: item.bookingCode || item.id,
        eventId: item.eventId,
        eventTitle: String(event?.title || `Sự kiện ${item.eventId}`),
        eventTime: formattedTime,
        eventLocation: String(event?.locationName || event?.address || t("Đang cập nhật")),
        eventPoster: String(event?.posterImage || event?.bannerUrl || ""),
        ticketTypeName: item.ticketTypeName || t("Vé điện tử"),
        quantity: 1,
        totalAmount: item.price || 0,
        originalPrice: item.originalPrice || undefined,
        acquisitionType: isResale ? "RESALE" : (item.acquisitionType || "PRIMARY"),
        purchaseDate: item.issuedAt || undefined,
        rawStatus,
        status: mapTicketStatus(rawStatus),
        qrCode: item.qrCode || undefined,
      });

      // 3. if ticket is currently locked for resale, look up the listing ID to allow cancel
      if (rawStatus === "LOCKED_FOR_RESALE" || mapTicketStatus(rawStatus) === "SELLING") {
        try {
          const listingsPage = await marketplaceApi.getMyListings(0, 50);
          const matched = listingsPage?.content?.find((l) => l.ticketId === item.id && l.status === "ACTIVE");
          if (matched) {
            setActiveListingId(matched.id);
          }
        } catch {
          // ignore
        }
      }

      // 4. if ticket is currently locked for transfer, look up active gift saga to allow cancel
      if (rawStatus === "LOCKED_FOR_TRANSFER" || mapTicketStatus(rawStatus) === "GIFTING") {
        try {
          const gift = await marketplaceApi.getActiveGiftByTicket(item.id) as { sagaId?: string };
          if (gift?.sagaId) {
            setActiveGiftSagaId(gift.sagaId);
          }
        } catch {
          // ignore
        }
      }
    } catch {
      setLoadError(t("Không thể tải thông tin vé. Vui lòng thử lại sau."));
    }
  }, [t]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!id) return;
    loadTicketData(id);
  }, [id, loadTicketData]);

  const isSelling = ticket ? ticket.status === "SELLING" || ticket.rawStatus === "LOCKED_FOR_RESALE" : false;
  const isGifting = ticket ? ticket.status === "GIFTING" || ticket.rawStatus === "LOCKED_FOR_TRANSFER" : false;
  const isLocked = ticket ? isSelling || isGifting || ticket.status !== "UPCOMING" || ticket.rawStatus !== "VALID" || !ticket.qrCode : true;
  const qrCodeString = ticket?.qrCode || "";

  const copyCode = () => {
    const code = ticket?.bookingCode || qrCodeString;
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCancelResale = async () => {
    if (!activeListingId) {
      navigate(PATHS.MARKETPLACE);
      return;
    }
    const confirmed = window.confirm(t("Bạn có chắc chắn muốn hủy đăng bán lại vé này không? Mã QR sẽ được kích hoạt lại."));
    if (!confirmed) return;

    try {
      setIsCancellingResale(true);
      await marketplaceApi.cancelListing(activeListingId);
      if (id) {
        await loadTicketData(id);
      }
    } catch (err) {
      alert(t("Không thể hủy niêm yết lúc này. Vui lòng thử lại sau."));
    } finally {
      setIsCancellingResale(false);
    }
  };

  const handleCancelGift = async () => {
    if (!activeGiftSagaId) {
      alert(t("Không tìm thấy thông tin lời mời tặng vé."));
      return;
    }
    setShowCancelGiftModal(false);
    try {
      setIsCancellingGift(true);
      await marketplaceApi.cancelGift(activeGiftSagaId);
      if (id) {
        await loadTicketData(id);
      }
    } catch {
      alert(t("Không thể hủy tặng vé lúc này. Vui lòng thử lại sau."));
    } finally {
      setIsCancellingGift(false);
    }
  };

  // seat extraction
  const { formattedTicketType, seatDisplay } = useMemo(() => {
    if (!ticket) return { formattedTicketType: "", seatDisplay: null };
    return {
      formattedTicketType: ticket.ticketTypeName,
      seatDisplay: ticket.seatName || null,
    };
  }, [ticket]);

  // timeline builder
  const timelineEvents = useMemo(() => {
    if (!ticket) return [];
    const events: Array<{ title: string; desc?: string; time?: string; dotColor: string }> = [];

    const issuedDate = ticket.purchaseDate ? new Date(ticket.purchaseDate) : null;
    const formattedIssued = issuedDate && !Number.isNaN(issuedDate.getTime())
      ? new Intl.DateTimeFormat("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(issuedDate)
      : null;

    // 1. issuance
    events.push({
      title: t("Vé được phát hành"),
      desc: ticket.acquisitionType === "RESALE"
        ? t("Vé được cấp lại sau khi mua thành công trên sàn")
        : ticket.acquisitionType === "GIFT"
        ? t("Vé được chuyển vào tài khoản từ lời mời tặng vé")
        : t("Thanh toán thành công và khởi tạo vé điện tử chính thức"),
      time: formattedIssued || t("Đã ghi nhận"),
      dotColor: "bg-[#2166F3]",
    });

    // 2. ownership confirmation
    events.push({
      title: t("Vé đã chuyển vào tài khoản"),
      desc: t("Sẵn sàng quản lý và sử dụng"),
      time: formattedIssued || undefined,
      dotColor: "bg-emerald-500",
    });

    // 3. resale / gifting
    if (isSelling) {
      events.push({
        title: t("Đăng bán lại trên Marketplace"),
        desc: t("Người dùng đã tạo tin bán lại vé này"),
        time: formattedIssued || undefined,
        dotColor: "bg-amber-500",
      });
      events.push({
        title: t("QR đang tạm khóa"),
        desc: t("Vé đang trong quá trình giao dịch và chưa thể sử dụng để check-in"),
        time: formattedIssued || undefined,
        dotColor: "bg-slate-400",
      });
    }

    // 4. used
    if (ticket.status === "USED") {
      events.push({
        title: t("Đã check-in sự kiện"),
        desc: t("Vé đã được soát vé thành công tại cổng vào"),
        dotColor: "bg-emerald-600",
      });
    }

    return events;
  }, [ticket, isSelling, t]);

  if (loadError) {
    return (
      <div className="w-full flex-1 app-bg-page flex flex-col items-center justify-center min-h-[450px] p-6 text-center">
        <p className="text-sm font-semibold text-rose-600 mb-4">{loadError}</p>
        <button
          type="button"
          onClick={() => navigate(PATHS.MY_TICKETS)}
          className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
        >
          {t("Quay lại vé của tôi")}
        </button>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="w-full flex-1 app-bg-page flex items-center justify-center min-h-[450px]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full flex-1 app-bg-page app-text-main font-sans pb-16">
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Back Link */}
        <div>
          <button
            type="button"
            onClick={() => navigate(PATHS.MY_TICKETS)}
            className="inline-flex items-center gap-2 text-sm font-medium app-text-muted hover:text-blue-600 transition-colors cursor-pointer"
          >
            <FiArrowLeft className="w-4 h-4" />
            <span>{t("Quay lại vé của tôi")}</span>
          </button>
        </div>

        {/* Page Title & Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold app-text-main tracking-tight leading-snug">
            {ticket.eventTitle}
          </h1>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isSelling ? (
              <>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  {t("Đang bán lại")}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  <FiLock className="w-3.5 h-3.5 text-slate-500" />
                  {t("QR tạm khóa")}
                </span>
              </>
            ) : isLocked ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <FiLock className="w-3.5 h-3.5 text-slate-500" />
                {ticket.status === "USED" ? t("Đã sử dụng") : ticket.status === "TRANSFERRED" ? t("Đã chuyển nhượng") : t("QR tạm khóa")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <FiShield className="w-3.5 h-3.5 text-emerald-600" />
                {t("Vé có hiệu lực")}
              </span>
            )}
          </div>
        </div>

        {/* 1. Event Header Card (Poster + Thông tin sự kiện) */}
        <div className="app-bg-card border app-border rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 shadow-xs">
          {ticket.eventPoster ? (
            <img
              src={ticket.eventPoster}
              alt={ticket.eventTitle}
              className="w-full sm:w-[120px] h-36 sm:h-[160px] object-cover rounded-md border app-border shrink-0"
            />
          ) : (
            <div className="w-full sm:w-[120px] h-36 sm:h-[160px] bg-slate-100 dark:bg-slate-800 rounded-md border app-border flex items-center justify-center text-slate-400 shrink-0">
              <FiCalendar className="w-8 h-8" />
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                {t("Vé điện tử chính thức")}
              </span>
              {ticket.acquisitionType === "RESALE" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                  <FiTag className="w-3 h-3" />
                  {t("Vé mua từ sàn bán lại")}
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-bold app-text-main line-clamp-2 leading-snug">
              {ticket.eventTitle}
            </h2>

            <div className="space-y-1.5 text-xs sm:text-sm app-text-muted">
              <p className="flex items-center gap-2 font-medium app-text-main">
                <FiCalendar className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{ticket.eventTime}</span>
              </p>
              <p className="flex items-center gap-2">
                <FiMapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{ticket.eventLocation}</span>
              </p>
            </div>
          </div>
        </div>

        {/* 2. Main Body - 2 Columns Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cột trái: Thông tin vé (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="app-bg-card border app-border rounded-lg p-5 sm:p-6 shadow-xs space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider app-text-muted">
                {t("THÔNG TIN VÉ")}
              </h3>

              <div className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                <div className="py-3 flex items-center justify-between">
                  <span className="text-xs font-medium app-text-muted">{t("Hạng vé")}</span>
                  <span className="font-semibold app-text-main">{formattedTicketType}</span>
                </div>

                {seatDisplay && (
                  <div className="py-3 flex items-center justify-between">
                    <span className="text-xs font-medium app-text-muted">{t("Vị trí ngồi")}</span>
                    <span className="font-semibold app-text-main">{seatDisplay}</span>
                  </div>
                )}

                <div className="py-3 flex items-center justify-between">
                  <span className="text-xs font-medium app-text-muted">{t("Số lượng")}</span>
                  <span className="font-semibold app-text-main">{ticket.quantity} {t("vé")}</span>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <span className="text-xs font-medium app-text-muted">{t("Người nhận vé")}</span>
                  <span className="font-semibold app-text-main">{recipientName}</span>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <span className="text-xs font-medium app-text-muted">
                    {ticket.acquisitionType === "RESALE" ? t("Giá mua lại") : t("Tổng tiền")}
                  </span>
                  <div className="text-right">
                    <span className="font-semibold app-text-main font-mono">
                      {formatCurrency(ticket.totalAmount)}
                    </span>
                    {ticket.originalPrice && ticket.originalPrice !== ticket.totalAmount && (
                      <span className="block text-xs app-text-muted line-through font-mono">
                        {formatCurrency(ticket.originalPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Divider & Booking Code */}
              <div className="border-t app-border pt-4">
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 border app-border rounded-md p-3">
                  <div>
                    <span className="text-[11px] font-medium app-text-muted block">{t("Mã vé")}</span>
                    <span className="font-mono font-bold text-sm app-text-main tracking-wide">
                      {ticket.bookingCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="p-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                    title={t("Sao chép mã")}
                  >
                    {copiedCode ? <FiCheck className="w-4 h-4 text-emerald-600" /> : <FiCopy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Box: Nếu vé đang đăng bán lại */}
              {isSelling && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-md p-4 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                      {t("Đang bán lại")}
                    </p>
                    <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                      {t("Vé hiện đang được đăng bán trên Marketplace. Mã QR tạm thời không thể sử dụng để check-in.")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => navigate(PATHS.MARKETPLACE)}
                      className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#2166F3] text-white hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      {t("Quản lý tin bán")}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelResale}
                      disabled={isCancellingResale}
                      className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-white border border-amber-300 text-amber-900 hover:bg-amber-100/50 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isCancellingResale ? t("Đang hủy...") : t("Hủy đăng bán")}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Box: Nếu vé đang có lời mời tặng vé */}
              {isGifting && (
                <div className="bg-violet-50/70 border border-violet-200 rounded-md p-4 space-y-3 dark:bg-violet-950/20 dark:border-violet-900/40">
                  <div>
                    <p className="text-xs font-bold text-violet-900 dark:text-violet-300 uppercase tracking-wide">
                      {t("Đang tặng")}
                    </p>
                    <p className="text-xs text-violet-800/90 dark:text-violet-400 mt-1 leading-relaxed">
                      {t("Vé hiện đang có lời mời tặng vé đang chờ người nhận xác nhận. Mã QR tạm thời không thể sử dụng để check-in.")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCancelGiftModal(true)}
                      disabled={isCancellingGift}
                      className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 dark:bg-slate-900 dark:border-rose-900 dark:text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isCancellingGift ? t("Đang hủy...") : t("Hủy tặng vé")}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons: Đăng bán vé lại & Tặng vé cho bạn bè if VALID and not selling */}
              {!isLocked && ticket.status === "UPCOMING" && ticket.rawStatus === "VALID" && (
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowResaleModal(true)}
                    className="w-full py-2.5 px-4 rounded-md border border-emerald-600 bg-emerald-50/50 hover:bg-emerald-100/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                  >
                    <FiTag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t("Đăng bán vé lại")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowGiftModal(true)}
                    className="w-full py-2.5 px-4 rounded-md border border-[#2166F3] text-[#2166F3] hover:bg-blue-50/60 dark:hover:bg-blue-950/20 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                  >
                    <FiGift className="w-4 h-4 text-[#2166F3]" />
                    <span>{t("Tặng vé cho bạn bè")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Cột phải: Mã QR Check-in (5 cols) */}
          <div className="lg:col-span-5">
            <div className="app-bg-card border app-border rounded-lg p-5 sm:p-6 shadow-xs flex flex-col items-center text-center space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider app-text-muted self-start">
                {t("MÃ QR CHECK-IN")}
              </h3>

              {isLocked ? (
                /* Khối QR làm mờ giữ như cũ nhưng luôn là màu xám trung tính chuẩn ticketing */
                <div className="w-full flex flex-col items-center space-y-3">
                  <div className="w-full max-w-[270px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                    <div className="relative flex aspect-square w-full items-center justify-center bg-slate-50 p-4">
                      <img
                        src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=HALOTICKET_LOCKED"
                        alt="QR Locked"
                        className="h-full w-full object-contain filter blur-[5px] grayscale opacity-20 pointer-events-none select-none"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100/95 text-slate-600 border border-slate-300 shadow-sm backdrop-blur-xs">
                          <FiLock className="h-7 w-7 text-slate-600" />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 bg-slate-50/90 px-4 py-3 text-center">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                        {t("MÃ QR ĐANG TẠM KHÓA")}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500 leading-relaxed font-medium">
                        {isSelling
                          ? t("Vé đang đăng bán trên sàn Marketplace. Mã QR sẽ được kích hoạt khi giao dịch kết thúc.")
                          : t("Vé đang bán, đang chuyển quyền, đã sử dụng hoặc đã hủy nên không thể dùng để check-in.")}
                      </p>
                    </div>
                  </div>

                  <div className="w-full border-t border-[#EEF2F6] pt-3 mt-1 flex items-center justify-center gap-2">
                    <span className="text-xs text-[#64748B]">{t("Trạng thái vé:")}</span>
                    {isSelling ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {t("Đang bán lại")}
                      </span>
                    ) : ticket.status === "USED" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        {t("Đã sử dụng")}
                      </span>
                    ) : ticket.status === "TRANSFERRED" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        {t("Đã chuyển nhượng")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        {t("QR tạm khóa")}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                /* Khối QR có hiệu lực, sẵn sàng check-in */
                <div className="w-full py-2 flex flex-col items-center space-y-4">
                  <div className="relative p-2 app-bg-card border app-border rounded-lg shadow-2xs group">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeString)}`}
                      alt="QR Check-in"
                      className={`w-44 h-44 object-contain transition-all duration-200 ${
                        isQrRevealed ? "filter-none opacity-100" : "filter blur-[6px] grayscale opacity-30 select-none"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setIsQrRevealed((prev) => !prev)}
                      className={`absolute inset-0 flex flex-col items-center justify-center rounded-lg cursor-pointer text-white transition-all ${
                        !isQrRevealed
                          ? "bg-slate-900/40 hover:bg-slate-900/55 opacity-100"
                          : "bg-slate-950/60 opacity-0 group-hover:opacity-100 backdrop-blur-[2px]"
                      }`}
                      aria-label={isQrRevealed ? t("Bấm để che QR") : t("Bấm để xem QR")}
                      title={isQrRevealed ? t("Bấm để che QR") : t("Bấm để xem QR")}
                    >
                      {!isQrRevealed ? (
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

                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#172033]">
                      {t("Mã vé sẵn sàng check-in")}
                    </p>
                    <p className="text-xs text-[#64748B]">
                      {t("Xuất trình mã này tại cổng soát vé sự kiện.")}
                    </p>
                  </div>

                  <div className="w-full space-y-2 pt-2 border-t border-[#EEF2F6]">
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
                      onClick={() => setIsQrRevealed((prev) => !prev)}
                      className="w-full py-1.5 text-xs text-[#64748B] hover:text-[#172033] font-medium transition-colors cursor-pointer"
                    >
                      {isQrRevealed ? t("Che mã QR bảo mật") : t("Hiện mã QR")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Lịch sử vé (Ticket History / Timeline) */}
        <div className="app-bg-card border app-border rounded-lg p-5 sm:p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider app-text-muted">
            {t("LỊCH SỬ VÉ")}
          </h3>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {timelineEvents.map((item, idx) => (
              <div key={idx} className="relative flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <div className="flex items-start gap-2.5">
                  <span className={`absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${item.dotColor}`} />
                  <div>
                    <p className="text-sm font-semibold app-text-main">{item.title}</p>
                    {item.desc && <p className="text-xs app-text-muted mt-0.5">{item.desc}</p>}
                  </div>
                </div>
                {item.time && (
                  <span className="text-xs font-mono app-text-muted sm:text-right shrink-0">
                    {item.time}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showGiftModal && (
        <GiftTicketModal
          ticket={ticket}
          onClose={() => setShowGiftModal(false)}
          onChanged={() => navigate(PATHS.MY_TICKETS)}
        />
      )}

      {showResaleModal && (
        <ResaleTicketModal
          ticket={ticket}
          onClose={() => setShowResaleModal(false)}
          onChanged={() => {
            setShowResaleModal(false);
            if (id) loadTicketData(id);
          }}
        />
      )}

      {showCancelGiftModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4" role="presentation">
          <div className="w-full max-w-sm rounded-2xl border app-border app-bg-card p-6 shadow-xl animate-in zoom-in-95 duration-200" role="dialog" aria-modal="true">
            <h3 className="text-base font-bold">{t("Hủy tặng vé?")}</h3>
            <p className="mt-2 text-sm app-text-muted">
              {t("Bạn có chắc chắn muốn hủy lời mời tặng vé này không? Vé sẽ được mở khóa lại để bạn sử dụng.")}
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowCancelGiftModal(false)}
                className="rounded-xl border app-border px-4 py-2 text-sm font-semibold app-text-main hover:bg-slate-500/10 transition"
              >
                {t("Đóng")}
              </button>
              <button
                type="button"
                onClick={handleCancelGift}
                disabled={isCancellingGift}
                className="rounded-xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-40 transition"
              >
                {isCancellingGift ? t("Đang xử lý…") : t("Xác nhận hủy tặng")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
