// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";

const getEventById = vi.fn();
const getMyRoleInEvent = vi.fn();
const getMyEvents = vi.fn();
const isAdminToken = vi.fn();

vi.mock("@/services/eventApi", () => ({
  eventApi: {
    getEventById: (...args: unknown[]) => getEventById(...args),
    getMyRoleInEvent: (...args: unknown[]) => getMyRoleInEvent(...args),
    getMyEvents: (...args: unknown[]) => getMyEvents(...args),
    getAllEvents: vi.fn().mockResolvedValue([]),
    cancelApprovalRequest: vi.fn(),
  },
}));

vi.mock("@/utils/adminAccess", () => ({
  isAdminToken: () => isAdminToken(),
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn(), theme: "light" }),
}));

vi.mock("@/hooks/useNotificationSocket", () => ({
  useNotificationSocket: () => ({
    notifications: [],
    unreadCount: 0,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    latestToast: null,
    clearToast: vi.fn(),
  }),
}));

vi.mock("@/services/ekycApi", () => ({
  ekycApi: {
    getStatus: vi.fn().mockResolvedValue({}),
    getOrganizerEligibility: vi.fn().mockResolvedValue({ eligible: true }),
  },
}));

vi.mock("@/components/common/OrganizerAIChatWidget/OrganizerAIChatWidget", () => ({
  OrganizerAIChatWidget: ({ scope, eventId, eventTitle }: { scope?: string; eventId?: string; eventTitle?: string }) => (
    <div
      data-testid="organizer-ai-chat-widget-mock"
      data-scope={scope}
      data-event-id={eventId}
      data-event-title={eventTitle}
    >
      Mock OrganizerAIChatWidget
    </div>
  ),
}));

import "@/i18n";
import EventManageLayout from "@/layouts/EventManageLayout";
import MyEvents from "@/features/organizer/MyEvents";

