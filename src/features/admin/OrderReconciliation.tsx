import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { FiRefreshCw } from "react-icons/fi";
import { toast } from "sonner";
import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
import { AdminDataState } from "@/components/admin/AdminDataState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminStatusTabs } from "@/components/admin/AdminStatusTabs";
import {
  adminReconciliationApi,
  isSourceUnavailable,
  type PaidWithoutTicketsItem,
  type PaymentExceptionItem,
  type PaymentExceptionPage,
  type ReconciliationSummary,
  type StockDiscrepancyItem,
} from "@/services/adminReconciliationApi";

type TabId = "exceptions" | "paid" | "stock";
type ListState<T> = { status: "loading" } | { status: "error"; unavailable: boolean } | { status: "ready"; data: T };

// ids are shortened on screen; no emails or other personal data are shown
const shortId = (id?: string | null) => (id ? id.slice(0, 8) : "-");

// loads one list with an AbortController; reload() fetches again. Errors are kept (never shown as an empty list).
function useReconciliationList<T>(load: (signal: AbortSignal) => Promise<T>, deps: unknown[]) {
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify([...deps, nonce]);
  const [outcome, setOutcome] = useState<{ key: string; state: ListState<T> } | null>(null);
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; });
  useEffect(() => {
    const controller = new AbortController();
    loadRef.current(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setOutcome({ key, state: { status: "ready", data } }); })
      .catch((error) => { if (!controller.signal.aborted) setOutcome({ key, state: { status: "error", unavailable: isSourceUnavailable(error) } }); });
    return () => controller.abort();
  }, [key]);
  
  // a result that belongs to an older request (other page, filter or retry) counts as loading.
  const state: ListState<T> = outcome && outcome.key === key ? outcome.state : { status: "loading" };
  return { state, reload: useCallback(() => setNonce((n) => n + 1), []) };
}

function Scroll({ children, label }: { children: ReactNode; label: string }) {
  return <div className="overflow-x-auto rounded-lg border app-border app-bg-card" role="region" aria-label={label} tabIndex={0}>{children}</div>;
}
const th = "whitespace-nowrap px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide app-text-muted";
const td = "px-3 py-2 text-sm app-text-main align-top";

function ListBody<T>({ state, reload, isEmpty, children }: { state: ListState<T>; reload: () => void; isEmpty: (data: T) => boolean; children: (data: T) => ReactNode }) {
  const { t } = useTranslation();
  if (state.status === "loading") return <AdminDataState state="loading" />;
  if (state.status === "error") {
    return <AdminDataState state="error" onRetry={reload} message={state.unavailable ? t("Không đọc được một nguồn dữ liệu đối soát. Dữ liệu có thể chưa đầy đủ, hãy thử lại.") : t("Không thể tải dữ liệu đối soát")} />;
  }
  if (isEmpty(state.data)) return <AdminDataState state="empty" message={t("Không có mục nào cần xử lý")} />;
  return <>{children(state.data)}</>;
}

const EXCEPTION_STATUSES = ["OPEN", "RESOLVED", "REFUNDED_MANUALLY"] as const;

