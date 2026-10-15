// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import EventTransfers from "@/features/organizer/event-manage/EventTransfers";
import { eventTransferApi } from "@/services/eventTransferApi";
import type { TransferSettingsData } from "@/types/eventTransfer";
import "@/i18n";

vi.mock("@/services/eventTransferApi", () => ({
  eventTransferApi: {
    getSettings: vi.fn(),
    getListings: vi.fn(),
    getGifts: vi.fn(),
    updateResalePolicy: vi.fn(),
    updateGiftPolicy: vi.fn(),
    cancelListing: vi.fn(),
    moderateListing: vi.fn(),
    cancelGift: vi.fn(),
  },
}));

const settings: TransferSettingsData = {
  canWrite: true,
  resale: {
    eventId: "event-1",
    enabled: true,
    minPricePercent: 80,
    maxPricePercent: 130,
    serviceFeePercent: 5,
    opensAt: null,
    closesAt: null,
    ticketTypeScope: "ALL",
    allowedTicketTypeIds: [],
    termsVersion: null,
    version: 3,
  },
  gift: {
    eventId: "event-1",
    enabled: true,
    opensAt: null,
    closesAt: null,
    invitationTtlHours: 24,
    requireEkyc: true,
    maxGiftCount: 3,
    ticketTypeScope: "ALL",
    allowedTicketTypeIds: [],
    version: 4,
  },
};

const sampleListings = {
  content: [
    {
      listingId: "LST-1",
      refCode: "RSL-7F9A2",
      ticketTypeName: "VIP",
      seatCode: "A-12",
      sellerEmailMasked: "935***ad",
      price: 450000,
      originalPrice: 400000,
      currency: "VND",
      status: "ACTIVE",
      createdAt: "2026-10-02T16:32:00Z",
    },
    {
      listingId: "LST-2",
      refCode: "RSL-3C8D1",
      ticketTypeName: "Standard",
      seatCode: null,
      sellerEmailMasked: "912***88",
      price: 380000,
      originalPrice: 350000,
      currency: "VND",
      status: "RESERVED",
      createdAt: "2026-10-02T14:20:00Z",
    },
  ],
  totalElements: 2,
  totalPages: 1,
  number: 0,
  size: 20,
};

const sampleGifts = {
  content: [
    {
      sagaId: "GFT-9A1B2",
      senderEmailMasked: "935***ad",
      recipientEmailMasked: "nguy***@gmail.com",
      ticketTypeName: "VIP",
      sentAt: "2026-10-02T16:20:00Z",
      expiresAt: "2026-10-03T16:20:00Z",
      status: "COMPLETED",
    },
    {
      sagaId: "GFT-7D6E9",
      senderEmailMasked: "912***88",
      recipientEmailMasked: "tranh***@gmail.com",
      ticketTypeName: "Standard",
      sentAt: "2026-10-02T14:05:00Z",
      expiresAt: "2026-10-03T14:05:00Z",
      status: "PENDING",
    },
  ],
  totalElements: 2,
  totalPages: 1,
  number: 0,
  size: 20,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(eventTransferApi.getSettings).mockResolvedValue(settings);
  vi.mocked(eventTransferApi.getListings).mockResolvedValue(sampleListings);
  vi.mocked(eventTransferApi.getGifts).mockResolvedValue(sampleGifts);
  vi.mocked(eventTransferApi.updateResalePolicy).mockResolvedValue(settings.resale!);
  vi.mocked(eventTransferApi.updateGiftPolicy).mockResolvedValue(settings.gift!);
});

afterEach(cleanup);

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/organizer/events/event-1/manage/transfers"]}>
      <Routes>
        <Route path="/organizer/events/:eventId/manage/transfers" element={<EventTransfers />} />
      </Routes>
    </MemoryRouter>
  );
}

