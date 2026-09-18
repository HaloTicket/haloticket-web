// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import ResaleTicketCheckout from "@/features/resale/ResaleTicketCheckout";
import { eventApi } from "@/services/eventApi";
import { marketplaceApi } from "@/services/marketplaceApi";

vi.mock("@/services/marketplaceApi");
vi.mock("@/services/eventApi");
vi.mock("@/services/paymentApi");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderCheckout(eventId = "e1", ticketId = "l1") {
  return render(
    <MemoryRouter initialEntries={[`/resale-ticket/${eventId}/ticket/${ticketId}`]}>
      <Routes>
        <Route path="/resale-ticket/:eventId/ticket/:ticketId" element={<ResaleTicketCheckout />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ResaleTicketCheckout", () => {
  it("renders ticket info and disabled Giữ vé until terms agreed", async () => {
    vi.mocked(marketplaceApi.getListing).mockResolvedValue({
      id: "l1",
      ticketId: "t1",
      price: 250000,
      ticketTypeName: "GA",
      status: "ACTIVE",
    } as any);
    vi.mocked(eventApi.getEventById).mockResolvedValue({
      title: "Event X",
    } as any);

    renderCheckout();

    await waitFor(() => expect(screen.getAllByText("Event X").length).toBeGreaterThanOrEqual(1));
    expect(screen.getByText(/GA/)).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /Giữ vé/i });
    expect(btn).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(btn).not.toBeDisabled();
  });

  it("shows reservation info and payment method selector after reserving", async () => {
    vi.mocked(marketplaceApi.getListing).mockResolvedValue({
      id: "l1",
      ticketId: "t1",
      price: 250000,
      ticketTypeName: "GA",
      status: "ACTIVE",
    } as any);
    vi.mocked(eventApi.getEventById).mockResolvedValue({
      title: "Event X",
    } as any);
    vi.mocked(marketplaceApi.reserveListing).mockResolvedValue({
      transactionId: "txn-1",
      listingId: "l1",
      status: "PENDING_PAYMENT",
      amount: 250000,
      currency: "VND",
      reservationExpiresAt: new Date(Date.now() + 900000).toISOString(),
    } as any);

    renderCheckout();

    await waitFor(() => expect(screen.getByRole("checkbox")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Giữ vé/i }));

    await waitFor(() => expect(screen.getByText(/txn-1/)).toBeInTheDocument());
    expect(screen.getByText("VNPAY")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Thanh toán/i })).toBeInTheDocument();
  });
});
