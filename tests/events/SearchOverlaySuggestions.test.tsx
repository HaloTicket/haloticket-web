// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const searchEvents = vi.fn();
const getAllEvents = vi.fn();

vi.mock("@/services/eventApi", () => ({
  eventApi: {
    searchEvents: (...a: unknown[]) => searchEvents(...a),
    getAllEvents: (...a: unknown[]) => getAllEvents(...a),
    getTrendingSearches: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock("@/services/adminConfigApi", () => ({ adminConfigApi: { getCategories: vi.fn().mockResolvedValue([]) } }));

import "@/i18n";
import SearchOverlayModal from "@/components/SearchOverlayModal";

function renderModal(query: string, isOpen = true) {
  return render(
    <MemoryRouter>
      <SearchOverlayModal isOpen={isOpen} onClose={() => {}} searchQuery={query} onSelectKeyword={() => {}} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  searchEvents.mockReset();
  getAllEvents.mockReset();
  getAllEvents.mockResolvedValue([]);
  searchEvents.mockResolvedValue({
    content: [{ id: "e1", title: "Đêm nhạc Hoàng Dũng", city: "Hồ Chí Minh", startTime: "2026-12-05T19:30:00", image: "x.png" }],
    page: 0, size: 5, totalElements: 1, totalPages: 1,
  });
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(400); });

describe("SearchOverlayModal suggestions", () => {
  it("suggests events for the text being typed, after the user pauses", async () => {
    const { rerender } = renderModal("");
    rerender(
      <MemoryRouter>
        <SearchOverlayModal isOpen onClose={() => {}} searchQuery="hoang dung" onSelectKeyword={() => {}} />
      </MemoryRouter>
    );
    // chưa ngừng gõ thì chưa gửi yêu cầu
    expect(searchEvents).not.toHaveBeenCalled();
    await settle();

    expect(searchEvents).toHaveBeenCalledTimes(1);
    expect(searchEvents).toHaveBeenCalledWith({ q: "hoang dung", size: 5 });
    expect(screen.getByRole("option", { name: /Đêm nhạc Hoàng Dũng/ }).getAttribute("href")).toBe("/events/e1");
    expect(screen.getByText(/Xem tất cả kết quả cho/)).toBeTruthy();
  });

  it("does not ask the server for fewer than two characters or when closed", async () => {
    const { rerender } = renderModal("h");
    await settle();
    expect(searchEvents).not.toHaveBeenCalled();

    rerender(
      <MemoryRouter>
        <SearchOverlayModal isOpen={false} onClose={() => {}} searchQuery="hoang" onSelectKeyword={() => {}} />
      </MemoryRouter>
    );
    await settle();
    expect(searchEvents).not.toHaveBeenCalled();
  });

  it("a failing suggestion request just hides the suggestions", async () => {
    searchEvents.mockRejectedValue(new Error("network"));
    renderModal("hoang");
    await settle();
    expect(screen.queryByRole("option")).toBeNull();
  });

  it("does not load the whole event list just because the page opened", async () => {
    renderModal("", false);
    await settle();
    expect(getAllEvents).not.toHaveBeenCalled();
  });
});
