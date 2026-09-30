import { afterEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/services/axiosClient", () => ({ default: { get } }));

import { ticketApi } from "@/services/ticketApi";

afterEach(() => get.mockReset());

describe("ticketApi.getMyTickets", () => {
  it("combines all pages from the paginated response", async () => {
    const first = { id: "ticket-1" };
    const second = { id: "ticket-2" };
    get.mockResolvedValueOnce({ content: [first], totalPages: 2 }).mockResolvedValueOnce({ content: [second], totalPages: 2 });

    await expect(ticketApi.getMyTickets()).resolves.toEqual([first, second]);
    expect(get).toHaveBeenNthCalledWith(1, "/tickets/mine", { params: { page: 0, size: 100 } });
    expect(get).toHaveBeenNthCalledWith(2, "/tickets/mine", { params: { page: 1, size: 100 } });
  });

  it("rejects a paginated response with an invalid totalPages value", async () => {
    get.mockResolvedValueOnce({ content: [], totalPages: "2" });
    await expect(ticketApi.getMyTickets()).rejects.toThrow("INVALID_TICKET_RESPONSE");
  });
});
