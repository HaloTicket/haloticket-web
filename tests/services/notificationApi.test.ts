import { afterEach, describe, expect, it, vi } from "vitest";

const { get, patch, post, put } = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock("@/services/axiosClient", () => ({ default: { get, patch, post, put } }));

import { notificationApi } from "@/services/notificationApi";

afterEach(() => {
  get.mockReset();
  patch.mockReset();
  post.mockReset();
  put.mockReset();
});

describe("notificationApi", () => {
  it("rejects an invalid notification list response", async () => {
    get.mockResolvedValue({ content: [] });

    await expect(notificationApi.getUserNotifications("user-1")).rejects.toThrow("INVALID_NOTIFICATION_RESPONSE");
  });

  it("propagates read errors to the hook", async () => {
    patch.mockRejectedValue(new Error("read failed"));

    await expect(notificationApi.markNotificationAsRead("notification-1")).rejects.toThrow("read failed");
  });

  it("uses the announcement contract paths, paging, bodies and abort signals", async () => {
    const signal = new AbortController().signal;
    get.mockResolvedValue({ items: [], total: 0 });
    patch.mockResolvedValue({});
    post.mockResolvedValue({ recipientCount: 12 });
    put.mockResolvedValue({});

    await notificationApi.listEventAnnouncements("event/1", 0, 20, signal);
    expect(get).toHaveBeenLastCalledWith("/notifications/events/event%2F1/announcements", { params: { page: 0, size: 20 }, signal });
    await notificationApi.estimateAnnouncementRecipients("e-1", { group: "STAFF", scope: "ROLE", role: "CHECKIN_STAFF" }, signal);
    expect(post).toHaveBeenLastCalledWith("/notifications/events/e-1/announcements/recipient-count", { target: { group: "STAFF", scope: "ROLE", role: "CHECKIN_STAFF" } }, { signal });
    await notificationApi.listModeration(2, 20, "  expo ", signal);
    expect(get).toHaveBeenLastCalledWith("/notifications/admin/moderation", { params: { page: 2, size: 20, q: "expo" }, signal });
    await notificationApi.createEventAnnouncement("e-1", { requestId: "r", title: "T", message: "M", category: "REMINDER", target: { group: "CUSTOMER", scope: "ALL" }, expectedRecipientCount: 12 }, signal);
    expect(post).toHaveBeenLastCalledWith("/notifications/events/e-1/announcements", { requestId: "r", title: "T", message: "M", category: "REMINDER", target: { group: "CUSTOMER", scope: "ALL" }, expectedRecipientCount: 12 }, { signal });
    await notificationApi.resubmitEventAnnouncement("e-1", "a-1", { revision: 2, title: "T", message: "M", category: "PROMOTION", target: { group: "CUSTOMER", scope: "TICKET_TYPE", ticketTypeId: "tt-1" }, expectedRecipientCount: 5 }, signal);
    expect(put).toHaveBeenLastCalledWith("/notifications/events/e-1/announcements/a-1", { revision: 2, title: "T", message: "M", category: "PROMOTION", target: { group: "CUSTOMER", scope: "TICKET_TYPE", ticketTypeId: "tt-1" }, expectedRecipientCount: 5 }, { signal });
    await notificationApi.moderateAnnouncement("a-1", { revision: 2, action: "REJECT", reason: "Spam" }, signal);
    expect(patch).toHaveBeenLastCalledWith("/notifications/admin/moderation/a-1", { revision: 2, action: "REJECT", reason: "Spam" }, { signal });
  });

  it("passes channel query param to user inbox and mark-all when provided", async () => {
    get.mockResolvedValue([]);
    patch.mockResolvedValue([]);

    await notificationApi.getUserNotifications("user-1", "ALL");
    expect(get).toHaveBeenLastCalledWith("/notifications/users/user-1", { params: { channel: "ALL" } });
    await notificationApi.markAllNotificationsAsRead("user-1", "ALL");
    expect(patch).toHaveBeenLastCalledWith("/notifications/users/user-1/read-all", undefined, { params: { channel: "ALL" } });
  });

  it("rejects a malformed recipient-count response", async () => {
    post.mockResolvedValue({ recipientCount: -1 });
    await expect(notificationApi.estimateAnnouncementRecipients("e-1", { group: "CUSTOMER", scope: "ALL" })).rejects.toThrow("INVALID_RECIPIENT_COUNT_RESPONSE");
  });

  it("rejects a malformed announcement page", async () => {
    get.mockResolvedValue([]);
    await expect(notificationApi.listModeration()).rejects.toThrow("INVALID_ANNOUNCEMENT_RESPONSE");
  });
});