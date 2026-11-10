import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { FiAlertTriangle, FiCheck, FiClipboard, FiDatabase, FiFileText, FiRefreshCw } from "react-icons/fi";
import { toast } from "sonner";
import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
import { AdminDataState } from "@/components/admin/AdminDataState";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { CustomSelect } from "@/components/common/CustomSelect";
import {
  adminReconciliationApi,
  isSourceUnavailable,
  type PaidWithoutTicketsItem,
  type PaymentExceptionItem,
  type PaymentExceptionPage,
  type ReconciliationContext,
  type ReconciliationSummary,
  type StockDiscrepancyItem,
} from "@/services/adminReconciliationApi";

type TabId = "exceptions" | "paid" | "stock";
type ListState<T> = { status: "loading" } | { status: "error"; unavailable: boolean } | { status: "ready"; data: T };

// ids are shortened on screen (a UUID keeps its first 8 characters). Customer name, e-mail and phone are shown to administrators because reconciling a payment means contacting the buyer.
const shortId = (id?: string | null) => (!id ? "-" : id.length > 12 ? `${id.slice(0, 8)}…` : id);
const DASH = "—";
const present = (value?: string | null) => (typeof value === "string" && value.trim() ? value.trim() : null);

// name (bold), e-mail and phone, each on its own line; a missing part is a dash
function CustomerCell({ item }: { item: ReconciliationContext }) {
  return (
    <div className="min-w-40 space-y-0.5" data-testid="customer-cell">
      <p className="font-bold wrap-break-words">{present(item.customerName) ?? DASH}</p>
      <p className="text-[11px] app-text-muted break-all">{present(item.customerEmail) ?? DASH}</p>
      <p className="text-[11px] app-text-muted tabular-nums">{present(item.customerPhone) ?? DASH}</p>
    </div>
  );
}

// a long exception text is clamped to a few lines with a toggle.
function ClampedText({ text }: { text?: string | null }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const value = present(text);
  if (!value) return <>{DASH}</>;
  const long = value.length > 120;
  return (
    <div>
      <p className={`wrap-break-words ${open || !long ? "" : "line-clamp-3"}`}>{value}</p>
      {long && (
        <button type="button" className="mt-1 text-[11px] font-bold underline app-text-brand cursor-pointer" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? t("Thu gọn") : t("Xem thêm")}
        </button>
      )}
    </div>
  );
}

// short payment reference that copies the full id.
function CopyRef({ value }: { value?: string | null }) {
  const { t } = useTranslation();
  if (!value) return null;
  const copy = () => {
    void navigator.clipboard?.writeText(value).then(() => toast.success(t("Đã sao chép")), () => undefined);
  };
  return (
    <button type="button" onClick={copy} title={t("Sao chép mã thanh toán")} aria-label={`${t("Sao chép mã thanh toán")} ${shortId(value)}`}
      className="font-mono text-[11px] app-text-muted underline decoration-dotted cursor-pointer hover:app-text-main">
      {shortId(value)}
    </button>
  );
}

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

// tables follow the event approval and venue pages: tinted header row, hover rows, small badges
function TableShell({ children, label, minWidth }: { children: ReactNode; label: string; minWidth: string }) {
  return (
    <div className="overflow-x-auto no-scrollbar" role="region" aria-label={label} tabIndex={0}>
      <table className={`w-full text-left text-xs ${minWidth}`}>{children}</table>
    </div>
  );
}
const headRow = "border-b border-slate-200 dark:border-slate-800 app-text-muted font-bold text-[11px] uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/30";
const th = "whitespace-nowrap px-4 py-3";
const td = "px-4 py-3.5 align-top app-text-main";
const bodyRow = "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors";
const tbody = "divide-y divide-slate-100 dark:divide-slate-800/60";

