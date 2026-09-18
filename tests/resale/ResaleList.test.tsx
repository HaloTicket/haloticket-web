// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import ResaleList from "@/features/resale/ResaleList";
import { marketplaceApi } from "@/services/marketplaceApi";
import { eventApi } from "@/services/eventApi";

vi.mock("@/services/marketplaceApi");
vi.mock("@/services/eventApi");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ResaleList", () => {
  it("shows skeletons while loading", () => {
    vi.mocked(marketplaceApi.getResaleEvents).mockReturnValue(new Promise(() => {}));
    const { container } = render(
      <MemoryRouter>
        <ResaleList />
      </MemoryRouter>
    );
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows empty state when no events exist", async () => {
    vi.mocked(marketplaceApi.getResaleEvents).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <ResaleList />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText(/Hiện chưa có vé bán lại/i)).toBeInTheDocument());
  });

  it("shows no-match state and clear filter button when query has no results", async () => {
    vi.mocked(marketplaceApi.getResaleEvents).mockResolvedValue([
      { eventId: "e1", activeListings: 2, minPrice: 100000 },
    ]);
    vi.mocked(eventApi.getEventById).mockResolvedValue({
      id: "e1",
      title: "Concert ABC",
      startTime: "2026-10-10T19:00:00Z",
      locationName: "Sân vận động",
    });

    render(
      <MemoryRouter>
        <ResaleList />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Concert ABC")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/Tìm theo tên sự kiện/i), {
      target: { value: "zzznomatch" },
    });

    expect(screen.getByText(/Xóa bộ lọc/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Xóa bộ lọc/i));
    expect(screen.getByText("Concert ABC")).toBeInTheDocument();
  });

  it("renders resale events from marketplace and event services", async () => {
    vi.mocked(marketplaceApi.getResaleEvents).mockResolvedValue([
      { eventId: "event-1", activeListings: 2, minPrice: 96000 },
    ]);
    vi.mocked(eventApi.getEventById).mockResolvedValue({
      id: "event-1",
      title: "Concert Database",
      startTime: "2026-09-20T10:00:00Z",
      locationName: "Nhà hát Thành phố",
      posterImage: "https://example.com/poster.jpg",
    });

    render(
      <MemoryRouter>
        <ResaleList />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Concert Database")).toBeInTheDocument());
    expect(screen.getByText("2 vé đang bán")).toBeInTheDocument();
    expect(screen.getByText("Từ 96.000 ₫")).toBeInTheDocument();
  });
});
