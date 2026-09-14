import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiClock, FiCheck, FiShield, FiTag, FiCreditCard } from "react-icons/fi";
import { formatCurrency } from "@/utils/formatters";
import type { BookingOrderData } from "@/types";

export default function Checkout() {
  const navigate = useNavigate();

  // load pending order data from localStorage or fallback
  const [order, _setOrder] = useState<BookingOrderData>(() => {
    try {
      const saved = localStorage.getItem("haloticket_pending_order");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      eventId: "e1",
      eventTitle: "[CONCERT] ANH TRAI VƯỢT NGÀN CHÔNG GAI 2026 - DAY 1 & DAY 2",
      eventTime: "19:00 - 23:59, 18 Tháng 10, 2026",
      eventLocation: "KĐT Phú Long - Bình Trưng Và The Global City",
      ticketTypeName: "Hoả Lệnh 2 (Standing)",
      price: 2000000,
      quantity: 1,
      totalAmount: 2000000,
    };
  });

  // flow step: 1 = questionnaire (bảng câu hỏi), 2 = payment (thanh toán)
  const [step, setStep] = useState<1 | 2>(1);

  // 15-minute countdown timer (900 seconds)
  const [timeLeft, setTimeLeft] = useState<number>(14 * 60 + 35);

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

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return {
      m: mins < 10 ? `0${mins}` : `${mins}`,
      s: secs < 10 ? `0${secs}` : `${secs}`,
    };
  };

  const timerDisplay = formatTimer(timeLeft);

  // questionnaire state (step 1)
  const [fullName, setFullName] = useState("");
  const [phoneOrCccd, setPhoneOrCccd] = useState("");
  const [email, setEmail] = useState("vutkd23405@gmail.com");
  const [agreedTerms1, setAgreedTerms1] = useState(false);
  const [formError, setFormError] = useState("");

  // payment state (step 2)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("vnpay");
  const [voucherCode, setVoucherCode] = useState("");
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [agreedTerms2, setAgreedTerms2] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // validate step 1
  const handleProceedToPayment = () => {
    if (!fullName.trim()) {
      setFormError("Vui lòng nhập Họ & Tên của bạn.");
      return;
    }
    if (!phoneOrCccd.trim()) {
      setFormError("Vui lòng nhập Số điện thoại hoặc Căn cước công dân.");
      return;
    }
    if (!email.trim()) {
      setFormError("Vui lòng nhập Email chính xác.");
      return;
    }
    if (!agreedTerms1) {
      setFormError("Bạn cần đồng ý với điều khoản vận hành sự kiện để tiếp tục.");
      return;
    }

    setFormError("");
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // final order submission (step 2)
  const handleFinalPayment = async () => {
    if (!agreedTerms2) {
      alert("Vui lòng xác nhận đồng ý với điều khoản sử dụng nền tảng trước khi thanh toán.");
      return;
    }

    try {
      setIsSubmitting(true);
      // simulate booking confirmation API call
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // save confirmed ticket order summary for myTickets page
      const confirmedTicket = {
        id: `ticket_${Date.now()}`,
        eventTitle: order.eventTitle,
        eventTime: order.eventTime,
        eventLocation: order.eventLocation,
        ticketTypeName: order.ticketTypeName,
        quantity: order.quantity,
        totalAmount: order.totalAmount - discountAmount,
        customerName: fullName,
        customerEmail: email,
        paymentMethod: selectedPaymentMethod,
        purchaseDate: new Date().toISOString(),
        qrCode: `HALOTICKET-${Date.now()}`,
      };

      const existingMyTickets = JSON.parse(localStorage.getItem("haloticket_my_tickets") || "[]");
      localStorage.setItem("haloticket_my_tickets", JSON.stringify([confirmedTicket, ...existingMyTickets]));
      localStorage.removeItem("haloticket_pending_order");

      navigate("/booking-success");
    } catch {
      alert("Đã xảy ra lỗi trong quá trình xử lý thanh toán. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const finalTotal = Math.max(0, order.totalAmount - discountAmount);

  return (
    <div className="w-full flex-1 app-bg-page app-text-main font-sans selection:bg-brand-primary selection:text-white pb-16">
      {/* Sub-Header / Event Header Banner with Countdown Box */}
      <div className="w-full app-bg-card border-b app-border px-6 md:px-16 py-8">
        <div className="max-w-[1240px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg gradient-btn text-white text-[11px] font-extrabold uppercase">
                {step === 1 ? "Bước 2: Điền thông tin" : "Bước 3: Thanh toán"}
              </span>
            </div>
            <h1 className="text-lg md:text-2xl font-extrabold app-text-main uppercase tracking-tight">
              {order.eventTitle}
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs md:text-sm app-text-sub">
              <span className="flex items-center gap-2">
                <FiClock className="w-4 h-4 app-text-brand" />
                {order.eventTime}
              </span>
              <span className="flex items-center gap-2">
                <FiShield className="w-4 h-4 app-text-brand" />
                {order.eventLocation}
              </span>
            </div>
          </div>

          {/* 15-Min Timer Red Box */}
          <div className="app-bg-page rounded-2xl p-4 border app-border flex flex-col items-center justify-center min-w-[180px] shadow-sm shrink-0">
            <span className="text-[11px] font-bold app-text-sub uppercase tracking-wider mb-2">Hoàn tất đặt vé trong</span>
            <div className="flex items-center gap-2 font-mono">
              <span className="w-12 h-10 rounded-xl bg-rose-500 text-white text-xl font-black flex items-center justify-center shadow-md">
                {timerDisplay.m}
              </span>
              <span className="text-xl font-bold app-text-main">:</span>
              <span className="w-12 h-10 rounded-xl bg-rose-500 text-white text-xl font-black flex items-center justify-center shadow-md">
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
          {/* STEP 1: BẢNG CÂU HỎI */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-black app-text-brand uppercase tracking-wider">
                BẢNG CÂU HỎI THÔNG TIN VÉ
              </h2>

              <div className="app-bg-card border app-border rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
                {formError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold">
                    {formError}
                  </div>
                )}

                {/* Question 1: Full Name */}
                <div className="space-y-2">
                  <label className="block text-xs font-extrabold app-text-main uppercase">
                    Họ & Tên <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] app-text-sub">Full Name</p>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Điền họ và tên của bạn"
                    className="w-full px-4 py-3 rounded-xl app-bg-page border app-border app-text-main text-sm focus:outline-none focus:border-brand-primary transition-colors"
                  />
                </div>

                {/* Question 2: Phone / Citizen ID */}
                <div className="space-y-2">
                  <label className="block text-xs font-extrabold app-text-main uppercase">
                    Số điện thoại/Căn cước công dân <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] app-text-sub">Phone number/ID number</p>
                  <input
                    type="text"
                    value={phoneOrCccd}
                    onChange={(e) => setPhoneOrCccd(e.target.value)}
                    placeholder="Điền số điện thoại hoặc CCCD"
                    className="w-full px-4 py-3 rounded-xl app-bg-page border app-border app-text-main text-sm focus:outline-none focus:border-brand-primary transition-colors"
                  />
                </div>

                {/* Question 3: Email */}
                <div className="space-y-2">
                  <label className="block text-xs font-extrabold app-text-main uppercase">
                    Email nhận vé <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Điền email nhận vé"
                    className="w-full px-4 py-3 rounded-xl app-bg-page border app-border app-text-main text-sm focus:outline-none focus:border-brand-primary transition-colors"
                  />
                </div>

                {/* Mandatory Agreement Checkbox */}
                <div className="pt-4 border-t app-border space-y-3">
                  <label className="block text-xs font-bold app-text-sub leading-relaxed">
                    Tôi đồng ý HaloTicket & BTC sử dụng thông tin đặt vé nhằm mục đích vận hành sự kiện và xuất hóa đơn. <span className="text-rose-500">*</span>
                  </label>

                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => setAgreedTerms1(!agreedTerms1)}>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${agreedTerms1 ? "bg-brand-primary border-brand-primary text-white" : "app-border app-bg-page"}`}>
                      {agreedTerms1 && <FiCheck className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-bold app-text-main">Tôi đồng ý</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: THANH TOÁN */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-black app-text-brand uppercase tracking-wider">
                CHỌN PHƯƠNG THỨC THANH TOÁN
              </h2>

              {/* Delivery Info */}
              <div className="app-bg-card border app-border rounded-2xl p-6 space-y-2 shadow-sm">
                <h3 className="text-sm font-extrabold app-text-main">Thông tin nhận vé</h3>
                <p className="text-xs app-text-sub">
                  Vé điện tử sẽ được hiển thị trong mục &quot;Vé của tôi&quot; của tài khoản <span className="app-text-brand font-bold">{email}</span>
                </p>
              </div>

              {/* Promo Code Coupon Box */}
              <div className="app-bg-card border app-border rounded-2xl p-6 flex items-center justify-between shadow-sm">
                <div>
                  <h3 className="text-sm font-extrabold app-text-main">Mã khuyến mãi</h3>
                  <p className="text-xs app-text-sub">Nhập mã ưu đãi hoặc voucher giảm giá</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(true)}
                  className="px-4 py-2 rounded-xl app-bg-page border app-border hover:border-brand-primary text-xs font-extrabold app-text-brand flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <FiTag className="w-4 h-4" />
                  <span>+ Thêm khuyến mãi</span>
                </button>
              </div>

              {/* Payment Methods */}
              <div className="app-bg-card border app-border rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="text-sm font-extrabold app-text-main">Phương thức thanh toán</h3>

                <div className="space-y-3">
                  {/* VNPAY */}
                  <label
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedPaymentMethod === "vnpay"
                      ? "app-bg-page border-brand-primary shadow-sm"
                      : "app-bg-page border-transparent hover:app-border"
                      }`}
                    onClick={() => setSelectedPaymentMethod("vnpay")}
                  >
                    <input type="radio" name="pm" checked={selectedPaymentMethod === "vnpay"} readOnly className="accent-indigo-600 w-4 h-4" />
                    <span className="w-7 h-7 rounded-md bg-blue-500/10 text-blue-600 font-black text-xs flex items-center justify-center">VN</span>
                    <span className="text-xs md:text-sm font-bold app-text-main">VNPAY / Ứng dụng ngân hàng</span>
                  </label>

                  {/* VietQR */}
                  <label
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedPaymentMethod === "vietqr"
                      ? "app-bg-page border-brand-primary shadow-sm"
                      : "app-bg-page border-transparent hover:app-border"
                      }`}
                    onClick={() => setSelectedPaymentMethod("vietqr")}
                  >
                    <input type="radio" name="pm" checked={selectedPaymentMethod === "vietqr"} readOnly className="accent-indigo-600 w-4 h-4" />
                    <span className="w-7 h-7 rounded-md bg-rose-500/10 text-rose-600 font-black text-xs flex items-center justify-center">QR</span>
                    <span className="text-xs md:text-sm font-bold app-text-main">VietQR</span>
                  </label>

                  {/* ShopeePay */}
                  <label
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedPaymentMethod === "shopeepay"
                      ? "app-bg-page border-brand-primary shadow-sm"
                      : "app-bg-page border-transparent hover:app-border"
                      }`}
                    onClick={() => setSelectedPaymentMethod("shopeepay")}
                  >
                    <input type="radio" name="pm" checked={selectedPaymentMethod === "shopeepay"} readOnly className="accent-indigo-600 w-4 h-4" />
                    <span className="w-7 h-7 rounded-md bg-orange-500/10 text-orange-600 font-black text-xs flex items-center justify-center">SP</span>
                    <span className="text-xs md:text-sm font-bold app-text-main">ShopeePay</span>
                  </label>

                  {/* Zalopay */}
                  <label
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedPaymentMethod === "zalopay"
                      ? "app-bg-page border-brand-primary shadow-sm"
                      : "app-bg-page border-transparent hover:app-border"
                      }`}
                    onClick={() => setSelectedPaymentMethod("zalopay")}
                  >
                    <input type="radio" name="pm" checked={selectedPaymentMethod === "zalopay"} readOnly className="accent-indigo-600 w-4 h-4" />
                    <span className="w-7 h-7 rounded-md bg-sky-500/10 text-sky-600 font-black text-xs flex items-center justify-center">ZP</span>
                    <span className="text-xs md:text-sm font-bold app-text-main">Zalopay</span>
                  </label>

                  {/* Credit/Debit Card */}
                  <label
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedPaymentMethod === "card"
                      ? "app-bg-page border-brand-primary shadow-sm"
                      : "app-bg-page border-transparent hover:app-border"
                      }`}
                    onClick={() => setSelectedPaymentMethod("card")}
                  >
                    <input type="radio" name="pm" checked={selectedPaymentMethod === "card"} readOnly className="accent-indigo-600 w-4 h-4" />
                    <FiCreditCard className="w-5 h-5 text-indigo-500" />
                    <span className="text-xs md:text-sm font-bold app-text-main">Thẻ ghi nợ/Thẻ tín dụng (Visa, Mastercard, JCB)</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Order Summary */}
        <div className="lg:col-span-4 space-y-6">
          <div className="app-bg-card app-text-main rounded-2xl p-6 border app-border shadow-xl space-y-5 sticky top-24">
            <div className="flex items-center justify-between border-b app-border pb-3">
              <h3 className="text-sm font-extrabold app-text-main">Thông tin đặt vé</h3>
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold app-text-brand hover:underline cursor-pointer"
                >
                  Sửa câu hỏi
                </button>
              )}
            </div>

            {/* Ticket Line Item */}
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="space-y-0.5">
                <span className="font-extrabold app-text-main block">{order.ticketTypeName}</span>
                <span className="app-text-sub text-[11px] block">{formatCurrency(order.price)}</span>
              </div>
              <span className="font-extrabold app-text-main">0{order.quantity}</span>
            </div>

            {/* Subtotal */}
            <div className="pt-3 border-t app-border flex items-center justify-between text-xs font-mono">
              <span className="font-bold app-text-sub">Tạm tính 1 ghế</span>
              <span className="font-extrabold app-text-brand">{formatCurrency(order.totalAmount)}</span>
            </div>

            {/* Step 2 Order Total Summary */}
            {step === 2 && (
              <div className="pt-3 border-t app-border space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="app-text-sub">Giảm giá</span>
                  <span className="text-rose-500 font-bold">-{formatCurrency(discountAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-mono pt-2 border-t app-border">
                  <span className="font-extrabold app-text-main">Tổng tiền</span>
                  <span className="font-black app-text-brand text-base">{formatCurrency(finalTotal)}</span>
                </div>

                <div className="pt-3 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="terms2"
                    checked={agreedTerms2}
                    onChange={(e) => setAgreedTerms2(e.target.checked)}
                    className="accent-indigo-600 w-4 h-4 mt-0.5"
                  />
                  <label htmlFor="terms2" className="text-[10px] app-text-sub leading-tight cursor-pointer">
                    Bằng việc tiến hành đặt mua, bạn đã đồng ý với <span className="app-text-brand underline">Điều khoản dịch vụ HaloTicket</span>.
                  </label>
                </div>
              </div>
            )}

            {/* Submit Action Button */}
            {step === 1 ? (
              <button
                type="button"
                onClick={handleProceedToPayment}
                className="w-full py-3.5 rounded-xl gradient-btn text-white font-extrabold text-xs shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Tiếp tục thanh toán</span>
                <span>»</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalPayment}
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl gradient-btn text-white font-extrabold text-xs shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? "Đang xử lý..." : "Xác nhận thanh toán"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Voucher Promo Modal */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm app-bg-card app-text-main border app-border rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold app-text-main">Nhập Mã Khuyến Mãi</h3>
            <input
              type="text"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value)}
              placeholder="Nhập mã voucher (ví dụ: HALO10)"
              className="w-full px-4 py-2.5 rounded-xl app-bg-page border app-border app-text-main text-sm font-mono focus:outline-none focus:border-brand-primary"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsVoucherModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold app-text-sub hover:app-bg-page"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (voucherCode.trim().toUpperCase() === "HALO10" || voucherCode.trim() !== "") {
                    setDiscountAmount(200000);
                    alert("Áp dụng mã giảm giá 200.000 đ thành công!");
                  }
                  setIsVoucherModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl gradient-btn text-white text-xs font-bold hover:scale-105 transition-all"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
