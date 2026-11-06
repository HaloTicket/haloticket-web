// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { i18n } from "@/i18n";
import { AddTicketModal } from "@/features/organizer/components/create-event/AddTicketModal";
import { TicketsSyncBanner } from "@/features/organizer/event-manage/components/TicketsSyncBanner";
import { eventSaveFailureMessage, parseEventSaveFailure } from "@/utils/eventSaveErrors";
import { getMinIssuedQuantity, normalizeTicketsForSave } from "@/utils/ticketQuantities";
import type { TicketItem } from "@/types/organizer";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock("@/services/axiosClient", () => ({ default: http }));

const ticket: TicketItem = {
  id: "t1", name: "VIP", price: 100000, isFree: false, totalQuantity: 1000, initialQuantity: 1000,
  soldQuantity: 30, heldQuantity: 5, minPerOrder: 1, maxPerOrder: 5, description: "",
};

beforeEach(() => { Object.values(http).forEach((f) => f.mockReset()); });
afterEach(cleanup);

describe("ticket quantity editing", () => {
  it("shows the issued number with sold and held read-only", () => {
    render(<AddTicketModal initialTicket={ticket} onClose={() => {}} onSave={() => {}} />);
    expect((screen.getByLabelText(/Số vé phát hành/) as HTMLInputElement).value).toBe("1000");
    expect(screen.getByText(/Đã bán: 30 · Đang giữ: 5/)).toBeTruthy();
  });

  it("sends initialQuantity (equal to totalQuantity) and keeps sold/held", () => {
    const onSave = vi.fn();
    render(<AddTicketModal initialTicket={ticket} onClose={() => {}} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText(/Số vé phát hành/), { target: { value: "800" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu loại vé" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ initialQuantity: 800, totalQuantity: 800, soldQuantity: 30, heldQuantity: 5 });
  });

  it("blocks an issued number below sold + held with a clear message", () => {
    const onSave = vi.fn();
    render(<AddTicketModal initialTicket={ticket} onClose={() => {}} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText(/Số vé phát hành/), { target: { value: "34" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu loại vé" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/không được thấp hơn 35/);
    fireEvent.change(screen.getByLabelText(/Số vé phát hành/), { target: { value: "35" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu loại vé" }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("normalizes a server ticket to the issued number, never the remaining stock", () => {
    const [t] = normalizeTicketsForSave([{ initialQuantity: 1000, totalQuantity: 940, remainingQuantity: 940 }]);
    expect(t).toMatchObject({ initialQuantity: 1000, totalQuantity: 1000 });
    expect(getMinIssuedQuantity({ initialQuantity: 1000, remainingQuantity: 940, heldQuantity: 5 })).toBe(65);
  });
});

describe("event save failures", () => {
  it("recognizes 502 TICKETS_SYNC_FAILED and 422 QUANTITY_BELOW_SOLD_AND_HELD, and nothing else", () => {
    expect(parseEventSaveFailure({ response: { status: 502, data: { code: "TICKETS_SYNC_FAILED", eventId: "e1" } } })).toEqual({ kind: "ticketsSyncFailed", eventId: "e1" });
    const f = parseEventSaveFailure({ response: { status: 422, data: { code: "QUANTITY_BELOW_SOLD_AND_HELD", name: "VIP", sold: 30, held: 5, minAllowed: 35 } } });
    expect(f).toEqual({ kind: "quantityBelowSoldHeld", name: "VIP", sold: 30, held: 5, minAllowed: 35 });
    expect(parseEventSaveFailure({ response: { status: 500, data: {} } })).toBeNull();
    expect(parseEventSaveFailure(new Error("x"))).toBeNull();
  });

  it("names the ticket and the minimum for 422 and says saved-but-not-synced for 502", () => {
    const t = (k: string, o?: Record<string, unknown>) => i18n.t(k, o) as string;
    const m422 = eventSaveFailureMessage({ kind: "quantityBelowSoldHeld", name: "VIP", sold: 30, held: 5, minAllowed: 35 }, t);
    expect(m422).toContain("VIP");
    expect(m422).toContain("35");
    expect(eventSaveFailureMessage({ kind: "ticketsSyncFailed" }, t)).toMatch(/đã được lưu nhưng hạng vé chưa đồng bộ/);
  });

  it("eventApi.updateEvent rethrows those two failures and keeps swallowing others", async () => {
    const { eventApi } = await import("@/services/eventApi");
    vi.spyOn(console, "error").mockImplementation(() => {});
    http.put.mockRejectedValueOnce({ response: { status: 502, data: { code: "TICKETS_SYNC_FAILED", eventId: "e1" } } });
    await expect(eventApi.updateEvent("e1", {})).rejects.toBeTruthy();
    http.put.mockRejectedValueOnce({ response: { status: 422, data: { code: "QUANTITY_BELOW_SOLD_AND_HELD", name: "VIP", minAllowed: 35 } } });
    await expect(eventApi.updateEvent("e1", {})).rejects.toBeTruthy();
    http.put.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    await expect(eventApi.updateEvent("e1", {})).resolves.toBeNull();
  });

  it("eventApi.resyncTickets posts to the resync endpoint", async () => {
    const { eventApi } = await import("@/services/eventApi");
    http.post.mockResolvedValue({});
    await eventApi.resyncTickets("e1");
    expect(http.post).toHaveBeenCalledWith("/events/e1/tickets/resync");
  });
});

describe("tickets sync banner", () => {
  it("is hidden when synced", () => {
    render(<TicketsSyncBanner eventId="e1" ticketsSync={{ status: "SYNCED" }} onResynced={() => {}} />);
    expect(screen.queryByText("Hạng vé chưa đồng bộ")).toBeNull();
  });

  it.each(["FAILED", "UNAVAILABLE"])("warns when %s and resyncs successfully", async (status) => {
    http.post.mockResolvedValue({});
    const onResynced = vi.fn();
    render(<TicketsSyncBanner eventId="e1" ticketsSync={{ status }} onResynced={onResynced} />);
    expect(screen.getByRole("alert").textContent).toContain("Hạng vé chưa đồng bộ");
    fireEvent.click(screen.getByRole("button", { name: "Đồng bộ lại" }));
    await waitFor(() => expect(onResynced).toHaveBeenCalledTimes(1));
    expect(http.post).toHaveBeenCalledWith("/events/e1/tickets/resync");
    expect(screen.getByRole("status").textContent).toMatch(/Đã đồng bộ hạng vé/);
  });

  it("disables the button while syncing and shows a real error on failure (no fake success)", async () => {
    let reject!: (e: unknown) => void;
    http.post.mockReturnValue(new Promise((_, r) => { reject = r; }));
    const onResynced = vi.fn();
    render(<TicketsSyncBanner eventId="e1" ticketsSync={{ status: "FAILED" }} onResynced={onResynced} />);
    fireEvent.click(screen.getByRole("button", { name: "Đồng bộ lại" }));
    const busy = await screen.findByRole("button", { name: /Đang đồng bộ/ });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    reject({ response: { status: 502, data: { code: "TICKETS_SYNC_FAILED" } } });
    await waitFor(() => expect(screen.getByText(/Đồng bộ hạng vé thất bại/)).toBeTruthy());
    expect(onResynced).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Đồng bộ lại" }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText(/Đã đồng bộ hạng vé/)).toBeNull();
  });
});
