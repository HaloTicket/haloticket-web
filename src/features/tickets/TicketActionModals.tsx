import { useEffect, useMemo, useRef, useState } from "react";
import { FiAlertCircle, FiCheck, FiGift, FiLoader, FiTag, FiX } from "react-icons/fi";
import { marketplaceApi } from "@/services/marketplaceApi";
import { useMarketplaceSaga } from "@/features/resale/hooks/useMarketplaceSaga";
import { formatCurrency } from "@/utils/formatters";
import type { ResaleEligibility } from "@/types/marketplace";
import type { TicketItem } from "./MyTickets";

interface ModalProps {
  ticket: TicketItem;
  onClose: () => void;
  onChanged: () => void;
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/70 sm:items-center sm:p-4" role="presentation">
      <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl border app-border app-bg-card shadow-2xl sm:max-w-xl sm:rounded-2xl" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b app-border app-bg-card px-5 py-4 sm:px-6">
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">HaloTicket Marketplace</p><h2 className="mt-0.5 text-lg font-bold app-text-main">{title}</h2></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 app-text-muted hover:bg-slate-500/10 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Đóng">
            <FiX className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TicketSummary({ ticket }: { ticket: TicketItem }) {
  return (
    <div className="flex gap-4 rounded-2xl border app-border app-bg-subnav p-3">
      <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-800">
        {ticket.eventPoster && <img src={ticket.eventPoster} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-bold leading-snug app-text-main">{ticket.eventTitle}</p>
        <p className="mt-1.5 text-xs app-text-sub">{ticket.ticketTypeName} · 1 vé</p>
        <p className="mt-1 font-semibold app-text-main">{formatCurrency(ticket.totalAmount)}</p>
      </div>
    </div>
  );
}

function FlowSteps({ gift = false }: { gift?: boolean }) {
  const steps = gift ? ["Người nhận", "Xác nhận", "Chuyển vé"] : ["Thiết lập giá", "Xác nhận", "Đăng bán"];
  return <ol className="grid grid-cols-3 gap-2" aria-label="Các bước thực hiện">{steps.map((step, index) => <li key={step} className="flex items-center gap-2 text-[11px] font-semibold app-text-muted"><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${index === 0 ? "border-blue-600 bg-blue-600 text-white" : "app-border app-bg-subnav"}`}>{index + 1}</span><span className="hidden sm:inline">{step}</span></li>)}</ol>;
}

function errorMessage(error: unknown) {
  const response = (error as { response?: { data?: { message?: string; detail?: string } } })?.response?.data;
  const code = response?.message || response?.detail || "";
  if (code.includes("PRICE_OUT_OF_RANGE")) return "Giá bán phải nằm trong khoảng cho phép.";
  if (code.includes("POLICY_CHANGED")) return "Chính sách bán lại vừa thay đổi. Hãy tải lại thông tin giá.";
  if (code.includes("TICKET_NOT_ELIGIBLE")) return "Vé không còn đủ điều kiện thực hiện thao tác này.";
  return "Không thể hoàn tất thao tác. Trạng thái vé sẽ được hệ thống đối soát và khôi phục nếu cần.";
}

export function ResaleTicketModal({ ticket, onClose, onChanged }: ModalProps) {
  const [eligibility, setEligibility] = useState<ResaleEligibility | null>(null);
  const [price, setPrice] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loadingEligibility, setLoadingEligibility] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sagaId, setSagaId] = useState<string>();
  const changedForSaga = useRef<string | undefined>(undefined);
  const { saga } = useMarketplaceSaga(sagaId);

  useEffect(() => {
    let active = true;
    marketplaceApi.getResaleEligibility(ticket.id)
      .then((result) => {
        if (!active) return;
        setEligibility(result);
        if (result.minPrice != null) setPrice(String(result.minPrice));
      })
      .catch((error) => active && setSubmitError(errorMessage(error)))
      .finally(() => active && setLoadingEligibility(false));
    return () => { active = false; };
  }, [ticket.id]);

  useEffect(() => {
    if (!sagaId || changedForSaga.current === sagaId || !saga) return;
    if (["COMPLETED", "FAILED", "COMPENSATED"].includes(saga.state)) {
      changedForSaga.current = sagaId;
      onChanged();
    }
  }, [onChanged, saga, sagaId]);

  const numericPrice = Number(price);
  const priceValid = useMemo(() => Boolean(
    eligibility?.eligible && Number.isInteger(numericPrice) && numericPrice >= (eligibility.minPrice ?? 0) && numericPrice <= (eligibility.maxPrice ?? Number.MAX_SAFE_INTEGER)
  ), [eligibility, numericPrice]);

  const submit = async () => {
    if (!eligibility || !priceValid || !accepted) return;
    setSubmitError(null);
    try {
      const result = await marketplaceApi.createResaleListing({
        ticketId: ticket.id,
        price: numericPrice,
        policyVersion: eligibility.policyVersion ?? undefined,
        termsVersion: eligibility.termsVersion ?? undefined,
      });
      setSagaId(result.sagaId);
    } catch (error) {
      setSubmitError(errorMessage(error));
      onChanged();
    }
  };

  const failed = saga && ["FAILED", "COMPENSATED"].includes(saga.state);
  const completed = saga?.state === "COMPLETED";

  return (
    <ModalShell title="Đăng bán lại vé" onClose={onClose}>
      <div className="space-y-5 p-5 sm:p-6">
        <FlowSteps />
        <TicketSummary ticket={ticket} />
        {loadingEligibility ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm app-text-sub"><FiLoader className="animate-spin" /> Đang kiểm tra điều kiện bán lại…</div>
        ) : completed ? (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            <div className="flex items-center gap-2 font-bold"><FiCheck /> Vé đã được đăng bán.</div>
            <p className="mt-1">Vé đã khóa check-in và tin đăng đang hiển thị trên Marketplace.</p>
          </div>
        ) : failed ? (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            <div className="flex items-center gap-2 font-bold"><FiAlertCircle /> Đăng bán không thành công</div>
            <p className="mt-1">{saga.lastError || "Hệ thống đang trả vé về trạng thái trước đó."}</p>
          </div>
        ) : sagaId ? (
          <div className="flex items-center gap-3 rounded-xl border app-border p-4 text-sm app-text-main"><FiLoader className="animate-spin text-blue-600" /> Đang khóa vé và công khai tin đăng…</div>
        ) : eligibility?.eligible ? (
          <>
            <div className="grid grid-cols-3 overflow-hidden rounded-xl border app-border text-sm">
              <div className="p-3"><p className="text-xs app-text-muted">Giá gốc</p><p className="mt-1 font-semibold app-text-main">{formatCurrency(eligibility.originalPrice || 0)}</p></div>
              <div className="border-x app-border p-3"><p className="text-xs app-text-muted">Tối thiểu</p><p className="mt-1 font-semibold app-text-main">{formatCurrency(eligibility.minPrice || 0)}</p></div>
              <div className="p-3"><p className="text-xs app-text-muted">Tối đa</p><p className="mt-1 font-semibold app-text-main">{formatCurrency(eligibility.maxPrice || 0)}</p></div>
            </div>
            <label className="block text-sm font-semibold app-text-main">
              Giá bán
              <div className="relative mt-2">
                <input value={price} onChange={(event) => setPrice(event.target.value.replace(/\D/g, ""))} inputMode="numeric" className="w-full rounded-xl border app-border app-bg-card px-4 py-3 pr-12 text-base font-semibold app-text-main focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Giá bán" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm app-text-muted">đ</span>
              </div>
              {price && !priceValid && <span className="mt-1 block text-xs text-rose-600">Nhập giá trong khoảng {formatCurrency(eligibility.minPrice || 0)} – {formatCurrency(eligibility.maxPrice || 0)}.</span>}
            </label>
            {eligibility.closesAt && <p className="text-xs app-text-sub">Nhận đăng bán đến {new Date(eligibility.closesAt).toLocaleString("vi-VN")}.</p>}
            <label className="flex cursor-pointer items-start gap-3 text-sm app-text-sub">
              <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <span>Tôi đồng ý điều khoản bán lại và hiểu rằng vé sẽ bị khóa check-in khi tin đăng được tạo.</span>
            </label>
          </>
        ) : (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">Vé không đủ điều kiện bán lại hoặc thời gian nhận đăng bán đã kết thúc.</div>
        )}
        {submitError && <p className="text-sm text-rose-600">{submitError}</p>}
        <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-3 border-t app-border app-bg-card px-5 py-4 sm:-mx-6 sm:-mb-6 sm:px-6">
          <button type="button" onClick={onClose} className="rounded-xl border app-border px-4 py-2.5 text-sm font-semibold app-text-main hover:bg-slate-500/10">{completed || failed ? "Đóng" : "Hủy"}</button>
          {!sagaId && eligibility?.eligible && <button type="button" onClick={submit} disabled={!priceValid || !accepted} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><span className="inline-flex items-center gap-2"><FiTag /> Xác nhận đăng bán</span></button>}
        </div>
      </div>
    </ModalShell>
  );
}

export function GiftTicketModal({ ticket, onClose, onChanged }: ModalProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sagaId, setSagaId] = useState<string>();
  const changedForSaga = useRef<string | undefined>(undefined);
  const { saga } = useMarketplaceSaga(sagaId, { stopOnWaitingRecipient: true });
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  useEffect(() => {
    if (!sagaId || changedForSaga.current === sagaId || !saga) return;
    if (["WAITING_RECIPIENT", "COMPLETED", "FAILED", "COMPENSATED"].includes(saga.state)) {
      changedForSaga.current = sagaId;
      onChanged();
    }
  }, [onChanged, saga, sagaId]);

  const submit = async () => {
    if (!emailValid) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await marketplaceApi.createGift({ ticketId: ticket.id, recipientEmail: email.trim(), message: message.trim() || undefined });
      setSagaId(result.sagaId);
    } catch (error) {
      setSubmitError(errorMessage(error));
      onChanged();
    } finally {
      setSubmitting(false);
    }
  };

  const waitingRecipient = saga?.state === "WAITING_RECIPIENT";
  const completed = saga?.state === "COMPLETED";
  const failed = saga && ["FAILED", "COMPENSATED"].includes(saga.state);

  return (
    <ModalShell title="Tặng vé" onClose={onClose}>
      <div className="space-y-5 p-5 sm:p-6">
        <FlowSteps gift />
        <TicketSummary ticket={ticket} />
        {waitingRecipient || completed ? (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            <div className="flex items-center gap-2 font-bold"><FiCheck /> {completed ? "Đã chuyển vé" : "Đã gửi lời mời nhận vé"}</div>
            <p className="mt-1">{completed ? "Quyền sở hữu vé đã được cập nhật." : `Người nhận cần mở email ${email} và xác nhận trước khi vé được chuyển.`}</p>
          </div>
        ) : failed ? (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"><div className="flex items-center gap-2 font-bold"><FiAlertCircle /> Không thể tặng vé</div><p className="mt-1">{saga.lastError || "Vé đang được trả về trạng thái trước đó."}</p></div>
        ) : sagaId ? (
          <div className="flex items-center gap-3 rounded-xl border app-border p-4 text-sm app-text-main"><FiLoader className="animate-spin text-blue-600" /> Đang khóa vé và gửi lời mời…</div>
        ) : (
          <>
            <label className="block text-sm font-semibold app-text-main">Email người nhận<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="nguoinhan@example.com" className="mt-2 w-full rounded-xl border app-border app-bg-card px-4 py-3 font-normal app-text-main focus:outline-none focus:ring-2 focus:ring-blue-500" /></label>
            <label className="block text-sm font-semibold app-text-main">Lời nhắn <span className="font-normal app-text-muted">(không bắt buộc)</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} maxLength={300} className="mt-2 w-full resize-none rounded-xl border app-border app-bg-card px-4 py-3 font-normal app-text-main focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Gửi một lời nhắn cùng vé…" /></label>
            <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><p>Vé sẽ bị khóa check-in trong lúc chờ người nhận xác nhận. Mã QR mới được tạo sau khi chuyển vé thành công.</p></div>
          </>
        )}
        {submitError && <p className="text-sm text-rose-600">{submitError}</p>}
        <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-3 border-t app-border app-bg-card px-5 py-4 sm:-mx-6 sm:-mb-6 sm:px-6">
          <button type="button" onClick={onClose} className="rounded-xl border app-border px-4 py-2.5 text-sm font-semibold app-text-main hover:bg-slate-500/10">{waitingRecipient || completed || failed ? "Đóng" : "Hủy"}</button>
          {!sagaId && <button type="button" onClick={submit} disabled={!emailValid || submitting} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><span className="inline-flex items-center gap-2">{submitting ? <FiLoader className="animate-spin" /> : <FiGift />} Xác nhận tặng vé</span></button>}
        </div>
      </div>
    </ModalShell>
  );
}
