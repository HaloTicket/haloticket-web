// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const chatWithSmartBooking = vi.fn();
const getCachedUserProfile = vi.fn();

vi.mock("@/services/aiApi", () => ({ aiApi: { chatWithSmartBooking: (...args: unknown[]) => chatWithSmartBooking(...args) } }));
vi.mock("@/services/userApi", () => ({ getCachedUserProfile: () => getCachedUserProfile() }));
vi.mock("@/services/keycloakSession", () => ({ getKeycloakSession: () => ({ getCurrentToken: () => null }) }));
vi.mock("@/components/common/AIChatWidget/AIChatMessage", () => ({
  default: ({ message }: { message: { text: string; sender: string } }) => <div data-testid={`msg-${message.sender}`}>{message.text}</div>,
}));

import "@/i18n";
import AIChatWidget from "@/components/common/AIChatWidget/AIChatWidget";

const KEY = (account: string) => `ai_chat_history:v2:${account}`;
const apiError = (status: number, code: string, headers: Record<string, string> = {}) => ({
  response: { status, data: { code, message: "raw server text" }, headers },
});

async function openAndSend(text: string) {
  if (!screen.queryByRole("dialog")) fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
  const input = screen.getByLabelText("Nhập tin nhắn cho trợ lý AI");
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));
}

beforeEach(() => {
  localStorage.clear();
  chatWithSmartBooking.mockReset();
  getCachedUserProfile.mockReset();
  getCachedUserProfile.mockReturnValue(null);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("AIChatWidget error handling", () => {
  it("shows the failure as a system bubble that is neither persisted nor sent back as history", async () => {
    chatWithSmartBooking.mockRejectedValueOnce(apiError(503, "AI_UNAVAILABLE"));
    render(<AIChatWidget />);
    await openAndSend("Tìm vé hot");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Dịch vụ AI tạm thời không khả dụng");
    expect(alert.textContent).not.toContain("raw server text");

    const stored = localStorage.getItem(KEY("anon")) ?? "";
    expect(stored).toContain("Tìm vé hot");
    expect(stored).not.toContain("không khả dụng");

    // Resend: same user turn, no duplicate, history has no error text
    chatWithSmartBooking.mockResolvedValueOnce({ reply: "Đây là kết quả", system_actions: [] });
    fireEvent.click(screen.getByRole("button", { name: "Gửi lại" }));
    await screen.findByText("Đây là kết quả");
    expect(chatWithSmartBooking).toHaveBeenCalledTimes(2);
    expect(chatWithSmartBooking.mock.calls[1][0]).toBe("Tìm vé hot");
    expect(chatWithSmartBooking.mock.calls[1][1]).toEqual([]);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getAllByTestId("msg-user")).toHaveLength(1);

    // A following message carries only real turns as history
    chatWithSmartBooking.mockResolvedValueOnce({ reply: "Tiếp", system_actions: [] });
    await openAndSend("Cảm ơn");
    await screen.findByText("Tiếp");
    const history = chatWithSmartBooking.mock.calls[2][1] as Array<{ role: string; content: string }>;
    expect(history.map(h => h.role)).toEqual(["user", "assistant"]);
    expect(JSON.stringify(history)).not.toContain("không khả dụng");
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

describe("AIChatWidget accessibility", () => {
  it("is a labelled dialog with a live conversation, labelled controls, and closes on Escape", async () => {
    render(<AIChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
    expect(screen.getByRole("dialog", { name: "Trợ lý AI HaloTicket" })).toBeTruthy();
    expect(screen.getByRole("log").getAttribute("aria-live")).toBe("polite");
    expect(screen.getByRole("button", { name: "Làm mới cuộc trò chuyện" })).toBeTruthy();
    expect(screen.getByLabelText("Nhập tin nhắn cho trợ lý AI").tagName).toBe("TEXTAREA");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("AIChatWidget history storage", () => {
  it("purges the legacy global key once and keeps history per account", async () => {
    localStorage.setItem("ai_chat_history", JSON.stringify([{ id: "x", sender: "user", text: "old", timestamp: new Date() }]));
    getCachedUserProfile.mockReturnValue({ id: "u1", email: "a@x.com" });
    chatWithSmartBooking.mockResolvedValue({ reply: "Trả lời của u1", system_actions: [] });
    render(<AIChatWidget />);
    expect(localStorage.getItem("ai_chat_history")).toBeNull();

    await openAndSend("Câu hỏi của u1");
    await screen.findByText("Trả lời của u1");
    expect(localStorage.getItem(KEY("u1"))).toContain("Câu hỏi của u1");

    // switch to another account: the previous account's history is removed and not shown
    getCachedUserProfile.mockReturnValue({ id: "u2" });
    act(() => { window.dispatchEvent(new Event("auth-changed")); });
    await waitFor(() => expect(localStorage.getItem(KEY("u1"))).toBeNull());
    expect(screen.queryByText("Câu hỏi của u1")).toBeNull();
    expect(JSON.parse(localStorage.getItem(KEY("u2")) ?? "[]")).toHaveLength(1);

    // logout: the account's key is removed and the anonymous conversation starts empty
    getCachedUserProfile.mockReturnValue(null);
    act(() => { window.dispatchEvent(new Event("storage")); });
    await waitFor(() => expect(localStorage.getItem(KEY("u2"))).toBeNull());
    expect(JSON.parse(localStorage.getItem(KEY("anon")) ?? "[]")).toHaveLength(1);
  });

  it("falls back to the email when the profile has no id, and restores a saved conversation", async () => {
    getCachedUserProfile.mockReturnValue({ email: "me@x.com" });
    localStorage.setItem(KEY("me@x.com"), JSON.stringify([
      { id: "1", sender: "ai", text: "greeting", timestamp: new Date().toISOString() },
      { id: "2", sender: "user", text: "Câu đã lưu", timestamp: new Date().toISOString() },
    ]));
    render(<AIChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
    expect(screen.getByText("Câu đã lưu")).toBeTruthy();
  });

  it("asks for confirmation before clearing the conversation", async () => {
    getCachedUserProfile.mockReturnValue({ id: "u9" });
    chatWithSmartBooking.mockResolvedValue({ reply: "Ok rồi", system_actions: [] });
    render(<AIChatWidget />);
    await openAndSend("Nội dung cần xóa");
    await screen.findByText("Ok rồi");

    fireEvent.click(screen.getByRole("button", { name: "Làm mới cuộc trò chuyện" }));
    expect(screen.getByText("Xóa toàn bộ cuộc trò chuyện này?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Giữ lại" }));
    expect(screen.getByText("Nội dung cần xóa")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Làm mới cuộc trò chuyện" }));
    fireEvent.click(screen.getByRole("button", { name: "Xóa" }));
    await waitFor(() => expect(screen.queryByText("Nội dung cần xóa")).toBeNull());
    expect(JSON.parse(localStorage.getItem(KEY("u9")) ?? "[]")).toHaveLength(1);
  });
});
