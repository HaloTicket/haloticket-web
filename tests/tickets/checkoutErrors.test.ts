import { describe, expect, it } from "vitest";
import { i18n } from "@/i18n";
import { CHECKOUT_ERROR_CODES, resolveCheckoutError } from "@/features/tickets/checkoutErrors";

const viaData = (message: string) => ({ response: { data: { message } } });
const viaCode = (code: string) => ({ response: { data: { code } } });

describe("checkout error mapping", () => {
  it("maps every known code to its meaning key from response.data.message, response.data.code or err.message", () => {
    for (const code of Object.keys(CHECKOUT_ERROR_CODES)) {
      const key = CHECKOUT_ERROR_CODES[code].key;
      expect(resolveCheckoutError(viaData(code)).key).toBe(key);
      expect(resolveCheckoutError(viaCode(code)).key).toBe(key);
      expect(resolveCheckoutError(new Error(code)).key).toBe(key);
    }
  });

  it("maps the codes by meaning", () => {
    expect(resolveCheckoutError(viaData("TICKET_SOLD_OUT")).key).toBe("tickets.error.soldOut");
    expect(resolveCheckoutError(viaData("TICKET_STOCK_UNAVAILABLE")).key).toBe("tickets.error.stockBusy");
    expect(resolveCheckoutError(viaData("TICKET_RESERVATION_REFUSED")).key).toBe("tickets.error.reservationRefused");
    expect(resolveCheckoutError(viaData("RESERVATION_CLOSED")).key).toBe("tickets.error.reservationClosed");
    expect(resolveCheckoutError(viaData("QUANTITY_OUT_OF_RANGE")).key).toBe("tickets.error.quantityOutOfRange");
    expect(resolveCheckoutError(viaData("INVALID_ORDER_ITEMS")).key).toBe("tickets.error.invalidOrder");
    expect(resolveCheckoutError(viaData("DUPLICATE_SEAT_IDS")).key).toBe("tickets.error.invalidOrder");
    expect(resolveCheckoutError(viaData("SEAT_COUNT_EXCEEDS_QUANTITY")).key).toBe("tickets.error.seatCountMismatch");
    expect(resolveCheckoutError(viaData("SEAT_COUNT_MISMATCH")).key).toBe("tickets.error.seatCountMismatch");
  });

  it("fixes the client-thrown BOOKING_CREATE_FAILED that has no response.data", () => {
    expect(resolveCheckoutError(new Error("BOOKING_CREATE_FAILED")).key).toBe("tickets.error.bookingCreateFailed");
  });

  it("goes back to ticket selection for sold out, out of range, closed and seat count cases only", () => {
    for (const code of ["TICKET_SOLD_OUT", "QUANTITY_OUT_OF_RANGE", "RESERVATION_CLOSED", "SEAT_COUNT_MISMATCH", "SEAT_COUNT_EXCEEDS_QUANTITY"]) {
      expect(resolveCheckoutError(viaData(code)).backToSelection).toBe(true);
    }
    for (const code of ["TICKET_STOCK_UNAVAILABLE", "TICKET_RESERVATION_REFUSED", "BOOKING_CREATE_FAILED", "INVALID_ORDER_ITEMS"]) {
      expect(resolveCheckoutError(viaData(code)).backToSelection).toBe(false);
    }
  });

  it("never shows an unknown code raw: it falls back to the generic key", () => {
    for (const err of [viaData("SOMETHING_NEW_FROM_SERVER"), viaCode("WEIRD"), new Error("boom"), null, undefined, {}]) {
      const r = resolveCheckoutError(err);
      expect(r.key).toBe("tickets.error.unknown");
      expect(r.backToSelection).toBe(false);
    }
  });

  it("has a real vi and en text for every key, never the key itself", () => {
    const keys = new Set<string>([...Object.values(CHECKOUT_ERROR_CODES).map((r) => r.key), "tickets.error.unknown"]);
    for (const lng of ["vi", "en"]) {
      for (const key of keys) {
        const text = i18n.t(key, { lng });
        expect(text).not.toBe(key);
        expect(text.length).toBeGreaterThan(20);
      }
    }
    expect(i18n.t("tickets.error.soldOut", { lng: "vi" })).toMatch(/hết/);
    expect(i18n.t("tickets.error.soldOut", { lng: "en" })).toMatch(/sold out/);
    expect(i18n.t("tickets.error.unknown", { lng: "en" })).toMatch(/Something went wrong/);
  });
});
