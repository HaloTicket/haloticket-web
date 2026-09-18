import { useEffect, useState } from "react";
import { FiAlertTriangle, FiArrowLeft, FiCalendar, FiCheckCircle, FiClock, FiMapPin, FiShield, FiX } from "react-icons/fi";
import { Link, useNavigate, useParams } from "react-router-dom";

import { eventApi } from "@/services/eventApi";
import { marketplaceApi } from "@/services/marketplaceApi";
import { paymentApi } from "@/services/paymentApi";
import type { ResaleReservation, TicketListing } from "@/types/marketplace";

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);

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

type CheckoutStep = "select" | "reserve" | "payment";

function ReservationSummary({
  ticketTier,
  quantity,
  price,
  totalAmount,
  actionLabel,
  actionDisabled,
  actionLoading,
  onAction,
}: {
  ticketTier: string;
  quantity: number;
  price: number;
  totalAmount: number;
  actionLabel: "Tiếp tục" | "Thanh toán";
  actionDisabled?: boolean;
  actionLoading?: boolean;
  onAction: () => void;
}) {
  return (
    <aside className="h-fit rounded-xl border app-border app-bg-card p-5 shadow-sm lg:sticky lg:top-6" aria-label="Thông tin đặt vé">
      <h2 className="border-b app-border pb-3 text-lg font-bold app-text-main">Thông tin đặt vé</h2>
      <div className="mt-4 flex items-start justify-between gap-4 text-sm">
        <div>
          <p className="font-semibold app-text-main">{ticketTier}</p>
          <p className="mt-1 text-xs app-text-muted">{money(price)} / vé</p>
        </div>
        <p className="font-semibold app-text-main">{String(quantity).padStart(2, "0")}</p>
      </div>
      <div className="mt-4 flex items-center justify-between border-t app-border pt-4 text-sm">
        <span className="font-semibold app-text-main">Tạm tính {quantity} vé</span>
        <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{money(totalAmount)}</span>
      </div>
      <button
        type="button"
        disabled={actionDisabled || actionLoading}
        onClick={onAction}
        className="mt-5 w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700"
      >
        {actionLoading ? "Đang xử lý…" : actionLabel}
      </button>
    </aside>
  );
}

