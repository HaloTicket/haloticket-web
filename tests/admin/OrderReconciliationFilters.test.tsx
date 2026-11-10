// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@/i18n";
import OrderReconciliation from "@/features/admin/OrderReconciliation";
import {
  ageBucketOf,
  filterExceptions,
  filterPaid,
  filterStock,
  stockIssueOf,
  EMPTY_EXCEPTION_FILTERS,
  EMPTY_PAID_FILTERS,
  EMPTY_STOCK_FILTERS,
} from "@/features/admin/reconciliationFilters";

const api = vi.hoisted(() => ({
  getSummary: vi.fn(),
  getExceptions: vi.fn(),
  resolveException: vi.fn(),
  republishConfirmed: vi.fn(),
  getPaidWithoutTickets: vi.fn(),
  getStockDiscrepancies: vi.fn(),
  fixStock: vi.fn(),
}));
vi.mock("@/services/adminReconciliationApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/adminReconciliationApi")>();
  return { ...actual, adminReconciliationApi: api };
});
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: toasts }));

const ex = (over: Record<string, unknown> = {}) => ({
  id: "e1", bookingId: "b1", bookingCode: "HT-1", kind: "ISSUANCE_FAILED", status: "OPEN", detail: "x", createdAt: "2026-10-30T01:00:00Z",
  customerName: "An Nguyen", customerEmail: "an@example.com", eventTitle: "HaloTicket 2", ...over,
});
const paidItem = (over: Record<string, unknown> = {}) => ({
  bookingId: "pb1", bookingCode: "HT-P1", expectedTickets: 2, issuedTickets: 0, minutesSincePaid: 10, paymentMethod: "VNPAY",
  customerName: "Binh Tran", eventTitle: "Show A", ...over,
});
const stockItem = (over: Record<string, unknown> = {}) => ({
  ticketTypeId: "t1", eventId: "ev1", eventTitle: "HaloTicket 2", name: "VIP", initial: 1000, remaining: 1000, held: 0, issued: 1,
  heldByReservations: 0, diffStockVsIssued: -1, diffHeldVsReservations: 0, note: "", ...over,
});

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  Object.values(toasts).forEach((f) => f.mockReset());
  api.getSummary.mockResolvedValue({ openExceptions: 1, paidWithoutTickets: 1, stockDiscrepancies: 1 });
  api.getExceptions.mockResolvedValue({ items: [ex()], total: 1, page: 0, size: 20 });
  api.getPaidWithoutTickets.mockResolvedValue({ items: [paidItem()], total: 1 });
  api.getStockDiscrepancies.mockResolvedValue({ items: [stockItem()] });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("reconciliation filters (pure)", () => {
  it("filters exceptions by kind and text", () => {
    const items = [ex(), ex({ id: "e2", kind: "LATE_PAYMENT_NO_STOCK", bookingCode: "HT-2", customerName: "Chi Le", customerEmail: "chi@example.com" })];
    expect(filterExceptions(items as never, { ...EMPTY_EXCEPTION_FILTERS, kind: "ISSUANCE_FAILED" })).toHaveLength(1);
    expect(filterExceptions(items as never, { ...EMPTY_EXCEPTION_FILTERS, q: " CHI@ex" })).toHaveLength(1);
    expect(filterExceptions(items as never, EMPTY_EXCEPTION_FILTERS)).toHaveLength(2);
  });
  it("buckets the age and filters paid orders by method", () => {
    expect([ageBucketOf(5), ageBucketOf(30), ageBucketOf(119), ageBucketOf(120)]).toEqual(["recent", "waiting", "waiting", "stale"]);
    const items = [paidItem(), paidItem({ bookingId: "pb2", paymentMethod: "MOMO", minutesSincePaid: 300 })];
    expect(filterPaid(items as never, { ...EMPTY_PAID_FILTERS, method: "MOMO" })).toHaveLength(1);
    expect(filterPaid(items as never, { ...EMPTY_PAID_FILTERS, age: "stale" })[0].bookingId).toBe("pb2");
  });
  it("classifies stock rows", () => {
    expect(stockIssueOf(stockItem({ initial: null }) as never)).toBe("unrecorded");
    expect(stockIssueOf(stockItem() as never)).toBe("notDeducted");
    expect(stockIssueOf(stockItem({ diffStockVsIssued: 2 }) as never)).toBe("overDeducted");
    expect(stockIssueOf(stockItem({ diffStockVsIssued: 0, diffHeldVsReservations: 3 }) as never)).toBe("held");
    const items = [stockItem(), stockItem({ ticketTypeId: "t2", eventId: "ev2", eventTitle: "Other", name: "STANDARD" })];
    expect(filterStock(items as never, { ...EMPTY_STOCK_FILTERS, event: "ev2" })).toHaveLength(1);
    expect(filterStock(items as never, { ...EMPTY_STOCK_FILTERS, q: "vip" })).toHaveLength(1);
  });
});

