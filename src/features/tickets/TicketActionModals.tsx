import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiCheck, FiLoader, FiX } from "react-icons/fi";
import { Button } from "@/components/common/Button";
import { marketplaceApi } from "@/services/marketplaceApi";
import { getCachedUserProfile, userApi } from "@/services/userApi";
import { ekycApi } from "@/services/ekycApi";
import { useMarketplaceSaga } from "@/features/resale/hooks/useMarketplaceSaga";
import { formatCurrency } from "@/utils/formatters";
import { PATHS } from "@/routes/paths";
import type { ResaleEligibility } from "@/types/marketplace";
import type { OwnedTicketApiResponse } from "@/types/ticket";
import type { TicketItem } from "./MyTickets";
import { TransferTicketSelection, useTransferTickets } from "./components/TransferTicketSelection";

interface ModalProps { ticket: TicketItem; onClose: () => void; onChanged: () => void }
const fieldClass = "min-h-11 w-full rounded-lg border app-border app-bg-card px-3 py-2 text-sm app-text-main focus:outline-none focus:ring-2 focus:ring-blue-500";

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const { t } = useTranslation();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return createPortal(<div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-4">
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
      className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl border app-border app-bg-card app-text-main sm:max-w-2xl sm:rounded-xl"
      onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); onClose(); }
        if (event.key !== "Tab") return;
        const nodes = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), [tabindex="0"]');
        if (!nodes?.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
      <header className="flex shrink-0 items-center justify-between border-b app-border px-5 py-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label={t("Đóng")} className="flex h-11 w-11 items-center justify-center rounded-lg app-text-muted hover:bg-slate-500/10"><FiX size={20} /></button>
      </header>
      <div className="overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>
    </div>
  </div>, document.body);
}

function FlowHeader({ ticket, steps, step }: { ticket: TicketItem; steps: string[]; step: number }) {
  return <>
    <ol className="flex gap-3 border-b app-border py-4 text-xs">
      {steps.map((label, index) => <li key={label} aria-current={step === index + 1 ? "step" : undefined}
        className={`flex-1 ${step === index + 1 ? "font-semibold app-text-brand" : "app-text-muted"}`}>{index + 1}. {label}</li>)}
    </ol>
    <div className="flex gap-3 py-5">
      {ticket.eventPoster && <img src={ticket.eventPoster} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />}
      <div className="min-w-0 text-sm"><h3 className="font-semibold">{ticket.eventTitle}</h3><p className="mt-1 text-xs app-text-muted">{ticket.eventTime}</p>
        <p className="mt-1 text-xs app-text-muted">{ticket.eventLocation}</p></div>
    </div>
  </>;
}

