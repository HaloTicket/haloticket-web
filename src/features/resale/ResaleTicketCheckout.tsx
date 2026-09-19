import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCalendar,
  FiChevronsRight,
  FiCopy,
  FiMapPin,
  FiMinus,
  FiPlus,
  FiShield,
  FiX,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";

import TicketHoldTimeoutModal from "./components/TicketHoldTimeoutModal";
import { CancelOrderModal } from "./components/CancelOrderModal";
import VietQrModal from "@/features/tickets/components/VietQrModal";
import { eventApi } from "@/services/eventApi";
import { marketplaceApi } from "@/services/marketplaceApi";
import { paymentApi } from "@/services/paymentApi";
import type { VietQrPayloadResponse } from "@/types";
import type { ResaleReservation, TicketListing } from "@/types/marketplace";

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const formatDateTime = (value?: unknown) => {
  if (!value) return "19:00, Hôm nay";
  try {
    const d = new Date(String(value));
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return String(value);
  }
};

export interface NormalizedCustomQuestion {
  id: string;
  title: string;
  description: string;
  type: string;
  isRequired: boolean;
  options: string[];
}

type CheckoutStep = "reserve" | "payment";



/**
 * Modal thông báo khi người bán bấm tiếp tục mua vé của chính mình
 */
function OwnerListingModal({
  open,
  onClose,
  onBackToList,
}: {
  open: boolean;
  onClose: () => void;
  onBackToList: () => void;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 sm:p-7 text-slate-900 shadow-2xl dark:bg-zinc-900 dark:text-white border border-slate-100 dark:border-zinc-800 animate-in zoom-in-95 duration-150 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-500">
          <FiAlertTriangle className="h-7 w-7" />
        </div>

        <h3 className="text-lg font-black text-slate-900 dark:text-white">
          Vé do chính bạn đăng bán
        </h3>

        <p className="mt-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Hệ thống HaloTicket không cho phép người bán tự mua vé do chính mình đăng bán. Vui lòng đăng nhập tài khoản khác nếu muốn kiểm tra luồng thanh toán mua vé bán lại.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onBackToList}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-3 px-4 text-sm font-bold text-white transition cursor-pointer shadow-sm"
          >
            Quay lại danh sách vé
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border app-border app-bg-card hover:bg-slate-100 dark:hover:bg-zinc-800 py-2.5 px-4 text-xs font-semibold app-text-muted transition cursor-pointer"
          >
            Đóng thông báo
          </button>
        </div>
      </div>
    </div>
  );
}

