import { useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiCalendar, FiCheck, FiCheckCircle, FiClock, FiRefreshCw, FiSearch, FiShield, FiUser } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { normalizePayoutFilter, payoutStatusGroup, payoutStatusGroups, type PayoutStatusGroup } from "@/utils/payoutStatusGroups";
import { payoutApi } from "@/services/payoutApi";
import type { AdminPayoutDetail, AdminPayoutRow } from "@/types";
import { FinanceOverview } from "@/features/admin/finance/FinanceOverview";
import { useSearchParams } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { eventApi } from "@/services/eventApi";
import type { EventApiData } from "@/types";

type FinanceTab = "overview" | "requests";
type StatusFilter = "ALL" | PayoutStatusGroup;

const tabs: { id: FinanceTab; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "requests", label: "Yêu cầu rút tiền" },
];

const statusLabels: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt · chờ xử lý",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Hoàn tất",
  FAILED: "Thất bại",
  NEEDS_VERIFICATION: "Cần xác minh",
  REJECTED: "Từ chối",
  CANCELLED: "Đã hủy",
  DISPUTE: "Tạm giữ để kiểm tra",
};

const money = (value: number | string | undefined) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? `${amount.toLocaleString("vi-VN")} ₫` : "—";
};

const dateTime = (value?: string) => value ? new Date(value).toLocaleString("vi-VN") : "—";
const requestTypeLabel = (type?: string) => type === "ADVANCE" ? "Tạm ứng (cũ)" : "Rút tiền";

