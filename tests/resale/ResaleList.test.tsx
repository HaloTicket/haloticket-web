// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import ResaleList from "@/features/resale/ResaleList";

vi.mock("@/services/marketplaceApi", () => ({
  marketplaceApi: {
    getResaleEvents: vi.fn().mockResolvedValue([
      { eventId: "event-1", activeListings: 2, minPrice: 96000 },
    ]),
  },
}));

vi.mock("@/services/eventApi", () => ({
  eventApi: {
    getEventById: vi.fn().mockResolvedValue({
      id: "event-1",
      title: "Concert Database",
      startTime: "2026-09-20T10:00:00Z",
      locationName: "Nhà hát Thành phố",
      posterImage: "https://example.com/poster.jpg",
    }),
  },
}));

afterEach(() => cleanup());

describe("ResaleList", () => {
  it("renders resale events from marketplace and event services", async () => {
    render(<MemoryRouter><ResaleList /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText("Concert Database")).toBeInTheDocument());
    expect(screen.getByText("2 vé đang bán")).toBeInTheDocument();
    expect(screen.getByText("Từ 96.000 ₫")).toBeInTheDocument();
  });
});
