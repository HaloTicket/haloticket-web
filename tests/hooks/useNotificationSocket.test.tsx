// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, toastError } = vi.hoisted(() => ({
  getUserNotifications: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/services/notificationApi", () => ({
  notificationApi: { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead },
}));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

import { useNotificationSocket } from "@/hooks/useNotificationSocket";

class MockWebSocket {
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => { this.readyState = MockWebSocket.CLOSED; });

  constructor() {
    MockWebSocket.instances.push(this);
  }
}

async function loadInitialRequest() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("WebSocket", MockWebSocket);
  MockWebSocket.instances = [];
  getUserNotifications.mockReset();
  markNotificationAsRead.mockReset();
  markAllNotificationsAsRead.mockReset();
  toastError.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useNotificationSocket notification data", () => {
  it("exposes a fetch failure instead of treating it as an empty list", async () => {
    getUserNotifications.mockRejectedValue(new Error("notifications unavailable"));
    const { result } = renderHook(() => useNotificationSocket("user-1"));

    await loadInitialRequest();

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("notifications unavailable");
  });

  it("does not send a read request for an already-read notification", async () => {
    getUserNotifications.mockResolvedValue([{ id: "read-1", readStatus: true }]);
    const { result } = renderHook(() => useNotificationSocket("user-1"));
    await loadInitialRequest();

    await act(async () => result.current.markAsRead("read-1"));

    expect(markNotificationAsRead).not.toHaveBeenCalled();
    expect(result.current.unreadCount).toBe(0);
  });

  it("keeps an unread notification unread when the read request fails", async () => {
    getUserNotifications.mockResolvedValue([{ id: "unread-1", readStatus: false }]);
    markNotificationAsRead.mockRejectedValue(new Error("read failed"));
    const { result } = renderHook(() => useNotificationSocket("user-1"));
    await loadInitialRequest();

    await act(async () => result.current.markAsRead("unread-1"));

    expect(result.current.notifications[0].readStatus).toBe(false);
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.readError).toBe("read failed");
    expect(toastError).toHaveBeenCalledOnce();
  });

  it("preserves distinct notification IDs with identical content", async () => {
    getUserNotifications.mockResolvedValue([
      { id: "event-1", title: "Same title", message: "Same message" },
      { id: "event-2", title: "Same title", message: "Same message" },
    ]);
    const { result } = renderHook(() => useNotificationSocket("user-1"));

    await loadInitialRequest();

    expect(result.current.notifications.map(({ id }) => id)).toEqual(["event-1", "event-2"]);
  });

  it("does not let an older polling response undo a confirmed read", async () => {
    getUserNotifications.mockResolvedValueOnce([{ id: "unread-2", readStatus: false }]);
    let resolveStaleFetch!: (items: Record<string, unknown>[]) => void;
    const staleFetch = new Promise<Record<string, unknown>[]>((resolve) => { resolveStaleFetch = resolve; });
    markNotificationAsRead.mockResolvedValue(undefined);
    const { result } = renderHook(() => useNotificationSocket("user-1"));
    await loadInitialRequest();
    getUserNotifications.mockReturnValueOnce(staleFetch);

    let reload!: Promise<void>;
    await act(async () => {
      reload = result.current.reload();
      await result.current.markAsRead("unread-2");
    });
    await act(async () => {
      resolveStaleFetch([{ id: "unread-2", readStatus: false }]);
      await reload;
    });

    expect(result.current.notifications[0].readStatus).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it("marks only the unread items present when mark-all starts", async () => {
    getUserNotifications.mockResolvedValueOnce([{ id: "old-notif", readStatus: false }]);
    let finishMarkAll!: () => void;
    markAllNotificationsAsRead.mockReturnValueOnce(new Promise<void>((resolve) => { finishMarkAll = resolve; }));
    const { result } = renderHook(() => useNotificationSocket("user-1"));
    await loadInitialRequest();
    getUserNotifications.mockResolvedValueOnce([
      { id: "old-notif", readStatus: false },
      { id: "new-notif", readStatus: false },
    ]);

    let markAll!: Promise<void>;
    await act(async () => {
      markAll = result.current.markAllAsRead();
      const event = new MessageEvent("message", {
        data: `MESSAGE\n\n${JSON.stringify({ id: "new-notif", title: "New", message: "New message" })}\0`,
      });
      MockWebSocket.instances[0].onmessage?.(event);
      await Promise.resolve();
    });
    expect(result.current.notifications.map(({ id }) => id)).toEqual(["old-notif", "new-notif"]);

    await act(async () => {
      finishMarkAll();
      await markAll;
    });

    expect(result.current.notifications.find(({ id }) => id === "old-notif")?.readStatus).toBe(true);
    expect(result.current.notifications.find(({ id }) => id === "new-notif")?.readStatus).toBe(false);
    expect(result.current.unreadCount).toBe(1);
  });
});
