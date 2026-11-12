// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import WithdrawalDetail from "./WithdrawalDetail";
import { payoutApi } from "@/services/payoutApi";
import type { PayoutDetail } from "@/types";

vi.mock("@/services/payoutApi", () => ({ payoutApi: {
  getOrganizerPayout: vi.fn(),
  cancelPayout: vi.fn(),
} }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const payoutFixture = (overrides: Partial<PayoutDetail> = {}): PayoutDetail => ({
  id: "payout-123", eventId: "event-1", eventName: "Spring festival", requestType: "ADVANCE", organizerUserId: "organizer-1",
  grossAmount: 1_000_000, platformFee: 50_000, netAmount: 950_000, status: "PENDING",
  createdAt: "2026-10-30T10:00:00Z", updatedAt: "2026-10-30T10:00:00Z", timeline: [], allowedActions: [],
  accountSnapshot: { bankName: "Ngân hàng ABC", accountNumberMasked: "•••• 2468", accountHolder: "NGUYEN VAN A" },
  ...overrides,
});
const renderDetail = () => render(<MemoryRouter initialEntries={["/organizer/finance/withdrawals/payout-123"]}>
  <Routes><Route path="/organizer/finance/withdrawals/:id" element={<WithdrawalDetail />} /></Routes>
</MemoryRouter>);

describe("organizer withdrawal detail", () => {
  it("loads a payout and shows its real request and masked account details", async () => {
    vi.mocked(payoutApi.getOrganizerPayout).mockResolvedValue(payoutFixture());
    renderDetail();

    expect((await screen.findAllByText("Spring festival")).length).toBe(2);
    expect(payoutApi.getOrganizerPayout).toHaveBeenCalledWith("payout-123");
    expect(screen.getByText(/1.000.000 ₫/)).not.toBeNull();
    expect(screen.getByText(/^50\.000 ₫$/)).not.toBeNull();
    expect(screen.getByText(/950.000 ₫/)).not.toBeNull();
    expect(screen.getByText("•••• 2468")).not.toBeNull();
    expect(screen.getAllByText("Đang xét duyệt").length).toBe(2);
    expect(screen.queryByText("Yêu cầu thanh toán")).toBeNull();
  });

  it("renders the canonical progress with only server timestamps", async () => {
    vi.mocked(payoutApi.getOrganizerPayout).mockResolvedValue(payoutFixture({
      status: "PROCESSING",
      timeline: [
        { status: "APPROVED", occurredAt: "2026-10-30T11:00:00Z" },
        { status: "PROCESSING", occurredAt: "2026-10-30T12:00:00Z", publicMessage: "Đang xử lý chuyển khoản." },
      ],
    }));
    renderDetail();
    const progress = await screen.findByRole("list", { name: "Tiến trình yêu cầu" });
    expect(progress.textContent).toContain("Đã gửi");
    expect(progress.textContent).toContain("Đang xét duyệt");
    expect(progress.textContent).toContain("Đã phê duyệt");
    expect(progress.textContent).toContain("Đang chuyển");
    expect(progress.textContent).toContain("Hoàn tất");
    expect(progress.textContent).toContain("Đang xử lý chuyển khoản.");
    expect(progress.textContent).not.toContain("Chưa có ngày");
  });

  it("copies the real request code", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    vi.mocked(payoutApi.getOrganizerPayout).mockResolvedValue(payoutFixture());
    renderDetail();
    await screen.findAllByText("Spring festival");
    fireEvent.click(screen.getByRole("button", { name: "Sao chép mã yêu cầu" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("payout-123"));
    expect(await screen.findByText("Đã sao chép")).not.toBeNull();
  });

  it("confirms cancellation in an accessible dialog before calling the API", async () => {
    vi.mocked(payoutApi.getOrganizerPayout).mockResolvedValue(payoutFixture({ allowedActions: ["CANCEL"] }));
    vi.mocked(payoutApi.cancelPayout).mockResolvedValue(payoutFixture({ status: "CANCELLED" }));
    renderDetail();
    await screen.findAllByText("Spring festival");
    fireEvent.click(screen.getByRole("button", { name: "Hủy yêu cầu" }));
    expect(screen.getByRole("alertdialog").textContent).toContain("Yêu cầu này sẽ được gửi lên hệ thống để hủy");
    expect(payoutApi.cancelPayout).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận hủy" }));
    await waitFor(() => expect(payoutApi.cancelPayout).toHaveBeenCalledWith("payout-123"));
  });
});
