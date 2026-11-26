// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, getAccessToken, toastError } = vi.hoisted(() => ({
  getUserNotifications: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  deleteNotification: vi.fn(),
  getAccessToken: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/services/notificationApi", () => ({
  notificationApi: { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification },
}));
vi.mock("@/services/keycloakSession", () => ({ getKeycloakSession: () => ({ getAccessToken }) }));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

import { useNotificationSocket } from "@/hooks/useNotificationSocket";

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];
  readyState = MockWebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: (() => void) | null = null;
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
  deleteNotification.mockReset();
  getAccessToken.mockReset();
  toastError.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useNotificationSocket notification data", () => {
  it("excludes deleted personal notifications from stale loads and late pushes, and protects shared admin items", async () => {
    const personal = { id: "personal", userId: "user-1", priority: "URGENT" };
    const shared = { id: "shared", userId: "ADMIN" };
    getUserNotifications.mockImplementation(async (id: string) => id === "ADMIN" ? [shared] : [personal]);
    deleteNotification.mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() => useNotificationSocket(["ADMIN", "user-1"]));
    await loadInitialRequest();
    expect(result.current.notifications.find((item) => item.id === "personal")?.priority).toBe("URGENT");

    await act(async () => {
      await result.current.removeNotification("shared");
      await result.current.removeNotification("personal");
      MockWebSocket.instances[0].onmessage?.(new MessageEvent("message", { data: `MESSAGE\n\n${JSON.stringify(personal)}\0` }));
      await result.current.reload();
    });

    expect(deleteNotification).toHaveBeenCalledExactlyOnceWith("personal");
    expect(result.current.notifications.map(({ id }) => id)).toEqual(["shared"]);
    expect(result.current.latestToast).toBeNull();
    expect(result.current.unreadCount).toBe(1);
    unmount();

    const remounted = renderHook(() => useNotificationSocket(["ADMIN", "user-1"]));
    await loadInitialRequest();
    expect(remounted.result.current.notifications.map(({ id }) => id)).toEqual(["shared"]);
  });

  it("keeps unsuccessful aliases unread and reports a partial read-all failure", async () => {
    getUserNotifications.mockImplementation(async (id: string) => [{ id }]);
    markAllNotificationsAsRead.mockResolvedValueOnce([{ id: "ADMIN", readStatus: true }]).mockRejectedValueOnce(new Error("alias failed"));
    const { result } = renderHook(() => useNotificationSocket(["ADMIN", "user-2"]));
    await loadInitialRequest();

    await act(async () => result.current.markAllAsRead());

    expect(result.current.notifications.map(({ id, readStatus }) => [id, readStatus])).toEqual([["ADMIN", true], ["user-2", false]]);
    expect(result.current.readError).toBe("alias failed");
  });

  it("uses one server cutoff for all personal aliases", async () => {
    getUserNotifications.mockImplementation(async (id: string) => [{ id }]);
    markAllNotificationsAsRead.mockResolvedValue([{ id: "subject", readStatus: true }, { id: "account-id", readStatus: true }]);
    const { result } = renderHook(() => useNotificationSocket(["subject", "account-id"]));
    await loadInitialRequest();

    await act(async () => result.current.markAllAsRead());

    expect(markAllNotificationsAsRead).toHaveBeenCalledExactlyOnceWith("subject");
    expect(result.current.unreadCount).toBe(0);
  });

  it("authenticates each CONNECT with the current token and subscribes after CONNECTED", async () => {
    getUserNotifications.mockResolvedValue([]);
    getAccessToken.mockResolvedValueOnce("initial-token").mockResolvedValueOnce("renewed-token");
    renderHook(() => useNotificationSocket(["ADMIN", "user-1"]));
    await loadInitialRequest();
    const first = MockWebSocket.instances[0];

    await act(async () => first.onopen?.(new Event("open")));
    expect(first.send).toHaveBeenCalledOnce();
    expect(first.send.mock.calls[0][0]).toContain("Authorization:Bearer initial-token");
    await act(async () => first.onmessage?.(new MessageEvent("message", { data: "CONNECTED\n\n\0" })));
    expect(first.send.mock.calls[1][0]).toContain("/topic/admin-notifications");
    expect(first.send.mock.calls[2][0]).toContain("/topic/user-notifications/user-1");

    await act(async () => {
      first.onclose?.();
      await vi.advanceTimersByTimeAsync(3000);
    });
    const second = MockWebSocket.instances[1];
    await act(async () => second.onopen?.(new Event("open")));
    expect(second.send.mock.calls[0][0]).toContain("Authorization:Bearer renewed-token");
  });
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
    let finishMarkAll!: (items: { id: string; readStatus: boolean }[]) => void;
    markAllNotificationsAsRead.mockReturnValueOnce(new Promise<{ id: string; readStatus: boolean }[]>((resolve) => { finishMarkAll = resolve; }));
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
      finishMarkAll([{ id: "old-notif", readStatus: true }, { id: "new-notif", readStatus: false }]);
      await markAll;
    });

    expect(result.current.notifications.find(({ id }) => id === "old-notif")?.readStatus).toBe(true);
    expect(result.current.notifications.find(({ id }) => id === "new-notif")?.readStatus).toBe(false);
    expect(result.current.unreadCount).toBe(1);
  });
});

