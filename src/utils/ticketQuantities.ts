/**
 * The numbers shown for a ticket type. A new backend sends remainingQuantity, heldQuantity, soldQuantity and
 * availableQuantity next to the old totalQuantity / initialQuantity; an old backend sends only the old two. Every
 * function returns undefined when it cannot know the number, so a screen shows "unknown" instead of 0 or a made-up 100.
 */
export interface TicketQuantityFields {
  initialQuantity?: number | null;
  totalQuantity?: number | null;
  remainingQuantity?: number | null;
  heldQuantity?: number | null;
  soldQuantity?: number | null;
  availableQuantity?: number | null;
  quantity?: number | null;
}

const num = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

/** Tickets put on sale. */
export function getInitialQuantity(t: TicketQuantityFields): number | undefined {
  return num(t.initialQuantity);
}

/** Still in stock, held ones included (totalQuantity is the same number on an old backend). */
export function getRemainingQuantity(t: TicketQuantityFields): number | undefined {
  return num(t.remainingQuantity) ?? num(t.totalQuantity) ?? num(t.quantity);
}

/** Kept by unpaid bookings. An old backend does not say, so it is unknown (not 0). */
export function getHeldQuantity(t: TicketQuantityFields): number | undefined {
  return num(t.heldQuantity);
}

/** Sold so far: the server's number, else initial minus remaining; never negative. */
export function getSoldQuantity(t: TicketQuantityFields): number | undefined {
  const sold = num(t.soldQuantity);
  if (sold !== undefined) return Math.max(0, sold);
  const initial = getInitialQuantity(t);
  const remaining = getRemainingQuantity(t);
  return initial !== undefined && remaining !== undefined ? Math.max(0, initial - remaining) : undefined;
}

/** What a customer can still buy now: the server's availableQuantity, else the remaining stock. */
export function getBuyableQuantity(t: TicketQuantityFields): number | undefined {
  const available = num(t.availableQuantity);
  if (available !== undefined) return Math.max(0, available);
  return getRemainingQuantity(t);
}

/** True unless the ticket type is known to be out of stock (unknown counts as in stock, as before). */
export function isTicketInStock(t: TicketQuantityFields & { available?: boolean }): boolean {
  if (t.available === false) return false;
  const buyable = getBuyableQuantity(t);
  return buyable === undefined ? true : buyable > 0;
}

/** Text for a count that may be unknown. */
export function formatQuantity(value: number | undefined, unknown: string): string {
  return value === undefined ? unknown : value.toLocaleString("vi-VN");
}

/** Lowest number that may be issued: sold + held (held counts as 0 when unknown). Undefined when sold is unknown. */
export function getMinIssuedQuantity(t: TicketQuantityFields): number | undefined {
  const sold = getSoldQuantity(t);
  if (sold === undefined) return undefined;
  return sold + (getHeldQuantity(t) ?? 0);
}

/**
 * The number the organizer sees and sends is the ISSUED number, never the remaining stock. A ticket coming from the
 * server uses initialQuantity (else totalQuantity of an old backend). The payload keeps totalQuantity equal to
 * initialQuantity for compatibility.
 */
export function normalizeTicketsForSave<T extends TicketQuantityFields>(tickets: T[]): T[] {
  return tickets.map((t) => {
    const issued = getInitialQuantity(t) ?? num(t.totalQuantity);
    return issued === undefined ? t : { ...t, initialQuantity: issued, totalQuantity: issued };
  });
}
