// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const chatWithOrganizerAgent = vi.fn();
const listOrganizerConversations = vi.fn();
const createOrganizerConversation = vi.fn();
const getOrganizerConversation = vi.fn();
const pinOrganizerConversation = vi.fn();
const deleteOrganizerConversation = vi.fn();
const clearOrganizerConversations = vi.fn();
const getCachedUserProfile = vi.fn();
const getCurrentToken = vi.fn();

vi.mock("@/services/aiApi", () => ({
  aiApi: {
    chatWithOrganizerAgent: (...args: unknown[]) => chatWithOrganizerAgent(...args),
    listOrganizerConversations: (...args: unknown[]) => listOrganizerConversations(...args),
    createOrganizerConversation: (...args: unknown[]) => createOrganizerConversation(...args),
    getOrganizerConversation: (...args: unknown[]) => getOrganizerConversation(...args),
    pinOrganizerConversation: (...args: unknown[]) => pinOrganizerConversation(...args),
    deleteOrganizerConversation: (...args: unknown[]) => deleteOrganizerConversation(...args),
    clearOrganizerConversations: (...args: unknown[]) => clearOrganizerConversations(...args),
  },
}));

vi.mock("@/services/userApi", () => ({
  parseJwt: (token: string) => {
    try {
      const parts = token.split(".");
      if (parts.length >= 2) {
        return JSON.parse(atob(parts[1]));
      }
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

import i18n from "@/i18n";
import { OrganizerAIChatWidget } from "@/components/common/OrganizerAIChatWidget/OrganizerAIChatWidget";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const fakeToken = (sub: string, iss = "https://auth.haloticket.vn") => {
  const header = btoa(JSON.stringify({ alg: "HS256" }));
  const payload = btoa(JSON.stringify({ sub, iss, email: `${sub}@haloticket.vn` }));
  return `${header}.${payload}.sig`;
};

const renderWidget = (props = {}) => {
  return render(
    <MemoryRouter>
      <OrganizerAIChatWidget {...props} />
    </MemoryRouter>
  );
};

const openWidget = () => {
  if (!screen.queryByRole("dialog")) {
    const trigger = screen.getByRole("button", { name: /Chat với AI|Chat with AI/i });
    fireEvent.click(trigger);
  }
};

beforeEach(async () => {
  sessionStorage.clear();
  localStorage.clear();
  chatWithOrganizerAgent.mockReset();
  listOrganizerConversations.mockReset().mockResolvedValue([]);
  createOrganizerConversation.mockReset();
  getOrganizerConversation.mockReset();
  pinOrganizerConversation.mockReset();
  deleteOrganizerConversation.mockReset().mockResolvedValue(undefined);
  clearOrganizerConversations.mockReset().mockResolvedValue(undefined);
  getCachedUserProfile.mockReset();
  getCurrentToken.mockReset();

  await i18n.changeLanguage("vi");

  getCurrentToken.mockReturnValue(fakeToken("user-acc-1"));
  getCachedUserProfile.mockReturnValue({
    id: "user-acc-1",
    email: "user1@haloticket.vn",
    roles: ["ORGANIZER"],
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("expands the chat to the viewport and keeps the history toggle reachable", () => {
  renderWidget();
  openWidget();
  const dialog = screen.getByRole("dialog");
  expect(dialog.parentElement).toBe(document.body);
  expect(dialog.dataset.expanded).toBe("false");

  fireEvent.click(screen.getByRole("button", { name: "Phóng to" }));
  expect(dialog.dataset.expanded).toBe("true");
  expect(within(dialog).getByTestId("organizer-toggle-drawer-btn")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Thu nhỏ" }));
  expect(dialog.dataset.expanded).toBe("false");
});

it("shows the direct answer without adding details even when metric data is attached", async () => {
  chatWithOrganizerAgent.mockResolvedValueOnce({
    conversation_id: "conv-direct",
    show_analytics: false,
    reply: "Hôm nay bạn đã bán được 2 vé.",
    status: "ok",
    totals: [{ key: "tickets_sold", value: 2, unit: "count", completeness: "complete" }],
    actions: [{ action: "DISPLAY_DATA_TABLE", database_data: [{ date: "2026-11-25", tickets_sold: 2 }] }],
  });

  renderWidget();
  openWidget();
  fireEvent.change(screen.getByPlaceholderText(/Hỏi về doanh thu/i), { target: { value: "Hôm nay bán bao nhiêu vé?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));

  await screen.findByText("Hôm nay bạn đã bán được 2 vé.");
  expect(screen.queryByRole("button", { name: "Xem chi tiết" })).toBeNull();
  expect(screen.getByRole("button", { name: "Sao chép" })).toBeTruthy();
});

describe("OrganizerAIChatWidget - Scope, Starter Topics & Bilingual UI", () => {
  it("lazily fetches conversations only after opening the widget and renders scope badge + starter topics", async () => {
    renderWidget({ scope: "managed_events" });
    expect(listOrganizerConversations).not.toHaveBeenCalled();

    openWidget();

    await waitFor(() => {
      expect(listOrganizerConversations).toHaveBeenCalledTimes(1);
    });
    expect(listOrganizerConversations.mock.calls[0][0]).toMatchObject({
      scope: "managed_events",
    });
    expect(listOrganizerConversations.mock.calls[0][0].eventId).toBeUndefined();

    const scopeBadge = screen.getByTestId("organizer-chat-scope-badge");
    expect(scopeBadge.textContent).toBe("Các sự kiện tôi quản lý");
    expect(screen.queryByTestId("organizer-chat-event-name")).toBeNull();

    expect(screen.getByRole("heading", { name: /chào bạn/i })).toBeTruthy();
    expect(screen.queryByTestId("organizer-ai-bubble")).toBeNull();
    expect(screen.queryByRole("button", { name: "Sao chép" })).toBeNull();
    const starterGrid = screen.getByTestId("organizer-starter-topics");
    const starterButtons = within(starterGrid).getAllByRole("button");
    expect(starterButtons.length).toBeGreaterThanOrEqual(4);
    expect(starterButtons.length).toBeLessThanOrEqual(6);
  });

  it("renders in event scope with event badge, event name, and clicking a starter card fills draft without sending", async () => {
    renderWidget({
      scope: "event",
      eventId: "evt-summer-2026",
      eventTitle: "Đại nhạc hội Mùa Hè 2026",
    });
    openWidget();

    const scopeBadge = screen.getByTestId("organizer-chat-scope-badge");
    expect(scopeBadge.textContent).toBe("Sự kiện này");

    const eventName = screen.getByTestId("organizer-chat-event-name");
    expect(eventName.textContent).toBe("Đại nhạc hội Mùa Hè 2026");

    const starterGrid = screen.getByTestId("organizer-starter-topics");
    const firstTopic = within(starterGrid).getAllByRole("button")[0];
    fireEvent.click(firstTopic);

    const input = screen.getByPlaceholderText(/Hỏi về doanh thu/i) as HTMLTextAreaElement;
    expect(input.value.length).toBeGreaterThan(5);
    expect(chatWithOrganizerAgent).not.toHaveBeenCalled();
  });

  it("fills and focuses the composer from a quick suggestion without sending", () => {
    renderWidget();
    openWidget();

    const [suggestion] = within(screen.getByTestId("organizer-suggested-questions")).getAllByRole("button");
    fireEvent.click(suggestion);

    const input = screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Nhập tin nhắn cho trợ lý AI" });
    expect(input.value).toBe(suggestion.textContent);
    expect(input.value).toMatch(/\?$/);
    expect(document.activeElement).toBe(input);
    expect(chatWithOrganizerAgent).not.toHaveBeenCalled();
  });

  it("renders suggested questions always visible across turns and switches to English", async () => {
    renderWidget({ scope: "managed_events" });
    openWidget();

    const suggestions = screen.getByTestId("organizer-suggested-questions");
    expect(suggestions.textContent).toContain("Sự kiện nào bán chạy nhất");
    expect(suggestions.textContent).toContain("Tôi đã bán được bao nhiêu vé");

    await i18n.changeLanguage("en");
    await waitFor(() => {
      expect(screen.getByTestId("organizer-chat-scope-badge").textContent).toBe("My Managed Events");
      const enSuggestions = screen.getByTestId("organizer-suggested-questions");
      expect(enSuggestions.textContent).toContain("Which events sold the most");
      expect(enSuggestions.textContent).toContain("How many tickets have I sold");
    });
  });
});

describe("OrganizerAIChatWidget - Persistent Mode, Reload Survival & Account/Scope Isolation", () => {
  it("never stores message history in localStorage or sessionStorage and survives reload via server API", async () => {
    chatWithOrganizerAgent.mockResolvedValueOnce({
      conversation_id: "conv-uuid-101",
      reply: "Doanh thu rất tốt",
      status: "ok",
      pipeline_steps: [],
      actions: [],
      cards: [],
      totals: [],
      warnings: [],
      drafts: [],
      execution_time_ms: 100,
    });

    const { unmount } = renderWidget({ scope: "managed_events" });
    openWidget();

    const input = screen.getByPlaceholderText(/Hỏi về doanh thu/i);
    fireEvent.change(input, { target: { value: "Top sự kiện bán chạy?" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));

    await screen.findByText("Doanh thu rất tốt");

    // Verify no raw chat transcripts are persisted in browser storage
    expect(localStorage.getItem("organizer_ai_chat_history")).toBeNull();
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i)!;
      expect(sessionStorage.getItem(k)).not.toContain("Doanh thu rất tốt");
      expect(sessionStorage.getItem(k)).not.toContain("Top sự kiện bán chạy?");
    }

    // Simulate opening on a fresh device / reload with cleared storage
    unmount();
    sessionStorage.clear();

    listOrganizerConversations.mockResolvedValueOnce([
      {
        id: "conv-uuid-101",
        scope: "managed_events",
        event_id: null,
        title: "Top sự kiện bán chạy?",
        is_pinned: false,
        created_at: "2026-11-25T08:00:00Z",
        updated_at: "2026-11-25T08:01:00Z",
      },
    ]);
    getOrganizerConversation.mockResolvedValueOnce({
      id: "conv-uuid-101",
      scope: "managed_events",
      event_id: null,
      title: "Top sự kiện bán chạy?",
      is_pinned: false,
      created_at: "2026-11-25T08:00:00Z",
      updated_at: "2026-11-25T08:01:00Z",
      messages: [
        {
          id: "m-1",
          role: "user",
          content: "Top sự kiện bán chạy?",
          status: "ok",
          payload: null,
          created_at: "2026-11-25T08:00:01Z",
        },
        {
          id: "m-2",
          role: "assistant",
          content: "Doanh thu rất tốt",
          status: "ok",
          payload: {
            totals: [],
            cards: [],
            warnings: [],
            drafts: [],
            actions: [],
            execution_time_ms: 100,
          },
          created_at: "2026-11-25T08:00:03Z",
        },
      ],
    });

    renderWidget({ scope: "managed_events" });
    openWidget();

    expect(await screen.findByText("Doanh thu rất tốt")).toBeTruthy();
    expect(screen.getByText("Top sự kiện bán chạy?")).toBeTruthy();
  });

  it("isolates history between different accounts and scopes", async () => {
    listOrganizerConversations.mockImplementation(({ scope, eventId }: { scope: string; eventId?: string }) => {
      const token = getCurrentToken();
      if (token?.includes(btoa(JSON.stringify({ sub: "user-acc-1", iss: "https://auth.haloticket.vn", email: "user-acc-1@haloticket.vn" })))) {
        if (scope === "event" && eventId === "evt-A") {
          return Promise.resolve([
            {
              id: "conv-evt-a",
              scope: "event",
              event_id: "evt-A",
              title: " Doanh thu riêng Sự kiện A",
              is_pinned: false,
              created_at: "2026-11-25T08:00:00Z",
              updated_at: "2026-11-25T08:01:00Z",
            },
          ]);
        }
      }
      return Promise.resolve([]);
    });
    getOrganizerConversation.mockResolvedValue({
      id: "conv-evt-a",
      scope: "event",
      event_id: "evt-A",
      title: "Doanh thu riêng Sự kiện A",
      is_pinned: false,
      created_at: "2026-11-25T08:00:00Z",
      updated_at: "2026-11-25T08:01:00Z",
      messages: [
        {
          id: "m1",
          role: "assistant",
          content: "Bí mật tài khoản 1 sự kiện A",
          status: "ok",
          payload: null,
          created_at: "2026-11-25T08:00:02Z",
        },
      ],
    });

    const { rerender } = renderWidget({ scope: "event", eventId: "evt-A" });
    openWidget();
    await screen.findByText("Bí mật tài khoản 1 sự kiện A");

    // Switch to Event B under same account -> isolated
    rerender(
      <MemoryRouter>
        <OrganizerAIChatWidget scope="event" eventId="evt-B" />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.queryByText("Bí mật tài khoản 1 sự kiện A")).toBeNull();
    });

    // Switch token to account 2 on Event A -> isolated
    act(() => {
      getCurrentToken.mockReturnValue(fakeToken("user-acc-2"));
      getCachedUserProfile.mockReturnValue({
        id: "user-acc-2",
        email: "user2@haloticket.vn",
        roles: ["ORGANIZER"],
      });
      window.dispatchEvent(new Event("auth-changed"));
    });

    rerender(
      <MemoryRouter>
        <OrganizerAIChatWidget scope="event" eventId="evt-A" />
      </MemoryRouter>
    );
    expect(screen.queryByText("Bí mật tài khoản 1 sự kiện A")).toBeNull();
  });

  it("clears the open chat on session expiry even when the cached profile and token are still present", async () => {
    listOrganizerConversations.mockResolvedValueOnce([
      {
        id: "conv-sec",
        scope: "managed_events",
        event_id: null,
        title: "Chỉ số riêng",
        is_pinned: false,
        created_at: "2026-11-25T08:00:00Z",
        updated_at: "2026-11-25T08:01:00Z",
      },
    ]);
    getOrganizerConversation.mockResolvedValueOnce({
      id: "conv-sec",
      scope: "managed_events",
      event_id: null,
      title: "Chỉ số riêng",
      is_pinned: false,
      created_at: "2026-11-25T08:00:00Z",
      updated_at: "2026-11-25T08:01:00Z",
      messages: [
        {
          id: "m-sec",
          role: "assistant",
          content: "Chỉ số riêng mật",
          status: "ok",
          payload: null,
          created_at: "2026-11-25T08:00:02Z",
        },
      ],
    });

    renderWidget({ scope: "managed_events" });
    openWidget();
    await screen.findByText("Chỉ số riêng mật");

    fireEvent(window, new Event("session-expired"));

    await waitFor(() => expect(screen.queryByText("Chỉ số riêng mật")).toBeNull());
  });

  it("starts a blank local draft via New Chat button without deleting server conversations or calling POST /conversations", async () => {
    listOrganizerConversations.mockResolvedValueOnce([
      {
        id: "conv-existing",
        scope: "managed_events",
        event_id: null,
        title: "Phiên cũ",
        is_pinned: false,
        created_at: "2026-11-25T08:00:00Z",
        updated_at: "2026-11-25T08:01:00Z",
      },
    ]);
    getOrganizerConversation.mockResolvedValueOnce({
      id: "conv-existing",
      scope: "managed_events",
      event_id: null,
      title: "Phiên cũ",
      is_pinned: false,
      created_at: "2026-11-25T08:00:00Z",
      updated_at: "2026-11-25T08:01:00Z",
      messages: [
        {
          id: "m-old",
          role: "user",
          content: "Tin nhắn phiên cũ",
          status: "ok",
          payload: null,
          created_at: "2026-11-25T08:00:01Z",
        },
      ],
    });

    renderWidget({ scope: "managed_events" });
    openWidget();

    await screen.findByText("Tin nhắn phiên cũ");

    const newChatBtn = screen.getByTestId("organizer-new-chat-header-btn");
    fireEvent.click(newChatBtn);

    await waitFor(() => {
      expect(screen.queryByText("Tin nhắn phiên cũ")).toBeNull();
      expect(screen.getByTestId("organizer-starter-topics")).toBeTruthy();
    });
    expect(createOrganizerConversation).not.toHaveBeenCalled();
    expect(deleteOrganizerConversation).not.toHaveBeenCalled();
  });
});

describe("OrganizerAIChatWidget - API Integration & Result Rendering", () => {
  it("calls aiApi.chatWithOrganizerAgent with persist:true, UUID request_id, no client history, and threads conversation_id", async () => {
    chatWithOrganizerAgent.mockResolvedValueOnce({
      conversation_id: "550e8400-e29b-41d4-a716-446655440000",
      reply: "Phân tích xong",
      status: "ok",
      pipeline_steps: [{ step: "INTENT", name: "Ý định", detail: "Chi tiết" }],
      actions: [],
      cards: [],
      totals: [
        {
          key: "ticket_sales_revenue",
          value: 50000000,
          unit: "VND",
          period: { from: "2026-11-01T00:00:00Z", to: "2026-11-20T00:00:00Z" },
          completeness: "complete",
        },
        {
          key: "check_ins",
          value: 25,
          unit: "count",
          period: { from: "2026-11-01T00:00:00Z", to: "2026-11-20T00:00:00Z" },
          completeness: "complete",
        },
      ],
      warnings: [],
      drafts: [],
      follow_up: { question: "Bạn muốn xem doanh thu theo ngày?", options: [
        { label: "Xem theo ngày", message: "Xem doanh thu theo ngày của sự kiện này" },
      ] },
      execution_time_ms: 150,
    });

    renderWidget({ scope: "event", eventId: "evt-live-1", eventTitle: "Concert Live" });
    openWidget();

    const input = screen.getByPlaceholderText(/Hỏi về doanh thu/i);
    fireEvent.change(input, { target: { value: "Báo cáo doanh thu sự kiện này" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));

    await waitFor(() => {
      expect(chatWithOrganizerAgent).toHaveBeenCalledTimes(1);
    });

    const callArg = chatWithOrganizerAgent.mock.calls[0][0];
    expect(callArg.scope).toBe("event");
    expect(callArg.eventId).toBe("evt-live-1");
    expect(callArg.message).toBe("Báo cáo doanh thu sự kiện này");
    expect(callArg.locale).toBe("vi");
    expect(callArg.persist).toBe(true);
    expect(callArg.conversationId).toBeUndefined();
    expect(callArg.requestId).toMatch(UUID_REGEX);
    expect(callArg.history).toBeUndefined();
    expect(callArg.signal).toBeDefined();

    // Verify totals rendering
    await screen.findByText("Phân tích xong");
    expect(screen.queryByTestId("chat-totals-section")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xem chi tiết" }));
    const totalsSection = screen.getByTestId("chat-totals-section");
    expect(totalsSection).toBeTruthy();
    expect(totalsSection.textContent).toContain("Giá trị vé bán trước voucher");
    expect(totalsSection.textContent).toContain("50.000.000");
    fireEvent.click(screen.getByRole("button", { name: "Xem theo ngày" }));
    expect((input as HTMLTextAreaElement).value).toBe("Xem doanh thu theo ngày của sự kiện này");
    expect(chatWithOrganizerAgent).toHaveBeenCalledTimes(1);

    // Second send in the same conversation passes conversation_id and a fresh request_id
    chatWithOrganizerAgent.mockResolvedValueOnce({
      conversation_id: "550e8400-e29b-41d4-a716-446655440000",
      reply: "Lượt thứ hai",
      status: "ok",
      pipeline_steps: [],
      actions: [],
      cards: [],
      totals: [],
      warnings: [],
      drafts: [],
      execution_time_ms: 90,
    });

    fireEvent.change(input, { target: { value: "Chi tiết hạng vé VIP" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));

    await screen.findByText("Lượt thứ hai");
    const secondArg = chatWithOrganizerAgent.mock.calls[1][0];
    expect(secondArg.persist).toBe(true);
    expect(secondArg.conversationId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(secondArg.requestId).toMatch(UUID_REGEX);
    expect(secondArg.requestId).not.toBe(callArg.requestId);
    expect(secondArg.history).toBeUndefined();

    // Follow-up chips remain visible even when messages.length > 3
    expect(screen.getByTestId("organizer-suggested-questions")).toBeTruthy();
  });

  it("renders result cards, warnings, and copyable drafts with management link", async () => {
    chatWithOrganizerAgent.mockResolvedValueOnce({
      conversation_id: "conv-cards-1",
      reply: "Đây là tổng quan sự kiện và các cảnh báo",
      status: "ok",
      pipeline_steps: [],
      actions: [],
      totals: [],
      cards: [
        {
          kind: "event",
          event_id: "evt-card-1",
          event_title: "Sự kiện Rock Fest",
          event_status: "APPROVED",
          showtime_id: null,
          showtime_title: null,
          ticket_type_id: null,
          ticket_type_title: null,
          start_time: "2026-12-01T12:00:00Z",
          end_time: "2026-12-01T15:00:00Z",
          metrics: [
            {
              key: "tickets_sold",
              value: 1200,
              unit: "count",
              period: null,
              completeness: "complete",
            },
          ],
        },
      ],
      warnings: [
        {
          code: "paid_order_missing_tickets",
          kind: "event",
          event_id: "evt-card-1",
          event_title: "Sự kiện Rock Fest",
          event_status: "APPROVED",
          showtime_id: null,
          showtime_title: null,
          ticket_type_id: null,
          ticket_type_title: null,
          start_time: null,
          end_time: null,
          metrics: [
            {
              key: "missing_tickets",
              value: 4,
              unit: "count",
              period: null,
              completeness: "complete",
            },
          ],
        },
      ],
      drafts: [
        {
          title: "Thông báo check-in",
          content: "Kính gửi quý khán giả, cổng check-in sẽ mở lúc 17h00.",
        },
      ],
      execution_time_ms: 180,
    });

    renderWidget({ scope: "managed_events" });
    openWidget();

    const input = screen.getByPlaceholderText(/Hỏi về doanh thu/i);
    fireEvent.change(input, { target: { value: "Kiểm tra cảnh báo" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));

    await screen.findByText("Đây là tổng quan sự kiện và các cảnh báo");

    fireEvent.click(screen.getByRole("button", { name: "Xem chi tiết" }));
    const cardsSection = screen.getByTestId("chat-cards-section");
    expect(cardsSection.textContent).toContain("Sự kiện Rock Fest");
    expect(cardsSection.textContent).toContain("Vé đã bán");
    expect(cardsSection.textContent).toContain("1.200");
    const manageLinks = screen
      .getAllByRole("link")
      .filter((link) => (link.getAttribute("href") ?? "").includes("/organizer/events/evt-card-1/manage"));
    expect(manageLinks.length).toBeGreaterThanOrEqual(2);

    const warningCard = screen.getByTestId("chat-warning-card-paid_order_missing_tickets");
    expect(warningCard.textContent).toContain("Đơn đã thanh toán nhưng thiếu vé");
    expect(warningCard.textContent).toContain("Số vé còn thiếu");

    const draftBox = screen.getByTestId("chat-draft-0");
    expect(draftBox.textContent).toContain("Thông báo check-in");
    expect(draftBox.textContent).toContain("Kính gửi quý khán giả, cổng check-in sẽ mở lúc 17h00.");

    // Distinct copy labels: reply copy vs draft copy
    expect(screen.getAllByRole("button", { name: "Sao chép" }).length).toBeGreaterThanOrEqual(1);
    const copyDraftButton = within(draftBox).getByRole("button", { name: /Sao chép bản nháp/i });
    fireEvent.click(copyDraftButton);
    await within(draftBox).findByText("Đã sao chép");
  });

  it("handles status empty and still renders drafts independently", async () => {
    chatWithOrganizerAgent.mockResolvedValueOnce({
      conversation_id: "conv-empty-1",
      reply: "Không tìm thấy dữ liệu nào",
      status: "empty",
      pipeline_steps: [],
      actions: [],
      cards: [],
      totals: [],
      warnings: [],
      drafts: [
        {
          title: "Gợi ý chiến lược",
          content: "Hãy thử giảm giá vé suất sớm 10%.",
        },
      ],
      execution_time_ms: 80,
    });

    renderWidget({ scope: "managed_events" });
    openWidget();

    const input = screen.getByPlaceholderText(/Hỏi về doanh thu/i);
    fireEvent.change(input, { target: { value: "Sự kiện nào bán chậm?" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));

    await screen.findByText("Không tìm thấy dữ liệu nào");
    expect(screen.queryByTestId("chat-empty-status")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xem chi tiết" }));
    expect(screen.getByTestId("chat-draft-0").textContent).toContain("Hãy thử giảm giá vé suất sớm 10%.");
  });
});

describe("OrganizerAIChatWidget - Error Handling & Idempotent Retry (401, 403, 404, 422, 429, 503)", () => {
  it("displays localized 403 EVENT_NOT_IN_SCOPE error", async () => {
    chatWithOrganizerAgent.mockRejectedValueOnce({
      response: {
        status: 403,
        data: { detail: { code: "EVENT_NOT_IN_SCOPE" } },
      },
    });

    renderWidget({ scope: "event", eventId: "evt-secret", eventTitle: "Secret Event" });
    openWidget();

    const input = screen.getByPlaceholderText(/Hỏi về doanh thu/i);
    fireEvent.change(input, { target: { value: "Xem số liệu" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));

    await screen.findByText(/Bạn không có quyền truy cập dữ liệu của sự kiện này/i);
  });

  it("handles 429 rate limit with retry seconds", async () => {
    chatWithOrganizerAgent.mockRejectedValueOnce({
      response: {
        status: 429,
        headers: { "retry-after": "45" },
        data: { retry_after_seconds: 45 },
      },
    });

    renderWidget({ scope: "managed_events" });
    openWidget();

    const input = screen.getByPlaceholderText(/Hỏi về doanh thu/i);
    fireEvent.change(input, { target: { value: "Gửi nhanh" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));

    await screen.findByText(/Bạn đang gửi yêu cầu quá nhanh.*45 giây/i);
  });

  it("shows friendly retry on 503 AI_DB_UNAVAILABLE / AI_DB_NOT_CONFIGURED and preserves stable request_id across retries", async () => {
    chatWithOrganizerAgent.mockRejectedValueOnce({
      response: {
        status: 503,
        data: { detail: { code: "AI_DB_UNAVAILABLE" } },
      },
    });

    renderWidget({ scope: "managed_events" });
    openWidget();

    const input = screen.getByPlaceholderText(/Hỏi về doanh thu/i);
    fireEvent.change(input, { target: { value: "Thử lưu trữ hội thoại" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));

    await screen.findByText(/tạm thời|không khả dụng|gián đoạn/i);
    const firstAttemptRequestId = chatWithOrganizerAgent.mock.calls[0][0].requestId;
    expect(firstAttemptRequestId).toMatch(UUID_REGEX);

    chatWithOrganizerAgent.mockResolvedValueOnce({
      conversation_id: "conv-recovered-1",
      reply: "Đã khôi phục kết nối thành công",
      status: "ok",
      pipeline_steps: [],
      actions: [],
      cards: [],
      totals: [],
      warnings: [],
      drafts: [],
      execution_time_ms: 110,
    });

    const retryBtn = screen.getByRole("button", { name: /Thử lại|Try again/i });
    fireEvent.click(retryBtn);

    await screen.findByText("Đã khôi phục kết nối thành công");
    expect(chatWithOrganizerAgent).toHaveBeenCalledTimes(2);
    expect(chatWithOrganizerAgent.mock.calls[1][0].requestId).toBe(firstAttemptRequestId);
    expect(chatWithOrganizerAgent.mock.calls[1][0].persist).toBe(true);
  });
});

describe("OrganizerAIChatWidget - Regression: Late API resolution across account/scope switch", () => {
  it("never displays or stores Account A's message in Account B even if A's API call resolves late", async () => {
    let resolveAccountA: (res: unknown) => void = () => {};
    chatWithOrganizerAgent.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveAccountA = resolve;
        })
    );

    const { rerender } = renderWidget({ scope: "managed_events" });
    openWidget();

    const input = screen.getByPlaceholderText(/Hỏi về doanh thu/i);
    fireEvent.change(input, { target: { value: "Câu hỏi tối mật từ Account A" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));

    expect(screen.getByText("Câu hỏi tối mật từ Account A")).toBeTruthy();

    act(() => {
      getCurrentToken.mockReturnValue(fakeToken("user-acc-B"));
      getCachedUserProfile.mockReturnValue({
        id: "user-acc-B",
        email: "userB@haloticket.vn",
        roles: ["ORGANIZER"],
      });
      window.dispatchEvent(new Event("auth-changed"));
    });

    rerender(
      <MemoryRouter>
        <OrganizerAIChatWidget scope="managed_events" />
      </MemoryRouter>
    );
    openWidget();

    expect(screen.queryByText("Câu hỏi tối mật từ Account A")).toBeNull();

    act(() => {
      resolveAccountA({
        conversation_id: "conv-acc-a",
        reply: "Phản hồi tối mật cho Account A",
        status: "ok",
        pipeline_steps: [],
        actions: [],
        cards: [],
        totals: [],
        warnings: [],
        drafts: [],
        execution_time_ms: 200,
      });
    });

    expect(screen.queryByText("Phản hồi tối mật cho Account A")).toBeNull();
  });
});

describe("OrganizerAIChatWidget - Suggestion Bar UI, Drag-to-Scroll & Dynamic Follow-Ups", () => {
  it("renders blue suggestion icon and 'Gợi ý:' / 'Suggestions:' label with exactly 3 starter questions", async () => {
    const { rerender } = renderWidget({ scope: "managed_events" });
    openWidget();

    const label = screen.getByTestId("organizer-suggestions-label");
    expect(label.textContent).toContain("Gợi ý:");
    expect(label.querySelector("svg")).not.toBeNull();
    expect(label.className).toContain("text-brand-primary");

    const scrollStrip = screen.getByTestId("organizer-suggested-questions-scroll");
    expect(within(scrollStrip).getAllByRole("button")).toHaveLength(3);

    rerender(
      <MemoryRouter>
        <OrganizerAIChatWidget scope="event" eventId="evt-3-starters" eventTitle="Concert" />
      </MemoryRouter>
    );
    expect(within(screen.getByTestId("organizer-suggested-questions-scroll")).getAllByRole("button")).toHaveLength(3);

    await i18n.changeLanguage("en");
    await waitFor(() => {
      expect(screen.getByTestId("organizer-suggestions-label").textContent).toContain("Suggestions:");
      expect(within(screen.getByTestId("organizer-suggested-questions-scroll")).getAllByRole("button")).toHaveLength(3);
    });
  });

  it("supports horizontal drag-to-scroll without scrollbar in compact mode and suppresses accidental click after drag", () => {
    renderWidget({ scope: "managed_events" });
    openWidget();

    const scrollStrip = screen.getByTestId("organizer-suggested-questions-scroll");
    expect(scrollStrip.className).toContain("no-scrollbar");
    expect(scrollStrip.className).toContain("overflow-x-auto");

    scrollStrip.scrollLeft = 40;
    const firstChip = within(scrollStrip).getAllByRole("button")[0];

    fireEvent.pointerDown(scrollStrip, { button: 0, pointerId: 1, clientX: 200, pointerType: "mouse" });
    fireEvent.pointerMove(scrollStrip, { pointerId: 1, clientX: 140, pointerType: "mouse" });
    expect(scrollStrip.scrollLeft).toBe(100);
    fireEvent.pointerUp(scrollStrip, { pointerId: 1, clientX: 140, pointerType: "mouse" });
    fireEvent.click(firstChip);

    const input = screen.getByPlaceholderText(/Hỏi về doanh thu/i) as HTMLTextAreaElement;
    expect(input.value).toBe("");
  });

  it("updates the 3 suggestion chips from server suggested_questions or client fallback and resets on New Chat", async () => {
    chatWithOrganizerAgent.mockResolvedValueOnce({
      conversation_id: "conv-suggest-1",
      reply: "**9 sự kiện** · 2 vé đã bán",
      status: "ok",
      pipeline_steps: [],
      actions: [],
      cards: [],
      totals: [],
      warnings: [],
      drafts: [],
      suggested_questions: [
        "Xem doanh thu theo ngày trong 7 ngày qua?",
        "So sánh doanh thu tuần này và tuần trước?",
        "Sự kiện nào đang cần chú ý hoặc có cảnh báo?",
      ],
      execution_time_ms: 60,
    });

    renderWidget({ scope: "managed_events" });
    openWidget();

    const input = screen.getByPlaceholderText(/Hỏi về doanh thu/i) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "Tôi đã bán được bao nhiêu vé và tổng doanh thu là bao nhiêu?" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));

    await screen.findByText(/2 vé đã bán/);
    await waitFor(() => {
      const chips = within(screen.getByTestId("organizer-suggested-questions-scroll")).getAllByRole("button");
      expect(chips.map((c) => c.textContent)).toEqual([
        "Xem doanh thu theo ngày trong 7 ngày qua?",
        "So sánh doanh thu tuần này và tuần trước?",
        "Sự kiện nào đang cần chú ý hoặc có cảnh báo?",
      ]);
    });

    // Legacy backend response without suggested_questions still derives contextual next questions
    chatWithOrganizerAgent.mockResolvedValueOnce({
      conversation_id: "conv-suggest-1",
      reply: "Chưa có cảnh báo nào.",
      status: "ok",
      pipeline_steps: [],
      actions: [],
      cards: [],
      totals: [],
      warnings: [],
      drafts: [],
      execution_time_ms: 50,
    });

    fireEvent.change(input, { target: { value: "Sự kiện nào đang cần chú ý hoặc có cảnh báo?" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));

    await screen.findByText("Chưa có cảnh báo nào.");
    await waitFor(() => {
      const chips = within(screen.getByTestId("organizer-suggested-questions-scroll")).getAllByRole("button");
      expect(chips).toHaveLength(3);
      expect(chips.some((c) => c.textContent?.includes("ngân sách quảng bá"))).toBe(true);
      expect(chips.every((c) => c.textContent !== "Sự kiện nào đang cần chú ý hoặc có cảnh báo?")).toBe(true);
    });

    // New chat restores the 3 starter questions
    fireEvent.click(screen.getByTestId("organizer-new-chat-header-btn"));
    await waitFor(() => {
      const chips = within(screen.getByTestId("organizer-suggested-questions-scroll")).getAllByRole("button");
      expect(chips).toHaveLength(3);
      expect(chips[0].textContent).toContain("Sự kiện nào bán chạy nhất");
    });
  });
});
