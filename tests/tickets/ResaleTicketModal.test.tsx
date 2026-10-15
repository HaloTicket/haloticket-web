// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, it, expect, beforeEach, afterEach, describe } from "vitest";
import { ResaleTicketModal, GiftTicketModal } from "@/features/tickets/TicketActionModals";
import { marketplaceApi } from "@/services/marketplaceApi";
import { ticketApi } from "@/services/ticketApi";
import { ekycApi } from "@/services/ekycApi";
import { userApi } from "@/services/userApi";
import type { TicketItem } from "@/features/tickets/MyTickets";

vi.mock("@/services/marketplaceApi", () => ({ marketplaceApi: { getResaleEligibility: vi.fn(), createResaleListing: vi.fn(), createGift: vi.fn() } }));
vi.mock("@/services/ticketApi", () => ({ ticketApi: { getMyTickets: vi.fn() } }));
vi.mock("@/features/resale/hooks/useMarketplaceSaga", () => ({ useMarketplaceSaga: () => ({ saga: null, loading: false, error: null }) }));
vi.mock("@/services/ekycApi", () => ({ ekycApi: { getOrganizerEligibility: vi.fn() } }));
vi.mock("@/services/userApi", () => ({ userApi: { findGiftRecipient: vi.fn() }, getCachedUserProfile: () => ({ keycloakId: "seller" }) }));
const ticket: TicketItem = { id: "t1", eventTitle: "Concert", ticketTypeName: "VIP", totalAmount: 200000, bookingCode: "ORDER", eventId: "event", eventTime: "20:00", eventLocation: "Hà Nội", quantity: 1, rawStatus: "VALID", status: "UPCOMING" };
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  vi.mocked(ticketApi.getMyTickets).mockResolvedValue([1, 2, 3].map(index => ({ id: `t${index}`, eventId: "event", bookingId: "ORDER", showtimeId: "show", ticketTypeName: index === 3 ? "GA" : "VIP", status: "VALID", seatNumber: `A${index}` })));
  vi.mocked(ekycApi.getOrganizerEligibility).mockResolvedValue({ eligible: true });
  vi.mocked(marketplaceApi.getResaleEligibility).mockImplementation(async id => ({ ticketId: id, eventId: "event", eligible: true, originalPrice: 200000, minPrice: 160000, maxPrice: 240000, policyVersion: 1 }));
  vi.mocked(marketplaceApi.createResaleListing).mockResolvedValue({ sagaId: "saga", state: "WAITING_LOCK" });
  vi.mocked(marketplaceApi.createGift).mockResolvedValue({ sagaId: "gift", state: "WAITING_LOCK" });
  vi.mocked(userApi.findGiftRecipient).mockResolvedValue({ userId: "recipient", email: "recipient@example.com", fullName: "Người nhận" });
});
afterEach(cleanup);
function renderFlow(gift = false) { render(<MemoryRouter>{gift ? <GiftTicketModal ticket={ticket} onClose={() => {}} onChanged={() => {}} /> : <ResaleTicketModal ticket={ticket} onClose={() => {}} onChanged={() => {}} />}</MemoryRouter>); }
async function selectSecond() { fireEvent.click(await screen.findByRole("checkbox", { name: "Chọn vé A2" })); }
async function nextToPrice() { fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" })); await screen.findByLabelText("Giá bán mỗi vé"); }
async function confirmResale() {
  fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /Tôi đồng ý điều khoản/ }));
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận đăng bán" }));
  await waitFor(() => expect(marketplaceApi.createResaleListing).toHaveBeenCalled());
}
describe("multi-ticket seller flow", () => {
  it("uses the event price range even when an old admin cap is stored locally", async () => {
    localStorage.setItem("haloticket_resale_cap_percentage", "0");
    localStorage.setItem("haloticket_resale_fee_config", JSON.stringify({ capPercentage: 0 }));
    renderFlow(); await screen.findByRole("checkbox", { name: "Chọn vé A1" });
    await nextToPrice();
    fireEvent.change(screen.getByLabelText("Giá bán mỗi vé"), { target: { value: "240000" } });
    expect((screen.getByRole("button", { name: "Tiếp tục" }) as HTMLButtonElement).disabled).toBe(false);
    await confirmResale();
    expect(marketplaceApi.createResaleListing).toHaveBeenCalledWith(expect.objectContaining({ price: 240000, policyVersion: 1 }), expect.any(String));
  });
  it("enforces a lower event price ceiling despite a higher cached admin cap", async () => {
    localStorage.setItem("haloticket_resale_cap_percentage", "100");
    vi.mocked(marketplaceApi.getResaleEligibility).mockResolvedValue({ ticketId: "t1", eventId: "event", eligible: true, originalPrice: 200000, minPrice: 100000, maxPrice: 200000, policyVersion: 2 });
    renderFlow(); await screen.findByRole("checkbox", { name: "Chọn vé A1" });
    await nextToPrice();
    expect(screen.getByText(/50%–100%/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Giá bán mỗi vé"), { target: { value: "200001" } });
    expect((screen.getByRole("button", { name: "Tiếp tục" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("sends selected real ticket IDs and enforces non-retail only for multiple tickets", async () => {
    renderFlow(); await selectSecond();
    fireEvent.click(screen.getByRole("switch", { name: "Không bán lẻ" }));
    await nextToPrice();
    expect(marketplaceApi.getResaleEligibility).toHaveBeenCalledWith("t1");
    expect(marketplaceApi.getResaleEligibility).toHaveBeenCalledWith("t2");
    expect(screen.getAllByText(/80%–120%/)).toHaveLength(2);
    await confirmResale();
    expect(marketplaceApi.createResaleListing).toHaveBeenCalledWith(expect.objectContaining({ ticketIds: ["t1", "t2"], allowRetail: false, price: 160000 }), expect.any(String));
  });
  it("normalizes back to retail after reducing a non-retail group to one", async () => {
    renderFlow(); await selectSecond();
    fireEvent.click(screen.getByRole("switch", { name: "Không bán lẻ" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Chọn vé A2" }));
    expect((screen.getByRole("switch") as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole("switch") as HTMLInputElement).disabled).toBe(true);
    await nextToPrice(); await confirmResale();
    expect(marketplaceApi.createResaleListing).toHaveBeenCalledWith(expect.objectContaining({ ticketIds: ["t1"], allowRetail: true }), expect.any(String));
  });
  it("allows multiple tickets with retail enabled", async () => {
    renderFlow(); await selectSecond(); await nextToPrice(); await confirmResale();
    expect(marketplaceApi.createResaleListing).toHaveBeenCalledWith(expect.objectContaining({ ticketIds: ["t1", "t2"], allowRetail: true }), expect.any(String));
  });
  it("blocks no selection and invalid price", async () => {
    renderFlow(); fireEvent.click(await screen.findByRole("checkbox", { name: "Chọn vé A1" }));
    expect((screen.getByRole("button", { name: "Tiếp tục" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: "Chọn vé A1" })); await nextToPrice();
    fireEvent.change(screen.getByLabelText("Giá bán mỗi vé"), { target: { value: "1" } });
    expect((screen.getByRole("button", { name: "Tiếp tục" }) as HTMLButtonElement).disabled).toBe(true);
    expect(marketplaceApi.createResaleListing).not.toHaveBeenCalled();
  });
  it("retains eKYC gating", async () => {
    vi.mocked(ekycApi.getOrganizerEligibility).mockResolvedValue({ eligible: false });
    renderFlow(); await screen.findByRole("checkbox", { name: "Chọn vé A1" });
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    expect(await screen.findByRole("link", { name: "Xác minh eKYC ngay" })).toBeTruthy();
    expect(marketplaceApi.createResaleListing).not.toHaveBeenCalled();
  });
  it("does not pretend to have a ticket when loading fails", async () => {
    vi.mocked(ticketApi.getMyTickets).mockRejectedValue(new Error("offline"));
    renderFlow(); expect(await screen.findByRole("alert")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Tiếp tục" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
describe("multi-ticket gift", () => {
  it("submits one invitation with selected tickets across tiers", async () => {
    renderFlow(true); await screen.findByRole("checkbox", { name: "Chọn vé A3" });
    fireEvent.click(screen.getByRole("checkbox", { name: "Chọn vé A3" }));
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    fireEvent.change(screen.getByLabelText("Email người nhận"), { target: { value: "recipient@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Tìm" }));
    await screen.findByText("Người nhận", { selector: "p" });
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    expect(screen.getByText("Đã chọn 2 vé")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /Tôi đã kiểm tra người nhận/ }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận tặng vé" }));
    await waitFor(() => expect(marketplaceApi.createGift).toHaveBeenCalledTimes(1));
    expect(marketplaceApi.createGift).toHaveBeenCalledWith(expect.objectContaining({ ticketIds: ["t1", "t3"], recipientEmail: "recipient@example.com", acceptedTerms: true }), expect.any(String));
  });
});
