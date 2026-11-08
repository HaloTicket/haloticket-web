// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const searchEventsByNaturalLanguage = vi.fn();
const getAllEvents = vi.fn();

vi.mock("@/services/aiApi", () => ({ aiApi: { searchEventsByNaturalLanguage: (...a: unknown[]) => searchEventsByNaturalLanguage(...a) } }));
vi.mock("@/services/eventApi", () => ({ eventApi: { getAllEvents: (...a: unknown[]) => getAllEvents(...a) } }));
vi.mock("@/services/adminConfigApi", () => ({ adminConfigApi: { getCategories: vi.fn().mockResolvedValue([]) } }));
vi.mock("@/components/common/EventCard", () => ({ EventCard: ({ event }: { event: { title?: string } }) => <div data-testid="event-card">{event.title}</div> }));

import "@/i18n";
import EventSearch from "@/features/events/EventSearch";

const events = [
  { id: "1", title: "Rock Night", locationName: "HCM", address: "A", categoryName: "Nhạc" },
  { id: "2", title: "Jazz Evening", locationName: "HN", address: "B", categoryName: "Nhạc" },
];

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes><Route path="/search" element={<EventSearch />} /></Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  searchEventsByNaturalLanguage.mockReset();
  getAllEvents.mockReset();
  getAllEvents.mockResolvedValue(events);
});
afterEach(() => cleanup());

describe("EventSearch AI search failures", () => {
  it("falls back to keyword results, tells the user why, and offers a retry", async () => {
    searchEventsByNaturalLanguage.mockRejectedValueOnce({ response: { status: 503, data: { code: "AI_UNAVAILABLE" } } });
    renderAt("/search?q=rock&ai=true");

    const notice = await screen.findByRole("alert");
    expect(notice.textContent).toContain("Tìm kiếm AI tạm thời không dùng được");
    expect(notice.textContent).toContain("Dịch vụ AI tạm thời không khả dụng");
    // keyword search is applied, not the whole catalogue
    await waitFor(() => expect(screen.getAllByTestId("event-card").map(c => c.textContent)).toEqual(["Rock Night"]));

    searchEventsByNaturalLanguage.mockResolvedValueOnce({ query: "rock", total: 1, matches: [], events: [events[1]], search_mode: "vector", degraded: false });
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    await waitFor(() => expect(screen.getAllByTestId("event-card").map(c => c.textContent)).toEqual(["Jazz Evening"]));
    expect(screen.getByText("Chuyển về tìm từ khóa thường")).toBeTruthy();
  });

  it("shows the wait time for a rate limit", async () => {
    searchEventsByNaturalLanguage.mockRejectedValueOnce({ response: { status: 429, data: { code: "AI_RATE_LIMITED" }, headers: { "retry-after": "25" } } });
    renderAt("/search?q=rock");
    const notice = await screen.findByRole("alert");
    expect(notice.textContent).toContain("25 giây");
  });

  it("notes when the server answered with keyword results because AI search is degraded", async () => {
    searchEventsByNaturalLanguage.mockResolvedValueOnce({ query: "a b c", total: 1, matches: [], events: [events[0]], search_mode: "keyword", degraded: true });
    renderAt("/search?q=a%20b%20c&ai=true");
    await screen.findByText("Kết quả được tìm theo từ khóa vì tìm kiếm AI đang gián đoạn.");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
