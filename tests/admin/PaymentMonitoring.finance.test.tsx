// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { payoutApi } from "@/services/payoutApi";
import { eventApi } from "@/services/eventApi";
import PaymentMonitoring from "@/features/admin/PaymentMonitoring";
import type { AdminPayoutDetail, AdminPayoutRow } from "@/types";

vi.mock("@/services/payoutApi", () => ({
  payoutApi: {
    getAdminPayoutQueue: vi.fn(),
    getAdminPayout: vi.fn(),
    approvePayout: vi.fn(),
    disputePayout: vi.fn(),
    rejectAdminPayout: vi.fn(),
    startAdminDisbursement: vi.fn(),
    recordAdminDisbursement: vi.fn(),
    verifyAdminPayoutAccount: vi.fn(),
    getAdminAdvancePolicy: vi.fn(),
    getAdminPolicyAudit: vi.fn(),
    getAdminPolicyOverrides: vi.fn(),
    saveAdminAdvancePolicy: vi.fn(),
    getAdminPolicyOverride: vi.fn(),
    saveAdminPolicyOverride: vi.fn(),
    deleteAdminPolicyOverride: vi.fn(),
    getAdminReconciliationQueue: vi.fn(),
    confirmAdminReconciliation: vi.fn(),
  },
}));

vi.mock("@/services/eventApi", () => ({
  eventApi: { getAllEvents: vi.fn() },
}));

const initialPayout: AdminPayoutRow = {
  id: "pay-1",
  eventId: "event-1",
  eventName: "Summer show",
  organizerUserId: "organizer-1",
  grossAmount: 1000000,
  platformFee: 0,
  netAmount: 500000,
  status: "PENDING",
  requestType: "FINAL_SETTLEMENT",
  createdAt: "2026-10-30T09:00:00Z",
  updatedAt: "2026-10-30T09:00:00Z",
  allowedActions: ["APPROVE", "REJECT", "DISPUTE"],
};

let activePayout: AdminPayoutRow;
const detail = (): AdminPayoutDetail => ({
  ...activePayout,
  eventName: "Summer show",
  requestType: "FINAL_SETTLEMENT",
  accountSnapshot: { bankName: "Example Bank", accountHolder: "Test Organizer", accountNumberMasked: "•••• 1234" },
  payoutAccountVerified: true,
  timeline: [],
  allowedActions: activePayout.allowedActions || [],
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(eventApi.getAllEvents).mockResolvedValue([{ id: "event-1", title: "Summer show", bannerUrl: "https://events.example/summer.jpg" }]);
  activePayout = { ...initialPayout };
  vi.mocked(payoutApi.getAdminPayoutQueue).mockImplementation(async () => [{ ...activePayout }]);
  vi.mocked(payoutApi.getAdminPayout).mockImplementation(async () => detail());
  vi.mocked(payoutApi.approvePayout).mockImplementation(async () => {
    activePayout = { ...activePayout, status: "APPROVED", allowedActions: ["RECORD_TRANSFER"] };
    return { ...activePayout };
  });
  vi.mocked(payoutApi.startAdminDisbursement).mockImplementation(async () => {
    activePayout = { ...activePayout, status: "PROCESSING", allowedActions: ["RECORD_TRANSFER"] };
    return detail();
  });
  vi.mocked(payoutApi.recordAdminDisbursement).mockImplementation(async () => {
    activePayout = { ...activePayout, status: "COMPLETED", transferReference: "BANK-REF-99", transferredAt: "2026-10-30T10:00:00Z" };
    return detail();
  });
  vi.mocked(payoutApi.getAdminAdvancePolicy).mockResolvedValue({ advanceEnabled: false, advanceRate: 30, processingTime: "Theo chính sách", version: 0 });
  vi.mocked(payoutApi.getAdminPolicyAudit).mockResolvedValue([]);
  vi.mocked(payoutApi.getAdminPolicyOverrides).mockResolvedValue([]);
  vi.mocked(payoutApi.saveAdminAdvancePolicy).mockImplementation(async (value) => ({ advanceEnabled: value.enabled, advanceRate: value.advanceRate, processingTime: value.processingTime, version: value.version + 1 }));
});

afterEach(() => cleanup());

const renderPage = () => render(<MemoryRouter><PaymentMonitoring /></MemoryRouter>);

describe("admin finance controls", () => {
  it("groups processing statuses consistently across tabs and the status filter", async () => {
    vi.mocked(payoutApi.getAdminPayoutQueue).mockResolvedValue([
      { ...initialPayout, id: "approved", status: "APPROVED", eventName: "Approved event" },
      { ...initialPayout, id: "failed", status: "FAILED", eventName: "Failed event" },
      { ...initialPayout, id: "verify", status: "NEEDS_VERIFICATION", eventName: "Verify event" },
    ]);
    render(<MemoryRouter><PaymentMonitoring /></MemoryRouter>);
    await screen.findByText("Approved event");
    const select = screen.getByRole("combobox", { name: "Lọc trạng thái yêu cầu" });
    expect(select.querySelectorAll("option")).toHaveLength(7);
    fireEvent.click(screen.getByRole("tab", { name: /Đang xử lý/ }));
    expect(screen.getByText("Approved event")).toBeTruthy();
    expect(screen.getByText("Failed event")).toBeTruthy();
    expect(screen.queryByText("Verify event")).toBeNull();
    expect((select as HTMLSelectElement).value).toBe("PROCESSING");
    fireEvent.change(select, { target: { value: "NEEDS_VERIFICATION" } });
    expect(screen.getByText("Verify event")).toBeTruthy();
    expect(screen.queryByText("Failed event")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
    expect(screen.getByText("Failed event")).toBeTruthy();
    expect((select as HTMLSelectElement).value).toBe("ALL");
  });

  it("requires bank evidence to confirm transfer directly after approval", async () => {
    const { container } = renderPage();
    await waitFor(() => expect(eventApi.getAllEvents).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(container.querySelector('img[src="https://events.example/summer.jpg"]')).not.toBeNull());
    fireEvent.click(await screen.findByRole("button", { name: /^Xem$/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Phê duyệt yêu cầu" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận phê duyệt" }));
    await waitFor(() => expect(payoutApi.approvePayout).toHaveBeenCalledWith("pay-1"));
    fireEvent.click(await screen.findByRole("button", { name: "Xác nhận chuyển tiền" }));
    expect(payoutApi.startAdminDisbursement).not.toHaveBeenCalled();
    const recordButton = await screen.findByRole("button", { name: "Xác nhận đã chuyển" });
    expect((recordButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Mã giao dịch ngân hàng/), { target: { value: "BANK-REF-99" } });
    fireEvent.change(screen.getByLabelText(/Liên kết biên nhận/), { target: { value: "https://bank.example/receipt/99" } });
    fireEvent.click(recordButton);
    await waitFor(() => expect(payoutApi.recordAdminDisbursement).toHaveBeenCalledWith("pay-1", expect.objectContaining({
      reference: "BANK-REF-99",
      receiptUrl: "https://bank.example/receipt/99",
    })));
  });
});