beforeEach(() => {
  getEventById.mockReset().mockResolvedValue({ title: "Đại nhạc hội 2026" });
  getMyRoleInEvent.mockReset();
  getMyEvents.mockReset().mockResolvedValue([]);
  isAdminToken.mockReset().mockReturnValue(false);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("EventManageLayout Chatbot Wiring", () => {
  it("never labels event B with the previously loaded event A title", async () => {
    getMyRoleInEvent.mockResolvedValue("OWNER");
    getEventById.mockImplementation((id: string) => id === "evt-A"
      ? Promise.resolve({ title: "Sự kiện A" })
      : new Promise(() => {}));
    const NavigateToB = () => {
      const navigate = useNavigate();
      return <button onClick={() => navigate("/organizer/events/evt-B/manage/overview")}>Next event</button>;
    };
    render(
      <MemoryRouter initialEntries={["/organizer/events/evt-A/manage/overview"]}>
        <Routes>
          <Route path="/organizer/events/:eventId/manage" element={<EventManageLayout />}>
            <Route path="overview" element={<NavigateToB />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect((await screen.findByTestId("organizer-ai-chat-widget-mock")).getAttribute("data-event-title")).toBe("Sự kiện A");
    fireEvent.click(screen.getByRole("button", { name: "Next event" }));
    const widgetB = await screen.findByTestId("organizer-ai-chat-widget-mock");
    expect(widgetB.getAttribute("data-event-id")).toBe("evt-B");
    expect(widgetB.getAttribute("data-event-title")).not.toBe("Sự kiện A");
  });

  it("does not render OrganizerAIChatWidget before management permissions have loaded", () => {
    // getMyRoleInEvent never resolves immediately
    getMyRoleInEvent.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={["/organizer/events/evt-1/manage/overview"]}>
        <Routes>
          <Route path="/organizer/events/:eventId/manage" element={<EventManageLayout />}>
            <Route path="overview" element={<div>Overview Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId("organizer-ai-chat-widget-mock")).toBeNull();
  });

  it("renders OrganizerAIChatWidget with scope='event' when management permissions load for OWNER, ADMIN, or MANAGER", async () => {
    getMyRoleInEvent.mockResolvedValue("OWNER");

    render(
      <MemoryRouter initialEntries={["/organizer/events/evt-1/manage/overview"]}>
        <Routes>
          <Route path="/organizer/events/:eventId/manage" element={<EventManageLayout />}>
            <Route path="overview" element={<div>Overview Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    const widget = await screen.findByTestId("organizer-ai-chat-widget-mock");
    expect(widget).toBeTruthy();
    expect(widget.getAttribute("data-scope")).toBe("event");
    expect(widget.getAttribute("data-event-id")).toBe("evt-1");
  });

  it("does not render OrganizerAIChatWidget for CHECKIN_STAFF without management permissions", async () => {
    getMyRoleInEvent.mockResolvedValue("CHECKIN_STAFF");

    render(
      <MemoryRouter initialEntries={["/organizer/events/evt-1/manage/checkin"]}>
        <Routes>
          <Route path="/organizer/events/:eventId/manage" element={<EventManageLayout />}>
            <Route path="checkin" element={<div>Checkin Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Wait for role check to complete
    await screen.findByText("Checkin Content");
    expect(screen.queryByTestId("organizer-ai-chat-widget-mock")).toBeNull();
  });

  it("renders OrganizerAIChatWidget if user has admin token even if event role is null", async () => {
    isAdminToken.mockReturnValue(true);
    getMyRoleInEvent.mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={["/organizer/events/evt-1/manage/overview"]}>
        <Routes>
          <Route path="/organizer/events/:eventId/manage" element={<EventManageLayout />}>
            <Route path="overview" element={<div>Overview Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    const widget = await screen.findByTestId("organizer-ai-chat-widget-mock");
    expect(widget).toBeTruthy();
    expect(widget.getAttribute("data-scope")).toBe("event");
  });

  it("regression: late role/title fetch for event A cannot overwrite event B when navigating", async () => {
    let resolveEventA: (val: unknown) => void = () => {};
    let resolveRoleA: (val: unknown) => void = () => {};

    getMyRoleInEvent.mockImplementation((id: string) => {
      if (id === "evt-A") {
        return new Promise((res) => {
          resolveRoleA = res;
        });
      }
      return Promise.resolve("OWNER");
    });

    getEventById.mockImplementation((id: string) => {
      if (id === "evt-A") {
        return new Promise((res) => {
          resolveEventA = res;
        });
      }
      return Promise.resolve({ title: "Sự kiện B Hợp Lệ" });
    });

    const NavHelper = () => {
      const navigate = useNavigate();
      return (
        <button
          type="button"
          data-testid="nav-to-b"
          onClick={() => navigate("/organizer/events/evt-B/manage/overview")}
        >
          Go to B
        </button>
      );
    };

    render(
      <MemoryRouter initialEntries={["/organizer/events/evt-A/manage/overview"]}>
        <Routes>
          <Route path="/organizer/events/:eventId/manage" element={<EventManageLayout />}>
            <Route path="overview" element={<div>Overview Content <NavHelper /></div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Widget should not be rendered yet for A
    expect(screen.queryByTestId("organizer-ai-chat-widget-mock")).toBeNull();

    // Now navigate to event B via client-side router navigation
    fireEvent.click(screen.getByTestId("nav-to-b"));

    // Event B resolves quickly
    const widgetB = await screen.findByTestId("organizer-ai-chat-widget-mock");
    expect(widgetB.getAttribute("data-event-id")).toBe("evt-B");
    expect(widgetB.getAttribute("data-event-title")).toBe("Sự kiện B Hợp Lệ");

    // Now event A resolves late
    resolveEventA({ title: "Sự kiện A Cũ" });
    resolveRoleA("CHECKIN_STAFF");

    // Give microtasks time to execute
    await new Promise((r) => setTimeout(r, 50));

    // The widget must STILL belong to B, and must NOT be overwritten by A!
    const widgetAfter = screen.getByTestId("organizer-ai-chat-widget-mock");
    expect(widgetAfter.getAttribute("data-event-id")).toBe("evt-B");
    expect(widgetAfter.getAttribute("data-event-title")).toBe("Sự kiện B Hợp Lệ");
  });
});

describe("MyEvents Chatbot Wiring", () => {
  it("renders OrganizerAIChatWidget with scope='managed_events'", async () => {
    render(
      <MemoryRouter>
        <MyEvents />
      </MemoryRouter>
    );

    const widget = await screen.findByTestId("organizer-ai-chat-widget-mock");
    expect(widget).toBeTruthy();
    expect(widget.getAttribute("data-scope")).toBe("managed_events");
  });
});
