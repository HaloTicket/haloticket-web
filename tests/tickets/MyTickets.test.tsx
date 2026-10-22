// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import MyTickets, { TicketViewer, type OrderGroup, type TicketItem } from "@/features/tickets/MyTickets";
import { OrderCard } from "@/features/tickets/OrderCard";
import { ticketApi } from "@/services/ticketApi";

vi.mock("@/services/ticketApi", () => ({ ticketApi: { getMyTickets: vi.fn().mockResolvedValue([]) } }));
vi.mock("@/services/marketplaceApi", () => ({ marketplaceApi: { getMyGiftInvitations: vi.fn().mockResolvedValue([]) } }));
vi.mock("@/services/eventApi", () => ({
  eventApi: { getEventById: vi.fn().mockResolvedValue({ id: "event-1", title: "Concert IUH Day 2", startTime: "2099-09-20T10:26:00Z", endTime: "2099-09-20T14:26:00Z", locationName: "SVD Quan Khu 7" }) },
}));

afterEach(() => cleanup());

function CurrentPath() {
  return <output aria-label="Current path">{useLocation().pathname}</output>;
}

const makeTicket = (id: string, rawStatus: string, status: TicketItem["status"]): TicketItem => ({
  id, bookingCode: "BOOKING-1", hasBookingCode: true, eventId: "event-1", eventTitle: "Concert IUH Day 2",
  eventTime: "20/09/2026", eventLocation: "SVD Quan Khu 7", ticketTypeName: "VIP", quantity: 1,
  totalAmount: 120000, rawStatus, status,
});

describe("MyTickets", () => {
  it("shows current order navigation and menu for an upcoming ticket", async () => {
    vi.mocked(ticketApi.getMyTickets).mockResolvedValueOnce([{
      id: "ticket-1", bookingCode: "BOOKING-1", eventId: "event-1", ticketTypeName: "VIP", price: 120000,
      status: "VALID", qrCode: "qr-ticket-1", issuedAt: "2026-09-15T10:00:00Z",
    }]);
    render(<MemoryRouter><Routes>
      <Route path="*" element={<><MyTickets embedded /><CurrentPath /></>} />
      <Route path="/my-tickets/orders/:bookingCode" element={<CurrentPath />} />
    </Routes></MemoryRouter>);

    await waitFor(() => expect(screen.getByText("Concert IUH Day 2")).toBeInTheDocument());
    expect(within(screen.getByRole("article")).getByText("Sắp diễn ra")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thao tác với đơn hàng" })).toBeInTheDocument();
    expect(screen.getByText("Xem đơn hàng")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Xem vé" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Xem đơn hàng"));
    expect(await screen.findByLabelText("Current path")).toHaveTextContent(/BOOKING-1/);
  });

  it("keeps QR locked for a used ticket in the ticket viewer", () => {
    render(<MemoryRouter><TicketViewer ticket={makeTicket("ticket-used", "USED", "USED")} onClose={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText("Mã QR đang bị khóa")).toBeInTheDocument();
    expect(screen.queryByAltText("Mã QR check-in")).not.toBeInTheDocument();
  });

  it.each([
    ["LOCKED_FOR_RESALE", "Đang bán", "Đăng bán lại"],
    ["LOCKED_FOR_TRANSFER", "Đang tặng", "Tặng vé"],
  ] as const)("shows %s status and hides its matching action", async (rawStatus, badge, action) => {
    vi.mocked(ticketApi.getMyTickets).mockResolvedValueOnce([{
      id: "locked-ticket", bookingCode: "BOOK-1", eventId: "event-1", ticketTypeName: "VIP", price: 200000,
      status: rawStatus, qrCode: "qr-locked", issuedAt: "2026-09-18T00:00:00Z",
    }]);
    render(<MemoryRouter><MyTickets embedded /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(badge)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Thao tác với đơn hàng" }));
    expect(screen.queryByText(action)).not.toBeInTheDocument();
  });

  it("offers actions for the first valid upcoming ticket even when an earlier ticket is locked", () => {
    const locked = makeTicket("locked-first", "LOCKED_FOR_RESALE", "SELLING");
    const eligible = makeTicket("eligible-second", "VALID", "UPCOMING");
    const order: OrderGroup = {
      orderKey: "booking:BOOKING-1", bookingCode: "BOOKING-1", hasBookingCode: true, eventId: "event-1",
      eventTitle: "Concert IUH Day 2", eventTime: "20/09/2026", eventLocation: "SVD Quan Khu 7",
      tickets: [locked, eligible], totalAmount: 240000, quantity: 2, status: "UPCOMING", rawStatus: locked.rawStatus,
    };
    const onResale = vi.fn();
    render(<MemoryRouter><OrderCard order={order} isMenuOpen onToggleMenu={vi.fn()} onResale={onResale} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Đăng bán lại" }));
    expect(onResale).toHaveBeenCalledWith(eligible);
  });
});
