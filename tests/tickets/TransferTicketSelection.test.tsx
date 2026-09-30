// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TransferTicketSelection, transferCandidates } from "@/features/tickets/components/TransferTicketSelection";
import type { OwnedTicketApiResponse } from "@/types/ticket";

const tickets: OwnedTicketApiResponse[] = [
  { id: "one", eventId: "event", bookingId: "order", showtimeId: "show", ticketTypeName: "VIP", status: "VALID", seatNumber: "A1" },
  { id: "two", eventId: "event", bookingId: "order", showtimeId: "show", ticketTypeName: "VIP", status: "VALID", seatNumber: "A2" },
  { id: "three", eventId: "event", bookingId: "order", showtimeId: "show", ticketTypeName: "GA", status: "VALID" },
];
afterEach(cleanup);
describe("real ticket selection", () => {
  it("keeps selected order/showtime and excludes other orders, locked tickets and other showtimes", () => {
    const all = [...tickets, { ...tickets[0], id: "other", bookingId: "another" },
      { ...tickets[0], id: "locked", status: "LOCKED_FOR_RESALE" },
      { ...tickets[0], id: "later", showtimeId: "later" }];
    expect(transferCandidates(all, "one").map(ticket => ticket.id)).toEqual(["one", "two", "three"]);
  });
  it("does not group unrelated orphan tickets with no booking", () => {
    expect(transferCandidates(tickets.map(ticket => ({ ...ticket, bookingId: null })), "one")).toHaveLength(1);
  });
  it("lets users choose individual seats and select all within a tier", () => {
    const onChange = vi.fn();
    render(<TransferTicketSelection tickets={tickets} selectedIds={["one"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Chọn vé A2" }));
    expect(onChange).toHaveBeenLastCalledWith(["one", "two"]);
    fireEvent.click(screen.getByRole("checkbox", { name: "Chọn tất cả VIP" }));
    expect(onChange).toHaveBeenLastCalledWith(["one", "two"]);
    expect(screen.getByText("Đã chọn 1/3 vé")).toBeTruthy();
  });
});
