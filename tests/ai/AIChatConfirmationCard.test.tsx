// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("@/services/ticketApi", () => ({ ticketApi: {} }));
vi.mock("@/services/eventApi", () => ({ eventApi: {} }));
vi.mock("@/features/organizer/event-manage/components/seating/SeatCanvas", () => ({ SeatCanvas: () => null }));

import "@/i18n";
import AIChatMessage from "@/components/common/AIChatWidget/AIChatMessage";

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname + location.search}</div>;
}

const confirmation = (data: Record<string, unknown> = {}) => ({
  status: "waiting_for_user",
  action_type: "BOOK_TICKETS",
  data: JSON.stringify({
    event_id: "ev-1", event_title: "Show Thật", showtime_id: "st-1", showtime_name: "Suất tối",
    tickets: [{ ticket_type_id: "tt-1", tier_name: "VIP", quantity: 2, price: 1500000, subtotal: 3000000, is_seated: false }],
    seats: [], total_price: 3000000, prices_source: "server", ...data,
  }),
});

function renderCard(serverData: unknown, extractedArgs: unknown = undefined) {
  const message = {
    id: "m1", sender: "ai" as const, text: "Xác nhận nhé", timestamp: new Date(),
    actions: [{ action: "USER_CONFIRMATION_REQUIRED", database_data: JSON.stringify(serverData), extracted_args: extractedArgs }],
  };
  return render(
    <MemoryRouter initialEntries={["/chat"]}>
      <Routes>
        <Route path="/chat" element={<AIChatMessage message={message as never} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );
}

const confirmButton = () => screen.getByRole("button", { name: /Xác nhận & Tới trang Thanh toán/ });

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("AI booking confirmation card", () => {
  it("shows the server-priced lines and total, ignoring what the model wrote in its own arguments", () => {
    renderCard(confirmation(), { action_type: "BOOK_TICKETS", data: JSON.stringify({ event_title: "Show Giả", total_price: 1, tier_name: "Hạng giả" }) });

    expect(screen.getByText("Show Thật")).toBeTruthy();
    expect(screen.getByText("VIP x 2")).toBeTruthy();
    expect(screen.getAllByText("3.000.000 đ").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Show Giả")).toBeNull();
    expect(screen.queryByText("Hạng giả")).toBeNull();
  });

  it("confirming writes a pending order built from the server data and opens checkout", () => {
    renderCard(confirmation());
    fireEvent.click(confirmButton());

    const order = JSON.parse(localStorage.getItem("haloticket_pending_order") || "{}");
    expect(order).toMatchObject({ eventId: "ev-1", showtimeId: "st-1", eventTitle: "Show Thật", totalAmount: 3000000, quantity: 2 });
    expect(order.items).toEqual([{ ticketTypeId: "tt-1", quantity: 2, unitPrice: 1500000 }]);
    expect(order.seatIds).toHaveLength(2);
    expect(screen.getByTestId("where").textContent).toBe("/checkout?eventId=ev-1&showtimeId=st-1&qty=2");
  });

  it("confirming replaces an older pending order that belongs to another event", () => {
    localStorage.setItem("haloticket_pending_order", JSON.stringify({ eventId: "OLD", totalAmount: 1 }));
    renderCard(confirmation());
    fireEvent.click(confirmButton());
    expect(JSON.parse(localStorage.getItem("haloticket_pending_order") || "{}").eventId).toBe("ev-1");
  });

  it("with real seats the order carries those seats", () => {
    renderCard(confirmation({
      seats: ["A1", "A2"],
      tickets: [{ ticket_type_id: "tt-1", tier_name: "VIP", quantity: 2, price: 1500000, subtotal: 3000000, is_seated: true }],
    }));
    expect(screen.getByText("A1, A2")).toBeTruthy();
    fireEvent.click(confirmButton());
    expect(JSON.parse(localStorage.getItem("haloticket_pending_order") || "{}").seatIds).toEqual(["A1", "A2"]);
  });

  it("a seated tier without seats sends the customer to pick seats and creates no order", () => {
    renderCard(confirmation({ tickets: [{ ticket_type_id: "tt-1", tier_name: "VIP", quantity: 2, price: 1500000, subtotal: 3000000, is_seated: true }] }));
    fireEvent.click(confirmButton());
    expect(localStorage.getItem("haloticket_pending_order")).toBeNull();
    expect(screen.getByTestId("where").textContent).toBe("/events/ev-1/select-ticket?showtimeId=st-1");
  });

  it("renders no card when the server data is missing or not marked as server-priced", () => {
    renderCard(confirmation({ prices_source: "model" }));
    expect(screen.queryByText("Xác nhận thông tin đặt vé")).toBeNull();
    cleanup();
    renderCard({ status: "waiting_for_user", data: "{bad" });
    expect(screen.queryByText("Xác nhận thông tin đặt vé")).toBeNull();
  });
});
