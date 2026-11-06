/** Failures of createEvent/updateEvent that the organizer must see (the event is NOT silently lost or "saved"). */
export type EventSaveFailure =
  | { kind: "ticketsSyncFailed"; eventId?: string }
  | { kind: "quantityBelowSoldHeld"; name: string; sold?: number; held?: number; minAllowed?: number };

const asNumber = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

export function parseEventSaveFailure(err: unknown): EventSaveFailure | null {
  const res = (err as { response?: { status?: number; data?: Record<string, unknown> } } | null)?.response;
  const data = res?.data;
  if (!data || typeof data !== "object") return null;
  const code = data.code ?? data.message;
  if (res?.status === 502 && code === "TICKETS_SYNC_FAILED") {
    return { kind: "ticketsSyncFailed", eventId: typeof data.eventId === "string" ? data.eventId : undefined };
  }
  if (res?.status === 422 && code === "QUANTITY_BELOW_SOLD_AND_HELD") {
    return {
      kind: "quantityBelowSoldHeld",
      name: typeof data.name === "string" ? data.name : "",
      sold: asNumber(data.sold),
      held: asNumber(data.held),
      minAllowed: asNumber(data.minAllowed),
    };
  }
  return null;
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Text for a failure, or null when the error is not one of the two known ones. */
export function eventSaveFailureMessage(failure: EventSaveFailure, t: Translate): string {
  if (failure.kind === "ticketsSyncFailed") return t("tickets.sync.savedNotSynced");
  const unknown = t("tickets.quantity.unknown");
  return t("tickets.quantity.belowSoldHeldServer", {
    name: failure.name,
    sold: failure.sold ?? unknown,
    held: failure.held ?? unknown,
    min: failure.minAllowed ?? unknown,
  });
}

/** Fired after a save so the event management layout re-reads the event and its ticketsSync. */
export const EVENT_TICKETS_SYNC_CHANGED = "event-tickets-sync-changed";