export default function OrderReconciliation() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("en") ? "en-US" : "vi-VN";
  const money = (value?: number | null) => (typeof value === "number" ? new Intl.NumberFormat(locale, { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value) : "-");
  const time = (value?: string | null) => { if (!value) return "-"; const d = new Date(value); return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString(locale); };
  const unknown = t("không rõ");
  const kindLabel = (kind: string) => ({
    LATE_PAYMENT_NO_STOCK: t("Thanh toán muộn, hết vé"),
    LATE_PAYMENT_SEATS_UNAVAILABLE: t("Thanh toán muộn, ghế không còn"),
    LATE_PAYMENT_UNEXPECTED_STATUS: t("Thanh toán muộn, đơn ở trạng thái lạ"),
    ISSUANCE_FAILED: t("Phát hành vé thất bại"),
  } as Record<string, string>)[kind] ?? t("Khác");
  const statusLabel = (status: string) => ({
    OPEN: t("Cần xử lý"),
    RESOLVED: t("Đã xử lý"),
    REFUNDED_MANUALLY: t("Đã hoàn tiền thủ công"),
  } as Record<string, string>)[status] ?? t("Khác");

  const [tab, setTab] = useState<TabId>("exceptions");
  const [exStatus, setExStatus] = useState<string>("OPEN");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [resolving, setResolving] = useState<PaymentExceptionItem | null>(null);
  const [note, setNote] = useState("");
  const [refunded, setRefunded] = useState(false);
  const [noteError, setNoteError] = useState(false);
  const [saving, setSaving] = useState(false);

  const summary = useReconciliationList<ReconciliationSummary>((signal) => adminReconciliationApi.getSummary(signal), []);
  const exceptions = useReconciliationList<PaymentExceptionPage>((signal) => adminReconciliationApi.getExceptions({ status: exStatus, page, size }, signal), [exStatus, page, size]);
  const paid = useReconciliationList((signal) => adminReconciliationApi.getPaidWithoutTickets(signal), []);
  const stock = useReconciliationList((signal) => adminReconciliationApi.getStockDiscrepancies(signal), []);

  const count = (key: keyof ReconciliationSummary) => (summary.state.status === "ready" ? summary.state.data[key] ?? undefined : undefined);
  const countText = (key: keyof ReconciliationSummary) => {
    const value = count(key);
    return value === undefined ? unknown : value.toLocaleString(locale);
  };

  const openResolve = (item: PaymentExceptionItem) => { setResolving(item); setNote(""); setRefunded(false); setNoteError(false); };
  const closeResolve = () => { if (!saving) setResolving(null); };
  const confirmResolve = async () => {
    if (!resolving || saving) return;
    if (!note.trim()) { setNoteError(true); return; }
    setSaving(true);
    try {
      await adminReconciliationApi.resolveException(resolving.id, { note: note.trim(), refundedManually: refunded });
      toast.success(t("Đã đánh dấu đã xử lý"));
      setResolving(null);
      exceptions.reload();
      summary.reload();
    } catch {
      toast.error(t("Không thể xử lý mục này. Vui lòng thử lại."));
    } finally {
      setSaving(false);
    }
  };

  const reloadAll = () => { summary.reload(); exceptions.reload(); paid.reload(); stock.reload(); };

  const cards: { key: keyof ReconciliationSummary; label: string }[] = [
    { key: "openExceptions", label: t("Cần xử lý") },
    { key: "paidWithoutTickets", label: t("Đơn thiếu vé") },
    { key: "stockDiscrepancies", label: t("Lệch kho") },
  ];
  const activeList = tab === "exceptions" ? exceptions : tab === "paid" ? paid : stock;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={t("Đối soát đơn hàng")}
        actions={<button type="button" onClick={reloadAll} className="inline-flex min-h-11 items-center gap-2 rounded-lg border app-border app-bg-card px-4 text-sm font-semibold app-text-main"><FiRefreshCw aria-hidden="true" className="h-4 w-4" />{t("Làm mới")}</button>}
      />

      <section aria-label={t("Tóm tắt đối soát")} aria-live="polite" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.key} className="rounded-lg border app-border app-bg-card p-4" data-testid={`summary-${card.key}`}>
            <p className="text-[11px] font-medium app-text-muted">{card.label}</p>
            <p className="text-xl font-bold tabular-nums app-text-main">{summary.state.status === "loading" ? "…" : countText(card.key)}</p>
          </div>
        ))}
        {summary.state.status === "error" && (
          <p role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400 sm:col-span-3">
            {t("Không tải được tóm tắt.")} <button type="button" className="underline app-text-brand" onClick={summary.reload}>{t("Thử lại")}</button>
          </p>
        )}
      </section>

      <div className="rounded-lg border app-border app-bg-card">
        <AdminStatusTabs
          value={tab}
          onChange={(value) => setTab(value as TabId)}
          options={[
            { value: "exceptions", label: t("Cần xử lý"), count: count("openExceptions") ?? undefined },
            { value: "paid", label: t("Đơn thiếu vé"), count: count("paidWithoutTickets") ?? undefined },
            { value: "stock", label: t("Lệch kho"), count: count("stockDiscrepancies") ?? undefined },
          ]}
        />
        <div className="space-y-3 p-3 sm:p-4" aria-live="polite" aria-busy={activeList.state.status === "loading"}>
          {tab === "exceptions" && (
            <>
              <label className="flex items-center gap-2 text-xs font-semibold app-text-muted">
                {t("Trạng thái")}
                <select value={exStatus} onChange={(e) => { setExStatus(e.target.value); setPage(0); }} className="min-h-11 rounded-lg border app-border app-bg-card px-3 text-sm app-text-main">
                  {EXCEPTION_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                </select>
              </label>
              <ListBody state={exceptions.state} reload={exceptions.reload} isEmpty={(d) => d.items.length === 0}>
                {(data) => (
                  <>
                    <Scroll label={t("Thanh toán cần xử lý")}>
                      <table className="min-w-full divide-y app-border">
                        <thead><tr>{[t("Đơn"), t("Thanh toán"), t("Loại"), t("Số tiền"), t("Cổng"), t("Trạng thái"), t("Chi tiết"), t("Tạo lúc"), ""].map((h, i) => <th key={i} scope="col" className={th}>{h}</th>)}</tr></thead>
                        <tbody className="divide-y app-border">
                          {data.items.map((item) => (
                            <tr key={item.id}>
                              <td className={td}>{item.bookingCode || shortId(item.bookingId)}</td>
                              <td className={`${td} font-mono`}>{shortId(item.paymentId)}</td>
                              <td className={td}>{kindLabel(item.kind)}</td>
                              <td className={`${td} tabular-nums`}>{money(item.amount)}</td>
                              <td className={td}>{item.provider || "-"}</td>
                              <td className={td}>{statusLabel(item.status)}</td>
                              <td className={`${td} max-w-xs break-words`}>{item.detail || "-"}</td>
                              <td className={`${td} whitespace-nowrap`}>{time(item.createdAt)}</td>
                              <td className={td}>
                                {item.status === "OPEN" && <button type="button" onClick={() => openResolve(item)} className="min-h-11 whitespace-nowrap rounded-lg border app-border px-3 text-xs font-semibold app-text-brand">{t("Đánh dấu đã xử lý")}</button>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Scroll>
                    <AdminPagination currentPage={data.page + 1} pageSize={data.size || size} totalItems={data.total} onPageChange={(p) => setPage(p - 1)} onPageSizeChange={(s) => { setSize(s); setPage(0); }} />
                  </>
                )}
              </ListBody>
            </>
          )}

          {tab === "paid" && (
            <ListBody state={paid.state} reload={paid.reload} isEmpty={(d) => d.items.length === 0}>
              {(data: { items: PaidWithoutTicketsItem[]; total: number }) => (
                <Scroll label={t("Đơn đã thanh toán nhưng thiếu vé")}>
                  <table className="min-w-full divide-y app-border">
                    <thead><tr>{[t("Đơn"), t("Vé dự kiến"), t("Vé đã phát hành"), t("Số phút từ lúc thanh toán")].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
                    <tbody className="divide-y app-border">
                      {data.items.map((item) => (
                        <tr key={item.bookingId}>
                          <td className={td}>{item.bookingCode || shortId(item.bookingId)}</td>
                          <td className={`${td} tabular-nums`}>{item.expectedTickets}</td>
                          <td className={`${td} tabular-nums`}>{item.issuedTickets}</td>
                          <td className={`${td} tabular-nums`}>{item.minutesSincePaid}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Scroll>
              )}
            </ListBody>
          )}

          {tab === "stock" && (
            <ListBody state={stock.state} reload={stock.reload} isEmpty={(d) => d.items.length === 0}>
              {(data: { items: StockDiscrepancyItem[] }) => {
                const n = (v?: number | null) => (typeof v === "number" ? v.toLocaleString(locale) : unknown);
                return (
                  <Scroll label={t("Hạng vé lệch kho")}>
                    <table className="min-w-full divide-y app-border">
                      <thead><tr>{[t("Hạng vé"), t("Sự kiện"), t("Phát hành"), t("Còn lại"), t("Đang giữ"), t("Đã phát hành vé"), t("Giữ theo phiếu"), t("Lệch kho/vé"), t("Lệch giữ/phiếu"), t("Ghi chú")].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
                      <tbody className="divide-y app-border">
                        {data.items.map((item) => (
                          <tr key={item.ticketTypeId}>
                            <td className={td}>{item.name || shortId(item.ticketTypeId)}</td>
                            <td className={`${td} font-mono`}>{shortId(item.eventId)}</td>
                            <td className={`${td} tabular-nums`}>{n(item.initial)}</td>
                            <td className={`${td} tabular-nums`}>{n(item.remaining)}</td>
                            <td className={`${td} tabular-nums`}>{n(item.held)}</td>
                            <td className={`${td} tabular-nums`}>{n(item.issued)}</td>
                            <td className={`${td} tabular-nums`}>{n(item.heldByReservations)}</td>
                            <td className={`${td} tabular-nums font-semibold`}>{n(item.diffStockVsIssued)}</td>
                            <td className={`${td} tabular-nums font-semibold`}>{n(item.diffHeldVsReservations)}</td>
                            <td className={`${td} max-w-xs break-words`}>{item.note || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Scroll>
                );
              }}
            </ListBody>
          )}
        </div>
      </div>

      {resolving && (
        <AdminConfirmModal
          title={t("Đánh dấu đã xử lý")}
          subtitle={t("Ghi lại cách bạn đã xử lý thanh toán này. Hệ thống không tự hoàn tiền.")}
          confirmText={saving ? t("Đang lưu…") : t("Xác nhận")}
          cancelText={t("Hủy bỏ")}
          isDanger={false}
          pending={saving}
          onClose={closeResolve}
          onConfirm={confirmResolve}
        >
          <div className="space-y-3">
            <label className="block text-xs font-semibold app-text-main" htmlFor="reconciliation-note">{t("Ghi chú xử lý")} *</label>
            <textarea
              id="reconciliation-note"
              value={note}
              onChange={(e) => { setNote(e.target.value); if (e.target.value.trim()) setNoteError(false); }}
              rows={3}
              maxLength={500}
              aria-required="true"
              aria-invalid={noteError}
              aria-describedby={noteError ? "reconciliation-note-error" : undefined}
              className="w-full rounded-lg border app-border app-bg-subnav p-3 text-sm app-text-main"
            />
            {noteError && <p id="reconciliation-note-error" role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">{t("Vui lòng nhập ghi chú xử lý")}</p>}
            <label className="flex items-center gap-2 text-sm app-text-main">
              <input type="checkbox" checked={refunded} onChange={(e) => setRefunded(e.target.checked)} className="h-4 w-4 accent-blue-600" />
              {t("Đã hoàn tiền thủ công trên cổng thanh toán")}
            </label>
          </div>
        </AdminConfirmModal>
      )}
    </div>
  );
}
