import { useCallback, useEffect, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Link, useParams } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiCopy, FiCreditCard, FiRefreshCw } from "react-icons/fi";
import { payoutApi } from "@/services/payoutApi";
import type { PayoutDetail, PayoutStatus } from "@/types";

type FinancePayoutDetail = PayoutDetail & {
  eventEndAt?: string;
  refunds?: number | string;
  processingTime?: string;
};
type Step = { title: string; states: PayoutStatus[]; date?: string; message?: string; phase: "done" | "current" | "upcoming" | "failed" };
const statusNames: Record<string, string> = {
  PENDING: "Đang xét duyệt", APPROVED: "Đã phê duyệt", PROCESSING: "Đang chuyển", COMPLETED: "Hoàn tất",
  FAILED: "Chuyển thất bại", NEEDS_VERIFICATION: "Cần xác minh", REJECTED: "Đã từ chối", CANCELLED: "Đã hủy", DISPUTE: "Đang kiểm tra",
};
const badgeClass: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200", APPROVED: "bg-blue-50 text-blue-800 ring-blue-200", PROCESSING: "bg-blue-50 text-blue-800 ring-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-800 ring-emerald-200", FAILED: "bg-rose-50 text-rose-800 ring-rose-200", REJECTED: "bg-rose-50 text-rose-800 ring-rose-200",
  NEEDS_VERIFICATION: "bg-orange-50 text-orange-800 ring-orange-200", CANCELLED: "bg-slate-100 text-slate-700 ring-slate-200", DISPUTE: "bg-orange-50 text-orange-800 ring-orange-200",
};
const currency = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  try { return `${BigInt(String(value)).toLocaleString("vi-VN")} ₫`; } catch { return "—"; }
};
const dateTime = (value?: string, dateOnly = false) => {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString("vi-VN", dateOnly ? { dateStyle: "medium" } : { dateStyle: "medium", timeStyle: "short" });
};
const eventDate = (value?: string) => dateTime(value, true) || "Chưa có ngày sự kiện";
type TimelineCompatibilityEntry = { status: string; occurredAt?: string; publicMessage?: string; at?: string; reason?: string };
const timelineEntryTime = (entry?: TimelineCompatibilityEntry) => entry?.occurredAt || entry?.at;
const timelineEntryMessage = (entry?: TimelineCompatibilityEntry) => entry?.publicMessage || entry?.reason;
const lastStatusEntry = (payout: PayoutDetail, status: string) => (payout.timeline as TimelineCompatibilityEntry[] | undefined)?.findLast((entry) => entry.status === status);

function payoutSteps(payout: PayoutDetail): Step[] {
  const status = payout.status;
  const rejectedOrCancelled = status === "REJECTED" || status === "CANCELLED";
  const sequence: { title: string; states: PayoutStatus[]; isComplete: boolean; isCurrent: boolean; isFailure?: boolean; time?: string }[] = [
    { title: "Đã gửi", states: ["PENDING"], isComplete: true, isCurrent: false, time: payout.createdAt },
    {
      title: "Đang xét duyệt", states: ["PENDING", "NEEDS_VERIFICATION", "DISPUTE"],
      isComplete: ["APPROVED", "PROCESSING", "COMPLETED", "FAILED"].includes(status),
      isCurrent: ["PENDING", "NEEDS_VERIFICATION", "DISPUTE", "REJECTED", "CANCELLED"].includes(status),
      isFailure: rejectedOrCancelled,
      time: timelineEntryTime(lastStatusEntry(payout, status)),
    },
    {
      title: "Đã phê duyệt", states: ["APPROVED"], isComplete: ["PROCESSING", "COMPLETED", "FAILED"].includes(status),
      isCurrent: status === "APPROVED", isFailure: false, time: timelineEntryTime(lastStatusEntry(payout, "APPROVED")),
    },
    {
      title: "Đang chuyển", states: ["PROCESSING"], isComplete: status === "COMPLETED" || (status === "FAILED" && payout.timeline?.some((entry) => entry.status === "PROCESSING")),
      isCurrent: status === "PROCESSING", isFailure: status === "FAILED", time: timelineEntryTime(lastStatusEntry(payout, "PROCESSING")),
    },
    { title: "Hoàn tất", states: ["COMPLETED"], isComplete: status === "COMPLETED", isCurrent: false, time: timelineEntryTime(lastStatusEntry(payout, "COMPLETED")) || payout.transferredAt },
  ];
  const hasTransferStage = status === "PROCESSING" || status === "FAILED" || Boolean(lastStatusEntry(payout, "PROCESSING"));
  return sequence.filter(step => hasTransferStage || !step.states.includes("PROCESSING")).map((step) => {
    const entry = step.states.map((candidate) => lastStatusEntry(payout, candidate)).find(Boolean);
    const phase = step.isFailure ? "failed" : step.isCurrent ? "current" : step.isComplete ? "done" : "upcoming";
    return { title: step.title, states: step.states, date: step.time || timelineEntryTime(entry), message: timelineEntryMessage(entry), phase };
  });
}

