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

function showTickets(tickets: Record<string, unknown>[], extra: Record<string, unknown> = {}) {
  const message = {
    id: "m1",
    sender: "ai" as const,
    text: "Bảng giá",
    timestamp: new Date(),
    actions: [
      {
        action: "SHOW_TICKET_TYPES",
        database_data: {
          event_id: "e1",
          event_title: "Show A",
          has_seatmap: true,
          showtimes: [{ id: "st1", status: "ON_SALE", start_time: "2026-12-05T19:30:00", tickets }],
          ...extra,
        },
      },
    ],
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

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("AI chat ticket selector", () => {
  it("a seated tier is sent to the seat map instead of becoming a fake free-admission order", () => {
    showTickets([{ id: "t1", name: "VIP", price: 3000000, is_seated: true, status: "ACTIVE" }]);

    fireEvent.click(screen.getByTitle("Tăng"));
    fireEvent.click(screen.getByRole("button", { name: /thanh toán/i }));

    expect(screen.getByTestId("where").textContent).toBe("/events/e1/select-ticket?showtimeId=st1");
    expect(localStorage.getItem("haloticket_pending_order")).toBeNull();
  });

  it("a standing tier still builds the pending order, now with the real location and poster", () => {
    showTickets(
      [{ id: "t2", name: "GA", price: 500000, is_seated: false, status: "ACTIVE" }],
      { location: "Nhà hát Bến Thành", banner_url: "https://img/x.png" }
    );

    fireEvent.click(screen.getByTitle("Tăng"));
    fireEvent.click(screen.getByRole("button", { name: /thanh toán/i }));

    const order = JSON.parse(localStorage.getItem("haloticket_pending_order") || "{}");
    expect(order.eventLocation).toBe("Nhà hát Bến Thành");
    expect(order.eventPoster).toBe("https://img/x.png");
    expect(order.eventTime).toBe("2026-12-05T19:30:00");
    expect(order.seatIds).toHaveLength(1);
    expect(screen.getByTestId("where").textContent).toContain("/checkout?eventId=e1");
  });
});
