import { Fragment, useEffect, useState } from "react";
import { FiArrowLeft, FiCheckCircle, FiShield } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";

import { eventApi } from "@/services/eventApi";
import { marketplaceApi } from "@/services/marketplaceApi";
import { paymentApi } from "@/services/paymentApi";
import type { ResaleReservation, TicketListing } from "@/types/marketplace";

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);

function StepBar({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["Kiểm tra", "Giữ vé", "Thanh toán"];
  return (
    <div className="mb-8 flex items-center gap-1 text-sm">
      {steps.map((s, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = n < current;
        const active = n === current;
        return (
          <Fragment key={s}>
            {i > 0 && <span className="mx-2 h-px flex-1 bg-slate-200 dark:bg-slate-700" />}
            <span className={`flex items-center gap-1.5 ${active ? "font-bold app-text-main" : "app-text-muted"}`}>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  active
                    ? "bg-brand-primary text-white"
                    : done
                      ? "bg-emerald-500 text-white"
                      : "border app-border app-bg-subnav"
                }`}
              >
                {done ? "✓" : n}
              </span>
              <span className="hidden sm:inline">{s}</span>
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}

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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
    Promise.all([marketplaceApi.getListing(ticketId), eventApi.getEventById(eventId)])
      .then(([listingData, eventData]) => {
        setListing(listingData);
        setEvent(eventData);
      })
      .catch(() => setError("Vé này không còn khả dụng hoặc đã được người khác mua."));
  }, [eventId, ticketId]);

  if (error && !listing) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          {error}
        </p>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 text-center app-text-muted">
        Đang tải thông tin vé…
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <button
        type="button"
        onClick={() => navigate(`/resale-ticket/${eventId}`)}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold app-text-muted hover:text-brand-primary"
      >
        <FiArrowLeft /> Danh sách vé
      </button>

      <StepBar current={currentStep} />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Order summary — sticky left on desktop, top on mobile */}
        <div className="rounded-2xl border app-border app-bg-card p-5 lg:sticky lg:top-24 lg:w-80 lg:shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
            Vé được HaloTicket xác thực
          </p>
          <h2 className="mt-2 text-lg font-bold app-text-main">{String(event?.title ?? "Sự kiện")}</h2>
          <dl className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
            <dt className="app-text-muted">Loại vé</dt>
            <dd className="text-right font-semibold app-text-main">{listing.ticketTypeName || "Vé sự kiện"}</dd>
            {listing.section && (
              <>
                <dt className="app-text-muted">Khu vực</dt>
                <dd className="text-right font-semibold app-text-main">{listing.section}</dd>
              </>
            )}
            {(listing.row || listing.seat) && (
              <>
                <dt className="app-text-muted">Hàng / Ghế</dt>
                <dd className="text-right font-semibold app-text-main">
                  {[listing.row, listing.seat].filter(Boolean).join(" · ")}
                </dd>
              </>
            )}
          </dl>
          <div className="mt-4 flex items-center justify-between border-t app-border pt-4">
            <span className="text-sm app-text-muted">Giá vé</span>
            <span className="text-xl font-bold text-brand-primary">{money(listing.price)}</span>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-slate-900 p-3 text-xs app-text-muted">
            <FiShield className="mt-0.5 shrink-0 text-brand-primary" />
            <span>Sau thanh toán, QR cũ bị vô hiệu. Bạn nhận QR mới trong &quot;Vé của tôi&quot;.</span>
          </div>
        </div>

        {/* Right: interaction steps */}
        <div className="flex-1 space-y-5">
          {!reservation ? (
            <div className="rounded-2xl border app-border app-bg-card p-5 sm:p-6">
              <h3 className="text-base font-bold app-text-main">Điều khoản mua vé bán lại</h3>
              <p className="mt-2 text-sm app-text-muted leading-relaxed">
                Vé bán lại được xác thực và bảo đảm bởi HaloTicket. Sau khi thanh toán thành công, quyền sở hữu vé được chuyển ngay và mã QR cũ của người bán bị vô hiệu hóa.
              </p>
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border app-border p-4 text-sm app-text-main">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-blue-600"
                />
                <span>Tôi đã đọc và đồng ý với điều khoản mua vé bán lại của HaloTicket.</span>
              </label>
            </div>
          ) : (
            <div className="space-y-5">
              <div
                role="status"
                className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 p-4 text-sm text-emerald-800 dark:text-emerald-300"
              >
                <p className="font-semibold">✓ Vé đã được giữ cho bạn</p>
                <p className="mt-1 text-xs">
                  Hết hạn lúc {new Intl.DateTimeFormat("vi-VN", { timeStyle: "short" }).format(new Date(reservation.reservationExpiresAt))}
                  {" · "}Mã giao dịch: <strong>{reservation.transactionId}</strong>
                </p>
              </div>
              <fieldset className="rounded-2xl border app-border app-bg-card p-5">
                <legend className="text-sm font-bold app-text-main mb-3">Phương thức thanh toán</legend>
                <div className="grid grid-cols-3 gap-3">
                  {(["VNPAY", "MOMO", "ZALOPAY"] as const).map((m) => (
                    <label
                      key={m}
                      className={`cursor-pointer rounded-xl border p-3 text-center text-sm font-bold transition ${
                        paymentMethod === m
                          ? "border-brand-primary bg-brand-primary/5 text-brand-primary"
                          : "app-border app-text-main hover:border-brand-primary/50"
                      }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        checked={paymentMethod === m}
                        onChange={() => setPaymentMethod(m)}
                      />
                      {m}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Sticky mobile CTA + desktop button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t app-border app-bg-card px-4 py-3 lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
        {!reservation ? (
          <button
            type="button"
            disabled={!agreed || reserving}
            onClick={async () => {
              setReserving(true);
              setError("");
              try {
                const r = await marketplaceApi.reserveListing(listing.id);
                setReservation(r);
                setCurrentStep(2);
              } catch {
                setError("Không thể giữ vé. Vé có thể đã được người khác chọn.");
              } finally {
                setReserving(false);
              }
            }}
            className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiCheckCircle />
            {reserving ? "Đang giữ vé…" : `Giữ vé · ${money(listing.price)}`}
          </button>
        ) : (
          <button
            type="button"
            disabled={paying}
            onClick={async () => {
              setPaying(true);
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
            }}
            className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {paying ? "Đang chuyển đến cổng thanh toán…" : `Thanh toán · ${money(reservation.amount)}`}
          </button>
        )}
      </div>
      <div className="h-20 lg:hidden" />
    </main>
  );
};

export default ResaleTicketCheckout;
