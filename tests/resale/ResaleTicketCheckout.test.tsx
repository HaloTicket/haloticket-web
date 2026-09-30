// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import ResaleTicketCheckout from "@/features/resale/ResaleTicketCheckout";
import { eventApi } from "@/services/eventApi";
import { marketplaceApi } from "@/services/marketplaceApi";
import { paymentApi } from "@/services/paymentApi";
import type { TicketListing, ResaleReservation } from "@/types/marketplace";

const { sessionState } = vi.hoisted(() => ({ sessionState: { authenticated: true } }));
vi.mock("@/services/marketplaceApi");
vi.mock("@/services/eventApi");
vi.mock("@/services/paymentApi");
vi.mock("@/services/keycloakSession", () => ({
  getKeycloakSession: () => ({ isAuthenticated: () => sessionState.authenticated }),
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); sessionState.authenticated = true; });

const listing: TicketListing = { id: "listing-1", ticketId: "ticket-1", price: 250000, quantity: 1, ticketTypeName: "GA", status: "ACTIVE" };
const reservation: ResaleReservation = {
  transactionId: "transaction-1", listingId: "listing-1", status: "PENDING_PAYMENT",
  amount: 250000, currency: "VND", reservationExpiresAt: new Date(Date.now() + 600000).toISOString(),
};

function renderCheckout(customListing: TicketListing = listing) {
  vi.mocked(marketplaceApi.getListing).mockResolvedValue(customListing);
  vi.mocked(eventApi.getEventById).mockResolvedValue({ title: "Event X", customQuestions: [] });
  vi.mocked(marketplaceApi.reserveListing).mockResolvedValue(reservation);
  return render(
    <MemoryRouter initialEntries={["/resale-ticket/event-1/ticket/listing-1"]}>
      <Routes><Route path="/resale-ticket/:eventId/ticket/:ticketId" element={<ResaleTicketCheckout />} /></Routes>
    </MemoryRouter>,
  );
}

async function chooseTicketAndReserve() {
  fireEvent.click(await screen.findByRole("checkbox", { name: "Chọn vé ticket-1" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /Tôi đã kiểm tra vé/ }));
  fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
  await waitFor(() => expect(marketplaceApi.reserveListing).toHaveBeenCalledWith("listing-1", undefined, ["ticket-1"]));
}

describe("ResaleTicketCheckout payment contract", () => {
  it("uses the marketplace transaction as the payment booking id", async () => {
    vi.mocked(marketplaceApi.startResalePayment).mockResolvedValue({
      transactionId: "transaction-1", amount: 250000, currency: "VND", expiresAt: reservation.reservationExpiresAt,
    });
    vi.mocked(paymentApi.createVnPayUrl).mockResolvedValue(null);
    renderCheckout();
    await chooseTicketAndReserve();

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
    await chooseTicketAndReserve();

    fireEvent.click(await screen.findByRole("checkbox", { name: /Tôi đã đọc và đồng ý/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Tiếp tục" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    fireEvent.click(await screen.findByRole("button", { name: "Thanh toán" }));

    expect(await screen.findByText(/Không thể khởi tạo thanh toán/i)).toBeInTheDocument();
    expect(paymentApi.createVnPayUrl).not.toHaveBeenCalled();
  });
});

it("does not reserve until an explicit ticket selection and continuation", async () => {
  renderCheckout();
  await screen.findByRole("heading", { name: "Chọn vé bán lại" });
  expect(marketplaceApi.reserveListing).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Tiếp tục" })).toBeDisabled();
});
it("does not start a countdown before the marketplace creates a reservation", async () => {
  const interval = vi.spyOn(globalThis, "setInterval");
  renderCheckout();
  await screen.findByRole("heading", { name: "Chọn vé bán lại" });
  expect(interval.mock.calls.some(([, delay]) => delay === 1000)).toBe(false);
  interval.mockRestore();
});
it("prompts unauthenticated buyers to sign in without reserving or leaving checkout", async () => {
  sessionState.authenticated = false;
  renderCheckout();
  fireEvent.click(await screen.findByRole("checkbox", { name: "Chọn vé ticket-1" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /Tôi đã kiểm tra vé/ }));
  fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));

  expect(await screen.findByRole("dialog")).toHaveTextContent("Đăng nhập để mua vé");
  expect(marketplaceApi.reserveListing).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Ở lại trang" }));
  expect(screen.getByRole("heading", { name: "Chọn vé bán lại" })).toBeInTheDocument();
  expect(marketplaceApi.reserveListing).not.toHaveBeenCalled();
});
it("requires all actual member tickets for a non-retail bundle", async () => {
  renderCheckout({ ...listing, quantity: 2, allowRetail: false, ticketIds: ["ticket-1", "ticket-2"], tickets: [{ ticketId: "ticket-1", seat: "A1" }, { ticketId: "ticket-2", seat: "A2" }] } as typeof listing);
  expect(await screen.findByRole("checkbox", { name: "Chọn vé A1" })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: "Chọn vé A2" })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: /Tôi đã kiểm tra vé/ }));
  fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
  await waitFor(() => expect(marketplaceApi.reserveListing).toHaveBeenCalledWith("listing-1", undefined, ["ticket-1", "ticket-2"]));
});
it("sends only selected member IDs for a retail listing", async () => {
  renderCheckout({ ...listing, quantity: 2, allowRetail: true, ticketIds: ["ticket-1", "ticket-2"], tickets: [{ ticketId: "ticket-1", seat: "A1" }, { ticketId: "ticket-2", seat: "A2" }] } as typeof listing);
  fireEvent.click(await screen.findByRole("checkbox", { name: "Chọn vé A2" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /Tôi đã kiểm tra vé/ }));
  fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
  await waitFor(() => expect(marketplaceApi.reserveListing).toHaveBeenCalledWith("listing-1", undefined, ["ticket-2"]));
});
