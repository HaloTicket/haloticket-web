import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiClock, FiCheck, FiShield, FiTag, FiCreditCard, FiAlertCircle } from "react-icons/fi";
import { formatCurrency } from "@/utils/formatters";
import type { BookingOrderData } from "@/types";
import type { CustomQuestionItem } from "@/types/organizer";
import { eventApi } from "@/services/eventApi";
import { bookingApi } from "@/services/bookingApi";
import { paymentApi } from "@/services/paymentApi";
import ConfirmModal from "@/components/common/ConfirmModal";
import UpdateRecipientInfoModal, { type RecipientInfoData } from "./components/UpdateRecipientInfoModal";
import { ToastContainer, type ToastMessage } from "@/features/organizer/event-manage/components/seating/SeatingToast";

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventIdParam = searchParams.get("eventId");

  // load pending order data from localStorage or fallback
  const [order] = useState<BookingOrderData & { eventPoster?: string | null; cartItems?: any[] }>(() => {
    try {
      const saved = localStorage.getItem("haloticket_pending_order");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      eventId: eventIdParam || "e1",
      eventTitle: "HALOTICKET 2026 - EVENT CONCERT",
      eventTime: "19:00 - 23:59, 20/09/2026",
      eventLocation: "Sân vận động Quốc gia Mỹ Đình",
      ticketTypeName: "Vé VIP (Standing)",
      price: 2000000,
      quantity: 1,
      totalAmount: 2000000,
      eventPoster: null,
    };
  });

  const activeEventId = eventIdParam || order.eventId;

  // flow step: 1 = Info & Questions, 2 = Payment
  const [step, setStep] = useState<1 | 2>(1);

  // toasts state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (type: "success" | "error" | "warning" | "info", text: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // browser back button cancel confirmation modal state (image 1)
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);

  // recipient info modal state (image 3)
  const [isRecipientModalOpen, setIsRecipientModalOpen] = useState(false);

  // custom questions loaded from event-service
  const [customQuestions, setCustomQuestions] = useState<CustomQuestionItem[]>([]);
  const [eventPosterUrl, setEventPosterUrl] = useState<string | null>(order.eventPoster || null);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  // 15-minute countdown timer
  const [timeLeft, setTimeLeft] = useState<number>(14 * 60 + 50);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
        const ev: any = await eventApi.getEventById(activeEventId);
        if (isMounted && ev) {
          const poster = ev.thumbnailUrl || ev.posterImage || ev.bannerUrl || ev.image || null;
          if (poster) setEventPosterUrl(poster);

          // Parse customQuestions from backend
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

  // questionnaire form state (step 1)
  const [fullName, setFullName] = useState("Trần Vũ");
  const [phoneOrCccd, setPhoneOrCccd] = useState("0901234567");
  const [email, setEmail] = useState("vutkd23405@gmail.com");
  const [agreedTerms1, setAgreedTerms1] = useState(false);
  const [formError, setFormError] = useState("");

  // payment state (step 2)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("vnpay");
  const [discountAmount] = useState(0);
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

  // click payment button -> validate terms & open recipient info modal (image 3)
  const handleOpenPaymentModal = () => {
    if (!agreedTerms2) {
      showToast("warning", "Vui lòng đọc kỹ và đồng ý với điều khoản dịch vụ trước khi tiếp tục.");
      return;
    }
    setIsRecipientModalOpen(true);
  };

  // final order submission after recipient info confirmation (image 3 -> image 4 VNPay)
  const handleFinalPaymentSubmit = async (recipientData: RecipientInfoData) => {
    try {
      setIsSubmitting(true);
      const finalTotalAmount = Math.max(0, order.totalAmount - discountAmount);
      const seatIds = order.zoneId ? [order.zoneId] : [];

      // call real bookingApi backend
      const bookingRes = await bookingApi.createBooking({
        eventId: activeEventId,
        totalAmount: finalTotalAmount,
        seatIds,
      });

      const bookingId = bookingRes?.id || `booking_${Date.now()}`;

      // if vnpay selected, generate vnpay payment url & redirect (image 4)
      if (selectedPaymentMethod === "vnpay") {
        const vnpayUrl = await paymentApi.createVnPayUrl(
          finalTotalAmount,
          `Thanh toan don hang HaloTicket ${bookingRes?.bookingCode || bookingId}`,
          bookingId
        );

        if (vnpayUrl) {
          window.location.href = vnpayUrl;
          return;
        }
      }

      // fallback local save if direct confirmation
      const confirmedTicket = {
        id: bookingId,
        bookingCode: bookingRes?.bookingCode || `HT-${Math.floor(100000 + Math.random() * 900000)}`,
        eventTitle: order.eventTitle,
        eventTime: order.eventTime,
        eventLocation: order.eventLocation,
        ticketTypeName: order.ticketTypeName,
        quantity: order.quantity,
        totalAmount: finalTotalAmount,
        customerName: recipientData.recipientName || fullName,
        customerPhone: recipientData.phone || phoneOrCccd,
        customerEmail: recipientData.email || email,
        shippingAddress: `${recipientData.address}, ${recipientData.ward}, ${recipientData.city}`,
        paymentMethod: selectedPaymentMethod,
        purchaseDate: new Date().toISOString(),
        qrCode: `HALOTICKET-${bookingId}`,
      };

      const existingMyTickets = JSON.parse(localStorage.getItem("haloticket_my_tickets") || "[]");
      localStorage.setItem("haloticket_my_tickets", JSON.stringify([confirmedTicket, ...existingMyTickets]));
      localStorage.removeItem("haloticket_pending_order");

      setIsRecipientModalOpen(false);
      navigate("/booking-success");
    } catch (err) {
      console.error("Payment error:", err);
      setIsRecipientModalOpen(false);
      showToast("error", "Đã xảy ra lỗi trong quá trình xử lý thanh toán. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const finalTotal = Math.max(0, order.totalAmount - discountAmount);

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
              <h2 className="text-base md:text-lg font-black app-text-main uppercase tracking-wider flex items-center gap-2">
                <span>{hasCustomQuestions ? "BẢNG CÂU HỎI THÔNG TIN VÉ" : "THÔNG TIN KHÁCH HÀNG NHẬN VÉ"}</span>
              </h2>

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
                            value={answers[q.id] || ""}
                            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl app-bg-card border app-border app-text-main text-xs font-bold focus:outline-none focus:border-blue-500"
                          >
                            <option value="">-- Chọn câu trả lời --</option>
                            {(q as any).options?.map((opt: string, oIdx: number) => (
                              <option key={oIdx} value={opt}>
                                {opt}
                              </option>
                            )) || (
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
                            value={answers[q.id] || ""}
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

              {/* Delivery Email Banner */}
              <div className="app-bg-card border app-border rounded-2xl p-6 space-y-1 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-500">Thông tin nhận vé</h3>
                <p className="text-xs font-bold app-text-main">
                  Vé điện tử sẽ được gửi về Email: <span className="text-blue-600 dark:text-blue-400">{email}</span>
                </p>
              </div>

              {/* Promo Code Coupon Box */}
              <div className="app-bg-card border app-border rounded-2xl p-6 flex items-center justify-between shadow-sm">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider app-text-main">Mã khuyến mãi</h3>
                  <p className="text-xs app-text-sub">Nhập mã ưu đãi hoặc voucher giảm giá</p>
                </div>
                <button
                  type="button"
                  onClick={() => showToast("info", "Tính năng mã giảm giá sẵn sàng áp dụng.")}
                  className="px-4 py-2 rounded-xl app-bg-main border app-border hover:border-blue-500 text-xs font-extrabold app-text-brand flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <FiTag className="w-4 h-4" />
                  <span>+ Thêm khuyến mãi</span>
                </button>
              </div>

              {/* Payment Methods Options */}
              <div className="app-bg-card border app-border rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider app-text-main">Phương thức thanh toán</h3>

                <div className="space-y-3">
                  {/* VNPAY */}
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
                    <span className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 font-black text-xs flex items-center justify-center shrink-0">
                      VN
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs md:text-sm font-extrabold app-text-main block">
                        Cổng VNPAY (Thẻ ATM nội địa / Mã QR Ngân hàng / Internet Banking)
                      </span>
                      <span className="text-[11px] app-text-sub block">Hỗ trợ tất cả ngân hàng tại Việt Nam</span>
                    </div>
                  </label>

                  {/* VietQR */}
                  <label
                    className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                      selectedPaymentMethod === "vietqr"
                        ? "app-bg-main border-blue-500 ring-2 ring-blue-500/30 shadow-sm"
                        : "app-bg-main border app-border hover:border-blue-500/50"
                    }`}
                    onClick={() => setSelectedPaymentMethod("vietqr")}
                  >
                    <input
                      type="radio"
                      name="pm"
                      checked={selectedPaymentMethod === "vietqr"}
                      readOnly
                      className="accent-blue-600 w-4 h-4"
                    />
                    <span className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 font-black text-xs flex items-center justify-center shrink-0">
                      QR
                    </span>
                    <span className="text-xs md:text-sm font-extrabold app-text-main">
                      Chuyển khoản VietQR Nhanh 24/7
                    </span>
                  </label>

                  {/* ShopeePay */}
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
                    <span className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 font-black text-xs flex items-center justify-center shrink-0">
                      SP
                    </span>
                    <span className="text-xs md:text-sm font-extrabold app-text-main">Ví ShopeePay</span>
                  </label>

                  {/* Zalopay */}
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
                    <span className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 font-black text-xs flex items-center justify-center shrink-0">
                      ZP
                    </span>
                    <span className="text-xs md:text-sm font-extrabold app-text-main">Ví ZaloPay</span>
                  </label>

                  {/* Credit Card */}
                  <label
                    className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                      selectedPaymentMethod === "card"
                        ? "app-bg-main border-blue-500 ring-2 ring-blue-500/30 shadow-sm"
                        : "app-bg-main border app-border hover:border-blue-500/50"
                    }`}
                    onClick={() => setSelectedPaymentMethod("card")}
                  >
                    <input
                      type="radio"
                      name="pm"
                      checked={selectedPaymentMethod === "card"}
                      readOnly
                      className="accent-blue-600 w-4 h-4"
                    />
                    <FiCreditCard className="w-5 h-5 text-indigo-500 shrink-0" />
                    <span className="text-xs md:text-sm font-extrabold app-text-main">
                      Thẻ tín dụng / Thẻ ghi nợ Quốc tế (Visa, Mastercard, JCB)
                    </span>
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
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-blue-500 hover:underline cursor-pointer"
                >
                  Sửa thông tin
                </button>
              )}
            </div>

            {/* Ticket Item Line */}
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="space-y-0.5">
                <span className="font-extrabold app-text-main block">{order.ticketTypeName}</span>
                <span className="app-text-sub text-[11px] block">{formatCurrency(order.price)}</span>
              </div>
              <span className="font-extrabold app-text-main">x0{order.quantity}</span>
            </div>

            {/* Subtotal */}
            <div className="pt-3 border-t app-border flex items-center justify-between text-xs font-mono">
              <span className="font-bold app-text-sub">Tạm tính:</span>
              <span className="font-extrabold text-blue-600 dark:text-blue-400">{formatCurrency(order.totalAmount)}</span>
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

      {/* Cancel Order Confirm Modal (image 1) */}
      {showCancelConfirmModal && (
        <ConfirmModal
          isOpen={showCancelConfirmModal}
          title="Hủy đơn hàng?"
          type="danger"
          confirmText="Hủy đơn"
          cancelText="Ở lại"
          confirmButtonVariant="px-5 py-1.5 rounded-xl border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 app-bg-card font-extrabold shadow-none cursor-pointer"
          cancelButtonVariant="px-5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-md cursor-pointer"
          onConfirm={() => {
            localStorage.removeItem("haloticket_pending_order");
            setShowCancelConfirmModal(false);
            navigate(`/events/${activeEventId}`);
          }}
          onCancel={() => setShowCancelConfirmModal(false)}
        >
          <div className="space-y-3 text-xs font-semibold app-text-main">
            <p className="font-extrabold text-sm">Bạn có chắc chắn muốn tiếp tục?</p>
            <ul className="list-disc pl-5 space-y-1 app-text-sub font-medium leading-relaxed">
              <li>Bạn sẽ mất vị trí mình đã lựa chọn.</li>
              <li>Đơn hàng đang trong quá trình thanh toán hoặc đã thanh toán thành công cũng có thể bị huỷ.</li>
            </ul>
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}
