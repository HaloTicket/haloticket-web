// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const searchEventsByNaturalLanguage = vi.fn();
const searchEvents = vi.fn();

vi.mock("@/services/aiApi", () => ({ aiApi: { searchEventsByNaturalLanguage: (...a: unknown[]) => searchEventsByNaturalLanguage(...a) } }));
vi.mock("@/services/eventApi", () => ({ eventApi: { searchEvents: (...a: unknown[]) => searchEvents(...a) } }));
vi.mock("@/services/adminConfigApi", () => ({
  adminConfigApi: { getCategories: vi.fn().mockResolvedValue([{ id: "c1", name: "Nhạc", slug: "nhac", active: true, status: "ACTIVE" }]) },
}));
vi.mock("@/components/common/EventCard", () => ({ EventCard: ({ event }: { event: { title?: string } }) => <div data-testid="event-card">{event.title}</div> }));

import "@/i18n";
import EventSearch from "@/features/events/EventSearch";

const page = (titles: string[], total = titles.length, pageNumber = 0) => ({
  content: titles.map((title, i) => ({ id: `${pageNumber}-${i}`, title })),
  page: pageNumber,
  size: 12,
  totalElements: total,
  totalPages: Math.ceil(total / 12),
});

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.search}</div>;
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/search" element={<><EventSearch /><Where /></>} />
        <Route path="/category/:slug" element={<><EventSearch /><Where /></>} />
      </Routes>
    </MemoryRouter>
  );
}

const titles = () => screen.queryAllByTestId("event-card").map((c) => c.textContent);
const lastParams = () => searchEvents.mock.calls[searchEvents.mock.calls.length - 1][0] as Record<string, unknown>;

beforeEach(() => {
  searchEventsByNaturalLanguage.mockReset();
  searchEventsByNaturalLanguage.mockResolvedValue({ query: "", total: 0, matches: [], events: [], search_mode: "keyword", degraded: false });
  searchEvents.mockReset();
  searchEvents.mockResolvedValue(page(["A", "B", "C"]));
});
afterEach(() => cleanup());