it("loads and saves resale and gift policies for the selected event", async () => {
  renderPage();
  await screen.findByText("Cấu hình bán lại vé");
  expect(eventTransferApi.getSettings).toHaveBeenCalledWith("event-1");
  expect(eventTransferApi.getListings).toHaveBeenCalledWith("event-1", 0, 10, undefined);

  // Edit maxPricePercent in Resale section (second spinbutton)
  fireEvent.change(screen.getAllByRole("spinbutton")[1], { target: { value: "140" } });
  fireEvent.click(screen.getByRole("button", { name: /Lưu thay đổi/i }));
  await waitFor(() =>
    expect(eventTransferApi.updateResalePolicy).toHaveBeenCalledWith(
      "event-1",
      expect.objectContaining({ maxPricePercent: 140, expectedVersion: 3 })
    )
  );

  // Switch to Gift tab
  fireEvent.click(screen.getByRole("tab", { name: "Tặng vé" }));
  await screen.findByText("Cấu hình tặng vé");
  expect(eventTransferApi.getGifts).toHaveBeenCalledWith("event-1", 0, 10, undefined);

  // Open Advanced to change TTL
  fireEvent.click(screen.getByRole("button", { name: /Nâng cao/i }));
  const ttlInput = await screen.findByDisplayValue("24");
  fireEvent.change(ttlInput, { target: { value: "48" } });
  fireEvent.click(screen.getByRole("button", { name: /Lưu thay đổi/i }));
  await waitFor(() =>
    expect(eventTransferApi.updateGiftPolicy).toHaveBeenCalledWith(
      "event-1",
      expect.objectContaining({ invitationTtlHours: 48, expectedVersion: 4 })
    )
  );
});

it("keeps manager access read-only for both policies", async () => {
  vi.mocked(eventTransferApi.getSettings).mockResolvedValue({ ...settings, canWrite: false });
  renderPage();
  await screen.findByText("Chỉ xem");

  // All switch buttons are disabled
  screen.getAllByRole("switch").forEach((sw) => {
    expect((sw as HTMLButtonElement).disabled).toBe(true);
  });
  expect(screen.queryByRole("button", { name: /Lưu thay đổi/i })).toBeNull();

  // Switch to Gift tab
  fireEvent.click(screen.getByRole("tab", { name: "Tặng vé" }));
  screen.getAllByRole("switch").forEach((sw) => {
    expect((sw as HTMLButtonElement).disabled).toBe(true);
  });
  expect(screen.queryByRole("button", { name: /Lưu thay đổi/i })).toBeNull();
});

it("renders listings table, searches and opens detail modal", async () => {
  renderPage();
  await screen.findByText("RSL-7F9A2");
  expect(screen.getAllByText("VIP").length).toBeGreaterThan(0);
  expect(screen.getByText("450.000 ₫")).toBeDefined();

  // Open detail modal
  fireEvent.click(screen.getByText("RSL-7F9A2"));
  await screen.findByText("Chi tiết tin đăng bán lại");
  expect(screen.getByRole("dialog")).toBeDefined();
  expect(screen.getByRole("button", { name: "Gỡ tin đăng" })).toBeDefined();

  // Close modal
  fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
  await waitFor(() => {
    expect(screen.queryByText("Chi tiết tin đăng bán lại")).toBeNull();
  });
});

it("renders gifts table and opens gift detail modal", async () => {
  renderPage();
  await screen.findByText("Cấu hình bán lại vé");
  fireEvent.click(screen.getByRole("tab", { name: "Tặng vé" }));
  await screen.findByText("GFT-9A1B2");

  // Open gift modal
  fireEvent.click(screen.getByText("GFT-9A1B2"));
  await screen.findByText("Chi tiết giao dịch tặng vé");
  expect(screen.getAllByText("nguy***@gmail.com").length).toBeGreaterThan(0);

  // Close modal
  fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
  await waitFor(() => {
    expect(screen.queryByText("Chi tiết giao dịch tặng vé")).toBeNull();
  });
});

