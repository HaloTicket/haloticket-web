// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PaymentCallback from "../../src/features/tickets/PaymentCallback";

const api = vi.hoisted(() => ({
  verifyPaymentStatus: vi.fn(),
  confirmVnPayReturn: vi.fn(),
  getBookingById: vi.fn(),
}));

vi.mock("../../src/services/paymentApi", () => ({
  paymentApi: { verifyPaymentStatus: api.verifyPaymentStatus, confirmVnPayReturn: api.confirmVnPayReturn },
}));
vi.mock("../../src/services/bookingApi", () => ({ bookingApi: { getBookingById: api.getBookingById } }));
vi.mock("../../src/services/marketplaceApi", () => ({ marketplaceApi: { getResalePurchaseStatus: vi.fn() } }));

function renderAt(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/payment/callback${search}`]}>
      <PaymentCallback />
    </MemoryRouter>
  );
}

/** chạy hết vòng thăm dò 10 lần cách nhau 1 giây */
async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(12000);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  api.verifyPaymentStatus.mockReset();
  api.confirmVnPayReturn.mockReset();
  api.getBookingById.mockReset();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("PaymentCallback", () => {
  it("payment not confirmed within the polling window is shown as processing, not as a failure", async () => {
    api.verifyPaymentStatus.mockResolvedValue({ status: "PENDING" });

    renderAt("?bookingId=b-1");
    await settle();

    expect(screen.getByText("Giao dịch đang được xử lý")).toBeTruthy();
    expect(screen.queryByText("Thanh toán thất bại")).toBeNull();
    expect(screen.queryByText(/payment-service/)).toBeNull();
    expect(screen.getByRole("button", { name: "Xem vé của tôi" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Kiểm tra lại" })).toBeTruthy();
  });

  it("a declined VNPay code is still a failure", async () => {
    renderAt("?vnp_ResponseCode=24&vnp_TxnRef=b-1");
    await settle();

    expect(screen.getByText("Thanh toán thất bại")).toBeTruthy();
    expect(api.verifyPaymentStatus).not.toHaveBeenCalled();
  });

  it("a confirmed payment shows success", async () => {
    api.verifyPaymentStatus.mockResolvedValue({ status: "SUCCESS" });
    api.getBookingById.mockResolvedValue({ bookingCode: "HALO-1" });

    renderAt("?bookingId=b-1");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(screen.getByText("Thanh toán thành công!")).toBeTruthy();
  });
});
