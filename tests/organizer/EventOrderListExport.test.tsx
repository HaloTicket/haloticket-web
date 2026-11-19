// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { EventOrderList } from "../../src/features/organizer/event-manage/EventOrderList";

const mocks = vi.hoisted(() => ({
  getEventBookings: vi.fn(),
  getEventById: vi.fn(),
  jsonToSheet: vi.fn(() => ({})),
  writeFile: vi.fn(),
}));

vi.mock("../../src/services/eventApi", () => ({
  eventApi: { getEventBookings: mocks.getEventBookings, getEventById: mocks.getEventById },
}));
vi.mock("xlsx", () => ({
  utils: { json_to_sheet: mocks.jsonToSheet, book_new: () => ({}), book_append_sheet: vi.fn() },
  writeFile: mocks.writeFile,
}));
vi.mock("../../src/features/organizer/event-manage/components/OrderDetailsModal", () => ({ default: () => null }));

const orders = [
  { id: "1", bookingCode: "HALO-1", createdAt: "2026-11-01T10:00:00Z", customerName: "=HYPERLINK(\"http://x\")", customerEmail: "+a@x.com", totalAmount: 100000, status: "REFUNDED", items: [{ quantity: 2 }] },
  { id: "2", bookingCode: "HALO-2", createdAt: "2026-11-01T11:00:00Z", customerName: "Binh", customerEmail: "b@x.com", totalAmount: 50000, status: "EXPIRED", items: [{ quantity: 1 }] },
];

beforeEach(() => {
  mocks.getEventBookings.mockReset().mockResolvedValue({ content: orders, totalPages: 1, totalElements: 2 });
  mocks.getEventById.mockReset().mockResolvedValue({ showtimes: [] });
  mocks.jsonToSheet.mockClear();
  mocks.writeFile.mockClear();
});
afterEach(cleanup);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/organizer/events/e1/manage/orders"]}>
      <Routes>
        <Route path="/organizer/events/:eventId/manage/orders" element={<EventOrderList />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("EventOrderList", () => {
  it("no longer offers the fake send-email action", async () => {
    renderPage();
    await screen.findByText("HALO-1");
    expect(screen.queryByRole("button", { name: /Gửi email/ })).toBeNull();
  });

  it("shows refunded and expired orders with their own labels instead of cancelled", async () => {
    renderPage();
    await screen.findByText("HALO-1");
    expect(screen.getByText("Đã hoàn tiền")).toBeTruthy();
    expect(screen.getByText("Hết hạn")).toBeTruthy();
  });

  it("export neutralises formula-looking text and writes readable status labels", async () => {
    renderPage();
    await screen.findByText("HALO-1");

    fireEvent.click(screen.getByRole("button", { name: /Xuất báo cáo/ }));
    await waitFor(() => expect(mocks.jsonToSheet).toHaveBeenCalled());

    const rows = (mocks.jsonToSheet.mock.calls[0] as unknown as [Record<string, unknown>[]])[0];
    expect(rows[0]["Người Mua"]).toBe("'=HYPERLINK(\"http://x\")");
    expect(rows[0]["Email"]).toBe("'+a@x.com");
    expect(rows[0]["Trạng Thái"]).toBe("Đã hoàn tiền");
    expect(rows[0]["Tổng Tiền (VNĐ)"]).toBe(100000);
    expect(rows[1]["Người Mua"]).toBe("Binh");
  });
});
