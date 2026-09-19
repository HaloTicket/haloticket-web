// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, it, expect, beforeEach, afterEach, describe } from "vitest";
import { ResaleTicketModal } from "@/features/tickets/TicketActionModals";
import { marketplaceApi } from "@/services/marketplaceApi";
import { ekycApi } from "@/services/ekycApi";
import type { TicketItem } from "@/features/tickets/MyTickets";

vi.mock("@/services/marketplaceApi", () => ({
  marketplaceApi: {
    getResaleEligibility: vi.fn(),
    createResaleListing: vi.fn(),
    getSaga: vi.fn(),
  },
}));

vi.mock("@/features/resale/hooks/useMarketplaceSaga", () => ({
  useMarketplaceSaga: () => ({ saga: null, loading: false, error: null }),
}));

vi.mock("@/services/ekycApi", () => ({
  ekycApi: {
    getOrganizerEligibility: vi.fn().mockResolvedValue({ eligible: true }),
  },
}));

const eligibleTicket: TicketItem = {
  id: "t1",
  eventTitle: "Test Event Concert",
  ticketTypeName: "GA",
  totalAmount: 200000,
  eventPoster: null,
  bookingCode: "BOOK-001",
  eventId: "e1",
  eventTime: "01/11/2026 18:00",
  eventLocation: "Hà Nội",
  quantity: 1,
  rawStatus: "VALID",
  status: "UPCOMING",
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

function renderModal(overrides?: Partial<TicketItem>) {
  const ticket = { ...eligibleTicket, ...overrides };
  return render(
    <MemoryRouter>
      <ResaleTicketModal ticket={ticket} onClose={() => {}} onChanged={() => {}} />
    </MemoryRouter>
  );
}

/** The label text "Giá bán" appears both in <label> text and aria-label on <input>.
 *  This helper finds the actual <input> element. */
function getPriceInput() {
  const els = screen.getAllByLabelText(/Giá bán/i);
  const input = els.find((el) => el.tagName === "INPUT");
  if (!input) throw new Error("Price input not found");
  return input as HTMLInputElement;
}

describe("ResaleTicketModal — 3-step seller flow", () => {
  it("shows step 1 with price input after eligibility loads", async () => {
    vi.mocked(marketplaceApi.getResaleEligibility).mockResolvedValue({
      ticketId: "t1", eventId: "e1", eligible: true,
      minPrice: 100000, maxPrice: 300000, originalPrice: 200000,
      policyVersion: 1, termsVersion: "v1",
    });
    renderModal();
    await waitFor(() => expect(getPriceInput()).toBeTruthy());
    expect(screen.getByRole("button", { name: /Tiếp tục/i })).toBeTruthy();
  });

  it("disables Tiếp tục when price is below minimum", async () => {
    vi.mocked(marketplaceApi.getResaleEligibility).mockResolvedValue({
      ticketId: "t1", eventId: "e1", eligible: true,
      minPrice: 100000, maxPrice: 300000, originalPrice: 200000,
    });
    renderModal();
    await waitFor(() => getPriceInput());
    fireEvent.change(getPriceInput(), { target: { value: "50000" } });
    expect((screen.getByRole("button", { name: /Tiếp tục/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("disables Tiếp tục when price is above maximum", async () => {
    vi.mocked(marketplaceApi.getResaleEligibility).mockResolvedValue({
      ticketId: "t1", eventId: "e1", eligible: true,
      minPrice: 100000, maxPrice: 300000, originalPrice: 200000,
    });
    renderModal();
    await waitFor(() => getPriceInput());
    fireEvent.change(getPriceInput(), { target: { value: "500000" } });
    expect((screen.getByRole("button", { name: /Tiếp tục/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("enables Tiếp tục when price is in valid range", async () => {
    vi.mocked(marketplaceApi.getResaleEligibility).mockResolvedValue({
      ticketId: "t1", eventId: "e1", eligible: true,
      minPrice: 100000, maxPrice: 300000, originalPrice: 200000,
    });
    renderModal();
    await waitFor(() => getPriceInput());
    fireEvent.change(getPriceInput(), { target: { value: "150000" } });
    expect((screen.getByRole("button", { name: /Tiếp tục/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("moves to step 2 with confirmation table when Tiếp tục clicked", async () => {
    vi.mocked(marketplaceApi.getResaleEligibility).mockResolvedValue({
      ticketId: "t1", eventId: "e1", eligible: true,
      minPrice: 100000, maxPrice: 300000, originalPrice: 200000,
    });
    renderModal();
    await waitFor(() => getPriceInput());
    fireEvent.change(getPriceInput(), { target: { value: "150000" } });
    fireEvent.click(screen.getByRole("button", { name: /Tiếp tục/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /Xác nhận đăng bán/i })).toBeTruthy());
    // Event title shows in confirmation dl (also in TicketSummary — use getAllByText)
    expect(screen.getAllByText("Test Event Concert").length).toBeGreaterThanOrEqual(1);
    // Price input is gone (no INPUT with aria-label Giá bán)
    const remaining = screen.queryAllByLabelText(/Giá bán/i).filter((el) => el.tagName === "INPUT");
    expect(remaining.length).toBe(0);
    // Back button visible
    expect(screen.getByRole("button", { name: /Quay lại/i })).toBeTruthy();
    // Terms checkbox present
    expect(screen.getByRole("checkbox")).toBeTruthy();
  });

  it("Xác nhận đăng bán is disabled until terms accepted", async () => {
    vi.mocked(marketplaceApi.getResaleEligibility).mockResolvedValue({
      ticketId: "t1", eventId: "e1", eligible: true,
      minPrice: 100000, maxPrice: 300000, originalPrice: 200000,
    });
    renderModal();
    await waitFor(() => getPriceInput());
    fireEvent.change(getPriceInput(), { target: { value: "150000" } });
    fireEvent.click(screen.getByRole("button", { name: /Tiếp tục/i }));
    await waitFor(() => screen.getByRole("button", { name: /Xác nhận đăng bán/i }));

    expect((screen.getByRole("button", { name: /Xác nhận đăng bán/i }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox"));
    expect((screen.getByRole("button", { name: /Xác nhận đăng bán/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("can navigate back from step 2 to step 1", async () => {
    vi.mocked(marketplaceApi.getResaleEligibility).mockResolvedValue({
      ticketId: "t1", eventId: "e1", eligible: true,
      minPrice: 100000, maxPrice: 300000, originalPrice: 200000,
    });
    renderModal();
    await waitFor(() => getPriceInput());
    fireEvent.change(getPriceInput(), { target: { value: "150000" } });
    fireEvent.click(screen.getByRole("button", { name: /Tiếp tục/i }));
    await waitFor(() => screen.getByRole("button", { name: /Quay lại/i }));
    fireEvent.click(screen.getByRole("button", { name: /Quay lại/i }));
    await waitFor(() => expect(getPriceInput()).toBeTruthy());
  });

  it("shows ineligible banner when ticket is not eligible", async () => {
    vi.mocked(marketplaceApi.getResaleEligibility).mockResolvedValue({
      ticketId: "t1", eventId: "e1", eligible: false,
    });
    renderModal();
    await waitFor(() => expect(screen.getByText(/không đủ điều kiện bán lại/i)).toBeTruthy());
    expect(screen.queryByRole("button", { name: /Tiếp tục/i })).toBeNull();
  });

  it("shows eKYC error message when EKYC_REQUIRED returned", async () => {
    vi.mocked(marketplaceApi.getResaleEligibility).mockRejectedValue({
      response: { data: { message: "EKYC_REQUIRED" } },
    });
    renderModal();
    // The error message text from errorMessage() for EKYC_REQUIRED
    await waitFor(() =>
      expect(screen.getByText(/hoàn tất xác minh danh tính/i)).toBeTruthy()
    );
    expect(screen.getByRole("link", { name: /Xác minh eKYC ngay/i })).toBeTruthy();
  });

  it("blocks seller at step 1 with eKYC banner when user is not eKYC verified", async () => {
    vi.mocked(marketplaceApi.getResaleEligibility).mockResolvedValue({
      ticketId: "t1", eventId: "e1", eligible: true,
      minPrice: 100000, maxPrice: 300000, originalPrice: 200000,
    });
    vi.mocked(ekycApi.getOrganizerEligibility).mockResolvedValue({
      eligible: false,
      reasonCode: "EKYC_NOT_STARTED",
    });
    renderModal();
    await waitFor(() =>
      expect(screen.getByText(/Tài khoản của bạn cần hoàn tất xác minh danh tính/i)).toBeTruthy()
    );
    expect(screen.getByRole("link", { name: /Xác minh eKYC ngay/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Tiếp tục/i })).toBeNull();
  });
});