function SelectedTickets({ tickets }: { tickets: OwnedTicketApiResponse[] }) {
  const { t } = useTranslation();
  return <div className="overflow-hidden rounded-xl border app-border">
    <p className="border-b app-border app-bg-page px-4 py-3 text-sm font-semibold">{t("Đã chọn {{count}} vé", { count: tickets.length })}</p>
    <ul className="divide-y app-border">{tickets.map(ticket => <li key={ticket.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
      <span className="font-medium">{ticket.ticketTypeName || t("Vé")}</span>
      <span className="app-text-muted">{ticket.seatName || [ticket.row, ticket.seatNumber].filter(Boolean).join(" · ") || `${t("Mã vé")} ${ticket.id.slice(0, 8).toUpperCase()}`}</span>
    </li>)}</ul>
  </div>;
}

function ErrorNotice({ message }: { message: string }) {
  const { t } = useTranslation();
  if (!message) return null;
  return <div role="alert" className="my-4 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
    {message}{message.includes("eKYC") && <Link to={PATHS.EKYC} className="mt-2 block font-semibold underline">{t("Xác minh eKYC ngay")}</Link>}
  </div>;
}
function getErrorMessage(error: unknown, t: (k: string) => string) {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  const code = JSON.stringify(data || (error instanceof Error ? error.message : ""));
  if (code.includes("EKYC_REQUIRED")) return t("Tài khoản của bạn cần hoàn tất xác minh danh tính (eKYC) trước khi đăng bán lại vé.");
  if (code.includes("PRICE_OUT_OF_RANGE")) return t("Giá bán không nằm trong khoảng cho phép của tất cả vé đã chọn.");
  if (code.includes("POLICY_CHANGED")) return t("Chính sách vừa thay đổi. Quay lại để kiểm tra điều kiện vé.");
  if (code.includes("TICKET_NOT_ELIGIBLE")) return t("Một vé đã chọn không còn đủ điều kiện chuyển nhượng. Vui lòng tải lại danh sách.");
  if (code.includes("GIFT_DISABLED")) return t("Ban tổ chức chưa mở tính năng tặng vé cho sự kiện này.");
  if (code.includes("GIFT_LIMIT_REACHED")) return t("Một vé đã đạt giới hạn số lần tặng của sự kiện. Vui lòng chọn vé khác.");
  return t("Không thể hoàn tất thao tác. Vui lòng kiểm tra trạng thái vé và thử lại.");
}

function SagaNotice({ sagaId, gift, count, onChanged }: { sagaId: string; gift?: boolean; count: number; onChanged: () => void }) {
  const { t } = useTranslation();
  const { saga, error } = useMarketplaceSaga(sagaId, { stopOnWaitingRecipient: gift });
  const refreshed = useRef(false);
  const finished = Boolean(saga && ["COMPLETED", "WAITING_RECIPIENT", "FAILED", "COMPENSATED"].includes(saga.state));
  useEffect(() => { if (finished && !refreshed.current) { refreshed.current = true; onChanged(); } }, [finished, onChanged]);
  const success = saga?.state === "COMPLETED" || saga?.state === "WAITING_RECIPIENT";
  return <div role="status" className="space-y-3 rounded-xl border app-border p-5 text-sm">
    <div className="flex items-center gap-2 font-semibold">{success ? <FiCheck /> : !finished ? <FiLoader className="animate-spin" /> : null}
      {success ? (gift ? t("Đã tạo lời mời tặng {{count}} vé", { count }) : t("Đã xử lý đăng bán {{count}} vé", { count })) : finished ? t("Không thể hoàn tất chuyển nhượng") : t("Đang xử lý các vé đã chọn…")}</div>
    <p className="app-text-muted">{success ? (gift ? t("Người nhận có thể mở lời mời trong tài khoản hoặc email để nhận toàn bộ vé. Vé đang chờ sẽ được khóa check-in.") : t("Kiểm tra trạng thái tin đăng tại Vé của tôi. Vé đang bán được khóa check-in.")) : finished ? t("Hệ thống sẽ đối soát và mở khóa các vé nếu cần. Kiểm tra lại Vé của tôi.") : t("Bạn có thể đóng cửa sổ. Trạng thái sẽ được cập nhật từ hệ thống.")}</p>
    {Boolean(error) && <p className="app-text-muted">{t("Chưa nhận được cập nhật. Hệ thống đang kiểm tra lại, chưa xác nhận thao tác thất bại.")}</p>}
  </div>;
}

function SelectionContent({ selection }: { selection: ReturnType<typeof useTransferTickets> }) {
  const { t } = useTranslation();
  if (selection.loading) return <p role="status" className="py-8 text-center text-sm app-text-muted">{t("Đang tải vé trong đơn hàng…")}</p>;
  if (selection.error) return <><ErrorNotice message={selection.error} /><Button variant="outline" onClick={selection.retry}>{t("Thử lại")}</Button></>;
  return <TransferTicketSelection tickets={selection.tickets} selectedIds={selection.selectedIds} onChange={selection.setSelectedIds} />;
}
export function ResaleTicketModal({ ticket, onClose, onChanged }: ModalProps) {
  const { t } = useTranslation();
  const selection = useTransferTickets(ticket.id);
  const [step, setStep] = useState(1);
  const [noRetail, setNoRetail] = useState(false);
  const [policies, setPolicies] = useState<ResaleEligibility[]>([]);
  const [price, setPrice] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sagaId, setSagaId] = useState("");
  const requestKey = useRef(crypto.randomUUID());
  const count = selection.selectedIds.length;
  const allowRetail = count <= 1 || !noRetail;

  const sellerFeePercent = policies[0]?.serviceFeePercent ?? 5;

  const minPrice = Math.max(...policies.map(policy => policy.minPrice ?? 0));
  const maxPrice = policies.length ? Math.min(...policies.map(policy => policy.maxPrice ?? 0)) : 0;

  const numPrice = Number(price);
  const priceValid = price !== "" && Number.isSafeInteger(numPrice) && numPrice >= minPrice && numPrice <= maxPrice;
  const totalPrice = numPrice * count;
  const sellerFeeAmount = Math.round(totalPrice * (sellerFeePercent / 100));
  const netSellerReceives = Math.max(0, totalPrice - sellerFeeAmount);

  const check = async () => {
    if (!count || busy) return;
    setBusy(true); setError("");
    try {
      const ekyc = await ekycApi.getOrganizerEligibility();
      if (!ekyc.eligible) throw new Error("EKYC_REQUIRED");
      const results = await Promise.all(selection.selectedIds.map(id => marketplaceApi.getResaleEligibility(id)));
      const ineligible = results.find(result => !result.eligible);
      if (ineligible) {
        setError(ineligible.reasonCode === "RESALE_POLICY_NOT_CONFIGURED" || ineligible.reasonCode === "RESALE_DISABLED"
          ? t("Ban tổ chức chưa mở bán lại cho sự kiện này.") : t("Một vé đã chọn không đủ điều kiện bán lại hoặc đã hết thời gian đăng bán."));
        return;
      }
      const min = Math.max(...results.map(result => result.minPrice ?? 0));
      const max = Math.min(...results.map(result => result.maxPrice ?? 0));
      if (min > max) { setError(t("Các vé có khoảng giá khác nhau. Vui lòng chọn cùng hạng vé hoặc đăng bán thành các nhóm riêng.")); return; }
      setPolicies(results); setPrice(String(min)); setStep(2); setAccepted(false);
      requestKey.current = crypto.randomUUID();
    } catch (cause) { setError(getErrorMessage(cause, t)); }
    finally { setBusy(false); }
  };
  const submit = async () => {
    if (busy || !priceValid || !accepted || !count) return;
    setBusy(true); setError("");
    try {
      const result = await marketplaceApi.createResaleListing({ ticketIds: selection.selectedIds, price: Number(price), allowRetail,
        policyVersion: policies[0]?.policyVersion ?? undefined, termsVersion: policies[0]?.termsVersion ?? undefined }, requestKey.current);
      setSagaId(result.sagaId);
    } catch (cause) { setError(getErrorMessage(cause, t)); }
    finally { setBusy(false); }
  };
  return <ModalShell title={t("Đăng bán lại vé")} onClose={onClose}>
    <FlowHeader ticket={ticket} steps={[t("Chọn vé"), t("Thiết lập giá"), t("Xác nhận")]} step={step} />
    {sagaId ? <SagaNotice sagaId={sagaId} count={count} onChanged={onChanged} /> : <>
      {step === 1 ? <div className="space-y-5">
        <SelectionContent selection={selection} />
        {count > 0 && <div className="border-t app-border pt-4">
          <h3 className="mb-2 text-sm font-semibold">{t("Hình thức bán lại")}</h3>
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-sm">
            <span>{t("Không bán lẻ")}</span>
            <span className="relative shrink-0">
              <input type="checkbox" role="switch" aria-label={t("Không bán lẻ")} checked={!allowRetail} disabled={count <= 1}
                onChange={event => setNoRetail(event.target.checked)} className="peer sr-only" />
              <span aria-hidden="true" className="block h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2 peer-disabled:opacity-40" />
              <span aria-hidden="true" className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
            </span>
          </label>
          <p className="mt-1 text-xs leading-5 app-text-muted">{count === 1 ? t("Bạn đã chọn 1 vé, áp dụng bán lẻ.") : noRetail ? t("Người mua phải mua đủ {{count}} vé trong một đơn hàng.", { count }) : t("Người mua có thể chọn một hoặc nhiều vé trong nhóm này.")}</p>
        </div>}
      </div> : step === 2 ? <div className="space-y-5">
        <SelectedTickets tickets={selection.selectedTickets} />
        <div className="space-y-2 text-xs app-text-muted">{policies.map((policy, index) => <p key={policy.ticketId}>
          {selection.selectedTickets[index]?.ticketTypeName} · {t("Giá gốc")} {formatCurrency(policy.originalPrice ?? 0)}.
          {` ${t("Khoảng giá theo Ban tổ chức:")} ${formatCurrency(policy.minPrice ?? 0)} – ${formatCurrency(policy.maxPrice ?? 0)}`}
          {policy.originalPrice ? ` (${Number((((policy.minPrice ?? 0) / policy.originalPrice) * 100).toFixed(2))}%–${Number((((policy.maxPrice ?? 0) / policy.originalPrice) * 100).toFixed(2))}% ${t("giá gốc")}).` : ` ${t(". Vé miễn phí chỉ được đăng ở giá cho phép.")}`}
        </p>)}</div>
        <label className="block text-sm font-semibold">{t("Giá bán mỗi vé")}
          <input 
            aria-label={t("Giá bán mỗi vé")} 
            className={`${fieldClass} mt-2`} 
            value={price} 
            inputMode="numeric" 
            placeholder={t("Nhập từ {{min}}đ - {{max}}đ", { min: minPrice.toLocaleString('vi-VN'), max: maxPrice.toLocaleString('vi-VN') })}
            onChange={event => { setPrice(event.target.value.replace(/\D/g, "")); requestKey.current = crypto.randomUUID(); }} 
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="app-text-muted">{t("Khoảng giá cho phép:")} {formatCurrency(minPrice)} – {formatCurrency(maxPrice)} / {t("vé")}</span>
        </div>
        {price !== "" && numPrice > maxPrice && (
          <p className="text-xs text-rose-500 font-semibold">
            {t("Giá bán vượt giới hạn của sự kiện: tối đa {{max}} mỗi vé.", { max: formatCurrency(maxPrice) })}
          </p>
        )}
        {policies[0]?.closesAt && <p className="text-xs app-text-muted">{t("Nhận đăng bán đến {{time}}.", { time: new Date(policies[0].closesAt).toLocaleString("vi-VN") })}</p>}
        {priceValid && (
          <div className="rounded-xl border app-border bg-slate-50/50 dark:bg-slate-900/30 p-4 space-y-2 text-sm">
            <div className="flex justify-between text-xs app-text-muted">
              <span>{t("Tổng giá niêm yết ({{count}} vé)", { count })}</span>
              <span className="font-semibold">{formatCurrency(totalPrice)}</span>
            </div>
            <div className="flex justify-between text-xs text-rose-600 dark:text-rose-400 font-medium">
              <span>{t("Phí dịch vụ sàn ({{percent}}% khấu trừ người bán)", { percent: sellerFeePercent })}</span>
              <span>-{formatCurrency(sellerFeeAmount)}</span>
            </div>
            <div className="border-t app-border pt-2 flex justify-between font-bold">
              <span>{t("Số tiền thực nhận khi bán thành công")}</span>
              <span className="text-blue-600 dark:text-blue-400 font-black text-base">{formatCurrency(netSellerReceives)}</span>
            </div>
            <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
              {t("Tiền bán vé được ghi nhận sau khi chuyển vé thành công và chờ đối soát trước khi thanh toán cho bạn.")}
            </p>
          </div>
        )}
      </div> : <div className="space-y-4">
        <SelectedTickets tickets={selection.selectedTickets} />
        <div className="rounded-xl border app-border p-4 bg-slate-50/40 dark:bg-slate-900/20 space-y-2 text-sm">
          <div className="flex justify-between"><span className="app-text-muted">{t("Hình thức bán")}</span><span className="font-medium">{allowRetail ? t("Bán lẻ") : t("Không bán lẻ")}</span></div>
          <div className="flex justify-between"><span className="app-text-muted">{t("Giá mỗi vé")}</span><span>{formatCurrency(numPrice)}</span></div>
          <div className="flex justify-between"><span className="app-text-muted">{t("Tổng giá niêm yết ({{count}} vé)", { count })}</span><span className="font-semibold">{formatCurrency(totalPrice)}</span></div>
          <div className="flex justify-between text-xs text-rose-600 dark:text-rose-400">
            <span>{t("Phí sàn bán lại ({{percent}}%)", { percent: sellerFeePercent })}</span>
            <span>-{formatCurrency(sellerFeeAmount)}</span>
          </div>
          <div className="border-t app-border pt-2 flex justify-between font-bold">
            <span>{t("Số tiền thực nhận")}</span>
            <span className="text-base text-blue-600 dark:text-blue-400 font-black">{formatCurrency(netSellerReceives)}</span>
          </div>
        </div>
        <div className="rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 p-3 text-xs leading-relaxed text-blue-900 dark:text-blue-200">
          <strong>{t("Chuyển giao an toàn:")}</strong> {t("Vé đang bán được khóa check-in. Sau khi thanh toán và chuyển vé thành công, khoản phải trả cho bạn sẽ chờ đối soát trước khi chuyển tiền.")}
        </div>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 border-t app-border pt-4 text-sm">
          <input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-blue-600" />
          <span>{t("Tôi đồng ý điều khoản bán lại và hiểu rằng {{count}} vé đã chọn sẽ bị khóa check-in trong thời gian đăng bán.", { count })}</span>
        </label>
      </div>}
      <ErrorNotice message={error} />
    </>}
    <footer className="sticky bottom-0 mt-5 flex justify-end gap-3 border-t app-border app-bg-card py-4">
      <Button variant="secondary" className="min-h-11" onClick={() => { if (step > 1 && !sagaId) { setStep(step - 1); setError(""); } else onClose(); }} disabled={busy}>{sagaId ? t("Đóng") : step > 1 ? t("Quay lại") : t("Hủy")}</Button>
      {!sagaId && <Button className="min-h-11" disabled={busy || selection.loading || !count || Boolean(selection.error) || (step === 2 && !priceValid) || (step === 3 && !accepted)}
        onClick={step === 1 ? check : step === 2 ? () => setStep(3) : submit}>{busy ? t("Đang xử lý…") : step === 3 ? t("Xác nhận đăng bán") : t("Tiếp tục")}</Button>}
    </footer>
  </ModalShell>;
}

