// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const chatWithSmartBooking = vi.fn();
const getCustomerChat = vi.fn();

vi.mock("@/services/aiApi", () => ({ aiApi: {
  chatWithSmartBooking: (...args: unknown[]) => chatWithSmartBooking(...args),
  getCustomerChat: (...args: unknown[]) => getCustomerChat(...args),
} }));
vi.mock("@/services/userApi", () => ({ getCachedUserProfile: () => null }));
vi.mock("@/services/keycloakSession", () => ({ getKeycloakSession: () => ({
  getCurrentToken: () => null,
  hasKeycloakSession: () => false,
  isAuthenticated: () => false,
}) }));
vi.mock("@/components/common/AIChatWidget/AIChatMessage", () => ({
  default: ({ message }: { message: { text: string; sender: string; actions?: unknown[] } }) => (
    <div data-testid={`msg-${message.sender}`} data-actions={message.actions ? "yes" : "no"}>{message.text}</div>
  ),
}));

import "@/i18n";
import AIChatWidget from "@/components/common/AIChatWidget/AIChatWidget";

const ticketTypesAction = (id: string) => ({ action: "SHOW_TICKET_TYPES", database_data: JSON.stringify({ status: "success", event_id: id }) });
const stored = (minutesAgo: number) => ({ generation: 0, older_cursor: null, messages: [
  { id: "2", role: "user", content: "chọn sự kiện", created_at: new Date(Date.now() - minutesAgo * 60000).toISOString() },
  { id: "3", role: "assistant", content: "Bảng giá", system_actions: [ticketTypesAction("ev-1")], created_at: new Date(Date.now() - minutesAgo * 60000).toISOString() },
] });

async function send(text: string) {
  if (!screen.queryByRole("dialog")) fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
  const input = screen.getByLabelText("Nhập tin nhắn cho trợ lý AI") as HTMLTextAreaElement;
  await waitFor(() => expect(input.disabled).toBe(false));
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));
}

beforeEach(() => {
  localStorage.clear();
  getCustomerChat.mockReset().mockResolvedValue({ generation: 0, older_cursor: null, messages: [] });
  chatWithSmartBooking.mockReset().mockResolvedValue({ generation: 0, older_cursor: null, messages: [
    { id: "reply", role: "assistant", content: "ok", created_at: new Date().toISOString() },
  ] });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("AIChatWidget booking context", () => {
  it("shows a reply indicator, then offers a ticket follow-up in the composer", async () => {
    let reply!: (value: ReturnType<typeof stored>) => void;
    chatWithSmartBooking.mockReturnValueOnce(new Promise(resolve => { reply = resolve; }));
    render(<AIChatWidget />);
    await send("Xem hạng vé");
    expect(screen.getByRole("status").textContent).toContain("Đang trả lời");
    expect(screen.getByRole("status").classList.contains("sr-only")).toBe(true);
    expect(screen.getByRole("status").parentElement?.querySelectorAll(".ai-typing-dot")).toHaveLength(3);

    reply(stored(0));
    const suggestion = await screen.findByRole("button", { name: "Cho mình xem sơ đồ ghế" });
    expect(suggestion.closest("footer")).toBeTruthy();
    fireEvent.click(suggestion);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Cho mình xem sơ đồ ghế");
    expect(chatWithSmartBooking).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("drags the suggestions horizontally without filling the composer", async () => {
    getCustomerChat.mockResolvedValue(stored(0));
    render(<AIChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
    const strip = await screen.findByTestId("customer-suggested-questions-scroll");
    const chip = screen.getByRole("button", { name: "Cho mình xem sơ đồ ghế" });
    strip.scrollLeft = 20;
    fireEvent.pointerDown(chip, { button: 0, pointerId: 1, clientX: 160, pointerType: "mouse" });
    fireEvent.pointerMove(strip, { pointerId: 1, clientX: 100, pointerType: "mouse" });
    expect(strip.scrollLeft).toBe(80);
    fireEvent.pointerUp(strip, { pointerId: 1, clientX: 100, pointerType: "mouse" });
    fireEvent.click(chip);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
  });

  it("sends the event the customer is booking with every request", async () => {
    getCustomerChat.mockResolvedValue(stored(2));
    render(<AIChatWidget />);
    await send("ok lấy 2 vé");
    await screen.findByText("ok");
    expect(chatWithSmartBooking.mock.calls[0][0].selectedEventId).toBe("ev-1");
  });

  it("sends no event when the conversation has not selected one", async () => {
    render(<AIChatWidget />);
    await send("xin chào");
    await screen.findByText("ok");
    expect(chatWithSmartBooking.mock.calls[0][0].selectedEventId).toBeUndefined();
  });

  it("drops old price and seat cards when a conversation is reopened, but keeps the text", async () => {
    getCustomerChat.mockResolvedValue(stored(45));
    render(<AIChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
    expect((await screen.findByText("Bảng giá")).getAttribute("data-actions")).toBe("no");
    await send("ok");
    await screen.findByText("ok");
    expect(chatWithSmartBooking.mock.calls[0][0].selectedEventId).toBeUndefined();
  });

  it("recent cards stay when the conversation is reopened", async () => {
    getCustomerChat.mockResolvedValue(stored(3));
    render(<AIChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
    expect((await screen.findByText("Bảng giá")).getAttribute("data-actions")).toBe("yes");
  });

  it("limits what the customer can type and shows a counter near the limit", async () => {
    render(<AIChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
    const input = screen.getByLabelText("Nhập tin nhắn cho trợ lý AI") as HTMLTextAreaElement;
    await waitFor(() => expect(input.disabled).toBe(false));
    expect(input.maxLength).toBe(400);
    fireEvent.change(input, { target: { value: "x".repeat(450) } });
    expect(input.value).toHaveLength(400);
    expect(screen.getByText("400/400")).toBeTruthy();
  });
});
