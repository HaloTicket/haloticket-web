import { describe, expect, it } from "vitest";
import {
  formatQuantity,
  getBuyableQuantity,
  getHeldQuantity,
  getInitialQuantity,
  getRemainingQuantity,
  getSoldQuantity,
  isTicketInStock,
} from "@/utils/ticketQuantities";

describe("ticket quantities", () => {
  it("reads the four new fields from a new backend", () => {
    const t = { initialQuantity: 100, totalQuantity: 70, remainingQuantity: 70, heldQuantity: 10, soldQuantity: 30, availableQuantity: 60 };
    expect(getInitialQuantity(t)).toBe(100);
    expect(getRemainingQuantity(t)).toBe(70);
    expect(getHeldQuantity(t)).toBe(10);
    expect(getSoldQuantity(t)).toBe(30);
    expect(getBuyableQuantity(t)).toBe(60);
  });

  it("falls back to the old fields on an old backend, with no NaN and no invented 100", () => {
    const t = { initialQuantity: 100, totalQuantity: 70 };
    expect(getRemainingQuantity(t)).toBe(70);
    expect(getSoldQuantity(t)).toBe(30);
    expect(getBuyableQuantity(t)).toBe(70);
    expect(getHeldQuantity(t)).toBeUndefined();
    const bare = {};
    expect(getRemainingQuantity(bare)).toBeUndefined();
    expect(getSoldQuantity(bare)).toBeUndefined();
    expect(getBuyableQuantity(bare)).toBeUndefined();
    expect(getRemainingQuantity({ totalQuantity: Number.NaN })).toBeUndefined();
    expect(getSoldQuantity({ totalQuantity: 5 })).toBeUndefined();
  });

  it("never returns a negative sold or buyable number", () => {
    expect(getSoldQuantity({ initialQuantity: 10, totalQuantity: 12 })).toBe(0);
    expect(getSoldQuantity({ soldQuantity: -4 })).toBe(0);
    expect(getBuyableQuantity({ availableQuantity: -1 })).toBe(0);
  });

  it("treats an unknown number as in stock and a known zero as sold out", () => {
    expect(isTicketInStock({})).toBe(true);
    expect(isTicketInStock({ availableQuantity: 0 })).toBe(false);
    expect(isTicketInStock({ totalQuantity: 0 })).toBe(false);
    expect(isTicketInStock({ totalQuantity: 3, available: false })).toBe(false);
    expect(isTicketInStock({ totalQuantity: 10, availableQuantity: 0 })).toBe(false);
  });

  it("formats an unknown count with the given text", () => {
    expect(formatQuantity(undefined, "—")).toBe("—");
    expect(formatQuantity(0, "—")).toBe("0");
  });
});
