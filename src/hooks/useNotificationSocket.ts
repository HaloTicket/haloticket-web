import { useState, useEffect, useCallback, useRef } from "react";
import { notificationApi } from "@/services/notificationApi";
import type { NotificationItem } from "@/types";
import { toast } from "sonner";
import { CONFIG } from "@/config";

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

// synthesize a pleasant bell chime using Web Audio API
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

    // tone 1: 587.33Hz (D5)
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

    // tone 2: 880Hz (A5) played 120ms later
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

function extractNotificationKey(notif: { userId?: string; type?: string; title?: string; message?: string }): string {
  const quoted = notif.message?.match(/"([^"]+)"/)?.[1] || "";
  const normalizedTitle = (notif.title || "").trim();
  const normalizedMsg = (quoted || notif.message || "").trim();
  return `${notif.userId || ""}:${notif.type || ""}:${normalizedTitle}:${normalizedMsg}`;
}

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

export function useNotificationSocket(userId: string = "ADMIN") {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [latestToast, setLatestToast] = useState<NotificationItem | null>(null);
  const hasLoadedNotifications = useRef(false);
  const readRevision = useRef(0);
  const unreadCount = notifications.filter((notification) => !notification.readStatus).length;

  // load initial notifications from DB

  const loadNotifications = useCallback(async () => {
    if (!hasLoadedNotifications.current) setLoading(true);
    const requestReadRevision = readRevision.current;
    try {
      const data = await notificationApi.getUserNotifications(userId);
      if (Array.isArray(data)) {
        const formatted: NotificationItem[] = data.map((item: RawNotification) => ({
          id: item.id || `notif-${Date.now()}-${Math.random()}`,
          userId: item.userId || userId,
          type: item.type || "GENERAL",
          title: item.title || item.subjectTemplate || "Thông báo mới",
          message: item.message || item.bodyTemplate || "Có cập nhật mới từ hệ thống.",
          readStatus: Boolean(item.readStatus),
          createdAt: typeof item.createdAt === "string" ? item.createdAt : undefined,
        }));
        const deduped = deduplicateNotificationList(formatted);
        if (requestReadRevision === readRevision.current) setNotifications(deduped);
        setError(null);
        hasLoadedNotifications.current = true;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      hasLoadedNotifications.current = true;
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const initTimer = setTimeout(() => {
      void loadNotifications();
    }, 0);

    // 3s interval polling sync to ensure 100% notification updates even if WS is blocked
    const pollInterval = setInterval(loadNotifications, 3000);

    // webSocket STOMP Realtime sync
    const url = new URL(CONFIG.API_BASE_URL);
    const protocol = url.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${url.host}/ws-notifications`;
    let socket: WebSocket | null = null;

    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        socket?.send("CONNECT\naccept-version:1.1,1.0\nheart-beat:10000,10000\n\n\0");
        const topic = userId === "ADMIN" ? "/topic/admin-notifications" : `/topic/user-notifications/${userId}`;
        socket?.send(`SUBSCRIBE\nid:sub-0\ndestination:${topic}\n\n\0`);
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
                userId: parsed.userId || userId,
                type: parsed.type || "GENERAL",
                title: parsed.title || "Thông báo mới",
                message: parsed.message || "Có thông báo mới",
                readStatus: false,
                createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : undefined,
              };

              // Ignore spam / duplicate notifications arriving within window
              if (!shouldProcessIncomingNotification(newNotif)) {
                return;
              }

              setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
              setLatestToast(newNotif);

              // play realtime chime sound effect (throttled)
              playNotificationChime();

              // broadcast global event so UI components auto-refresh
              window.dispatchEvent(new CustomEvent("approval-events-updated", { detail: newNotif }));
              loadNotifications();
            }
          }
        } catch {
          // ignore parse errors
        }
      };
    } catch {
      // silent catch
    }

    return () => {
      clearTimeout(initTimer);
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        try {
          if (socket.readyState !== WebSocket.CLOSED) {
            socket.close();
          }
        } catch {
          // ignore
        }
      }
      clearInterval(pollInterval);
    };
  }, [userId, loadNotifications]);

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

  const markAllAsRead = async () => {
    const unreadIds = new Set(notifications.filter((item) => !item.readStatus).map((item) => item.id));
    if (!unreadIds.size) return;
    setReadError(null);
    try {
      await notificationApi.markAllNotificationsAsRead(userId);
      readRevision.current += 1;
      setNotifications((prev) => prev.map((item) => unreadIds.has(item.id) ? { ...item, readStatus: true } : item));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to mark notifications as read";
      setReadError(message);
      toast.error("Không thể đánh dấu tất cả thông báo đã đọc. Vui lòng thử lại.");
    }
  };

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
