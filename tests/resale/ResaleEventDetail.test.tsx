// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import ResaleEventDetail from "@/features/resale/ResaleEventDetail";
import { eventApi } from "@/services/eventApi";
import { marketplaceApi } from "@/services/marketplaceApi";

vi.mock("@/services/marketplaceApi");
vi.mock("@/services/eventApi");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderWithRoute(eventId: string) {
  return render(
    <MemoryRouter initialEntries={[`/resale-ticket/${eventId}`]}>
      <Routes>
        <Route path="/resale-ticket/:eventId" element={<ResaleEventDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ResaleEventDetail", () => {
  it("renders event title and listing card with Chọn vé button", async () => {
    vi.mocked(marketplaceApi.getEventListings).mockResolvedValue({
      content: [
        {
          id: "l1",
          ticketId: "t1",
          price: 350000,
          originalPrice: 400000,
          ticketTypeName: "VIP",
          status: "ACTIVE",
          section: "A",
          row: "3",
          seat: "12",
        } as any,
      ],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 20,
    });
    vi.mocked(eventApi.getEventById).mockResolvedValue({
      title: "Event A",
      startTime: "2026-11-01T18:00:00Z",
      locationName: "TP.HCM",
      posterImage: "https://example.com/poster.jpg",
    });

    renderWithRoute("event-1");

    await waitFor(() => expect(screen.getAllByText("Event A").length).toBeGreaterThanOrEqual(1));
    expect(screen.getByText("VIP")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Chọn vé/i })).toBeInTheDocument();
  });

  it("shows empty message when no listings", async () => {
    vi.mocked(marketplaceApi.getEventListings).mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 20,
    });
    vi.mocked(eventApi.getEventById).mockResolvedValue({
      title: "Event B",
      startTime: "2026-11-01T18:00:00Z",
      locationName: "Hà Nội",
    });

    renderWithRoute("event-2");

    await waitFor(() => expect(screen.getByText(/chưa có vé bán lại/i)).toBeInTheDocument());
  });
});
