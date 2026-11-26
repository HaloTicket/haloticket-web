import { useEffect, useRef, useState, type FormEvent } from "react";
import { FiAlertTriangle, FiBell, FiFlag, FiRefreshCw, FiSend } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
import { Button } from "@/components/common/Button";
import { AnnouncementPreview } from "@/components/notifications/AnnouncementPreview";
import { notificationPriorities } from "@/components/notifications/notificationPriority";
import { notificationApi, type AnnouncementAudience, type AnnouncementRequest, type AnnouncementStatus } from "@/services/notificationApi";
import type { NotificationPriority } from "@/types";
import { AnnouncementRecipientPicker, type RecipientOption } from "./AnnouncementRecipientPicker";

type Draft = Omit<AnnouncementRequest, "requestId">;
const audienceLabels = { ALL: "Tất cả tài khoản", USER: "Cá nhân", EVENT_ORGANIZING_TEAM: "Ban tổ chức" } as const;
const priorityIcons = { NORMAL: FiBell, IMPORTANT: FiFlag, URGENT: FiAlertTriangle };
const statusLabels = { QUEUED: "Đang chờ xử lý", PROCESSING: "Đang gửi thông báo", COMPLETED: "Đã gửi thông báo", FAILED: "Gửi thông báo thất bại" } as const;
const failureMessages: Readonly<Record<string, string>> = {
  RECIPIENT_NOT_FOUND: "Không tìm thấy người nhận đã chọn. Hãy chọn lại người nhận.",
  NO_ELIGIBLE_RECIPIENTS: "Đối tượng đã chọn không có tài khoản đủ điều kiện nhận thông báo.",
};
const pollDelay = 3000;
const titleLimit = 150;
const messageLimit = 5000;
const fieldClass = "w-full rounded-lg border app-border app-bg-card px-3 py-2.5 text-sm app-text-main focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

