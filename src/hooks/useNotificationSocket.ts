import { useState, useEffect, useCallback, useRef } from "react";
import { notificationApi } from "@/services/notificationApi";
import type { NotificationChannel, NotificationItem } from "@/types";
import { toast } from "sonner";
import { CONFIG } from "@/config";
import { getKeycloakSession } from "@/services/keycloakSession";

/** Thông báo thô do API trả về, có thể dùng tên trường cũ (`subjectTemplate`, `bodyTemplate`) thay cho `title`, `message`. */
interface RawNotification {
  id?: string;
  userId?: string;
  type?: string;
  title?: string;
  subjectTemplate?: string;
  message?: string;
  bodyTemplate?: string;
  readStatus?: boolean | null;
  priority?: string;
  variablesJson?: string | null;
  createdAt?: string;
  source?: string;
  eventId?: string;
  eventTitle?: string;
  category?: string;
  visibility?: string;
  [key: string]: unknown;
}

let sharedAudioCtx: AudioContext | null = null;

/** Lấy `AudioContext` dùng chung (tạo lười, hỗ trợ `webkitAudioContext`) và tiếp tục nếu đang bị trình duyệt tạm dừng; trả null khi không có window hoặc không hỗ trợ. */
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
    void sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

if (typeof window !== "undefined") {
  /** Mở khóa âm thanh sau lần tương tác đầu của người dùng, vì trình duyệt chặn phát tự động. */
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      void ctx.resume();
    }
  };
  window.addEventListener("click", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });
}

let lastChimeTime = 0;

// tổng hợp tiếng chuông êm bằng Web Audio API
/** Phát tiếng chuông thông báo gồm hai nốt; bỏ qua nếu lần phát trước cách chưa tới 1,5 giây, lỗi âm thanh chỉ ghi cảnh báo. */
export async function playNotificationChime() {
  const now = Date.now();
  if (now - lastChimeTime < 1500) {
    return;
  }
  lastChimeTime = now;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    // nốt 1: 587,33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.4);

    // nốt 2: 880 Hz (A5) phát sau 120 ms
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.35, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.7);
  } catch (e) {
    console.warn("Audio chime playback error", e);
  }
}

const recentNotificationKeys = new Map<string, number>();
// A late delivery must stay hidden even when navigation remounts the inbox.
const deletedNotificationIds = new Set<string>();

/** Tạo khóa nhận diện nội dung của thông báo (người nhận, loại, tiêu đề, nội dung; ưu tiên phần trong dấu nháy kép) để phát hiện thông báo trùng. */
function extractNotificationKey(notif: { userId?: string; type?: string; title?: string; message?: string }): string {
  const quoted = notif.message?.match(/"([^"]+)"/)?.[1] || "";
  const normalizedTitle = (notif.title || "").trim();
  const normalizedMsg = (quoted || notif.message || "").trim();
  return `${notif.userId || ""}:${notif.type || ""}:${normalizedTitle}:${normalizedMsg}`;
}

/** Chống xử lý trùng thông báo đến: dọn các khóa cũ quá 6 giây, từ chối thông báo có cùng `id` hoặc cùng nội dung trong 6 giây gần nhất. */
function shouldProcessIncomingNotification(notif: NotificationItem): boolean {
  const now = Date.now();
  for (const [key, timestamp] of recentNotificationKeys.entries()) {
    if (now - timestamp > 6000) {
      recentNotificationKeys.delete(key);
    }
  }

  if (notif.id && !notif.id.startsWith("notif-")) {
    const idKey = `id:${notif.id}`;
    if (recentNotificationKeys.has(idKey)) return false;
    recentNotificationKeys.set(idKey, now);
    return true;
  }

  const contentKey = `content:${extractNotificationKey(notif)}`;
  if (recentNotificationKeys.has(contentKey)) {
    return false;
  }
  recentNotificationKeys.set(contentKey, now);
  return true;
}

type NotificationScope = {
  key: string;
  userIds: string[];
  confirmedReads: Set<string>;
  confirmedUnreads: Set<string>;
  pending: Set<string>;
  pendingAll: boolean;
  revision: number;
  request: number;
  appliedRequest: number;
};

const emptyNotifications: NotificationItem[] = [];

function formatNotification(item: RawNotification, target: string, push = false, fromStaffTopic = false): NotificationItem {
  return {
    id: item.id || `notif-${Date.now()}-${Math.random()}`,
    userId: item.userId || target,
    type: item.type || "GENERAL",
    priority: item.priority === "IMPORTANT" || item.priority === "URGENT" ? item.priority : "NORMAL",
    title: item.title || item.subjectTemplate || "Thông báo mới",
    message: item.message || item.bodyTemplate || (push ? "Có thông báo mới" : "Có cập nhật mới từ hệ thống."),
    readStatus: Boolean(item.readStatus),
    createdAt: typeof item.createdAt === "string" ? item.createdAt : undefined,
    variablesJson: item.variablesJson,
    ...organizerMetadata(item, fromStaffTopic),
  };
}

