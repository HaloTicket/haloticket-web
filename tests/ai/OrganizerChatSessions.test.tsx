// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const axiosGet = vi.fn();
const axiosPost = vi.fn();
const axiosPatch = vi.fn();
const axiosDelete = vi.fn();

vi.mock("@/services/axiosClient", () => ({
  default: {
    get: (...args: unknown[]) => axiosGet(...args),
    post: (...args: unknown[]) => axiosPost(...args),
    patch: (...args: unknown[]) => axiosPatch(...args),
    delete: (...args: unknown[]) => axiosDelete(...args),
  },
}));

const getCachedUserProfile = vi.fn();
const getCurrentToken = vi.fn();
const isExpandedSpy = vi.fn();

vi.mock("@/services/userApi", () => ({
  parseJwt: (token: string) => {
    try {
      const parts = token.split(".");
      if (parts.length >= 2) return JSON.parse(atob(parts[1]));
    } catch {
      // ignore
    }
    return null;
  },
  getCachedUserProfile: () => getCachedUserProfile(),
}));

vi.mock("@/services/keycloakSession", () => ({
  getKeycloakSession: () => ({
    getCurrentToken: () => getCurrentToken(),
  }),
}));

vi.mock("@/components/common/OrganizerAIChatWidget/OrganizerAIChatMessage", async () => {
  const actual = await vi.importActual<typeof import("@/components/common/OrganizerAIChatWidget/OrganizerAIChatMessage")>(
    "@/components/common/OrganizerAIChatWidget/OrganizerAIChatMessage"
  );
  return {
    ...actual,
    default: (props: Record<string, unknown>) => {
      isExpandedSpy(props.isExpanded);
      return actual.default(props as unknown as Parameters<typeof actual.default>[0]);
    },
  };
});

import i18n from "@/i18n";
import { aiApi } from "@/services/aiApi";
import { OrganizerAIChatWidget } from "@/components/common/OrganizerAIChatWidget/OrganizerAIChatWidget";

const fakeToken = (sub: string, iss = "https://auth.haloticket.vn") => {
  const header = btoa(JSON.stringify({ alg: "HS256" }));
  const payload = btoa(JSON.stringify({ sub, iss, email: `${sub}@haloticket.vn` }));
  return `${header}.${payload}.sig`;
};

const makeSummary = (overrides: Partial<{
  id: string;
  scope: "managed_events" | "event";
  event_id: string | null;
  title: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}> = {}) => ({
  id: overrides.id ?? "11111111-1111-4111-8111-111111111111",
  scope: overrides.scope ?? "managed_events",
  event_id: overrides.event_id ?? null,
  title: overrides.title ?? "So sánh doanh thu VIP",
  is_pinned: overrides.is_pinned ?? false,
  created_at: overrides.created_at ?? "2026-11-25T08:00:00Z",
  updated_at: overrides.updated_at ?? "2026-11-25T08:15:00Z",
});