type Tone = "amber" | "rose" | "emerald" | "indigo" | "slate";
const TONES: Record<Tone, string> = {
  amber: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  rose: "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  emerald: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  indigo: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
  slate: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
};
function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${TONES[tone]}`}>{children}</span>;
}

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
  const statusTone = (status: string): Tone => (status === "OPEN" ? "amber" : status === "REFUNDED_MANUALLY" ? "indigo" : "emerald");
  // the stock check returns codes in "note"; the screen shows what each one means
  const noteLabel = (code: string) => ({
    INITIAL_QUANTITY_NULL: t("Chưa ghi số phát hành (dữ liệu cũ), không tính được số vé đã bán"),
    REMAINING_NEGATIVE: t("Số còn lại đang âm"),
    HELD_EXCEEDS_REMAINING: t("Số đang giữ lớn hơn số còn lại"),
    REMAINING_EXCEEDS_INITIAL: t("Số còn lại lớn hơn số phát hành"),
  } as Record<string, string>)[code] ?? t("Có điểm bất thường khác, hãy kiểm tra hạng vé này");
  const minutesText = (minutes: number) => minutes >= 60
    ? t("{{hours}} giờ {{minutes}} phút", { hours: Math.floor(minutes / 60), minutes: minutes % 60 })
    : t("{{count}} phút", { count: minutes });

  const [tab, setTab] = useState<TabId>("exceptions");
  const [exStatus, setExStatus] = useState<string>("OPEN");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [resolving, setResolving] = useState<PaymentExceptionItem | null>(null);
  const [note, setNote] = useState("");
  const [refunded, setRefunded] = useState(false);
  const [noteError, setNoteError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [republishing, setRepublishing] = useState<PaidWithoutTicketsItem | null>(null);
  const [republishBusy, setRepublishBusy] = useState(false);

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

  const confirmRepublish = async () => {
    if (!republishing || republishBusy) return;
    setRepublishBusy(true);
    try {
      await adminReconciliationApi.republishConfirmed(republishing.bookingId);
      toast.success(t("Đã gửi yêu cầu phát hành lại vé. Vé sẽ xuất hiện sau ít phút nếu không còn lỗi."));
      setRepublishing(null);
      paid.reload();
      summary.reload();
    } catch {
      toast.error(t("Không thể phát hành lại vé. Vui lòng thử lại."));
    } finally {
      setRepublishBusy(false);
    }
  };

  const reloadAll = () => { summary.reload(); exceptions.reload(); paid.reload(); stock.reload(); };

  const cards: { key: keyof ReconciliationSummary; label: string; icon: ReactNode; tone: string }[] = [
    { key: "openExceptions", label: t("Thanh toán cần xử lý"), icon: <FiAlertTriangle className="h-4 w-4" />, tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    { key: "paidWithoutTickets", label: t("Đơn đã thanh toán nhưng thiếu vé"), icon: <FiFileText className="h-4 w-4" />, tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
    { key: "stockDiscrepancies", label: t("Hạng vé lệch kho"), icon: <FiDatabase className="h-4 w-4" />, tone: "bg-blue-600/10 text-blue-600 dark:text-blue-400" },
  ];
  const activeList = tab === "exceptions" ? exceptions : tab === "paid" ? paid : stock;
  const tabs: { id: TabId; label: string; count: number | undefined }[] = [
    { id: "exceptions", label: t("Cần xử lý"), count: count("openExceptions") ?? undefined },
    { id: "paid", label: t("Đơn thiếu vé"), count: count("paidWithoutTickets") ?? undefined },
    { id: "stock", label: t("Lệch kho"), count: count("stockDiscrepancies") ?? undefined },
  ];
  const onTabKey = (event: ReactKeyboardEvent, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    setTab(tabs[(index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length].id);
  };

  return (
    <div className="space-y-5">
      <section aria-label={t("Tóm tắt đối soát")} aria-live="polite" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.key} data-testid={`summary-${card.key}`}>
            <AdminStatCard
              title={card.label}
              value={summary.state.status === "loading" ? "…" : countText(card.key)}
              icon={card.icon}
              iconBgColor={card.tone}
            />
          </div>
        ))}
        {summary.state.status === "error" && (
          <p role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400 sm:col-span-3">
            {t("Không tải được tóm tắt.")} <button type="button" className="underline app-text-brand" onClick={summary.reload}>{t("Thử lại")}</button>
          </p>
        )}
      </section>

      <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold app-text-main flex items-center gap-2">
              <FiClipboard className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <span>{t("Đối soát đơn hàng")}</span>
            </h2>
            <p className="text-xs app-text-muted mt-0.5">
              {t("Theo dõi thanh toán cần xử lý tay, đơn đã thanh toán nhưng thiếu vé và hạng vé có số kho lệch so với vé thực tế.")}
            </p>
          </div>
          <button
            type="button"
            onClick={reloadAll}
            className="p-2 bg-slate-50 dark:bg-slate-800/80 text-app-text-main rounded-md border border-slate-200 dark:border-slate-700 hover:border-blue-500 cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
            title={t("Tải lại dữ liệu")}
          >
            <FiRefreshCw aria-hidden="true" className={`w-3.5 h-3.5 ${activeList.state.status === "loading" ? "animate-spin motion-reduce:animate-none text-blue-600" : ""}`} />
            <span>{t("Làm mới")}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div role="tablist" aria-label={t("Nhóm đối soát")} className="flex items-center gap-1.5 app-bg-subnav p-1 rounded-lg border border-slate-200 dark:border-slate-800 w-full sm:w-auto flex-wrap">
            {tabs.map((item, index) => {
              const active = tab === item.id;
              const alarm = (item.count ?? 0) > 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setTab(item.id)}
                  onKeyDown={(event) => onTabKey(event, index)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${active ? "bg-blue-600 text-white shadow-xs" : "app-text-muted hover:app-text-main"}`}
                >
                  <span>{item.label}</span>
                  {item.count !== undefined && (
                    <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-black ${alarm ? (active ? "bg-white text-rose-600" : "bg-rose-500 text-white") : (active ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300")}`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {tab === "exceptions" && (
            <div className="flex items-center gap-2 text-xs font-semibold app-text-main">
              <span className="app-text-muted">{t("Trạng thái")}</span>
              <div className="w-48">
                <CustomSelect
                  value={exStatus}
                  onChange={(value) => { setExStatus(value); setPage(0); }}
                  options={EXCEPTION_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs" aria-live="polite" aria-busy={activeList.state.status === "loading"}>
        {tab === "exceptions" && (
          <ListBody state={exceptions.state} reload={exceptions.reload} isEmpty={(d) => d.items.length === 0}>
            {(data) => (
              <div className="space-y-4">
                <TableShell label={t("Thanh toán cần xử lý")} minWidth="min-w-[1180px]">
                  <thead>
                    <tr className={headRow}>
                      {[t("Đơn"), t("Khách hàng"), t("Thanh toán"), t("Loại"), t("Số tiền"), t("Cổng"), t("Trạng thái"), t("Chi tiết"), t("Tạo lúc")].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}
                      <th scope="col" className={`${th} text-right`}><span className="sr-only">{t("Thao tác")}</span></th>
                    </tr>
                  </thead>
                  <tbody className={tbody}>
                    {data.items.map((item) => (
                      <tr key={item.id} className={bodyRow}>
                        <td className={td}>
                          <p className="font-bold">{item.bookingCode || shortId(item.bookingId)}</p>
                          {present(item.eventTitle) && <p className="mt-0.5 max-w-50 wrap-break-words text-[11px]  app-text-muted">{t("Sự kiện")}: {present(item.eventTitle)}</p>}
                        </td>
                        <td className={td}><CustomerCell item={item} /></td>
                        <td className={td}>
                          <div className="space-y-0.5">
                            <p className="font-semibold">{present(item.paymentMethod) ?? DASH}</p>
                            {item.paymentId ? <CopyRef value={item.paymentId} /> : <p className="text-[11px] app-text-muted">{t("Chưa có mã thanh toán")}</p>}
                          </div>
                        </td>
                        <td className={`${td} font-semibold`}>{kindLabel(item.kind)}</td>
                        <td className={`${td} whitespace-nowrap font-bold text-blue-600 dark:text-blue-400 tabular-nums`}>{money(item.amount)}</td>
                        <td className={td}>{item.provider ? <Badge tone="slate">{item.provider}</Badge> : "-"}</td>
                        <td className={`${td} whitespace-nowrap`}><Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge></td>
                        <td className={`${td} max-w-70 text-[11px] app-text-muted`}><ClampedText text={item.detail} /></td>
                        <td className={`${td} whitespace-nowrap text-[11px]`}>{time(item.createdAt)}</td>
                        <td className={`${td} text-right whitespace-nowrap`}>
                          {item.status === "OPEN" && (
                            <button type="button" onClick={() => openResolve(item)} className="px-3 py-1.5 min-h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-95">
                              <FiCheck aria-hidden="true" className="w-3.5 h-3.5" />
                              <span>{t("Đánh dấu đã xử lý")}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
                <AdminPagination currentPage={data.page + 1} pageSize={data.size || size} totalItems={data.total} onPageChange={(p) => setPage(p - 1)} onPageSizeChange={(s) => { setSize(s); setPage(0); }} itemLabel={t("mục")} />
              </div>
            )}
          </ListBody>
        )}

        {tab === "paid" && (
          <ListBody state={paid.state} reload={paid.reload} isEmpty={(d) => d.items.length === 0}>
            {(data: { items: PaidWithoutTicketsItem[]; total: number }) => (
              <TableShell label={t("Đơn đã thanh toán nhưng thiếu vé")} minWidth="min-w-[1080px]">
                <thead>
                  <tr className={headRow}>
                    {[t("Đơn"), t("Khách hàng"), t("Thanh toán"), t("Vé dự kiến"), t("Vé đã phát hành"), t("Còn thiếu"), t("Đã thanh toán cách đây")].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}
                    <th scope="col" className={`${th} text-right`}><span className="sr-only">{t("Thao tác")}</span></th>
                  </tr>
                </thead>
                <tbody className={tbody}>
                  {data.items.map((item) => {
                    const missing = Math.max(0, item.expectedTickets - item.issuedTickets);
                    return (
                      <tr key={item.bookingId} className={bodyRow}>
                        <td className={td}>
                          <p className="font-bold">{item.bookingCode || shortId(item.bookingId)}</p>
                          <p className="mt-0.5 max-w-50 wrap-break-words text-[11px] app-text-muted">{t("Sự kiện")}: {present(item.eventTitle) ?? DASH}</p>
                        </td>
                        <td className={td}><CustomerCell item={item} /></td>
                        <td className={td}>
                          <p className="font-semibold">{present(item.paymentMethod) ?? DASH}</p>
                          <p className="mt-0.5 whitespace-nowrap font-bold text-blue-600 dark:text-blue-400 tabular-nums">{money(item.amount)}</p>
                        </td>
                        <td className={`${td} tabular-nums`}>{item.expectedTickets}</td>
                        <td className={`${td} tabular-nums`}>{item.issuedTickets}</td>
                        <td className={td}><Badge tone="rose">{t("Thiếu {{count}} vé", { count: missing })}</Badge></td>
                        <td className={`${td} whitespace-nowrap`}>{minutesText(item.minutesSincePaid)}</td>
                        <td className={`${td} text-right whitespace-nowrap`}>
                          <button type="button" onClick={() => setRepublishing(item)} className="px-3 py-1.5 min-h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-95">
                            <FiRefreshCw aria-hidden="true" className="w-3.5 h-3.5" />
                            <span>{t("Phát hành lại vé")}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableShell>
            )}
          </ListBody>
        )}

        {tab === "stock" && (
          <ListBody state={stock.state} reload={stock.reload} isEmpty={(d) => d.items.length === 0}>
            {(data: { items: StockDiscrepancyItem[] }) => {
              const n = (v?: number | null) => (typeof v === "number" ? v.toLocaleString(locale) : unknown);
              // what each difference means, in words (the raw number is the size of the gap)
              const differences = (item: StockDiscrepancyItem) => {
                const list: { tone: Tone; text: string }[] = [];
                const stockGap = item.diffStockVsIssued;
                if (typeof stockGap === "number" && stockGap < 0) list.push({ tone: "rose", text: t("Kho chưa trừ {{count}} vé đã phát hành", { count: -stockGap }) });
                if (typeof stockGap === "number" && stockGap > 0) list.push({ tone: "amber", text: t("Kho đã trừ nhiều hơn vé phát hành {{count}} vé", { count: stockGap }) });
                const heldGap = item.diffHeldVsReservations;
                if (typeof heldGap === "number" && heldGap > 0) list.push({ tone: "amber", text: t("Đang giữ nhiều hơn phiếu giữ {{count}} vé", { count: heldGap }) });
                if (typeof heldGap === "number" && heldGap < 0) list.push({ tone: "amber", text: t("Phiếu giữ nhiều hơn số đang giữ {{count}} vé", { count: -heldGap }) });
                return list;
              };
              const notes = (item: StockDiscrepancyItem) => (item.note ? item.note.split(";").map((c) => c.trim()).filter(Boolean) : []);
              return (
                <TableShell label={t("Hạng vé lệch kho")} minWidth="min-w-[1240px]">
                  <thead>
                    <tr className={headRow}>
                      {[t("Sự kiện"), t("Hạng vé"), t("Phát hành"), t("Còn lại"), t("Đang giữ"), t("Vé đã phát hành"), t("Phiếu giữ chỗ"), t("Chênh lệch"), t("Ghi chú")].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className={tbody}>
                    {data.items.map((item) => {
                      const diffs = differences(item);
                      const noteCodes = notes(item);
                      return (
                        <tr key={item.ticketTypeId} className={bodyRow}>
                          <td className={`${td} max-w-55`}>
                            {present(item.eventTitle)
                              ? <p className="font-bold wrap-break-words">{present(item.eventTitle)}</p>
                              : <p className="font-semibold app-text-muted">{t("không rõ tên")}</p>}
                            <p className="mt-0.5 text-[11px] app-text-muted"><span className="font-mono">{shortId(item.eventId)}</span></p>
                          </td>
                          <td className={td}>
                            <p className="font-bold">{item.name || shortId(item.ticketTypeId)}</p>
                          </td>
                          <td className={`${td} tabular-nums`}>{typeof item.initial === "number" ? n(item.initial) : <span className="app-text-muted">{t("Chưa ghi nhận")}</span>}</td>
                          <td className={`${td} tabular-nums`}>{n(item.remaining)}</td>
                          <td className={`${td} tabular-nums`}>{n(item.held)}</td>
                          <td className={`${td} tabular-nums`}>{n(item.issued)}</td>
                          <td className={`${td} tabular-nums`}>{n(item.heldByReservations)}</td>
                          <td className={td}>
                            {diffs.length === 0
                              ? <Badge tone="emerald">{t("Khớp")}</Badge>
                              : <div className="flex flex-col items-start gap-1">{diffs.map((d) => <Badge key={d.text} tone={d.tone}>{d.text}</Badge>)}</div>}
                          </td>
                          <td className={`${td} max-w-70 text-[11px] app-text-muted`}>
                            {noteCodes.length === 0 ? "-" : <ul className="space-y-1">{noteCodes.map((c) => <li key={c}>{noteLabel(c)}</li>)}</ul>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </TableShell>
              );
            }}
          </ListBody>
        )}
      </div>

      {republishing && (
        <AdminConfirmModal
          title={t("Phát hành lại vé")}
          subtitle={t("Gửi lại yêu cầu phát hành vé cho đơn {{code}}. Việc này an toàn: vé đã có sẽ không bị tạo trùng.", { code: republishing.bookingCode || shortId(republishing.bookingId) })}
          confirmText={republishBusy ? t("Đang gửi…") : t("Phát hành lại vé")}
          cancelText={t("Hủy bỏ")}
          isDanger={false}
          pending={republishBusy}
          onClose={() => { if (!republishBusy) setRepublishing(null); }}
          onConfirm={confirmRepublish}
        >
          <p className="text-sm app-text-main">
            {t("Nếu vé vẫn không xuất hiện sau ít phút, nguyên nhân còn nằm ở dữ liệu hạng vé hoặc kho; hãy xem chi tiết lỗi ở tab 'Cần xử lý'.")}
          </p>
        </AdminConfirmModal>
      )}

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
