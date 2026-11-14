// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "@/i18n";
import { EventCheckin } from "../../src/features/organizer/event-manage/EventCheckin";
import { CHECKIN_QUEUE_KEY } from "../../src/features/organizer/event-manage/checkinQueue";

const api = vi.hoisted(() => ({
  getCheckinSummary: vi.fn(),
  getCheckinPage: vi.fn(),
  searchCheckinTickets: vi.fn(),
  getEventById: vi.fn(),
  checkinTicket: vi.fn(),
}));
vi.mock("@/services/eventApi", () => ({ eventApi: api }));
// the camera is not part of these tests (ScannerPanel has its own)
vi.mock("../../src/features/organizer/event-manage/ScannerPanel", () => ({ ScannerPanel: () => <div data-testid="scanner" /> }));
vi.mock("../../src/features/organizer/event-manage/checkinFeedback", () => ({ giveCheckinFeedback: vi.fn() }));

const summary = {
  eventId: "e1", total: 100, checkedIn: 40,
  byShowtime: [{ id: "s1", name: null, total: 60, checkedIn: 30 }, { id: "s2", name: null, total: 40, checkedIn: 10 }],
  byTicketType: [{ id: "t1", name: "VIP", total: 20, checkedIn: 15 }, { id: "t2", name: "Thường", total: 80, checkedIn: 25 }],
};
const emptyPage = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 1 };

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/events/e1/checkin"]}>
      <Routes><Route path="/events/:eventId/checkin" element={<EventCheckin />} /></Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  api.getCheckinSummary.mockResolvedValue(summary);
  api.getCheckinPage.mockResolvedValue(emptyPage);
  api.getEventById.mockResolvedValue({ showtimes: [{ id: "s1", startTime: "2026-12-01T19:00:00" }, { id: "s2", startTime: "2026-12-02T19:00:00" }] });
  localStorage.clear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("check-in page", () => {
  it("shows entered over total with progress per showtime and ticket type", async () => {
    renderPage();
    expect(await screen.findByText(/\/ 100/)).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Tiến độ check-in" }).getAttribute("aria-valuenow")).toBe("40");
    expect(screen.getByText("30/60")).toBeTruthy();
    expect(screen.getByText("15/20")).toBeTruthy();
    expect(screen.getByText("VIP")).toBeTruthy();
  });

  it("refreshes the counter every 5 seconds while the tab is visible", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPage();
    await waitFor(() => expect(api.getCheckinSummary).toHaveBeenCalledTimes(1));
    await act(async () => { await vi.advanceTimersByTimeAsync(5100); });
    expect(api.getCheckinSummary.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("reports a success, a used ticket and a refusal differently", async () => {
    renderPage();
    await screen.findByText(/\/ 100/);
    const input = screen.getByLabelText("Mã vé cần check-in");

    api.checkinTicket.mockResolvedValueOnce({ status: "VALID", code: "SUCCESS", ticketTypeName: "VIP" });
    fireEvent.change(input, { target: { value: "h1" } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);
    expect(await screen.findByText("Check-in thành công")).toBeTruthy();

    api.checkinTicket.mockResolvedValueOnce({ status: "DUPLICATED", code: "ALREADY_USED" });
    fireEvent.change(input, { target: { value: "h1" } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);
    expect(await screen.findByText("Vé đã được sử dụng")).toBeTruthy();
    expect(screen.queryByText("Check-in thành công")).toBeNull();

    api.checkinTicket.mockRejectedValueOnce({ response: { status: 400, data: { code: "WRONG_EVENT" } } });
    fireEvent.change(input, { target: { value: "h2" } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);
    expect(await screen.findByText("Vé thuộc sự kiện khác")).toBeTruthy();
  });

  it("keeps a scan that could not reach the server and shows it as waiting", async () => {
    renderPage();
    await screen.findByText(/\/ 100/);
    api.checkinTicket.mockRejectedValue({ isAxiosError: true, code: "ERR_NETWORK" });
    const input = screen.getByLabelText("Mã vé cần check-in");
    fireEvent.change(input, { target: { value: "offline-1" } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);
    expect(await screen.findByText("Chưa có mạng, đã lưu lượt quét")).toBeTruthy();
    expect(screen.getByText(/1 lượt quét chờ đồng bộ/)).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(CHECKIN_QUEUE_KEY) ?? "[]")).toHaveLength(1);
  });

  it("sends the queued scans again when the network comes back", async () => {
    localStorage.setItem(CHECKIN_QUEUE_KEY, JSON.stringify([{ id: "q1", eventId: "e1", qrCodeHash: "late-1", queuedAt: "2026-11-14T08:00:00Z" }]));
    api.checkinTicket.mockResolvedValue({ status: "VALID", code: "SUCCESS" });
    renderPage();
    await waitFor(() => expect(api.checkinTicket).toHaveBeenCalledWith("e1", "late-1", undefined));
    expect(await screen.findByText(/Đã đồng bộ 1 lượt quét/)).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(CHECKIN_QUEUE_KEY) ?? "[]")).toHaveLength(0);
  });

  it("searches for a guest only from two characters and checks one in", async () => {
    api.searchCheckinTickets.mockResolvedValue([
      { ticketId: "tk1", shortCode: "AB12CD", ownerMasked: "Ngu***", ticketTypeName: "VIP", seatName: "A1", ticketStatus: "VALID", checkedIn: false, qrCodeHash: "hash-ab12" },
      { ticketId: "tk2", shortCode: "AB99ZZ", ticketTypeName: "VIP", ticketStatus: "USED", checkedIn: true, checkedInAt: "2026-11-14T08:00:00Z" },
    ]);
    api.checkinTicket.mockResolvedValue({ status: "VALID", code: "SUCCESS" });
    renderPage();
    await screen.findByText(/\/ 100/);
    const box = screen.getByLabelText("Tìm khách để check-in");

    fireEvent.change(box, { target: { value: "A" } });
    await new Promise((r) => setTimeout(r, 600));
    expect(api.searchCheckinTickets).not.toHaveBeenCalled();

    fireEvent.change(box, { target: { value: "AB" } });
    expect(await screen.findByText("AB12CD")).toBeTruthy();
    expect(api.searchCheckinTickets).toHaveBeenCalledWith("e1", "AB", { showtimeId: undefined });
    expect(screen.getByText("Ngu***")).toBeTruthy();
    expect(within(screen.getByText("AB99ZZ").closest("li") as HTMLElement).getByText(/Đã vào/)).toBeTruthy();

    const row = screen.getByText("AB12CD").closest("li") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "Check-in" }));
    await waitFor(() => expect(api.checkinTicket).toHaveBeenCalledWith("e1", "hash-ab12"));
  });

  it("says so when the counter cannot be loaded", async () => {
    api.getCheckinSummary.mockRejectedValue(new Error("down"));
    renderPage();
    expect(await screen.findByText("Không cập nhật được số liệu")).toBeTruthy();
  });
});