export const ResaleTicketCheckout = () => {
  const { eventId = "", ticketId = "" } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState<TicketListing | null>(null);
  const [event, setEvent] = useState<Record<string, unknown> | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [selected, setSelected] = useState(false);
  const [error, setError] = useState("");
  const [reserving, setReserving] = useState(false);
  const [reservation, setReservation] = useState<ResaleReservation | null>(null);
  const [step, setStep] = useState<CheckoutStep>("select");
  const [customQuestions, setCustomQuestions] = useState<Array<Record<string, any>>>([]);
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [questionError, setQuestionError] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"VNPAY" | "MOMO" | "ZALOPAY">("VNPAY");
  const [paying, setPaying] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
    Promise.all([marketplaceApi.getListing(ticketId), eventApi.getEventById(eventId)])
      .then(([listingData, eventData]) => {
        setListing(listingData);
        setEvent(eventData);
      })
      .catch(() => setError("Vé này không còn khả dụng hoặc đã được người khác mua."));
  }, [eventId, ticketId]);

  useEffect(() => {
    const rawQuestions = event?.customQuestions ?? event?.questions;
    if (Array.isArray(rawQuestions)) {
      setCustomQuestions(rawQuestions.filter((item): item is Record<string, any> => Boolean(item && typeof item === "object")));
      return;
    }
    if (typeof rawQuestions === "string") {
      try {
        const parsed = JSON.parse(rawQuestions);
        setCustomQuestions(Array.isArray(parsed) ? parsed : []);
      } catch {
        setCustomQuestions([]);
      }
      return;
    }
    setCustomQuestions([]);
  }, [event]);

  useEffect(() => {
    if (!reservation) return;
    const update = () => setSecondsRemaining(Math.max(0, Math.floor((new Date(reservation.reservationExpiresAt).getTime() - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [reservation]);

  const isMyListing = listing?.ownedByCurrentUser === true;

  const handleReserve = async () => {
    if (!listing) return;
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
        setError("Bạn không thể mua lại vé do chính mình đăng bán. Vui lòng đăng nhập tài khoản khác.");
      } else if (status === 409) {
        setError("Không thể giữ vé. Vé có thể đã được người khác chọn hoặc đang trong phiên thanh toán.");
      } else {
        setError("Không thể giữ vé lúc này. Vui lòng thử lại sau.");
      }
    } finally {
      setReserving(false);
    }
  };

  const handlePayment = async () => {
    if (!reservation) return;
    setPaying(true);
    setError("");
    try {
      const payment = await marketplaceApi.startResalePayment(reservation.transactionId);
      const info = `Mua vé bán lại ${String(event?.title ?? "")}`;
      const url =
        paymentMethod === "MOMO"
          ? await paymentApi.createMoMoUrl(payment.amount, info, payment.transactionId)
          : paymentMethod === "ZALOPAY"
            ? await paymentApi.createZaloPayUrl(payment.amount, info, payment.transactionId)
            : await paymentApi.createVnPayUrl(payment.amount, info, payment.transactionId);
      if (!url) throw new Error("NO_URL");
      window.location.assign(url);
    } catch {
      setError("Không thể khởi tạo thanh toán. Vui lòng thử lại.");
      setPaying(false);
    }
  };

  const handleContinueToPayment = () => {
    const requiredQuestion = customQuestions.find((question) => {
      if (!question.isRequired) return false;
      const answer = answers[String(question.id ?? "")];
      return answer === undefined || answer === "" || answer === false;
    });
    if (requiredQuestion) {
      setQuestionError(`Vui lòng trả lời câu hỏi bắt buộc: "${String(requiredQuestion.title ?? "của sự kiện")}"`);
      return;
    }
    setQuestionError("");
    setStep("payment");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (error && !listing) {
    return (
      <main className="min-h-screen app-bg-page app-text-main px-4 py-12">
        <div className="mx-auto max-w-2xl rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
          <p role="alert" className="font-medium">{error}</p>
          <button
            type="button"
            onClick={() => navigate(`/resale-ticket/${eventId}`)}
            className="mt-4 inline-flex items-center gap-2 text-sm text-blue-400 hover:underline"
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
        <p className="mt-3 text-sm text-slate-400">Đang tải thông tin vé…</p>
      </main>
    );
  }

  const eventTitle = String(event?.title ?? "Sự kiện HaloTicket");
  const eventTime = formatDateTime(event?.startTime);
  const ticketTier = listing.ticketTypeName || "Vé sự kiện";

  // Business rule:
  // 1 vé -> Bán lẻ
  // 2 vé trở lên + yêu cầu mua cả 2 (allowRetail === false) -> Không bán lẻ
  // 2 vé trở lên + không yêu cầu mua hết -> Bán lẻ
  const quantity = listing.quantity || 1;
  const isRetail = quantity <= 1 || listing.allowRetail !== false;
  const totalAmount = listing.price * quantity;
  const originalPrice = listing.originalPrice ?? null;
  const minPrice = listing.minPriceSnapshot ?? null;
  const maxPrice = listing.maxPriceSnapshot ?? null;
  const policyRange = originalPrice && minPrice != null && maxPrice != null
    ? `${Math.round((minPrice / originalPrice) * 100)}%–${Math.round((maxPrice / originalPrice) * 100)}% giá gốc`
    : null;
  const stepTitle = step === "select" ? "Chọn vé bán lại" : step === "reserve" ? "Giữ vé bán lại" : "Thanh toán vé bán lại";
  const timerMinutes = String(Math.floor(secondsRemaining / 60)).padStart(2, "0");
  const timerSeconds = String(secondsRemaining % 60).padStart(2, "0");
  const requiredQuestionsAnswered = customQuestions.every((question) => {
    if (!question.isRequired) return true;
    const answer = answers[String(question.id ?? "")];
    return answer !== undefined && answer !== "" && answer !== false;
  });

  if (reservation) {
    const eventLocation = String(event?.venueName ?? event?.location ?? event?.address ?? "Địa điểm sẽ được cập nhật");
    const eventPoster = String(event?.posterImage ?? event?.bannerUrl ?? event?.imageUrl ?? "");

    return (
      <div className="min-h-screen bg-slate-50 app-text-main dark:bg-slate-950">
        <section
          className="relative overflow-hidden bg-slate-950 text-white"
          style={eventPoster ? { backgroundImage: `linear-gradient(90deg, rgba(2,6,23,.96), rgba(15,23,42,.78)), url(${eventPoster})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}
        >
          <div className="mx-auto grid min-h-[230px] max-w-6xl items-center gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_190px] lg:py-9">
            <div>
              <h1 className="max-w-4xl text-2xl font-bold leading-tight sm:text-3xl">{eventTitle}</h1>
              <div className="mt-5 h-px max-w-4xl bg-white/35" />
              <div className="mt-5 space-y-3 text-sm font-semibold sm:text-base">
                <p className="flex items-center gap-3"><FiCalendar className="text-xl" />{eventTime}</p>
                <p className="flex items-center gap-3"><FiMapPin className="text-xl" />{eventLocation}</p>
              </div>
            </div>
            <div className="w-fit rounded-xl border border-white/30 bg-slate-900/70 p-4 backdrop-blur-sm lg:justify-self-end">
              <p className="text-sm text-slate-200">Hoàn tất đặt vé trong</p>
              <div className="mt-4 flex items-center gap-2 font-mono text-xl font-bold" aria-label={`Còn lại ${timerMinutes} phút ${timerSeconds} giây`}>
                <span className="rounded-lg bg-rose-500 px-3 py-2 text-white">{timerMinutes}</span>
                <span>:</span>
                <span className="rounded-lg bg-rose-500 px-3 py-2 text-white">{timerSeconds}</span>
              </div>
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
          <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0">
              {step === "reserve" ? (
                <>
                  {customQuestions.length > 0 && (
                    <h2 className="mb-6 text-xl font-bold uppercase text-emerald-600 dark:text-emerald-400">Bảng câu hỏi</h2>
                  )}
                  <div className="mb-5 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-300">
                    <FiAlertTriangle className="shrink-0" />
                    <span>Không hỗ trợ xuất hóa đơn cho vé bán lại</span>
                  </div>

                  {customQuestions.length > 0 ? (
                    <section className="space-y-4" aria-label="Bảng câu hỏi sự kiện">
                      {customQuestions.map((question, index) => {
                        const id = String(question.id ?? index);
                        const type = String(question.type ?? "text").toLowerCase();
                        const title = String(question.title ?? "Câu hỏi");
                        return (
                          <div key={id} className="overflow-hidden rounded-xl border app-border app-bg-card shadow-sm">
                            <div className="border-b app-border bg-slate-50 px-5 py-4 font-bold text-emerald-600 dark:bg-slate-800/70 dark:text-emerald-400">{ticketTier}</div>
                            <div className="p-5">
                              <label className="block text-sm font-semibold app-text-main">
                                {title}{question.isRequired ? <span className="ml-1 text-rose-500">*</span> : null}
                              </label>
                              {question.description && <p className="mt-1 text-xs app-text-muted">{String(question.description)}</p>}
                              <div className="mt-4">
                                {type === "checkbox" ? (
                                  <label className="flex cursor-pointer items-center gap-3 text-sm app-text-main">
                                    <input type="checkbox" aria-label={title} checked={answers[id] === true} onChange={(e) => setAnswers((current) => ({ ...current, [id]: e.target.checked }))} className="h-5 w-5 accent-blue-600" />
                                    <span>Tôi đã đọc và đồng ý</span>
                                  </label>
                                ) : type === "select" || type === "dropdown" ? (
                                  <select aria-label={title} value={String(answers[id] ?? "")} onChange={(e) => setAnswers((current) => ({ ...current, [id]: e.target.value }))} className="w-full rounded-lg border app-border app-bg-page px-3 py-3 text-sm app-text-main">
                                    <option value="">Chọn câu trả lời</option>
                                    {(Array.isArray(question.options) ? question.options : []).map((option: unknown) => <option key={String(option)} value={String(option)}>{String(option)}</option>)}
                                  </select>
                                ) : (
                                  <input aria-label={title} value={String(answers[id] ?? "")} onChange={(e) => setAnswers((current) => ({ ...current, [id]: e.target.value }))} placeholder="Điền câu trả lời của bạn" className="w-full rounded-lg border app-border app-bg-page px-3 py-3 text-sm app-text-main" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {questionError && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{questionError}</p>}
                    </section>
                  ) : (
                    <div className="rounded-xl border app-border app-bg-card p-5 text-sm app-text-muted">Sự kiện không yêu cầu thêm thông tin từ người mua.</div>
                  )}
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setStep("reserve")} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"><FiArrowLeft /> Quay lại</button>
                  <fieldset className="rounded-xl border app-border app-bg-card p-5 shadow-sm">
                    <legend className="px-1 text-lg font-bold app-text-main">Phương thức thanh toán</legend>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {(["VNPAY", "MOMO", "ZALOPAY"] as const).map((method) => (
                        <label key={method} className={`cursor-pointer rounded-lg border px-4 py-5 text-center transition ${paymentMethod === method ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300" : "app-border app-text-muted"}`}>
                          <input type="radio" className="sr-only" checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} />
                          <span className="font-bold">{method}</span>
                          <span className="mt-1 block text-xs font-normal">Cổng thanh toán</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {error && <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">{error}</div>}
                </>
              )}
            </div>

            <ReservationSummary
              ticketTier={ticketTier}
              quantity={quantity}
              price={listing.price}
              totalAmount={totalAmount}
              actionLabel={step === "reserve" ? "Tiếp tục" : "Thanh toán"}
              actionDisabled={secondsRemaining === 0 || (step === "reserve" && !requiredQuestionsAnswered)}
              actionLoading={paying}
              onAction={step === "reserve" ? handleContinueToPayment : handlePayment}
            />
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500"><FiShield className="text-blue-500" />Giao dịch được bảo đảm bởi HaloTicket</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg-page app-text-main">
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-2 text-xs app-text-muted">
          <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400">Trang chủ</Link>
          <span>&gt;</span>
          <Link to="/resale-ticket" className="hover:text-blue-600 dark:hover:text-blue-400">Vé bán lại</Link>
          <span>&gt;</span>
          <Link to={`/resale-ticket/${eventId}`} className="hover:text-blue-600 dark:hover:text-blue-400">Chi tiết vé</Link>
        </nav>

        {/* Page Title */}
        <h1 className="mb-2 text-xl font-bold app-text-main sm:text-2xl">{stepTitle}</h1>
        <div className="mb-6 h-px w-full border-t app-border" />

        {/* Event summary card */}
        <div className="mb-6 rounded-xl border app-border app-bg-card p-4 shadow-sm sm:p-5">
          <div className="space-y-1">
            <div className="text-sm">
              <span className="text-slate-400 mr-2">Sự kiện</span>
              <span className="font-bold app-text-main">{eventTitle}</span>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className="text-xs text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1 font-medium"
              >
                Xem quy định tham gia sự kiện
              </button>
            </div>
          </div>
          <div className="my-3.5 border-t app-border" />
          <div className="text-sm">
            <span className="text-slate-400 mr-2">Suất diễn</span>
            <span className="font-medium app-text-main">{eventTime}</span>
          </div>
          {policyRange && (
            <p className="mt-3 text-xs app-text-muted">Biên độ giá resale: <strong className="app-text-main">{policyRange}</strong></p>
          )}
        </div>

        {reservation && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/50 dark:bg-rose-950/20 sm:px-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-300">Hoàn tất đặt vé trong</p>
              <p className="mt-1 text-xs app-text-muted">Vé được giữ riêng cho bạn trong thời gian này.</p>
            </div>
            <div className="flex items-center gap-1 font-mono text-xl font-bold text-rose-600 dark:text-rose-300" aria-label={`Còn lại ${timerMinutes} phút ${timerSeconds} giây`}>
              <span className="rounded-lg bg-rose-500 px-2.5 py-1.5 text-white">{timerMinutes}</span>
              <span>:</span>
              <span className="rounded-lg bg-rose-500 px-2.5 py-1.5 text-white">{timerSeconds}</span>
            </div>
          </div>
        )}

        <nav aria-label="Tiến trình mua vé bán lại" className="mb-6 grid grid-cols-3 gap-2 text-center text-xs">
          {["Chọn vé", "Giữ vé", "Thanh toán"].map((label, index) => {
            const current = index === (step === "select" ? 0 : step === "reserve" ? 1 : 2);
            return (
              <div key={label} className={`border-b-2 pb-2 font-semibold ${current ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-slate-200 text-slate-400 dark:border-slate-800"}`}>
                {index + 1}. {label}
              </div>
            );
          })}
        </nav>

        {/* Warning if current user is the seller */}
        {isMyListing && (
          <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-300 flex items-start gap-3">
            <FiAlertTriangle className="text-lg shrink-0 mt-0.5 text-amber-400" />
            <div>
              <p className="font-semibold text-amber-200">Đây là vé do chính bạn đăng bán</p>
              <p className="mt-1 text-xs text-amber-300/80">
                Hệ thống HaloTicket không cho phép người bán tự mua vé của chính mình. Vui lòng đăng nhập tài khoản khác nếu muốn kiểm tra luồng thanh toán mua vé bán lại.
              </p>
            </div>
          </div>
        )}

        <div className="mb-5 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
          <FiAlertTriangle className="shrink-0" />
          <span>Không hỗ trợ xuất hóa đơn cho vé bán lại.</span>
        </div>

        {step === "select" && (
        /* Section: Chọn vé */
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold app-text-main sm:text-lg">Chọn vé</h2>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                isRetail ? "bg-blue-600 text-white" : "bg-indigo-600 text-white"
              }`}
            >
              {isRetail ? "Bán lẻ" : "Không bán lẻ"}
            </span>
          </div>

          {/* Ticket Tier Header with Icon */}
          <div className="mb-3 flex items-center gap-2 text-sm font-bold app-text-main sm:text-base">
            <span className="text-base text-blue-400">🎟️</span>
            <span>{ticketTier}</span>
          </div>

          <div className="mb-3 flex items-center justify-between rounded-lg border app-border app-bg-card px-4 py-2.5 text-xs app-text-muted">
            <span>Đã chọn {selected ? quantity : 0}/{quantity}</span>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <span>Chọn tất cả</span>
              <input aria-label="Chọn tất cả" type="checkbox" checked={selected} onChange={(e) => setSelected(e.target.checked)} className="h-4 w-4 rounded accent-blue-600" />
            </label>
          </div>

          {/* Ticket Detail Card */}
          <label className={`block cursor-pointer rounded-xl border app-bg-card p-4 shadow-sm transition sm:p-5 ${selected ? "border-blue-500 ring-2 ring-blue-500/15" : "app-border"}`}>
            <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center">
                <span className="text-slate-400 w-28 shrink-0">Khu vực:</span>
                <span className="font-medium app-text-main">{listing.section || "Khu vực chung"}</span>
              </div>
              <div className="flex items-center">
                <span className="text-slate-400 w-28 shrink-0">Hàng ghế:</span>
                <span className="font-medium app-text-main">
                  {[listing.row ? `Hàng ${listing.row}` : "", listing.seat ? `Ghế ${listing.seat}` : ""].filter(Boolean).join(" - ") || "Vé tự do"}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-slate-400 w-28 shrink-0">Số lượng:</span>
                <span className="font-medium app-text-main">{quantity} vé</span>
              </div>
              <div className="flex items-center pt-1">
                <span className="text-slate-400 w-28 shrink-0">Giá bán mỗi vé:</span>
                <span className="text-blue-400 font-bold text-base sm:text-lg">{money(listing.price)}</span>
              </div>
            </div>
              <input aria-label={`Chọn ${ticketTier}`} type="checkbox" checked={selected} onChange={(e) => setSelected(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 rounded accent-blue-600" />
            </div>
          </label>
        </div>
        )}

        {/* Step 1: Terms Agreement & Reserve CTA */}
        {!reservation ? (
          <div className="space-y-6">
            <div className="rounded-xl border app-border app-bg-card p-4">
              <label className="flex cursor-pointer items-start gap-3 text-xs app-text-main sm:text-sm">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-blue-600 cursor-pointer"
                />
                <span className="leading-relaxed">
                  Tôi đã đọc, hiểu, đồng ý và cam kết tuân thủ các{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowRulesModal(true);
                    }}
                    className="text-blue-400 font-medium hover:underline inline"
                  >
                    Quy định sử dụng tính năng Bán lại vé
                  </button>{" "}
                  trên HaloTicket.
                </span>
              </label>
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300 flex items-start gap-2">
                <FiAlertTriangle className="text-lg shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              disabled={!selected || !agreed || reserving || isMyListing}
              onClick={handleReserve}
              className={`w-full py-3.5 px-6 rounded-lg text-base font-bold flex items-center justify-center gap-2 transition shadow-lg ${
                selected && agreed && !isMyListing && !reserving
                  ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-blue-600/25"
                  : "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed"
              }`}
            >
              {reserving ? (
                "Đang giữ vé…"
              ) : isMyListing ? (
                "Không thể mua vé của chính bạn"
              ) : agreed ? (
                "Tiếp tục"
              ) : (
                selected ? "Vui lòng đồng ý điều khoản" : "Vui lòng chọn vé"
              )}
            </button>
          </div>
        ) : step === "reserve" ? (
          /* Step 2: Reservation */
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-6">
              <div
              role="status"
              className="rounded-xl border border-blue-500/40 bg-blue-950/30 p-5 text-sm text-blue-200 shadow-md"
              >
              <div className="flex items-center gap-2 font-bold text-base text-blue-400">
                <FiCheckCircle className="text-xl shrink-0" />
                <span>Vé đã được giữ tạm thời thành công!</span>
              </div>
              <p className="mt-2 text-xs text-slate-300">
                Mã giao dịch: <strong className="text-white font-mono">{(reservation as ResaleReservation).transactionId}</strong>
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-300">
                <FiClock className="shrink-0" />
                <span>
                  Hết hạn giữ vé lúc:{" "}
                  <strong>
                    {new Intl.DateTimeFormat("vi-VN", { timeStyle: "medium" }).format(
                      new Date((reservation as ResaleReservation).reservationExpiresAt)
                    )}
                  </strong>{" "}
                  (khoảng 15 phút)
                </span>
              </div>
              </div>

              {customQuestions.length > 0 && (
              <section aria-labelledby="resale-questions-title" className="space-y-4">
                <h2 id="resale-questions-title" className="text-base font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">BẢNG CÂU HỎI</h2>
                <div className="space-y-4 rounded-xl border app-border app-bg-card p-5 shadow-sm">
                  {customQuestions.map((question, index) => {
                    const id = String(question.id ?? index);
                    const type = String(question.type ?? "text").toLowerCase();
                    const title = String(question.title ?? "Câu hỏi");
                    return (
                      <div key={id} className="space-y-2 rounded-lg border app-border app-bg-page p-4">
                        <label className="block text-sm font-semibold app-text-main">
                          {title}{question.isRequired ? <span className="ml-1 text-rose-500">*</span> : null}
                        </label>
                        {question.description && <p className="text-xs app-text-muted">{String(question.description)}</p>}
                        {type === "checkbox" ? (
                          <label className="flex cursor-pointer items-center gap-2 text-sm app-text-main">
                            <input
                              type="checkbox"
                              aria-label={title}
                              checked={answers[id] === true}
                              onChange={(event) => setAnswers((current) => ({ ...current, [id]: event.target.checked }))}
                              className="h-4 w-4 rounded accent-blue-600"
                            />
                            <span>Tôi đã đọc và đồng ý</span>
                          </label>
                        ) : type === "select" || type === "dropdown" ? (
                          <select
                            aria-label={title}
                            value={String(answers[id] ?? "")}
                            onChange={(event) => setAnswers((current) => ({ ...current, [id]: event.target.value }))}
                            className="w-full rounded-lg border app-border app-bg-card px-3 py-2.5 text-sm app-text-main"
                          >
                            <option value="">Chọn câu trả lời</option>
                            {(Array.isArray(question.options) ? question.options : []).map((option: unknown) => <option key={String(option)} value={String(option)}>{String(option)}</option>)}
                          </select>
                        ) : (
                          <input
                            aria-label={title}
                            value={String(answers[id] ?? "")}
                            onChange={(event) => setAnswers((current) => ({ ...current, [id]: event.target.value }))}
                            placeholder="Nhập câu trả lời của bạn"
                            className="w-full rounded-lg border app-border app-bg-card px-3 py-2.5 text-sm app-text-main"
                          />
                        )}
                      </div>
                    );
                  })}
                  {questionError && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{questionError}</p>}
                </div>
              </section>
            )}

              <button
              type="button"
              disabled={secondsRemaining === 0 || reserving || !requiredQuestionsAnswered}
              onClick={handleContinueToPayment}
              className="w-full rounded-lg bg-blue-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Tiếp tục
              </button>
            </div>
            <ReservationSummary ticketTier={ticketTier} quantity={quantity} price={listing.price} totalAmount={totalAmount} actionLabel="Tiếp tục" actionDisabled={!requiredQuestionsAnswered} onAction={handleContinueToPayment} />
          </div>
        ) : (
          /* Step 3: Payment */
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-xl border app-border app-bg-card px-4 py-3 text-sm">
              <span className="app-text-muted">Vé đã giữ cho bạn</span>
              <button type="button" onClick={() => setStep("reserve")} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">Quay lại giữ vé</button>
              </div>

              <fieldset className="rounded-xl border app-border app-bg-card p-5 shadow-sm">
              <legend className="mb-3 text-base font-bold app-text-main">Phương thức thanh toán</legend>
              <div className="grid grid-cols-3 gap-3">
                {(["VNPAY", "MOMO", "ZALOPAY"] as const).map((m) => (
                  <label
                    key={m}
                    className={`cursor-pointer rounded-xl border p-4 text-center text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${
                      paymentMethod === m
                        ? "border-blue-500 bg-blue-500/10 text-blue-400 shadow-sm"
                        : "app-border app-bg-page app-text-muted hover:border-blue-300 dark:hover:border-blue-700"
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={paymentMethod === m}
                      onChange={() => setPaymentMethod(m)}
                    />
                    <span className="text-base">{m}</span>
                    <span className="text-[11px] font-normal text-slate-500">Cổng thanh toán</span>
                  </label>
                ))}
              </div>
              </fieldset>

              {error && (
              <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
                {error}
              </div>
            )}

              <button
              type="button"
              disabled={paying}
              onClick={handlePayment}
              className="w-full py-3.5 px-6 rounded-lg text-base font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/25 disabled:opacity-50"
            >
              {paying ? "Đang chuyển đến cổng thanh toán…" : "Thanh toán"}
              </button>
            </div>
            <ReservationSummary ticketTier={ticketTier} quantity={quantity} price={listing.price} totalAmount={totalAmount} actionLabel="Thanh toán" actionLoading={paying} onAction={handlePayment} />
          </div>
        )}

        {/* Security badge footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
          <FiShield className="text-blue-500 text-sm" />
          <span>Giao dịch an toàn được bảo đảm bởi HaloTicket Marketplace Guarantee</span>
        </div>
      </main>

      {/* Resale Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border app-border app-bg-card p-6 shadow-2xl app-text-main">
            <div className="flex items-center justify-between border-b app-border pb-4">
              <h3 className="flex items-center gap-2 text-lg font-bold app-text-main">
                <FiShield className="text-blue-400" />
                Quy định Mua bán vé bán lại
              </h3>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="rounded-lg p-1 app-text-muted hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
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
                className="w-full rounded-lg bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700 transition"
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