export const ResaleTicketCheckout = () => {
  const { eventId = "", ticketId = "" } = useParams();
  const navigate = useNavigate();

  const [listing, setListing] = useState<TicketListing | null>(null);
  const [event, setEvent] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [reserving, setReserving] = useState(false);
  const [reservation, setReservation] = useState<ResaleReservation | null>(null);
  const [step, setStep] = useState<CheckoutStep>("reserve");

  // Countdown timer: 10 minutes initial duration
  const [secondsRemaining, setSecondsRemaining] = useState(10 * 60);
  const [hasExpired, setHasExpired] = useState(false);

  // Per-ticket questionnaire state: Map of ticketIndex (0..quantity-1) to answers
  const [ticketAgreed, setTicketAgreed] = useState<Record<number, boolean>>({});
  const [ticketAnswers, setTicketAnswers] = useState<Record<number, Record<string, string | boolean>>>({});
  const [collapsedTickets, setCollapsedTickets] = useState<Record<number, boolean>>({});
  const [questionError, setQuestionError] = useState("");

  // Modals state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingHold, setCancellingHold] = useState(false);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [isOwnerDetected, setIsOwnerDetected] = useState(false);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<"VNPAY" | "VIETQR" | "MOMO" | "ZALOPAY" | "SHOPEEPAY">("VNPAY");
  const [paying, setPaying] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [vietQrData, setVietQrData] = useState<VietQrPayloadResponse | null>(null);
  const [isVietQrModalOpen, setIsVietQrModalOpen] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState<string>("");

  // Ref to prevent duplicate reservation calls on mount
  const hasAttemptedReserveRef = useRef(false);

  // Fetch listing & event
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
    Promise.all([marketplaceApi.getListing(ticketId), eventApi.getEventById(eventId)])
      .then(([listingData, eventData]) => {
        setListing(listingData);
        setEvent(eventData);
      })
      .catch(() => setError("Vé này không còn khả dụng hoặc đã được người khác mua."));
  }, [eventId, ticketId]);

  // Normalize customQuestions from event using useMemo to avoid setState inside effect
  const customQuestions = useMemo<NormalizedCustomQuestion[]>(() => {
    const raw = event?.customQuestions ?? event?.questions;
    let list: Array<Record<string, unknown>> = [];
    if (Array.isArray(raw)) {
      list = raw.filter((it): it is Record<string, unknown> => Boolean(it && typeof it === "object"));
    } else if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed;
      } catch {
        list = [];
      }
    }
    return list.map((q, idx) => ({
      id: String(q.id ?? q._id ?? q.key ?? `q_${idx}`),
      title: String(q.title ?? `Câu hỏi ${idx + 1}`),
      description: q.description ? String(q.description) : "",
      type: String(q.type ?? "text").toLowerCase(),
      isRequired: q.isRequired === true || q.isRequired === "true" || q.required === true || q.required === "true",
      options: Array.isArray(q.options) ? q.options.map(String) : [],
    }));
  }, [event]);

  const isMyListing = listing?.ownedByCurrentUser === true || isOwnerDetected;
  const quantity = listing?.quantity || 1;

  // Auto-reserve on mount when listing is loaded (only if not own listing)
  useEffect(() => {
    if (!listing || reservation || isMyListing || hasAttemptedReserveRef.current) return;
    hasAttemptedReserveRef.current = true;

    let isMounted = true;
    marketplaceApi
      .reserveListing(listing.id)
      .then((r) => {
        if (isMounted) {
          setReservation(r);
          setStep("reserve");
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const axiosErr = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
        const status = axiosErr?.response?.status;
        const msg = axiosErr?.response?.data?.message || axiosErr?.message || "";

        if (status === 409 && msg.includes("BUYER_IS_SELLER")) {
          setIsOwnerDetected(true);
        } else if (status === 409) {
          setError("Không thể giữ vé. Vé có thể đã được người khác chọn hoặc đang trong phiên thanh toán.");
        } else {
          setError("Không thể giữ vé lúc này. Vui lòng thử lại sau.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [listing, reservation, isMyListing]);

  // Intercept browser back button when holding ticket (popstate)
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, "", window.location.href);
      setShowCancelModal(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Release reservation hold (nhả lock distributed) and return to event listings
  const handleCancelHoldAndLeave = async () => {
    setCancellingHold(true);
    try {
      if (listing?.id) {
        await marketplaceApi.cancelReservation(listing.id);
      }
    } catch {
      // ignore
    } finally {
      setCancellingHold(false);
      setShowCancelModal(false);
      navigate(`/resale-ticket/${eventId}`);
    }
  };

  const handleSelectDifferentTicket = () => {
    if (hasExpired) {
      navigate(`/resale-ticket/${eventId}`);
      return;
    }
    setShowCancelModal(true);
  };

  // Manual reserve retry handler if needed
  const handleManualReserve = async () => {
    if (!listing || reserving || isMyListing) return;
    setReserving(true);
    setError("");
    try {
      const r = await marketplaceApi.reserveListing(listing.id);
      setReservation(r);
      setStep("reserve");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      const status = axiosErr?.response?.status;
      const msg = axiosErr?.response?.data?.message || axiosErr?.message || "";

      if (status === 409 && msg.includes("BUYER_IS_SELLER")) {
        setShowOwnerModal(true);
      } else if (status === 409) {
        setError("Không thể giữ vé. Vé có thể đã được người khác chọn hoặc đang trong phiên thanh toán.");
      } else {
        setError("Không thể giữ vé lúc này. Vui lòng thử lại sau.");
      }
    } finally {
      setReserving(false);
    }
  };

  // Countdown timer: updates seconds remaining and triggers timeout modal on 0
  useEffect(() => {
    const updateCountdown = () => {
      if (reservation?.reservationExpiresAt) {
        const expiresAt = new Date(reservation.reservationExpiresAt).getTime();
        const diff = Math.floor((expiresAt - Date.now()) / 1000);
        if (diff <= 0) {
          setSecondsRemaining(0);
          setHasExpired(true);
          return;
        }
        setSecondsRemaining(diff);
      } else {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            setHasExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }
    };

    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [reservation?.reservationExpiresAt]);

  // Clone answers from ticket 1 to another ticket
  const copyFromTicket1 = (targetIndex: number) => {
    setTicketAgreed((prev) => ({
      ...prev,
      [targetIndex]: Boolean(prev[0]),
    }));
    setTicketAnswers((prev) => ({
      ...prev,
      [targetIndex]: { ...(prev[0] || {}) },
    }));
  };

  const toggleTicketCollapse = (index: number) => {
    setCollapsedTickets((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Helper to test if a question is answered
  const isQuestionAnswered = (val: unknown) => {
    if (val === undefined || val === null) return false;
    if (typeof val === "string") return val.trim().length > 0;
    if (typeof val === "boolean") return val;
    return true;
  };

  // Check if all required answers and T&C agreements are filled
  const allQuestionsAnswered = useMemo(() => {
    if (quantity <= 0) return false;
    for (let i = 0; i < quantity; i++) {
      if (!ticketAgreed[i]) return false;
      for (const q of customQuestions) {
        if (q.isRequired) {
          const val = ticketAnswers[i]?.[q.id];
          if (!isQuestionAnswered(val)) {
            return false;
          }
        }
      }
    }
    return true;
  }, [quantity, ticketAgreed, ticketAnswers, customQuestions]);

  const handleContinueToPayment = () => {
    if (isMyListing) {
      setShowOwnerModal(true);
      return;
    }

    for (let i = 0; i < quantity; i++) {
      if (!ticketAgreed[i]) {
        setQuestionError(`Vui lòng đồng ý điều khoản chương trình cho vé ${i + 1}`);
        return;
      }
      for (const q of customQuestions) {
        if (q.isRequired) {
          const val = ticketAnswers[i]?.[q.id];
          if (!isQuestionAnswered(val)) {
            setQuestionError(`Vui lòng trả lời câu hỏi bắt buộc: "${q.title}" cho vé ${i + 1}`);
            return;
          }
        }
      }
    }
    setQuestionError("");
    setStep("payment");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePayment = useCallback(async () => {
    if (isMyListing) {
      setShowOwnerModal(true);
      return;
    }

    if (!listing) return;
    setPaying(true);
    setError("");

    try {
      // Marketplace transaction is the source of truth for payment and the ownership-transfer Saga.
      const activeReservation = reservation ?? await marketplaceApi.reserveListing(listing.id);
      if (!reservation) setReservation(activeReservation);
      const paymentInitiation = await marketplaceApi.startResalePayment(activeReservation.transactionId);
      const currentTxId = paymentInitiation.transactionId;
      const totalAmount = paymentInitiation.amount;
      const orderInfo = `Mua ve ban lai ${String(event?.title ?? listing.id)}`;
      const bookingId = currentTxId;
      setActiveBookingId(bookingId);

      const currentEventTitle = String(event?.title ?? "Sự kiện HaloTicket");
      const currentTicketTier = listing.ticketTypeName || listing.section || "VIP";

      // Save order metadata to localStorage for booking-success page
      try {
        localStorage.setItem(
          "haloticket_pending_order",
          JSON.stringify({
            kind: "RESALE",
            bookingId,
            eventId,
            eventTitle: currentEventTitle,
            ticketTypeName: currentTicketTier,
            quantity,
            totalAmount,
            createdAt: new Date().toISOString(),
          })
        );
      } catch {
        // ignore
      }

      // Option 1: VietQR / SePay fast transfer
      if (paymentMethod === "VIETQR") {
        try {
          const qrPayload = await paymentApi.createVietQrPayload(totalAmount, bookingId, bookingId);
          if (qrPayload) {
            setVietQrData(qrPayload);
            setIsVietQrModalOpen(true);
            setPaying(false);
            return;
          }
        } catch (qrErr) {
          throw new Error("Không thể khởi tạo VietQR", { cause: qrErr });
        }
      }

      // Option 2: VNPay Gateway
      if (paymentMethod === "VNPAY") {
        const vnpayUrl = await paymentApi.createVnPayUrl(totalAmount, orderInfo, bookingId);
        if (vnpayUrl) {
          window.location.assign(vnpayUrl);
          return;
        }
      }

      // Option 3: MoMo Wallet
      if (paymentMethod === "MOMO") {
        const momoUrl = await paymentApi.createMoMoUrl(totalAmount, orderInfo, bookingId);
        if (momoUrl) {
          window.location.assign(momoUrl);
          return;
        }
      }

      // Option 4: ZaloPay Wallet
      if (paymentMethod === "ZALOPAY") {
        const zalopayUrl = await paymentApi.createZaloPayUrl(totalAmount, orderInfo, bookingId);
        if (zalopayUrl) {
          window.location.assign(zalopayUrl);
          return;
        }
      }

      // Option 5: ShopeePay Wallet
      if (paymentMethod === "SHOPEEPAY") {
        const shopeepayUrl = await paymentApi.createShopeePayUrl(totalAmount, orderInfo, bookingId);
        if (shopeepayUrl) {
          window.location.assign(shopeepayUrl);
          return;
        }
      }

      throw new Error("Cổng thanh toán không trả về liên kết thanh toán");
    } catch (err) {
      console.error("Payment initiation error:", err);
      setError("Không thể khởi tạo thanh toán. Vé vẫn được giữ cho bạn, vui lòng thử lại.");
    } finally {
      setPaying(false);
    }
  }, [
    isMyListing,
    listing,
    reservation,
    quantity,
    event,
    eventId,
    paymentMethod,
    navigate,
  ]);

  if (error && !listing) {
    return (
      <main className="min-h-screen app-bg-page app-text-main px-4 py-12">
        <div className="mx-auto max-w-2xl rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-300">
          <p role="alert" className="font-medium text-base">
            {error}
          </p>
          <button
            type="button"
            onClick={() => navigate(`/resale-ticket/${eventId}`)}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-500 hover:underline cursor-pointer"
          >
            <FiArrowLeft /> Quay lại danh sách vé
          </button>
        </div>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="min-h-screen app-bg-page app-text-main px-4 py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="mt-3 text-sm app-text-muted">Đang tải thông tin vé…</p>
      </main>
    );
  }

  const eventTitle = String(event?.title ?? "Sự kiện HaloTicket");
  const eventTime = formatDateTime(event?.startTime);
  const eventLocation = String(event?.venueName ?? event?.location ?? event?.address ?? "Địa điểm sẽ được cập nhật");
  const eventPoster = String(
    event?.bannerUrl ||
    event?.bannerImage ||
    event?.posterImage ||
    event?.thumbnailUrl ||
    event?.coverImage ||
    event?.imageUrl ||
    ""
  );
  const ticketTier = listing.ticketTypeName || listing.section || "VIP";
  const totalAmount = listing.price * quantity;

  const timerMinutes = String(Math.floor(secondsRemaining / 60)).padStart(2, "0");
  const timerSeconds = String(secondsRemaining % 60).padStart(2, "0");

  return (
    <div className="min-h-screen app-bg-page app-text-main pb-16 transition-colors font-sans">
      {/* Top Banner with event banner background (ticketbox style) */}
      <section className="relative overflow-hidden border-b app-border bg-slate-950 text-white shadow-xl">
        {/* Background Banner Image with blur */}
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-md scale-105"
          style={{
            backgroundImage: `url(${eventPoster || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200&q=80"})`,
          }}
        />
        {/* Dark overlay backdrop to maintain high text contrast */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" />

        <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6">
          {/* Back button on top banner */}
          <button
            type="button"
            onClick={handleSelectDifferentTicket}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-200 hover:text-white transition cursor-pointer mb-4 bg-white/10 hover:bg-white/20 border border-white/15 px-3.5 py-1.5 rounded-xl backdrop-blur-xs w-fit"
          >
            <FiArrowLeft className="text-sm" />
            <span>Quay lại danh sách vé</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left: Event Details (Directly on blurred banner like Ticketbox) */}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-black text-white sm:text-2xl lg:text-3xl leading-snug drop-shadow-md">
                {eventTitle}
              </h1>
              <div className="my-3.5 h-px max-w-xl bg-white/20" />
              <div className="space-y-2 text-sm text-slate-200 font-medium">
                <p className="flex items-center gap-2.5">
                  <FiCalendar className="text-white text-base shrink-0 opacity-90" />
                  <span>{eventTime}</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <FiMapPin className="text-white text-base shrink-0 opacity-90" />
                  <span>{eventLocation}</span>
                </p>
              </div>
            </div>

            {/* Right: Countdown timer card (Ticketbox style) */}
            <div className="w-fit rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-5 backdrop-blur-md shadow-2xl shrink-0 self-start md:self-auto">
              <p className="text-xs sm:text-sm font-semibold text-slate-200 text-center mb-2.5">
                Hoàn tất đặt vé trong
              </p>
              <div
                className="flex items-center justify-center gap-2 font-mono"
                aria-label={`Còn lại ${timerMinutes} phút ${timerSeconds} giây`}
              >
                <span className="flex h-11 w-12 sm:h-12 sm:w-14 items-center justify-center rounded-xl bg-rose-600 text-2xl font-black text-white shadow-md">
                  {timerMinutes}
                </span>
                <span className="text-2xl font-black text-white">:</span>
                <span className="flex h-11 w-12 sm:h-12 sm:w-14 items-center justify-center rounded-xl bg-rose-600 text-2xl font-black text-white shadow-md">
                  {timerSeconds}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout (2 Columns: Left Questionnaire, Right Sticky Summary) */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {reservation && error && (
          <div role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </div>
        )}
        {/* Retry button if auto-reserve failed and user is not owner */}
        {!reservation && !isMyListing && error && (
          <div className="mb-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 text-sm text-rose-700 dark:text-rose-200 flex items-center justify-between gap-4">
            <span>{error}</span>
            <button
              type="button"
              disabled={reserving}
              onClick={handleManualReserve}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 shrink-0"
            >
              {reserving ? "Đang thử lại…" : "Thử giữ vé lại"}
            </button>
          </div>
        )}

        <div className="grid items-start gap-8 lg:grid-cols-12">
          {/* Left Column: BẢNG CÂU HỎI or PAYMENT FORM */}
          <div className="lg:col-span-8 space-y-6">
            {step === "reserve" ? (
              <>
                {/* Section Title & Back action */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    BẢNG CÂU HỎI
                  </h2>
                  <button
                    type="button"
                    onClick={handleSelectDifferentTicket}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition cursor-pointer"
                  >
                    <FiArrowLeft />
                    <span>Chọn lại vé</span>
                  </button>
                </div>

                {/* Notice: Không hỗ trợ xuất hoá đơn cho Vé bán lại */}
                <div className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-xl">
                  <FiAlertTriangle className="shrink-0 text-base" />
                  <span>Không hỗ trợ xuất hoá đơn cho Vé bán lại</span>
                </div>

                {/* Per-ticket questionnaire accordion cards (Image 3) */}
                <div className="space-y-4">
                  {Array.from({ length: quantity }).map((_, ticketIdx) => {
                    const isCollapsed = collapsedTickets[ticketIdx] === true;
                    return (
                      <div
                        key={ticketIdx}
                        className="overflow-hidden rounded-2xl border app-border app-bg-card shadow-sm"
                      >
                        {/* Header Bar: Tier name on left, "Sao chép từ bảng 1" & toggle on right */}
                        <div className="flex items-center justify-between border-b app-border app-bg-subnav px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-blue-600 dark:text-blue-400 text-base uppercase tracking-wider">
                              {ticketTier}
                            </span>
                            {quantity > 1 && (
                              <span className="rounded bg-black/10 dark:bg-white/10 px-2 py-0.5 text-xs font-semibold app-text-muted">
                                Vé {ticketIdx + 1}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            {ticketIdx > 0 && (
                              <button
                                type="button"
                                onClick={() => copyFromTicket1(ticketIdx)}
                                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-black/10 dark:bg-white/10 px-3 py-1.5 text-xs font-semibold app-text-main transition hover:bg-black/20 dark:hover:bg-white/20"
                              >
                                <FiCopy className="text-xs" />
                                <span>Sao chép từ bảng 1</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => toggleTicketCollapse(ticketIdx)}
                              className="rounded p-1 app-text-muted hover:app-text-main cursor-pointer transition"
                              aria-label={isCollapsed ? "Mở rộng bảng câu hỏi" : "Thu gọn bảng câu hỏi"}
                            >
                              {isCollapsed ? <FiPlus className="text-lg" /> : <FiMinus className="text-lg" />}
                            </button>
                          </div>
                        </div>

                        {/* Body Questions: Visible when not collapsed */}
                        {!isCollapsed && (
                          <div className="p-5 sm:p-6 space-y-6 app-bg-card">
                            {/* Standard T&C Question (Exact replica of Image 3) */}
                            <div className="space-y-2">
                              <p className="text-sm font-bold app-text-main leading-relaxed">
                                Bạn đã đọc và hoàn toàn đồng ý "Điều khoản và điều kiện" của chương trình?{" "}
                                <span className="text-rose-500">*</span>
                              </p>
                              <p className="text-xs app-text-muted">
                                Have you read and fully agree with T&C of the event
                              </p>
                              <div className="mt-3">
                                <label className="flex cursor-pointer items-center gap-3 text-sm font-medium app-text-main hover:opacity-90">
                                  <input
                                    type="checkbox"
                                    checked={ticketAgreed[ticketIdx] === true}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setTicketAgreed((prev) => ({
                                        ...prev,
                                        [ticketIdx]: checked,
                                      }));
                                    }}
                                    className="h-5 w-5 rounded accent-blue-600 cursor-pointer"
                                  />
                                  <span>Tôi đã đọc và đồng ý / I have read and agree</span>
                                </label>
                              </div>
                            </div>

                            {/* Additional custom event questions if any */}
                            {customQuestions.map((question) => {
                              const qId = question.id;
                              const currentVal = ticketAnswers[ticketIdx]?.[qId];

                              return (
                                <div key={qId} className="border-t app-border pt-5 space-y-2">
                                  <label className="block text-sm font-bold app-text-main">
                                    {question.title}
                                    {question.isRequired && <span className="text-rose-500 ml-1">*</span>}
                                  </label>
                                  {question.description && <p className="text-xs app-text-muted">{question.description}</p>}
                                  <div className="mt-2">
                                    {question.type === "checkbox" ? (
                                      <label className="flex cursor-pointer items-center gap-3 text-sm app-text-main">
                                        <input
                                          type="checkbox"
                                          checked={currentVal === true}
                                          onChange={(e) => {
                                            const checked = e.target.checked;
                                            setTicketAnswers((prev) => ({
                                              ...prev,
                                              [ticketIdx]: { ...(prev[ticketIdx] || {}), [qId]: checked },
                                            }));
                                          }}
                                          className="h-5 w-5 rounded accent-blue-600 cursor-pointer"
                                        />
                                        <span>Đồng ý</span>
                                      </label>
                                    ) : question.type === "select" || question.type === "dropdown" ? (
                                      <select
                                        value={String(currentVal ?? "")}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setTicketAnswers((prev) => ({
                                            ...prev,
                                            [ticketIdx]: { ...(prev[ticketIdx] || {}), [qId]: val },
                                          }));
                                        }}
                                        className="w-full rounded-xl border app-border app-bg-page px-4 py-3 text-sm app-text-main outline-none focus:border-blue-500"
                                      >
                                        <option value="">-- Chọn câu trả lời --</option>
                                        {question.options.map((opt) => (
                                          <option key={opt} value={opt}>
                                            {opt}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        value={String(currentVal ?? "")}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setTicketAnswers((prev) => ({
                                            ...prev,
                                            [ticketIdx]: { ...(prev[ticketIdx] || {}), [qId]: val },
                                          }));
                                        }}
                                        placeholder="Nhập câu trả lời của bạn"
                                        className="w-full rounded-xl border app-border app-bg-page px-4 py-3 text-sm app-text-main placeholder:text-slate-400 outline-none focus:border-blue-500"
                                      />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {questionError && (
                  <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-300 font-medium">
                    {questionError}
                  </div>
                )}
              </>
            ) : (
              /* Payment step */
              <div className="space-y-6">
                <button
                  type="button"
                  onClick={() => setStep("reserve")}
                  className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <FiArrowLeft /> Quay lại bảng câu hỏi
                </button>

                <fieldset className="rounded-2xl border app-border app-bg-card p-6 shadow-sm">
                  <legend className="px-2 text-base font-black app-text-main">Phương thức thanh toán</legend>
                  <div className="mt-4 space-y-3">
                    {/* 1. VNPAY */}
                    <label
                      className={`flex items-center gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                        paymentMethod === "VNPAY"
                          ? "app-bg-card border-blue-600 ring-2 ring-blue-500/30 shadow-sm"
                          : "app-bg-page border app-border hover:border-blue-500/50"
                      }`}
                      onClick={() => setPaymentMethod("VNPAY")}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === "VNPAY"}
                        onChange={() => setPaymentMethod("VNPAY")}
                        className="accent-blue-600 w-4 h-4 cursor-pointer"
                      />
                      <span className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 font-black text-xs flex items-center justify-center shrink-0 border border-blue-500/20">
                        VNPay
                      </span>
                      <div className="min-w-0">
                        <span className="text-sm font-extrabold app-text-main block">
                          Cổng VNPAY (Thẻ ATM nội địa / Mã QR Ngân hàng / Internet Banking)
                        </span>
                        <span className="text-xs app-text-muted block">Hỗ trợ tất cả ngân hàng tại Việt Nam</span>
                      </div>
                    </label>

                    {/* 2. VietQR / SePay */}
                    <label
                      className={`flex items-center gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                        paymentMethod === "VIETQR"
                          ? "app-bg-card border-blue-600 ring-2 ring-blue-500/30 shadow-sm"
                          : "app-bg-page border app-border hover:border-blue-500/50"
                      }`}
                      onClick={() => setPaymentMethod("VIETQR")}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === "VIETQR"}
                        onChange={() => setPaymentMethod("VIETQR")}
                        className="accent-blue-600 w-4 h-4 cursor-pointer"
                      />
                      <span className="w-10 h-10 rounded-xl bg-rose-600/10 text-rose-600 font-black text-xs flex items-center justify-center shrink-0 border border-rose-500/20">
                        VietQR
                      </span>
                      <div className="min-w-0">
                        <span className="text-sm font-extrabold app-text-main block">
                          SePay - Chuyển khoản VietQR Nhanh 24/7
                        </span>
                        <span className="text-xs app-text-muted block">Quét QR chuyển khoản ngân hàng tự động duyệt tức thì</span>
                      </div>
                    </label>

                    {/* 3. MoMo */}
                    <label
                      className={`flex items-center gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                        paymentMethod === "MOMO"
                          ? "app-bg-card border-blue-600 ring-2 ring-blue-500/30 shadow-sm"
                          : "app-bg-page border app-border hover:border-blue-500/50"
                      }`}
                      onClick={() => setPaymentMethod("MOMO")}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === "MOMO"}
                        onChange={() => setPaymentMethod("MOMO")}
                        className="accent-blue-600 w-4 h-4 cursor-pointer"
                      />
                      <span className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-600 font-black text-xs flex items-center justify-center shrink-0 border border-pink-500/20">
                        MoMo
                      </span>
                      <div className="min-w-0">
                        <span className="text-sm font-extrabold app-text-main block">Ví MoMo</span>
                        <span className="text-xs app-text-muted block">Thanh toán tức thì qua ứng dụng ví MoMo</span>
                      </div>
                    </label>

                    {/* 4. ZaloPay */}
                    <label
                      className={`flex items-center gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                        paymentMethod === "ZALOPAY"
                          ? "app-bg-card border-blue-600 ring-2 ring-blue-500/30 shadow-sm"
                          : "app-bg-page border app-border hover:border-blue-500/50"
                      }`}
                      onClick={() => setPaymentMethod("ZALOPAY")}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === "ZALOPAY"}
                        onChange={() => setPaymentMethod("ZALOPAY")}
                        className="accent-blue-600 w-4 h-4 cursor-pointer"
                      />
                      <span className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 font-black text-xs flex items-center justify-center shrink-0 border border-sky-500/20">
                        Zalo
                      </span>
                      <div className="min-w-0">
                        <span className="text-sm font-extrabold app-text-main block">Ví ZaloPay</span>
                        <span className="text-xs app-text-muted block">Thanh toán qua ứng dụng ZaloPay hoặc mã QR</span>
                      </div>
                    </label>

                    {/* 5. ShopeePay */}
                    <label className="flex items-center gap-3.5 p-4 rounded-2xl border app-bg-page app-border opacity-60 cursor-not-allowed">
                      <input
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === "SHOPEEPAY"}
                        onChange={() => setPaymentMethod("SHOPEEPAY")}
                        disabled
                        className="accent-blue-600 w-4 h-4 cursor-pointer"
                      />
                      <span className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 font-black text-xs flex items-center justify-center shrink-0 border border-orange-500/20">
                        Shopee
                      </span>
                      <div className="min-w-0">
                        <span className="text-sm font-extrabold app-text-main block">Ví ShopeePay</span>
                        <span className="text-xs app-text-muted block">Chưa khả dụng</span>
                      </div>
                    </label>
                  </div>
                </fieldset>
              </div>
            )}
          </div>

          {/* Right Column: Sticky "Thông tin đặt vé" Card (Exact Replica of Image 3 with Website Colors) */}
          <aside className="lg:col-span-4 lg:sticky lg:top-6" aria-label="Thông tin đặt vé">
            <div className="rounded-2xl border app-border app-bg-card p-5 sm:p-6 shadow-md app-text-main">
              {/* Card Header: "Thông tin đặt vé" on left, "Chọn lại vé" on right */}
              <div className="flex items-center justify-between border-b app-border pb-3.5">
                <h2 className="text-base font-black app-text-main">Thông tin đặt vé</h2>
                <button
                  type="button"
                  onClick={handleSelectDifferentTicket}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Chọn lại vé
                </button>
              </div>

              {/* Table details: "Loại vé" & "Số lượng" */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-bold app-text-muted">
                  <span>Loại vé</span>
                  <span>Số lượng</span>
                </div>

                <div className="mt-2.5 flex items-start justify-between text-sm">
                  <div>
                    <p className="font-black app-text-main">{ticketTier}</p>
                    <p className="mt-0.5 text-xs app-text-muted">{money(listing.price)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black app-text-main">{String(quantity).padStart(2, "0")}</p>
                    <p className="mt-0.5 text-xs app-text-muted">{money(totalAmount)}</p>
                  </div>
                </div>

                {/* Dashed divider */}
                <div className="my-4 border-t border-dashed app-border" />

                {/* Total amount in bold brand blue / theme */}
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold app-text-main">Tạm tính {quantity} ghế</span>
                  <span className="text-lg font-black text-blue-600 dark:text-blue-400">{money(totalAmount)}</span>
                </div>

                {/* Helper notice - only show when questions are not answered and not owner */}
                {step === "reserve" && !allQuestionsAnswered && !isMyListing && (
                  <p className="mt-4 text-center text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Vui lòng trả lời tất cả câu hỏi để tiếp tục
                  </p>
                )}

                {/* CTA Button: Blue brand button "Tiếp tục »" */}
                <button
                  type="button"
                  disabled={
                    hasExpired ||
                    paying ||
                    reserving ||
                    (step === "reserve" && !allQuestionsAnswered && !isMyListing)
                  }
                  onClick={() => {
                    if (step === "reserve") {
                      handleContinueToPayment();
                    } else {
                      void handlePayment();
                    }
                  }}
                  className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 px-6 text-base font-black text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600 disabled:shadow-none"
                >
                  <span>
                    {paying
                      ? "Đang xử lý…"
                      : reserving
                        ? "Đang giữ vé…"
                        : step === "reserve"
                          ? "Tiếp tục"
                          : "Thanh toán"}
                  </span>
                  {!paying && !reserving && <FiChevronsRight className="text-lg" />}
                </button>
              </div>
            </div>

            {/* Trust badge */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs app-text-muted">
              <FiShield className="text-blue-500 text-sm" />
              <span>Giao dịch được bảo đảm bởi HaloTicket Marketplace</span>
            </div>
          </aside>
        </div>
      </main>

      {/* Modal xác nhận Hủy đơn hàng khi back hoặc click Chọn lại vé (Khớp ảnh) */}
      <CancelOrderModal
        open={showCancelModal}
        onStay={() => setShowCancelModal(false)}
        onCancelOrder={handleCancelHoldAndLeave}
        cancelling={cancellingHold}
      />

      {/* Modal cảnh báo khi người bán bấm mua vé của chính mình */}
      <OwnerListingModal
        open={showOwnerModal}
        onClose={() => setShowOwnerModal(false)}
        onBackToList={() => navigate(`/resale-ticket/${eventId}`)}
      />

      {/* Modal hết thời gian giữ vé (Ảnh 1) */}
      <TicketHoldTimeoutModal
        open={hasExpired}
        onReset={() => navigate(`/resale-ticket/${eventId}`)}
        title="Hết thời gian giữ vé!"
        message="Đã hết thời gian giữ vé. Vui lòng đặt lại vé mới."
        buttonText="Đặt vé mới"
      />

      {/* VietQR Payment Modal */}
      <VietQrModal
        isOpen={isVietQrModalOpen}
        onClose={() => setIsVietQrModalOpen(false)}
        bookingId={activeBookingId}
        vietQrData={vietQrData}
        onSuccess={() => {
          setIsVietQrModalOpen(false);
          navigate("/booking-success");
        }}
        onTimeout={() => {
          setIsVietQrModalOpen(false);
          setHasExpired(true);
        }}
      />

      {/* Resale Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border app-border app-bg-card p-6 app-text-main shadow-2xl">
            <div className="flex items-center justify-between border-b app-border pb-4">
              <h3 className="flex items-center gap-2 text-lg font-bold app-text-main">
                <FiShield className="text-blue-500" />
                Quy định Mua bán vé bán lại
              </h3>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="rounded-lg p-1 app-text-muted hover:app-text-main"
              >
                <FiX className="text-xl" />
              </button>
            </div>
            <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1 text-sm app-text-muted">
              <p>
                <strong>1. Xác thực vé 100%:</strong> Mọi vé bán lại đều được kiểm tra mã định danh, trạng thái và bảo đảm tính hợp lệ trực tiếp từ cơ sở dữ liệu của HaloTicket.
              </p>
              <p>
                <strong>2. Vô hiệu hóa mã QR cũ:</strong> Ngay khi bạn thanh toán thành công, vé cũ của người bán sẽ bị hủy và vô hiệu hóa mã QR hoàn toàn.
              </p>
              <p>
                <strong>3. Cấp phát mã vé mới:</strong> Bạn sẽ nhận được mã QR hoàn toàn mới trong mục <em>Vé của tôi</em>, đảm bảo bạn là chủ sở hữu hợp pháp duy nhất của vé.
              </p>
              <p>
                <strong>4. Giữ vé 15 phút:</strong> Khi nhấn Tiếp tục giữ vé, vé sẽ được khóa riêng cho bạn trong 15 phút để bạn tiến hành thanh toán mà không sợ người khác mua mất.
              </p>
              <p>
                <strong>5. Thanh toán an toàn:</strong> Tiền thanh toán được HaloTicket tạm giữ cho tới khi đối soát thành công, đảm bảo quyền lợi tối đa cho cả hai bên.
              </p>
            </div>
            <div className="mt-6 border-t app-border pt-4">
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="w-full rounded-xl bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700 transition cursor-pointer"
              >
                Đã hiểu và đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResaleTicketCheckout;