describe("EventSearch server-side filters", () => {
  it("sends filters, keyword and sort to the server and shows the page it returns", async () => {
    renderAt("/search?q=rock&free=1&sort=priceAsc&category=K%E1%BB%8Bch&city=H%C3%A0%20N%E1%BB%99i");
    await waitFor(() => expect(titles()).toEqual(["A", "B", "C"]));
    expect(lastParams()).toMatchObject({ q: "rock", free: true, sort: "priceAsc", category: "Kịch", city: "Hà Nội", page: 0, size: 12 });
  });

  it("the location URL parameter is read like city", async () => {
    renderAt("/search?location=%C4%90%C3%A0%20L%E1%BA%A1t");
    await waitFor(() => expect(searchEvents).toHaveBeenCalled());
    expect(lastParams().city).toBe("Đà Lạt");
  });

  it("a custom date range becomes from and to dates", async () => {
    renderAt("/search?from=2026-12-10&to=2026-12-12");
    await waitFor(() => expect(searchEvents).toHaveBeenCalled());
    expect(lastParams()).toMatchObject({ from: "2026-12-10", to: "2026-12-12" });
  });

  it("a date preset becomes a concrete date range", async () => {
    renderAt("/search?date=today");
    await waitFor(() => expect(searchEvents).toHaveBeenCalled());
    const p = lastParams() as { from: string; to: string };
    expect(p.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(p.to).toBe(p.from);
  });

  it("changing the sort writes it to the URL and asks the server again", async () => {
    renderAt("/search");
    await waitFor(() => expect(titles()).toHaveLength(3));
    searchEvents.mockResolvedValue(page(["C", "B", "A"]));
    fireEvent.change(screen.getByLabelText("Sắp xếp"), { target: { value: "priceDesc" } });
    await waitFor(() => expect(titles()).toEqual(["C", "B", "A"]));
    expect(screen.getByTestId("where").textContent).toContain("sort=priceDesc");
    expect(lastParams().sort).toBe("priceDesc");
  });

  it("the free switch in the filter dialog is sent to the server and survives reopening", async () => {
    renderAt("/search");
    await waitFor(() => expect(titles()).toHaveLength(3));

    fireEvent.click(screen.getByRole("button", { name: "Bộ lọc" }));
    fireEvent.click(screen.getByRole("switch", { name: "Chỉ hiện sự kiện miễn phí" }));
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng" }));

    await waitFor(() => expect(lastParams().free).toBe(true));
    expect(screen.getByTestId("where").textContent).toContain("free=1");

    fireEvent.click(screen.getByRole("button", { name: "Bộ lọc" }));
    expect(screen.getByRole("switch", { name: "Chỉ hiện sự kiện miễn phí" }).getAttribute("aria-checked")).toBe("true");
  });

  it("clearing the filters removes them from the URL and the request", async () => {
    renderAt("/search?category=K%E1%BB%8Bch&free=1");
    await waitFor(() => expect(searchEvents).toHaveBeenCalled());
    fireEvent.click(screen.getAllByRole("button", { name: /Xóa bộ lọc/ })[0]);
    await waitFor(() => expect(lastParams().free).toBeUndefined());
    expect(lastParams().category).toBeUndefined();
    expect(screen.getByTestId("where").textContent).toBe("");
  });

  it("a category route sends the category id once categories are known", async () => {
    renderAt("/category/nhac");
    await waitFor(() => expect(searchEvents).toHaveBeenCalled());
    expect(lastParams().categoryId).toBe("c1");
    // không có yêu cầu nào được gửi khi chưa biết danh mục của route
    expect(searchEvents.mock.calls.every((c) => (c[0] as { categoryId?: string }).categoryId === "c1")).toBe(true);
  });

  it("an AI search with no result no longer shows the whole catalogue", async () => {
    searchEventsByNaturalLanguage.mockResolvedValue({ query: "zzzz", total: 0, matches: [], events: [], search_mode: "vector", degraded: false });
    searchEvents.mockResolvedValue(page([]));
    renderAt("/search?q=zzzz&ai=true");
    await waitFor(() => expect(screen.getByText("Không có sự kiện phù hợp với tìm kiếm của bạn.")).toBeTruthy());
    expect(lastParams().q).toBe("zzzz");
    expect(titles()).toEqual([]);
  });

  it("an empty result with filters offers to clear them", async () => {
    searchEvents.mockResolvedValueOnce(page([]));
    renderAt("/search?free=1");
    await screen.findByText("Không có sự kiện phù hợp với tìm kiếm của bạn.");
    searchEvents.mockResolvedValue(page(["A", "B", "C"]));
    const box = screen.getByText("Không có sự kiện phù hợp với tìm kiếm của bạn.").parentElement as HTMLElement;
    fireEvent.click(within(box).getByRole("button", { name: "Xóa bộ lọc" }));
    await waitFor(() => expect(titles()).toHaveLength(3));
  });

  it("a load failure shows an error with retry instead of an empty list", async () => {
    searchEvents.mockRejectedValueOnce(new Error("network"));
    renderAt("/search");
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Không tải được danh sách sự kiện");

    fireEvent.click(within(alert).getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(titles()).toHaveLength(3));
  });

  it("show more asks the server for the next page and appends it", async () => {
    searchEvents.mockImplementation(async (params: { page?: number }) =>
      page(Array.from({ length: params.page === 2 ? 6 : 12 }, (_, i) => `P${params.page ?? 0}-${i}`), 30, params.page ?? 0)
    );
    renderAt("/search");
    await waitFor(() => expect(titles()).toHaveLength(12));
    expect(screen.getByRole("button", { name: /Xem thêm \(18\)/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Xem thêm/ }));
    await waitFor(() => expect(titles()).toHaveLength(24));
    expect(lastParams().page).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: /Xem thêm/ }));
    await waitFor(() => expect(titles()).toHaveLength(30));
    expect(lastParams().page).toBe(2);
    expect(screen.queryByRole("button", { name: /Xem thêm/ })).toBeNull();
  });

  it("a failed show-more keeps the list and offers another try", async () => {
    searchEvents.mockImplementation(async (params: { page?: number }) => {
      if (params.page === 1) throw new Error("boom");
      return page(Array.from({ length: 12 }, (_, i) => `P${i}`), 30);
    });
    renderAt("/search");
    await waitFor(() => expect(titles()).toHaveLength(12));
    fireEvent.click(screen.getByRole("button", { name: /Xem thêm/ }));
    await screen.findByText("Không tải thêm được. Vui lòng thử lại.");
    expect(titles()).toHaveLength(12);
    expect(screen.getByRole("button", { name: /Xem thêm/ })).toBeTruthy();
  });
});