beforeEach(async () => {
  sessionStorage.clear();
  localStorage.clear();
  axiosGet.mockReset();
  axiosPost.mockReset();
  axiosPatch.mockReset();
  axiosDelete.mockReset();
  isExpandedSpy.mockReset();
  getCachedUserProfile.mockReset();
  getCurrentToken.mockReset();

  await i18n.changeLanguage("vi");
  getCurrentToken.mockReturnValue(fakeToken("org-user-1"));
  getCachedUserProfile.mockReturnValue({
    id: "org-user-1",
    email: "org1@haloticket.vn",
    roles: ["ORGANIZER"],
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("aiApi - Organizer Conversations & Persistent Agent Chat Contract", () => {
  it("builds exact query params and payloads for GET/POST/PATCH/DELETE /organizer/conversations", async () => {
    const summary = makeSummary();
    axiosGet.mockResolvedValueOnce([summary]);
    const listManaged = await aiApi.listOrganizerConversations({ scope: "managed_events" });
    expect(axiosGet).toHaveBeenLastCalledWith("/organizer/conversations", {
      params: { scope: "managed_events" },
    });
    expect(listManaged).toEqual([summary]);

    const evtSummary = makeSummary({ scope: "event", event_id: "evt-99" });
    axiosGet.mockResolvedValueOnce([evtSummary]);
    await aiApi.listOrganizerConversations({ scope: "event", eventId: "evt-99" });
    expect(axiosGet).toHaveBeenLastCalledWith("/organizer/conversations", {
      params: { scope: "event", event_id: "evt-99" },
    });

    axiosPost.mockResolvedValueOnce(evtSummary);
    const created = await aiApi.createOrganizerConversation({ scope: "event", eventId: "evt-99" });
    expect(axiosPost).toHaveBeenLastCalledWith(
      "/organizer/conversations",
      { scope: "event", event_id: "evt-99" },
      undefined
    );
    expect(created.id).toBe(evtSummary.id);

    const pinned = { ...summary, is_pinned: true };
    axiosPatch.mockResolvedValueOnce(pinned);
    const pinRes = await aiApi.pinOrganizerConversation(summary.id, true);
    expect(axiosPatch).toHaveBeenLastCalledWith(
      `/organizer/conversations/${summary.id}/pin`,
      { is_pinned: true },
      undefined
    );
    expect(pinRes.is_pinned).toBe(true);

    axiosDelete.mockResolvedValueOnce(undefined);
    await aiApi.deleteOrganizerConversation(summary.id);
    expect(axiosDelete).toHaveBeenLastCalledWith(`/organizer/conversations/${summary.id}`, undefined);

    axiosDelete.mockResolvedValueOnce(undefined);
    await aiApi.clearOrganizerConversations({ scope: "managed_events" });
    expect(axiosDelete).toHaveBeenLastCalledWith("/organizer/conversations", {
      params: { scope: "managed_events" },
    });
  });

  it("rejects malformed shapes on organizer conversation endpoints and omits client history when persist:true", async () => {
    axiosGet.mockResolvedValueOnce({ notAnArray: true });
    await expect(aiApi.listOrganizerConversations({ scope: "managed_events" })).rejects.toThrow();

    axiosGet.mockResolvedValueOnce({ ...makeSummary(), messages: "bad" });
    await expect(aiApi.getOrganizerConversation("conv-1")).rejects.toThrow();

    axiosPost.mockResolvedValueOnce({
      conversation_id: "conv-123",
      reply: "OK",
      status: "ok",
    });
    await aiApi.chatWithOrganizerAgent({
      scope: "managed_events",
      message: "Tổng doanh thu",
      history: [{ role: "user", content: "Old client history should not be sent" }],
      persist: true,
      requestId: "550e8400-e29b-41d4-a716-446655440000",
    });

    const [path, body] = axiosPost.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe("/organizer/agent-chat");
    expect(body).toEqual({
      scope: "managed_events",
      message: "Tổng doanh thu",
      locale: "vi",
      persist: true,
      request_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect("history" in body).toBe(false);
    expect("conversation_id" in body).toBe(false);
  });
});

describe("OrganizerSessionDrawer & Widget Integration", () => {
  const renderOpen = (props = {}) => {
    const utils = render(
      <MemoryRouter>
        <OrganizerAIChatWidget scope="managed_events" {...props} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole("button", { name: /Chat với AI/i }));
    return utils;
  };

  it("groups pinned and recent conversations, filters by search, toggles pin, and refreshes", async () => {
    const pinnedConv = makeSummary({
      id: "conv-pinned",
      title: "Chiến lược giá vé VIP",
      is_pinned: true,
      updated_at: "2026-11-25T07:00:00Z",
    });
    const recentConv = makeSummary({
      id: "conv-recent",
      title: "Báo cáo check-in suất tối",
      is_pinned: false,
      updated_at: "2026-11-25T09:00:00Z",
    });

    axiosGet.mockImplementation((url: string) => {
      if (url === "/organizer/conversations") {
        return Promise.resolve([pinnedConv, recentConv]);
      }
      return Promise.resolve({
        ...recentConv,
        messages: [
          {
            id: "m-1",
            role: "assistant",
            content: "Nội dung suất tối",
            status: "ok",
            payload: null,
            created_at: "2026-11-25T09:00:00Z",
          },
        ],
      });
    });

    renderOpen();
    await screen.findByText("Nội dung suất tối");

    // Open slide-over drawer in compact mode
    fireEvent.click(screen.getByTestId("organizer-toggle-drawer-btn"));
    const drawer = screen.getByTestId("organizer-session-drawer");
    expect(within(drawer).getByTestId("organizer-sessions-pinned-group").textContent).toContain("Chiến lược giá vé VIP");
    expect(within(drawer).getByTestId("organizer-sessions-recent-group").textContent).toContain("Báo cáo check-in suất tối");

    // Search filter
    const searchInput = within(drawer).getByRole("searchbox");
    fireEvent.change(searchInput, { target: { value: "VIP" } });
    expect(within(drawer).getByText("Chiến lược giá vé VIP")).toBeTruthy();
    expect(within(drawer).queryByText("Báo cáo check-in suất tối")).toBeNull();

    fireEvent.change(searchInput, { target: { value: "" } });

    // Pin recent conversation -> moves to pinned group
    axiosPatch.mockResolvedValueOnce({ ...recentConv, is_pinned: true, updated_at: "2026-11-25T09:05:00Z" });
    const recentRow = within(drawer).getByTestId("organizer-session-row-conv-recent");
    fireEvent.click(within(recentRow).getByTestId("organizer-session-pin-conv-recent"));

    await waitFor(() => {
      expect(axiosPatch).toHaveBeenCalledWith(
        "/organizer/conversations/conv-recent/pin",
        { is_pinned: true },
        expect.anything()
      );
      expect(within(drawer).getByTestId("organizer-sessions-pinned-group").textContent).toContain("Báo cáo check-in suất tối");
    });

    // Manual refresh button
    fireEvent.click(within(drawer).getByTestId("organizer-sessions-refresh-btn"));
    await waitFor(() => {
      expect(axiosGet.mock.calls.filter((c) => c[0] === "/organizer/conversations").length).toBeGreaterThanOrEqual(2);
    });
  });

  it("guards race conditions when switching conversations rapidly so stale detail never overwrites latest selection", async () => {
    const convA = makeSummary({ id: "conv-A", title: "Hội thoại A", updated_at: "2026-11-25T09:00:00Z" });
    const convB = makeSummary({ id: "conv-B", title: "Hội thoại B", updated_at: "2026-11-25T08:00:00Z" });

    let resolveDetailA: (v: unknown) => void = () => {};
    axiosGet.mockImplementation((url: string) => {
      if (url === "/organizer/conversations") return Promise.resolve([convA, convB]);
      if (url === "/organizer/conversations/conv-A") {
        return new Promise((res) => {
          resolveDetailA = res;
        });
      }
      if (url === "/organizer/conversations/conv-B") {
        return Promise.resolve({
          ...convB,
          messages: [
            { id: "mb1", role: "assistant", content: "Kết quả chuẩn của B", status: "ok", payload: null, created_at: "2026-11-25T08:01:00Z" },
          ],
        });
      }
      return Promise.resolve([]);
    });

    renderOpen();
    await waitFor(() => expect(axiosGet).toHaveBeenCalledWith("/organizer/conversations", expect.anything()));

    fireEvent.click(screen.getByTestId("organizer-toggle-drawer-btn"));
    const drawer = screen.getByTestId("organizer-session-drawer");
    await within(drawer).findByText("Hội thoại B");

    // Select B while A is still pending
    fireEvent.click(within(drawer).getByTestId("organizer-session-select-conv-B"));
    await screen.findByText("Kết quả chuẩn của B");

    // Late resolution of A must be ignored
    act(() => {
      resolveDetailA({
        ...convA,
        messages: [
          { id: "ma1", role: "assistant", content: "Kết quả CŨ của A", status: "ok", payload: null, created_at: "2026-11-25T09:01:00Z" },
        ],
      });
    });

    expect(screen.queryByText("Kết quả CŨ của A")).toBeNull();
    expect(screen.getByText("Kết quả chuẩn của B")).toBeTruthy();
  });

  it("supports inline confirmation for single delete and scoped clear all, never leaving stale history", async () => {
    const conv1 = makeSummary({ id: "conv-del-1", title: "Phiên sắp xóa", updated_at: "2026-11-25T09:00:00Z" });
    const conv2 = makeSummary({ id: "conv-del-2", title: "Phiên còn lại", updated_at: "2026-11-25T08:00:00Z" });

    axiosGet.mockImplementation((url: string) => {
      if (url === "/organizer/conversations") return Promise.resolve([conv1, conv2]);
      return Promise.resolve({
        ...conv1,
        messages: [
          { id: "md1", role: "assistant", content: "Số liệu mật của phiên sắp xóa", status: "ok", payload: null, created_at: "2026-11-25T09:01:00Z" },
        ],
      });
    });
    axiosDelete.mockResolvedValue(undefined);

    renderOpen();
    await screen.findByText("Số liệu mật của phiên sắp xóa");

    fireEvent.click(screen.getByTestId("organizer-toggle-drawer-btn"));
    const drawer = screen.getByTestId("organizer-session-drawer");

    // Trigger single delete inline confirmation
    fireEvent.click(within(drawer).getByTestId("organizer-session-delete-conv-del-1"));
    const confirmDeleteBtn = within(drawer).getByTestId("organizer-session-confirm-delete-conv-del-1");
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(axiosDelete).toHaveBeenCalledWith("/organizer/conversations/conv-del-1", expect.anything());
      expect(screen.queryByText("Số liệu mật của phiên sắp xóa")).toBeNull();
      expect(within(drawer).queryByText("Phiên sắp xóa")).toBeNull();
    });

    // Trigger scoped clear all inline confirmation
    fireEvent.click(within(drawer).getByTestId("organizer-sessions-clear-trigger"));
    const confirmClearBtn = within(drawer).getByTestId("organizer-sessions-clear-confirm");
    fireEvent.click(confirmClearBtn);

    await waitFor(() => {
      expect(axiosDelete).toHaveBeenCalledWith(
        "/organizer/conversations",
        expect.objectContaining({
          params: { scope: "managed_events" },
        })
      );
      expect(within(drawer).queryByText("Phiên còn lại")).toBeNull();
    });
  });

  it("retains selected conversation across close/reopen, disables conflicting writes while sending, and recovers drawer 503 AI_DB_NOT_CONFIGURED", async () => {
    const conv1 = makeSummary({ id: "conv-keep-1", title: "Phiên 1", updated_at: "2026-11-25T09:00:00Z" });
    const conv2 = makeSummary({ id: "conv-keep-2", title: "Phiên 2", updated_at: "2026-11-25T08:00:00Z" });

    // First open fails list with 503 AI_DB_NOT_CONFIGURED -> drawer shows friendly retry
    axiosGet.mockRejectedValueOnce({
      response: { status: 503, data: { detail: { code: "AI_DB_NOT_CONFIGURED" } } },
    });

    renderOpen();
    fireEvent.click(screen.getByTestId("organizer-toggle-drawer-btn"));
    const errorBox = await screen.findByTestId("organizer-sessions-error");
    expect(errorBox.textContent).toMatch(/chưa được cấu hình/i);

    // Retry succeeds and loads sessions
    axiosGet.mockImplementation((url: string) => {
      if (url === "/organizer/conversations") return Promise.resolve([conv1, conv2]);
      if (url === "/organizer/conversations/conv-keep-2") {
        return Promise.resolve({
          ...conv2,
          messages: [
            { id: "mk2", role: "assistant", content: "Nội dung đã chọn Phiên 2", status: "ok", payload: null, created_at: "2026-11-25T08:01:00Z" },
          ],
        });
      }
      return Promise.resolve({
        ...conv1,
        messages: [
          { id: "mk1", role: "assistant", content: "Nội dung Phiên 1", status: "ok", payload: null, created_at: "2026-11-25T09:01:00Z" },
        ],
      });
    });

    fireEvent.click(within(errorBox).getByRole("button", { name: /Thử lại/i }));
    const drawer = screen.getByTestId("organizer-session-drawer");
    await within(drawer).findByText("Phiên 2");

    // Explicitly select conv-keep-2
    fireEvent.click(within(drawer).getByTestId("organizer-session-select-conv-keep-2"));
    await screen.findByText("Nội dung đã chọn Phiên 2");

    // Close and reopen -> retains conv-keep-2
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Chat với AI/i }));
    await screen.findByText("Nội dung đã chọn Phiên 2");

    // While sending a turn, conflicting drawer writes are disabled
    let resolveTurn: (v: unknown) => void = () => {};
    axiosPost.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveTurn = res;
        })
    );
    const input = screen.getByPlaceholderText(/Hỏi về doanh thu/i);
    fireEvent.change(input, { target: { value: "Câu hỏi đang gửi" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));

    await waitFor(() => expect(axiosPost).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId("organizer-toggle-drawer-btn"));
    const busyDrawer = screen.getByTestId("organizer-session-drawer");
    expect((within(busyDrawer).getByTestId("organizer-drawer-new-chat-btn") as HTMLButtonElement).disabled).toBe(true);
    expect((within(busyDrawer).getByTestId("organizer-session-delete-conv-keep-2") as HTMLButtonElement).disabled).toBe(true);
    expect((within(busyDrawer).getByTestId("organizer-sessions-clear-trigger") as HTMLButtonElement).disabled).toBe(true);

    act(() => {
      resolveTurn({
        conversation_id: "conv-keep-2",
        reply: "Đã lưu lượt mới",
        status: "ok",
      });
    });
    await screen.findByText("Đã lưu lượt mới");
  });

  it("uses adaptive overlay drawer on narrow mobile even when expanded so chat input stays usable", async () => {
    const originalInnerWidth = window.innerWidth;
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 375 });
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    try {
      axiosGet.mockResolvedValue([]);
      renderOpen();

      // Expand on narrow mobile (375px)
      fireEvent.click(screen.getByRole("button", { name: /Phóng to/i }));

      // Drawer is NOT permanently eating 280px; toggle button remains visible and opens overlay
      const toggleBtn = screen.getByTestId("organizer-toggle-drawer-btn");
      expect(screen.queryByTestId("organizer-session-drawer")).toBeNull();

      fireEvent.click(toggleBtn);
      const mobileDrawer = screen.getByTestId("organizer-session-drawer");
      expect(mobileDrawer.getAttribute("data-variant")).toBe("overlay");
      expect(screen.getByTestId("organizer-session-drawer-backdrop")).toBeTruthy();

      // First Escape closes only the overlay drawer, keeping the dialog open
      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(screen.queryByTestId("organizer-session-drawer")).toBeNull());
      expect(screen.getByRole("dialog")).toBeTruthy();
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: originalInnerWidth });
      window.matchMedia = originalMatchMedia;
    }
  });

  it("clears previous transcript and stale selection on POST chat 403 or 404 for an active conversation", async () => {
    const activeConv = makeSummary({
      id: "conv-revoked",
      scope: "event",
      event_id: "evt-rev",
      title: "Phiên sắp thu hồi quyền",
    });
    axiosGet.mockImplementation((url: string) => {
      if (url === "/organizer/conversations") return Promise.resolve([activeConv]);
      return Promise.resolve({
        ...activeConv,
        messages: [
          { id: "m-secret", role: "assistant", content: "Doanh thu nhạy cảm cũ", status: "ok", payload: null, created_at: "2026-11-25T08:01:00Z" },
        ],
      });
    });

    const { unmount } = renderOpen({ scope: "event", eventId: "evt-rev" });
    await screen.findByText("Doanh thu nhạy cảm cũ");

    // 1) POST chat returns 403 -> clears old sensitive transcript, removes stale session, no retry button
    axiosPost.mockRejectedValueOnce({
      response: { status: 403, data: { detail: { code: "EVENT_NOT_IN_SCOPE" } } },
    });

    const input = screen.getByPlaceholderText(/Hỏi về doanh thu/i);
    fireEvent.change(input, { target: { value: "Hỏi thêm sau khi mất quyền" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));

    await screen.findByText(/Bạn không có quyền truy cập dữ liệu của sự kiện này/i);
    expect(screen.queryByText("Doanh thu nhạy cảm cũ")).toBeNull();
    expect(screen.queryByText("Hỏi thêm sau khi mất quyền")).toBeNull();
    expect(screen.queryByRole("button", { name: /Thử lại/i })).toBeNull();

    unmount();
    cleanup();
    sessionStorage.clear();

    // 2) POST chat returns 404 -> clears old transcript of deleted conversation, keeps only failed user message for fresh retry
    const deletedConv = makeSummary({ id: "conv-deleted-midchat", title: "Phiên vừa xóa trên tab khác" });
    axiosGet.mockImplementation((url: string) => {
      if (url === "/organizer/conversations") return Promise.resolve([deletedConv]);
      return Promise.resolve({
        ...deletedConv,
        messages: [
          { id: "m-gone", role: "assistant", content: "Tin nhắn của phiên đã xóa", status: "ok", payload: null, created_at: "2026-11-25T08:01:00Z" },
        ],
      });
    });

    renderOpen();
    await screen.findByText("Tin nhắn của phiên đã xóa");

    axiosPost.mockRejectedValueOnce({
      response: { status: 404, data: { detail: { code: "CONVERSATION_NOT_FOUND" } } },
    });

    const input2 = screen.getByPlaceholderText(/Hỏi về doanh thu/i);
    fireEvent.change(input2, { target: { value: "Câu hỏi cần giữ để gửi lại" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));

    await screen.findByText(/không còn tồn tại hoặc đã bị xóa/i);
    expect(screen.queryByText("Tin nhắn của phiên đã xóa")).toBeNull();
    expect(screen.getByText("Câu hỏi cần giữ để gửi lại")).toBeTruthy();

    // Retry creates a fresh conversation without sending dead conversation_id
    axiosPost.mockResolvedValueOnce({
      conversation_id: "conv-brand-new",
      reply: "Đã tạo phiên mới thành công",
      status: "ok",
    });
    fireEvent.click(screen.getByRole("button", { name: /Thử lại/i }));
    await screen.findByText("Đã tạo phiên mới thành công");
    const retryBody = axiosPost.mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect("conversation_id" in retryBody).toBe(false);
    expect(retryBody.persist).toBe(true);
  });

  it("ignores stale list refresh settling after a successful send or pin", async () => {
    let resolveSlowList: (v: unknown) => void = () => {};
    axiosGet.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveSlowList = res;
        })
    );

    renderOpen();

    // User sends a message creating conv-fresh BEFORE the initial slow list GET settles
    axiosPost.mockResolvedValueOnce({
      conversation_id: "conv-fresh",
      reply: "Phản hồi của phiên mới tạo",
      status: "ok",
    });

    const input = screen.getByPlaceholderText(/Hỏi về doanh thu/i);
    fireEvent.change(input, { target: { value: "Tạo phiên mới ngay lập tức" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));

    await screen.findByText("Phản hồi của phiên mới tạo");

    // Now the stale initial list resolves with [] (before conv-fresh existed)
    act(() => {
      resolveSlowList([]);
    });

    // Active transcript and conv-fresh in drawer MUST remain intact!
    expect(screen.getByText("Phản hồi của phiên mới tạo")).toBeTruthy();
    fireEvent.click(screen.getByTestId("organizer-toggle-drawer-btn"));
    expect(within(screen.getByTestId("organizer-session-drawer")).getByText("Tạo phiên mới ngay lập tức")).toBeTruthy();
  });

  it("treats missing conversation_id on persistent 200 response as a protocol error and reuses request_id on retry", async () => {
    axiosGet.mockResolvedValue([]);
    // Malformed 200 response missing conversation_id
    axiosPost.mockResolvedValueOnce({
      reply: "Trả lời nhưng quên lưu",
      status: "ok",
    });

    renderOpen();
    const input = screen.getByPlaceholderText(/Hỏi về doanh thu/i);
    fireEvent.change(input, { target: { value: "Kiểm tra bắt buộc lưu trữ" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));

    // Must NOT render the unsaved reply; must show error + retry
    await screen.findByRole("button", { name: /Thử lại/i });
    expect(screen.queryByText("Trả lời nhưng quên lưu")).toBeNull();

    const firstBody = axiosPost.mock.calls[0][1] as Record<string, unknown>;
    expect(firstBody.persist).toBe(true);
    expect(typeof firstBody.request_id).toBe("string");

    // Retry succeeds with conversation_id and uses the EXACT SAME request_id
    axiosPost.mockResolvedValueOnce({
      conversation_id: "conv-saved-properly",
      reply: "Đã lưu và trả lời chuẩn",
      status: "ok",
    });
    fireEvent.click(screen.getByRole("button", { name: /Thử lại/i }));

    await screen.findByText("Đã lưu và trả lời chuẩn");
    const secondBody = axiosPost.mock.calls[1][1] as Record<string, unknown>;
    expect(secondBody.request_id).toBe(firstBody.request_id);
  });

  it("handles 404/403 on deleted or unauthorized conversation selection by pruning stale item", async () => {
    const staleConv = makeSummary({ id: "conv-404", title: "Phiên đã xóa trên thiết bị khác" });
    axiosGet.mockImplementation((url: string) => {
      if (url === "/organizer/conversations") return Promise.resolve([staleConv]);
      return Promise.reject({ response: { status: 404, data: { detail: { code: "NOT_FOUND" } } } });
    });

    renderOpen();

    await waitFor(() => {
      expect(screen.getByTestId("organizer-starter-topics")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("organizer-toggle-drawer-btn"));
    const drawer = screen.getByTestId("organizer-session-drawer");
    expect(within(drawer).queryByText("Phiên đã xóa trên thiết bị khác")).toBeNull();
  });

  it("guards IME composition on Enter, renders 3-dot typing indicator, passes isExpanded to message, and adapts desktop sidebar vs Escape", async () => {
    axiosGet.mockResolvedValue([]);
    let resolveChat: (v: unknown) => void = () => {};
    axiosPost.mockImplementation(
      () =>
        new Promise((res) => {
          resolveChat = res;
        })
    );

    renderOpen();

    const input = screen.getByPlaceholderText(/Hỏi về doanh thu/i);
    fireEvent.change(input, { target: { value: "Đang gõ tiếng Việt" } });

    // IME composing Enter must NOT send
    fireEvent.keyDown(input, { key: "Enter", isComposing: true, keyCode: 229 });
    expect(axiosPost).not.toHaveBeenCalled();

    // Normal Enter sends and shows 3-dot typing bubble
    fireEvent.keyDown(input, { key: "Enter", isComposing: false });
    await waitFor(() => expect(axiosPost).toHaveBeenCalledTimes(1));

    const typingBubble = screen.getByTestId("organizer-ai-typing-bubble");
    expect(typingBubble.querySelectorAll(".ai-typing-dot").length).toBe(3);
    expect(typingBubble.querySelector("svg")).toBeNull();

    act(() => {
      resolveChat({
        conversation_id: "conv-ime-1",
        reply: "Đã nhận câu hỏi",
        status: "ok",
      });
    });
    await screen.findByText("Đã nhận câu hỏi");
    expect(isExpandedSpy).toHaveBeenLastCalledWith(false);

    // The history toggle is available in the expanded desktop layout.
    fireEvent.click(screen.getByRole("button", { name: /Phóng to/i }));
    const toggle = screen.getByTestId("organizer-toggle-drawer-btn");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    await waitFor(() => {
      expect(isExpandedSpy).toHaveBeenLastCalledWith(true);
      const sidebar = screen.getByTestId("organizer-session-drawer");
      expect(sidebar.getAttribute("data-variant")).toBe("sidebar");
    });

    const resize = screen.getByRole("separator");
    expect(resize.getAttribute("aria-valuenow")).toBe("224");
    fireEvent.keyDown(resize, { key: "ArrowRight" });
    expect(screen.getByTestId("organizer-session-drawer").style.width).toBe("240px");
    fireEvent.keyDown(resize, { key: "End" });
    fireEvent.keyDown(resize, { key: "ArrowRight" });
    expect(resize.getAttribute("aria-valuenow")).toBe("340");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("organizer-session-drawer")).toBeNull();
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(toggle);
    expect(screen.getByRole("separator").getAttribute("aria-valuenow")).toBe("340");
    fireEvent.click(toggle);

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});
