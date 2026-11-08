import { describe, expect, it } from "vitest";
import { pickChartColumns } from "@/utils/chartColumns";

describe("pickChartColumns", () => {
  it("labels by the event title, not by the id that comes first", () => {
    const rows = [{ event_id: "28c5ec1e-ef59-4ed1-9948-62cb23f26d87", title: "LOALOA SHOW", revenue: 58000 }, { event_id: "1ad0cfc7-6ec7-4af8-a38c-a621882ea4d6", title: "NGẮM TRĂNG", revenue: 24000 }];
    expect(pickChartColumns(rows)).toEqual({ labelCol: "title", numCols: ["revenue"] });
  });
  it("skips a column of UUIDs even when it is not called id", () => {
    const rows = [{ ref: "28c5ec1e-ef59-4ed1-9948-62cb23f26d87", name: "A", total: 1 }];
    expect(pickChartColumns(rows)?.labelCol).toBe("name");
  });
  it("falls back to the id column when nothing else is text, and parses numeric strings", () => {
    expect(pickChartColumns([{ event_id: "x1", total: "12" }])).toEqual({ labelCol: "event_id", numCols: ["total"] });
  });
  it("gives nothing to plot for one column, no rows or no numbers", () => {
    expect(pickChartColumns([])).toBeNull();
    expect(pickChartColumns([{ a: "x" }])).toBeNull();
    expect(pickChartColumns([{ a: "x", b: "y" }])).toBeNull();
  });
});
