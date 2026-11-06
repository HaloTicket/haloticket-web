// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@/i18n";
import OrderReconciliation from "@/features/admin/OrderReconciliation";
import { adminNavGroups } from "@/features/admin/components/AdminSidebar";
import { PATHS } from "@/routes/paths";

const api = vi.hoisted(() => ({
  getSummary: vi.fn(),
  getExceptions: vi.fn(),
  resolveException: vi.fn(),
  getPaidWithoutTickets: vi.fn(),
  getStockDiscrepancies: vi.fn(),
}));
vi.mock("@/services/adminReconciliationApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/adminReconciliationApi")>();
  return { ...actual, adminReconciliationApi: api };
});
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: toasts }));

const exception = {
  id: "11111111-2222-3333-4444-555555555555", bookingId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", bookingCode: "HT-1001",
  paymentId: "99999999-8888-7777-6666-555555555555", kind: "LATE_PAYMENT_NO_STOCK", amount: 500000, provider: "VNPAY",
  status: "OPEN", detail: "no stock", createdAt: "2026-10-30T01:00:00Z",
};
const page = (items = [exception]) => ({ items, total: items.length, page: 0, size: 20 });

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  Object.values(toasts).forEach((f) => f.mockReset());
  api.getSummary.mockResolvedValue({ openExceptions: 1, paidWithoutTickets: 2, stockDiscrepancies: 3 });
  api.getExceptions.mockResolvedValue(page());
  api.getPaidWithoutTickets.mockResolvedValue({ items: [], total: 0 });
  api.getStockDiscrepancies.mockResolvedValue({ items: [] });
});
afterEach(cleanup);

