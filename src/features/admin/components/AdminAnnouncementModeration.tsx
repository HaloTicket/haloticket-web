import { useCallback, useEffect, useRef, useState } from "react";
import { FiCheck, FiChevronLeft, FiChevronRight, FiClock, FiCornerUpLeft, FiEdit3, FiFileText, FiInfo, FiSearch, FiSend, FiShield, FiUsers } from "react-icons/fi";
import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
import { announcementCategories, categoryPill, categoryText, formatAnnouncementTarget, isAborted, isConflict, reasonLimit, statusMeta, statusText } from "@/components/notifications/announcementMeta";
import { relativeTime, useLabel } from "@/components/notifications/useLabel";
import { notificationApi, type AnnouncementScan, type ModerationAction, type OrganizerAnnouncement } from "@/services/notificationApi";

const pageSize = 20;
type DetailTab = "content" | "send";

const decisions: Record<ModerationAction, { vi: string; en: string; confirmVi: string; confirmEn: string; Icon: typeof FiCheck; button: string; needsReason: boolean }> = {
  REJECT: { vi: "Từ chối", en: "Reject", confirmVi: "Từ chối thông báo?", confirmEn: "Reject this announcement?", Icon: FiCornerUpLeft, button: "border app-border app-bg-card text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10", needsReason: true },
  REQUEST_CHANGES: { vi: "Yêu cầu chỉnh sửa", en: "Request changes", confirmVi: "Yêu cầu chỉnh sửa?", confirmEn: "Request changes?", Icon: FiEdit3, button: "border app-border app-bg-card text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10", needsReason: true },
  APPROVE: { vi: "Duyệt & gửi", en: "Approve & send", confirmVi: "Duyệt và gửi thông báo?", confirmEn: "Approve and send this announcement?", Icon: FiCheck, button: "border-transparent bg-blue-600 text-white hover:bg-blue-700", needsReason: false },
};