it("validates event price bounds before saving", async () => {
  renderPage();
  await screen.findByText("Cấu hình bán lại vé");
  fireEvent.change(screen.getByLabelText("Giá tối thiểu (% giá gốc)"), { target: { value: "150" } });
  expect((screen.getByRole("button", { name: "Lưu thay đổi" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("alert").textContent).toContain("Giá tối thiểu");
  expect(eventTransferApi.updateResalePolicy).not.toHaveBeenCalled();
});

it("does not invent missing prices, recipient verification or receipt times", async () => {
  vi.mocked(eventTransferApi.getListings).mockResolvedValue({ ...sampleListings, content: [{ ...sampleListings.content[0], originalPrice: undefined }] });
  renderPage();
  fireEvent.click(await screen.findByText("RSL-7F9A2"));
  let dialog = screen.getByRole("dialog");
  expect(within(dialog).getAllByText("Chưa có thông tin").length).toBeGreaterThan(0);
  expect(within(dialog).queryByText("400.000 ₫")).toBeNull();
  fireEvent.click(within(dialog).getByRole("button", { name: "Đóng" }));
  fireEvent.click(screen.getByRole("tab", { name: "Tặng vé" }));
  fireEvent.click(await screen.findByText("GFT-9A1B2"));
  dialog = screen.getByRole("dialog");
  expect(within(dialog).queryByText(/Đã xác minh/)).toBeNull();
  expect(within(dialog).getAllByText("Chưa có thông tin").length).toBeGreaterThan(0);
});

it("retains unsaved prices while switching tabs", async () => {
  renderPage();
  await screen.findByText("Cấu hình bán lại vé");
  fireEvent.change(screen.getByLabelText("Giá trần (% giá gốc)"), { target: { value: "145" } });
  fireEvent.click(screen.getByRole("tab", { name: "Tặng vé" }));
  fireEvent.click(screen.getByRole("tab", { name: "Bán lại vé" }));
  expect((screen.getByLabelText("Giá trần (% giá gốc)") as HTMLInputElement).value).toBe("145");
});

it("keeps drafts on save failure and preserves the configured ticket scope", async () => {
  vi.mocked(eventTransferApi.getSettings).mockResolvedValue({ ...settings, resale: { ...settings.resale!, ticketTypeScope: "SELECTED", allowedTicketTypeIds: ["vip-1"], termsVersion: "v2" } });
  vi.mocked(eventTransferApi.updateResalePolicy).mockRejectedValue({ response: { status: 409 } });
  renderPage();
  await screen.findByText("Cấu hình bán lại vé");
  fireEvent.change(screen.getByLabelText("Giá trần (% giá gốc)"), { target: { value: "145" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  expect((await screen.findByRole("alert")).textContent).toContain("phiên bản mới nhất");
  expect((screen.getByLabelText("Giá trần (% giá gốc)") as HTMLInputElement).value).toBe("145");
  expect(eventTransferApi.updateResalePolicy).toHaveBeenCalledWith("event-1", expect.objectContaining({ ticketTypeScope: "SELECTED", allowedTicketTypeIds: ["vip-1"], termsVersion: "v2" }));
});

it("requests reserved listings and pending gifts using their actual server states", async () => {
  renderPage();
  await screen.findByText("Cấu hình bán lại vé");
  fireEvent.click(screen.getByRole("button", { name: "Đang giữ" }));
  await waitFor(() => expect(eventTransferApi.getListings).toHaveBeenCalledWith("event-1", 0, 10, "RESERVED"));
  fireEvent.click(screen.getByRole("tab", { name: "Tặng vé" }));
  fireEvent.click(screen.getByRole("button", { name: "Chờ xác nhận" }));
  await waitFor(() => expect(eventTransferApi.getGifts).toHaveBeenCalledWith("event-1", 0, 10, "PENDING"));
});

it("edits fees and approval, preserves scope and uses the server's saved values", async () => {
  vi.mocked(eventTransferApi.getSettings).mockResolvedValue({ ...settings, resale: { ...settings.resale!, serviceFeePercent: undefined, ticketTypeScope: "SELECTED", allowedTicketTypeIds: ["vip-1"] } });
  vi.mocked(eventTransferApi.updateResalePolicy).mockResolvedValue({ ...settings.resale!, serviceFeePercent: 6, requireApproval: true });
  renderPage();
  const fee = await screen.findByLabelText("Phí dịch vụ (áp dụng cho người bán)") as HTMLInputElement;
  expect(fee.value).toBe("5");
  fireEvent.change(fee, { target: { value: "7.5" } });
  fireEvent.click(screen.getByRole("button", { name: "Nâng cao" }));
  fireEvent.click(screen.getByRole("switch", { name: "Yêu cầu duyệt tin đăng bán lại" }));
  fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  await screen.findByText("Đã lưu cấu hình bán lại vé");
  expect(eventTransferApi.updateResalePolicy).toHaveBeenCalledWith("event-1", expect.objectContaining({ serviceFeePercent: 7.5, requireApproval: true, ticketTypeScope: "SELECTED", allowedTicketTypeIds: ["vip-1"] }));
  expect(fee.value).toBe("6");
  expect(screen.getByRole("switch", { name: "Yêu cầu duyệt tin đăng bán lại" }).getAttribute("aria-checked")).toBe("true");
  expect((screen.getByRole("button", { name: "Lưu thay đổi" }) as HTMLButtonElement).disabled).toBe(true);
});

it("validates fees and persists gift eKYC and unlimited gifts without losing scope", async () => {
  vi.mocked(eventTransferApi.getSettings).mockResolvedValue({ ...settings, gift: { ...settings.gift!, ticketTypeScope: "SELECTED", allowedTicketTypeIds: ["gift-vip"] } });
  vi.mocked(eventTransferApi.updateGiftPolicy).mockResolvedValue({ ...settings.gift!, requireEkyc: false, maxGiftCount: 0 });
  renderPage();
  const fee = await screen.findByLabelText("Phí dịch vụ (áp dụng cho người bán)");
  fireEvent.change(fee, { target: { value: "101" } });
  expect(screen.getByRole("alert").textContent).toContain("Phí dịch vụ phải");
  expect((screen.getByRole("button", { name: "Lưu thay đổi" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("tab", { name: "Tặng vé" }));
  fireEvent.change(screen.getByLabelText("Giới hạn số lần tặng", { selector: "input" }), { target: { value: "0" } });
  expect(screen.getByRole("alert").textContent).toContain("1 đến 100");
  fireEvent.click(screen.getByRole("switch", { name: "Giới hạn số lần tặng" }));
  fireEvent.click(screen.getByRole("switch", { name: "Yêu cầu xác minh danh tính người nhận (eKYC)" }));
  fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  await screen.findByText("Đã lưu cấu hình tặng vé");
  expect(eventTransferApi.updateGiftPolicy).toHaveBeenCalledWith("event-1", expect.objectContaining({ requireEkyc: false, maxGiftCount: 0, ticketTypeScope: "SELECTED", allowedTicketTypeIds: ["gift-vip"] }));
  expect(screen.getByRole("switch", { name: "Giới hạn số lần tặng" }).getAttribute("aria-checked")).toBe("false");
  expect(screen.getByRole("switch", { name: "Yêu cầu xác minh danh tính người nhận (eKYC)" }).getAttribute("aria-checked")).toBe("false");
});

it("reloads the first page for new listings and passes pagination size and status", async () => {
  vi.mocked(eventTransferApi.getListings).mockResolvedValue({ ...sampleListings, totalElements: 25, totalPages: 3 });
  renderPage();
  await screen.findByText("RSL-7F9A2");
  fireEvent.click(screen.getByRole("button", { name: "Trang tiếp theo" }));
  await waitFor(() => expect(eventTransferApi.getListings).toHaveBeenLastCalledWith("event-1", 1, 10, undefined));
  await screen.findByText("RSL-7F9A2");
  const beforeReload = vi.mocked(eventTransferApi.getListings).mock.calls.length;
  vi.mocked(eventTransferApi.getListings).mockResolvedValueOnce({ ...sampleListings, content: [{ ...sampleListings.content[0], refCode: "RSL-NEWEST" }] });
  fireEvent.click(screen.getByRole("button", { name: "Tải lại bảng" }));
  await waitFor(() => expect(eventTransferApi.getListings).toHaveBeenCalledTimes(beforeReload + 1));
  expect(eventTransferApi.getListings).toHaveBeenLastCalledWith("event-1", 0, 10, undefined);
  await screen.findByText("RSL-NEWEST");
  fireEvent.click(screen.getByRole("button", { name: "Số dòng:" }));
  fireEvent.pointerDown(screen.getByRole("button", { name: "50" }));
  await waitFor(() => expect(eventTransferApi.getListings).toHaveBeenLastCalledWith("event-1", 0, 50, undefined));
  await screen.findByText("RSL-7F9A2");
  fireEvent.click(screen.getByRole("button", { name: "Đang giữ" }));
  await waitFor(() => expect(eventTransferApi.getListings).toHaveBeenLastCalledWith("event-1", 0, 50, "RESERVED"));
});

it("refreshes the current page after mutation and clamps it if the last row was removed", async () => {
  vi.mocked(eventTransferApi.getListings).mockResolvedValue({ ...sampleListings, totalElements: 11, totalPages: 2 });
  renderPage();
  await screen.findByText("RSL-7F9A2");
  fireEvent.click(screen.getByRole("button", { name: "Trang tiếp theo" }));
  await waitFor(() => expect(eventTransferApi.getListings).toHaveBeenLastCalledWith("event-1", 1, 10, undefined));
  fireEvent.click(await screen.findByText("RSL-7F9A2"));
  fireEvent.click(screen.getByRole("button", { name: "Gỡ tin đăng" }));
  vi.mocked(eventTransferApi.getListings).mockResolvedValueOnce({ ...sampleListings, content: [], totalElements: 10, totalPages: 1 });
  const beforeMutation = vi.mocked(eventTransferApi.getListings).mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận gỡ" }));
  await screen.findByText(/Đã gửi yêu cầu gỡ tin đăng/);
  await waitFor(() => expect(eventTransferApi.getListings).toHaveBeenCalledTimes(beforeMutation + 2));
  expect(eventTransferApi.getListings).toHaveBeenNthCalledWith(beforeMutation + 1, "event-1", 1, 10, undefined);
  expect(eventTransferApi.getListings).toHaveBeenLastCalledWith("event-1", 0, 10, undefined);
});

it("only moderates pending approval records and retains errors for retry", async () => {
  vi.mocked(eventTransferApi.getListings).mockResolvedValue({ ...sampleListings, content: [{ ...sampleListings.content[0], status: "PENDING_APPROVAL", serviceFeePercent: 8 }] });
  vi.mocked(eventTransferApi.moderateListing).mockRejectedValueOnce({ response: { data: { message: "Tin đăng đã thay đổi" } } }).mockResolvedValueOnce({ sagaId: "cancel-1", state: "COMPLETED" });
  renderPage();
  fireEvent.click(await screen.findByText("RSL-7F9A2"));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText("8% (36.000 ₫)")).toBeDefined();
  fireEvent.click(within(dialog).getByRole("radio", { name: "Từ chối" }));
  expect((within(dialog).getByRole("button", { name: "Xác nhận" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(within(dialog).getByLabelText("Lý do từ chối"), { target: { value: "  Không đúng điều kiện  " } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Tin đăng đã thay đổi");
  expect(screen.getByRole("dialog")).toBeDefined();
  expect(eventTransferApi.moderateListing).toHaveBeenCalledWith("event-1", "LST-1", "REJECT", "Không đúng điều kiện");
  fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận" }));
  await screen.findByText(/Đã gửi yêu cầu từ chối tin đăng/);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(eventTransferApi.getListings).toHaveBeenCalledTimes(2);
});

it("sends organizer delist and gift cancel requests and refreshes records", async () => {
  vi.mocked(eventTransferApi.getGifts).mockResolvedValue({ ...sampleGifts, content: [{ ...sampleGifts.content[1], expiresAt: "2099-10-03T14:05:00Z" }] });
  renderPage();
  fireEvent.click(await screen.findByText("RSL-7F9A2"));
  fireEvent.click(screen.getByRole("button", { name: "Gỡ tin đăng" }));
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận gỡ" }));
  await screen.findByText(/Đã gửi yêu cầu gỡ tin đăng/);
  expect(eventTransferApi.cancelListing).toHaveBeenCalledWith("event-1", "LST-1");
  expect(eventTransferApi.getListings).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("tab", { name: "Tặng vé" }));
  fireEvent.click(await screen.findByText("GFT-7D6E9"));
  fireEvent.click(screen.getByRole("button", { name: "Hủy giao dịch" }));
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận hủy" }));
  await screen.findByText(/Đã gửi yêu cầu hủy giao dịch tặng vé/);
  expect(eventTransferApi.cancelGift).toHaveBeenCalledWith("event-1", "GFT-7D6E9");
  expect(eventTransferApi.getGifts).toHaveBeenCalledTimes(2);
});

it("lets managers inspect pending records without mutation controls", async () => {
  vi.mocked(eventTransferApi.getSettings).mockResolvedValue({ ...settings, canWrite: false });
  vi.mocked(eventTransferApi.getListings).mockResolvedValue({ ...sampleListings, content: [{ ...sampleListings.content[0], status: "PENDING_APPROVAL" }] });
  vi.mocked(eventTransferApi.getGifts).mockResolvedValue({ ...sampleGifts, content: [{ ...sampleGifts.content[1], expiresAt: "2099-10-03T14:05:00Z" }] });
  renderPage();
  fireEvent.click(await screen.findByText("RSL-7F9A2"));
  expect(screen.queryByRole("radio")).toBeNull();
  expect(screen.queryByRole("button", { name: "Gỡ tin đăng" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
  fireEvent.click(screen.getByRole("tab", { name: "Tặng vé" }));
  fireEvent.click(await screen.findByText("GFT-7D6E9"));
  expect(screen.queryByRole("button", { name: "Hủy giao dịch" })).toBeNull();
  expect(eventTransferApi.moderateListing).not.toHaveBeenCalled();
  expect(eventTransferApi.cancelListing).not.toHaveBeenCalled();
  expect(eventTransferApi.cancelGift).not.toHaveBeenCalled();
});

it("never offers approval for a reserved listing", async () => {
  renderPage();
  fireEvent.click(await screen.findByText("RSL-3C8D1"));
  expect(screen.getByText("Chi tiết tin đăng bán lại")).toBeDefined();
  expect(screen.queryByRole("radio")).toBeNull();
  expect(screen.queryByRole("button", { name: "Gỡ tin đăng" })).toBeNull();
});

it("keeps delist and gift cancellation dialogs open when requests fail", async () => {
  vi.mocked(eventTransferApi.cancelListing).mockRejectedValue({ response: { data: { message: "Không thể gỡ lúc này" } } });
  vi.mocked(eventTransferApi.cancelGift).mockRejectedValue({ response: { data: { message: "Lời mời đang được xử lý" } } });
  vi.mocked(eventTransferApi.getGifts).mockResolvedValue({ ...sampleGifts, content: [{ ...sampleGifts.content[1], expiresAt: "2099-10-03T14:05:00Z" }] });
  renderPage();
  fireEvent.click(await screen.findByText("RSL-7F9A2"));
  fireEvent.click(screen.getByRole("button", { name: "Gỡ tin đăng" }));
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận gỡ" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Không thể gỡ lúc này");
  expect(screen.getByRole("dialog")).toBeDefined();
  expect(eventTransferApi.getListings).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
  fireEvent.click(screen.getByRole("tab", { name: "Tặng vé" }));
  fireEvent.click(await screen.findByText("GFT-7D6E9"));
  fireEvent.click(screen.getByRole("button", { name: "Hủy giao dịch" }));
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận hủy" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Lời mời đang được xử lý");
  expect(screen.getByRole("dialog")).toBeDefined();
  expect(eventTransferApi.getGifts).toHaveBeenCalledTimes(1);
});

it("defaults new gift controls and saves an explicit finite gift limit", async () => {
  vi.mocked(eventTransferApi.getSettings).mockResolvedValue({ ...settings, gift: null });
  vi.mocked(eventTransferApi.updateGiftPolicy).mockResolvedValue({ ...settings.gift!, maxGiftCount: 7 });
  renderPage();
  await screen.findByText("Cấu hình bán lại vé");
  fireEvent.click(screen.getByRole("tab", { name: "Tặng vé" }));
  expect(screen.getByRole("switch", { name: "Yêu cầu xác minh danh tính người nhận (eKYC)" }).getAttribute("aria-checked")).toBe("true");
  const limit = screen.getByLabelText("Giới hạn số lần tặng", { selector: "input" }) as HTMLInputElement;
  expect(limit.value).toBe("3");
  fireEvent.click(screen.getByRole("switch", { name: "Bật tặng vé" }));
  fireEvent.change(limit, { target: { value: "7" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  await screen.findByText("Đã lưu cấu hình tặng vé");
  expect(eventTransferApi.updateGiftPolicy).toHaveBeenCalledWith("event-1", expect.objectContaining({ requireEkyc: true, maxGiftCount: 7 }));
  expect(limit.value).toBe("7");
});
