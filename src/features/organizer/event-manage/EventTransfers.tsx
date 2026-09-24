import React, { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  FiSave,
  FiX,
  FiAlertCircle,
  FiRepeat,
  FiList,
  FiToggleLeft,
  FiToggleRight,
  FiRefreshCw,
  FiLock,
} from "react-icons/fi";
import { eventTransferApi } from "@/services/eventTransferApi";
import type {
  GiftPolicyData,
  OrganizerGiftItem,
  OrganizerListingItem,
  PageData,
  ResalePolicyData,
  TransferSettingsData,
} from "@/types/eventTransfer";

// ─────────────────────── helpers ─────────────────────────────────────────────
const toLocalDatetime = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalDatetime = (local: string): string | null => {
  if (!local) return null;
  return new Date(local).toISOString();
};
const fmtVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));

// ─────────────────────── status badge ────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  RESERVED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  SOLD: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  PAUSED_BY_EVENT: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  EXPIRED: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
  WAITING_RECIPIENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Đang bán",
  RESERVED: "Đang giữ",
  SOLD: "Đã bán",
  PAUSED_BY_EVENT: "Tạm dừng",
  CANCELLED: "Đã hủy",
  EXPIRED: "Hết hạn",
  WAITING_RECIPIENT: "Chờ nhận",
  COMPLETED: "Hoàn thành",
};
const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
      STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600"
    }`}
  >
    {STATUS_LABELS[status] ?? status}
  </span>
);

// ─────────────────────── mini components ─────────────────────────────────────
const Spinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-blue-600 rounded-full animate-spin" />
  </div>
);
const Toggle = ({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
      disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
    } ${checked ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-600"}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        checked ? "translate-x-6" : "translate-x-1"
      }`}
    />
  </button>
);
const FormField = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1">
    <label className="text-xs font-semibold app-text-muted block">{label}</label>
    {children}
    {hint && <p className="text-[10px] app-text-muted">{hint}</p>}
  </div>
);

