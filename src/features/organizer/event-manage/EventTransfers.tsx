import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { FiAlertCircle, FiCheck, FiChevronDown, FiDownload, FiGift, FiInfo, FiLock, FiMoreHorizontal, FiRefreshCw, FiRepeat, FiSave, FiSearch } from "react-icons/fi";
import { eventTransferApi } from "@/services/eventTransferApi";
import { TablePagination } from "@/components/common/TablePagination";
import type { GiftPolicyData, OrganizerGiftItem, OrganizerListingItem, PageData, ResalePolicyData, TransferSettingsData } from "@/types/eventTransfer";
import { GiftDetailModal } from "./components/GiftDetailModal";
import { ResaleListingDetailModal } from "./components/ResaleListingDetailModal";
import { TransferStatus, transferDate, transferMoney, type TransferEventInfo } from "./components/TransferRecordDetails";
import "./EventTransfers.css";

const localDate = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
};
const instant = (value: string) => value ? new Date(value).toISOString() : null;
const windowError = (start: string, end: string, t: (k: string) => string) => start && end && start >= end ? t("Thời gian kết thúc phải sau thời gian bắt đầu.") : "";
const saveError = (error: unknown, t: (k: string) => string) => (error as { response?: { status?: number } })?.response?.status === 409
  ? t("Cấu hình đã được thay đổi. Tải lại trang để xem phiên bản mới nhất.")
  : t("Chưa lưu được thay đổi. Cấu hình hiện tại vẫn được giữ nguyên, vui lòng thử lại.");

function Toggle({ checked, disabled, onChange, label, showState = false }: { checked: boolean; disabled?: boolean; onChange?: (value: boolean) => void; label: string; showState?: boolean }) {
  const { t } = useTranslation();
  return <div className="transfer-switch-wrap">
    <button type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled}
      className="transfer-switch" onClick={() => onChange?.(!checked)}><span /></button>
    {showState && <span className="text-xs app-text-muted">{checked ? t("Đang bật") : t("Đang tắt")}</span>}
  </div>;
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return <div className="transfer-field"><label htmlFor={id}>{label}</label>{children}{hint && <p>{hint}</p>}</div>;
}

function PolicyHeading({ gift = false, enabled, canWrite, onChange }: { gift?: boolean; enabled: boolean; canWrite: boolean; onChange: (value: boolean) => void }) {
  const { t } = useTranslation();
  return <div className="transfer-policy-heading">
    <div className="flex min-w-0 items-center gap-3"><span className="transfer-section-icon">{gift ? <FiGift /> : <FiRepeat />}</span>
      <div><h2>{gift ? t("Cấu hình tặng vé") : t("Cấu hình bán lại vé")}</h2><p>{gift ? t("Cho phép người sở hữu vé chuyển nhượng vé cho người khác (miễn phí)") : t("Cho phép người mua đăng bán lại vé của họ")}</p></div>
    </div>
    <Toggle checked={enabled} disabled={!canWrite} onChange={onChange} label={gift ? t("Bật tặng vé") : t("Bật bán lại vé")} showState />
  </div>;
}

function Advanced({ id, open, onChange, children }: { id: string; open: boolean; onChange: () => void; children: ReactNode }) {
  const { t } = useTranslation();
  return <div>
    <button type="button" className="transfer-advanced-toggle" aria-expanded={open} aria-controls={id} onClick={onChange}>
      {t("Nâng cao")} <FiChevronDown className={open ? "rotate-180" : ""} />
    </button>
    <div id={id} className="transfer-expand" data-open={open} inert={!open}><div><div className="transfer-advanced-fields">{children}</div></div></div>
  </div>;
}