describe("useNotificationSocket source normalization", () => {
  it("normalizes organizer metadata from REST and STOMP and defaults everything else to HaloTicket", async () => {
    const organizer = { id: "org-1", userId: "user-1", type: "ORGANIZER_ANNOUNCEMENT", source: "ORGANIZER", eventTitle: "Game Expo", category: "PROMOTION", title: "Ưu đãi", message: "Giảm giá", variablesJson: JSON.stringify({ eventId: "e-1", eventTitle: "Spoofed" }) };
    const approval = { id: "sys-1", userId: "user-1", type: "EVENT_APPROVED", eventTitle: "Spoofed", category: "PROMOTION", title: "Đã duyệt", message: "Sự kiện đã được duyệt", variablesJson: JSON.stringify({ eventTitle: "Spoofed" }) };
    getUserNotifications.mockResolvedValue([organizer, approval]);
    const { result } = renderHook(() => useNotificationSocket("user-1"));
    await loadInitialRequest();

    const byId = (id: string) => result.current.notifications.find((item) => item.id === id);
    expect(byId("org-1")).toMatchObject({ source: "ORGANIZER", eventTitle: "Game Expo", category: "PROMOTION" });
    expect(byId("sys-1")).toMatchObject({ source: "HALOTICKET", eventTitle: undefined, category: undefined });

    const pushed = { id: "org-2", userId: "user-1", type: "ORGANIZER_ANNOUNCEMENT", eventTitle: "Concert", category: "REMINDER", title: "Nhắc nhở", message: "Check-in sớm" };
    getUserNotifications.mockImplementation(() => new Promise(() => {}));
    await act(async () => {
      MockWebSocket.instances[0].onmessage?.(new MessageEvent("message", { data: `MESSAGE\nsubscription:sub-0\n\n${JSON.stringify(pushed)}\0` }));
    });
    expect(byId("org-2")).toMatchObject({ source: "ORGANIZER", eventTitle: "Concert", category: "REMINDER" });
  });

  it("uses channel ALL on portal: passes channel to REST and mark-all, subscribes to both user and staff topics, and tags staff pushes", async () => {
    const internalRest = { id: "staff-1", userId: "user-1", type: "ORGANIZER_ANNOUNCEMENT", source: "ORGANIZER", eventId: "e-9", eventTitle: "GenZania", category: "INTERNAL", visibility: "STAFF", title: "Họp staff", message: "Tập trung cổng A" };
    getUserNotifications.mockResolvedValue([internalRest]);
    markAllNotificationsAsRead.mockResolvedValue([{ id: "staff-1", readStatus: true }]);
    getAccessToken.mockResolvedValue("portal-token");
    const { result } = renderHook(() => useNotificationSocket("user-1", { channel: "ALL" }));
    await loadInitialRequest();

    expect(getUserNotifications).toHaveBeenCalledWith("user-1", "ALL");
    expect(result.current.notifications[0]).toMatchObject({
      source: "ORGANIZER",
      eventId: "e-9",
      eventTitle: "GenZania",
      category: "INTERNAL",
      visibility: "STAFF",
    });

    const socket = MockWebSocket.instances[0];
    await act(async () => socket.onopen?.(new Event("open")));
    await act(async () => socket.onmessage?.(new MessageEvent("message", { data: "CONNECTED\n\n\0" })));
    expect(socket.send.mock.calls[1][0]).toContain("/topic/user-notifications/user-1");
    expect(socket.send.mock.calls[2][0]).toContain("/topic/staff-notifications/user-1");

    getUserNotifications.mockImplementation(() => new Promise(() => {}));
    const staffPush = { id: "staff-2", userId: "user-1", type: "ORGANIZER_ANNOUNCEMENT", source: "ORGANIZER", eventTitle: "GenZania", category: "EVENT_UPDATE", title: "Đổi cổng", message: "Chuyển sang cổng B" };
    await act(async () => {
      socket.onmessage?.(new MessageEvent("message", { data: `MESSAGE\nsubscription:sub-1\n\n${JSON.stringify(staffPush)}\0` }));
    });
    expect(result.current.notifications.find((item) => item.id === "staff-2")).toMatchObject({
      source: "ORGANIZER",
      eventTitle: "GenZania",
      category: "EVENT_UPDATE",
      visibility: "STAFF",
    });

    await act(async () => result.current.markAllAsRead());
    expect(markAllNotificationsAsRead).toHaveBeenCalledWith("user-1", "ALL");
  });
});