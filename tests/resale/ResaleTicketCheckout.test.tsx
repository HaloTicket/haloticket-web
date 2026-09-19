// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import ResaleTicketCheckout from "@/features/resale/ResaleTicketCheckout";
import { eventApi } from "@/services/eventApi";
import { marketplaceApi } from "@/services/marketplaceApi";
import { paymentApi } from "@/services/paymentApi";

vi.mock("@/services/marketplaceApi");
vi.mock("@/services/eventApi");
vi.mock("@/services/paymentApi");

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const listing = { id: "listing-1", ticketId: "ticket-1", price: 250000, quantity: 1, ticketTypeName: "GA", status: "ACTIVE" };
const reservation = {
  transactionId: "transaction-1", listingId: "listing-1", status: "PENDING_PAYMENT",
  amount: 250000, currency: "VND", reservationExpiresAt: new Date(Date.now() + 600000).toISOString(),
};

function renderCheckout() {
  vi.mocked(marketplaceApi.getListing).mockResolvedValue(listing as any);
  vi.mocked(eventApi.getEventById).mockResolvedValue({ title: "Event X", customQuestions: [] } as any);
  vi.mocked(marketplaceApi.reserveListing).mockResolvedValue(reservation as any);
  return render(
    <MemoryRouter initialEntries={["/resale-ticket/event-1/ticket/listing-1"]}>
      <Routes><Route path="/resale-ticket/:eventId/ticket/:ticketId" element={<ResaleTicketCheckout />} /></Routes>
    </MemoryRouter>,
  );
}

describe("ResaleTicketCheckout payment contract", () => {
  it("uses the marketplace transaction as the payment booking id", async () => {
    vi.mocked(marketplaceApi.startResalePayment).mockResolvedValue({
      transactionId: "transaction-1", amount: 250000, currency: "VND", expiresAt: reservation.reservationExpiresAt,
    });
    vi.mocked(paymentApi.createVnPayUrl).mockResolvedValue(undefined as any);
    renderCheckout();

    fireEvent.click(await screen.findByRole("checkbox", { name: /Tôi đã đọc và đồng ý/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Tiếp tục" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    fireEvent.click(await screen.findByRole("button", { name: "Thanh toán" }));

    await waitFor(() => expect(marketplaceApi.startResalePayment).toHaveBeenCalledWith("transaction-1"));
    expect(paymentApi.createVnPayUrl).toHaveBeenCalledWith(250000, expect.any(String), "transaction-1");
  });

  it("stops before the gateway when marketplace cannot start payment", async () => {
    vi.mocked(marketplaceApi.startResalePayment).mockRejectedValue({ response: { status: 404 } });
    renderCheckout();

    fireEvent.click(await screen.findByRole("checkbox", { name: /Tôi đã đọc và đồng ý/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Tiếp tục" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    fireEvent.click(await screen.findByRole("button", { name: "Thanh toán" }));

    expect(await screen.findByText(/Không thể khởi tạo thanh toán/i)).toBeInTheDocument();
    expect(paymentApi.createVnPayUrl).not.toHaveBeenCalled();
  });
});