describe("OrderReconciliation filters and states", () => {
  it("shows x/y and clears the search on the exceptions tab", async () => {
    api.getExceptions.mockResolvedValue({ items: [ex(), ex({ id: "e2", bookingCode: "HT-2", customerName: "Chi Le", customerEmail: "chi@example.com" })], total: 2, page: 0, size: 20 });
    render(<OrderReconciliation />);
    await screen.findByText("HT-1");
    expect(screen.getByTestId("filter-summary").textContent).toContain("2/2");
    fireEvent.change(screen.getByLabelText("Tìm mã đơn, khách hàng, sự kiện"), { target: { value: "chi@" } });
    await waitFor(() => expect(screen.getByTestId("filter-summary").textContent).toContain("1/2"));
    expect(screen.queryByText("HT-1")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
    await waitFor(() => expect(screen.getByTestId("filter-summary").textContent).toContain("2/2"));
    expect((screen.getByLabelText("Tìm mã đơn, khách hàng, sự kiện") as HTMLInputElement).value).toBe("");
  });

  it("marks an exception the system resolved by itself", async () => {
    api.getExceptions.mockResolvedValue({ items: [ex({ status: "RESOLVED", resolvedBy: "system" })], total: 1, page: 0, size: 20 });
    render(<OrderReconciliation />);
    expect(await screen.findByText("Tự động đã xử lý")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Đánh dấu đã xử lý" })).toBeNull();
  });

  it("keeps the order on screen as 'being reissued' and never shows the loading state again", async () => {
    api.republishConfirmed.mockResolvedValue({});
    render(<OrderReconciliation />);
    await screen.findByText("HT-1");
    fireEvent.click(screen.getByRole("tab", { name: /Đơn thiếu vé/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Phát hành lại vé" }));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Phát hành lại vé" }));
    expect(await screen.findByText("Đang phát hành lại…")).toBeTruthy();
    expect(screen.getByText("HT-P1")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Phát hành lại vé" })).toBeNull();
    expect(api.republishConfirmed).toHaveBeenCalledWith("pb1");
  });

  it("reports success and refreshes the other lists when the order leaves the list", async () => {
    api.republishConfirmed.mockResolvedValue({});
    render(<OrderReconciliation />);
    await screen.findByText("HT-1");
    fireEvent.click(screen.getByRole("tab", { name: /Đơn thiếu vé/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Phát hành lại vé" }));
    api.getPaidWithoutTickets.mockResolvedValue({ items: [], total: 0 });
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Phát hành lại vé" }));
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith("Đã phát hành lại vé thành công."), { timeout: 4000 });
    await waitFor(() => expect(api.getExceptions.mock.calls.length).toBeGreaterThan(1));
  });

  it("resyncs a stock row after a confirmation, and explains INITIAL_QUANTITY_UNKNOWN", async () => {
    api.fixStock.mockRejectedValueOnce({ response: { status: 422, data: { code: "INITIAL_QUANTITY_UNKNOWN" } } }).mockResolvedValueOnce(null);
    render(<OrderReconciliation />);
    await screen.findByText("HT-1");
    fireEvent.click(screen.getByRole("tab", { name: /Lệch kho/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng bộ lại kho" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Đồng bộ lại kho" }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalled());
    expect(String(toasts.error.mock.calls[0][0])).toMatch(/số lượng phát hành ban đầu/);
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Đồng bộ lại kho" }));
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith("Đã đồng bộ lại kho của hạng vé này."));
    expect(api.fixStock).toHaveBeenCalledWith("t1");
  });
});
