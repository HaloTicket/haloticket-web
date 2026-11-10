/** Pure decisions of the order detail page after a payment: when to ask again, and what to show meanwhile. */

/** The booking is read again while it is still PENDING: every 2 s for 10 s, then every 3-5 s, about 90 s in all. */
export const PENDING_POLL_INTERVALS = [
  2000, 2000, 2000, 2000, 2000,
  3000, 3000, 4000, 4000,
  5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000,
];

/** Tickets are read again: 2 s for the first 10 s, backed off to about 40 s... */
export const TICKET_POLL_INTERVALS = [2000, 2000, 2000, 2000, 2000, 3000, 4000, 5000, 6000, 6000, 6000];
/** ...then, without any click, every 15 s for 5 more minutes. */
export const SLOW_POLL_INTERVAL_MS = 15000;
export const SLOW_POLL_COUNT = 20;

export type PollKind = "booking" | "tickets";

/** Milliseconds until the next read after `step` reads, or null when the schedule is over. */
export function nextPollDelay(kind: PollKind, step: number): number | null {
  if (step < 0) return null;
  if (kind === "booking") return step < PENDING_POLL_INTERVALS.length ? PENDING_POLL_INTERVALS[step] : null;
  if (step < TICKET_POLL_INTERVALS.length) return TICKET_POLL_INTERVALS[step];
  return step < TICKET_POLL_INTERVALS.length + SLOW_POLL_COUNT ? SLOW_POLL_INTERVAL_MS : null;
}

/** True once the fast schedule is over: the notice that tickets are late is shown while the slow polling goes on. */
export function ticketPollingIsLate(step: number): boolean {
  return step >= TICKET_POLL_INTERVALS.length;
}

export type OrderStatus = "PENDING" | "PAID" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | string;

export const isPaidStatus = (status?: string | null): boolean => status === "PAID" || status === "CONFIRMED";
export const isClosedStatus = (status?: string | null): boolean => status === "CANCELLED" || status === "EXPIRED";

export type OrderNextStep = "poll-booking" | "poll-tickets" | "done";

/** What to do after a booking was read. A PENDING order is waiting for the payment gateway to be confirmed. */
export function nextStepForBooking(status: string | undefined | null, issuedTickets: number, expectedTickets: number): OrderNextStep {
  if (status === "PENDING") return "poll-booking";
  if (isPaidStatus(status) && issuedTickets < expectedTickets) return "poll-tickets";
  return "done";
}

export type OrderBadge = "confirming" | "pending" | "paid" | "cancelled" | "expired" | "other";

/** The status badge: a PENDING order inside the confirmation window is "being confirmed", not "waiting for payment". */
export function orderBadge(status: string | undefined | null, confirming: boolean): OrderBadge {
  if (isPaidStatus(status)) return "paid";
  if (status === "PENDING") return confirming ? "confirming" : "pending";
  if (status === "CANCELLED") return "cancelled";
  if (status === "EXPIRED") return "expired";
  return "other";
}

export type ReissueOutcome =
  | { kind: "requested" }
  | { kind: "already-issued" }
  | { kind: "too-soon"; retryAfterSeconds: number }
  | { kind: "not-paid" }
  | { kind: "unknown" };

// reads the answer of POST /bookings/by-code/{code}/reissue defensively: anything unexpected is "unknown"
export function parseReissueResponse(raw: unknown): ReissueOutcome {
  const result = raw && typeof raw === "object" ? (raw as { result?: unknown; retryAfterSeconds?: unknown }).result : undefined;
  switch (result) {
    case "REQUESTED":
      return { kind: "requested" };
    case "ALREADY_ISSUED":
      return { kind: "already-issued" };
    case "NOT_PAID":
      return { kind: "not-paid" };
    case "TOO_SOON": {
      const seconds = Number((raw as { retryAfterSeconds?: unknown }).retryAfterSeconds);
      return { kind: "too-soon", retryAfterSeconds: Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 30 };
    }
    default:
      return { kind: "unknown" };
  }
}

// the order page asks for a re-issue by itself once, when the fast polling is over and the tickets are still missing
export function shouldAutoReissue(step: number, alreadyAsked: boolean): boolean {
  return !alreadyAsked && ticketPollingIsLate(step);
}

// a manual 'Tải lại' asks for a re-issue only for a paid order that still lacks tickets; otherwise it just reloads
export function shouldRequestReissue(status: string | undefined | null, issuedTickets: number, expectedTickets: number): boolean {
  return isPaidStatus(status) && expectedTickets > 0 && issuedTickets < expectedTickets;
}
