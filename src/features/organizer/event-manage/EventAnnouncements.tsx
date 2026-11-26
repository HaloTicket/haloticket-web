import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import {
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiEdit3,
  FiInfo,
  FiRefreshCw,
  FiSend,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";
import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
import { AnnouncementPreview } from "@/components/notifications/AnnouncementPreview";
import {
  adaptCategoryForGroup,
  announcementCategories,
  categoriesForGroup,
  categoryPill,
  categoryText,
  CUSTOMER_SCOPES,
  DEFAULT_ANNOUNCEMENT_TARGET,
  formatAnnouncementTarget,
  isAborted,
  isConflict,
  isTargetComplete,
  messageLimit,
  normalizeAnnouncementTarget,
  STAFF_ROLE_LABELS,
  STAFF_SCOPES,
  staffRoleText,
  statusMeta,
  statusText,
  titleLimit,
} from "@/components/notifications/announcementMeta";
import { relativeTime, useLabel } from "@/components/notifications/useLabel";
import { eventApi } from "@/services/eventApi";
import { notificationApi, type OrganizerAnnouncement } from "@/services/notificationApi";
import { ticketApi } from "@/services/ticketApi";
import type {
  AnnouncementCategory,
  AnnouncementStaffRole,
  AnnouncementTarget,
  AnnouncementTargetGroup,
  AnnouncementTargetScope,
  MemberItem,
  TicketTypeApiResponse,
} from "@/types";
import { isForbiddenError } from "@/utils/httpError";
import type { EventManageContext } from "./eventManageRoles";

const pageSize = 20;
const pollDelay = 5000;
const fieldClass = "w-full rounded-lg border app-border app-bg-card px-3 py-2.5 text-sm app-text-main focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60";

interface ShowtimeOption {
  id: string;
  label: string;
}

interface ConfirmedDraft {
  title: string;
  message: string;
  category: AnnouncementCategory;
  target: AnnouncementTarget;
  expectedRecipientCount: number;
}

type CountState =
  | { status: "idle"; key: string }
  | { status: "loading"; key: string }
  | { status: "ready"; key: string; count: number }
  | { status: "error"; key: string };

type ResourceState<T> = {
  status: "idle" | "loading" | "ready" | "error";
  items: T[];
};

function parseShowtimeList(raw: unknown, locale: string): ShowtimeOption[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: ShowtimeOption[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = typeof item.name === "string" && item.name.trim()
      ? item.name.trim()
      : typeof item.label === "string" && item.label.trim()
        ? item.label.trim()
        : "";
    const startRaw = typeof item.startTime === "string" ? item.startTime : undefined;
    const endRaw = typeof item.endTime === "string" ? item.endTime : undefined;
    const start = startRaw && !Number.isNaN(Date.parse(startRaw)) ? new Date(startRaw) : null;
    const end = endRaw && !Number.isNaN(Date.parse(endRaw)) ? new Date(endRaw) : null;
    const timeLabel = start
      ? end
        ? `${start.toLocaleString(locale)} – ${end.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`
        : start.toLocaleString(locale)
      : "";
    const text = name && timeLabel ? `${name} (${timeLabel})` : name || timeLabel || id;
    result.push({ id, label: text });
  }
  return result;
}

/** Mục "Marketing → Thông báo": soạn thông báo gửi khách hàng (chờ admin kiểm duyệt) hoặc nhân sự nội bộ và xem lịch sử gửi. */
export function EventAnnouncements() {
  const { label, locale } = useLabel();
  const { eventId = "" } = useParams<{ eventId: string }>();
  const context = useOutletContext<Partial<EventManageContext> | null>() ?? {};
  const eventTitle = typeof context.eventData?.title === "string" ? context.eventData.title : label("Sự kiện", "Event");
  const contextShowtimes = useMemo(
    () => parseShowtimeList(context.eventData?.showtimes, locale),
    [context.eventData?.showtimes, locale],
  );

  const [view, setView] = useState<"compose" | "history">("compose");
  const [target, setTarget] = useState<AnnouncementTarget>(DEFAULT_ANNOUNCEMENT_TARGET);
  const [category, setCategory] = useState<AnnouncementCategory>("EVENT_UPDATE");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<OrganizerAnnouncement | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmedDraft | null>(null);
  const [posting, setPosting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [history, setHistory] = useState<{ items: OrganizerAnnouncement[]; total: number }>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<"forbidden" | "failed" | null>(null);
  const [refresh, setRefresh] = useState(0);

  const [countRefresh, setCountRefresh] = useState(0);
  const [countState, setCountState] = useState<CountState>({ status: "idle", key: "" });

  const [ticketTypes, setTicketTypes] = useState<ResourceState<TicketTypeApiResponse>>({ status: "idle", items: [] });
  const [ticketTypesRefresh, setTicketTypesRefresh] = useState(0);
  const [fetchedShowtimes, setFetchedShowtimes] = useState<ResourceState<ShowtimeOption>>({ status: "idle", items: [] });
  const [showtimesRefresh, setShowtimesRefresh] = useState(0);
  const [members, setMembers] = useState<ResourceState<MemberItem>>({ status: "idle", items: [] });
  const [membersRefresh, setMembersRefresh] = useState(0);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberSuggestionsOpen, setMemberSuggestionsOpen] = useState(false);

  const lastRequest = useRef<{ payload: string; id: string } | null>(null);
  const postController = useRef<AbortController | null>(null);
  const reload = useCallback(() => setRefresh((value) => value + 1), []);
  const active = history.items.some((item) => item.status === "QUEUED" || item.status === "PROCESSING");
  const needsMembers = (target.group === "STAFF" && target.scope === "MEMBER")
    || (view === "history" && history.items.some(({ target }) => target?.group === "STAFF" && target.scope === "MEMBER"));
  const pages = Math.max(1, Math.ceil(history.total / pageSize));

  const targetComplete = isTargetComplete(target);
  const targetKey = JSON.stringify(target);

  const showtimeOptions = contextShowtimes.length > 0 ? contextShowtimes : fetchedShowtimes.items;
  const activeMembers = useMemo(() => {
    const seen = new Set<string>();
    return members.items.filter((member) => {
      const uid = typeof member.userId === "string" ? member.userId.trim() : "";
      if (member.status !== "ACTIVE" || !uid || seen.has(uid)) return false;
      seen.add(uid);
      return true;
    });
  }, [members.items]);
  const selectedMember = target.group === "STAFF" && target.scope === "MEMBER" && target.memberId
    ? activeMembers.find((member) => member.userId?.trim() === target.memberId)
    : undefined;
  const selectedMemberLabel = selectedMember
    ? `${selectedMember.name} (${selectedMember.email}) · ${staffRoleText(selectedMember.role, label)}`
    : "";
  const memberSuggestions = useMemo(() => {
    const query = memberQuery.trim().toLocaleLowerCase();
    return activeMembers.filter((member) => {
      if (!query) return true;
      return `${member.name} ${member.email} ${staffRoleText(member.role, label)}`.toLocaleLowerCase().includes(query);
    }).slice(0, 8);
  }, [activeMembers, memberQuery, label]);

  // Reset event-scoped resources when eventId changes
  useEffect(() => {
    setTicketTypes({ status: "idle", items: [] });
    setFetchedShowtimes({ status: "idle", items: [] });
    setMembers({ status: "idle", items: [] });
  }, [eventId]);

  // Load history
  useEffect(() => {
    if (!eventId) return;
    const controller = new AbortController();
    notificationApi.listEventAnnouncements(eventId, page, pageSize, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (!result.items.length && page > 0) { setPage(page - 1); return; }
      setHistory(result);
      setLoadError(null);
      setLoading(false);
    }).catch((err) => {
      if (controller.signal.aborted || isAborted(err)) return;
      setLoadError(isForbiddenError(err) ? "forbidden" : "failed");
      setLoading(false);
    });
    return () => controller.abort();
  }, [eventId, page, refresh]);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(reload, pollDelay);
    return () => clearTimeout(timer);
  }, [active, history, reload]);

  // Load ticket types when needed
  useEffect(() => {
    if (!eventId || target.group !== "CUSTOMER" || target.scope !== "TICKET_TYPE") return;
    if (ticketTypes.status === "ready" && ticketTypesRefresh === 0) return;
    let cancelled = false;
    setTicketTypes((prev) => ({ status: "loading", items: prev.items }));
    ticketApi.getTicketTypesByEventId(eventId).then((items) => {
      if (cancelled) return;
      setTicketTypes({ status: "ready", items: Array.isArray(items) ? items : [] });
    }).catch(() => {
      if (cancelled) return;
      setTicketTypes({ status: "error", items: [] });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, target.group, target.scope, ticketTypesRefresh]);

  // Load showtimes fallback if not already in Outlet context
  useEffect(() => {
    if (!eventId || target.group !== "CUSTOMER" || target.scope !== "SHOWTIME") return;
    if (contextShowtimes.length > 0) return;
    if (fetchedShowtimes.status === "ready" && showtimesRefresh === 0) return;
    let cancelled = false;
    setFetchedShowtimes((prev) => ({ status: "loading", items: prev.items }));
    eventApi.getEventById(eventId).then((data) => {
      if (cancelled) return;
      if (!data) {
        setFetchedShowtimes({ status: "error", items: [] });
        return;
      }
      setFetchedShowtimes({ status: "ready", items: parseShowtimeList(data.showtimes, locale) });
    }).catch(() => {
      if (cancelled) return;
      setFetchedShowtimes({ status: "error", items: [] });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, target.group, target.scope, contextShowtimes.length, locale, showtimesRefresh]);

  // Resolve staff recipients for both the picker and the current history page.
  useEffect(() => {
    if (!eventId || !needsMembers) return;
    let cancelled = false;
    setMembers((prev) => ({ status: "loading", items: prev.items }));
    eventApi.getEventMembers(eventId).then((items) => {
      if (cancelled) return;
      setMembers({ status: "ready", items: Array.isArray(items) ? items : [] });
    }).catch(() => {
      if (cancelled) return;
      setMembers({ status: "error", items: [] });
    });
    return () => { cancelled = true; };
  }, [eventId, needsMembers, membersRefresh]);

  // Estimate recipient count from server; abort stale requests on target/event changes
  useEffect(() => {
    if (!eventId || !targetComplete) {
      setCountState({ status: "idle", key: targetKey });
      return;
    }
    const controller = new AbortController();
    setCountState({ status: "loading", key: targetKey });
    notificationApi.estimateAnnouncementRecipients(eventId, target, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setCountState({ status: "ready", key: targetKey, count: result.recipientCount });
    }).catch((err) => {
      if (controller.signal.aborted || isAborted(err)) return;
      setCountState({ status: "error", key: targetKey });
    });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, targetKey, targetComplete, countRefresh]);

  useEffect(() => () => postController.current?.abort(), []);

  const validCount = countState.status === "ready" && countState.key === targetKey && countState.count > 0
    ? countState.count
    : null;

  const lookupForTarget = useCallback((t: AnnouncementTarget) => {
    const ticketTypeName = t.ticketTypeId
      ? ticketTypes.items.find((item) => item.id === t.ticketTypeId)?.name
      : undefined;
    const showtimeLabel = t.showtimeId
      ? showtimeOptions.find((item) => item.id === t.showtimeId)?.label
      : undefined;
    const member = t.memberId
      ? members.items.find((item) => item.userId?.trim() === t.memberId)
      : undefined;
    const memberLabel = member?.name?.trim() || member?.email?.trim()
      || (t.memberId && (members.status === "idle" || members.status === "loading")
        ? label("Đang tải tên thành viên…", "Loading member name…")
        : undefined);
    return { ticketTypeName, showtimeLabel, memberLabel };
  }, [ticketTypes.items, showtimeOptions, members, label]);

  const handleGroupChange = (nextGroup: AnnouncementTargetGroup) => {
    if (editing || nextGroup === target.group) return;
    setTarget({ group: nextGroup, scope: "ALL" });
    setMemberQuery("");
    setMemberSuggestionsOpen(false);
    setCategory((prev) => adaptCategoryForGroup(prev, nextGroup));
    setFormError(null);
    lastRequest.current = null;
  };

  const handleScopeChange = (nextScope: AnnouncementTargetScope) => {
    setTarget({ group: target.group, scope: nextScope });
    setMemberQuery("");
    setMemberSuggestionsOpen(false);
    setFormError(null);
    lastRequest.current = null;
  };

  const reset = () => {
    setTarget(DEFAULT_ANNOUNCEMENT_TARGET);
    setMemberQuery("");
    setMemberSuggestionsOpen(false);
    setCategory("EVENT_UPDATE");
    setTitle("");
    setMessage("");
    setEditing(null);
    setFormError(null);
    lastRequest.current = null;
  };

  const review = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (posting || confirmation) return;
    if (!targetComplete) {
      setFormError(label("Hãy chọn đầy đủ phạm vi người nhận.", "Please complete the recipient selection."));
      return;
    }
    if (validCount === null) {
      setFormError(label("Cần có số người nhận hợp lệ lớn hơn 0 trước khi gửi.", "A valid recipient count greater than 0 is required before sending."));
      return;
    }
    const cleanTitle = title.trim();
    const cleanMessage = message.trim();
    if (!cleanTitle || !cleanMessage || cleanTitle.length > titleLimit || cleanMessage.length > messageLimit) {
      setFormError(label("Hãy nhập tiêu đề từ 1–150 ký tự và nội dung từ 1–5000 ký tự.", "Enter a title of 1–150 characters and a message of 1–5,000 characters."));
      return;
    }
    setFormError(null);
    setConfirmation({
      title: cleanTitle,
      message: cleanMessage,
      category,
      target,
      expectedRecipientCount: validCount,
    });
  };

  const send = async () => {
    if (!confirmation || postController.current) return;
    const payload = JSON.stringify({ ...confirmation, edit: editing ? [editing.id, editing.revision] : null });
    const requestId = lastRequest.current?.payload === payload ? lastRequest.current.id : crypto.randomUUID();
    lastRequest.current = { payload, id: requestId };
    const controller = new AbortController();
    postController.current = controller;
    setPosting(true);
    setFormError(null);
    try {
      if (editing) {
        await notificationApi.resubmitEventAnnouncement(
          eventId,
          editing.id,
          { revision: editing.revision, ...confirmation },
          controller.signal,
        );
      } else {
        await notificationApi.createEventAnnouncement(
          eventId,
          { requestId, ...confirmation },
          controller.signal,
        );
      }
      if (controller.signal.aborted) return;
      const isStaffSend = confirmation.target.group === "STAFF";
      setNotice(
        editing
          ? label("Đã gửi lại thông báo để kiểm duyệt.", "Resubmitted the announcement for review.")
          : isStaffSend
            ? label("Đã đưa thông báo nội bộ vào hàng đợi gửi.", "Queued the internal announcement for delivery.")
            : label("Đã gửi thông báo để kiểm duyệt.", "Submitted the announcement for review."),
      );
      reset();
      setConfirmation(null);
      setPage(0);
      setView("history");
      reload();
    } catch (err) {
      if (controller.signal.aborted || isAborted(err)) return;
      setConfirmation(null);
      if (isConflict(err)) {
        lastRequest.current = null;
        setCountRefresh((value) => value + 1);
        if (editing) {
          setFormError(label("Thông báo hoặc số người nhận đã thay đổi (409). Đã làm mới dữ liệu, vui lòng kiểm tra lại.", "This announcement or recipient count changed (409). Data was refreshed; please review and try again."));
          reload();
        } else {
          setFormError(label("Số người nhận đã thay đổi (409). Hệ thống đã cập nhật lại số lượng mới, vui lòng kiểm tra và gửi lại.", "Recipient count changed (409). The latest count has been refreshed; please review and submit again."));
        }
      } else {
        setFormError(
          isForbiddenError(err)
            ? label("Bạn không có quyền gửi thông báo cho sự kiện này.", "You do not have permission to send announcements for this event.")
            : label("Không thể gửi thông báo. Vui lòng thử lại.", "Could not send the announcement. Please try again."),
        );
      }
    } finally {
      if (postController.current === controller) {
        postController.current = null;
        setPosting(false);
      }
    }
  };

  const edit = (item: OrganizerAnnouncement) => {
    const nextTarget = normalizeAnnouncementTarget(item.target);
    setEditing(item);
    setTarget(nextTarget);
    setMemberQuery("");
    setMemberSuggestionsOpen(false);
    setCategory(adaptCategoryForGroup(item.category, nextTarget.group));
    setTitle(item.title);
    setMessage(item.message);
    setFormError(null);
    setNotice(null);
    lastRequest.current = null;
    setView("compose");
  };

  const selectedCategory = announcementCategories[category] ?? announcementCategories.EVENT_UPDATE;
  const availableCategories = categoriesForGroup(target.group);
  const availableScopes = target.group === "STAFF" ? STAFF_SCOPES : CUSTOMER_SCOPES;
  const isStaff = target.group === "STAFF";
  const canSubmit = !posting && targetComplete && validCount !== null;
  const tabClass = "inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-blue-500";

  const previewBadges = (
    <div className="flex flex-wrap items-center gap-1.5">
      {(isStaff || category === "INTERNAL") && (
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${categoryPill.INTERNAL}`}>
          {label("Nội bộ", "Internal")}
        </span>
      )}
      {category === "PROMOTION" && (
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${categoryPill.PROMOTION}`}>
          {categoryText("PROMOTION", label)}
        </span>
      )}
    </div>
  );

  return (
    <div className="space-y-4 pb-10">
      <div className="space-y-1">
        <p className="text-sm app-text-muted">
          {label("Gửi thông báo đến khách hàng hoặc nhân viên của sự kiện", "Send announcements to event customers or staff")}
        </p>
      </div>

      <div role="tablist" aria-label={label("Thông báo sự kiện", "Event announcements")} className="flex gap-1 border-b app-border">
        {([
          ["compose", FiEdit3, editing ? label("Chỉnh sửa & gửi lại", "Edit & resubmit") : label("Soạn thông báo", "Compose")],
          ["history", FiClock, label("Lịch sử gửi", "History")],
        ] as const).map(([value, Icon, text]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={view === value}
            aria-controls={`announcement-panel-${value}`}
            id={`announcement-tab-${value}`}
            onClick={() => setView(value)}
            className={`${tabClass} ${view === value ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400" : "border-transparent app-text-muted hover:app-text-main"}`}
          >
            <Icon aria-hidden="true" />
            {text}
          </button>
        ))}
      </div>

      {notice && (
        <p role="status" className="notification-enter rounded-lg bg-emerald-50 px-3 py-2 text-[13px] font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
          {notice}
        </p>
      )}

      <div hidden={view !== "compose"} role="tabpanel" id="announcement-panel-compose" aria-labelledby="announcement-tab-compose" className="notification-enter grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <form onSubmit={review} className="min-w-0 space-y-5 rounded-xl border app-border app-bg-card p-4 shadow-sm sm:p-6">
          {editing && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-[13px] text-orange-900 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200" role="status">
              <p className="font-semibold">{label("Quản trị viên yêu cầu chỉnh sửa", "An administrator requested changes")}</p>
              {editing.reviewReason && <p className="mt-1 whitespace-pre-wrap wrap-anywhere">{editing.reviewReason}</p>}
            </div>
          )}

          <fieldset disabled={posting} className="space-y-5">
            {/* Recipient group cards */}
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold app-text-main">
                {label("Đối tượng nhận", "Recipient group")} <span className="text-rose-500" aria-hidden="true">*</span>
              </legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {([
                  {
                    value: "CUSTOMER" as const,
                    title: label("Khách hàng", "Customers"),
                    desc: label("Người đã mua vé", "Ticket buyers"),
                    Icon: FiUsers,
                  },
                  {
                    value: "STAFF" as const,
                    title: label("Nhân viên (STAFF)", "Staff"),
                    desc: label("Nhân sự được phân công của sự kiện", "Assigned event staff"),
                    Icon: FiUserCheck,
                  },
                ]).map(({ value, title: groupTitle, desc, Icon }) => {
                  const selected = target.group === value;
                  const disabled = posting || (Boolean(editing) && value !== target.group);
                  return (
                    <label
                      key={value}
                      className={`flex items-center gap-3 rounded-xl border p-3.5 transition-colors ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${selected ? "border-blue-500 bg-blue-50/70 dark:bg-blue-500/10" : "app-border hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                    >
                      <input
                        type="radio"
                        name="announcement-target-group"
                        value={value}
                        checked={selected}
                        disabled={disabled}
                        onChange={() => handleGroupChange(value)}
                        className="sr-only"
                      />
                      <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${selected ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`} aria-hidden="true">
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold app-text-main">{groupTitle}</span>
                        <span className="block text-xs app-text-muted">{desc}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* Scope dropdown + conditional sub-selector + server count banner */}
            <div className="space-y-3">
              <div className="space-y-2">
                <label htmlFor="event-announcement-scope" className="block text-sm font-semibold app-text-main">
                  {label("Phạm vi nhận", "Recipient scope")} <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <FiUsers className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  <select
                    id="event-announcement-scope"
                    className={`${fieldClass} pl-9`}
                    value={target.scope}
                    onChange={(event) => handleScopeChange(event.target.value as AnnouncementTargetScope)}
                  >
                    {availableScopes.map((item) => (
                      <option key={item.value} value={item.value}>
                        {label(item.vi, item.en)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ticket type selector */}
              {target.group === "CUSTOMER" && target.scope === "TICKET_TYPE" && (
                <div className="space-y-1.5">
                  <label htmlFor="event-announcement-ticket-type" className="block text-xs font-semibold app-text-main">
                    {label("Chọn hạng vé", "Select ticket type")} <span className="text-rose-500" aria-hidden="true">*</span>
                  </label>
                  {ticketTypes.status === "error" ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300" role="alert">
                      <span>{label("Không thể tải danh sách hạng vé.", "Could not load ticket types.")}</span>
                      <button type="button" onClick={() => setTicketTypesRefresh((n) => n + 1)} className="font-semibold underline">
                        {label("Thử lại", "Retry")}
                      </button>
                    </div>
                  ) : (
                    <select
                      id="event-announcement-ticket-type"
                      className={fieldClass}
                      disabled={posting || ticketTypes.status === "loading"}
                      value={target.ticketTypeId ?? ""}
                      onChange={(event) => {
                        setTarget({ group: "CUSTOMER", scope: "TICKET_TYPE", ticketTypeId: event.target.value || undefined });
                        lastRequest.current = null;
                      }}
                    >
                      <option value="">
                        {ticketTypes.status === "loading"
                          ? label("Đang tải hạng vé…", "Loading ticket types…")
                          : ticketTypes.items.length === 0
                            ? label("Sự kiện chưa có hạng vé", "No ticket types available")
                            : label("Chọn hạng vé...", "Select a ticket type...")}
                      </option>
                      {ticketTypes.items.map((tt) => (
                        <option key={tt.id} value={tt.id}>{tt.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Showtime selector */}
              {target.group === "CUSTOMER" && target.scope === "SHOWTIME" && (
                <div className="space-y-1.5">
                  <label htmlFor="event-announcement-showtime" className="block text-xs font-semibold app-text-main">
                    {label("Chọn suất diễn", "Select showtime")} <span className="text-rose-500" aria-hidden="true">*</span>
                  </label>
                  {contextShowtimes.length === 0 && fetchedShowtimes.status === "error" ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300" role="alert">
                      <span>{label("Không thể tải danh sách suất diễn.", "Could not load showtimes.")}</span>
                      <button type="button" onClick={() => setShowtimesRefresh((n) => n + 1)} className="font-semibold underline">
                        {label("Thử lại", "Retry")}
                      </button>
                    </div>
                  ) : (
                    <select
                      id="event-announcement-showtime"
                      className={fieldClass}
                      disabled={posting || (contextShowtimes.length === 0 && fetchedShowtimes.status === "loading")}
                      value={target.showtimeId ?? ""}
                      onChange={(event) => {
                        setTarget({ group: "CUSTOMER", scope: "SHOWTIME", showtimeId: event.target.value || undefined });
                        lastRequest.current = null;
                      }}
                    >
                      <option value="">
                        {contextShowtimes.length === 0 && fetchedShowtimes.status === "loading"
                          ? label("Đang tải suất diễn…", "Loading showtimes…")
                          : showtimeOptions.length === 0
                            ? label("Sự kiện chưa có suất diễn", "No showtimes available")
                            : label("Chọn suất diễn...", "Select a showtime...")}
                      </option>
                      {showtimeOptions.map((st) => (
                        <option key={st.id} value={st.id}>{st.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Staff role selector */}
              {target.group === "STAFF" && target.scope === "ROLE" && (
                <div className="space-y-1.5">
                  <label htmlFor="event-announcement-role" className="block text-xs font-semibold app-text-main">
                    {label("Chọn vai trò nhân sự", "Select staff role")} <span className="text-rose-500" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="event-announcement-role"
                    className={fieldClass}
                    value={target.role ?? ""}
                    onChange={(event) => {
                      const nextRole = event.target.value as AnnouncementStaffRole | "";
                      setTarget({ group: "STAFF", scope: "ROLE", ...(nextRole ? { role: nextRole } : {}) });
                      lastRequest.current = null;
                    }}
                  >
                    <option value="">{label("Chọn vai trò...", "Select a role...")}</option>
                    {(Object.keys(STAFF_ROLE_LABELS) as AnnouncementStaffRole[]).map((role) => (
                      <option key={role} value={role}>{staffRoleText(role, label)}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Staff member selector (canonical userId only) */}
              {target.group === "STAFF" && target.scope === "MEMBER" && (
                <div className="space-y-1.5">
                  <label htmlFor="event-announcement-member" className="block text-xs font-semibold app-text-main">
                    {label("Chọn thành viên", "Select member")} <span className="text-rose-500" aria-hidden="true">*</span>
                  </label>
                  {members.status === "error" ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300" role="alert">
                      <span>{label("Không thể tải danh sách thành viên.", "Could not load event members.")}</span>
                      <button type="button" onClick={() => setMembersRefresh((n) => n + 1)} className="font-semibold underline">
                        {label("Thử lại", "Retry")}
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        id="event-announcement-member"
                        className={fieldClass}
                        type="text"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={memberSuggestionsOpen}
                        aria-controls="event-announcement-member-options"
                        autoComplete="off"
                        placeholder={members.status === "loading"
                          ? label("Đang tải thành viên…", "Loading members…")
                          : label("Nhập tên hoặc email thành viên...", "Type a member name or email...")}
                        disabled={posting || members.status === "loading" || activeMembers.length === 0}
                        value={memberQuery || selectedMemberLabel}
                        onFocus={() => setMemberSuggestionsOpen(true)}
                        onBlur={() => window.setTimeout(() => setMemberSuggestionsOpen(false), 100)}
                        onChange={(event) => {
                          const value = event.target.value;
                          setMemberQuery(value);
                          setMemberSuggestionsOpen(true);
                          if (target.memberId) setTarget({ group: "STAFF", scope: "MEMBER" });
                          lastRequest.current = null;
                        }}
                      />
                      {memberSuggestionsOpen && activeMembers.length > 0 && (
                        <div
                          id="event-announcement-member-options"
                          role="listbox"
                          aria-label={label("Thành viên đang hoạt động", "Active event members")}
                          className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border app-border app-bg-card p-1 shadow-xl"
                        >
                          {memberSuggestions.length > 0 ? memberSuggestions.map((member) => {
                            const userId = member.userId!.trim();
                            const optionLabel = `${member.name} (${member.email}) · ${staffRoleText(member.role, label)}`;
                            const selected = target.memberId === userId;
                            return (
                              <button
                                key={userId}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                className="flex w-full flex-col rounded-md px-3 py-2 text-left hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-blue-500/10"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setTarget({ group: "STAFF", scope: "MEMBER", memberId: userId });
                                  setMemberQuery(optionLabel);
                                  setMemberSuggestionsOpen(false);
                                  lastRequest.current = null;
                                }}
                              >
                                <span className="text-sm font-medium app-text-main">{member.name}</span>
                                <span className="text-xs app-text-muted">{member.email} · {staffRoleText(member.role, label)}</span>
                              </button>
                            );
                          }) : (
                            <p className="px-3 py-2 text-xs app-text-muted" role="status">
                              {label("Không tìm thấy thành viên phù hợp.", "No matching members found.")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {selectedMember && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-300" role="status">
                      {label("Đã chọn thành viên nhận thông báo.", "Selected member will receive this announcement.")}
                    </p>
                  )}
                </div>
              )}

              {/* Server-backed recipient count banner */}
              <div aria-live="polite" data-testid="recipient-count-banner">
                {!targetComplete ? (
                  <p className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs app-text-muted dark:bg-slate-800/70">
                    <FiInfo className="shrink-0" aria-hidden="true" />
                    <span>{label("Chọn đầy đủ phạm vi nhận để xem số người nhận dự kiến.", "Complete the scope selection to see the estimated recipient count.")}</span>
                  </p>
                ) : countState.status === "loading" || countState.key !== targetKey ? (
                  <p role="status" className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                    <FiRefreshCw className="shrink-0 animate-spin" aria-hidden="true" />
                    <span>{label("Đang tính số người nhận…", "Calculating recipients…")}</span>
                  </p>
                ) : countState.status === "error" ? (
                  <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                    <span className="flex items-center gap-2">
                      <FiAlertCircle className="shrink-0" aria-hidden="true" />
                      {label("Không thể tính số người nhận. Vui lòng thử lại.", "Could not calculate recipients. Please try again.")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCountRefresh((n) => n + 1)}
                      className="rounded-md bg-rose-100 px-2.5 py-1 font-semibold text-rose-700 hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-200"
                    >
                      {label("Thử lại", "Retry")}
                    </button>
                  </div>
                ) : countState.status === "ready" && countState.count === 0 ? (
                  <p role="status" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    <FiAlertCircle className="shrink-0" aria-hidden="true" />
                    <span>
                      {label("Dự kiến gửi đến:", "Estimated recipients:")}{" "}
                      <strong className="font-bold">0 {label("người", "recipients")}</strong>{" "}
                      — {label("Không có người nhận phù hợp để gửi.", "No eligible recipients to send to.")}
                    </span>
                  </p>
                ) : countState.status === "ready" ? (
                  <p className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                    <FiInfo className="shrink-0" aria-hidden="true" />
                    <span>
                      {label("Dự kiến gửi đến:", "Estimated recipients:")}{" "}
                      <strong className="font-bold">{countState.count.toLocaleString(locale)} {label("người", "recipients")}</strong>
                    </span>
                  </p>
                ) : null}
              </div>
            </div>

            {/* Category radio cards */}
            <fieldset>
              <legend className="mb-2 text-sm font-semibold app-text-main">{label("Loại thông báo", "Announcement type")}</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {availableCategories.map((value) => {
                  const meta = announcementCategories[value];
                  return (
                    <label
                      key={value}
                      className={`flex items-start gap-2.5 rounded-lg border p-3 ${posting ? "opacity-60" : "cursor-pointer"} ${category === value ? "border-blue-500 bg-blue-500/5 dark:bg-blue-500/10" : "app-border"}`}
                    >
                      <input
                        type="radio"
                        name="announcement-category"
                        value={value}
                        checked={category === value}
                        aria-labelledby={`announcement-category-${value}`}
                        aria-describedby={`announcement-category-help-${value}`}
                        className="mt-1 shrink-0 accent-blue-600"
                        onChange={() => setCategory(value)}
                      />
                      <span className="min-w-0 space-y-1">
                        <span id={`announcement-category-${value}`} className="flex items-center gap-1.5 text-sm font-semibold app-text-main">
                          <span className={`rounded p-1 ${meta.tone}`}><meta.Icon aria-hidden="true" /></span>
                          {label(meta.vi, meta.en)}
                        </span>
                        <span id={`announcement-category-help-${value}`} className="block text-xs app-text-muted">
                          {label(meta.descVi, meta.descEn)}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* Title */}
            <div className="space-y-2">
              <div className="flex gap-1 text-sm font-semibold app-text-main">
                <label htmlFor="event-announcement-title">{label("Tiêu đề", "Title")}</label>
                <span className="text-rose-500" aria-hidden="true">*</span>
              </div>
              <input
                id="event-announcement-title"
                className={fieldClass}
                value={title}
                maxLength={titleLimit}
                required
                placeholder={label("Nhập tiêu đề thông báo...", "Enter a notification title...")}
                onChange={(event) => setTitle(event.target.value)}
                aria-describedby="event-announcement-title-count"
              />
              <p id="event-announcement-title-count" className="text-right text-xs tabular-nums app-text-muted">{title.length}/{titleLimit}</p>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <div className="flex gap-1 text-sm font-semibold app-text-main">
                <label htmlFor="event-announcement-message">{label("Nội dung", "Message")}</label>
                <span className="text-rose-500" aria-hidden="true">*</span>
              </div>
              <textarea
                id="event-announcement-message"
                className={`${fieldClass} min-h-36 resize-y`}
                value={message}
                maxLength={messageLimit}
                required
                placeholder={label("Nhập nội dung thông báo...", "Enter the notification message...")}
                onChange={(event) => setMessage(event.target.value)}
                aria-describedby="event-announcement-message-count"
              />
              <p id="event-announcement-message-count" className="text-right text-xs tabular-nums app-text-muted">{message.length}/{messageLimit}</p>
            </div>
          </fieldset>

          {formError && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{formError}</p>}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <FiSend aria-hidden="true" />
              {editing
                ? label("Gửi lại để kiểm duyệt", "Resubmit for review")
                : isStaff
                  ? label("Gửi nội bộ", "Send internally")
                  : label("Gửi duyệt", "Submit for review")}
            </button>
            <button
              type="button"
              disabled={posting}
              onClick={reset}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border app-border app-bg-card px-4 text-sm font-semibold app-text-main hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-slate-800 sm:w-auto"
            >
              <FiRefreshCw aria-hidden="true" />
              {editing ? label("Hủy chỉnh sửa", "Cancel editing") : label("Làm mới", "Reset")}
            </button>
          </div>
        </form>

        <div className="min-w-0 xl:sticky xl:top-4 xl:self-start">
          <AnnouncementPreview
            title={title}
            message={message}
            source={`${label("BTC", "Organizer")} · ${eventTitle}`}
            Icon={selectedCategory.Icon}
            tone={selectedCategory.tone}
            badge={isStaff || category === "INTERNAL" || category === "PROMOTION" ? previewBadges : undefined}
          />
        </div>
      </div>

      <section hidden={view !== "history"} role="tabpanel" id="announcement-panel-history" aria-labelledby="announcement-tab-history" className="notification-enter rounded-xl border app-border app-bg-card shadow-sm" aria-busy={loading}>
        {loadError ? (
          <div role="alert" className="space-y-2 p-6 text-center text-[13px]">
            <p className="text-rose-600 dark:text-rose-400">
              {loadError === "forbidden"
                ? label("Bạn không có quyền xem thông báo của sự kiện này.", "You do not have permission to view announcements for this event.")
                : label("Không thể tải lịch sử gửi.", "Could not load sending history.")}
            </p>
            {loadError !== "forbidden" && (
              <button type="button" className="rounded-md bg-rose-50 px-3 py-1.5 font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" onClick={reload}>
                {label("Thử lại", "Try again")}
              </button>
            )}
          </div>
        ) : loading ? (
          <p role="status" className="p-6 text-center text-[13px] app-text-muted">{label("Đang tải…", "Loading…")}</p>
        ) : !history.items.length ? (
          <p className="p-6 text-center text-[13px] app-text-muted">{label("Chưa có thông báo nào được gửi.", "No announcements have been sent yet.")}</p>
        ) : (
          <ul className="divide-y app-border">
            {history.items.map((item) => {
              const catMeta = announcementCategories[item.category] ?? announcementCategories.EVENT_UPDATE;
              const { Icon, tone } = catMeta;
              const when = Number.isNaN(Date.parse(item.submittedAt)) ? null : new Date(item.submittedAt);
              const itemTarget = normalizeAnnouncementTarget(item.target);
              const itemIsStaff = itemTarget.group === "STAFF";
              return (
                <li key={item.id} className="flex flex-wrap items-start gap-3 p-4">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-full ${tone}`} aria-hidden="true"><Icon /></span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="wrap-anywhere text-[14px] font-bold app-text-main">{item.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusMeta[item.status].tone}`}>
                        {statusText(item.status, label)}
                      </span>
                      {itemIsStaff && (
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${categoryPill.INTERNAL}`}>
                          {label("Nội bộ", "Internal")}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 whitespace-pre-wrap wrap-anywhere text-[13px] app-text-muted">{item.message}</p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] app-text-muted">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${categoryPill[item.category] ?? categoryPill.EVENT_UPDATE}`}>
                        {categoryText(item.category, label)}
                      </span>
                      <span>{formatAnnouncementTarget(itemTarget, label, lookupForTarget(itemTarget))}</span>
                      {when && <time dateTime={when.toISOString()} title={when.toLocaleString(locale)}>{relativeTime(when, locale)}</time>}
                      {["QUEUED", "PROCESSING", "COMPLETED", "FAILED"].includes(item.status) && (
                        <span>{label("Đã nhận", "Delivered")}: {item.deliveredCount} / {item.recipientCount}</span>
                      )}
                    </p>
                    {item.reviewReason && (item.status === "CHANGES_REQUESTED" || item.status === "REJECTED") && (
                      <p className="rounded-lg bg-slate-50 px-3 py-2 text-[12px] app-text-main dark:bg-slate-800/60">
                        <span className="font-semibold">{label("Lý do", "Reason")}: </span>
                        <span className="whitespace-pre-wrap wrap-anywhere">{item.reviewReason}</span>
                      </p>
                    )}
                  </div>
                  {item.status === "CHANGES_REQUESTED" && !itemIsStaff && (
                    <button
                      type="button"
                      onClick={() => edit(item)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg border app-border px-3 text-[13px] font-semibold text-blue-700 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-300 dark:hover:bg-blue-500/10"
                    >
                      <FiEdit3 aria-hidden="true" />
                      {label("Chỉnh sửa & gửi lại", "Edit & resubmit")}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {history.total > pageSize && (
          <nav className="flex items-center justify-between border-t app-border px-4 py-2 text-[12px] app-text-muted" aria-label={label("Phân trang", "Pagination")}>
            <button type="button" className="inline-flex size-8 items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label={label("Trang trước", "Previous page")}><FiChevronLeft aria-hidden="true" /></button>
            <span>{page + 1} / {pages}</span>
            <button type="button" className="inline-flex size-8 items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} aria-label={label("Trang sau", "Next page")}><FiChevronRight aria-hidden="true" /></button>
          </nav>
        )}
      </section>

      {confirmation && (
        <AdminConfirmModal
          title={
            editing
              ? label("Gửi lại để kiểm duyệt?", "Resubmit for review?")
              : confirmation.target.group === "STAFF"
                ? label("Gửi thông báo nội bộ?", "Send internal announcement?")
                : label("Gửi thông báo để kiểm duyệt?", "Submit announcement for review?")
          }
          subtitle={
            confirmation.target.group === "STAFF"
              ? label("Thông báo sẽ được gửi trực tiếp tới nhân sự sự kiện mà không qua kiểm duyệt.", "This announcement will be delivered directly to event staff without moderation.")
              : label("Quản trị viên sẽ xem xét trước khi thông báo được gửi tới khách hàng.", "An administrator reviews it before it is sent to customers.")
          }
          confirmText={
            confirmation.target.group === "STAFF"
              ? label("Xác nhận gửi nội bộ", "Confirm internal send")
              : label("Xác nhận gửi duyệt", "Confirm submission")
          }
          cancelText={label("Hủy bỏ", "Cancel")}
          isDanger={false}
          pending={posting}
          onClose={() => setConfirmation(null)}
          onConfirm={() => void send()}
        >
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="app-text-muted">{label("Đối tượng nhận", "Audience")}</dt>
              <dd className="font-semibold app-text-main">
                {formatAnnouncementTarget(confirmation.target, label, lookupForTarget(confirmation.target))}
              </dd>
            </div>
            <div>
              <dt className="app-text-muted">{label("Số người nhận dự kiến", "Expected recipients")}</dt>
              <dd className="font-semibold app-text-main">
                {confirmation.expectedRecipientCount.toLocaleString(locale)} {label("người", "recipients")}
              </dd>
            </div>
            <div>
              <dt className="app-text-muted">{label("Loại thông báo", "Announcement type")}</dt>
              <dd className="font-semibold app-text-main">{categoryText(confirmation.category, label)}</dd>
            </div>
            <div>
              <dt className="app-text-muted">{label("Tiêu đề", "Title")}</dt>
              <dd className="wrap-anywhere font-semibold app-text-main">{confirmation.title}</dd>
            </div>
          </dl>
        </AdminConfirmModal>
      )}
    </div>
  );
}

export default EventAnnouncements;