describe("OrderReconciliation", () => {
  it("shows loading, then the exceptions with shortened ids", async () => {
    render(<OrderReconciliation />);
    expect(screen.getAllByRole("status").some((el) => /Đang tải/.test(el.textContent || ""))).toBe(true);
    expect(await screen.findByText("HT-1001")).toBeTruthy();
    expect(screen.getByText("99999999…")).toBeTruthy();
    expect(screen.queryByText(exception.paymentId)).toBeNull();
    expect(screen.getByText("Thanh toán muộn, hết vé")).toBeTruthy();
  });

  it("shows 'không rõ' (not 0) when a summary count is null", async () => {
    api.getSummary.mockResolvedValue({ openExceptions: null, paidWithoutTickets: 0, stockDiscrepancies: null });
    render(<OrderReconciliation />);
    await waitFor(() => expect(within(screen.getByTestId("summary-openExceptions")).getByText("không rõ")).toBeTruthy());
    expect(within(screen.getByTestId("summary-stockDiscrepancies")).getByText("không rõ")).toBeTruthy();
    expect(within(screen.getByTestId("summary-paidWithoutTickets")).getByText("0")).toBeTruthy();
  });

  it("shows the empty state", async () => {
    api.getExceptions.mockResolvedValue(page([]));
    render(<OrderReconciliation />);
    expect(await screen.findByText("Không có mục nào cần xử lý")).toBeTruthy();
  });

  it("shows a real error for RECONCILIATION_SOURCE_UNAVAILABLE and retries", async () => {
    api.getExceptions.mockRejectedValueOnce({ response: { status: 503, data: { code: "RECONCILIATION_SOURCE_UNAVAILABLE" } } });
    render(<OrderReconciliation />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/Không đọc được một nguồn dữ liệu đối soát/);
    expect(screen.queryByText("Không có mục nào cần xử lý")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("HT-1001")).toBeTruthy();
    expect(api.getExceptions).toHaveBeenCalledTimes(2);
  });

  it("covers loading, empty, error and retry on the other two tabs", async () => {
    api.getPaidWithoutTickets.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce({ items: [{ bookingId: "bbbbbbbb-1", bookingCode: "HT-2", expectedTickets: 2, issuedTickets: 1, minutesSincePaid: 42 }], total: 1 });
    api.getStockDiscrepancies.mockResolvedValue({ items: [] });
    render(<OrderReconciliation />);
    await screen.findByText("HT-1001");
    fireEvent.click(screen.getByRole("tab", { name: /Đơn thiếu vé/ }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Không thể tải dữ liệu đối soát/);
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("HT-2")).toBeTruthy();
    expect(screen.getByText("42 phút")).toBeTruthy();
    expect(screen.getByText("Thiếu 1 vé")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Lệch kho/ }));
    expect(await screen.findByText("Không có mục nào cần xử lý")).toBeTruthy();
  });

  it("lists stock discrepancies with unknown numbers shown as 'không rõ'", async () => {
    api.getStockDiscrepancies.mockResolvedValue({ items: [{ ticketTypeId: "cccccccc-1", eventId: "dddddddd-1111-2222-3333-444444444444", name: "VIP", initial: 1000, remaining: 1000, held: 0, issued: 1, heldByReservations: null, diffStockVsIssued: 1, diffHeldVsReservations: null, note: "INITIAL_QUANTITY_NULL; SOMETHING_NEW" }] });
    render(<OrderReconciliation />);
    await screen.findByText("HT-1001");
    fireEvent.click(screen.getByRole("tab", { name: /Lệch kho/ }));
    expect(await screen.findByText("VIP")).toBeTruthy();
    expect(screen.getAllByText("không rõ").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("dddddddd…")).toBeTruthy();
    // codes are explained in words, never shown raw
    expect(screen.getByText(/Chưa ghi số phát hành/)).toBeTruthy();
    expect(screen.getByText(/Có điểm bất thường khác/)).toBeTruthy();
    expect(screen.queryByText(/INITIAL_QUANTITY_NULL|SOMETHING_NEW/)).toBeNull();
    expect(screen.getByText("Kho đã trừ nhiều hơn vé phát hành 1 vé")).toBeTruthy();
  });

  it("requires a note before resolving, then resolves with a toast and refreshes", async () => {
    api.resolveException.mockResolvedValue({});
    render(<OrderReconciliation />);
    fireEvent.click(await screen.findByRole("button", { name: "Đánh dấu đã xử lý" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận" }));
    expect((await within(dialog).findByRole("alert")).textContent).toMatch(/Vui lòng nhập ghi chú/);
    expect(api.resolveException).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText(/Ghi chú xử lý/), { target: { value: "Đã hoàn tiền qua cổng" } });
    fireEvent.click(within(dialog).getByLabelText(/Đã hoàn tiền thủ công/));
    fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận" }));
    await waitFor(() => expect(api.resolveException).toHaveBeenCalledWith(exception.id, { note: "Đã hoàn tiền qua cổng", refundedManually: true }));
    await waitFor(() => expect(toasts.success).toHaveBeenCalled());
    await waitFor(() => expect(api.getExceptions).toHaveBeenCalledTimes(2));
    expect(api.getSummary).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("keeps the modal and shows an error toast when resolving fails", async () => {
    api.resolveException.mockRejectedValue(new Error("x"));
    render(<OrderReconciliation />);
    fireEvent.click(await screen.findByRole("button", { name: "Đánh dấu đã xử lý" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.change(within(dialog).getByLabelText(/Ghi chú xử lý/), { target: { value: "ghi chú" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận" }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalled());
    expect(toasts.success).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });

  it("closes the confirm modal with Escape", async () => {
    render(<OrderReconciliation />);
    fireEvent.click(await screen.findByRole("button", { name: "Đánh dấu đã xử lý" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });
});

describe("admin navigation", () => {
  it("has the order reconciliation item in the finance group, distinct from payout finance", () => {
    const finance = adminNavGroups.find((g) => g.id === "finance")!;
    const item = finance.items.find((i) => i.path === PATHS.ADMIN_RECONCILIATION);
    expect(PATHS.ADMIN_RECONCILIATION).toBe("/admin/reconciliation");
    expect(item?.label).toBe("Đối soát đơn hàng");
    expect(item?.english).toBe("Order reconciliation");
    expect(finance.items.some((i) => i.path === PATHS.ADMIN_FINANCE)).toBe(true);
  });
});
