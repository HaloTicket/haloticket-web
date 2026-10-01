import { afterEach, describe, expect, it, vi } from "vitest";

const { get, patch, post } = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), post: vi.fn() }));
vi.mock("@/services/axiosClient", () => ({ default: { get, patch, post } }));

import { notificationApi } from "@/services/notificationApi";

afterEach(() => {
  get.mockReset();
  patch.mockReset();
  post.mockReset();
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
});
