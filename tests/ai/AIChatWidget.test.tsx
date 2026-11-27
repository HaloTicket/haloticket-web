// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CustomerChatHistory } from "@/types/ai";

const chatWithSmartBooking = vi.fn();
const getCustomerChat = vi.fn();
const importCustomerChat = vi.fn();
const resetCustomerChat = vi.fn();
const getCurrentToken = vi.fn();
const hasKeycloakSession = vi.fn();
const getAccessToken = vi.fn();

vi.mock("@/services/aiApi", () => ({ aiApi: {
  chatWithSmartBooking: (...args: unknown[]) => chatWithSmartBooking(...args),
  getCustomerChat: (...args: unknown[]) => getCustomerChat(...args),
  importCustomerChat: (...args: unknown[]) => importCustomerChat(...args),
  resetCustomerChat: (...args: unknown[]) => resetCustomerChat(...args),
} }));
vi.mock("@/services/userApi", () => ({
  getCachedUserProfile: () => ({ id: "profile-a", keycloakId: "buyer-a" }),
  parseJwt: (token: string) => ({ sub: token, iss: "https://example.test/realm" }),
}));
vi.mock("@/services/keycloakSession", () => ({ getKeycloakSession: () => ({ getCurrentToken, hasKeycloakSession, getAccessToken, isAuthenticated: () => false }) }));
vi.mock("@/components/common/AIChatWidget/AIChatMessage", () => ({
  default: ({ message }: { message: { text: string; sender: string } }) => <div data-testid={`msg-${message.sender}`}>{message.text}</div>,
}));

import "@/i18n";
import AIChatWidget from "@/components/common/AIChatWidget/AIChatWidget";

const key = (account: string) => `ai_chat_history:v2:${account}`;
const apiError = (status: number, code: string, headers: Record<string, string> = {}) => ({
  response: { status, data: { code, message: "raw server text" }, headers },
});
const history = (...texts: string[]): CustomerChatHistory => ({
  generation: 0,
  older_cursor: null,
  messages: texts.map((content, index) => ({
    id: `db-${index}`,
    role: index % 2 ? "assistant" : "user",
    content,
    created_at: new Date().toISOString(),
  })),
});

async function openAndSend(text: string) {
  if (!screen.queryByRole("dialog")) fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
  const input = screen.getByLabelText("Nhập tin nhắn cho trợ lý AI") as HTMLTextAreaElement;
  await waitFor(() => expect(input.disabled).toBe(false));
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));
}

beforeEach(() => {
  localStorage.clear();
  chatWithSmartBooking.mockReset();
  getCustomerChat.mockReset().mockResolvedValue(history());
  importCustomerChat.mockReset();
  resetCustomerChat.mockReset().mockResolvedValue(history());
  getCurrentToken.mockReset().mockReturnValue(null);
  hasKeycloakSession.mockReset().mockReturnValue(false);
  getAccessToken.mockReset();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("AIChatWidget error handling", () => {
  it("keeps a failed send in memory and reuses the same request ID on retry", async () => {
    chatWithSmartBooking.mockRejectedValueOnce(apiError(503, "AI_UNAVAILABLE"));
    render(<AIChatWidget />);
    await openAndSend("Tìm vé hot");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Dịch vụ AI tạm thời không khả dụng");
    expect(alert.textContent).not.toContain("raw server text");
    expect(localStorage.getItem(key("anon"))).toBeNull();

    chatWithSmartBooking.mockResolvedValueOnce(history("Tìm vé hot", "Đây là kết quả"));
    fireEvent.click(screen.getByRole("button", { name: "Gửi lại" }));
    await screen.findByText("Đây là kết quả");
    expect(chatWithSmartBooking).toHaveBeenCalledTimes(2);
    expect(chatWithSmartBooking.mock.calls[1][0]).toMatchObject({
      message: "Tìm vé hot",
      requestId: chatWithSmartBooking.mock.calls[0][0].requestId,
    });
    expect(chatWithSmartBooking.mock.calls[1][0]).not.toHaveProperty("history");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getAllByTestId("msg-user")).toHaveLength(1);
  });

  it("tells a rate limit apart from an outage and waits before allowing a resend", async () => {
    chatWithSmartBooking.mockRejectedValueOnce(apiError(429, "AI_RATE_LIMITED", { "retry-after": "30" }));
    render(<AIChatWidget />);
    await openAndSend("Xin chào");
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("30 giây");
    const resend = screen.getByRole("button", { name: /Gửi lại/ }) as HTMLButtonElement;
    expect(resend.disabled).toBe(true);
    expect(resend.textContent).toContain("30s");
  });

  it("does not offer a resend for non-retryable errors", async () => {
    chatWithSmartBooking.mockRejectedValueOnce(apiError(422, "AI_INPUT_INVALID"));
    render(<AIChatWidget />);
    await openAndSend("x");
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "Gửi lại" })).toBeNull();
  });
});

