// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import ResaleTransactionResult from "@/features/resale/ResaleTransactionResult";
import { useMarketplaceSaga } from "@/features/resale/hooks/useMarketplaceSaga";

vi.mock("@/features/resale/hooks/useMarketplaceSaga");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderResult(sagaId = "saga-123") {
  return render(
    <MemoryRouter initialEntries={[`/resale-ticket/result/${sagaId}`]}>
      <Routes>
        <Route path="/resale-ticket/result/:sagaId" element={<ResaleTransactionResult />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ResaleTransactionResult", () => {
  it("renders spinner and processing message when in progress", () => {
    vi.mocked(useMarketplaceSaga).mockReturnValue({
      saga: { sagaId: "saga-123", state: "PROCESSING" } as any,
      loading: false,
      error: null,
    });

    renderResult();
    expect(screen.getByText(/Đang xử lý giao dịch…/i)).toBeInTheDocument();
  });

  it("renders success state and button link to My Tickets when completed", () => {
    vi.mocked(useMarketplaceSaga).mockReturnValue({
      saga: { sagaId: "saga-123", state: "COMPLETED" } as any,
      loading: false,
      error: null,
    });

    renderResult();
    expect(screen.getByText(/Mua vé thành công!/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Xem vé của tôi/i })).toHaveAttribute("href", "/profile?tab=tickets");
  });

  it("renders failure state and error message when failed", () => {
    vi.mocked(useMarketplaceSaga).mockReturnValue({
      saga: {
        sagaId: "saga-123",
        state: "FAILED",
        lastError: "Vé đã bị hủy trước khi thanh toán",
      } as any,
      loading: false,
      error: null,
    });

    renderResult();
    expect(screen.getByText(/Giao dịch không thành công/i)).toBeInTheDocument();
    expect(screen.getByText("Vé đã bị hủy trước khi thanh toán")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Quay lại sàn vé/i })).toHaveAttribute("href", "/resale-ticket");
  });
});
