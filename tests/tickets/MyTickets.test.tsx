// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import MyTickets from "@/features/tickets/MyTickets";
import { ticketApi } from "@/services/ticketApi";

vi.mock("@/services/ticketApi", () => ({
  ticketApi: {
    getMyTickets: vi.fn().mockResolvedValue([
      {
        id: "ticket-1",
        bookingCode: "BOOKING-1",
        eventId: "event-1",
        ticketTypeName: "VIP",
        price: 120000,
        status: "VALID",
        qrCode: "qr-ticket-1",
        issuedAt: "2026-09-15T10:00:00Z",
      },
    ]),
  },
}));

vi.mock("@/services/eventApi", () => ({
  eventApi: {
    getEventById: vi.fn().mockResolvedValue({
      id: "event-1",
      title: "Concert IUH Day 2",
      startTime: "2026-09-20T10:26:00Z",
      locationName: "SVD Quan Khu 7",
      posterImage: "https://example.com/poster.jpg",
    }),
  },
}));

afterEach(() => cleanup());

describe("MyTickets", () => {
  it("presents an upcoming ticket with one primary view action and a secondary action menu", async () => {
    render(
      <MemoryRouter>
        <MyTickets embedded />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("Concert IUH Day 2")).toBeInTheDocument());

    expect(within(screen.getByRole("article")).getByText("Sắp diễn ra")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xem vé" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thao tác với vé" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Xem QR" })).not.toBeInTheDocument();
  });

  it("does not expose a check-in QR for a used ticket", async () => {
    vi.mocked(ticketApi.getMyTickets).mockResolvedValueOnce([
      {
        id: "ticket-used",
        bookingCode: "BOOKING-USED",
        eventId: "event-1",
        ticketTypeName: "VIP",
        price: 120000,
        status: "USED",
        qrCode: "qr-ticket-used",
        issuedAt: "2026-09-15T10:00:00Z",
      },
    ]);

    render(
      <MemoryRouter>
        <MyTickets embedded />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "Xem vé" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Xem vé" }));

    expect(screen.getByText("Mã QR hiện không khả dụng")).toBeInTheDocument();
    expect(screen.queryByAltText("Mã QR check-in")).not.toBeInTheDocument();
  });
});