const announcementCategories = new Set(["EVENT_UPDATE", "PROMOTION", "REMINDER", "INTERNAL"]);

/**
 * Chuẩn hóa nguồn cho cả REST lẫn STOMP: thiếu `source` nghĩa là HaloTicket. Tên sự kiện chỉ lấy từ trường cấp cao
 * do dịch vụ gắn, không lấy từ nội dung `variablesJson`.
 */
function organizerMetadata(
  item: RawNotification,
  fromStaffTopic = false,
): Pick<NotificationItem, "source" | "eventId" | "eventTitle" | "category" | "visibility"> {
  const organizer = item.source === "ORGANIZER"
    || item.type === "ORGANIZER_ANNOUNCEMENT"
    || fromStaffTopic
    || item.visibility === "STAFF";
  const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : undefined;
  const category = organizer && typeof item.category === "string" && announcementCategories.has(item.category)
    ? item.category as NotificationItem["category"]
    : undefined;
  const visibility: NotificationItem["visibility"] = !organizer
    ? undefined
    : item.visibility === "STAFF" || fromStaffTopic || category === "INTERNAL"
      ? "STAFF"
      : item.visibility === "PUBLIC"
        ? "PUBLIC"
        : undefined;
  return {
    source: organizer ? "ORGANIZER" : "HALOTICKET",
    eventId: organizer ? text(item.eventId) : undefined,
    eventTitle: organizer ? text(item.eventTitle) : undefined,
    category,
    visibility,
  };
}

function sortNotifications(items: NotificationItem[]) {
  const time = (item: NotificationItem) => Date.parse(item.createdAt ?? "") || 0;
  return items.sort((a, b) => time(b) - time(a));
}

export interface NotificationSocketOptions {
  channel?: NotificationChannel;
}