// ─────────────────────── resale records table ─────────────────────────────────
function ResaleRecordsTable({ eventId }: { eventId: string }) {
  const [data, setData] = useState<PageData<OrganizerListingItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(0);

  const load = useCallback(async (p: number) => {
    setLoading(true); setError(false);
    try {
      const res = await eventTransferApi.getListings(eventId, p);
      setData(res);
      setPage(p);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { load(0); }, [load]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold app-text-main flex items-center gap-2">
        <FiList className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        Lịch sử đăng bán lại
      </h3>
      {loading ? <Spinner /> : error ? (
        <div className="text-xs app-text-muted flex items-center gap-2 py-4">
          <FiAlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          Không thể tải dữ liệu.
          <button onClick={() => load(page)} className="text-blue-600 dark:text-blue-400 underline cursor-pointer">Thử lại</button>
        </div>
      ) : !data?.content?.length ? (
        <p className="text-xs app-text-muted py-4">Chưa có đơn bán lại nào.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b app-border">
                  {["Mã", "Hạng vé", "Người bán", "Giá", "Trạng thái", "Thời điểm"].map(h => (
                    <th key={h} className="text-left py-2 pr-3 font-semibold app-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.content.map(item => (
                  <tr key={item.listingId} className="border-b app-border hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2 pr-3 font-mono text-[10px] app-text-muted whitespace-nowrap">{item.refCode}</td>
                    <td className="py-2 pr-3 app-text-main whitespace-nowrap">{item.ticketTypeName}{item.seatCode && <span className="app-text-muted"> · {item.seatCode}</span>}</td>
                    <td className="py-2 pr-3 app-text-muted whitespace-nowrap">{item.sellerEmailMasked}</td>
                    <td className="py-2 pr-3 font-semibold app-text-main whitespace-nowrap">{fmtVND(item.price)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap"><StatusBadge status={item.status} /></td>
                    <td className="py-2 app-text-muted whitespace-nowrap">{fmtDate(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.totalPages > 1 && (
            <div className="flex items-center gap-2 text-xs app-text-muted">
              <button disabled={page === 0} onClick={() => load(page - 1)}
                className="px-2 py-1 rounded app-bg-subnav border app-border disabled:opacity-40 cursor-pointer hover:app-text-main">‹ Trước</button>
              <span>Trang {page + 1} / {data.totalPages}</span>
              <button disabled={page >= data.totalPages - 1} onClick={() => load(page + 1)}
                className="px-2 py-1 rounded app-bg-subnav border app-border disabled:opacity-40 cursor-pointer hover:app-text-main">Sau ›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────── gift records table ───────────────────────────────────
function GiftRecordsTable({ eventId }: { eventId: string }) {
  const [data, setData] = useState<PageData<OrganizerGiftItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(0);

  const load = useCallback(async (p: number) => {
    setLoading(true); setError(false);
    try {
      const res = await eventTransferApi.getGifts(eventId, p);
      setData(res);
      setPage(p);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { load(0); }, [load]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold app-text-main flex items-center gap-2">
        <FiList className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        Lịch sử tặng vé
      </h3>
      {loading ? <Spinner /> : error ? (
        <div className="text-xs app-text-muted flex items-center gap-2 py-4">
          <FiAlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          Không thể tải dữ liệu.
          <button onClick={() => load(page)} className="text-blue-600 dark:text-blue-400 underline cursor-pointer">Thử lại</button>
        </div>
      ) : !data?.content?.length ? (
        <p className="text-xs app-text-muted py-4">Chưa có lời mời tặng vé nào.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b app-border">
                  {["Người gửi", "Người nhận", "Hạng vé", "Gửi lúc", "Hết hạn", "Trạng thái"].map(h => (
                    <th key={h} className="text-left py-2 pr-3 font-semibold app-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.content.map(item => (
                  <tr key={item.sagaId} className="border-b app-border hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2 pr-3 app-text-muted whitespace-nowrap">{item.senderEmailMasked}</td>
                    <td className="py-2 pr-3 app-text-muted whitespace-nowrap">{item.recipientEmailMasked}</td>
                    <td className="py-2 pr-3 app-text-main whitespace-nowrap">{item.ticketTypeName}</td>
                    <td className="py-2 pr-3 app-text-muted whitespace-nowrap">{fmtDate(item.sentAt)}</td>
                    <td className="py-2 pr-3 app-text-muted whitespace-nowrap">{fmtDate(item.expiresAt)}</td>
                    <td className="py-2 whitespace-nowrap"><StatusBadge status={item.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.totalPages > 1 && (
            <div className="flex items-center gap-2 text-xs app-text-muted">
              <button disabled={page === 0} onClick={() => load(page - 1)}
                className="px-2 py-1 rounded app-bg-subnav border app-border disabled:opacity-40 cursor-pointer hover:app-text-main">‹ Trước</button>
              <span>Trang {page + 1} / {data.totalPages}</span>
              <button disabled={page >= data.totalPages - 1} onClick={() => load(page + 1)}
                className="px-2 py-1 rounded app-bg-subnav border app-border disabled:opacity-40 cursor-pointer hover:app-text-main">Sau ›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────── resale policy section ───────────────────────────────
function ResalePolicySection({
  eventId,
  policy,
  canWrite,
  onSaved,
}: {
  eventId: string;
  policy: ResalePolicyData | null;
  canWrite: boolean;
  onSaved: (p: ResalePolicyData) => void;
}) {
  const [enabled, setEnabled] = useState(policy?.enabled ?? false);
  const [minPct, setMinPct] = useState(String(policy?.minPricePercent ?? 80));
  const [maxPct, setMaxPct] = useState(String(policy?.maxPricePercent ?? 120));
  const [opensAt, setOpensAt] = useState(toLocalDatetime(policy?.opensAt ?? null));
  const [closesAt, setClosesAt] = useState(toLocalDatetime(policy?.closesAt ?? null));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const markDirty = () => setDirty(true);

  const reset = () => {
    setEnabled(policy?.enabled ?? false);
    setMinPct(String(policy?.minPricePercent ?? 80));
    setMaxPct(String(policy?.maxPricePercent ?? 120));
    setOpensAt(toLocalDatetime(policy?.opensAt ?? null));
    setClosesAt(toLocalDatetime(policy?.closesAt ?? null));
    setDirty(false);
    setSaveError(null);
  };

  const SAMPLE_PRICE = 400000;
  const minPreview = Math.ceil((SAMPLE_PRICE * Number(minPct || 0)) / 100);
  const maxPreview = Math.floor((SAMPLE_PRICE * Number(maxPct || 0)) / 100);

  const save = async () => {
    setSaving(true); setSaveError(null);
    try {
      const saved = await eventTransferApi.updateResalePolicy(eventId, {
        enabled,
        minPricePercent: Number(minPct),
        maxPricePercent: Number(maxPct),
        opensAt: fromLocalDatetime(opensAt),
        closesAt: fromLocalDatetime(closesAt),
        ticketTypeScope: "ALL",
        allowedTicketTypeIds: [],
        termsVersion: null,
        expectedVersion: policy?.version ?? null,
      });
      onSaved(saved);
      setDirty(false);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      if (e?.response?.status === 409) setSaveError("Cấu hình vừa được thay đổi bởi người khác. Vui lòng tải lại trang.");
      else if (e?.response?.status === 422) setSaveError("Dữ liệu không hợp lệ: " + (e?.response?.data?.message ?? ""));
      else setSaveError("Lưu thất bại. Vui lòng thử lại.");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="app-bg-card border app-border rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <FiRepeat className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold app-text-main">Cấu hình bán lại vé</h2>
              <p className="text-xs app-text-muted">Cho phép người mua đăng bán lại vé của họ</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!canWrite && <FiLock className="w-3.5 h-3.5 app-text-muted" />}
            <Toggle checked={enabled} onChange={(v) => { setEnabled(v); markDirty(); }} disabled={!canWrite} />
          </div>
        </div>

        {/* form */}
        <div className={`space-y-4 transition-opacity ${!enabled ? "opacity-40 pointer-events-none" : ""}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Giá tối thiểu (% giá gốc)" hint="Ví dụ: 80 = 80% giá gốc">
              <div className="flex gap-2">
                <input type="number" min={0} max={200} value={minPct} disabled={!canWrite}
                  onChange={e => { setMinPct(e.target.value); markDirty(); }}
                  className="flex-1 rounded-xl border app-border app-bg-subnav px-3 py-2 text-sm app-text-main focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
                <span className="flex items-center text-sm app-text-muted font-medium">%</span>
              </div>
            </FormField>
            <FormField label="Giá tối đa (% giá gốc)" hint="Ví dụ: 120 = 120% giá gốc">
              <div className="flex gap-2">
                <input type="number" min={0} max={500} value={maxPct} disabled={!canWrite}
                  onChange={e => { setMaxPct(e.target.value); markDirty(); }}
                  className="flex-1 rounded-xl border app-border app-bg-subnav px-3 py-2 text-sm app-text-main focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
                <span className="flex items-center text-sm app-text-muted font-medium">%</span>
              </div>
            </FormField>
          </div>

          {/* preset */}
          {canWrite && (
            <button type="button" onClick={() => { setMaxPct("100"); markDirty(); }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
              Đặt nhanh: Không vượt giá gốc (max = 100%)
            </button>
          )}

          {/* price preview */}
          {minPct && maxPct && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border app-border p-3 text-xs app-text-muted">
              <span className="font-semibold app-text-main">Ví dụ:</span> Giá gốc {fmtVND(SAMPLE_PRICE)} →{" "}
              từ <span className="font-semibold text-blue-600 dark:text-blue-400">{fmtVND(minPreview)}</span>{" "}
              đến <span className="font-semibold text-blue-600 dark:text-blue-400">{fmtVND(maxPreview)}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Thời gian bắt đầu bán lại" hint="Để trống = mở ngay">
              <input type="datetime-local" value={opensAt} disabled={!canWrite}
                onChange={e => { setOpensAt(e.target.value); markDirty(); }}
                className="w-full rounded-xl border app-border app-bg-subnav px-3 py-2 text-sm app-text-main focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
            </FormField>
            <FormField label="Thời gian kết thúc bán lại" hint="Để trống = không giới hạn">
              <input type="datetime-local" value={closesAt} disabled={!canWrite}
                onChange={e => { setClosesAt(e.target.value); markDirty(); }}
                className="w-full rounded-xl border app-border app-bg-subnav px-3 py-2 text-sm app-text-main focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
            </FormField>
          </div>
        </div>

        {/* save error */}
        {saveError && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-xs text-red-700 dark:text-red-300">
            <FiAlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {saveError}
          </div>
        )}

        {/* action buttons */}
        {canWrite && (
          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={save} disabled={saving || !dirty}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer">
              {saving ? <FiRefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FiSave className="w-3.5 h-3.5" />}
              Lưu thay đổi
            </button>
            <button type="button" onClick={reset} disabled={saving || !dirty}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl app-bg-subnav border app-border text-xs font-bold app-text-main transition-colors disabled:opacity-50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
              <FiX className="w-3.5 h-3.5" />
              Hủy thay đổi
            </button>
            {dirty && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">● Chưa lưu</span>
            )}
          </div>
        )}
      </div>

      {/* records */}
      <div className="app-bg-card border app-border rounded-2xl p-5">
        <ResaleRecordsTable eventId={eventId} />
      </div>
    </div>
  );
}

// ─────────────────────── gift policy section ──────────────────────────────────
function GiftPolicySection({
  eventId,
  policy,
  canWrite,
  onSaved,
}: {
  eventId: string;
  policy: GiftPolicyData | null;
  canWrite: boolean;
  onSaved: (p: GiftPolicyData) => void;
}) {
  const [enabled, setEnabled] = useState(policy?.enabled ?? false);
  const [ttl, setTtl] = useState(String(policy?.invitationTtlHours ?? 24));
  const [opensAt, setOpensAt] = useState(toLocalDatetime(policy?.opensAt ?? null));
  const [closesAt, setClosesAt] = useState(toLocalDatetime(policy?.closesAt ?? null));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const markDirty = () => setDirty(true);

  const reset = () => {
    setEnabled(policy?.enabled ?? false);
    setTtl(String(policy?.invitationTtlHours ?? 24));
    setOpensAt(toLocalDatetime(policy?.opensAt ?? null));
    setClosesAt(toLocalDatetime(policy?.closesAt ?? null));
    setDirty(false);
    setSaveError(null);
  };

  const save = async () => {
    setSaving(true); setSaveError(null);
    try {
      const saved = await eventTransferApi.updateGiftPolicy(eventId, {
        enabled,
        opensAt: fromLocalDatetime(opensAt),
        closesAt: fromLocalDatetime(closesAt),
        invitationTtlHours: Number(ttl) || 24,
        ticketTypeScope: "ALL",
        allowedTicketTypeIds: [],
        expectedVersion: policy?.version ?? null,
      });
      onSaved(saved);
      setDirty(false);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      if (e?.response?.status === 409) setSaveError("Cấu hình vừa được thay đổi bởi người khác. Vui lòng tải lại trang.");
      else if (e?.response?.status === 422) setSaveError("Dữ liệu không hợp lệ: " + (e?.response?.data?.message ?? ""));
      else setSaveError("Lưu thất bại. Vui lòng thử lại.");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="app-bg-card border app-border rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              {enabled ? <FiToggleRight className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" /> : <FiToggleLeft className="w-4.5 h-4.5 app-text-muted" />}
            </div>
            <div>
              <h2 className="text-sm font-bold app-text-main">Cấu hình tặng vé</h2>
              <p className="text-xs app-text-muted">Cho phép người dùng tặng vé cho nhau</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!canWrite && <FiLock className="w-3.5 h-3.5 app-text-muted" />}
            <Toggle checked={enabled} onChange={(v) => { setEnabled(v); markDirty(); }} disabled={!canWrite} />
          </div>
        </div>

        <div className={`space-y-4 transition-opacity ${!enabled ? "opacity-40 pointer-events-none" : ""}`}>
          <FormField label="Thời hạn nhận lời mời (giờ)" hint="Từ 1 đến 168 giờ (7 ngày)">
            <input type="number" min={1} max={168} value={ttl} disabled={!canWrite}
              onChange={e => { setTtl(e.target.value); markDirty(); }}
              className="w-full md:w-48 rounded-xl border app-border app-bg-subnav px-3 py-2 text-sm app-text-main focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Thời gian bắt đầu nhận tặng" hint="Để trống = mở ngay">
              <input type="datetime-local" value={opensAt} disabled={!canWrite}
                onChange={e => { setOpensAt(e.target.value); markDirty(); }}
                className="w-full rounded-xl border app-border app-bg-subnav px-3 py-2 text-sm app-text-main focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
            </FormField>
            <FormField label="Thời gian kết thúc nhận tặng" hint="Để trống = không giới hạn">
              <input type="datetime-local" value={closesAt} disabled={!canWrite}
                onChange={e => { setClosesAt(e.target.value); markDirty(); }}
                className="w-full rounded-xl border app-border app-bg-subnav px-3 py-2 text-sm app-text-main focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
            </FormField>
          </div>
        </div>

        {saveError && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-xs text-red-700 dark:text-red-300">
            <FiAlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {saveError}
          </div>
        )}

        {canWrite && (
          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={save} disabled={saving || !dirty}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer">
              {saving ? <FiRefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FiSave className="w-3.5 h-3.5" />}
              Lưu thay đổi
            </button>
            <button type="button" onClick={reset} disabled={saving || !dirty}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl app-bg-subnav border app-border text-xs font-bold app-text-main transition-colors disabled:opacity-50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
              <FiX className="w-3.5 h-3.5" />
              Hủy thay đổi
            </button>
            {dirty && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">● Chưa lưu</span>
            )}
          </div>
        )}
      </div>

      <div className="app-bg-card border app-border rounded-2xl p-5">
        <GiftRecordsTable eventId={eventId} />
      </div>
    </div>
  );
}

// ─────────────────────── tab button ──────────────────────────────────────────
function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
        active
          ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
          : "border-transparent app-text-muted hover:app-text-main"
      }`}
    >
      {children}
    </button>
  );
}

// ─────────────────────── main page ───────────────────────────────────────────
export function EventTransfers() {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as "resale" | "gift") || "resale";

  const [settings, setSettings] = useState<TransferSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<"forbidden" | "failed" | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true); setFetchError(null);
    try {
      const data = await eventTransferApi.getSettings(eventId!);
      setSettings(data);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      setFetchError(e?.response?.status === 403 ? "forbidden" : "failed");
    } finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  if (loading) {
    return (
      <div className="p-6">
        <Spinner />
      </div>
    );
  }

  if (fetchError === "forbidden") {
    return (
      <div className="p-6 flex items-center gap-3 rounded-2xl app-bg-card border app-border">
        <FiAlertCircle className="w-5 h-5 text-red-500 shrink-0" />
        <div>
          <p className="text-sm font-bold app-text-main">Không có quyền truy cập</p>
          <p className="text-xs app-text-muted mt-0.5">Bạn cần quyền OWNER, ADMIN hoặc MANAGER để xem trang này.</p>
        </div>
      </div>
    );
  }

  if (fetchError === "failed") {
    return (
      <div className="p-6 flex items-center gap-3 rounded-2xl app-bg-card border app-border">
        <FiAlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold app-text-main">Không thể tải cài đặt</p>
          <p className="text-xs app-text-muted mt-0.5">Đã có lỗi xảy ra khi tải cấu hình chuyển nhượng vé.</p>
        </div>
        <button onClick={fetchSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl app-bg-subnav border app-border text-xs font-bold app-text-main cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
          <FiRefreshCw className="w-3.5 h-3.5" />
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl">
      {/* header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
          <FiRepeat className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold app-text-main">Chuyển nhượng vé</h1>
          <p className="text-xs app-text-muted">Quản lý bán lại và tặng vé cho sự kiện</p>
        </div>
        {!settings?.canWrite && (
          <span className="ml-auto text-xs px-2.5 py-1 rounded-full app-bg-subnav border app-border app-text-muted font-medium flex items-center gap-1">
            <FiLock className="w-3 h-3" /> Chỉ xem
          </span>
        )}
      </div>

      {/* tabs */}
      <div className="flex gap-1 border-b app-border">
        <TabBtn active={activeTab === "resale"} onClick={() => setSearchParams({ tab: "resale" })}>
          Bán lại vé
        </TabBtn>
        <TabBtn active={activeTab === "gift"} onClick={() => setSearchParams({ tab: "gift" })}>
          Tặng vé
        </TabBtn>
      </div>

      {/* content */}
      {activeTab === "resale" ? (
        <ResalePolicySection
          eventId={eventId!}
          policy={settings?.resale ?? null}
          canWrite={settings?.canWrite ?? false}
          onSaved={(updated) =>
            setSettings((s) => (s ? { ...s, resale: updated } : s))
          }
        />
      ) : (
        <GiftPolicySection
          eventId={eventId!}
          policy={settings?.gift ?? null}
          canWrite={settings?.canWrite ?? false}
          onSaved={(updated) =>
            setSettings((s) => (s ? { ...s, gift: updated } : s))
          }
        />
      )}
    </div>
  );
}

export default EventTransfers;
