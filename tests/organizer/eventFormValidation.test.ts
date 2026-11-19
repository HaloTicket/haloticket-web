import { describe, expect, it } from "vitest";
import type { ShowtimeItem, TicketItem } from "../../src/types/organizer";
import { hasErrors, validateTicketFields, validateTimeAndTickets } from "../../src/features/organizer/eventFormValidation";

// dùng chính khóa tiếng Việt làm nội dung, thay {{name}} để dễ kiểm tra
const t = (key: string, options?: Record<string, unknown>) =>
  Object.entries(options ?? {}).reduce((text, [k, v]) => text.replace(`{{${k}}}`, String(v)), key);

const NOW = new Date("2026-12-01T10:00:00");

const ticket = (over: Partial<TicketItem> = {}): TicketItem => ({
  id: "t1", name: "VIP", price: 500000, isFree: false, totalQuantity: 100, minPerOrder: 1, maxPerOrder: 5, description: "", ...over,
});
const showtime = (over: Partial<ShowtimeItem> = {}): ShowtimeItem => ({
  id: "s1", name: "Suất 1", startTime: "2026-12-20T19:00", endTime: "2026-12-20T22:00",
  saleStartTime: "2026-12-02T09:00", saleEndTime: "2026-12-20T18:00", ...over,
});
const valid = (over: Record<string, unknown> = {}) => ({
  startDate: "2026-12-20T19:00", endDate: "2026-12-20T22:00", showtimes: [showtime()], tickets: [ticket()], now: NOW, requireFutureStart: true, ...over,
});
const run = (over: Record<string, unknown> = {}) => validateTimeAndTickets(valid(over) as Parameters<typeof validateTimeAndTickets>[0], t);

describe("validateTicketFields", () => {
  it("accepts a normal ticket and a free ticket with price ignored", () => {
    expect(validateTicketFields(ticket(), t)).toBeNull();
    expect(validateTicketFields(ticket({ isFree: true, price: -5 }), t)).toBeNull();
  });

  it("rejects bad price, quantity and per-order limits", () => {
    expect(validateTicketFields(ticket({ name: "  " }), t)).toContain("tên loại vé");
    expect(validateTicketFields(ticket({ price: -1 }), t)).toContain("không được âm");
    expect(validateTicketFields(ticket({ price: 1000.5 }), t)).toContain("số nguyên");
    expect(validateTicketFields(ticket({ price: Number.NaN }), t)).toContain("không được âm");
    expect(validateTicketFields(ticket({ totalQuantity: 0 }), t)).toContain("từ 1 trở lên");
    expect(validateTicketFields(ticket({ totalQuantity: Number.NaN }), t)).toContain("từ 1 trở lên");
    expect(validateTicketFields(ticket({ minPerOrder: 0 }), t)).toContain("tối thiểu");
    expect(validateTicketFields(ticket({ minPerOrder: 3, maxPerOrder: 2 }), t)).toContain("không được nhỏ hơn");
    expect(validateTicketFields(ticket({ totalQuantity: 3, maxPerOrder: 5 }), t)).toContain("không được vượt quá");
  });
});

describe("validateTimeAndTickets", () => {
  it("a complete form is valid", () => {
    expect(hasErrors(run())).toBe(false);
  });

  it("requires start and end and orders them", () => {
    expect(run({ startDate: "" }).startDate).toContain("chọn thời gian bắt đầu");
    expect(run({ endDate: "" }).endDate).toContain("chọn thời gian kết thúc");
    expect(run({ endDate: "2026-12-20T19:00" }).endDate).toContain("sau thời gian bắt đầu");
    expect(run({ startDate: "không phải ngày" }).startDate).toContain("không hợp lệ");
  });

  it("a new event must start in the future, an edited one may not", () => {
    expect(run({ startDate: "2026-11-30T19:00", endDate: "2026-11-30T22:00" }).startDate).toContain("ở tương lai");
    expect(run({ startDate: "2026-11-30T19:00", endDate: "2026-11-30T22:00", requireFutureStart: false }).startDate).toBeUndefined();
  });

  it("needs at least one valid ticket and names the bad one", () => {
    expect(run({ tickets: [] }).tickets).toContain("ít nhất một hạng vé");
    expect(run({ tickets: [ticket(), ticket({ id: "t2", name: "GA", totalQuantity: 0 })] }).tickets).toMatch(/^GA: /);
  });

  it("every showtime needs sale times, opening before closing and not after the show ends", () => {
    expect(run({ showtimes: [showtime({ saleStartTime: "" })] }).sales).toContain("nhập đủ");
    expect(run({ showtimes: [showtime({ saleStartTime: "2026-12-20T18:00", saleEndTime: "2026-12-20T18:00" })] }).sales).toContain("mở bán phải trước");
    expect(run({ showtimes: [showtime({ saleEndTime: "2026-12-20T23:00" })] }).sales).toContain("không được muộn hơn");
    expect(run({ showtimes: [showtime({ saleStartTime: "xx" })] }).sales).toContain("không hợp lệ");
    expect(run({ showtimes: [showtime(), showtime({ id: "s2", name: "Suất 2", saleEndTime: "2026-12-21T00:00" })] }).sales).toMatch(/^Suất 2: /);
  });

  it("an event without showtimes has no sale-window errors", () => {
    expect(run({ showtimes: [] }).sales).toBeUndefined();
  });
});