describe("AIChatWidget window", () => {
  it("keeps a single labelled dialog when expanding and closes using Escape", async () => {
    render(<AIChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
    expect(screen.getByRole("dialog", { name: "Trợ lý AI HaloTicket" })).toBeTruthy();
    expect(screen.getByRole("log").getAttribute("aria-live")).toBe("polite");
    expect(screen.getByRole("button", { name: "Làm mới cuộc trò chuyện" })).toBeTruthy();
    expect(screen.getByLabelText("Nhập tin nhắn cho trợ lý AI").tagName).toBe("TEXTAREA");
    await screen.findByRole("button", { name: "Sự kiện hot nhất" });
    const dialog = screen.getByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Phóng to" }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(dialog.dataset.expanded).toBe("true");
    expect(screen.getByRole("button", { name: "Thu nhỏ" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(dialog.dataset.state).toBe("closing");
    expect(document.body.contains(dialog)).toBe(true);
    expect(dialog.hasAttribute("inert")).toBe(true);
    fireEvent.animationEnd(dialog);
    expect(document.body.contains(dialog)).toBe(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("AIChatWidget history storage", () => {
  it("loads saved messages from MongoDB without caching transcripts locally", async () => {
    getCustomerChat.mockResolvedValue(history("Tin nhắn đã đồng bộ"));
    render(<AIChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
    await screen.findByText("Tin nhắn đã đồng bộ");
    expect(localStorage.getItem(key("anon"))).toBeNull();
    expect(getCustomerChat.mock.calls[0][0]).toEqual({ guest: expect.stringMatching(/^[0-9a-f]{64}$/) });
  });

  it("isolates transcripts when the signed-in account changes or logs out", async () => {
    getCurrentToken.mockReturnValue("buyer-a");
    getCustomerChat.mockResolvedValueOnce(history("Câu hỏi của A")).mockResolvedValueOnce(history("Câu hỏi của B"));
    render(<AIChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
    await screen.findByText("Câu hỏi của A");

    getCurrentToken.mockReturnValue("buyer-b");
    act(() => { window.dispatchEvent(new Event("auth-changed")); });
    expect(screen.queryByText("Câu hỏi của A")).toBeNull();
    await screen.findByText("Câu hỏi của B");
    expect(getCustomerChat.mock.calls[1][0]).toEqual({ subject: "buyer-b" });

    getCurrentToken.mockReturnValue(null);
    act(() => { window.dispatchEvent(new Event("storage")); });
    expect(screen.queryByText("Câu hỏi của B")).toBeNull();
    await screen.findByRole("button", { name: "Sự kiện hot nhất" });
    expect(getCustomerChat.mock.calls[2][0]).toHaveProperty("guest");
  });

  it("loads the account conversation when the access token needs a refresh", async () => {
    hasKeycloakSession.mockReturnValue(true);
    getAccessToken.mockResolvedValue("buyer-a");
    getCustomerChat.mockResolvedValue(history("Tin nhắn tài khoản"));
    render(<AIChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
    await screen.findByText("Tin nhắn tài khoản");
    expect(getCustomerChat).toHaveBeenCalledTimes(1);
    expect(getCustomerChat.mock.calls[0][0]).toEqual({ subject: "buyer-a" });
  });

  it("refreshes the same conversation on reopen", async () => {
    getCustomerChat.mockResolvedValueOnce(history("Trước khi đổi tab"))
      .mockResolvedValueOnce(history("Đã gửi từ tab khác"));
    render(<AIChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
    await screen.findByText("Trước khi đổi tab");
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
    await screen.findByText("Đã gửi từ tab khác");
    expect(screen.queryByText("Trước khi đổi tab")).toBeNull();
    expect(getCustomerChat.mock.calls[1][0]).toEqual(getCustomerChat.mock.calls[0][0]);
  });

  it("imports only history scoped to the verified account, then removes its local copy", async () => {
    getCurrentToken.mockReturnValue("buyer-a");
    const created_at = new Date().toISOString();
    localStorage.setItem("ai_chat_history", JSON.stringify([{ id: "x", sender: "user", text: "Tin không rõ chủ" }]));
    localStorage.setItem(key("profile-a"), JSON.stringify([
      { id: "1", sender: "ai", text: "greeting", timestamp: created_at },
      { id: "2", sender: "user", text: "Câu đã lưu", timestamp: created_at },
    ]));
    importCustomerChat.mockResolvedValue({ ...history("Câu đã lưu"), imported: true });
    render(<AIChatWidget />);
    expect(localStorage.getItem("ai_chat_history")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
    await screen.findByText("Câu đã lưu");
    expect(importCustomerChat.mock.calls[0][0]).toEqual({ subject: "buyer-a" });
    expect(importCustomerChat.mock.calls[0][1]).toEqual([{ role: "user", content: "Câu đã lưu", created_at }]);
    expect(localStorage.getItem(key("profile-a"))).toBeNull();
  });

  it("keeps the legacy transcript if MongoDB already has a different history", async () => {
    const created_at = new Date().toISOString();
    const saved = JSON.stringify([{ id: "2", sender: "user", text: "Câu chưa nhập", timestamp: created_at }]);
    localStorage.setItem(key("anon"), saved);
    importCustomerChat.mockResolvedValue({ ...history("Câu từ MongoDB"), imported: false });
    render(<AIChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
    await screen.findByText("Câu từ MongoDB");
    expect(localStorage.getItem(key("anon"))).toBe(saved);
  });

  it("loads older pages into the same conversation", async () => {
    getCustomerChat.mockResolvedValueOnce({ ...history("Câu mới"), older_cursor: "cursor" })
      .mockResolvedValueOnce({ ...history("Câu cũ"), messages: [{ ...history("Câu cũ").messages[0], id: "db-older" }] });
    render(<AIChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
    fireEvent.click(await screen.findByRole("button", { name: "Xem tin nhắn cũ hơn" }));
    await screen.findByText("Câu cũ");
    expect(screen.getAllByTestId("msg-user").map(node => node.textContent)).toEqual(["Câu cũ", "Câu mới"]);
    expect(getCustomerChat.mock.calls[1][2]).toBe("cursor");
  });

  it("keeps history visible until a confirmed MongoDB delete succeeds", async () => {
    getCustomerChat.mockResolvedValue(history("Nội dung cần xóa"));
    resetCustomerChat.mockRejectedValueOnce(apiError(503, "AI_DB_UNAVAILABLE"));
    render(<AIChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
    await screen.findByText("Nội dung cần xóa");

    fireEvent.click(screen.getByRole("button", { name: "Làm mới cuộc trò chuyện" }));
    expect(screen.getByText("Xóa toàn bộ cuộc trò chuyện này?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Giữ lại" }));
    expect(resetCustomerChat).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Làm mới cuộc trò chuyện" }));
    fireEvent.click(screen.getByRole("button", { name: "Xóa" }));
    await screen.findByRole("alert");
    expect(screen.getByText("Nội dung cần xóa")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Xóa" }));
    await waitFor(() => expect(screen.queryByText("Nội dung cần xóa")).toBeNull());
    expect(resetCustomerChat).toHaveBeenCalledTimes(2);
  });
});
