import { useEffect, useState } from "react";
import { FiAlertTriangle, FiArrowLeft, FiCheckCircle, FiClock, FiShield, FiX } from "react-icons/fi";
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

export const ResaleTicketCheckout = () => {
  const { eventId = "", ticketId = "" } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState<TicketListing | null>(null);
  const [event, setEvent] = useState<Record<string, unknown> | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [reserving, setReserving] = useState(false);
  const [reservation, setReservation] = useState<ResaleReservation | null>(null);
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

  const isMyListing = listing?.ownedByCurrentUser === true;

  const handleReserve = async () => {
    if (!listing) return;
    setReserving(true);
    setError("");
    try {
      const r = await marketplaceApi.reserveListing(listing.id);
      setReservation(r);
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
        <h1 className="mb-2 text-xl font-bold app-text-main sm:text-2xl">Danh sách vé bán lại</h1>
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
        </div>

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

        {/* Section: Chọn vé */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
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

          {/* Ticket Detail Card */}
          <div className="rounded-xl border app-border app-bg-card p-4 shadow-sm sm:p-5">
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
          </div>
        </div>

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
              disabled={!agreed || reserving || isMyListing}
              onClick={handleReserve}
              className={`w-full py-3.5 px-6 rounded-lg text-base font-bold flex items-center justify-center gap-2 transition shadow-lg ${
                agreed && !isMyListing && !reserving
                  ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-blue-600/25"
                  : "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed"
              }`}
            >
              {reserving ? (
                "Đang giữ vé…"
              ) : isMyListing ? (
                "Giữ vé (Không thể mua vé của chính bạn)"
              ) : agreed ? (
                `Giữ vé · Tiếp tục - ${money(listing.price)} »`
              ) : (
                "Giữ vé (Vui lòng đồng ý điều khoản) »"
              )}
            </button>
          </div>
        ) : (
          /* Step 2: Reserved Info & Payment Selection */
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
                Mã giao dịch: <strong className="text-white font-mono">{reservation.transactionId}</strong>
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-300">
                <FiClock className="shrink-0" />
                <span>
                  Hết hạn giữ vé lúc:{" "}
                  <strong>
                    {new Intl.DateTimeFormat("vi-VN", { timeStyle: "medium" }).format(
                      new Date(reservation.reservationExpiresAt)
                    )}
                  </strong>{" "}
                  (khoảng 15 phút)
                </span>
              </div>
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
              {paying ? "Đang chuyển đến cổng thanh toán…" : `Thanh toán - ${money(reservation.amount)} »`}
            </button>
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
