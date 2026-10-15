// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import EventTransfers from "@/features/organizer/event-manage/EventTransfers";
import { eventTransferApi } from "@/services/eventTransferApi";
import type { TransferSettingsData } from "@/types/eventTransfer";

vi.mock("@/services/eventTransferApi", () => ({ eventTransferApi: {
  getSettings: vi.fn(), getListings: vi.fn(), getGifts: vi.fn(), updateResalePolicy: vi.fn(), updateGiftPolicy: vi.fn(),
} }));
const settings: TransferSettingsData = {
  canWrite: true,
  resale: { eventId: "event-1", enabled: true, minPricePercent: 80, maxPricePercent: 130, opensAt: null, closesAt: null, ticketTypeScope: "ALL", allowedTicketTypeIds: [], termsVersion: null, version: 3 },
  gift: { eventId: "event-1", enabled: true, opensAt: null, closesAt: null, invitationTtlHours: 24, ticketTypeScope: "ALL", allowedTicketTypeIds: [], version: 4 },
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(eventTransferApi.getSettings).mockResolvedValue(settings);
  const emptyPage = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 };
  vi.mocked(eventTransferApi.getListings).mockResolvedValue(emptyPage);
  vi.mocked(eventTransferApi.getGifts).mockResolvedValue(emptyPage);
  vi.mocked(eventTransferApi.updateResalePolicy).mockResolvedValue(settings.resale!);
  vi.mocked(eventTransferApi.updateGiftPolicy).mockResolvedValue(settings.gift!);
});
afterEach(cleanup);
function renderPage() {
  render(<MemoryRouter initialEntries={["/organizer/events/event-1/manage/transfers"]}>
    <Routes><Route path="/organizer/events/:eventId/manage/transfers" element={<EventTransfers />} /></Routes>
  </MemoryRouter>);
}
it("loads and saves resale and gift policies for the selected event", async () => {
  renderPage();
  await screen.findByText("Cấu hình bán lại vé");
  expect(eventTransferApi.getSettings).toHaveBeenCalledWith("event-1");
  expect(eventTransferApi.getListings).toHaveBeenCalledWith("event-1", 0);
  fireEvent.change(screen.getAllByRole("spinbutton")[1], { target: { value: "140" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  await waitFor(() => expect(eventTransferApi.updateResalePolicy).toHaveBeenCalledWith("event-1", expect.objectContaining({ maxPricePercent: 140, expectedVersion: 3 })));
  fireEvent.click(screen.getByRole("button", { name: "Tặng vé" }));
  await screen.findByText("Cấu hình tặng vé");
  expect(eventTransferApi.getGifts).toHaveBeenCalledWith("event-1", 0);
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "48" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  await waitFor(() => expect(eventTransferApi.updateGiftPolicy).toHaveBeenCalledWith("event-1", expect.objectContaining({ invitationTtlHours: 48, expectedVersion: 4 })));
});
it("keeps manager access read-only for both policies", async () => {
  vi.mocked(eventTransferApi.getSettings).mockResolvedValue({ ...settings, canWrite: false });
  renderPage();
  await screen.findByText("Chỉ xem");
  expect((screen.getByRole("switch") as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByRole("button", { name: "Lưu thay đổi" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Tặng vé" }));
  expect((screen.getByRole("switch") as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByRole("button", { name: "Lưu thay đổi" })).toBeNull();
});
