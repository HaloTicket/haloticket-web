// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MyTickets, {
  hydrateTickets,
  groupTicketsIntoOrders,
  formatTicketSeat,
  parseApiDateTime,
} from "@/features/tickets/MyTickets";
import OrderDetail from "@/features/tickets/OrderDetail";
import { ticketApi } from "@/services/ticketApi";
import { bookingApi } from "@/services/bookingApi";
import { eventApi } from "@/services/eventApi";
import type { OwnedTicketApiResponse } from "@/types";

vi.mock("@/services/ticketApi", () => ({
  ticketApi: {
    getMyTickets: vi.fn(),
  },
}));

vi.mock("@/services/bookingApi", () => ({
  bookingApi: {
    getBookingByCode: vi.fn(),
    getBookingById: vi.fn(),
  },
}));

vi.mock("@/services/eventApi", () => ({
  eventApi: {
    getEventById: vi.fn(),
  },
}));

vi.mock("@/services/marketplaceApi", () => ({
  marketplaceApi: {
    getMyGiftInvitations: vi.fn().mockResolvedValue([]),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MyTickets Order Flow & Categorization Tests", () => {
  // format ticket seat
  describe("formatTicketSeat", () => {
    it("formats physical seat with section, row, and seat number", () => {
      const result = formatTicketSeat({
        section: "Khán đài A",
        row: "Hàng 5",
        seatNumber: "Ghế 12",
        ticketTypeName: "VIP Zone",
      });
      expect(result).toBe("Khu Khán đài A, Hàng Hàng 5, Ghế Ghế 12");
    });

    it("formats physical seat without section", () => {
      const result = formatTicketSeat({
        row: "C",
        seatNumber: "08",
        ticketTypeName: "Standard",
      });
      expect(result).toBe("Hàng C, Ghế 08");
    });

    it("formats non-seatmap GA ticket as 'Vé tự do, <tên hạng vé>'", () => {
      const result = formatTicketSeat({
        row: null,
        seatNumber: null,
        ticketTypeName: "Vé VIP Đứng",
      });
      expect(result).toBe("Vé tự do, Vé VIP Đứng");
    });

    it("masks technical legacy -STT- identifier as 'Vé tự do, <tên hạng vé>'", () => {
      const result = formatTicketSeat({
        seatId: "tier-1-STT-15",
        seatName: "tier-1-STT-15",
        row: null,
        seatNumber: null,
        ticketTypeName: "Vé Khán Giả",
      });
      expect(result).toBe("Vé tự do, Vé Khán Giả");
      expect(result).not.toContain("-STT-");
    });

    it("masks technical legacy -GA- or GENERAL_ADMISSION identifier as 'Vé tự do, <tên hạng vé>'", () => {
      const result = formatTicketSeat({
        seatId: "GENERAL_ADMISSION",
        seatName: "GENERAL_ADMISSION",
        ticketTypeName: "Fan Zone",
      });
      expect(result).toBe("Vé tự do, Fan Zone");
      expect(result).not.toContain("GENERAL_ADMISSION");
    });

    it("never outputs raw UUID string", () => {
      const result = formatTicketSeat({
        seatId: "4c412e9d-c26d-41f8-a0d5-e80ed516d1bc",
        seatName: "4c412e9d-c26d-41f8-a0d5-e80ed516d1bc",
        ticketTypeName: "Early Bird",
      });
      expect(result).toBe("Vé tự do, Early Bird");
      expect(result).not.toContain("4c412e9d");
    });
  });

  // group tickets into orders
  describe("groupTicketsIntoOrders", () => {
    it("groups 10 tickets with the same bookingCode into a single order", () => {
      const tenTickets = Array.from({ length: 10 }, (_, i) => ({
        id: `ticket-${i + 1}`,
        bookingCode: "HALO-ORDER-999",
        hasBookingCode: true,
        eventId: "event-1",
        eventTitle: "Rock Fest 2026",
        eventTime: "25/12/2026",
        eventLocation: "Sân vận động Mỹ Đình",
        ticketTypeName: "GA Regular",
        quantity: 1,
        totalAmount: 150000,
        rawStatus: "VALID",
        status: "UPCOMING" as const,
        seatName: "Vé tự do, GA Regular",
      }));

      const groups = groupTicketsIntoOrders(tenTickets);
      expect(groups).toHaveLength(1);
      expect(groups[0].bookingCode).toBe("HALO-ORDER-999");
      expect(groups[0].quantity).toBe(10);
      expect(groups[0].totalAmount).toBe(1500000);
      expect(groups[0].tickets).toHaveLength(10);
      expect(groups[0].status).toBe("UPCOMING");
    });

    it("separates tickets with different booking codes into distinct orders", () => {
      const tickets = [
        {
          id: "t-1",
          bookingCode: "BK-A",
          hasBookingCode: true,
          eventId: "e-1",
          eventTitle: "Event A",
          eventTime: "01/01/2027",
          eventLocation: "Venue A",
          ticketTypeName: "VIP",
          quantity: 1,
          totalAmount: 100000,
          rawStatus: "VALID",
          status: "UPCOMING" as const,
        },
        {
          id: "t-2",
          bookingCode: "BK-B",
          hasBookingCode: true,
          eventId: "e-2",
          eventTitle: "Event B",
          eventTime: "02/01/2027",
          eventLocation: "Venue B",
          ticketTypeName: "Standard",
          quantity: 1,
          totalAmount: 50000,
          rawStatus: "VALID",
          status: "UPCOMING" as const,
        },
      ];

      const groups = groupTicketsIntoOrders(tickets);
      expect(groups).toHaveLength(2);
      expect(groups.map((g) => g.bookingCode)).toEqual(["BK-A", "BK-B"]);
    });
  });

  // tab classification & past event detection
  describe("Tab classification & past event detection", () => {
    it("classifies ticket as USED/ended when showtime endTime is in the past", async () => {
      vi.mocked(eventApi.getEventById).mockResolvedValueOnce({
        id: "evt-past",
        title: "Sự kiện Đã Diễn Ra",
        startTime: "2020-01-01T18:00:00",
        endTime: "2020-01-01T22:00:00",
        showtimes: [
          {
            id: "st-past",
            startTime: "2020-01-01T18:00:00",
            endTime: "2020-01-01T22:00:00",
          },
        ],
      });

      const rawTickets: OwnedTicketApiResponse[] = [
        {
          id: "ticket-past-valid",
          bookingCode: "BK-PAST-1",
          eventId: "evt-past",
          showtimeId: "st-past",
          ticketTypeName: "VIP",
          price: 200000,
          status: "VALID", // still VALID in DB, but event endTime has passed
          issuedAt: "2019-12-30T10:00:00",
        },
      ];

      const hydrated = await hydrateTickets(rawTickets);
      expect(hydrated).toHaveLength(1);
      expect(hydrated[0].isEnded).toBe(true);
      // mapped to USED so it falls into Lịch sử
      expect(hydrated[0].status).toBe("USED");
    });

    it("classifies ticket as UPCOMING when endTime is in the future", async () => {
      vi.mocked(eventApi.getEventById).mockResolvedValueOnce({
        id: "evt-future",
        title: "Sự kiện Tương Lai",
        startTime: "2099-05-01T18:00:00",
        endTime: "2099-05-01T22:00:00",
        showtimes: [
          {
            id: "st-future",
            startTime: "2099-05-01T18:00:00",
            endTime: "2099-05-01T22:00:00",
          },
        ],
      });

      const rawTickets: OwnedTicketApiResponse[] = [
        {
          id: "ticket-future-valid",
          bookingCode: "BK-FUTURE-1",
          eventId: "evt-future",
          showtimeId: "st-future",
          ticketTypeName: "VIP",
          price: 300000,
          status: "VALID",
          issuedAt: "2099-04-01T10:00:00",
        },
      ];

      const hydrated = await hydrateTickets(rawTickets);
      expect(hydrated).toHaveLength(1);
      expect(hydrated[0].isEnded).toBe(false);
      expect(hydrated[0].status).toBe("UPCOMING");
    });
  });

  // polling lifecycle in OrderDetail
  describe("OrderDetail polling lifecycle", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("stops polling immediately when issued tickets equal expected order count", async () => {
      // mock booking with 2 expected tickets
      vi.mocked(bookingApi.getBookingByCode).mockResolvedValue({
        id: "booking-uuid-10",
        bookingCode: "HALO-12345",
        status: "PAID",
        eventId: "event-1",
        showtimeId: "st-1",
        totalAmount: 400000,
        createdAt: "2026-10-22T10:00:00",
        items: [
          {
            ticketTypeId: "tt-1",
            ticketTypeName: "Vé VIP",
            quantity: 2,
            unitPrice: 200000,
          },
        ],
      });

      vi.mocked(eventApi.getEventById).mockResolvedValue({
        id: "event-1",
        title: "Concert Đêm Nhạc",
        startTime: "2099-12-01T20:00:00",
        endTime: "2099-12-01T23:00:00",
      });

      // initially 0 tickets issued
      vi.mocked(ticketApi.getMyTickets)
        .mockResolvedValueOnce([])
        // after first poll tick, both tickets issued
        .mockResolvedValue([
          {
            id: "t-1",
            bookingId: "booking-uuid-10",
            bookingCode: "HALO-12345",
            eventId: "event-1",
            ticketTypeName: "Vé VIP",
            status: "VALID",
          },
          {
            id: "t-2",
            bookingId: "booking-uuid-10",
            bookingCode: "HALO-12345",
            eventId: "event-1",
            ticketTypeName: "Vé VIP",
            status: "VALID",
          },
        ]);

      render(
        <MemoryRouter>
          <OrderDetail />
        </MemoryRouter>
      );

      // advance initial fetch
      await vi.advanceTimersByTimeAsync(100);

      // advance 2s for first poll
      await vi.advanceTimersByTimeAsync(2000);

      // verify that after reaching expected count, getMyTickets is not polled repeatedly
      const callCountAfterCompletion = vi.mocked(ticketApi.getMyTickets).mock.calls.length;

      // advance another 10 seconds
      await vi.advanceTimersByTimeAsync(10000);

      // call count should NOT increase further because polling stopped
      expect(vi.mocked(ticketApi.getMyTickets).mock.calls.length).toBe(callCountAfterCompletion);
    });

    it("cancels polling timers when component unmounts", async () => {
      vi.mocked(bookingApi.getBookingByCode).mockResolvedValue({
        id: "booking-uuid-unmount",
        bookingCode: "HALO-UNMOUNT",
        status: "PAID",
        eventId: "event-1",
        totalAmount: 200000,
        createdAt: "2026-10-22T10:00:00",
        items: [{ ticketTypeId: "tt-1", ticketTypeName: "VIP", quantity: 2, unitPrice: 100000 }],
      });

      vi.mocked(ticketApi.getMyTickets).mockResolvedValue([]);

      const { unmount } = render(
        <MemoryRouter>
          <OrderDetail />
        </MemoryRouter>
      );

      await vi.advanceTimersByTimeAsync(50);

      // unmount the component while polling is active
      unmount();

      const callCountAtUnmount = vi.mocked(ticketApi.getMyTickets).mock.calls.length;

      // advance time by 30 seconds
      await vi.advanceTimersByTimeAsync(30000);

      // no new calls should be made after unmount
      expect(vi.mocked(ticketApi.getMyTickets).mock.calls.length).toBe(callCountAtUnmount);
    });
  });
});
