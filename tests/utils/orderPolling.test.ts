import { describe, expect, it } from "vitest";
import {
  PENDING_POLL_INTERVALS,
  SLOW_POLL_COUNT,
  SLOW_POLL_INTERVAL_MS,
  TICKET_POLL_INTERVALS,
  nextPollDelay,
  nextStepForBooking,
  orderBadge,
  ticketPollingIsLate,
} from "@/utils/orderPolling";

describe("order polling schedule", () => {
  it("reads a pending booking every 2 s for 10 s, then every 3-5 s, for about 90 s", () => {
    expect(PENDING_POLL_INTERVALS.slice(0, 5)).toEqual([2000, 2000, 2000, 2000, 2000]);
    expect(PENDING_POLL_INTERVALS.slice(5).every((ms) => ms >= 3000 && ms <= 5000)).toBe(true);
    const total = PENDING_POLL_INTERVALS.reduce((sum, ms) => sum + ms, 0);
    expect(total).toBeGreaterThanOrEqual(80_000);
    expect(total).toBeLessThanOrEqual(100_000);
    expect(nextPollDelay("booking", 0)).toBe(2000);
    expect(nextPollDelay("booking", PENDING_POLL_INTERVALS.length)).toBeNull();
  });

  it("keeps the fast ticket schedule, then polls slowly for five more minutes, then stops", () => {
    expect(nextPollDelay("tickets", 0)).toBe(2000);
    expect(nextPollDelay("tickets", TICKET_POLL_INTERVALS.length - 1)).toBe(6000);
    expect(nextPollDelay("tickets", TICKET_POLL_INTERVALS.length)).toBe(SLOW_POLL_INTERVAL_MS);
    expect(SLOW_POLL_INTERVAL_MS * SLOW_POLL_COUNT).toBe(300_000);
    expect(nextPollDelay("tickets", TICKET_POLL_INTERVALS.length + SLOW_POLL_COUNT - 1)).toBe(SLOW_POLL_INTERVAL_MS);
    expect(nextPollDelay("tickets", TICKET_POLL_INTERVALS.length + SLOW_POLL_COUNT)).toBeNull();
    expect(nextPollDelay("tickets", -1)).toBeNull();
  });

  it("calls the tickets late only after the fast schedule", () => {
    expect(ticketPollingIsLate(TICKET_POLL_INTERVALS.length - 1)).toBe(false);
    expect(ticketPollingIsLate(TICKET_POLL_INTERVALS.length)).toBe(true);
  });
});

describe("what to do after reading the booking", () => {
  it("waits for the gateway while PENDING, whatever the tickets", () => {
    expect(nextStepForBooking("PENDING", 0, 3)).toBe("poll-booking");
  });
  it("polls tickets for a paid order that has too few", () => {
    expect(nextStepForBooking("PAID", 1, 3)).toBe("poll-tickets");
    expect(nextStepForBooking("CONFIRMED", 0, 2)).toBe("poll-tickets");
  });
  it("is done for a complete, cancelled, expired or unknown order", () => {
    expect(nextStepForBooking("PAID", 3, 3)).toBe("done");
    expect(nextStepForBooking("CANCELLED", 0, 3)).toBe("done");
    expect(nextStepForBooking("EXPIRED", 0, 3)).toBe("done");
    expect(nextStepForBooking(undefined, 0, 3)).toBe("done");
  });
});

describe("status badge", () => {
  it("shows 'confirming' inside the window and 'pending' after it", () => {
    expect(orderBadge("PENDING", true)).toBe("confirming");
    expect(orderBadge("PENDING", false)).toBe("pending");
  });
  it("is green only for a paid order", () => {
    expect(orderBadge("PAID", true)).toBe("paid");
    expect(orderBadge("CONFIRMED", false)).toBe("paid");
    expect(orderBadge(undefined, false)).toBe("other");
    expect(orderBadge("CANCELLED", false)).toBe("cancelled");
    expect(orderBadge("EXPIRED", false)).toBe("expired");
  });
});

import { parseReissueResponse, shouldAutoReissue, shouldRequestReissue } from "@/utils/orderPolling";

describe("re-issue of the tickets of a paid order", () => {
  it("reads each answer of the backend", () => {
    expect(parseReissueResponse({ result: "REQUESTED" })).toEqual({ kind: "requested" });
    expect(parseReissueResponse({ result: "ALREADY_ISSUED" })).toEqual({ kind: "already-issued" });
    expect(parseReissueResponse({ result: "NOT_PAID" })).toEqual({ kind: "not-paid" });
    expect(parseReissueResponse({ result: "TOO_SOON", retryAfterSeconds: 12.2 })).toEqual({ kind: "too-soon", retryAfterSeconds: 13 });
  });

  it("falls back to a safe wait for a missing or odd TOO_SOON delay and to 'unknown' for anything else", () => {
    expect(parseReissueResponse({ result: "TOO_SOON" })).toEqual({ kind: "too-soon", retryAfterSeconds: 30 });
    expect(parseReissueResponse({ result: "TOO_SOON", retryAfterSeconds: -4 })).toEqual({ kind: "too-soon", retryAfterSeconds: 30 });
    for (const odd of [null, undefined, "REQUESTED", 7, [], {}, { result: "WHATEVER" }]) {
      expect(parseReissueResponse(odd)).toEqual({ kind: "unknown" });
    }
  });

  it("asks by itself once, only after the fast polling is over", () => {
    expect(shouldAutoReissue(0, false)).toBe(false);
    expect(shouldAutoReissue(TICKET_POLL_INTERVALS.length - 1, false)).toBe(false);
    expect(shouldAutoReissue(TICKET_POLL_INTERVALS.length, false)).toBe(true);
    expect(shouldAutoReissue(TICKET_POLL_INTERVALS.length + 3, true)).toBe(false);
  });

  it("a manual reload asks only for a paid order that still lacks tickets", () => {
    expect(shouldRequestReissue("PAID", 0, 3)).toBe(true);
    expect(shouldRequestReissue("CONFIRMED", 2, 3)).toBe(true);
    expect(shouldRequestReissue("PAID", 3, 3)).toBe(false);
    expect(shouldRequestReissue("PENDING", 0, 3)).toBe(false);
    expect(shouldRequestReissue("CANCELLED", 0, 3)).toBe(false);
    expect(shouldRequestReissue("PAID", 0, 0)).toBe(false);
    expect(shouldRequestReissue(undefined, 0, 3)).toBe(false);
  });
});