export function AdminAnnouncementForm() {
  const { t } = useTranslation();
  const [kind, setKind] = useState<AnnouncementAudience["kind"]>("ALL");
  const [recipient, setRecipient] = useState<RecipientOption | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<NotificationPriority>("NORMAL");
  const [confirmation, setConfirmation] = useState<Draft | null>(null);
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState<AnnouncementStatus | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pollError, setPollError] = useState(false);
  const lastRequest = useRef<{ payload: string; id: string } | null>(null);
  const postController = useRef<AbortController | null>(null);
  const activeId = result?.status === "QUEUED" || result?.status === "PROCESSING" ? result.id : null;
  const busy = posting || Boolean(activeId);

  const acceptResult = (status: AnnouncementStatus) => {
    setResult(status);
    if (status.status === "COMPLETED") {
      setTitle("");
      setMessage("");
      setPriority("NORMAL");
      setKind("ALL");
      setRecipient(null);
      lastRequest.current = null;
    }
  };

  useEffect(() => () => postController.current?.abort(), []);

  useEffect(() => {
    if (!activeId) return;
    const announcementId = activeId;
    const controller = new AbortController();
    let timer = setTimeout(poll, pollDelay);
    async function poll() {
      try {
        const status = await notificationApi.getAnnouncement(announcementId, controller.signal);
        if (controller.signal.aborted) return;
        acceptResult(status);
        setPollError(false);
        if (status.status === "COMPLETED" || status.status === "FAILED") return;
      } catch {
        if (controller.signal.aborted) return;
        setPollError(true);
      }
      timer = setTimeout(poll, pollDelay);
    }
    return () => { controller.abort(); clearTimeout(timer); };
  }, [activeId]);

  const review = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || confirmation) return;
    const cleanTitle = title.trim();
    const cleanMessage = message.trim();
    if (!cleanTitle || !cleanMessage || cleanTitle.length > titleLimit || cleanMessage.length > messageLimit) {
      setSubmitError(t("Hãy nhập tiêu đề từ 1–150 ký tự và nội dung từ 1–5000 ký tự."));
      return;
    }
    if (kind !== "ALL" && !recipient) {
      setSubmitError(t("Hãy chọn người nhận thông báo."));
      return;
    }
    const audience: AnnouncementAudience = kind === "USER" && recipient ? { kind, userId: recipient.id }
      : kind === "EVENT_ORGANIZING_TEAM" && recipient ? { kind, eventId: recipient.id }
        : { kind: "ALL" };
    setSubmitError(null);
    setConfirmation({ title: cleanTitle, message: cleanMessage, priority, audience });
  };

  const send = async () => {
    if (!confirmation || postController.current || activeId) return;
    const payload = JSON.stringify(confirmation);
    const requestId = lastRequest.current?.payload === payload ? lastRequest.current.id : crypto.randomUUID();
    lastRequest.current = { payload, id: requestId };
    const controller = new AbortController();
    postController.current = controller;
    setPosting(true);
    setResult(null);
    setPollError(false);
    try {
      const status = await notificationApi.createAnnouncement({ requestId, ...confirmation }, controller.signal);
      if (!controller.signal.aborted) acceptResult(status);
    } catch {
      if (!controller.signal.aborted) setSubmitError(t("Không thể gửi thông báo. Vui lòng thử lại."));
    } finally {
      if (!controller.signal.aborted) {
        postController.current = null;
        setPosting(false);
        setConfirmation(null);
      }
    }
  };

  const reset = () => {
    setTitle("");
    setMessage("");
    setPriority("NORMAL");
    setKind("ALL");
    setRecipient(null);
    setSubmitError(null);
    lastRequest.current = null;
  };

  return (
    <div className="notification-enter grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="min-w-0 space-y-4">
        <form onSubmit={review} className="space-y-5 rounded-xl border app-border app-bg-card p-4 shadow-sm sm:p-6">
          <fieldset disabled={busy} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="announcement-audience" className="block text-sm font-semibold app-text-main">{t("Người nhận")}</label>
              <select id="announcement-audience" value={kind} className={fieldClass} onChange={(event) => {
                setKind(event.target.value as AnnouncementAudience["kind"]);
                setRecipient(null);
              }}>
                {Object.entries(audienceLabels).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
              </select>
              {kind === "ALL" && <p className="text-xs app-text-muted">{t("Gửi đến mọi tài khoản HaloTicket đang hoạt động.")}</p>}
            </div>
            {kind !== "ALL" && <AnnouncementRecipientPicker key={kind} kind={kind} selected={recipient} onSelect={setRecipient} disabled={busy} />}

            <div className="space-y-2">
              <div className="flex gap-1 text-sm font-semibold app-text-main"><label htmlFor="announcement-title">{t("Tiêu đề")}</label><span className="text-rose-500" aria-hidden="true">*</span></div>
              <input id="announcement-title" className={fieldClass} value={title} placeholder={t("Nhập tiêu đề thông báo...")} onChange={(event) => setTitle(event.target.value)} maxLength={titleLimit} required aria-describedby="announcement-title-count" />
              <p id="announcement-title-count" className="text-right text-xs tabular-nums app-text-muted">{title.length}/{titleLimit}</p>
            </div>
            <div className="space-y-2">
              <div className="flex gap-1 text-sm font-semibold app-text-main"><label htmlFor="announcement-message">{t("Nội dung")}</label><span className="text-rose-500" aria-hidden="true">*</span></div>
              <textarea id="announcement-message" className={`${fieldClass} min-h-32 resize-y`} value={message} placeholder={t("Nhập nội dung thông báo...")} onChange={(event) => setMessage(event.target.value)} maxLength={messageLimit} required aria-describedby="announcement-message-count" />
              <p id="announcement-message-count" className="text-right text-xs tabular-nums app-text-muted">{message.length}/{messageLimit}</p>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold app-text-main">{t("Mức ưu tiên")}</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {(Object.keys(notificationPriorities) as NotificationPriority[]).map((value) => {
                  const { label, description, tone } = notificationPriorities[value];
                  const Icon = priorityIcons[value];
                  return <label key={value} className={`flex items-start gap-2.5 rounded-lg border p-3 ${busy ? "opacity-60" : "cursor-pointer"} ${priority === value ? "border-blue-500 bg-blue-500/5 dark:bg-blue-500/10" : "app-border"}`}>
                    <input type="radio" name="announcement-priority" value={value} checked={priority === value} aria-labelledby={`announcement-priority-${value}`} aria-describedby={`announcement-priority-help-${value}`} className="mt-1 shrink-0 accent-blue-600" onChange={() => setPriority(value)} />
                    <span className="space-y-1">
                      <span id={`announcement-priority-${value}`} className="flex items-center gap-1.5 text-sm font-semibold app-text-main"><span className={`rounded p-1 ${tone}`}><Icon aria-hidden="true" /></span>{t(label)}</span>
                      <span id={`announcement-priority-help-${value}`} className="block text-xs app-text-muted">{t(description)}</span>
                    </span>
                  </label>;
                })}
              </div>
            </fieldset>
          </fieldset>
          {submitError && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{submitError}</p>}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy} className="min-h-11 w-full focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 sm:w-auto" icon={<FiSend aria-hidden="true" />}>{t(busy ? "Đang gửi thông báo" : "Gửi thông báo")}</Button>
            <button type="button" disabled={busy} onClick={reset} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border app-border app-bg-card px-4 text-sm font-semibold app-text-main hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-slate-800 sm:w-auto"><FiRefreshCw aria-hidden="true" />{t("Làm mới")}</button>
          </div>
        </form>

        {result && <section role="status" className="notification-enter space-y-2 rounded-xl border app-border app-bg-card p-4 sm:p-5">
          <h2 className="font-semibold app-text-main">{t(statusLabels[result.status])}</h2>
          <p className="text-sm app-text-muted">{t("Số tài khoản đã nhận")} <strong className="app-text-main">{result.deliveredCount} / {result.recipientCount}</strong></p>
          {result.status === "FAILED" && <p className="text-sm text-rose-700 dark:text-rose-300">{t(failureMessages[result.errorCode ?? ""] ?? "Không thể hoàn tất đợt gửi.")}{result.errorCode && ` (${result.errorCode})`}</p>}
          {pollError && <p className="text-sm text-rose-700 dark:text-rose-300">{t("Chưa thể cập nhật tiến độ. Hệ thống sẽ tự thử lại.")}</p>}
        </section>}
      </div>

      <div className="min-w-0 xl:sticky xl:top-4 xl:self-start">
        <AnnouncementPreview title={title} message={message} source={t("Từ HaloTicket")} Icon={priorityIcons[priority]} tone="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300" badge={priority !== "NORMAL" ? <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${notificationPriorities[priority].tone}`}>{t(notificationPriorities[priority].label)}</span> : undefined} />
      </div>

      {confirmation && <AdminConfirmModal
        title={t("Xác nhận gửi thông báo")}
        subtitle={t("Thông báo sẽ xuất hiện trong hộp thư HaloTicket của người nhận.")}
        confirmText={t("Xác nhận gửi")}
        cancelText={t("Hủy bỏ")}
        isDanger={false}
        pending={posting}
        onClose={() => setConfirmation(null)}
        onConfirm={() => void send()}
      >
        <dl className="grid gap-3 text-sm">
          <div><dt className="app-text-muted">{t("Người nhận")}</dt><dd className="wrap-anywhere font-semibold app-text-main">{t(audienceLabels[confirmation.audience.kind])}{recipient && ` · ${recipient.label}${recipient.detail && recipient.detail !== recipient.label ? ` · ${recipient.detail}` : ""}`}</dd></div>
          <div><dt className="app-text-muted">{t("Tiêu đề")}</dt><dd className="wrap-anywhere font-semibold app-text-main">{confirmation.title}</dd></div>
          <div><dt className="app-text-muted">{t("Mức ưu tiên")}</dt><dd className="font-semibold app-text-main">{t(notificationPriorities[confirmation.priority].label)}</dd></div>
        </dl>
      </AdminConfirmModal>}
    </div>
  );
}
