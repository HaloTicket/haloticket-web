import { useState, useEffect, useCallback } from "react";
import { notificationApi } from "@/services/notificationApi";
import type { NotificationItem } from "@/types";

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

// synthesize a pleasant bell chime using Web Audio API
export async function playNotificationChime() {
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

export function useNotificationSocket(userId: string = "ADMIN") {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [latestToast, setLatestToast] = useState<NotificationItem | null>(null);

  // auto-dismiss toast banner after 5 seconds
  useEffect(() => {
    if (latestToast) {
      const timer = setTimeout(() => {
        setLatestToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [latestToast]);

  // load initial notifications from DB

  const loadNotifications = useCallback(async () => {
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
          createdAt: item.createdAt || new Date().toISOString(),
        }));
        setNotifications(formatted);
        setUnreadCount(formatted.filter((n) => !n.readStatus).length);
      }
    } catch (err) {
      console.warn("Error fetching initial notifications", err);
    }
  }, [userId]);

  useEffect(() => {
    const initTimer = setTimeout(() => {
      void loadNotifications();
    }, 0);

    // 3s interval polling sync to ensure 100% notification updates even if WS is blocked
    const pollInterval = setInterval(loadNotifications, 3000);

    // webSocket STOMP Realtime sync
    const wsUrl = `ws://${window.location.hostname}:8086/ws-notifications`;
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
                createdAt: parsed.createdAt || new Date().toISOString(),
              };

              setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
              setUnreadCount((prev) => prev + 1);
              setLatestToast(newNotif);

              // play realtime chime sound effect
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
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      }
      clearInterval(pollInterval);
    };
  }, [userId, loadNotifications]);

  const markAsRead = async (id: string) => {
    // optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readStatus: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await notificationApi.markNotificationAsRead(id);
  };

  const markAllAsRead = async () => {
    // optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, readStatus: true })));
    setUnreadCount(0);
    await notificationApi.markAllNotificationsAsRead(userId);
  };

  const clearToast = () => setLatestToast(null);

  return {
    notifications,
    unreadCount,
    latestToast,
    markAsRead,
    markAllAsRead,
    clearToast,
    reload: loadNotifications,
  };
}