function SaveActions({ canWrite, dirty, saving, invalid, message, error, onSave, onReset }: { canWrite: boolean; dirty: boolean; saving: boolean; invalid: string; message: string; error: string; onSave: () => void; onReset: () => void }) {
  const { t } = useTranslation();
  return <>
    {(error || invalid) && <p role="alert" className="transfer-error"><FiAlertCircle />{error || invalid}</p>}
    <div className="transfer-save-actions">
      <span role="status" className={message ? "transfer-saved" : "app-text-muted"}>{message ? <><FiCheck />{message}</> : dirty ? t("Có thay đổi chưa lưu") : ""}</span>
      {canWrite && <div className="flex flex-wrap gap-2">
        {dirty && <button type="button" className="transfer-button" disabled={saving} onClick={onReset}>{t("Hủy thay đổi")}</button>}
        <button type="button" className="transfer-button transfer-button-primary" disabled={saving || !dirty || Boolean(invalid)} onClick={onSave}>
          {saving ? <FiRefreshCw className="animate-spin" /> : <FiSave />}{saving ? t("Đang lưu…") : t("Lưu thay đổi")}
        </button>
      </div>}
    </div>
  </>;
}

function ResalePolicy({ eventId, policy, canWrite, onSaved }: { eventId: string; policy: ResalePolicyData | null; canWrite: boolean; onSaved: (value: ResalePolicyData) => void }) {
  const { t } = useTranslation();
  const original = { enabled: policy?.enabled ?? false, min: String(policy?.minPricePercent ?? 80), max: String(policy?.maxPricePercent ?? 120), fee: String(policy?.serviceFeePercent ?? 5), requireApproval: policy?.requireApproval ?? false, start: localDate(policy?.opensAt ?? null), end: localDate(policy?.closesAt ?? null) };
  const [draft, setDraft] = useState(original);
  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  const locked = !canWrite || !draft.enabled || saving;
  const min = Number(draft.min), max = Number(draft.max), fee = Number(draft.fee);
  const invalid = !draft.min || !draft.max || !Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min
    ? t("Giá tối thiểu phải từ 0% và không được vượt giá trần.")
    : !draft.fee || !Number.isFinite(fee) || fee < 0 || fee > 100 ? t("Phí dịch vụ phải từ 0% đến 100%.") : windowError(draft.start, draft.end, t);
  const change = (values: Partial<typeof draft>) => { setDraft({ ...draft, ...values }); setError(""); setMessage(""); };
  const save = async () => {
    if (!canWrite || saving || invalid || !dirty) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const saved = await eventTransferApi.updateResalePolicy(eventId, { enabled: draft.enabled, minPricePercent: min, maxPricePercent: max, serviceFeePercent: fee, requireApproval: draft.requireApproval,
        opensAt: instant(draft.start), closesAt: instant(draft.end), ticketTypeScope: policy?.ticketTypeScope ?? "ALL",
        allowedTicketTypeIds: policy?.allowedTicketTypeIds ?? [], termsVersion: policy?.termsVersion ?? null, expectedVersion: policy?.version ?? null });
      onSaved(saved); setDraft({ enabled: saved.enabled, min: String(saved.minPricePercent), max: String(saved.maxPricePercent), fee: String(saved.serviceFeePercent ?? 5), requireApproval: saved.requireApproval ?? false, start: localDate(saved.opensAt), end: localDate(saved.closesAt) }); setMessage(t("Đã lưu cấu hình bán lại vé"));
    } catch (cause) { setError(saveError(cause, t)); } finally { setSaving(false); }
  };
  return <section className="transfer-panel transfer-policy" aria-label={t("Cấu hình bán lại vé")}>
    <PolicyHeading enabled={draft.enabled} canWrite={canWrite && !saving} onChange={enabled => change({ enabled })} />
    <div className="transfer-policy-fields" data-disabled={locked}>
      <div className="transfer-price-fields">
        <Field id="resale-min" label={t("Giá tối thiểu (% giá gốc)")} hint={t("Ví dụ: 80 = 80% giá gốc")}><div className="transfer-input-unit">
          <input id="resale-min" type="number" min={0} step="any" disabled={locked} value={draft.min} onChange={e => change({ min: e.target.value })} /><span>%</span>
        </div></Field>
        <Field id="resale-max" label={t("Giá trần (% giá gốc)")} hint={t("Ví dụ: 120 = 120% giá gốc")}><div className="transfer-input-unit">
          <input id="resale-max" type="number" min={min} step="any" disabled={locked} value={draft.max} onChange={e => change({ max: e.target.value })} /><span>%</span>
        </div></Field>
        <Field id="resale-fee" label={t("Phí dịch vụ (áp dụng cho người bán)")} hint={t("Từ 0% đến 100% giá bán")}><div className="transfer-input-unit">
          <input id="resale-fee" type="number" min={0} max={100} step="any" value={draft.fee} disabled={locked} onChange={e => change({ fee: e.target.value })} /><span>%</span>
        </div></Field>
      </div>
      <Advanced id="resale-advanced" open={advanced} onChange={() => setAdvanced(!advanced)}>
        <div className="transfer-gift-option"><Toggle label={t("Yêu cầu duyệt tin đăng bán lại")} checked={draft.requireApproval} disabled={locked} onChange={requireApproval => change({ requireApproval })} /><div><h3>{t("Yêu cầu duyệt tin đăng bán lại")}</h3><p>{t("Tin mới cần được phê duyệt trước khi mở bán")}</p></div></div>
        <Field id="resale-start" label={t("Thời gian bắt đầu bán lại")} hint={t("Để trống = mở ngay")}><input id="resale-start" type="datetime-local" disabled={locked} value={draft.start} onChange={e => change({ start: e.target.value })} /></Field>
        <Field id="resale-end" label={t("Thời gian kết thúc bán lại")} hint={t("Để trống = không giới hạn")}><input id="resale-end" type="datetime-local" disabled={locked} value={draft.end} min={draft.start || undefined} onChange={e => change({ end: e.target.value })} /></Field>
      </Advanced>
    </div>
    <div className="transfer-price-preview"><FiInfo /><p><strong>{t("Ví dụ minh họa")}:</strong><br />{t("Giá gốc")} {transferMoney(400000)} → {t("Người dùng có thể đăng bán từ")} <b>{invalid ? "—" : transferMoney(Math.ceil(400000 * min / 100))}</b> {t("đến")} <b>{invalid ? "—" : transferMoney(Math.floor(400000 * max / 100))}</b>.</p></div>
    <SaveActions canWrite={canWrite} dirty={dirty} saving={saving} invalid={invalid} error={error} message={message} onSave={save} onReset={() => { setDraft(original); setError(""); setMessage(""); }} />
  </section>;
}

