import { useEffect, useState } from "react";
import { FiArrowLeft, FiCheckCircle, FiShield } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";

import { eventApi } from "@/services/eventApi";
import { marketplaceApi } from "@/services/marketplaceApi";
import { paymentApi } from "@/services/paymentApi";
import type { ResaleReservation, TicketListing } from "@/types/marketplace";

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);

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

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
    Promise.all([marketplaceApi.getListing(ticketId), eventApi.getEventById(eventId)])
      .then(([listingData, eventData]) => { setListing(listingData); setEvent(eventData); })
      .catch(() => setError("Vé này không còn khả dụng hoặc đã được người khác mua."));
  }, [eventId, ticketId]);

  if (error) return <main className="mx-auto max-w-3xl px-4 py-12"><p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">{error}</p></main>;
  if (!listing) return <main className="mx-auto max-w-3xl px-4 py-12 text-center app-text-muted">Đang tải thông tin vé…</main>;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <button onClick={() => navigate(`/resale-ticket/${eventId}`)} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold app-text-muted hover:text-brand-primary">
        <FiArrowLeft /> Quay lại danh sách vé
      </button>
      <h1 className="text-3xl font-bold app-text-main">Kiểm tra vé bán lại</h1>
      <p className="mt-2 app-text-muted">Xác nhận đúng thông tin trước khi tiếp tục thanh toán.</p>

      <section className="mt-8 overflow-hidden rounded-2xl border app-border app-bg-card">
        <div className="border-b app-border p-6">
          <p className="text-sm font-semibold text-brand-primary">VÉ ĐƯỢC HALOTICKET XÁC THỰC</p>
          <h2 className="mt-2 text-xl font-bold app-text-main">{String(event?.title ?? "Sự kiện")}</h2>
        </div>
        <dl className="grid grid-cols-2 gap-y-4 p-6 text-sm">
          <dt className="app-text-muted">Loại vé</dt><dd className="text-right font-semibold app-text-main">{listing.ticketTypeName || "Vé sự kiện"}</dd>
          <dt className="app-text-muted">Khu vực</dt><dd className="text-right font-semibold app-text-main">{listing.section || "—"}</dd>
          <dt className="app-text-muted">Hàng / ghế</dt><dd className="text-right font-semibold app-text-main">{[listing.row, listing.seat].filter(Boolean).join(" · ") || "—"}</dd>
          <dt className="app-text-muted">Giá vé</dt><dd className="text-right text-lg font-bold text-brand-primary">{money(listing.price)}</dd>
        </dl>
      </section>

      <div className="mt-5 rounded-xl border app-border bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">
        <p className="flex gap-2 font-semibold"><FiShield className="mt-0.5 text-brand-primary" />Giao dịch an toàn qua HaloTicket</p>
        <p className="mt-2 pl-6">Sau khi thanh toán và chuyển quyền thành công, QR của chủ cũ bị vô hiệu hóa và bạn nhận QR mới.</p>
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border app-border p-4 text-sm app-text-main">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-blue-600" />
        <span>Tôi đã kiểm tra thông tin vé và đồng ý với điều khoản mua vé bán lại của HaloTicket.</span>
      </label>

      {reservation && (
        <div role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Vé đã được giữ cho bạn đến {new Intl.DateTimeFormat("vi-VN", { timeStyle: "short" }).format(new Date(reservation.reservationExpiresAt))}.
          Mã giao dịch: <strong>{reservation.transactionId}</strong>
        </div>
      )}
      {reservation && (
        <fieldset className="mt-5">
          <legend className="mb-3 text-sm font-bold app-text-main">Phương thức thanh toán</legend>
          <div className="grid grid-cols-3 gap-3">
            {(["VNPAY", "MOMO", "ZALOPAY"] as const).map((method) => (
              <label key={method} className="cursor-pointer rounded-xl border app-border p-3 text-center text-sm font-semibold app-text-main">
                <input type="radio" className="sr-only" checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} />
                <span className={paymentMethod === method ? "text-brand-primary" : ""}>{method}</span>
              </label>
            ))}
          </div>
          <button type="button" disabled={paying} onClick={async () => {
            setPaying(true);
            try {
              const payment = await marketplaceApi.startResalePayment(reservation.transactionId);
              const orderInfo = `Mua vé bán lại ${String(event?.title ?? "")}`;
              const url = paymentMethod === "MOMO"
                ? await paymentApi.createMoMoUrl(payment.amount, orderInfo, payment.transactionId)
                : paymentMethod === "ZALOPAY"
                  ? await paymentApi.createZaloPayUrl(payment.amount, orderInfo, payment.transactionId)
                  : await paymentApi.createVnPayUrl(payment.amount, orderInfo, payment.transactionId);
              if (!url) throw new Error("PAYMENT_URL_UNAVAILABLE");
              window.location.assign(url);
            } catch {
              setError("Không thể khởi tạo thanh toán. Vui lòng thử lại trước khi hết thời gian giữ vé.");
              setPaying(false);
            }
          }} className="mt-4 w-full rounded-xl bg-brand-primary px-5 py-4 font-bold text-white disabled:opacity-50">
            {paying ? "Đang chuyển đến cổng thanh toán…" : `Thanh toán ${money(reservation.amount)}`}
          </button>
        </fieldset>
      )}
      <button type="button" disabled={!agreed || reserving || Boolean(reservation)} onClick={async () => {
        setReserving(true);
        setError("");
        try {
          setReservation(await marketplaceApi.reserveListing(listing.id));
        } catch {
          setError("Không thể giữ vé. Vé có thể vừa được người khác chọn.");
        } finally {
          setReserving(false);
        }
      }}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-4 font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
        <FiCheckCircle /> {reserving ? "Đang giữ vé…" : reservation ? "Đã giữ vé" : `Giữ vé · ${money(listing.price)}`}
      </button>
    </main>
  );
};

export default ResaleTicketCheckout;
