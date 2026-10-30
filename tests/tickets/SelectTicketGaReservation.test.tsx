// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SelectTicket from "@/features/tickets/SelectTicket";
import { bookingApi } from "@/services/bookingApi";
import { eventApi } from "@/services/eventApi";
import { ticketApi } from "@/services/ticketApi";

const { config } = vi.hoisted(() => ({ config: { API_BASE_URL: "http://test/api", TIMEOUT: 1000, GA_RESERVATION_ENABLED: false } }));
vi.mock("@/config", () => ({ CONFIG: config }));
vi.mock("@/services/eventApi");
vi.mock("@/services/ticketApi");
vi.mock("@/services/bookingApi");
vi.mock("@/services/keycloakSession", () => ({
  getKeycloakSession: () => ({ isAuthenticated: () => true }),
}));
vi.mock("@stomp/stompjs", () => ({
  Client: class {
    activate() {}
    deactivate() {}
  },
}));

const navigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

const GA_TIER = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  localStorage.clear();
  vi.mocked(eventApi.getEventById).mockResolvedValue({
    id: "event-1", title: "Event X", showtimes: [{ id: "show-1", name: "Night 1" }],
  } as never);
  vi.mocked(ticketApi.getSeatLayoutByEventId).mockResolvedValue(null as never);
  vi.mocked(ticketApi.getTicketTypesByShowtimeId).mockResolvedValue([
    { id: GA_TIER, name: "Standard", price: 100000, totalQuantity: 50, availableQuantity: 3, minPerOrder: 1, maxPerOrder: 5 },
  ] as never);
  vi.mocked(ticketApi.getTicketTypesByEventId).mockResolvedValue([] as never);
  vi.mocked(bookingApi.holdSeat).mockResolvedValue(true);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  config.GA_RESERVATION_ENABLED = false;
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/events/event-1/select-ticket"]}>
      <Routes><Route path="/events/:id/select-ticket" element={<SelectTicket />} /></Routes>
    </MemoryRouter>,
  );
}

async function pickTwoTickets() {
  const plus = await screen.findByRole("button", { name: "+" });
  fireEvent.click(plus); // min per order = 1
  fireEvent.click(plus);
  fireEvent.click(await screen.findByRole("button", { name: /Tiếp tục thanh toán/ }));
}

function pendingOrder() {
  return JSON.parse(localStorage.getItem("haloticket_pending_order") as string);
}

describe("SelectTicket general-admission order", () => {
  it("with stock holds on: sends quantities only, no virtual seats, no seat holds", async () => {
    config.GA_RESERVATION_ENABLED = true;
    renderPage();
    await pickTwoTickets();

    await waitFor(() => expect(localStorage.getItem("haloticket_pending_order")).not.toBeNull());
    const order = pendingOrder();
    expect(order.seatIds).toEqual([]);
    expect(order.items).toEqual([{ ticketTypeId: GA_TIER, quantity: 2, unitPrice: 100000, generalAdmission: true }]);
    expect(JSON.stringify(order)).not.toContain("-STT-");
    expect(bookingApi.holdSeat).not.toHaveBeenCalled();
  });

  it("with stock holds on: shows the real remaining count and refuses to go past it", async () => {
    config.GA_RESERVATION_ENABLED = true;
    renderPage();

    expect(await screen.findByText(/Còn mua được: 3 vé/)).toBeInTheDocument();
    const plus = screen.getByRole("button", { name: "+" });
    for (let i = 0; i < 4; i++) fireEvent.click(plus); // 1, 2, 3, then refused
    expect(await screen.findByText(/chỉ còn 3 vé/)).toBeInTheDocument();
  });

  it("with stock holds off: behaves as before (virtual -STT- seats held one by one)", async () => {
    renderPage();
    await pickTwoTickets();

    await waitFor(() => expect(localStorage.getItem("haloticket_pending_order")).not.toBeNull());
    const order = pendingOrder();
    expect(order.seatIds).toHaveLength(2);
    expect(order.seatIds.every((id: string) => id.startsWith(`${GA_TIER}-STT-`))).toBe(true);
    expect(order.items[0]).not.toHaveProperty("generalAdmission");
    expect(bookingApi.holdSeat).toHaveBeenCalledTimes(2);
    // the buyable count is shown whatever the flag says; it is the server's availableQuantity
    expect(await screen.findByText(/Còn mua được: 3 vé/)).toBeInTheDocument();
  });
});