export function GiftTicketModal({ ticket, onClose, onChanged }: ModalProps) {
  const { t } = useTranslation();
  const selection = useTransferTickets(ticket.id);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [recipient, setRecipient] = useState<{ userId: string; email: string; fullName: string }>();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sagaId, setSagaId] = useState("");
  const requestKey = useRef(crypto.randomUUID());
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const findRecipient = async () => {
    if (!emailValid || busy) return;
    setBusy(true); setError("");
    try {
      const found = await userApi.findGiftRecipient(email.trim());
      if (found.userId === getCachedUserProfile()?.keycloakId) { setError(t("Bạn không thể tặng vé cho chính mình.")); setRecipient(undefined); return; }
      setRecipient(found);
    } catch { setRecipient(undefined); setError(t("Không tìm thấy tài khoản HaloTicket với email này. Vui lòng kiểm tra lại.")); }
    finally { setBusy(false); }
  };
  const submit = async () => {
    if (busy || !recipient || !accepted || !selection.selectedIds.length) return;
    setBusy(true); setError("");
    try {
      const result = await marketplaceApi.createGift({ ticketIds: selection.selectedIds, recipientEmail: recipient.email, message: message.trim() || undefined, acceptedTerms: true }, requestKey.current);
      setSagaId(result.sagaId);
    } catch (cause) { setError(getErrorMessage(cause, t)); }
    finally { setBusy(false); }
  };
  return <ModalShell title={t("Tặng vé")} onClose={onClose}>
    <FlowHeader ticket={ticket} steps={[t("Chọn vé"), t("Người nhận"), t("Xác nhận")]} step={step} />
    {sagaId ? <SagaNotice sagaId={sagaId} gift count={selection.selectedIds.length} onChanged={onChanged} /> : <>
      {step === 1 ? <SelectionContent selection={selection} /> : step === 2 ? <div className="space-y-4">
        <p className="text-sm app-text-muted">{t("Tặng {{count}} vé cho một tài khoản HaloTicket đã đăng ký.", { count: selection.selectedIds.length })}</p>
        <label className="block text-sm font-semibold" htmlFor="gift-email">{t("Email người nhận")}</label>
        <div className="flex gap-2"><input id="gift-email" type="email" disabled={busy} value={email} onChange={event => { setEmail(event.target.value); setRecipient(undefined); }} className={fieldClass} />
          <Button variant="outline" disabled={!emailValid || busy} onClick={findRecipient}>{busy ? t("Đang tìm…") : t("Tìm")}</Button></div>
        {recipient && <div className="rounded-xl border app-border p-4 text-sm"><p className="font-semibold">{recipient.fullName}</p><p className="mt-1 break-all app-text-muted">{recipient.email}</p></div>}
        <label className="block text-sm font-semibold">{t("Lời nhắn")} <span className="font-normal app-text-muted">({t("không bắt buộc")})</span>
          <textarea value={message} onChange={event => setMessage(event.target.value)} maxLength={200} rows={3} className={`${fieldClass} mt-2 resize-none`} /></label>
      </div> : <div className="space-y-4">
        <div className="border-b app-border pb-4 text-sm"><p className="app-text-muted">{t("Người nhận")}</p><p className="mt-1 font-semibold">{recipient?.fullName}</p><p className="break-all">{recipient?.email}</p>{message && <p className="mt-2 app-text-muted">{message}</p>}</div>
        <SelectedTickets tickets={selection.selectedTickets} />
        <p className="text-xs leading-6 app-text-muted">{t("Các vé đã chọn sẽ bị khóa trong thời gian chờ. Khi người nhận chấp nhận lời mời, toàn bộ vé được chuyển sang tài khoản người nhận cùng mã QR mới. Thời hạn nhận vé theo chính sách của sự kiện; hết hạn, hệ thống sẽ xử lý mở khóa vé.")}</p>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-blue-600" /><span>{t("Tôi đã kiểm tra người nhận, các vé đã chọn và đồng ý quy định tặng vé.")}</span></label>
      </div>}
      <ErrorNotice message={error} />
    </>}
    <footer className="sticky bottom-0 mt-5 flex justify-end gap-3 border-t app-border app-bg-card py-4">
      <Button variant="secondary" className="min-h-11" disabled={busy} onClick={() => { if (step > 1 && !sagaId) { setStep(step - 1); setError(""); } else onClose(); }}>{sagaId ? t("Đóng") : step > 1 ? t("Quay lại") : t("Hủy")}</Button>
      {!sagaId && <Button className="min-h-11" disabled={busy || selection.loading || Boolean(selection.error) || !selection.selectedIds.length || (step === 2 && !recipient) || (step === 3 && !accepted)}
        onClick={step === 3 ? submit : () => { setStep(step + 1); setError(""); setAccepted(false); requestKey.current = crypto.randomUUID(); }}>{busy ? t("Đang xử lý…") : step === 3 ? t("Xác nhận tặng vé") : t("Tiếp tục")}</Button>}
    </footer>
  </ModalShell>;
}
