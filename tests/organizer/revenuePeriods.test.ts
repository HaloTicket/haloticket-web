import { describe, expect, it } from "vitest";
import { revenueRange } from "../../src/features/organizer/finance/revenuePeriods";

describe("organizer revenue periods", () => {
  it("uses seven inclusive days across a year boundary", () => {
    expect(revenueRange("recent", "2026-01-03")).toEqual({ from: "2025-12-28", to: "2026-01-03" });
  });
  it("uses actual month boundaries including leap years", () => {
    expect(revenueRange("month", "2024-02")).toEqual({ from: "2024-02-01", to: "2024-02-29" });
    expect(revenueRange("month", "2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });
  it("selects the full chosen calendar year", () => {
    expect(revenueRange("year", "2026")).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });
});
