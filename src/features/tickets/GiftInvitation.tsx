import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiClock, FiGift, FiUser, FiX } from "react-icons/fi";

import { eventApi } from "@/services/eventApi";
import { getKeycloakSession } from "@/services/keycloakSession";
import { marketplaceApi } from "@/services/marketplaceApi";
import { PATHS } from "@/routes/paths";

type Invitation = Awaited<ReturnType<typeof marketplaceApi.getGiftInvitation>>;

export default function GiftInvitation() {
  const [params] = useSearchParams();
  const sagaId = params.get("sagaId") || "";
  const token = params.get("token") || "";
  const [invitation, setInvitation] = useState<Invitation>();
  const [eventTitle, setEventTitle] = useState("");
  const [eventPoster, setEventPoster] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [state, setState] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(Boolean(sagaId && getKeycloakSession().isAuthenticated()));

  useEffect(() => {
    if (!sagaId || !getKeycloakSession().isAuthenticated()) return;
    marketplaceApi.getGiftInvitation(sagaId, token).then(async (result) => {
      setInvitation(result);
      setState(result.state);
      if (result.eventId) {
        const event = await eventApi.getEventById(result.eventId).catch(() => null);
        setEventTitle(String(event?.title || "Sự kiện HaloTicket"));
        setEventPoster(String(event?.posterImage || ""));
        setEventLocation(String(event?.locationName || ""));
        if (event?.startTime) setEventTime(new Date(String(event.startTime)).toLocaleString("vi-VN"));
      }
      setLoading(false);
    }).catch(() => { setError("Lời mời không hợp lệ, đã hết hạn hoặc không thuộc tài khoản của bạn."); setLoading(false); });
  }, [sagaId, token]);

  useEffect(() => {
    if (state !== "WAITING_TRANSFER") return;
    const timer = window.setInterval(() => {
      marketplaceApi.getGiftInvitation(sagaId, token).then((result) => setState(result.state)).catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [sagaId, token, state]);

  if (!getKeycloakSession().isAuthenticated()) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center app-bg-page app-text-main px-4">
        <div className="w-full max-w-md rounded-2xl border app-border app-bg-card p-8 text-center shadow-lg">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <FiGift className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-xl font-bold">Nhận vé được tặng</h1>
          <p className="mt-2 text-sm app-text-muted">Đăng nhập bằng email nhận lời mời để xem và nhận vé.</p>
          <Link
            onClick={() => sessionStorage.setItem("haloticket_gift_return", window.location.pathname + window.location.search)}
            to={PATHS.LOGIN}
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 transition"
          >
            Đăng nhập
          </Link>
        </div>
      </main>
    );
  }

  const accept = async () => {
    setBusy(true);
    setError("");
    setShowConfirmModal(false);
    try {
      const result = await marketplaceApi.acceptGift(sagaId, token);
      setState(result.state);
    } catch { setError("Không thể nhận vé. Vui lòng kiểm tra lại lời mời hoặc thử lại."); }
    finally { setBusy(false); }
  };

  const seatLabel = [invitation?.row, invitation?.seat].filter(Boolean).join("-");

  /* ──── Success state ──── */
  if (state === "COMPLETED") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center app-bg-page app-text-main px-4 py-12">
        <div className="w-full max-w-lg rounded-2xl border app-border app-bg-card p-8 text-center shadow-lg animate-in zoom-in-95 duration-300">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <FiCheck className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">Nhận vé thành công!</h1>
          <p className="mt-3 text-sm app-text-muted">
            Bạn đã nhận được vé từ <strong className="app-text-main">{invitation?.senderName || "người tặng"}</strong>.
          </p>
          <div className="mt-5 rounded-xl border app-border p-4 text-left">
            <p className="text-sm font-semibold app-text-main">{eventTitle}</p>
            {eventTime && <p className="mt-1 text-xs app-text-muted">{eventTime}</p>}
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {invitation?.ticketTypeName || "Vé"}
              </span>
              {seatLabel && <span className="app-text-muted">Ghế {seatLabel}</span>}
            </div>
          </div>
          <Link
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 transition"
            to={PATHS.MY_TICKETS}
          >
            Xem vé của tôi
          </Link>
        </div>
      </main>
    );
  }

  /* ──── Failed / Compensated state ──── */
  if (["FAILED", "COMPENSATED"].includes(state)) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center app-bg-page app-text-main px-4 py-12">
        <div className="w-full max-w-lg rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-800/40 dark:bg-rose-950/20 p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
            <FiX className="h-10 w-10 text-rose-600 dark:text-rose-400" />
          </div>
          <h1 className="text-xl font-bold text-rose-700 dark:text-rose-300">Không thể chuyển vé</h1>
          <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">
            Giao dịch tặng vé không thành công. Vé đã được trả lại cho người tặng.
          </p>
          <Link className="mt-6 inline-flex min-h-11 items-center rounded-xl border app-border px-6 text-sm font-semibold app-text-main hover:bg-slate-500/10 transition" to={PATHS.MY_TICKETS}>
            Về vé của tôi
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full flex-1 app-bg-page app-text-main pb-16">
      <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
        {/* Breadcrumb */}
        <nav className="mb-5 flex items-center gap-2 text-xs app-text-muted">
          <Link to={PATHS.HOME} className="hover:underline">Trang chủ</Link>
          <span>/</span>
          <Link to={PATHS.MY_TICKETS} className="hover:underline">Vé của tôi</Link>
          <span>/</span>
          <span className="app-text-main font-medium">Nhận vé</span>
        </nav>

        {/* Page title with back button */}
        <div className="mb-6 flex items-center gap-3">
          <Link to={PATHS.MY_TICKETS} className="flex h-9 w-9 items-center justify-center rounded-lg border app-border hover:bg-slate-500/10 transition">
            <FiArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Lời mời tặng vé</h1>
            <p className="text-xs app-text-muted">Kiểm tra thông tin trước khi nhận vé</p>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300">
            <FiX className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border app-border app-bg-card p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="mt-3 text-sm app-text-muted">Đang tải lời mời…</p>
          </div>
        ) : invitation ? (
          <div className="space-y-5">
            {/* ── Event Card ── */}
            <div className="overflow-hidden rounded-2xl border app-border app-bg-card shadow-sm">
              {eventPoster && (
                <div className="relative h-40 sm:h-48 bg-slate-900">
                  <img src={eventPoster} alt="" className="h-full w-full object-cover brightness-90" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <h2 className="text-lg font-bold text-white drop-shadow-md">{eventTitle}</h2>
                    {eventTime && <p className="mt-1 text-xs text-white/80">{eventTime}</p>}
                  </div>
                </div>
              )}
              {!eventPoster && (
                <div className="p-5 pb-3">
                  <h2 className="text-lg font-bold">{eventTitle || "Đang tải sự kiện…"}</h2>
                  {eventTime && <p className="mt-1 text-xs app-text-muted">{eventTime}</p>}
                </div>
              )}
              {eventLocation && (
                <div className="px-5 py-3 text-xs app-text-muted border-t app-border">{eventLocation}</div>
              )}
            </div>

            {/* ── Sender Card ── */}
            <div className="rounded-xl border app-border app-bg-card p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wider app-text-muted mb-3">Người tặng</p>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <FiUser className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{invitation.senderName || "Người dùng HaloTicket"}</p>
                  {invitation.message && (
                    <p className="mt-0.5 text-xs app-text-muted italic">"{invitation.message}"</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Ticket Details Card ── */}
            <div className="rounded-xl border app-border app-bg-card p-4 sm:p-5">
              <p className="text-sm font-semibold app-text-muted mb-3">Vé được tặng · {invitation.quantity || 1} vé</p>
              {invitation.tickets?.length ? <ul className="divide-y app-border rounded-lg border app-border">
                {invitation.tickets.map(ticket => <li key={ticket.ticketId} className="flex flex-wrap justify-between gap-2 p-3 text-sm">
                  <span className="font-semibold">{ticket.ticketTypeName || "Vé"}</span>
                  <span className="app-text-muted">{ticket.section} · {[ticket.row, ticket.seat].filter(Boolean).join(" · ") || "Vé tự do"}</span>
                </li>)}
              </ul> :
              <div className="rounded-lg border app-border p-3 bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    {invitation.ticketTypeName || "Vé"}
                  </span>
                  {invitation.section && <span className="text-xs app-text-muted">Khu vực: {invitation.section}</span>}
                </div>
                {seatLabel && (
                  <p className="mt-2 text-sm font-semibold">Ghế {seatLabel}</p>
                )}
              </div>}

              <dl className="mt-4 grid grid-cols-[110px_1fr] gap-y-2.5 text-xs">
                <dt className="app-text-muted">Suất diễn</dt><dd>{eventTime || "Đang cập nhật"}</dd>
                <dt className="app-text-muted">Địa điểm</dt><dd>{eventLocation || "Đang cập nhật"}</dd>
                <dt className="app-text-muted">Hết hạn nhận</dt>
                <dd className="flex items-center gap-1.5">
                  <FiClock className="h-3 w-3 text-amber-500" />
                  {invitation.expiresAt ? new Date(invitation.expiresAt).toLocaleString("vi-VN") : "—"}
                </dd>
              </dl>
            </div>

            {/* ── Terms + Accept ── */}
            {state === "WAITING_RECIPIENT" && (
              <div className="rounded-xl border app-border app-bg-card p-4 sm:p-5 space-y-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20 p-3 text-xs text-amber-900 dark:text-amber-200">
                  <p className="font-semibold mb-1">Lưu ý quan trọng</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Sau khi xác nhận, vé sẽ được chuyển vào tài khoản của bạn.</li>
                    <li>Vé gốc và mã QR của người tặng sẽ bị vô hiệu hóa.</li>
                    <li>Giao dịch này không thể hoàn tác.</li>
                  </ul>
                </div>

                <label className="flex items-start gap-2.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(event) => setAccepted(event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-blue-600"
                  />
                  <span>Tôi đã kiểm tra thông tin vé và đồng ý nhận vé.</span>
                </label>

                <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                  <Link
                    to={PATHS.MY_TICKETS}
                    className="flex min-h-11 items-center justify-center rounded-xl border app-border px-5 text-sm font-semibold app-text-main hover:bg-slate-500/10 transition"
                  >
                    Từ chối
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    disabled={!accepted || busy}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <FiGift className="h-4 w-4" />
                    {busy ? "Đang xác nhận…" : "Chấp nhận vé"}
                  </button>
                </div>
              </div>
            )}

            {state === "WAITING_TRANSFER" && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800/40 dark:bg-blue-950/20 p-5 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                <p className="mt-3 text-sm font-semibold text-blue-700 dark:text-blue-300">Đang chuyển vé và tạo mã QR mới…</p>
                <p className="mt-1 text-xs app-text-muted">Vui lòng chờ trong giây lát</p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* ── Confirmation Modal ── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4" role="presentation">
          <div className="w-full max-w-sm rounded-2xl border app-border app-bg-card p-6 shadow-xl animate-in zoom-in-95 duration-200" role="dialog" aria-modal="true">
            <h3 className="text-base font-bold">Chấp nhận lời mời?</h3>
            <p className="mt-2 text-sm app-text-muted">
              Bạn sắp nhận vé từ <strong className="app-text-main">{invitation?.senderName || "người tặng"}</strong>.
            </p>
            <p className="mt-2 text-xs app-text-muted">
              Sau khi xác nhận, vé sẽ được chuyển vào tài khoản của bạn và không thể hoàn tác giao dịch này.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl border app-border px-4 py-2 text-sm font-semibold app-text-main hover:bg-slate-500/10 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={accept}
                disabled={busy}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition"
              >
                {busy ? "Đang xử lý…" : "Chấp nhận vé"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