function GiftPolicy({ eventId, policy, canWrite, onSaved }: { eventId: string; policy: GiftPolicyData | null; canWrite: boolean; onSaved: (value: GiftPolicyData) => void }) {
  const { t } = useTranslation();
  const original = { enabled: policy?.enabled ?? false, ttl: String(policy?.invitationTtlHours ?? 24), requireEkyc: policy?.requireEkyc ?? true, limitEnabled: (policy?.maxGiftCount ?? 3) > 0, limit: String(policy?.maxGiftCount || 3), start: localDate(policy?.opensAt ?? null), end: localDate(policy?.closesAt ?? null) };
  const [draft, setDraft] = useState(original);
  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  const locked = !canWrite || !draft.enabled || saving;
  const invalid = !draft.ttl || !Number.isInteger(Number(draft.ttl)) || Number(draft.ttl) < 1 || Number(draft.ttl) > 168
    ? t("Thời hạn nhận lời mời phải từ 1 đến 168 giờ.")
    : draft.limitEnabled && (!draft.limit || !Number.isInteger(Number(draft.limit)) || Number(draft.limit) < 1 || Number(draft.limit) > 100)
      ? t("Giới hạn số lần tặng phải từ 1 đến 100.") : windowError(draft.start, draft.end, t);
  const change = (values: Partial<typeof draft>) => { setDraft({ ...draft, ...values }); setError(""); setMessage(""); };
  const save = async () => {
    if (!canWrite || saving || invalid || !dirty) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const saved = await eventTransferApi.updateGiftPolicy(eventId, { enabled: draft.enabled, invitationTtlHours: Number(draft.ttl), requireEkyc: draft.requireEkyc, maxGiftCount: draft.limitEnabled ? Number(draft.limit) : 0,
        opensAt: instant(draft.start), closesAt: instant(draft.end), ticketTypeScope: policy?.ticketTypeScope ?? "ALL",
        allowedTicketTypeIds: policy?.allowedTicketTypeIds ?? [], expectedVersion: policy?.version ?? null });
      onSaved(saved); setDraft({ enabled: saved.enabled, ttl: String(saved.invitationTtlHours), requireEkyc: saved.requireEkyc ?? true, limitEnabled: (saved.maxGiftCount ?? 3) > 0, limit: String(saved.maxGiftCount || 3), start: localDate(saved.opensAt), end: localDate(saved.closesAt) }); setMessage(t("Đã lưu cấu hình tặng vé"));
    } catch (cause) { setError(saveError(cause, t)); } finally { setSaving(false); }
  };
  return <section className="transfer-panel transfer-policy" aria-label={t("Cấu hình tặng vé")}>
    <PolicyHeading gift enabled={draft.enabled} canWrite={canWrite && !saving} onChange={enabled => change({ enabled })} />
    <div className="transfer-gift-options">
      <div className="transfer-gift-option"><Toggle label={t("Yêu cầu xác minh danh tính người nhận (eKYC)")} checked={draft.requireEkyc} disabled={locked} onChange={requireEkyc => change({ requireEkyc })} />
        <div><h3>{t("Yêu cầu xác minh danh tính người nhận (eKYC)")}</h3><p>{draft.requireEkyc ? t("Người nhận cần hoàn thành eKYC trước khi nhận vé") : t("Không yêu cầu eKYC")}</p></div>
      </div>
      <div className="transfer-gift-option"><Toggle label={t("Giới hạn số lần tặng")} checked={draft.limitEnabled} disabled={locked} onChange={limitEnabled => change({ limitEnabled })} />
        <div className="transfer-field"><label htmlFor="gift-limit">{t("Giới hạn số lần tặng")}</label>
          <div className="flex items-center gap-2"><input id="gift-limit" className="transfer-limit-input" type="number" min={1} max={100} step={1} value={draft.limit} disabled={locked || !draft.limitEnabled} onChange={e => change({ limit: e.target.value })} /><span className="text-xs app-text-muted">{t("lần/vé")}</span></div>
          <p>{draft.limitEnabled ? t("Mỗi vé tối đa ") + draft.limit + t(" lần tặng (bao gồm cả lần hiện tại)") : t("Không giới hạn số lần tặng")}</p>
        </div>
      </div>
    </div>
    <div className="transfer-policy-fields" data-disabled={locked}>
      <Advanced id="gift-advanced" open={advanced} onChange={() => setAdvanced(!advanced)}>
        <Field id="gift-ttl" label={t("Thời hạn nhận lời mời (giờ)")} hint={t("Từ 1 đến 168 giờ (7 ngày)")}><input id="gift-ttl" type="number" disabled={locked} min={1} max={168} value={draft.ttl} onChange={e => change({ ttl: e.target.value })} /></Field>
        <Field id="gift-start" label={t("Thời gian bắt đầu nhận tặng")} hint={t("Để trống = mở ngay")}><input id="gift-start" type="datetime-local" disabled={locked} value={draft.start} onChange={e => change({ start: e.target.value })} /></Field>
        <Field id="gift-end" label={t("Thời gian kết thúc nhận tặng")} hint={t("Để trống = không giới hạn")}><input id="gift-end" type="datetime-local" disabled={locked} min={draft.start || undefined} value={draft.end} onChange={e => change({ end: e.target.value })} /></Field>
      </Advanced>
    </div>
    <SaveActions canWrite={canWrite} dirty={dirty} saving={saving} invalid={invalid} error={error} message={message} onSave={save} onReset={() => { setDraft(original); setError(""); setMessage(""); }} />
  </section>;
}

