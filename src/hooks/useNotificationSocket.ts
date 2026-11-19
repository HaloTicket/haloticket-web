import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { notificationApi } from "@/services/notificationApi";
import type { NotificationItem } from "@/types";
import { toast } from "sonner";
import { CONFIG } from "@/config";

/** Thông báo thô do API trả về, có thể dùng tên trường cũ (`subjectTemplate`, `bodyTemplate`) thay cho `title`, `message`. */
interface RawNotification {
  id?: string;
  userId?: string;
  type?: string;
  title?: string;
  subjectTemplate?: string;
  message?: string;
  bodyTemplate?: string;
  readStatus?: boolean;
  createdAt?: string;
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

/** Loại bỏ các thông báo trùng `id`, giữ bản đầu tiên. */
function deduplicateNotificationList(items: NotificationItem[]): NotificationItem[] {
  const result: NotificationItem[] = [];
  const seenIds = new Set<string>();

  for (const item of items) {
    if (seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    result.push(item);
  }
  return result;
}

/** Hook nhận thông báo của một hoặc nhiều người nhận (mặc định `ADMIN`) bằng cách tải ban đầu, thăm dò mỗi 3 giây và lắng nghe WebSocket STOMP. Trả về danh sách thông báo, số chưa đọc, trạng thái tải, lỗi, thông báo toast mới nhất và các hàm đánh dấu đã đọc. */
export function useNotificationSocket(targetId: string | string[] = "ADMIN") {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [latestToast, setLatestToast] = useState<NotificationItem | null>(null);
  const hasLoadedNotifications = useRef(false);
  const readRevision = useRef(0);
  const unreadCount = notifications.filter((notification) => !notification.readStatus).length;

  const targetIdSerialized = JSON.stringify(targetId);
  const userIds = useMemo(() => {
    const list = Array.isArray(targetId) ? targetId : [targetId];
    const filtered = list.filter((id) => Boolean(id && typeof id === "string" && id.trim().length > 0));
    return filtered.length > 0 ? Array.from(new Set(filtered)) : ["ADMIN"];
  }, [targetIdSerialized]);

  // tải thông báo ban đầu từ cơ sở dữ liệu
  /** Tải thông báo của mọi người nhận, gộp, loại trùng và sắp xếp mới nhất trước; bỏ qua kết quả cũ nếu trong lúc tải đã có thao tác đánh dấu đã đọc. */
  const loadNotifications = useCallback(async () => {
    if (!hasLoadedNotifications.current) setLoading(true);
    const requestReadRevision = readRevision.current;
    try {
      const results = await Promise.allSettled(
        userIds.map((uid) => notificationApi.getUserNotifications(uid))
      );
      // nếu mọi yêu cầu đều thất bại thì báo lỗi thay vì coi như danh sách rỗng
      const firstRejected = results.find((res): res is PromiseRejectedResult => res.status === "rejected");
      if (firstRejected && results.every((res) => res.status === "rejected")) {
        throw firstRejected.reason;
      }
      const allRaw: RawNotification[] = [];
      for (const res of results) {
        if (res.status === "fulfilled" && Array.isArray(res.value)) {
          allRaw.push(...res.value);
        }
      }
      const formatted: NotificationItem[] = allRaw.map((item: RawNotification) => ({
        id: item.id || `notif-${Date.now()}-${Math.random()}`,
        userId: item.userId || userIds[0],
        type: item.type || "GENERAL",
        title: item.title || item.subjectTemplate || "Thông báo mới",
        message: item.message || item.bodyTemplate || "Có cập nhật mới từ hệ thống.",
        readStatus: Boolean(item.readStatus),
        createdAt: typeof item.createdAt === "string" ? item.createdAt : undefined,
      }));
      const deduped = deduplicateNotificationList(formatted);
      deduped.sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      });
      if (requestReadRevision === readRevision.current) setNotifications(deduped);
      setError(null);
      hasLoadedNotifications.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      hasLoadedNotifications.current = true;
      setLoading(false);
    }
  }, [userIds]);

