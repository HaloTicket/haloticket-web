import { describe, expect, it } from "vitest";
import {
  addDays,
  changeDirection,
  customPeriodProblem,
  formatChange,
  hasSales,
  queryFor,
  shortDay,
  todayInVietnam,
  unavailableLabels,
} from "@/features/organizer/event-manage/analyticsPeriod";

describe("custom period", () => {
  it("needs both dates, in order, as real days", () => {
    expect(customPeriodProblem("", "2026-11-10")).toBeTruthy();
    expect(customPeriodProblem("2026-11-10", "")).toBeTruthy();
    expect(customPeriodProblem("2026-13-40", "2026-11-10")).toBe("Ngày không hợp lệ");
    expect(customPeriodProblem("2026-11-10", "2026-11-09")).toBeTruthy();
    expect(customPeriodProblem("2026-11-10", "2026-11-10")).toBeNull();
  });

  it("is at most 366 days, both ends counted", () => {
    expect(customPeriodProblem("2026-01-01", "2026-12-31")).toBeNull(); // 365 days
    expect(customPeriodProblem("2025-11-10", "2026-11-10")).toBeNull(); // exactly 366 days, both ends counted
    expect(customPeriodProblem("2025-11-09", "2026-11-10")).toBe("Khoảng thời gian tối đa là 366 ngày"); // 367 days
  });

  it("asks for the custom dates only when they are valid, otherwise for 30 days", () => {
    expect(queryFor("custom", "2026-11-01", "2026-11-07", true)).toEqual({ from: "2026-11-01", to: "2026-11-07", compare: true });
    expect(queryFor("custom", "2026-11-07", "2026-11-01", false)).toEqual({ timeRange: "30d", compare: false });
    expect(queryFor("24h", "", "", true)).toEqual({ timeRange: "24h", compare: true });
    expect(queryFor("7d", "2026-11-01", "2026-11-07", false)).toEqual({ timeRange: "7d", compare: false });
  });
});

describe("days in the platform zone", () => {
  it("is already the next day in Ho Chi Minh City when it is still the evening in UTC", () => {
    expect(todayInVietnam(new Date("2026-11-14T17:30:00Z"))).toBe("2026-11-15");
    expect(todayInVietnam(new Date("2026-11-14T16:59:00Z"))).toBe("2026-11-14");
  });

  it("moves across month ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-11-15", -6)).toBe("2026-11-09");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("shows a day as DD/MM", () => {
    expect(shortDay("2026-11-05")).toBe("05/11");
    expect(shortDay("bad")).toBe("bad");
  });
});

describe("change against the previous period", () => {
  it("is signed, with a decimal comma", () => {
    expect(formatChange(12.5)).toBe("+12,5%");
    expect(formatChange(-3)).toBe("-3%");
    expect(formatChange(0)).toBe("0%");
  });

  it("is nothing when there is no base to compare with", () => {
    expect(formatChange(null)).toBeNull();
    expect(formatChange(undefined)).toBeNull();
    expect(formatChange(Number.NaN)).toBeNull();
    expect(changeDirection(null)).toBe("none");
  });

  it("tells the direction", () => {
    expect(changeDirection(0.1)).toBe("up");
    expect(changeDirection(-0.1)).toBe("down");
    expect(changeDirection(0)).toBe("flat");
  });
});

describe("what is drawn", () => {
  it("draws nothing for a period without sales, even though every day is present", () => {
    expect(hasSales(undefined)).toBe(false);
    expect(hasSales([{ date: "2026-11-10", revenue: 0, ticketsSold: 0 }])).toBe(false);
    expect(hasSales([{ date: "2026-11-10", revenue: 0, ticketsSold: 0 }, { date: "2026-11-11", revenue: 0, ticketsSold: 2 }])).toBe(true);
  });

  it("names the sources that did not answer", () => {
    expect(unavailableLabels(["booking", "views"])).toEqual(["đơn hàng", "lượt xem"]);
    expect(unavailableLabels(undefined)).toEqual([]);
    expect(unavailableLabels(["other"])).toEqual(["other"]);
  });
});
