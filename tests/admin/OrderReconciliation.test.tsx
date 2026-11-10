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
  republishConfirmed: vi.fn(),
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

const withContext = {
  customerName: "Trần Vũ", customerEmail: "vu@example.com", customerPhone: "0901234567",
  paymentMethod: "VIETQR", eventId: "ev-1", eventTitle: "Tinh Hà Say Hi Concert",
};

describe("who paid, how and for which event", () => {
  it("shows customer, payment method and event in the exceptions tab, and a dash for what is missing", async () => {
    api.getExceptions.mockResolvedValue(page([
      { ...exception, ...withContext, detail: "Ticket issuance failed" },
      { ...exception, id: "2", bookingCode: "HT-1002", paymentId: null as unknown as string, provider: null as unknown as string },
    ]));
    render(<OrderReconciliation />);
    await screen.findByText("HT-1001");
    expect(screen.getByRole("columnheader", { name: "Khách hàng" })).toBeTruthy();
    expect(screen.getByText("Trần Vũ")).toBeTruthy();
    expect(screen.getByText("vu@example.com")).toBeTruthy();
    expect(screen.getByText("0901234567")).toBeTruthy();
    expect(screen.getByText("VIETQR")).toBeTruthy();
    expect(screen.getByText(/Tinh Hà Say Hi Concert/)).toBeTruthy();
    expect(screen.getByText("99999999…")).toBeTruthy(); // the payment reference, shortened
    expect(screen.getByText("Chưa có mã thanh toán")).toBeTruthy(); // second row has none
    const cells = screen.getAllByTestId("customer-cell");
    expect(cells).toHaveLength(2);
    expect(within(cells[1]).getAllByText("—")).toHaveLength(3); // name, e-mail and phone are all missing
  });

  it("clamps a long exception text behind 'Xem thêm'", async () => {
    const detail = "Ticket issuance failed after all retries: " + "x".repeat(300);
    api.getExceptions.mockResolvedValue(page([{ ...exception, detail }]));
    render(<OrderReconciliation />);
    await screen.findByText("HT-1001");
    const toggle = screen.getByRole("button", { name: "Xem thêm" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Thu gọn" }).getAttribute("aria-expanded")).toBe("true");
  });

  it("shows customer, event, payment and amount for an order without tickets", async () => {
    api.getPaidWithoutTickets.mockResolvedValue({ items: [{ bookingId: "b-1", bookingCode: "HT-2", expectedTickets: 3, issuedTickets: 0, minutesSincePaid: 12, amount: 8400, ...withContext }], total: 1 });
    render(<OrderReconciliation />);
    await screen.findByText("HT-1001");
    fireEvent.click(screen.getByRole("tab", { name: /Đơn thiếu vé/ }));
    await screen.findByText("HT-2");
    expect(screen.getByText("Trần Vũ")).toBeTruthy();
    expect(screen.getByText("VIETQR")).toBeTruthy();
    expect(screen.getByText(/8\.400/)).toBeTruthy();
    expect(screen.getByText(/Tinh Hà Say Hi Concert/)).toBeTruthy();
    expect(screen.getByText("Thiếu 3 vé")).toBeTruthy();
  });

  it("shows the event name for a stock discrepancy, or 'không rõ tên' with the short id", async () => {
    const row = { ticketTypeId: "t-1", eventId: "dddddddd-1111-2222-3333-444444444444", name: "VIP", initial: 10, remaining: 10, held: 0, issued: 1, heldByReservations: 0, diffStockVsIssued: 1, diffHeldVsReservations: 0, note: null };
    api.getStockDiscrepancies.mockResolvedValue({ items: [{ ...row, eventTitle: "Tinh Hà Say Hi Concert" }, { ...row, ticketTypeId: "t-2", name: "GA", eventTitle: null }] });
    render(<OrderReconciliation />);
    await screen.findByText("HT-1001");
    fireEvent.click(screen.getByRole("tab", { name: /Lệch kho/ }));
    await screen.findByText("VIP");
    expect(screen.getByRole("columnheader", { name: "Sự kiện" })).toBeTruthy();
    expect(screen.getByText("Tinh Hà Say Hi Concert")).toBeTruthy();
    expect(screen.getByText("không rõ tên")).toBeTruthy();
    expect(screen.getAllByText("dddddddd…")).toHaveLength(2);
  });
});

describe("reissuing tickets for a paid order", () => {
  const paidRow = { bookingId: "b-1", bookingCode: "HT-2", expectedTickets: 2, issuedTickets: 0, minutesSincePaid: 12 };

  async function openDialog() {
    api.getPaidWithoutTickets.mockResolvedValue({ items: [paidRow], total: 1 });
    render(<OrderReconciliation />);
    await screen.findByText("HT-1001");
    fireEvent.click(screen.getByRole("tab", { name: /Đơn thiếu vé/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Phát hành lại vé" }));
    return screen.findByRole("alertdialog");
  }

  it("asks first, then republishes, toasts and refreshes both lists", async () => {
    api.republishConfirmed.mockResolvedValue({ message: "SUCCESS" });
    const dialog = await openDialog();
    expect(api.republishConfirmed).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Phát hành lại vé" }));
    await waitFor(() => expect(api.republishConfirmed).toHaveBeenCalledWith("b-1"));
    await waitFor(() => expect(toasts.success).toHaveBeenCalled());
    await waitFor(() => expect(api.getPaidWithoutTickets).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Đang phát hành lại…")).toBeTruthy(); // the row stays, summary is refreshed when the order leaves the list
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("keeps the dialog and shows an error toast when it fails", async () => {
    api.republishConfirmed.mockRejectedValue(new Error("x"));
    const dialog = await openDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Phát hành lại vé" }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalled());
    expect(toasts.success).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });

  it("does nothing when the dialog is cancelled", async () => {
    const dialog = await openDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Hủy bỏ" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(api.republishConfirmed).not.toHaveBeenCalled();
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