export function useNotificationSocket(targetId: string | string[] = "ADMIN", options: NotificationSocketOptions = {}) {
  const channel = options.channel;
  const userIdsJson = JSON.stringify([...new Set([targetId].flat().filter((id) => id.trim()))]);
  const key = `${channel ?? "PUBLIC"}:${userIdsJson}`;
  const [inbox, setInbox] = useState<{ key: string; items: NotificationItem[] }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [toastState, setToastState] = useState<{ scope: string; item: NotificationItem } | null>(null);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const [markingAll, setMarkingAll] = useState(false);
  const activeScope = useRef<NotificationScope | null>(null);
  const notifications = inbox?.key === key ? inbox.items : emptyNotifications;
  const latestToast = toastState?.scope === key ? toastState.item : null;

  const loadNotifications = useCallback(async () => {
    const scope = activeScope.current;
    if (!scope || scope.key !== key) return;
    const request = ++scope.request;
    const revision = scope.revision;
    const results = await Promise.allSettled(
      scope.userIds.map((id) => (channel && id !== "ADMIN"
        ? notificationApi.getUserNotifications(id, channel)
        : notificationApi.getUserNotifications(id))),
    );
    if (scope !== activeScope.current || request <= scope.appliedRequest || revision !== scope.revision) return;
    scope.appliedRequest = request;

    const failure = results.find((result) => result.status === "rejected");
    setError(failure && results.every((result) => result.status === "rejected")
      ? failure.reason instanceof Error ? failure.reason.message : "Failed to load notifications"
      : null);

    const loaded = new Map<string, NotificationItem>();
    const unavailableTargets = new Set<string>();
    results.forEach((result, index) => {
      const target = scope.userIds[index];
      if (result.status === "rejected") {
        unavailableTargets.add(target);
        return;
      }
      for (const raw of result.value) {
        const item = formatNotification(raw, target);
        if (deletedNotificationIds.has(item.id)) continue;
        const existing = loaded.get(item.id);
        if (scope.confirmedUnreads.has(item.id)) item.readStatus = false;
        else if (existing?.readStatus || scope.confirmedReads.has(item.id)) item.readStatus = true;
        loaded.set(item.id, item);
      }
    });
    setInbox((previous) => {
      const visible = new Map(loaded);
      if (previous?.key === key) {
        for (const item of previous.items) {
          if (!visible.has(item.id) && unavailableTargets.has(item.userId) && !deletedNotificationIds.has(item.id)) {
            visible.set(item.id, item);
          }
        }
      }
      return { key, items: sortNotifications([...visible.values()]) };
    });
    setLoading(false);
  }, [key, channel]);

  useEffect(() => {
    const scope: NotificationScope = {
      key,
      userIds: JSON.parse(userIdsJson) as string[],
      confirmedReads: new Set(),
      confirmedUnreads: new Set(),
      pending: new Set(),
      pendingAll: false,
      revision: 0,
      request: 0,
      appliedRequest: 0,
    };
    activeScope.current = scope;

    const initTimer = setTimeout(() => {
      setReadError(null);
      setError(null);
      setPendingIds(new Set());
      setMarkingAll(false);
      setLoading(scope.userIds.length > 0);
      if (scope.userIds.length) void loadNotifications();
    }, 0);
    if (!scope.userIds.length) return () => {
      clearTimeout(initTimer);
      activeScope.current = null;
    };

    // Polling also keeps the inbox usable when a proxy blocks WebSocket.
    const pollInterval = setInterval(loadNotifications, 3000);
    const syncDeletion = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (!deletedNotificationIds.has(id)) return;
      scope.revision += 1;
      setInbox((previous) => previous?.key === key ? { key, items: previous.items.filter((item) => item.id !== id) } : previous);
      setToastState((previous) => previous?.item.id === id ? null : previous);
    };
    window.addEventListener("notification-inbox-item-deleted", syncDeletion);
    const url = new URL(CONFIG.API_BASE_URL, window.location.origin);
    const wsUrl = `${url.protocol === "https:" ? "wss:" : "ws:"}//${url.host}/ws-notifications`;
    let socket: WebSocket | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let handshakeTimer: ReturnType<typeof setTimeout> | undefined;

    const subscriptions = scope.userIds.flatMap((id) => {
      if (id === "ADMIN") return [{ userId: id, topic: "/topic/admin-notifications", staff: false }];
      const list: { userId: string; topic: string; staff: boolean }[] = [];
      if (channel !== "STAFF") list.push({ userId: id, topic: `/topic/user-notifications/${id}`, staff: false });
      if (channel === "ALL" || channel === "STAFF") list.push({ userId: id, topic: `/topic/staff-notifications/${id}`, staff: true });
      return list;
    });

    const connect = () => {
      let connection: WebSocket;
      try {
        connection = new WebSocket(wsUrl);
      } catch {
        reconnectTimer = setTimeout(connect, 3000);
        return;
      }
      socket = connection;
      handshakeTimer = setTimeout(() => connection.close(), 10000);
      connection.onclose = () => {
        clearTimeout(handshakeTimer);
        if (activeScope.current === scope) reconnectTimer = setTimeout(connect, 3000);
      };
      connection.onopen = async () => {
        try {
          const token = await getKeycloakSession().getAccessToken();
          if (activeScope.current !== scope || connection.readyState !== WebSocket.OPEN) return;
          if (!token) {
            connection.close();
            return;
          }
          connection.send(`CONNECT\naccept-version:1.1,1.0\nheart-beat:0,0\nAuthorization:Bearer ${token}\n\n\0`);
        } catch {
          if (activeScope.current === scope) connection.close();
        }
      };
      connection.onmessage = (event) => {
        if (activeScope.current !== scope || typeof event.data !== "string") return;
        for (const packet of event.data.split("\0")) {
          const frame = packet.trimStart();
          const command = frame.split(/\r?\n/, 1)[0];
          if (command === "CONNECTED") {
            clearTimeout(handshakeTimer);
            subscriptions.forEach((sub, index) => {
              connection.send(`SUBSCRIBE\nid:sub-${index}\ndestination:${sub.topic}\n\n\0`);
            });
            void loadNotifications();
          } else if (command === "ERROR") {
            connection.close();
          } else if (command === "MESSAGE") {
            const bodyStart = frame.match(/\r?\n\r?\n/);
            if (bodyStart?.index === undefined) continue;
            const subscription = frame.slice(0, bodyStart.index).match(/^subscription:sub-(\d+)\r?$/m)?.[1];
            const sub = subscriptions[Number(subscription ?? 0)] ?? subscriptions[0];
            const target = sub?.userId ?? scope.userIds[0];
            let notification: NotificationItem;
            try {
              notification = formatNotification(JSON.parse(frame.slice(bodyStart.index + bodyStart[0].length)), target, true, Boolean(sub?.staff));
            } catch {
              continue;
            }
            if (deletedNotificationIds.has(notification.id) || scope.confirmedReads.has(notification.id)) continue;
            setInbox((previous) => {
              const items = previous?.key === key ? previous.items : emptyNotifications;
              if (items.some((item) => item.id === notification.id)) return previous;
              return { key, items: sortNotifications([notification, ...items]) };
            });
            if (shouldProcessIncomingNotification(notification)) {
              setToastState({ scope: key, item: notification });
              void playNotificationChime();
              window.dispatchEvent(new CustomEvent("approval-events-updated", { detail: notification }));
            }
            void loadNotifications();
          }
        }
      };
    };

    connect();
    return () => {
      activeScope.current = null;
      clearTimeout(initTimer);
      clearInterval(pollInterval);
      clearTimeout(reconnectTimer);
      clearTimeout(handshakeTimer);
      window.removeEventListener("notification-inbox-item-deleted", syncDeletion);
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.close();
      }
    };
  }, [key, userIdsJson, channel, loadNotifications]);

  const reportError = (err: unknown, fallback: string) => {
    setReadError(err instanceof Error ? err.message : fallback);
    toast.error(fallback);
  };

  const updateItem = async (id: string, action: "read" | "unread" | "delete") => {
    const scope = activeScope.current;
    const item = notifications.find((notification) => notification.id === id);
    if (!scope || scope.key !== key || !item || scope.pending.has(id) || scope.pendingAll) return;
    if (action === "read" && item.readStatus || action === "unread" && !item.readStatus) return;
    if (action === "delete" && (item.userId === "ADMIN" || id.startsWith("notif-"))) return;

    scope.pending.add(id);
    setPendingIds(new Set(scope.pending));
    setReadError(null);
    try {
      if (action === "read") await notificationApi.markNotificationAsRead(id);
      else if (action === "unread") await notificationApi.markNotificationAsUnread(id);
      else await notificationApi.deleteNotification(id);
      if (action === "delete") {
        deletedNotificationIds.add(id);
        window.dispatchEvent(new CustomEvent("notification-inbox-item-deleted", { detail: id }));
      } else if (scope === activeScope.current) {
        scope.revision += 1;
        if (action === "read") {
          scope.confirmedReads.add(id);
          scope.confirmedUnreads.delete(id);
        } else {
          scope.confirmedUnreads.add(id);
          scope.confirmedReads.delete(id);
        }
        setInbox((previous) => ({ key, items: previous?.items.map((notification) => notification.id === id
          ? { ...notification, readStatus: action === "read" }
          : notification) ?? [] }));
      }
      return true;
    } catch (err) {
      if (scope === activeScope.current) reportError(err, action === "delete"
        ? "Không thể xóa thông báo. Vui lòng thử lại."
        : action === "read"
          ? "Không thể đánh dấu thông báo đã đọc. Vui lòng thử lại."
          : "Không thể đánh dấu thông báo chưa đọc. Vui lòng thử lại.");
    } finally {
      scope.pending.delete(id);
      if (scope === activeScope.current) setPendingIds(new Set(scope.pending));
    }
  };

  const markAllAsRead = async () => {
    const scope = activeScope.current;
    if (!scope || scope.key !== key || scope.pendingAll || scope.pending.size || !notifications.some((item) => !item.readStatus)) return;

    scope.pendingAll = true;
    setMarkingAll(true);
    setReadError(null);
    try {
      // The personal endpoint resolves every verified alias with one server-side cutoff.
      const targets = [scope.userIds.find((id) => id === "ADMIN"), scope.userIds.find((id) => id !== "ADMIN")]
        .filter((id): id is string => Boolean(id));
      const results = await Promise.allSettled(
        targets.map((id) => (channel && id !== "ADMIN"
          ? notificationApi.markAllNotificationsAsRead(id, channel)
          : notificationApi.markAllNotificationsAsRead(id))),
      );
      if (scope !== activeScope.current) return;
      const updated = new Set<string>();
      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        for (const item of result.value) {
          if (typeof item.id === "string" && item.readStatus === true) updated.add(item.id);
        }
      }
      if (updated.size) {
        scope.revision += 1;
        updated.forEach((id) => {
          scope.confirmedReads.add(id);
          scope.confirmedUnreads.delete(id);
        });
        setInbox((previous) => ({ key, items: previous?.items.map((item) => updated.has(item.id) ? { ...item, readStatus: true } : item) ?? [] }));
      }
      const failure = results.find((result) => result.status === "rejected");
      if (failure) reportError(failure.reason, "Không thể đánh dấu tất cả thông báo đã đọc. Vui lòng thử lại.");
    } finally {
      scope.pendingAll = false;
      if (scope === activeScope.current) setMarkingAll(false);
    }
  };

  return {
    notifications,
    unreadCount: notifications.filter((notification) => !notification.readStatus).length,
    loading,
    error,
    readError,
    latestToast,
    pendingIds,
    markingAll,
    markAsRead: (id: string) => updateItem(id, "read"),
    markAsUnread: (id: string) => updateItem(id, "unread"),
    markAllAsRead,
    removeNotification: (id: string) => updateItem(id, "delete"),
    clearToast: () => setToastState(null),
    reload: loadNotifications,
  };
}