type RecordItem = OrganizerListingItem | OrganizerGiftItem;
const codeOf = (item: RecordItem) => "listingId" in item ? item.refCode : item.sagaId.startsWith("GFT-") ? item.sagaId : "GFT-" + item.sagaId.slice(0, 8).toUpperCase();
const idOf = (item: RecordItem) => "listingId" in item ? item.listingId : item.sagaId;
const getStates = (t: (k: string) => string) => ({ resale: [["PENDING_APPROVAL", t("Chờ duyệt")], ["ACTIVE", t("Đang bán")], ["RESERVED", t("Đang giữ")], ["SOLD", t("Đã bán")], ["PAUSED_BY_EVENT", t("Tạm dừng")], ["CANCELLED", t("Đã gỡ")], ["EXPIRED", t("Hết hạn")]], gift: [["PENDING", t("Chờ xác nhận")], ["COMPLETED", t("Thành công")], ["CANCELLED", t("Đã hủy")]] });

function Records({ eventId, kind, eventInfo, resalePolicy, canWrite }: { eventId: string; kind: "resale" | "gift"; eventInfo: TransferEventInfo; resalePolicy?: ResalePolicyData | null; canWrite: boolean }) {
  const { t } = useTranslation();
  const gift = kind === "gift";
  const [data, setData] = useState<PageData<RecordItem> | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("");
  const [date, setDate] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<RecordItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [exporting, setExporting] = useState(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setError(""); setSelected([]);
      try {
        const response = gift
          ? await eventTransferApi.getGifts(eventId, page, pageSize, status === "ALL" ? undefined : status)
          : await eventTransferApi.getListings(eventId, page, pageSize, status === "ALL" ? undefined : status);
        if (active) {
          if (page > 0 && (!response.content.length || page >= response.totalPages)) setPage(Math.max(0, Math.min(page - 1, response.totalPages - 1)));
          else setData(response);
        }
      } catch { if (active) setError(t("Không thể tải danh sách. Vui lòng thử lại.")); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [eventId, gift, page, pageSize, status, revision]);
  const items = data?.content ?? [];
  const visible = items.filter(item => {
    const text = "listingId" in item ? item.sellerEmailMasked + " " + (item.seatCode ?? "") : item.senderEmailMasked + " " + item.recipientEmailMasked;
    const time = "listingId" in item ? item.createdAt : item.sentAt;
    return (!search || (codeOf(item) + " " + text + " " + item.ticketTypeName).toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")))
      && (!tier || item.ticketTypeName === tier) && (!date || localDate(time).slice(0, 10) === date);
  });
  const changeStatus = (value: string) => { setStatus(value); setPage(0); setSelected([]); };
  const reload = () => setRevision(value => value + 1);
  const reloadFirstPage = () => { setPage(0); reload(); };
  const moderate = async (listingId: string, action: "APPROVE" | "REJECT", reason?: string) => {
    if (!canWrite) return;
    await eventTransferApi.moderateListing(eventId, listingId, action, reason);
    setMessage(action === "APPROVE" ? t("Đã gửi yêu cầu phê duyệt tin đăng.") : t("Đã gửi yêu cầu từ chối tin đăng. Hệ thống đang xử lý mở khóa vé.")); reload();
  };
  const delist = async (listingId: string) => {
    if (!canWrite) return;
    await eventTransferApi.cancelListing(eventId, listingId);
    setMessage(t("Đã gửi yêu cầu gỡ tin đăng. Hệ thống đang xử lý mở khóa vé.")); reload();
  };
  const cancelGift = async (sagaId: string) => {
    if (!canWrite) return;
    await eventTransferApi.cancelGift(eventId, sagaId);
    setMessage(t("Đã gửi yêu cầu hủy giao dịch tặng vé. Hệ thống đang xử lý mở khóa vé.")); reload();
  };
  const exportRows = async () => {
    setExporting(true); setError("");
    try {
      const rows = visible.filter(item => !selected.length || selected.includes(idOf(item)));
      const { utils, writeFile } = await import("xlsx");
      const sheet = utils.aoa_to_sheet([
        gift ? [t("Mã giao dịch"), t("Hạng vé"), t("Số lượng"), t("Người tặng"), t("Người nhận"), t("Trạng thái"), t("Thời gian gửi")] : [t("Mã tin đăng"), t("Hạng vé"), t("Số lượng"), t("Giá đăng bán (VND)"), t("Giá gốc (VND)"), t("Người đăng"), t("Trạng thái"), t("Thời gian đăng")],
        ...rows.map(item => "listingId" in item
          ? [item.refCode, item.ticketTypeName, item.quantity ?? 1, item.price, item.originalPrice ?? "", item.sellerEmailMasked, item.status, transferDate(item.createdAt)]
          : [codeOf(item), item.ticketTypeName, item.quantity ?? 1, item.senderEmailMasked, item.recipientEmailMasked, item.status, transferDate(item.sentAt)]),
      ]);
      const book = utils.book_new(); utils.book_append_sheet(book, sheet, gift ? t("Tặng vé") : t("Bán lại vé"));
      writeFile(book, "HaloTicket-" + kind + "-" + eventId + ".xlsx");
    } catch { setError(t("Chưa xuất được danh sách. Vui lòng thử lại.")); } finally { setExporting(false); }
  };
  const tabs = gift ? [["ALL", t("Lịch sử tặng vé")], ["PENDING", t("Chờ xác nhận")]] : [["ALL", t("Tin đăng bán lại")], ["PENDING_APPROVAL", t("Chờ duyệt")], ["RESERVED", t("Đang giữ")], ["CANCELLED", t("Đã gỡ")]];
  return <section className="transfer-panel transfer-records" aria-label={gift ? t("Danh sách tặng vé") : t("Danh sách bán lại vé")}>
    <div className="transfer-record-tabs" aria-label={t("Lọc nhanh")}>{tabs.map(([value, label]) => <button type="button" key={value} aria-pressed={status === value} onClick={() => changeStatus(value)}>
      {label}{status === value && data && !loading && <span> ({data.totalElements})</span>}
    </button>)}</div>
    <div className="transfer-toolbar">
      <div className="transfer-search"><FiSearch /><input type="search" aria-label={t("Tìm trong trang hiện tại")} value={search} placeholder={gift ? t("Tìm mã vé, người tặng, người nhận…") : t("Tìm mã tin đăng, hạng vé, người đăng…")} onChange={e => { setSearch(e.target.value); setSelected([]); }} /></div>
      <select aria-label={t("Trạng thái")} value={status} onChange={e => changeStatus(e.target.value)}><option value="ALL">{t("Tất cả trạng thái")}</option>{getStates(t)[kind].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select aria-label={t("Hạng vé")} value={tier} onChange={e => { setTier(e.target.value); setSelected([]); }}><option value="">{t("Tất cả hạng vé")}</option>{Array.from(new Set(items.map(item => item.ticketTypeName))).map(value => <option key={value}>{value}</option>)}</select>
      <input type="date" aria-label={gift ? t("Ngày gửi") : t("Ngày đăng")} value={date} onChange={e => { setDate(e.target.value); setSelected([]); }} />
      <button type="button" className="transfer-button" aria-label={t("Tải lại bảng")} disabled={loading} onClick={reloadFirstPage}><FiRefreshCw className={loading ? "animate-spin" : ""} />{t("Tải lại")}</button>
      <button type="button" className="transfer-button transfer-button-export" onClick={exportRows} disabled={loading || !visible.length || exporting}><FiDownload />{exporting ? t("Đang xuất…") : t("Xuất Excel")}{selected.length ? " (" + selected.length + ")" : ""}</button>
    </div>
    {message && <p role="status" className="transfer-saved"><FiCheck />{message}</p>}
    {error && <div role="alert" className="transfer-list-message transfer-error"><FiAlertCircle />{error}<button type="button" onClick={() => setRevision(revision + 1)}>{t("Thử lại")}</button></div>}
    {loading ? <div role="status" className="transfer-list-message"><FiRefreshCw className="animate-spin" />{t("Đang tải danh sách…")}</div> : !error && <div className="transfer-table-scroll" tabIndex={0} role="region" aria-label={t("Bảng giao dịch chuyển nhượng")}>
      <table><thead><tr>
        <th><input type="checkbox" aria-label={t("Chọn tất cả trong trang")} checked={visible.length > 0 && visible.every(item => selected.includes(idOf(item)))} disabled={!visible.length} onChange={e => setSelected(e.target.checked ? visible.map(idOf) : [])} /></th>
        <th>{gift ? t("Mã giao dịch") : t("Mã tin đăng")}</th><th>{t("Vé / Hạng vé")}</th>
        {gift ? <><th>{t("Người tặng")}</th><th>{t("Người nhận")}</th></> : <><th className="transfer-money">{t("Giá đăng bán")}</th><th className="transfer-money">{t("Giá gốc")}</th><th>{t("Người đăng")}</th></>}
        <th>{t("Trạng thái")}</th><th>{gift ? t("Thời gian gửi") : t("Thời gian đăng")}</th><th>{t("Thao tác")}</th>
      </tr></thead><tbody>{visible.map(item => <tr key={idOf(item)} data-selected={selected.includes(idOf(item))}>
        <td><input type="checkbox" aria-label={t("Chọn ") + codeOf(item)} checked={selected.includes(idOf(item))} onChange={e => setSelected(e.target.checked ? [...selected, idOf(item)] : selected.filter(id => id !== idOf(item)))} /></td>
        <td><button type="button" className="transfer-record-link" onClick={() => setDetail(item)}>{codeOf(item)}</button></td>
        <td><strong>{item.ticketTypeName}</strong><small>{item.quantity ?? 1} {t("vé")}{"listingId" in item && item.seatCode ? " · " + item.seatCode : ""}</small></td>
        {"listingId" in item ? <><td className="transfer-money"><strong>{transferMoney(item.price)}</strong></td><td className="transfer-money">{transferMoney(item.originalPrice)}</td><td>{item.sellerEmailMasked}</td></> : <><td>{item.senderEmailMasked}</td><td>{item.recipientEmailMasked}</td></>}
        <td><TransferStatus status={item.status} gift={gift} /></td><td className="transfer-record-time">{transferDate("listingId" in item ? item.createdAt : item.sentAt)}</td>
        <td><button type="button" className="transfer-row-action" aria-label={t("Xem chi tiết ") + codeOf(item)} onClick={() => setDetail(item)}><FiMoreHorizontal /></button></td>
      </tr>)}
      {!visible.length && <tr><td colSpan={gift ? 8 : 9}><div className="transfer-empty"><span className="transfer-section-icon">{gift ? <FiGift /> : <FiRepeat />}</span><strong>{items.length ? t("Không có kết quả phù hợp") : gift ? t("Chưa có giao dịch tặng vé") : t("Chưa có tin đăng bán lại")}</strong><p>{items.length ? t("Thử thay đổi từ khóa hoặc bộ lọc.") : t("Các giao dịch của sự kiện sẽ xuất hiện tại đây.")}</p></div></td></tr>}
      </tbody></table>
    </div>}
    {data && !loading && !error && <div className="p-4">
      {(selected.length > 0 || search || tier || date) && <p className="mb-3 text-xs app-text-muted">{selected.length ? t("Đã chọn ") + selected.length + " · " : ""}{(search || tier || date) ? t("Hiển thị ") + visible.length + t(" kết quả lọc trong trang hiện tại") : ""}</p>}
      <TablePagination currentPage={page + 1} totalPages={Math.max(1, data.totalPages)} totalItems={data.totalElements} pageSize={pageSize}
        onPageChange={value => setPage(value - 1)} onPageSizeChange={value => { setPageSize(value); setPage(0); setSelected([]); }} />
    </div>}
    {detail && ("listingId" in detail ? <ResaleListingDetailModal isOpen onClose={() => setDetail(null)} listing={detail} {...eventInfo} serviceFeePercent={resalePolicy?.serviceFeePercent} maxPricePercent={resalePolicy?.maxPricePercent}
      isModerationMode={canWrite && detail.status === "PENDING_APPROVAL"} onModerate={canWrite ? moderate : undefined} onDelist={canWrite ? delist : undefined} />
      : <GiftDetailModal isOpen onClose={() => setDetail(null)} gift={detail} {...eventInfo} onCancelGift={canWrite ? cancelGift : undefined} />)}
  </section>;
}

export function EventTransfers() {
  const { t } = useTranslation();
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const context = useOutletContext<{ eventData?: Record<string, unknown> | null } | null>();
  const [settings, setSettings] = useState<TransferSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const activeTab = searchParams.get("tab") === "gift" ? "gift" : "resale";
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setError("");
      try {
        if (!eventId) throw new Error("EVENT_REQUIRED");
        const response = await eventTransferApi.getSettings(eventId);
        if (active) setSettings(response);
      } catch (cause) {
        if (active) setError((cause as { response?: { status?: number } })?.response?.status === 403 ? t("Bạn không có quyền quản lý chuyển nhượng của sự kiện này.") : t("Không thể tải cấu hình chuyển nhượng vé."));
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [eventId, revision]);
  const event = context?.eventData;
  const eventInfo: TransferEventInfo = { eventTitle: typeof event?.title === "string" ? event.title : undefined,
    eventThumbnail: typeof event?.thumbnailUrl === "string" ? event.thumbnailUrl : typeof event?.bannerUrl === "string" ? event.bannerUrl : undefined };
  const changeTab = (tab: string) => setSearchParams(previous => { const next = new URLSearchParams(previous); next.set("tab", tab); return next; });
  if (loading) return <div className="transfer-management"><div role="status" className="transfer-panel transfer-loading"><FiRefreshCw className="animate-spin" />{t("Đang tải cấu hình chuyển nhượng…")}</div></div>;
  if (error || !settings || !eventId) return <div className="transfer-management"><div role="alert" className="transfer-panel transfer-list-message"><FiAlertCircle />{error || t("Không tìm thấy sự kiện.")}<button className="transfer-button" onClick={() => setRevision(revision + 1)}>{t("Thử lại")}</button></div></div>;
  return <div className="transfer-management">
    <div className="transfer-page-description"><p>{t("Quản lý hoạt động bán lại và tặng vé của sự kiện")}</p>{!settings.canWrite && <span><FiLock />{t("Chỉ xem")}</span>}</div>
    <div role="tablist" aria-label={t("Hình thức chuyển nhượng")} className="transfer-main-tabs">
      {(["resale", "gift"] as const).map(tab => <button key={tab} id={"transfer-tab-" + tab} role="tab" type="button" aria-selected={activeTab === tab} aria-controls={"transfer-panel-" + tab} tabIndex={activeTab === tab ? 0 : -1}
        onClick={() => changeTab(tab)} onKeyDown={e => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
          e.preventDefault(); const next = e.key === "Home" ? "resale" : e.key === "End" ? "gift" : tab === "gift" ? "resale" : "gift";
          changeTab(next); document.getElementById("transfer-tab-" + next)?.focus();
        }}>{tab === "resale" ? t("Bán lại vé") : t("Tặng vé")}</button>)}
    </div>
    <div role="tabpanel" id="transfer-panel-resale" aria-labelledby="transfer-tab-resale" hidden={activeTab !== "resale"} className="transfer-tab-content" key={eventId + "-resale"}>
      <ResalePolicy eventId={eventId} policy={settings.resale} canWrite={settings.canWrite} onSaved={resale => setSettings(current => current && ({ ...current, resale }))} />
      <Records eventId={eventId} kind="resale" eventInfo={eventInfo} resalePolicy={settings.resale} canWrite={settings.canWrite} />
    </div>
    <div role="tabpanel" id="transfer-panel-gift" aria-labelledby="transfer-tab-gift" hidden={activeTab !== "gift"} className="transfer-tab-content" key={eventId + "-gift"}>
      <GiftPolicy eventId={eventId} policy={settings.gift} canWrite={settings.canWrite} onSaved={gift => setSettings(current => current && ({ ...current, gift }))} />
      <Records eventId={eventId} kind="gift" eventInfo={eventInfo} canWrite={settings.canWrite} />
    </div>
  </div>;
}

export default EventTransfers;
