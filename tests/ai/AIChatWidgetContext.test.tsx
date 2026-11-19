// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const chatWithSmartBooking = vi.fn();

vi.mock("@/services/aiApi", () => ({ aiApi: { chatWithSmartBooking: (...args: unknown[]) => chatWithSmartBooking(...args) } }));
vi.mock("@/services/userApi", () => ({ getCachedUserProfile: () => null }));
vi.mock("@/services/keycloakSession", () => ({ getKeycloakSession: () => ({ getCurrentToken: () => null }) }));
vi.mock("@/components/common/AIChatWidget/AIChatMessage", () => ({
  default: ({ message }: { message: { text: string; sender: string; actions?: unknown[] } }) => (
    <div data-testid={`msg-${message.sender}`} data-actions={message.actions ? "yes" : "no"}>{message.text}</div>
  ),
}));

import "@/i18n";
import AIChatWidget from "@/components/common/AIChatWidget/AIChatWidget";

const KEY = "ai_chat_history:v2:anon";
const ticketTypesAction = (id: string) => ({ action: "SHOW_TICKET_TYPES", database_data: JSON.stringify({ status: "success", event_id: id }) });
const stored = (minutesAgo: number) => JSON.stringify([
  { id: "1", sender: "ai", text: "Chào bạn", timestamp: new Date(Date.now() - 60 * 60000).toISOString() },
  { id: "2", sender: "user", text: "chọn sự kiện", timestamp: new Date(Date.now() - minutesAgo * 60000).toISOString() },
  { id: "3", sender: "ai", text: "Bảng giá", actions: [ticketTypesAction("ev-1")], timestamp: new Date(Date.now() - minutesAgo * 60000).toISOString() },
]);

function send(text: string) {
  if (!screen.queryByRole("dialog")) fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
  fireEvent.change(screen.getByLabelText("Nhập tin nhắn cho trợ lý AI"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));
}

beforeEach(() => {
  localStorage.clear();
  chatWithSmartBooking.mockReset().mockResolvedValue({ reply: "ok", system_actions: [] });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("AIChatWidget booking context", () => {
  it("sends the event the customer is booking with every request", async () => {
    localStorage.setItem(KEY, stored(2));
    render(<AIChatWidget />);
    send("ok lấy 2 vé");
    await screen.findByText("ok");
    expect(chatWithSmartBooking.mock.calls[0][2]).toBe("ev-1");
  });

  it("sends no event when the conversation has not selected one", async () => {
    render(<AIChatWidget />);
    send("xin chào");
    await screen.findByText("ok");
    expect(chatWithSmartBooking.mock.calls[0][2]).toBeUndefined();
  });

  it("drops old price and seat cards when a conversation is reopened, but keeps the text", async () => {
    localStorage.setItem(KEY, stored(45));
    render(<AIChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
    expect(screen.getByText("Bảng giá").getAttribute("data-actions")).toBe("no");
    send("ok");
    await screen.findByText("ok");
    expect(chatWithSmartBooking.mock.calls[0][2]).toBeUndefined();
  });

  it("recent cards stay when the conversation is reopened", () => {
    localStorage.setItem(KEY, stored(3));
    render(<AIChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
    expect(screen.getByText("Bảng giá").getAttribute("data-actions")).toBe("yes");
  });

  it("limits what the customer can type and shows a counter near the limit", () => {
    render(<AIChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Chat với AI" }));
    const input = screen.getByLabelText("Nhập tin nhắn cho trợ lý AI") as HTMLTextAreaElement;
    expect(input.maxLength).toBe(400);
    fireEvent.change(input, { target: { value: "x".repeat(450) } });
    expect(input.value).toHaveLength(400);
    expect(screen.getByText("400/400")).toBeTruthy();
  });
});