export default function WithdrawalDetail() {
  const { id = "" } = useParams();
  const [payout, setPayout] = useState<FinancePayoutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const reload = useCallback(async () => {
    setLoading(true); setError("");
    try { setPayout(await payoutApi.getOrganizerPayout(id) as FinancePayoutDetail); }
    catch (err) {
      const response = (err as { response?: { status?: number; data?: { message?: string } } }).response;
      setPayout(null);
      setError(response?.status === 403 || response?.status === 404 ? "Không tìm thấy yêu cầu hoặc bạn không có quyền xem yêu cầu này." : response?.data?.message || "Không thể tải chi tiết yêu cầu.");
    } finally { setLoading(false); }
  }, [id]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void reload(); }, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);
  useEffect(() => {
    if (!payout || ["COMPLETED", "FAILED", "REJECTED", "CANCELLED"].includes(payout.status)) return;
    const timer = window.setInterval(() => { void reload(); }, 30_000);
    return () => window.clearInterval(timer);
  }, [payout, reload]);
  const cancel = async () => {
    if (!payout) return;
    setCancelling(true); setActionError("");
    try { await payoutApi.cancelPayout(payout.id); setCancelOpen(false); await reload(); }
    catch (err) {
      const response = (err as { response?: { status?: number; data?: { message?: string } } }).response;
      setActionError(response?.status === 409 ? "Yêu cầu vừa được cập nhật. Đã tải lại trạng thái mới; vui lòng kiểm tra trước khi thao tác tiếp." : response?.data?.message || "Không thể hủy yêu cầu.");
      setCancelOpen(false);
      await reload();
    } finally { setCancelling(false); }
  };
  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(payout?.id || id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { setActionError("Không thể sao chép mã yêu cầu trên thiết bị này."); }
  };

  return <main className="finance-theme mx-auto min-h-screen max-w-6xl app-bg-page p-4 md:p-8">
    <Link to="/organizer/finance?tab=history" className="inline-flex items-center gap-2 text-sm font-semibold text-[#005cff]"><FiArrowLeft />Lịch sử yêu cầu</Link>
    <div className="mt-4 rounded-2xl border border-[#e6edf8] bg-white p-5 shadow-sm md:p-7">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf2fa] pb-5">
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-[#62769c]">Chi tiết yêu cầu</p><div className="mt-1 flex flex-wrap items-center gap-2"><h1 className="font-mono text-lg font-bold text-[#101c48]">{id}</h1><button type="button" aria-label="Sao chép mã yêu cầu" onClick={() => void copyId()} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#e6edf8] px-2 text-xs font-semibold text-[#526889] hover:bg-[#f5f8fd]">{copied ? <FiCheck /> : <FiCopy />}{copied ? "Đã sao chép" : "Sao chép"}</button></div></div>
        <div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${payout ? badgeClass[payout.status] || "bg-slate-50 text-slate-700 ring-slate-200" : "bg-slate-50 text-slate-600 ring-slate-200"}`}>{payout ? statusNames[payout.status] || payout.status : "Đang tải"}</span><button type="button" onClick={() => void reload()} aria-label="Làm mới" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e6edf8] text-[#526889] hover:bg-[#f5f8fd]"><FiRefreshCw /></button></div>
      </header>
      {loading ? <div role="status" className="p-12 text-center text-sm text-[#62769c]">Đang tải chi tiết…</div> : error ? <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{error}<div><button type="button" onClick={() => void reload()} className="mt-3 font-semibold underline">Thử lại</button></div></div> : payout && <>
        <div className="grid gap-6 pt-6 lg:grid-cols-[1.4fr_1fr]">
          <section aria-labelledby="withdrawal-progress-title" className="rounded-xl border border-[#edf2fa] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="withdrawal-progress-title" className="text-lg font-bold text-[#101c48]">Trạng thái yêu cầu</h2><p className="mt-1 text-sm text-[#62769c]">{payout.eventName || "Sự kiện"}</p></div><span className="rounded-lg bg-[#f5f8fd] px-3 py-1.5 text-xs font-semibold text-[#526889]">{payout.requestType === "ADVANCE" ? "Tạm ứng (cũ)" : "Rút tiền"}</span></div>
            <ol aria-label="Tiến trình yêu cầu" className="mt-6 space-y-0">{payoutSteps(payout).map((step, index) => <li key={step.title} className="group relative flex gap-3 pb-6 last:pb-0">
              <span aria-hidden="true" className={`absolute left-[11px] top-6 h-[calc(100%-1rem)] w-0.5 group-last:hidden ${step.phase === "done" ? "bg-emerald-200" : "bg-[#e6edf8]"}`} />
              <span aria-hidden="true" className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${step.phase === "done" ? "border-emerald-600 bg-emerald-600 text-white" : step.phase === "current" ? "border-[#005cff] bg-white text-[#005cff] ring-4 ring-blue-50" : step.phase === "failed" ? "border-rose-500 bg-rose-50 text-rose-600" : "border-[#d6dfed] bg-white text-transparent"}`}>{step.phase === "done" ? <FiCheck size={13} /> : <span className="h-2 w-2 rounded-full bg-current" />}</span>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-x-3"><p className={`text-sm font-semibold ${step.phase === "upcoming" ? "text-[#91a0b8]" : step.phase === "failed" ? "text-rose-700" : "text-[#101c48]"}`}>{step.phase === "failed" || (step.phase === "current" && index === 1 && ["NEEDS_VERIFICATION", "DISPUTE"].includes(payout.status)) ? statusNames[payout.status] || step.title : step.title}</p>{step.date && <time className="text-xs text-[#7789a7]">{dateTime(step.date)}</time>}</div>{step.phase === "current" && <p className="mt-1 text-xs text-[#62769c]">Yêu cầu đang ở bước này.</p>}{step.message && <p className="mt-1 text-sm text-[#62769c]">{step.message}</p>}</div>
            </li>)}</ol>
          </section>
          <div className="space-y-4">
            <section aria-labelledby="request-info-title" className="rounded-xl border border-[#edf2fa] p-5"><h2 id="request-info-title" className="font-bold text-[#101c48]">Thông tin khoản chi</h2><dl className="mt-4 space-y-3 text-sm">
              <DetailRow label="Sự kiện" value={payout.eventName || payout.eventId} /><DetailRow label="Ngày sự kiện" value={eventDate(payout.eventEndAt)} /><DetailRow label="Loại yêu cầu" value={payout.requestType === "ADVANCE" ? "Tạm ứng (cũ)" : "Rút tiền"} />
              <DetailRow label="Doanh thu đã thu" value={currency(payout.grossAmount)} /><DetailRow label="Phí" value={currency(payout.platformFee)} /><DetailRow label="Hoàn tiền đã ghi nhận" value={currency(payout.refunds)} />
              <div className="flex items-end justify-between gap-3 border-t border-[#edf2fa] pt-3"><dt className="font-semibold text-[#101c48]">Số tiền yêu cầu</dt><dd className="text-right text-xl font-bold text-emerald-700">{currency(payout.netAmount)}</dd></div>
            </dl>{payout.processingTime && <p className="mt-4 rounded-lg bg-[#f5f8fd] p-3 text-xs leading-5 text-[#526889]">Thời gian xử lý dự kiến: {payout.processingTime}</p>}</section>
            <section aria-labelledby="account-snapshot-title" className="overflow-hidden rounded-xl border border-[#e3ebf7] bg-gradient-to-br from-[#f8fbff] to-white p-5"><div className="flex items-center gap-3"><span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf1ff] text-[#005cff]"><FiCreditCard /></span><div><h2 id="account-snapshot-title" className="font-bold text-[#101c48]">Tài khoản nhận tiền</h2><p className="text-xs text-[#62769c]">Thông tin đã lưu khi gửi yêu cầu</p></div></div>{payout.accountSnapshot ? <dl className="mt-4 space-y-2 rounded-lg border border-[#edf2fa] bg-white p-3 text-sm"><DetailRow label="Ngân hàng" value={payout.accountSnapshot.bankName || "—"} /><DetailRow label="Chủ tài khoản" value={payout.accountSnapshot.accountHolder || "—"} /><DetailRow label="Số tài khoản" value={payout.accountSnapshot.accountNumberMasked || "—"} /></dl> : <p className="mt-4 rounded-lg bg-white p-3 text-sm text-[#62769c]">Máy chủ chưa cung cấp ảnh chụp tài khoản nhận.</p>}</section>
          </div>
        </div>
        {payout.publicReason && <div role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong className="mr-1">Thông tin từ bộ phận xử lý:</strong>{payout.publicReason}</div>}
        {actionError && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{actionError}</div>}
        {(payout.receiptUrl || payout.transferReceiptUrl) && <a href={payout.receiptUrl || payout.transferReceiptUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex font-semibold text-[#005cff] underline">Xem biên nhận chuyển tiền</a>}
        {payout.allowedActions?.includes("CANCEL") && payout.status === "PENDING" && <div className="mt-5 border-t border-[#edf2fa] pt-5"><AlertDialog.Root open={cancelOpen} onOpenChange={setCancelOpen}><AlertDialog.Trigger asChild><button type="button" disabled={cancelling} className="min-h-10 rounded-lg border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Hủy yêu cầu</button></AlertDialog.Trigger><AlertDialog.Portal><AlertDialog.Overlay className="fixed inset-0 z-50 bg-slate-950/45 data-[state=open]:animate-in data-[state=closed]:animate-out" /><AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#e6edf8] bg-white p-6 shadow-2xl focus:outline-none"><AlertDialog.Title className="text-lg font-bold text-[#101c48]">Hủy yêu cầu rút tiền?</AlertDialog.Title><AlertDialog.Description className="mt-2 text-sm leading-6 text-[#62769c]">Yêu cầu này sẽ được gửi lên hệ thống để hủy. Bạn có thể tiếp tục theo dõi trạng thái mới sau khi xác nhận.</AlertDialog.Description><div className="mt-6 flex justify-end gap-3"><AlertDialog.Cancel asChild><button type="button" disabled={cancelling} className="min-h-10 rounded-lg border border-[#dbe4f2] px-4 text-sm font-semibold text-[#526889]">Quay lại</button></AlertDialog.Cancel><AlertDialog.Action asChild><button type="button" disabled={cancelling} onClick={(event) => { event.preventDefault(); void cancel(); }} className="min-h-10 rounded-lg bg-[#005cff] px-4 text-sm font-bold text-white disabled:opacity-50">{cancelling ? "Đang hủy…" : "Xác nhận hủy"}</button></AlertDialog.Action></div></AlertDialog.Content></AlertDialog.Portal></AlertDialog.Root></div>}
      </>}
    </div>
  </main>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3"><dt className="text-[#62769c]">{label}</dt><dd className="text-right font-medium text-[#101c48]">{value}</dd></div>;
}
