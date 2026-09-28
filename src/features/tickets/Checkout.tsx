import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiClock, FiCheck, FiShield, FiTag, FiAlertCircle, FiArrowLeft } from "react-icons/fi";
import { formatCurrency } from "@/utils/formatters";
import type { BookingOrderData } from "@/types";
import type { CustomQuestionItem } from "@/types/organizer";
import { eventApi } from "@/services/eventApi";
import { bookingApi } from "@/services/bookingApi";
import { paymentApi } from "@/services/paymentApi";
import { userApi } from "@/services/userApi";
import { CancelOrderModal } from "@/features/resale/components/CancelOrderModal";
import UpdateRecipientInfoModal, { type RecipientInfoData } from "./components/UpdateRecipientInfoModal";
import VietQrModal from "./components/VietQrModal";
import TicketHoldTimeoutModal from "@/features/resale/components/TicketHoldTimeoutModal";
import { ToastContainer, type ToastMessage } from "@/features/organizer/event-manage/components/seating/SeatingToast";
import type { VietQrPayloadResponse } from "@/types";

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventIdParam = searchParams.get("eventId");
  const showtimeIdParam = searchParams.get("showtimeId");

  // load pending order data from localStorage or fallback
  const [order] = useState<
    BookingOrderData & {
      eventPoster?: string | null;
      cartItems?: any[];
      items?: any[];
      seatIds?: string[];
      zoneId?: string;
      seatNames?: Record<string, string>;
    }
  >(() => {
    try {
      const saved = localStorage.getItem("haloticket_pending_order");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      eventId: eventIdParam || "event-1",
      eventTitle: "Sự kiện HaloTicket",
      eventTime: "19:00, 20/12/2026",
      eventLocation: "Địa điểm sự kiện HaloTicket",
      ticketTypeName: "Vé tiêu chuẩn",
      quantity: 1,
      price: 0,
      totalAmount: 0,
      eventPoster: null,
      seatNames: {},
    };
  });

  const activeEventId = order.eventId || eventIdParam;
  const activeShowtimeId = order.showtimeId || showtimeIdParam;

  // step navigation: 1 = Customer Info Form & Questionnaire, 2 = Payment Methods & Summary
  const [step, setStep] = useState<number>(1);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (type: "success" | "error" | "warning" | "info", text: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // cancel order confirmation modal state (image 1)
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);

  // recipient info modal state (image 3)
  const [isRecipientModalOpen, setIsRecipientModalOpen] = useState(false);

  // vietQR modal state
  const [isVietQrModalOpen, setIsVietQrModalOpen] = useState(false);
  const [vietQrData, setVietQrData] = useState<VietQrPayloadResponse | null>(null);
  const [activeBookingId, setActiveBookingId] = useState<string>("");
  const [activeBookingCode, setActiveBookingCode] = useState<string>("");

  // custom questions loaded from event-service
  const [customQuestions, setCustomQuestions] = useState<CustomQuestionItem[]>([]);
  const [eventPosterUrl, setEventPosterUrl] = useState<string | null>(order.eventPoster || null);
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});

  // 15-minute countdown timer synced with expiresAt timestamp in localStorage
  const getExpiresAt = () => {
    try {
      const saved = localStorage.getItem("haloticket_pending_order");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.expiresAt) return parsed.expiresAt;
        if (parsed.timestamp) return parsed.timestamp + 15 * 60 * 1000;
      }
    } catch {}
    return Date.now() + 15 * 60 * 1000;
  };

  const [expiresAtTimestamp] = useState<number>(getExpiresAt);
  const [timeLeft, setTimeLeft] = useState<number>(() =>
    Math.max(0, Math.floor((getExpiresAt() - Date.now()) / 1000))
  );
  const [isTimeoutModalOpen, setIsTimeoutModalOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAtTimestamp - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        // release seats on timeout
        const userId = localStorage.getItem("haloticket_session_id");
        if (userId && order?.seatIds) {
          order.seatIds.forEach((seatId: string) => {
            bookingApi.releaseSeat({ eventId: activeEventId as string, showtimeId: activeShowtimeId as string, seatId, userId }).catch(console.error);
          });
        }
        setIsTimeoutModalOpen(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAtTimestamp, activeEventId, order?.seatIds]);

  // listen to browser back button (popstate) to display cancel order confirm modal (image 1)
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, "", window.location.href);
      setShowCancelConfirmModal(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return {
      m: mins < 10 ? `0${mins}` : `${mins}`,
      s: secs < 10 ? `0${secs}` : `${secs}`,
    };
  };

  const timerDisplay = formatTimer(timeLeft);

  // fetch event details to load customQuestions and poster image
  useEffect(() => {
    if (!activeEventId) return;
    let isMounted = true;

    async function fetchEventDetails() {
      try {
        const ev = (await eventApi.getEventById(activeEventId || "")) as Record<string, unknown> | null;
        if (isMounted && ev) {
          const poster = (ev.thumbnailUrl || ev.posterImage || ev.bannerUrl || ev.image || null) as string | null;
          if (poster) setEventPosterUrl(poster);

          // parse customQuestions
          const rawQ = ev.customQuestions || ev.questions;
          let parsedQ: CustomQuestionItem[] = [];
          if (typeof rawQ === "string") {
            try {
              const res = JSON.parse(rawQ);
              if (Array.isArray(res)) parsedQ = res;
            } catch {
              // ignore
            }
          } else if (Array.isArray(rawQ)) {
            parsedQ = rawQ;
          }
          setCustomQuestions(parsedQ);
        }
      } catch (err) {
        console.warn("Could not load event questions:", err);
      }
    }

    fetchEventDetails();
    return () => {
      isMounted = false;
    };
  }, [activeEventId]);

  const hasCustomQuestions = customQuestions.length > 0;

  // questionnaire form state (step 1) - Auto load from logged in user profile
  const [fullName, setFullName] = useState("");
  const [phoneOrCccd, setPhoneOrCccd] = useState("");
  const [email, setEmail] = useState("");
  const [agreedTerms1, setAgreedTerms1] = useState(false);
  const [formError, setFormError] = useState("");

  // load profile from userApi
  useEffect(() => {
    let isMounted = true;
    async function loadUserProfile() {
      try {
        const user = await userApi.getProfile();
        if (isMounted && user) {
          if (user.fullName) setFullName(user.fullName);
          if (user.phoneNumber) setPhoneOrCccd(user.phoneNumber);
          if (user.email) setEmail(user.email);
        }
      } catch (err) {
        console.warn("Could not load user profile for checkout:", err);
      }
    }
    loadUserProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // voucher & discount state
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<any | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [voucherError, setVoucherError] = useState<string>("");

  useEffect(() => {
    if (!activeEventId) return;
    let isMounted = true;
    async function loadVouchers() {
      try {
        const fetchedVouchers = await eventApi.getVouchersByEventId(activeEventId as string);
        if (isMounted) setVouchers(fetchedVouchers);
      } catch (err) {
        console.warn("Failed to load vouchers", err);
      }
    }
    loadVouchers();
    return () => {
      isMounted = false;
    };
  }, [activeEventId]);

  const subtotalAmount = order.totalAmount ?? ((order.price || 0) * (order.quantity || 1));
  const finalTotal = Math.max(0, subtotalAmount - discountAmount);

  const handleApplyVoucher = () => {
    const code = voucherInput.trim().toUpperCase();
    if (!code) return;

    const matchedVoucher = vouchers.find(v => v.code === code && (v.status === "ACTIVE" || v.isActive === true));
    if (!matchedVoucher) {
      setVoucherError("Mã khuyến mãi không hợp lệ hoặc đã hết hạn.");
      showToast("error", "Mã khuyến mãi không hợp lệ.");
      return;
    }

    // check date validity
    const now = new Date().getTime();
    if (matchedVoucher.startDate && new Date(matchedVoucher.startDate).getTime() > now) {
      setVoucherError("Mã khuyến mãi chưa có hiệu lực.");
      showToast("error", "Mã khuyến mãi chưa có hiệu lực.");
      return;
    }
    if (matchedVoucher.endDate && new Date(matchedVoucher.endDate).getTime() < now) {
      setVoucherError("Mã khuyến mãi đã hết hạn.");
      showToast("error", "Mã khuyến mãi đã hết hạn.");
      return;
    }

    // check showtime applicability
    if (matchedVoucher.applyScope === "SPECIFIC_SHOWTIMES") {
      if (!activeShowtimeId || !matchedVoucher.applicableShowtimes?.includes(activeShowtimeId)) {
        setVoucherError("Mã khuyến mãi không áp dụng cho suất diễn này.");
        showToast("error", "Mã khuyến mãi không áp dụng cho suất diễn này.");
        return;
      }
    }

    let discount = 0;
    if (matchedVoucher.discountType === "PERCENTAGE") {
      discount = Math.round(subtotalAmount * (matchedVoucher.discountValue / 100));
    } else {
      discount = matchedVoucher.discountValue || 0;
    }
    
    // cap discount if greater than subtotal
    discount = Math.min(discount, subtotalAmount);

    setDiscountAmount(discount);
    setAppliedVoucher(matchedVoucher);
    setVoucherError("");
    showToast("success", `Đã áp dụng mã giảm ${formatCurrency(discount)}!`);
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setDiscountAmount(0);
    setVoucherInput("");
    setVoucherError("");
    showToast("info", "Đã hủy áp dụng mã giảm giá.");
  };

  // payment state (step 2)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("vnpay");
  const [agreedTerms2, setAgreedTerms2] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // validate step 1 and proceed to payment
  const handleProceedToPayment = () => {
    if (!fullName.trim()) {
      setFormError("Vui lòng nhập Họ & Tên của bạn.");
      return;
    }
    if (!phoneOrCccd.trim()) {
      setFormError("Vui lòng nhập Số điện thoại hoặc CCCD.");
      return;
    }
    if (!email.trim()) {
      setFormError("Vui lòng nhập Email nhận vé chính xác.");
      return;
    }

    // validate custom questions if marked as required (isRequired === true)
    if (hasCustomQuestions) {
      for (const q of customQuestions) {
        if (q.isRequired) {
          const val = answers[q.id];
          if (val === undefined || val === null || (typeof val === "string" && !val.trim()) || val === false) {
            setFormError(`Vui lòng trả lời câu hỏi bắt buộc: "${q.title}"`);
            return;
          }
        }
      }
    }

    if (!agreedTerms1) {
      setFormError("Bạn cần tích đồng ý với điều khoản vận hành sự kiện để tiếp tục.");
      return;
    }

    setFormError("");
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // click payment button -> validate terms & open recipient info modal
  const handleOpenPaymentModal = () => {
    if (!agreedTerms2) {
      showToast("warning", "Vui lòng đọc kỹ và đồng ý với điều khoản dịch vụ trước khi tiếp tục.");
      return;
    }
    setIsRecipientModalOpen(true);
  };



  // final order submission after recipient info confirmation
  const handleFinalPaymentSubmit = async (recipientData: RecipientInfoData) => {
    try {
      void recipientData;
      setIsSubmitting(true);
      const finalTotalAmount = Math.max(0, subtotalAmount - discountAmount);
      const seatIds = order.seatIds && order.seatIds.length > 0 ? order.seatIds : (order.zoneId ? [order.zoneId] : []);

      // use logged in user ID if available, otherwise fallback to session ID
      const profile = await userApi.getProfile().catch(() => null);
      const userId = profile?.keycloakId || localStorage.getItem("haloticket_session_id") || "ANONYMOUS";
      let bookingId = activeBookingId;
      let bookingCode = activeBookingCode;

      if (!bookingId) {
        const bookingRes = await bookingApi.createBooking({
          eventId: activeEventId || "",
          showtimeId: activeShowtimeId as string,
          customerId: userId,
          customerEmail: recipientData.email,
          customerName: recipientData.recipientName,
          voucherId: appliedVoucher?.id,
          totalAmount: finalTotalAmount,
          seatIds,
          items: order.items,
        });

        bookingId = bookingRes?.id || `booking_${Date.now()}`;
        bookingCode = bookingRes?.bookingCode || `HT-${Math.floor(100000 + Math.random() * 900000)}`;
        setActiveBookingId(bookingId);
        setActiveBookingCode(bookingCode);
      }

      // save to my_tickets cache - 1 physical ticket per seat or per quantity
      const newTickets: any[] = [];
      let globalTicketIdx = 0;
      
      const cartItemsToProcess = (order.cartItems && order.cartItems.length > 0) 
        ? order.cartItems 
        : [{ zoneId: order.zoneId, zoneName: order.ticketTypeName.split("(")[0].trim(), price: finalTotalAmount / (order.quantity || 1), quantity: order.quantity || 1 }];

      cartItemsToProcess.forEach((cartItem: any) => {
        for (let i = 0; i < cartItem.quantity; i++) {
          const seatId = (order.seatIds && order.seatIds.length > globalTicketIdx) ? order.seatIds[globalTicketIdx] : (cartItem.zoneId || "TICKET");
          let seatLabel = order.seatNames?.[seatId];
          let zoneNameStr = cartItem.zoneName || cartItem.tierName || "Vé Sự kiện";
          
          let displayTicketName = zoneNameStr;

          if (order.seatIds && order.seatIds.length > 0) {
             if (!seatLabel) {
               const match = seatId.match(/seat_\d+_(\d+)_(\d+)/);
               if (match) {
                 const rowName = String.fromCharCode(65 + parseInt(match[1], 10));
                 const colName = parseInt(match[2], 10) + 1;
                 seatLabel = `Hàng ${rowName} - Ghế ${colName}`;
               } else {
                 seatLabel = seatId.replace(/seat_\d+_\d+_/, "");
               }
             }
             displayTicketName = `Hạng vé ${zoneNameStr}: ${seatLabel}`;
          } else {
             displayTicketName = `Hạng vé ${zoneNameStr}`;
          }

          newTickets.push({
            id: `${bookingId}-${globalTicketIdx}`,
            bookingCode: `${bookingCode}-${globalTicketIdx+1}`,
            eventId: activeEventId,
            eventTitle: order.eventTitle,
            eventTime: order.eventTime,
            eventLocation: order.eventLocation,
            eventPoster: order.eventPoster,
            ticketTypeName: displayTicketName,
            seatId: seatId,
            quantity: 1,
            totalAmount: cartItem.price,
            customerName: recipientData.recipientName || fullName,
            customerPhone: recipientData.phone || phoneOrCccd,
            customerEmail: recipientData.email || email,
            shippingAddress: `${recipientData.address || ""}, ${recipientData.ward || ""}, ${recipientData.city || ""}`.replace(/^, | , | ,$/g, "").trim(),
            paymentMethod: selectedPaymentMethod,
            purchaseDate: new Date().toISOString(),
            qrCode: `HALOTICKET-${bookingId}-${seatId}-${globalTicketIdx}`,
            status: "UPCOMING"
          });
          globalTicketIdx++;
        }
      });

      const existingMyTickets = JSON.parse(localStorage.getItem("haloticket_my_tickets") || "[]");
      localStorage.setItem("haloticket_my_tickets", JSON.stringify([...newTickets, ...existingMyTickets]));
      
      // save order summary for success screen
      localStorage.setItem("haloticket_last_order", JSON.stringify({
         bookingId: bookingId,
         eventTitle: order.eventTitle,
         ticketTypeName: order.ticketTypeName,
         totalAmount: finalTotalAmount,
         quantity: seatIds.length
      }));
      // option 1: VNPay gateway
      if (selectedPaymentMethod === "vnpay") {
        const vnpayUrl = await paymentApi.createVnPayUrl(
          finalTotalAmount,
          `Thanh toan don hang HaloTicket ${bookingCode}`,
          bookingId
        );
        if (vnpayUrl) {
          window.location.href = vnpayUrl;
          return;
        }
      }

      // option 2: VietQR / SePay fast transfer
      if (selectedPaymentMethod === "vietqr" || selectedPaymentMethod === "sepay") {
        const qrPayload = await paymentApi.createVietQrPayload(finalTotalAmount, bookingCode, bookingId);
        if (qrPayload) {
          setVietQrData(qrPayload);
          setIsRecipientModalOpen(false);
          setIsVietQrModalOpen(true);
          return;
        }
      }

      // option 3: MoMo e-wallet
      if (selectedPaymentMethod === "momo") {
        const momoUrl = await paymentApi.createMoMoUrl(
          finalTotalAmount,
          `Thanh toan don hang HaloTicket ${bookingCode}`,
          bookingId
        );
        if (momoUrl) {
          window.location.href = momoUrl;
          return;
        }
      }

      // option 4: ZaloPay e-wallet
      if (selectedPaymentMethod === "zalopay") {
        const zalopayUrl = await paymentApi.createZaloPayUrl(
          finalTotalAmount,
          `Thanh toan don hang HaloTicket ${bookingCode}`,
          bookingId
        );
        if (zalopayUrl) {
          window.location.href = zalopayUrl;
          return;
        }
      }

      // option 5: ShopeePay e-wallet
      if (selectedPaymentMethod === "shopeepay") {
        const shopeepayUrl = await paymentApi.createShopeePayUrl(
          finalTotalAmount,
          `Thanh toan don hang HaloTicket ${bookingCode}`,
          bookingId
        );
        if (shopeepayUrl) {
          window.location.href = shopeepayUrl;
          return;
        }
      }

      // fallback direct confirmation
      localStorage.removeItem("haloticket_pending_order");
      setIsRecipientModalOpen(false);
      navigate("/booking-success");
    } catch (err: unknown) {
      console.error("Payment error:", err);
      setIsRecipientModalOpen(false);
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message 
        || "Đã xảy ra lỗi trong quá trình xử lý thanh toán. Vui lòng thử lại.";
      showToast("error", errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex-1 app-bg-page app-text-main font-sans selection:bg-blue-600 selection:text-white pb-16">
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Top Event Banner Card with Blurred Background Poster */}
      <div className="relative w-full bg-slate-950 text-white border-b border-slate-800 overflow-hidden shadow-xl">
        {/* Blurred Background Poster Image */}
        {eventPosterUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 filter blur-xl scale-110 pointer-events-none"
            style={{ backgroundImage: `url(${eventPosterUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/70 pointer-events-none" />

        <div className="relative z-10 max-w-[1240px] mx-auto px-6 md:px-16 py-8 md:py-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirmModal(true)}
                className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer mr-1 border border-white/10"
              >
                <FiArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại sự kiện</span>
              </button>
              <span className="px-3.5 py-1 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-wider shadow-sm">
                {step === 1
                  ? hasCustomQuestions
                    ? "BƯỚC 2: ĐIỀN THÔNG TIN"
                    : "BƯỚC 2: XÁC NHẬN THÔNG TIN"
                  : "BƯỚC 3: THANH TOÁN"}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight drop-shadow-md leading-tight">
              {order.eventTitle}
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs md:text-sm font-semibold text-slate-300">
              <span className="flex items-center gap-2">
                <FiClock className="w-4 h-4 text-blue-400" />
                {order.eventTime}
              </span>
              <span className="flex items-center gap-2">
                <FiShield className="w-4 h-4 text-indigo-400" />
                {order.eventLocation}
              </span>
            </div>
          </div>

          {/* 15-Min Timer Red Box */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-rose-500/40 shadow-2xl flex flex-col items-center justify-center min-w-[210px] shrink-0">
            <span className="text-xs font-black text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FiClock className="w-4 h-4 animate-pulse text-rose-400" />
              <span>HOÀN TẤT ĐẶT VÉ TRONG</span>
            </span>
            <div className="flex items-center gap-2 font-mono">
              <span className="w-13 h-11 rounded-xl bg-rose-600 text-white text-2xl font-black flex items-center justify-center shadow-lg tracking-tighter">
                {timerDisplay.m}
              </span>
              <span className="text-2xl font-black text-rose-400 animate-pulse">:</span>
              <span className="w-13 h-11 rounded-xl bg-rose-600 text-white text-2xl font-black flex items-center justify-center shadow-lg tracking-tighter">
                {timerDisplay.s}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-[1240px] mx-auto px-6 md:px-16 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form Area */}
        <div className="lg:col-span-8 space-y-6">
          {/* STEP 1: INFORMATIONAL FORM & CUSTOM QUESTIONNAIRE */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base md:text-lg font-black app-text-main uppercase tracking-wider flex items-center gap-2">
                  <span>{hasCustomQuestions ? "BẢNG CÂU HỎI THÔNG TIN VÉ" : "THÔNG TIN KHÁCH HÀNG NHẬN VÉ"}</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCancelConfirmModal(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition cursor-pointer"
                >
                  <FiArrowLeft />
                  <span>Chọn lại vé</span>
                </button>
              </div>

              <div className="app-bg-card border app-border rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
                {formError && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold flex items-center gap-2">
                    <FiAlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Basic Buyer Information */}
                <div className="space-y-4 pb-6 border-b app-border">
                  <h3 className="text-xs font-black uppercase tracking-wider text-blue-500">
                    Thông tin người đại diện đặt vé
                  </h3>

                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold app-text-main">
                      Họ & Tên <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Điền họ và tên của bạn"
                      className="w-full px-4 py-3 rounded-xl app-bg-main border app-border app-text-main text-xs font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Phone / CCCD */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold app-text-main">
                      Số điện thoại / CCCD <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={phoneOrCccd}
                      onChange={(e) => setPhoneOrCccd(e.target.value)}
                      placeholder="Điền số điện thoại hoặc số CCCD"
                      className="w-full px-4 py-3 rounded-xl app-bg-main border app-border app-text-main text-xs font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold app-text-main">
                      Email nhận vé điện tử <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Dùng để nhận vé điện tử QR Code"
                      className="w-full px-4 py-3 rounded-xl app-bg-main border app-border app-text-main text-xs font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Render Custom Questions if event has custom questions */}
                {hasCustomQuestions && (
                  <div className="space-y-5 pt-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-blue-500">
                      Bảng câu hỏi từ Ban Tổ Chức sự kiện
                    </h3>

                    {customQuestions.map((q, idx) => (
                      <div key={q.id || idx} className="space-y-2 p-4 rounded-2xl app-bg-main border app-border">
                        <label className="block text-xs font-extrabold app-text-main">
                          {idx + 1}. {q.title}{" "}
                          {q.isRequired ? (
                            <span className="text-rose-500 font-black ml-1">*</span>
                          ) : (
                            <span className="text-[10px] app-text-sub font-normal ml-1">(Không bắt buộc)</span>
                          )}
                        </label>

                        {q.description && (
                          <p className="text-[11px] app-text-sub leading-relaxed mb-2">{q.description}</p>
                        )}

                        {/* Render Input Control based on question type */}
                        {q.type === "select" || q.type === "dropdown" ? (
                          <select
                            value={typeof answers[q.id] === "string" ? (answers[q.id] as string) : ""}
                            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl app-bg-card border app-border app-text-main text-xs font-bold focus:outline-none focus:border-blue-500"
                          >
                            <option value="">-- Chọn câu trả lời --</option>
                            {Array.isArray(q.options) ? (
                              q.options.map((opt: string, oIdx: number) => (
                                <option key={oIdx} value={opt}>
                                  {opt}
                                </option>
                              ))
                            ) : (
                              <>
                                <option value="Đồng ý">Đồng ý</option>
                                <option value="Khác">Khác</option>
                              </>
                            )}
                          </select>
                        ) : q.type === "checkbox" ? (
                          <label className="flex items-center gap-2 cursor-pointer pt-1 select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(answers[q.id])}
                              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.checked }))}
                              className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-xs font-bold app-text-main">Xác nhận đồng ý</span>
                          </label>
                        ) : (
                          <input
                            type="text"
                            value={typeof answers[q.id] === "string" ? (answers[q.id] as string) : ""}
                            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                            placeholder="Nhập câu trả lời của bạn..."
                            className="w-full px-4 py-2.5 rounded-xl app-bg-card border app-border app-text-main text-xs font-bold focus:outline-none focus:border-blue-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Mandatory Terms Checkbox */}
                <div className="pt-4 border-t app-border space-y-3">
                  <label className="block text-xs font-bold app-text-sub leading-relaxed">
                    Tôi đồng ý HaloTicket & Ban Tổ Chức sử dụng thông tin đặt vé cho mục đích vận hành sự kiện. <span className="text-rose-500">*</span>
                  </label>

                  <div
                    className="flex items-center gap-3 cursor-pointer select-none"
                    onClick={() => setAgreedTerms1(!agreedTerms1)}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        agreedTerms1 ? "bg-blue-600 border-blue-600 text-white" : "app-border app-bg-main"
                      }`}
                    >
                      {agreedTerms1 && <FiCheck className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-bold app-text-main">Tôi đồng ý</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Tiếp tục thanh toán</span>
                  <span>»</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PAYMENT METHOD SELECTION */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-base md:text-lg font-black app-text-main uppercase tracking-wider">
                CHỌN PHƯƠNG THỨC THANH TOÁN
              </h2>

              {/* Delivery Info & Custom Questions Banner */}
              <div className="app-bg-card border app-border rounded-2xl p-6 space-y-4 shadow-sm">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-blue-500 mb-2">Thông tin người nhận</h3>
                  <div className="space-y-1">
                    <p className="text-xs font-bold app-text-main">
                      Họ tên: <span className="text-blue-600 dark:text-blue-400">{fullName}</span>
                    </p>
                    <p className="text-xs font-bold app-text-main">
                      SĐT / CCCD: <span className="text-blue-600 dark:text-blue-400">{phoneOrCccd}</span>
                    </p>
                    <p className="text-xs font-bold app-text-main">
                      Email nhận vé: <span className="text-blue-600 dark:text-blue-400">{email}</span>
                    </p>
                  </div>
                </div>

                {hasCustomQuestions && (
                  <div className="pt-4 border-t app-border">
                    <h3 className="text-xs font-black uppercase tracking-wider text-blue-500 mb-2">Thông tin khảo sát bổ sung</h3>
                    <div className="space-y-3">
                      {customQuestions.map((q, idx) => (
                        <div key={q.id || idx} className="text-xs">
                          <span className="font-bold app-text-main block mb-1">{idx + 1}. {q.title}</span>
                          <span className="font-extrabold text-blue-600 dark:text-blue-400 pl-3 block">
                            {q.type === 'checkbox' ? (answers[q.id] ? "Đồng ý" : "Không") : (answers[q.id] ? String(answers[q.id]) : "---")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Promo Code Coupon Box */}
              <div className="app-bg-card border app-border rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider app-text-main">Mã khuyến mãi / Voucher</h3>
                    <p className="text-[11px] app-text-sub">Nhập mã ưu đãi giảm giá (Thử: HALO50, HALO100, HALO10)</p>
                  </div>
                  {appliedVoucher && (
                    <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-black">
                      Đã giảm {formatCurrency(discountAmount)}
                    </span>
                  )}
                </div>

                {appliedVoucher ? (
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      Mã đã áp dụng: <strong>{appliedVoucher.code}</strong> (-{formatCurrency(discountAmount)})
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveVoucher}
                      className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                    >
                      Hủy dùng
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={voucherInput}
                      onChange={(e) => {
                        setVoucherInput(e.target.value);
                        setVoucherError("");
                      }}
                      placeholder="Nhập mã voucher (VD: HALO50)"
                      className="flex-1 px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs font-bold focus:outline-none focus:border-blue-500 uppercase font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleApplyVoucher}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <FiTag className="w-3.5 h-3.5" />
                      <span>Áp dụng</span>
                    </button>
                  </div>
                )}

                {voucherError && (
                  <p className="text-[11px] text-rose-500 font-bold">{voucherError}</p>
                )}
              </div>

              {/* Payment Methods Options */}
              <div className="app-bg-card border app-border rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider app-text-main">Phương thức thanh toán</h3>

                <div className="space-y-3">
                  {/* 1. VNPAY */}
                  <label
                    className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                      selectedPaymentMethod === "vnpay"
                        ? "app-bg-main border-blue-500 ring-2 ring-blue-500/30 shadow-sm"
                        : "app-bg-main border app-border hover:border-blue-500/50"
                    }`}
                    onClick={() => setSelectedPaymentMethod("vnpay")}
                  >
                    <input
                      type="radio"
                      name="pm"
                      checked={selectedPaymentMethod === "vnpay"}
                      readOnly
                      className="accent-blue-600 w-4 h-4"
                    />
                    <span className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 font-black text-xs flex items-center justify-center shrink-0 border border-blue-500/20">
                      VNPAY
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs md:text-sm font-extrabold app-text-main block">
                        Cổng VNPAY (Thẻ ATM nội địa / Mã QR Ngân hàng / Internet Banking)
                      </span>
                      <span className="text-[11px] app-text-sub block">Hỗ trợ tất cả ngân hàng tại Việt Nam</span>
                    </div>
                  </label>

                  {/* 3. SePay (VietQR 24/7) */}
                  <label
                    className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                      selectedPaymentMethod === "vietqr" || selectedPaymentMethod === "sepay"
                        ? "app-bg-main border-blue-500 ring-2 ring-blue-500/30 shadow-sm"
                        : "app-bg-main border app-border hover:border-blue-500/50"
                    }`}
                    onClick={() => setSelectedPaymentMethod("vietqr")}
                  >
                    <input
                      type="radio"
                      name="pm"
                      checked={selectedPaymentMethod === "vietqr" || selectedPaymentMethod === "sepay"}
                      readOnly
                      className="accent-blue-600 w-4 h-4"
                    />
                    <span className="w-9 h-9 rounded-xl bg-rose-600/10 text-rose-600 font-black text-xs flex items-center justify-center shrink-0 border border-rose-500/20">
                      SePay
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs md:text-sm font-extrabold app-text-main block">
                        SePay - Chuyển khoản VietQR Nhanh 24/7
                      </span>
                      <span className="text-[11px] app-text-sub block">Quét QR chuyển khoản ngân hàng tự động duyệt tức thì</span>
                    </div>
                  </label>

                  {/* 4. ZaloPay */}
                  <label
                    className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                      selectedPaymentMethod === "zalopay"
                        ? "app-bg-main border-blue-500 ring-2 ring-blue-500/30 shadow-sm"
                        : "app-bg-main border app-border hover:border-blue-500/50"
                    }`}
                    onClick={() => setSelectedPaymentMethod("zalopay")}
                  >
                    <input
                      type="radio"
                      name="pm"
                      checked={selectedPaymentMethod === "zalopay"}
                      readOnly
                      className="accent-blue-600 w-4 h-4"
                    />
                    <span className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 font-black text-xs flex items-center justify-center shrink-0 border border-sky-500/20">
                      Zalo
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs md:text-sm font-extrabold app-text-main block">Ví ZaloPay</span>
                      <span className="text-[11px] app-text-sub block">Thanh toán qua ứng dụng ZaloPay hoặc mã QR</span>
                    </div>
                  </label>

                  {/* 5. ShopeePay */}
                  <label
                    className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                      selectedPaymentMethod === "shopeepay"
                        ? "app-bg-main border-blue-500 ring-2 ring-blue-500/30 shadow-sm"
                        : "app-bg-main border app-border hover:border-blue-500/50"
                    }`}
                    onClick={() => setSelectedPaymentMethod("shopeepay")}
                  >
                    <input
                      type="radio"
                      name="pm"
                      checked={selectedPaymentMethod === "shopeepay"}
                      readOnly
                      className="accent-blue-600 w-4 h-4"
                    />
                    <span className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 font-black text-xs flex items-center justify-center shrink-0 border border-orange-500/20">
                      Shopee
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs md:text-sm font-extrabold app-text-main block">Ví ShopeePay</span>
                      <span className="text-[11px] app-text-sub block">Thanh toán nhanh chóng qua Ví ShopeePay</span>
                    </div>
                  </label>

                  {/* 6. MoMo */}
                  <label
                    className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                      selectedPaymentMethod === "momo"
                        ? "app-bg-main border-blue-500 ring-2 ring-blue-500/30 shadow-sm"
                        : "app-bg-main border app-border hover:border-blue-500/50"
                    }`}
                    onClick={() => setSelectedPaymentMethod("momo")}
                  >
                    <input
                      type="radio"
                      name="pm"
                      checked={selectedPaymentMethod === "momo"}
                      readOnly
                      className="accent-blue-600 w-4 h-4"
                    />
                    <span className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-600 font-black text-xs flex items-center justify-center shrink-0 border border-pink-500/20">
                      MoMo
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs md:text-sm font-extrabold app-text-main block">Ví điện tử MoMo</span>
                      <span className="text-[11px] app-text-sub block">Quét mã QR bằng ứng dụng MoMo</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Order Summary */}
        <div className="lg:col-span-4 space-y-6">
          <div className="app-bg-card app-text-main rounded-3xl p-6 border app-border shadow-xl space-y-5 sticky top-24">
            <div className="flex items-center justify-between border-b app-border pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider app-text-main">Thông tin đặt vé</h3>
              {step === 1 ? (
                <button
                  type="button"
                  onClick={() => setShowCancelConfirmModal(true)}
                  className="text-xs font-bold text-blue-500 hover:underline cursor-pointer"
                >
                  Chọn lại vé
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-blue-500 hover:underline cursor-pointer"
                >
                  Sửa thông tin
                </button>
              )}
            </div>

            {/* Ticket Item Line Breakdown */}
            {order.cartItems && Array.isArray(order.cartItems) && order.cartItems.length > 0 ? (
              <div className="space-y-2">
                {order.cartItems.map((item, idx: number) => {
                  const itemRecord = item as Record<string, unknown>;
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs font-mono py-1 border-b app-border/40 last:border-b-0">
                      <div className="space-y-0.5">
                        <span className="font-extrabold app-text-main block">
                          {String(itemRecord.zoneName || itemRecord.tierName || order.ticketTypeName)}
                        </span>
                        <span className="app-text-sub text-[11px] block">
                          {formatCurrency(Number(itemRecord.price || 0))}
                        </span>
                      </div>
                      <span className="font-extrabold app-text-main font-mono">
                        x0{String(itemRecord.quantity || 1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="space-y-0.5">
                  <span className="font-extrabold app-text-main block">{order.ticketTypeName}</span>
                  <span className="app-text-sub text-[11px] block">{formatCurrency(order.price)}</span>
                </div>
                <span className="font-extrabold app-text-main font-mono">x0{order.quantity}</span>
              </div>
            )}

            {/* Subtotal */}
            <div className="pt-3 border-t app-border flex items-center justify-between text-xs font-mono">
              <span className="font-bold app-text-sub">Tạm tính:</span>
              <span className="font-extrabold text-blue-600 dark:text-blue-400">{formatCurrency(subtotalAmount)}</span>
            </div>

            {/* Step 2 Order Total Summary */}
            {step === 2 && (
              <div className="pt-3 border-t app-border space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="app-text-sub">Giảm giá:</span>
                  <span className="text-rose-500 font-bold">-{formatCurrency(discountAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-mono pt-2 border-t app-border">
                  <span className="font-extrabold app-text-main">Tổng tiền:</span>
                  <span className="font-black text-blue-600 dark:text-blue-400 text-base">
                    {formatCurrency(finalTotal)}
                  </span>
                </div>

                <div className="pt-2 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="terms2"
                    checked={agreedTerms2}
                    onChange={(e) => setAgreedTerms2(e.target.checked)}
                    className="accent-blue-600 w-4 h-4 mt-0.5"
                  />
                  <label htmlFor="terms2" className="text-[10px] app-text-sub leading-tight cursor-pointer select-none">
                    Bằng việc nhấn Thanh toán, bạn đồng ý với <span className="text-blue-500 underline">Điều khoản dịch vụ HaloTicket</span>.
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleOpenPaymentModal}
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <span>{isSubmitting ? "Đang xử lý..." : `Thanh toán (${formatCurrency(finalTotal)})`}</span>
                  <span>»</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recipient Information Confirmation Modal (iamge 3) */}
      <UpdateRecipientInfoModal
        isOpen={isRecipientModalOpen}
        onClose={() => setIsRecipientModalOpen(false)}
        onConfirm={handleFinalPaymentSubmit}
        initialData={{
          fullName,
          phone: phoneOrCccd,
          email,
        }}
        isLoading={isSubmitting}
      />

      {/* VietQR Payment Modal */}
      <VietQrModal
        isOpen={isVietQrModalOpen}
        onClose={() => setIsVietQrModalOpen(false)}
        bookingId={activeBookingId}
        vietQrData={vietQrData}
        expiresAt={expiresAtTimestamp}
        onSuccess={() => {
          localStorage.removeItem("haloticket_pending_order");
          setIsVietQrModalOpen(false);
          navigate("/booking-success");
        }}
        onTimeout={() => {
          // Release seats on timeout
          const userId = localStorage.getItem("haloticket_session_id");
          if (userId && order?.seatIds) {
            order.seatIds.forEach((seatId: string) => {
              bookingApi.releaseSeat({ eventId: activeEventId as string, seatId, userId }).catch(console.error);
            });
          }
          localStorage.removeItem("haloticket_pending_order");
          setIsVietQrModalOpen(false);
          showToast("error", "Đã hết thời gian thanh toán (15 phút). Đơn hàng đã tự động hủy.");
          navigate(`/events/${activeEventId}`);
        }}
      />

      {/* Cancel Order Confirm Modal (image 1) */}
      <CancelOrderModal
        open={showCancelConfirmModal}
        onCancelOrder={() => {
          // Release seats when cancelled manually
          const userId = localStorage.getItem("haloticket_session_id");
          if (userId && order?.seatIds) {
            order.seatIds.forEach((seatId: string) => {
              bookingApi.releaseSeat({ eventId: activeEventId as string, seatId, userId }).catch(console.error);
            });
          }
          localStorage.removeItem("haloticket_pending_order");
          setShowCancelConfirmModal(false);
          navigate(`/events/${activeEventId}`);
        }}
        onStay={() => setShowCancelConfirmModal(false)}
      />

      {/* Modal hết thời gian giữ vé (Ảnh 1) */}
      <TicketHoldTimeoutModal
        open={isTimeoutModalOpen}
        onReset={() => {
          localStorage.removeItem("haloticket_pending_order");
          setIsTimeoutModalOpen(false);
          navigate(`/events/${activeEventId}`);
        }}
        title="Hết thời gian giữ vé!"
        message="Đã hết thời gian giữ vé. Vui lòng đặt lại vé mới."
        buttonText="Đặt vé mới"
      />
    </div>
  );
}
