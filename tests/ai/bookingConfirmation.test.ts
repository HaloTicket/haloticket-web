import { describe, expect, it } from "vitest";
import {
  PENDING_ORDER_HOLD_MS,
  buildPendingOrder,
  dropStaleActions,
  findSelectedEventId,
  parseServerConfirmation,
  type ServerConfirmation,
} from "../../src/components/common/AIChatWidget/bookingConfirmation";

const line = (over: Record<string, unknown> = {}) => ({
  ticket_type_id: "tt-1", tier_name: "VIP", quantity: 2, price: 1500000, subtotal: 3000000, is_seated: false, ...over,
});

/** Hình dạng thật máy chủ trả về: kết quả công cụ có `data` là chuỗi JSON. */
const serverAction = (data: Record<string, unknown> = {}) => ({
  action: "USER_CONFIRMATION_REQUIRED",
  database_data: JSON.stringify({
    status: "waiting_for_user",
    action_type: "BOOK_TICKETS",
    data: JSON.stringify({
      event_id: "ev-1", event_title: "Real Title", showtime_id: "st-1", showtime_name: "Suất 1",
      tickets: [line()], seats: [], total_price: 3000000, prices_source: "server", ...data,
    }),
  }),
});

describe("parseServerConfirmation", () => {
  it("reads the server-validated data, never the model-written arguments", () => {
    const action = { ...serverAction(), extracted_args: { data: JSON.stringify({ event_title: "Fake", total_price: 1 }) } };
    const confirmation = parseServerConfirmation(action)!;
    expect(confirmation).toMatchObject({ eventId: "ev-1", eventTitle: "Real Title", showtimeId: "st-1", totalPrice: 3000000 });
    expect(confirmation.tickets[0]).toMatchObject({ ticketTypeId: "tt-1", tierName: "VIP", quantity: 2, price: 1500000, isSeated: false });
  });

  it("also accepts an already parsed object", () => {
    const action = { action: "x", database_data: JSON.parse(serverAction().database_data) };
    expect(parseServerConfirmation(action)?.eventId).toBe("ev-1");
  });

  it("the total is the sum of the server subtotals, not a number the model could have written", () => {
    const action = serverAction({ tickets: [line(), line({ ticket_type_id: "tt-2", subtotal: 500000, quantity: 1, price: 500000 })], total_price: 1 });
    expect(parseServerConfirmation(action)?.totalPrice).toBe(3500000);
  });

  it.each([
    ["no database_data", { action: "x" }],
    ["not waiting for the user", { action: "x", database_data: JSON.stringify({ status: "error", data: "{}" }) }],
    ["prices not from the server", serverAction({ prices_source: "model" })],
    ["no tickets", serverAction({ tickets: [] })],
    ["fractional quantity", serverAction({ tickets: [line({ quantity: 1.5 })] })],
    ["negative price", serverAction({ tickets: [line({ price: -1 })] })],
    ["missing ticket id", serverAction({ tickets: [line({ ticket_type_id: undefined })] })],
    ["no event id", serverAction({ event_id: "" })],
    ["invalid JSON", { action: "x", database_data: "{not json" }],
  ])("rejects %s", (_name, action) => {
    expect(parseServerConfirmation(action as never)).toBeNull();
  });
});

describe("buildPendingOrder", () => {
  const confirmation = (over: Partial<ServerConfirmation> = {}): ServerConfirmation => ({
    ...parseServerConfirmation(serverAction())!, ...over,
  });

  it("builds a free-admission order with server prices and one generated id per ticket", () => {
    const order = buildPendingOrder(confirmation(), 1000, { freeAdmissionLabel: "Vé tự do" })!;
    expect(order).toMatchObject({ eventId: "ev-1", showtimeId: "st-1", totalAmount: 3000000, quantity: 2, price: 1500000, timestamp: 1000 });
    expect(order.expiresAt).toBe(1000 + PENDING_ORDER_HOLD_MS);
    expect(order.seatIds).toEqual(["tt-1-AI-1000-1", "tt-1-AI-1000-2"]);
    expect((order.seatNames as Record<string, string>)["tt-1-AI-1000-1"]).toBe("#01 (Vé tự do)");
    expect(order.items).toEqual([{ ticketTypeId: "tt-1", quantity: 2, unitPrice: 1500000 }]);
    expect(order.ticketTypeName).toBe("2x VIP");
  });

  it("uses the customer's real seats when there are some", () => {
    const order = buildPendingOrder(confirmation({ seats: ["A1", "A2"], tickets: [{ ...confirmation().tickets[0], isSeated: true }] }), 5)!;
    expect(order.seatIds).toEqual(["A1", "A2"]);
    expect(order.seatNames).toEqual({});
  });

  it("refuses a seated tier without seats and a seat count that does not match the quantity", () => {
    expect(buildPendingOrder(confirmation({ tickets: [{ ...confirmation().tickets[0], isSeated: true }] }), 5)).toBeNull();
    expect(buildPendingOrder(confirmation({ seats: ["A1"] }), 5)).toBeNull();
  });

  it("combines several tiers", () => {
    const base = confirmation().tickets[0];
    const order = buildPendingOrder(confirmation({ tickets: [base, { ...base, ticketTypeId: "tt-2", tierName: "GA", quantity: 1, price: 500000, subtotal: 500000 }], totalPrice: 3500000 }), 9)!;
    expect(order.quantity).toBe(3);
    expect(order.ticketTypeName).toBe("2x VIP, 1x GA");
    expect(order.seatIds).toHaveLength(3);
  });
});

describe("findSelectedEventId", () => {
  const ticketTypes = (id: string) => ({ action: "SHOW_TICKET_TYPES", database_data: JSON.stringify({ status: "success", event_id: id }) });

  it("returns the event of the most recent ticket, seat map or confirmation action", () => {
    expect(findSelectedEventId([{ actions: [ticketTypes("ev-1")] }, { actions: [] }, { actions: [ticketTypes("ev-2")] }])).toBe("ev-2");
    expect(findSelectedEventId([{ actions: [ticketTypes("ev-1")] }, {}])).toBe("ev-1");
    expect(findSelectedEventId([{ actions: [serverAction()] }])).toBe("ev-1");
    expect(findSelectedEventId([{ actions: [{ action: "SHOW_SEATMAP", database_data: { event_id: "ev-9" } }] }])).toBe("ev-9");
  });

  it("ignores event cards (several events) and unreadable data", () => {
    expect(findSelectedEventId([{ actions: [{ action: "SHOW_EVENT_CARDS", database_data: JSON.stringify({ event_id: "x" }) }] }])).toBeUndefined();
    expect(findSelectedEventId([{ actions: [{ action: "SHOW_TICKET_TYPES", database_data: "{bad" }] }])).toBeUndefined();
    expect(findSelectedEventId([])).toBeUndefined();
  });
});

describe("dropStaleActions", () => {
  const now = Date.parse("2026-12-01T10:00:00Z");
  const message = (minutesAgo: number, actions: unknown[] | undefined) => ({ text: "t", actions, timestamp: new Date(now - minutesAgo * 60000) });

  it("keeps recent cards and strips old ones but keeps the text", () => {
    const out = dropStaleActions([message(2, [{ action: "a" }]), message(30, [{ action: "b" }]), message(30, undefined)], now);
    expect(out[0].actions).toHaveLength(1);
    expect(out[1].actions).toBeUndefined();
    expect(out[1].text).toBe("t");
    expect(out[2].actions).toBeUndefined();
  });
});