  useEffect(() => {
    const initTimer = setTimeout(() => {
      void loadNotifications();
    }, 0);

    // thăm dò mỗi 3 giây để đảm bảo cập nhật đầy đủ kể cả khi WebSocket bị chặn
    const pollInterval = setInterval(loadNotifications, 3000);

    // đồng bộ thời gian thực qua WebSocket STOMP
    const url = new URL(CONFIG.API_BASE_URL);
    const protocol = url.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${url.host}/ws-notifications`;
    let socket: WebSocket | null = null;

    try {
      socket = new WebSocket(wsUrl);

      socket.onerror = () => {
        
      };

      socket.onopen = () => {
        socket?.send("CONNECT\naccept-version:1.1,1.0\nheart-beat:10000,10000\n\n\0");
        userIds.forEach((uid, idx) => {
          const topic = uid === "ADMIN" ? "/topic/admin-notifications" : `/topic/user-notifications/${uid}`;
          socket?.send(`SUBSCRIBE\nid:sub-${idx}\ndestination:${topic}\n\n\0`);
        });
      };

      socket.onmessage = (event) => {
        try {
          if (event.data.includes("MESSAGE")) {
            const bodyStart = event.data.indexOf("\n\n");
            if (bodyStart !== -1) {
              const bodyStr = event.data.substring(bodyStart + 2).replace(/\0$/, "");
              const parsed = JSON.parse(bodyStr);
              const newNotif: NotificationItem = {
                id: parsed.id || `notif-${Date.now()}`,
                userId: parsed.userId || userIds[0],
                type: parsed.type || "GENERAL",
                title: parsed.title || "Thông báo mới",
                message: parsed.message || "Có thông báo mới",
                readStatus: false,
                createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : undefined,
              };

              if (!shouldProcessIncomingNotification(newNotif)) {
                return;
              }

              setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
              setLatestToast(newNotif);
              playNotificationChime();
              window.dispatchEvent(new CustomEvent("approval-events-updated", { detail: newNotif }));
              loadNotifications();
            }
          }
        } catch {
          // bỏ qua lỗi phân tích cú pháp
        }
      };
    } catch {
      // bỏ qua lỗi, không làm gián đoạn giao diện
    }

    return () => {
      clearTimeout(initTimer);
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        try {
          if (socket.readyState === WebSocket.OPEN) {
            socket.close();
          }
        } catch {
          // ignore
        }
      }
      clearInterval(pollInterval);
    };
  }, [userIds, loadNotifications]);

  /** Đánh dấu một thông báo là đã đọc qua API rồi cập nhật cục bộ; bỏ qua nếu đã đọc. */
  const markAsRead = async (id: string) => {
    const notification = notifications.find((item) => item.id === id);
    if (!notification || notification.readStatus) return;
    setReadError(null);
    try {
      await notificationApi.markNotificationAsRead(id);
      readRevision.current += 1;
      setNotifications((prev) => prev.map((item) => item.id === id ? { ...item, readStatus: true } : item));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to mark notification as read";
      setReadError(message);
      toast.error("Không thể đánh dấu thông báo đã đọc. Vui lòng thử lại.");
    }
  };

  /** Đánh dấu mọi thông báo chưa đọc là đã đọc cho tất cả người nhận. */
  const markAllAsRead = async () => {
    const unreadIds = new Set(notifications.filter((item) => !item.readStatus).map((item) => item.id));
    if (!unreadIds.size) return;
    setReadError(null);
    try {
      await Promise.allSettled(userIds.map((uid) => notificationApi.markAllNotificationsAsRead(uid)));
      readRevision.current += 1;
      setNotifications((prev) => prev.map((item) => unreadIds.has(item.id) ? { ...item, readStatus: true } : item));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to mark notifications as read";
      setReadError(message);
      toast.error("Không thể đánh dấu tất cả thông báo đã đọc. Vui lòng thử lại.");
    }
  };

  /** Xóa toast thông báo mới nhất. */
  const clearToast = () => setLatestToast(null);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    readError,
    latestToast,
    markAsRead,
    markAllAsRead,
    clearToast,
    reload: loadNotifications,
  };
}