function FinanceDialog({ title, subtitle, icon, onClose, pending, children }: { title: string; subtitle: string; icon: React.ReactNode; onClose: () => void; pending: boolean; children: React.ReactNode }) {
  return <Dialog.Root open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[9998] bg-[#101c48]/45 backdrop-blur-sm" />
      <Dialog.Content onEscapeKeyDown={(event) => { if (pending) event.preventDefault(); }} onPointerDownOutside={(event) => { if (pending) event.preventDefault(); }} className="finance-theme fixed left-1/2 top-1/2 z-[9999] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#dce6f8] bg-white p-5 text-[#101c48] shadow-2xl focus:outline-none sm:p-6" aria-describedby="finance-dialog-description">
        <div className="mb-5 flex items-start gap-3 border-b border-[#dce6f8] pb-4"><span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf3ff] text-[#005cff]">{icon}</span><div><Dialog.Title className="text-lg font-bold text-[#101c48]">{title}</Dialog.Title><Dialog.Description id="finance-dialog-description" className="mt-1 text-sm text-slate-600">{subtitle}</Dialog.Description></div></div>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function eventPosterUrl(event?: EventApiData) {
  return [event?.posterImage, event?.bannerUrl, event?.thumbnailUrl].find((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function StatusBadge({ status, grouped = false }: { status: string; grouped?: boolean }) {
  if (grouped) status = payoutStatusGroup(status);
  const color = status === "COMPLETED" ? "text-emerald-700 bg-emerald-50" :
    status === "PENDING" ? "text-orange-800 bg-orange-50" :
      status === "PROCESSING" ? "text-[#31416e] bg-[#edf3ff]" :
        ["DISPUTE", "NEEDS_VERIFICATION", "FAILED"].includes(status) ? "text-rose-700 bg-rose-50" : "text-slate-700 bg-slate-100";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{(grouped ? payoutStatusGroups[status as PayoutStatusGroup] : statusLabels[status]) || status}</span>;
}

function DetailPanel({ payout: row, event, onBack, onRefresh }: { payout: AdminPayoutRow; event?: EventApiData; onBack: () => void; onRefresh: () => void }) {
  const [payout, setPayout] = useState<AdminPayoutDetail | AdminPayoutRow>(row);
  const [detailLoading, setDetailLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showHold, setShowHold] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [transactionReference, setTransactionReference] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [showRecordTransfer, setShowRecordTransfer] = useState(false);
  const [accountVerificationReference, setAccountVerificationReference] = useState("");
  const [verifyingAccount, setVerifyingAccount] = useState(false);
  useEffect(() => {
    let active = true;
    payoutApi.getAdminPayout(row.id).then((detail) => { if (active) setPayout(detail); })
      .catch(() => { if (active) toast.error("Không tải được chi tiết đầy đủ; đang hiển thị dữ liệu danh sách."); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [row.id]);
  const snapshot = payout.accountSnapshot;
  const eventName = payout.eventName || event?.title || "Tên sự kiện chưa có";
  const poster = eventPosterUrl(event);
  const checks = "checks" in payout ? payout.checks || [] : [];
  const account = snapshot || (payout.bankNameSnapshot || payout.accountHolderSnapshot || payout.maskedAccountNumber ? {
    bankName: payout.bankNameSnapshot || "",
    accountHolder: payout.accountHolderSnapshot || "",
    accountNumberMasked: payout.maskedAccountNumber || "",
  } : undefined);
  const canApprove = payout.status === "PENDING" && (payout.allowedActions?.includes("APPROVE") ?? true);
  const canHold = payout.status === "PENDING" && (payout.allowedActions?.includes("DISPUTE") ?? true);

  const approve = async () => {
    setBusy(true);
    try {
      const updated = await payoutApi.approvePayout(payout.id);
      toast.success(updated.status === "APPROVED" ? "Đã duyệt yêu cầu. Yêu cầu đang chờ xử lý." : "Trạng thái yêu cầu đã được cập nhật.");
      setPayout(current => ({ ...current, ...updated, allowedActions: ["RECORD_TRANSFER"] }));
      setShowApprove(false);
      onRefresh();
    } catch {
      toast.error("Không thể duyệt yêu cầu. Có thể yêu cầu đã được xử lý; dữ liệu đã được tải lại.");
      onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const hold = async () => {
    if (!holdReason.trim()) return;
    setBusy(true);
    try {
      await payoutApi.disputePayout(payout.id, holdReason.trim());
      toast.success("Đã tạm giữ yêu cầu để kiểm tra.");
      onRefresh();
      onBack();
    } catch {
      toast.error("Không thể tạm giữ yêu cầu. Dữ liệu đã được tải lại.");
      onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!rejectReason.trim()) return;
    setBusy(true);
    try {
      await payoutApi.rejectAdminPayout(payout.id, rejectReason.trim());
      toast.success("Đã từ chối yêu cầu.");
      onRefresh();
      onBack();
    } catch {
      toast.error("Không thể từ chối yêu cầu. Có thể yêu cầu đã được xử lý.");
      onRefresh();
    } finally { setBusy(false); }
  };

  const recordTransfer = async () => {
    if (!transactionReference.trim()) return;
    if (receiptUrl.trim()) {
      try { new URL(receiptUrl); } catch { toast.error("Biên nhận cần là một liên kết hợp lệ."); return; }
    }
    setBusy(true);
    try {
      await payoutApi.recordAdminDisbursement(payout.id, { reference: transactionReference.trim(), transferredAt: new Date().toISOString(), receiptUrl: receiptUrl.trim() || undefined });
      toast.success("Đã ghi nhận giao dịch chuyển thủ công thành công.");
      onRefresh();
      onBack();
    } catch {
      toast.error("Không thể ghi nhận giao dịch. Kiểm tra tham chiếu và trạng thái trước khi thử lại.");
      onRefresh();
    } finally { setBusy(false); }
  };

  const verifyAccount = async () => {
    if (!accountVerificationReference.trim()) return;
    setVerifyingAccount(true);
    try {
      await payoutApi.verifyAdminPayoutAccount(payout.organizerUserId, accountVerificationReference.trim());
      toast.success("Đã lưu tham chiếu xác minh tài khoản theo kết quả kiểm tra của bạn.");
      setPayout((current) => ({ ...current, payoutAccountVerified: true }));
      setAccountVerificationReference("");
      onRefresh();
    } catch {
      toast.error("Không thể ghi nhận xác minh tài khoản. Kiểm tra quyền và mã tham chiếu.");
    } finally { setVerifyingAccount(false); }
  };

  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[#005cff] hover:text-[#31416e]"><FiArrowLeft /> Quay lại hàng đợi</button>
      <div className="flex flex-wrap items-center gap-3"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mã yêu cầu</span><code className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-[#101c48]">{payout.id}</code><StatusBadge status={payout.status} /></div>
    </div>
    <div className="rounded-2xl border app-border app-bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b app-border pb-4">
          <div className="flex items-center gap-3">{poster && <img src={poster} alt="" className="h-14 w-14 rounded-lg object-cover" />}<div><h2 className="text-xl font-bold app-text-main">{eventName}</h2><p className="mt-1 text-sm text-slate-500">{requestTypeLabel(payout.requestType)} · gửi {dateTime(payout.createdAt)}</p>{detailLoading && <p className="mt-1 text-xs text-slate-400">Đang tải chi tiết…</p>}</div></div>
        <div className="text-right"><div className="text-xs text-slate-500">Số tiền yêu cầu</div><div className="text-2xl font-bold text-emerald-700">{money(payout.netAmount)}</div></div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <div className="space-y-5">
          <div className="rounded-xl border app-border p-4">
            <h3 className="font-semibold app-text-main">Thông tin yêu cầu</h3>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Sự kiện</dt><dd className="mt-1 font-medium app-text-main">{eventName}</dd></div>
              <div><dt className="text-slate-500">Mã sự kiện</dt><dd className="mt-1 break-all font-medium app-text-main">{payout.eventId || "—"}</dd></div>
              <div><dt className="text-slate-500">Ban tổ chức</dt><dd className="mt-1 break-all font-medium app-text-main">{payout.organizerUserId || "—"}</dd></div>
              <div><dt className="text-slate-500">Gửi lúc</dt><dd className="mt-1 font-medium app-text-main">{dateTime(payout.createdAt)}</dd></div>
            </dl>
          </div>
          <div className="rounded-xl border app-border p-4">
            <h3 className="font-semibold app-text-main">Lịch sử trạng thái</h3>
            {payout.timeline?.length ? <ol className="mt-3 space-y-3">{payout.timeline.map((entry, index) => <li key={`${entry.occurredAt}-${index}`} className="flex gap-3 text-sm"><FiClock className="mt-0.5 shrink-0 text-slate-400" /><div><div className="font-medium app-text-main">{statusLabels[entry.status] || entry.status}</div><div className="text-xs text-slate-500">{dateTime(entry.occurredAt)}{entry.publicMessage ? ` · ${entry.publicMessage}` : ""}</div></div></li>)}</ol> : <p className="mt-2 text-sm text-slate-500">Chưa có lịch sử trạng thái.</p>}
          </div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-xl border app-border bg-white p-4">
            <h3 className="font-semibold app-text-main">Tài khoản nhận theo yêu cầu</h3>
            {account ? <dl className="mt-3 space-y-2 text-sm"><div><dt className="text-slate-500">Ngân hàng</dt><dd className="font-medium app-text-main">{account.bankName || "—"}</dd></div><div><dt className="text-slate-500">Chủ tài khoản</dt><dd className="font-medium app-text-main">{account.accountHolder || "—"}</dd></div><div><dt className="text-slate-500">Số tài khoản</dt><dd className="font-mono font-medium app-text-main">{account.accountNumberMasked || "—"}</dd></div></dl> : <p className="mt-2 text-sm text-slate-500">Chưa có thông tin tài khoản nhận gắn với yêu cầu này.</p>}
            {payout.payoutAccountVerified === true && <p className="mt-3 text-sm font-semibold text-emerald-700">Tài khoản đã được xác minh.</p>}
            {payout.payoutAccountVerified === false && <div className="mt-4 space-y-2 border-t app-border pt-3"><p className="text-xs text-amber-800">Sau khi kiểm tra tài khoản qua kênh ngân hàng, lưu mã tham chiếu xác minh.</p><label className="block text-xs font-semibold app-text-main">Mã tham chiếu xác minh<input value={accountVerificationReference} onChange={(event) => setAccountVerificationReference(event.target.value)} className="mt-1 w-full rounded-lg border app-border bg-transparent px-3 py-2 text-sm font-normal" /></label><button disabled={verifyingAccount || !accountVerificationReference.trim()} onClick={verifyAccount} className="rounded-lg bg-[#005cff] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{verifyingAccount ? "Đang lưu…" : "Ghi nhận đã xác minh"}</button></div>}
          </div>
          <section className="rounded-xl border app-border bg-white p-4" aria-labelledby="payout-checklist-title">
            <h3 id="payout-checklist-title" className="font-semibold app-text-main">Điều kiện từ dữ liệu yêu cầu</h3>
            {checks.length > 0 ? <ul className="mt-3 space-y-2">{checks.map((check) => <li key={check.code} className="flex items-start gap-2 text-sm"><FiCheckCircle className={`mt-0.5 shrink-0 ${check.passed ? "text-emerald-600" : "text-orange-600"}`} /><span><span className="font-medium app-text-main">{check.label}</span><span className="ml-2 text-xs text-slate-500">{check.passed ? "Đạt" : "Chưa đạt"}</span>{check.detail && <span className="mt-0.5 block text-xs text-slate-500">{check.detail}</span>}</span></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">Chưa có thông tin điều kiện cho yêu cầu này.</p>}
            {payout.payoutAccountVerified !== undefined && <div className="mt-3 flex items-center gap-2 border-t app-border pt-3 text-sm"><FiCheckCircle className={payout.payoutAccountVerified ? "text-emerald-600" : "text-orange-600"} /><span className="app-text-main">Tài khoản nhận: {payout.payoutAccountVerified ? "đã xác minh" : "chưa xác minh"}</span></div>}
          </section>
          <section className="rounded-xl border border-[#d7efe5] bg-[#effaf7] p-4" aria-labelledby="payout-finance-title">
            <h3 id="payout-finance-title" className="font-semibold app-text-main">Tổng quan khoản chi</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt>Doanh thu ghi nhận</dt><dd>{money(payout.grossAmount)}</dd></div>
              <div className="flex justify-between gap-4"><dt>Phí nền tảng</dt><dd>{money(payout.platformFee)}</dd></div>
              <div className="flex justify-between gap-4 border-t border-[#d7efe5] pt-2"><dt>Số tiền chuyển</dt><dd className="font-bold text-emerald-700">{money(payout.netAmount)}</dd></div>
            </dl>
          </section>
          {(payout.disputeReason || payout.publicReason || ("rejectionReason" in payout && payout.rejectionReason)) && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><div className="font-semibold">Lý do xử lý</div><p className="mt-1">{payout.disputeReason || payout.publicReason || ("rejectionReason" in payout ? payout.rejectionReason : "")}</p></div>}
          {canApprove && <button disabled={busy} onClick={() => setShowApprove(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#005cff] px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"><FiCheck /> Phê duyệt yêu cầu</button>}
          {canHold && !showHold && <button disabled={busy} onClick={() => setShowHold(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 px-4 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"><FiShield /> Tạm giữ để kiểm tra</button>}
          {canHold && showHold && <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4"><label htmlFor="hold-reason" className="block text-sm font-semibold text-amber-950">Lý do tạm giữ <span className="text-rose-600">*</span></label><textarea id="hold-reason" value={holdReason} onChange={(event) => setHoldReason(event.target.value)} rows={3} className="w-full rounded-lg border border-amber-200 bg-white p-2.5 text-sm text-slate-900" /><div className="flex gap-2"><button disabled={busy || !holdReason.trim()} onClick={hold} className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Xác nhận tạm giữ</button><button onClick={() => setShowHold(false)} className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-900">Hủy</button></div></div>}
          {canApprove && !showReject && <button disabled={busy} onClick={() => setShowReject(true)} className="inline-flex w-full items-center justify-center rounded-xl border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Từ chối yêu cầu</button>}
          {canApprove && showReject && <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4"><label htmlFor="reject-reason" className="block text-sm font-semibold text-rose-950">Lý do từ chối <span className="text-rose-600">*</span></label><textarea id="reject-reason" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} rows={3} className="w-full rounded-lg border border-rose-200 bg-white p-2.5 text-sm text-slate-900" /><div className="flex gap-2"><button disabled={busy || !rejectReason.trim()} onClick={reject} className="rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Xác nhận từ chối</button><button disabled={busy} onClick={() => setShowReject(false)} className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-900">Hủy</button></div></div>}
          {payout.status === "APPROVED" && <div className="rounded-xl border border-[#dce6f8] bg-[#edf3ff] p-4 text-sm text-[#31416e]"><div className="font-semibold">Đã duyệt · chờ xử lý</div><p className="mt-1">Sau khi chuyển tại ngân hàng, nhập mã giao dịch để xác nhận.</p></div>}
          {(payout.status === "PROCESSING" || payout.status === "APPROVED") && <button disabled={busy} onClick={() => setShowRecordTransfer(true)} className="w-full rounded-xl bg-[#005cff] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Xác nhận chuyển tiền</button>}
          {payout.status === "COMPLETED" && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><div className="font-semibold">Giao dịch đã được ghi nhận</div><p className="mt-1">Mã tham chiếu: {payout.transferReference || payout.transactionReference || "Chưa có dữ liệu"}</p><p>Thời điểm: {dateTime(payout.transferredAt)}</p>{(payout.transferReceiptUrl || payout.receiptUrl) && <a href={payout.transferReceiptUrl || payout.receiptUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block underline">Xem biên nhận</a>}</div>}
          {payout.status === "NEEDS_VERIFICATION" && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><div className="font-semibold">Cần xác minh</div><p className="mt-1">Chưa có thao tác tra cứu giao dịch được hỗ trợ trong giao diện này.</p></div>}
          {payout.allowedActions && payout.allowedActions.length === 0 && <p className="text-xs text-slate-500">Không có thao tác khả dụng cho trạng thái yêu cầu này.</p>}
        </aside>
      </div>
    </div>
    {canApprove && showApprove && <FinanceDialog title="Phê duyệt yêu cầu rút tiền" subtitle="Kiểm tra yêu cầu và tài khoản nhận trước khi duyệt. Việc duyệt không chuyển tiền." icon={<FiCheck />} onClose={() => setShowApprove(false)} pending={busy}>
      <div className="space-y-4">
        <div className="rounded-xl bg-[#f2f6ff] p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sự kiện</div><div className="mt-1 font-semibold app-text-main">{eventName}</div><div className="mt-1 text-xs text-slate-500">Mã yêu cầu {payout.id} · {requestTypeLabel(payout.requestType)}</div><div className="mt-3 flex items-end justify-between gap-3"><span className="text-sm text-slate-600">Số tiền ròng yêu cầu</span><strong className="text-xl text-emerald-700">{money(payout.netAmount)}</strong></div></div>
        <div className="rounded-xl border app-border p-4"><h3 className="font-semibold app-text-main">Tài khoản ngân hàng đã yêu cầu</h3>{account ? <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3"><div><span className="block text-xs text-slate-500">Ngân hàng</span><span className="font-medium app-text-main">{account.bankName || "—"}</span></div><div><span className="block text-xs text-slate-500">Chủ tài khoản</span><span className="font-medium app-text-main">{account.accountHolder || "—"}</span></div><div><span className="block text-xs text-slate-500">Số tài khoản</span><span className="font-mono font-medium app-text-main">{account.accountNumberMasked || "—"}</span></div></div> : <p className="mt-2 text-sm text-slate-500">Chưa có thông tin tài khoản nhận gắn với yêu cầu này.</p>}<p className={`mt-3 text-sm font-semibold ${payout.payoutAccountVerified ? "text-emerald-700" : "text-orange-700"}`}>{payout.payoutAccountVerified ? "Tài khoản đã xác minh" : "Trạng thái xác minh chưa được xác nhận"}</p></div>
        <div className="flex justify-end gap-2 border-t app-border pt-4"><button type="button" disabled={busy} onClick={() => setShowApprove(false)} className="rounded-lg border app-border px-4 py-2.5 text-sm font-semibold app-text-main">Hủy</button><button type="button" disabled={busy} onClick={() => void approve()} className="rounded-lg bg-[#005cff] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Đang lưu…" : "Xác nhận phê duyệt"}</button></div>
      </div>
    </FinanceDialog>}
    {showRecordTransfer && <FinanceDialog title="Ghi nhận kết quả chuyển tiền" subtitle="Chỉ xác nhận sau khi ngân hàng báo giao dịch thành công. Việc lưu sẽ cập nhật yêu cầu thành hoàn tất." icon={<FiCheckCircle />} onClose={() => setShowRecordTransfer(false)} pending={busy}>
      <div className="space-y-4"><div className="rounded-xl bg-[#f2f6ff] p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{eventName}</div><div className="mt-1 text-xs text-slate-500">Mã yêu cầu {payout.id}</div><div className="mt-3 flex items-end justify-between"><span className="text-sm text-slate-600">Số tiền ròng</span><strong className="text-xl text-emerald-700">{money(payout.netAmount)}</strong></div></div><div className="rounded-xl border app-border p-4"><h3 className="font-semibold app-text-main">Tài khoản đã ghi trong yêu cầu</h3><p className="mt-2 text-sm app-text-main">{account ? `${account.bankName || "Ngân hàng chưa có dữ liệu"} · ${account.accountHolder || "Chủ tài khoản chưa có dữ liệu"} · ${account.accountNumberMasked || "Số tài khoản chưa có dữ liệu"}` : "Chưa có thông tin tài khoản nhận."}</p></div><label htmlFor="transfer-reference" className="block text-sm font-semibold app-text-main">Mã giao dịch ngân hàng <span className="text-rose-600">*</span><input id="transfer-reference" value={transactionReference} onChange={(event) => setTransactionReference(event.target.value)} className="mt-1 w-full rounded-lg border app-border bg-white px-3 py-2.5 text-sm font-normal" /></label><label htmlFor="transfer-receipt" className="block text-sm font-semibold app-text-main">Liên kết biên nhận (không bắt buộc)<input id="transfer-receipt" type="url" value={receiptUrl} onChange={(event) => setReceiptUrl(event.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg border app-border bg-white px-3 py-2.5 text-sm font-normal" /></label><div className="flex justify-end gap-2 border-t app-border pt-4"><button type="button" disabled={busy} onClick={() => setShowRecordTransfer(false)} className="rounded-lg border app-border px-4 py-2.5 text-sm font-semibold app-text-main">Hủy</button><button type="button" disabled={busy || !transactionReference.trim()} onClick={() => void recordTransfer()} className="rounded-lg bg-[#005cff] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Đang ghi nhận…" : "Xác nhận đã chuyển"}</button></div></div>
    </FinanceDialog>}
  </section>;
}

export function PaymentMonitoring() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<FinanceTab>(() => {
    const requested = searchParams.get("tab");
    return requested === "overview" ? requested : "requests";
  });
  const [payouts, setPayouts] = useState<AdminPayoutRow[]>([]);
  const [eventsById, setEventsById] = useState<Record<string, EventApiData>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>(normalizePayoutFilter(searchParams.get("status")));
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [fromDate, setFromDate] = useState(searchParams.get("from") || "");
  const [toDate, setToDate] = useState(searchParams.get("to") || "");
  const [minAmount, setMinAmount] = useState(searchParams.get("min") || "");
  const [maxAmount, setMaxAmount] = useState(searchParams.get("max") || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try { setPayouts(await payoutApi.getAdminPayoutQueue()); }
    catch { setError("Không thể tải yêu cầu tài chính. Vui lòng thử lại."); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    let active = true;
    payoutApi.getAdminPayoutQueue().then((data) => {
      if (active) setPayouts(data);
    }).catch(() => {
      if (active) setError("Không thể tải yêu cầu tài chính. Vui lòng thử lại.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    eventApi.getAllEvents().then((events) => {
      if (active) setEventsById(Object.fromEntries(events.map((event) => [String(event.id), event])));
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const selected = payouts.find((payout) => payout.id === selectedId) || null;
  const filtered = useMemo(() => payouts.filter((payout) => {
    if (status !== "ALL" && payoutStatusGroup(payout.status) !== status) return false;
    const text = `${payout.id} ${payout.eventName || ""} ${payout.eventId} ${payout.organizerUserId}`.toLocaleLowerCase();
    if (query.trim() && !text.includes(query.trim().toLocaleLowerCase())) return false;
    const createdAt = new Date(payout.createdAt).getTime();
    if (fromDate && createdAt < new Date(`${fromDate}T00:00:00`).getTime()) return false;
    if (toDate && createdAt > new Date(`${toDate}T23:59:59.999`).getTime()) return false;
    const amount = Number(payout.netAmount);
    if (minAmount && amount < Number(minAmount)) return false;
    if (maxAmount && amount > Number(maxAmount)) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()), [payouts, query, status, fromDate, toDate, minAmount, maxAmount]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (status !== "ALL") next.set("status", status);
    if (query) next.set("q", query);
    if (fromDate) next.set("from", fromDate);
    if (toDate) next.set("to", toDate);
    if (minAmount) next.set("min", minAmount);
    if (maxAmount) next.set("max", maxAmount);
    if (tab !== "requests") next.set("tab", tab);
    setSearchParams(next, { replace: true });
  }, [status, query, fromDate, toDate, minAmount, maxAmount, tab, setSearchParams]);

  const setActiveTab = (next: FinanceTab) => { setTab(next); setSelectedId(null); };

  return <div className="finance-theme space-y-6 bg-[#f2f6ff] px-4 py-5 text-[#101c48] sm:px-6 lg:px-8 [&_.app-bg-card]:!bg-white [&_.app-border]:!border-[#dce6f8] [&_.app-text-main]:!text-[#101c48]">
    <header><h1 className="text-2xl font-bold app-text-main">Quản lý tài chính</h1><p className="mt-1 text-sm text-slate-500">Theo dõi yêu cầu thanh toán và trạng thái xử lý từ dữ liệu hệ thống.</p></header>
    <nav aria-label="Các mục tài chính" className="flex gap-1 overflow-x-auto border-b app-border">{tabs.map((item) => <button key={item.id} onClick={() => setActiveTab(item.id)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${tab === item.id ? "border-[#005cff] text-[#005cff]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{item.label}</button>)}</nav>

    {selected && tab === "requests" ? <DetailPanel key={selected.id} payout={selected} event={eventsById[selected.eventId]} onBack={() => setSelectedId(null)} onRefresh={() => { void load(); }} /> : <>
      {tab === "overview" && <FinanceOverview onOpenQueue={(nextStatus) => { setStatus(payoutStatusGroup(nextStatus)); setTab("requests"); }} />}
      {tab === "requests" && <section className="overflow-hidden rounded-2xl border app-border bg-white">
        <div className="flex flex-col gap-3 border-b app-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><h2 className="text-lg font-bold app-text-main">Yêu cầu rút tiền</h2><p className="mt-1 text-sm text-slate-500">{filtered.length} kết quả phù hợp</p></div><button onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border app-border px-3 py-2 text-sm font-semibold app-text-main disabled:opacity-50"><FiRefreshCw className={loading ? "animate-spin" : ""} /> Làm mới</button></div>
        <div className="border-b app-border px-4 pt-3"><div className="flex flex-wrap gap-1" role="tablist" aria-label="Lọc theo trạng thái">{[{ key: "ALL", label: "Tất cả", count: payouts.length }, { key: "PENDING", label: statusLabels.PENDING, count: payouts.filter((item) => item.status === "PENDING").length }, { key: "PROCESSING", label: payoutStatusGroups.PROCESSING, count: payouts.filter((item) => payoutStatusGroup(item.status) === "PROCESSING").length }, { key: "COMPLETED", label: payoutStatusGroups.COMPLETED, count: payouts.filter((item) => item.status === "COMPLETED").length }].map((item) => <button type="button" role="tab" aria-selected={status === item.key} key={item.key} onClick={() => setStatus(item.key as StatusFilter)} className={`border-b-2 px-3 py-2 text-xs font-semibold ${status === item.key ? "border-[#005cff] text-[#005cff]" : "border-transparent text-slate-500 hover:text-[#101c48]"}`}><span>{item.label}</span><span className={`ml-2 rounded-full px-1.5 py-0.5 ${status === item.key ? "bg-[#edf3ff] text-[#005cff]" : "bg-slate-100 text-slate-600"}`}>{item.count}</span></button>)}</div></div>
        <div className="border-b app-border p-4">
          <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_200px_auto]">
            <label className="min-w-0 text-xs text-slate-500 sm:col-span-2 xl:col-span-1">Tìm yêu cầu<div className="relative mt-1"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label="Tìm yêu cầu" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm mã, sự kiện, BTC" className="h-11 w-full rounded-lg border app-border bg-white pl-9 pr-3 text-sm app-text-main" /></div></label>
            <label className="text-xs text-slate-500">Trạng thái<select aria-label="Lọc trạng thái yêu cầu" value={status} onChange={event => setStatus(event.target.value as StatusFilter)} className="mt-1 h-11 w-full rounded-lg border app-border bg-white px-3 text-sm app-text-main"><option value="ALL">Tất cả trạng thái</option>{Object.entries(payoutStatusGroups).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <button type="button" onClick={() => { setStatus("ALL"); setQuery(""); setFromDate(""); setToDate(""); setMinAmount(""); setMaxAmount(""); }} className="h-11 rounded-lg border app-border px-3 text-sm font-semibold text-[#005cff] hover:bg-blue-50">Xóa bộ lọc</button>
          </div>
          <details className="mt-3 text-sm"><summary className="w-fit cursor-pointer py-1 text-xs font-semibold text-[#005cff]">Bộ lọc nâng cao</summary><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{ label: "Từ ngày", type: "date", value: fromDate, set: setFromDate }, { label: "Đến ngày", type: "date", value: toDate, set: setToDate }, { label: "Từ tiền", type: "number", value: minAmount, set: setMinAmount }, { label: "Đến tiền", type: "number", value: maxAmount, set: setMaxAmount }].map(field => <label key={field.label} className="text-xs text-slate-500">{field.label}<input aria-label={field.label} type={field.type} min={field.type === "number" ? "0" : undefined} value={field.value} onChange={event => field.set(event.target.value)} className="mt-1 h-11 w-full rounded-lg border app-border bg-white px-3 text-sm app-text-main" /></label>)}</div></details>
        </div>
        {error && <div role="alert" className="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error} <button onClick={() => void load()} className="ml-2 underline">Thử lại</button></div>}
        {!loading && filtered.length > 0 && <div className="hidden grid-cols-[130px_minmax(260px,1.8fr)_140px_150px_150px_80px] gap-3 border-b border-[#edf2fa] bg-[#f7faff] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid"><span>Mã yêu cầu</span><span>Sự kiện &amp; BTC</span><span className="text-right">Số tiền</span><span>Ngày gửi</span><span>Trạng thái</span><span className="text-right">Xem</span></div>}
        {loading ? <div className="p-12 text-center text-sm text-slate-500">Đang tải dữ liệu…</div> : filtered.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">Không có yêu cầu phù hợp.</div> : <div className="divide-y divide-[#edf2fa]">{filtered.map((payout) => <article key={payout.id} className="grid grid-cols-2 gap-x-3 gap-y-3 px-4 py-3 hover:bg-[#f8fbff] lg:grid-cols-[130px_minmax(260px,1.8fr)_140px_150px_150px_80px] lg:items-center lg:gap-3 lg:px-5"><div className="col-start-1 row-start-1 min-w-0 lg:col-auto lg:row-auto"><code title={payout.id} className="block max-w-[118px] truncate text-xs font-semibold text-[#101c48]">{payout.id}</code><span className="mt-1 block text-xs text-slate-500">{requestTypeLabel(payout.requestType)}</span></div><div className="col-span-2 col-start-1 row-start-2 flex min-w-0 items-center gap-3 lg:col-span-1 lg:col-start-auto lg:row-auto"><div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#edf3ff] text-[#005cff]">{eventPosterUrl(eventsById[payout.eventId]) ? <img src={eventPosterUrl(eventsById[payout.eventId])} alt="" loading="lazy" className="h-full w-full object-cover" /> : <FiCalendar aria-hidden="true" />}</div><div className="min-w-0"><div className="truncate font-semibold app-text-main">{payout.eventName || eventsById[payout.eventId]?.title || "Tên sự kiện chưa có"}</div><div className="mt-1 flex min-w-0 items-center gap-1 truncate text-xs text-slate-500"><FiUser className="shrink-0" /><span className="truncate">{payout.organizerUserId}</span></div></div></div><div className="col-start-2 row-start-1 text-right lg:col-auto lg:row-auto lg:text-right"><div className="text-xs text-slate-500 lg:hidden">Số tiền</div><div className="font-bold text-emerald-700">{money(payout.netAmount)}</div></div><div className="col-start-1 row-start-3 text-xs text-slate-500 lg:col-auto lg:row-auto">{dateTime(payout.createdAt)}</div><div className="col-start-2 row-start-3 lg:col-auto lg:row-auto"><StatusBadge status={payout.status} grouped /></div><button onClick={() => setSelectedId(payout.id)} className="col-span-2 col-start-1 row-start-4 rounded-lg border border-[#bdd0f8] bg-white px-4 py-2 text-sm font-semibold text-[#005cff] hover:bg-[#edf3ff] lg:col-span-1 lg:col-start-auto lg:row-auto lg:justify-self-end">Xem</button></article>)}</div>}
        <div className="border-t app-border px-5 py-3 text-xs text-slate-500">Số tài khoản đầy đủ và ghi chú nội bộ không hiển thị trong danh sách.</div>
      </section>}
    </>}
  </div>;
}

export default PaymentMonitoring;