const levelStyle = {
  LOW: { vi: "Rủi ro thấp", en: "Low risk", tone: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30" },
  MEDIUM: { vi: "Rủi ro trung bình", en: "Medium risk", tone: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30" },
  HIGH: { vi: "Rủi ro cao", en: "High risk", tone: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30" },
} as const;

function ScanResult({ scan }: { scan?: AnnouncementScan }) {
  const { label } = useLabel();
  const available = scan?.status === "COMPLETE";
  const level = available && scan.level ? levelStyle[scan.level] : null;
  return (
    <section className="rounded-xl border app-border p-4" aria-label={label("Kết quả quét nội dung HaloTicket", "HaloTicket content scan")}>
      <h3 className="mb-3 flex items-center gap-2 text-[14px] font-bold app-text-main">{label("Kết quả quét nội dung HaloTicket", "HaloTicket content scan")}<FiInfo className="app-text-muted" aria-hidden="true" /></h3>
      {available ? <>
        <p className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-semibold ${level?.tone ?? "app-border app-text-main"}`}>
          <span>{level ? label(level.vi, level.en) : label("Đã quét", "Scanned")}</span>
          {typeof scan.score === "number" && <span className="text-[12px]">{label("Điểm", "Score")}: {scan.score} / 100</span>}
        </p>
        {scan.findings?.length ? <ul className="mt-3 space-y-1.5 text-[13px] app-text-main">{scan.findings.map((finding, index) => <li key={`${index}-${finding}`} className="flex gap-2"><FiCheck className="mt-0.5 shrink-0 text-blue-600" aria-hidden="true" /><span className="wrap-anywhere">{finding}</span></li>)}</ul>
          : <p className="mt-3 text-[13px] app-text-muted">{label("Không có phát hiện nào được ghi nhận.", "No findings were reported.")}</p>}
      </> : <p className="rounded-lg border border-dashed app-border px-3 py-3 text-[13px] app-text-muted" role="status">{label("Chưa có kết quả quét nội dung tự động cho thông báo này. Hãy xem xét nội dung thủ công trước khi quyết định.", "Automated content scan is unavailable for this announcement. Review the content manually before deciding.")}</p>}
    </section>
  );
}

/** Tab "Kiểm duyệt": danh sách thông báo của BTC đang chờ duyệt, tìm kiếm, chi tiết hai phần và ba quyết định có xác nhận. */
export function AdminAnnouncementModeration({ onPendingChange }: { onPendingChange?: (total: number) => void }) {
  const { label, locale } = useLabel();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ items: OrganizerAnnouncement[]; total: number }>({ items: [], total: 0 });
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>("content");
  const [decision, setDecision] = useState<ModerationAction | null>(null);
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const listController = useRef<AbortController | null>(null);
  const mutationController = useRef<AbortController | null>(null);
  const selected = data.items.find((item) => item.id === selectedId) ?? data.items[0] ?? null;
  const pages = Math.max(1, Math.ceil(data.total / pageSize));
  const loading = loadedKey !== `${page}|${query}|${refresh}`;

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(input.trim()); setPage(0); }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    const controller = new AbortController();
    listController.current = controller;
    const key = `${page}|${query}|${refresh}`;
    notificationApi.listModeration(page, pageSize, query, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (!result.items.length && page > 0) { setPage(page - 1); return; }
      setData(result);
      setError(false);
      setLoadedKey(key);
      if (!query) onPendingChange?.(result.total);
    }).catch((err) => {
      if (controller.signal.aborted || isAborted(err)) return;
      setError(true);
      setLoadedKey(key);
    });
    return () => controller.abort();
  }, [page, query, refresh, onPendingChange]);

  useEffect(() => () => mutationController.current?.abort(), []);

  const closeDecision = () => { if (!mutating) { setDecision(null); setReason(""); setFormError(null); } };
  const reload = useCallback(() => setRefresh((value) => value + 1), []);

  const submit = async () => {
    if (!selected || !decision || mutating) return;
    const config = decisions[decision];
    const trimmed = reason.trim();
    if (config.needsReason && !trimmed) {
      setFormError(label("Hãy nhập lý do để gửi cho Ban tổ chức.", "Enter a reason to share with the organizer."));
      return;
    }
    listController.current?.abort();
    const controller = new AbortController();
    mutationController.current = controller;
    setMutating(true);
    setFormError(null);
    try {
      await notificationApi.moderateAnnouncement(selected.id, { revision: selected.revision, action: decision, ...(config.needsReason ? { reason: trimmed } : {}) }, controller.signal);
      if (controller.signal.aborted) return;
      setNotice(decision === "APPROVE" ? label("Đã duyệt và đưa thông báo vào hàng đợi gửi.", "Approved and queued the announcement for delivery.") : decision === "REJECT" ? label("Đã từ chối thông báo.", "Announcement rejected.") : label("Đã yêu cầu Ban tổ chức chỉnh sửa.", "Changes requested from the organizer."));
      setDecision(null);
      setReason("");
      setSelectedId(null);
    } catch (err) {
      if (controller.signal.aborted || isAborted(err)) return;
      if (isConflict(err)) {
        setNotice(label("Thông báo đã được thay đổi hoặc xử lý ở nơi khác. Danh sách đã được làm mới.", "This announcement changed or was handled elsewhere. The list was refreshed."));
        setDecision(null);
        setReason("");
      } else setFormError(label("Không thể lưu quyết định. Vui lòng thử lại.", "Could not save the decision. Please try again."));
    } finally {
      if (mutationController.current === controller) {
        mutationController.current = null;
        setMutating(false);
      }
      if (!controller.signal.aborted) reload();
    }
  };

  const date = (value?: string) => value && !Number.isNaN(Date.parse(value)) ? new Date(value) : null;
  const submitted = selected ? date(selected.submittedAt) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border app-border app-bg-card shadow-sm" aria-label={label("Đang chờ duyệt", "Pending review")}>
        <h2 className="border-b app-border px-4 py-3 text-[15px] font-bold app-text-main">{label("Đang chờ duyệt", "Pending review")} ({data.total})</h2>
        <div className="p-3">
          <label className="flex items-center gap-2 rounded-lg border app-border px-3 py-2 text-[13px] focus-within:ring-2 focus-within:ring-blue-500/30">
            <FiSearch className="app-text-muted" aria-hidden="true" />
            <span className="sr-only">{label("Tìm thông báo chờ duyệt", "Search pending announcements")}</span>
            <input value={input} onChange={(event) => setInput(event.target.value)} className="w-full bg-transparent outline-none app-text-main" placeholder={label("Tìm theo tiêu đề, sự kiện, BTC...", "Search by title, event, organizer...")} />
          </label>
        </div>
        <div className="max-h-[60vh] min-h-48 flex-1 space-y-1 overflow-y-auto px-2 pb-2" aria-busy={loading}>
          {error ? <div role="alert" className="space-y-2 p-4 text-center text-[13px]"><p className="text-rose-600 dark:text-rose-400">{label("Không thể tải danh sách kiểm duyệt.", "Could not load the moderation queue.")}</p><button type="button" className="rounded-md bg-rose-50 px-3 py-1.5 font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" onClick={reload}>{label("Thử lại", "Try again")}</button></div>
            : loading && !data.items.length ? <p role="status" className="p-6 text-center text-[13px] app-text-muted">{label("Đang tải…", "Loading…")}</p>
              : !data.items.length ? <p className="p-6 text-center text-[13px] app-text-muted">{query ? label("Không có thông báo phù hợp.", "No matching announcements.") : label("Không có thông báo nào đang chờ duyệt.", "No announcements are waiting for review.")}</p>
                : data.items.map((item) => {
                  const { Icon, tone } = announcementCategories[item.category];
                  const when = date(item.submittedAt);
                  const active = selected?.id === item.id;
                  return <button key={item.id} type="button" aria-current={active ? "true" : undefined} onClick={() => { setSelectedId(item.id); setTab("content"); setNotice(null); }} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 ${active ? "border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10" : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                    <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ${tone}`} aria-hidden="true"><Icon /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2"><span className="wrap-anywhere text-[13px] font-bold app-text-main">{item.title}</span>{when && <time className="shrink-0 text-[11px] app-text-muted" dateTime={when.toISOString()}>{relativeTime(when, locale)}</time>}</span>
                      <span className="block truncate text-[12px] app-text-muted">{label("BTC", "Organizer")} · {item.eventTitle}</span>
                      <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${categoryPill[item.category]}`}>{categoryText(item.category, label)}</span>
                    </span>
                  </button>;
                })}
        </div>
        {data.total > pageSize && <nav className="flex items-center justify-between border-t app-border px-3 py-2 text-[12px] app-text-muted" aria-label={label("Phân trang", "Pagination")}>
          <button type="button" className="inline-flex size-8 items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800" disabled={page === 0 || loading} onClick={() => setPage(page - 1)} aria-label={label("Trang trước", "Previous page")}><FiChevronLeft aria-hidden="true" /></button>
          <span>{page + 1} / {pages}</span>
          <button type="button" className="inline-flex size-8 items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800" disabled={page + 1 >= pages || loading} onClick={() => setPage(page + 1)} aria-label={label("Trang sau", "Next page")}><FiChevronRight aria-hidden="true" /></button>
        </nav>}
      </section>

      <article className="flex min-w-0 flex-col rounded-xl border app-border app-bg-card shadow-sm" aria-label={label("Chi tiết thông báo chờ duyệt", "Pending announcement details")}>
        {notice && <p role="status" className="m-4 mb-0 rounded-lg bg-emerald-50 px-3 py-2 text-[13px] font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</p>}
        {!selected ? <div className="grid min-h-64 flex-1 place-items-center p-6 text-center text-[13px] app-text-muted"><span className="flex flex-col items-center gap-2"><FiShield className="size-8" aria-hidden="true" />{label("Chọn một thông báo để kiểm duyệt.", "Select an announcement to review.")}</span></div> : <>
          <header className="flex flex-wrap items-start gap-3 p-4 sm:p-5">
            <span className={`grid size-12 shrink-0 place-items-center rounded-full ${announcementCategories[selected.category].tone}`} aria-hidden="true">{(() => { const Icon = announcementCategories[selected.category].Icon; return <Icon className="size-5" />; })()}</span>
            <div className="min-w-0 flex-1">
              <h2 className="wrap-anywhere text-lg font-bold app-text-main">{selected.title}</h2>
              <p className="text-[13px] app-text-muted">{label("Ban tổ chức", "Organizer")}: <span className="font-semibold text-blue-600 dark:text-blue-400">{selected.eventTitle}</span></p>
            </div>
            <div className="text-right text-[12px] app-text-muted">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${statusMeta[selected.status].tone}`}><FiClock aria-hidden="true" />{statusText(selected.status, label)}</span>
              {submitted && <p className="mt-2">{label("Gửi lúc", "Submitted")}: {submitted.toLocaleString(locale)}</p>}
            </div>
          </header>
          <div role="tablist" aria-label={label("Chi tiết thông báo", "Announcement details")} className="flex gap-1 border-b app-border px-4 sm:px-5">
            {([["content", FiFileText, label("Nội dung", "Content")], ["send", FiSend, label("Thông tin gửi", "Send info")]] as const).map(([value, Icon, text]) => <button key={value} type="button" role="tab" id={`moderation-tab-${value}`} aria-selected={tab === value} aria-controls={`moderation-panel-${value}`} onClick={() => setTab(value)} className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-[13px] font-semibold ${tab === value ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400" : "border-transparent app-text-muted hover:app-text-main"}`}><Icon aria-hidden="true" />{text}</button>)}
          </div>
          <div className="flex-1 p-4 sm:p-5">
            {tab === "content" ? <div role="tabpanel" id="moderation-panel-content" aria-labelledby="moderation-tab-content" className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <div className="min-w-0 space-y-4">
                <section className="rounded-xl border app-border p-4"><h3 className="mb-1 text-[13px] font-bold app-text-main">{label("Tiêu đề", "Title")}</h3><p className="wrap-anywhere text-sm app-text-main">{selected.title}</p></section>
                <section className="rounded-xl border app-border p-4"><h3 className="mb-1 text-[13px] font-bold app-text-main">{label("Nội dung", "Message")}</h3><p className="whitespace-pre-wrap wrap-anywhere text-sm leading-relaxed app-text-main">{selected.message}</p></section>
              </div>
              <ScanResult scan={selected.scan} />
            </div> : <div role="tabpanel" id="moderation-panel-send" aria-labelledby="moderation-tab-send" className="space-y-4">
              <section className="rounded-xl border app-border p-4"><h3 className="mb-1 text-[13px] font-bold app-text-main">{label("Đối tượng nhận", "Audience")}</h3><p className="flex items-center gap-2 text-sm app-text-main"><FiUsers aria-hidden="true" />{formatAnnouncementTarget(selected.target, label)}</p></section>
              <dl className="grid gap-3 rounded-xl border app-border p-4 text-sm sm:grid-cols-2">
                <div><dt className="app-text-muted">{label("Sự kiện", "Event")}</dt><dd className="wrap-anywhere font-semibold app-text-main">{selected.eventTitle}</dd></div>
                <div><dt className="app-text-muted">{label("Danh mục", "Category")}</dt><dd className="font-semibold app-text-main">{categoryText(selected.category, label)}</dd></div>
                <div><dt className="app-text-muted">{label("Số người nhận dự kiến", "Expected recipients")}</dt><dd className="font-semibold app-text-main">{selected.recipientCount}</dd></div>
                <div><dt className="app-text-muted">{label("Phiên bản", "Revision")}</dt><dd className="font-semibold app-text-main">{selected.revision}</dd></div>
              </dl>
            </div>}
          </div>
          <footer className="flex flex-wrap justify-end gap-3 border-t app-border p-4">
            {(Object.keys(decisions) as ModerationAction[]).map((action) => {
              const { vi, en, Icon, button } = decisions[action];
              return <button key={action} type="button" disabled={mutating} onClick={() => { setDecision(action); setReason(""); setFormError(null); }} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 ${button}`}><Icon aria-hidden="true" />{label(vi, en)}</button>;
            })}
          </footer>
        </>}
      </article>

      {selected && decision && <AdminConfirmModal
        title={label(decisions[decision].confirmVi, decisions[decision].confirmEn)}
        subtitle={selected.title}
        confirmText={label(decisions[decision].vi, decisions[decision].en)}
        cancelText={label("Hủy bỏ", "Cancel")}
        isDanger={decision === "REJECT"}
        pending={mutating}
        onClose={closeDecision}
        onConfirm={() => void submit()}
      >
        {decisions[decision].needsReason ? <div className="space-y-2">
          <label htmlFor="moderation-reason" className="block text-sm font-semibold app-text-main">{label("Lý do gửi Ban tổ chức", "Reason shared with the organizer")} <span className="text-rose-500" aria-hidden="true">*</span></label>
          <textarea id="moderation-reason" value={reason} maxLength={reasonLimit} onChange={(event) => setReason(event.target.value)} className="min-h-24 w-full rounded-lg border app-border app-bg-card px-3 py-2 text-sm app-text-main focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" aria-describedby="moderation-reason-count" required />
          <p id="moderation-reason-count" className="text-right text-xs tabular-nums app-text-muted">{reason.length}/{reasonLimit}</p>
        </div> : <p className="text-sm app-text-main">{label(`Thông báo sẽ được gửi tới "${formatAnnouncementTarget(selected.target, label)}" của "${selected.eventTitle}".`, `The announcement will be sent to "${formatAnnouncementTarget(selected.target, label)}" of "${selected.eventTitle}".`)}</p>}
        {formError && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">{formError}</p>}
      </AdminConfirmModal>}
    </div>
  );
}

export default AdminAnnouncementModeration;
