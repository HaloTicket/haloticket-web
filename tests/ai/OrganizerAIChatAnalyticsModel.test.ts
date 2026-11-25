import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import type { OrganizerChatCard, OrganizerChatWarning } from "@/types/ai";
import {
  buildKpiCards,
  computeTruePeriodDelta,
  deriveInlineChartSpec,
  formatMessageTime,
  formatMetricValue,
  formatVietnamPeriod,
  getPercentProgressMeta,
  isExclusiveVietnamMidnight,
  resolveCardManageLink,
  resolveWarningActionLink,
  shouldUseHorizontalBars,
} from "@/components/common/OrganizerAIChatWidget/organizerAnalyticsModel";
import {
  buildAnalyticsCsvContent,
  buildAnalyticsSheetRows,
  buildAnalyticsWorkbook,
  downloadAnalyticsXlsx,
  sanitizeSpreadsheetCell,
} from "@/components/common/OrganizerAIChatWidget/organizerAnalyticsExport";

describe("organizerAnalyticsModel - Period Boundaries and Formatting", () => {
  it("detects exclusive Vietnam midnight boundaries accurately across +07:00 and UTC Z", () => {
    expect(isExclusiveVietnamMidnight("2026-11-08T00:00:00+07:00")).toBe(true);
    expect(isExclusiveVietnamMidnight("2026-11-07T17:00:00.000Z")).toBe(true);
    expect(isExclusiveVietnamMidnight("2026-11-08T14:30:00+07:00")).toBe(false);
    expect(isExclusiveVietnamMidnight("2026-11-08T00:00:00Z")).toBe(false);
    expect(isExclusiveVietnamMidnight("2026-11-08")).toBe(false);
  });

  it("shifts exclusive Vietnam-midnight end date to inclusive display only when justified", () => {
    expect(
      formatVietnamPeriod("2026-11-01T00:00:00+07:00", "2026-11-08T00:00:00+07:00", false),
    ).toBe("01/11/2026 - 07/11/2026");

    expect(
      formatVietnamPeriod("2026-11-24T00:00:00+07:00", "2026-11-25T00:00:00+07:00", false),
    ).toBe("24/11/2026");

    expect(
      formatVietnamPeriod("2026-11-18T16:15:00+07:00", "2026-11-25T16:15:00+07:00", false),
    ).toBe("18/11/2026 - 25/11/2026");

    expect(formatVietnamPeriod("2026-11-01", "2026-11-07", false)).toBe("01/11/2026 - 07/11/2026");

    expect(
      formatVietnamPeriod("2026-11-25T00:00:00+07:00", "2026-11-25T00:00:00+07:00", false),
    ).toBe("25/11/2026 - 25/11/2026");
  });

  it("formats HH:mm in Asia/Ho_Chi_Minh and rejects invalid timestamps cleanly", () => {
    expect(formatMessageTime(new Date("2026-11-25T02:07:00Z"))).toBe("09:07");
    expect(formatMessageTime("2026-11-25T16:45:00+07:00")).toBe("16:45");
    expect(formatMessageTime("not-a-date")).toBe("");
    expect(formatMessageTime(null)).toBe("");
  });
});

describe("organizerAnalyticsModel - True Period Delta & KPI Integrity", () => {
  const curPeriod = { from: "2026-11-08T00:00:00+07:00", to: "2026-11-15T00:00:00+07:00" };
  const prevPeriod = { from: "2026-11-01T00:00:00+07:00", to: "2026-11-08T00:00:00+07:00" };

  it("computes positive, negative, and flat deltas for complete matching metrics with positive prior baseline", () => {
    const up = computeTruePeriodDelta(
      { key: "tickets_sold", value: 125, unit: "count", period: curPeriod, completeness: "complete" },
      { key: "tickets_sold", value: 100, unit: "count", period: prevPeriod, completeness: "complete" },
      false,
    );
    expect(up?.direction).toBe("up");
    expect(up?.pct).toBe(25);
    expect(up?.formattedPct).toBe("+25%");

    const down = computeTruePeriodDelta(
      { key: "tickets_sold", value: 80, unit: "count", period: curPeriod, completeness: "complete" },
      { key: "tickets_sold", value: 100, unit: "count", period: prevPeriod, completeness: "complete" },
      false,
    );
    expect(down?.direction).toBe("down");
    expect(down?.pct).toBe(-20);
    expect(down?.formattedPct).toBe("-20%");

    const flat = computeTruePeriodDelta(
      { key: "tickets_sold", value: 100, unit: "count", period: curPeriod, completeness: "complete" },
      { key: "tickets_sold", value: 100, unit: "count", period: prevPeriod, completeness: "complete" },
      false,
    );
    expect(flat?.direction).toBe("flat");
    expect(flat?.formattedPct).toBe("0%");
  });

  it("refuses delta when baseline is zero, completeness is partial/missing, units mismatch, or periods overlap", () => {
    expect(
      computeTruePeriodDelta(
        { key: "tickets_sold", value: 50, unit: "count", period: curPeriod, completeness: "complete" },
        { key: "tickets_sold", value: 0, unit: "count", period: prevPeriod, completeness: "complete" },
      ),
    ).toBeNull();

    expect(
      computeTruePeriodDelta(
        { key: "tickets_sold", value: 50, unit: "count", period: curPeriod, completeness: "partial" },
        { key: "tickets_sold", value: 25, unit: "count", period: prevPeriod, completeness: "complete" },
      ),
    ).toBeNull();

    expect(
      computeTruePeriodDelta(
        { key: "tickets_sold", value: 50, unit: "count", period: curPeriod, completeness: "complete" },
        { key: "tickets_sold", value: null, unit: "count", period: prevPeriod, completeness: "missing" },
      ),
    ).toBeNull();

    expect(
      computeTruePeriodDelta(
        { key: "ticket_sales_revenue", value: 500000, unit: "VND", period: curPeriod, completeness: "complete" },
        { key: "ticket_sales_revenue", value: 250000, unit: "count", period: prevPeriod, completeness: "complete" },
      ),
    ).toBeNull();

    expect(
      computeTruePeriodDelta(
        { key: "tickets_sold", value: 50, unit: "count", period: curPeriod, completeness: "complete" },
        {
          key: "tickets_sold",
          value: 25,
          unit: "count",
          period: { from: "2026-11-05T00:00:00+07:00", to: "2026-11-10T00:00:00+07:00" },
          completeness: "complete",
        },
      ),
    ).toBeNull();
  });

  it("surfaces single-event canonical period KPIs when totals is empty without inventing missing metrics", () => {
    const singleEventCard: OrganizerChatCard = {
      kind: "event",
      event_id: "evt-single",
      event_title: "Live Acoustic",
      event_status: "LIVE",
      showtime_id: null,
      showtime_title: null,
      ticket_type_id: null,
      ticket_type_title: null,
      start_time: null,
      end_time: null,
      metrics: [
        { key: "tickets_sold", value: 90, unit: "count", period: curPeriod, completeness: "complete" },
        { key: "tickets_sold", value: 60, unit: "count", period: prevPeriod, completeness: "complete" },
        { key: "paid_orders", value: 45, unit: "count", period: curPeriod, completeness: "complete" },
        { key: "check_ins", value: null, unit: "count", period: curPeriod, completeness: "missing" },
      ],
    };

    const kpis = buildKpiCards([], [singleEventCard], false);
    expect(kpis.map((k) => k.key)).toEqual(["tickets_sold", "paid_orders", "check_ins"]);
    expect(kpis.find((k) => k.key === "ticket_sales_revenue")).toBeUndefined();
    expect(kpis[0].delta?.formattedPct).toBe("+50%");
    expect(formatMetricValue(kpis[2].current, false)).toBe("—");
  });
});

describe("organizerAnalyticsModel - Progress Thresholds, Router Links, and Chart Rules", () => {
  it("classifies percent progress thresholds at >=80 high, 30-79 medium, <30 low", () => {
    expect(getPercentProgressMeta(80)).toEqual({ clampedValue: 80, tone: "high" });
    expect(getPercentProgressMeta(120)).toEqual({ clampedValue: 100, tone: "high" });
    expect(getPercentProgressMeta(79.9)).toEqual({ clampedValue: 79.9, tone: "medium" });
    expect(getPercentProgressMeta(30)).toEqual({ clampedValue: 30, tone: "medium" });
    expect(getPercentProgressMeta(29.9)).toEqual({ clampedValue: 29.9, tone: "low" });
    expect(getPercentProgressMeta(-5)).toEqual({ clampedValue: 0, tone: "low" });
  });

  it("emits only routes declared in src/routes/index.tsx and URL-encodes event IDs", () => {
    const routerSource = readFileSync(resolve("src/routes/index.tsx"), "utf8");
    for (const seg of ["overview", "orders", "checkin", "showtimes"]) {
      expect(routerSource).toContain(`path: "${seg}"`);
    }

    const baseCard: OrganizerChatCard = {
      kind: "event",
      event_id: "evt/special id",
      event_title: "Test",
      event_status: "LIVE",
      showtime_id: null,
      showtime_title: null,
      ticket_type_id: null,
      ticket_type_title: null,
      start_time: null,
      end_time: null,
      metrics: [],
    };

    const wOrders = resolveWarningActionLink({ ...baseCard, code: "paid_order_missing_tickets" } as OrganizerChatWarning);
    const wStock = resolveWarningActionLink({ ...baseCard, code: "low_stock" } as OrganizerChatWarning);
    const wSlow = resolveWarningActionLink({ ...baseCard, code: "slow_showtime" } as OrganizerChatWarning);
    expect(wOrders?.href).toBe("/organizer/events/evt%2Fspecial%20id/manage/orders");
    expect(wStock?.href).toBe("/organizer/events/evt%2Fspecial%20id/manage/showtimes");
    expect(wSlow?.href).toBe("/organizer/events/evt%2Fspecial%20id/manage/overview");

    expect(resolveCardManageLink({ ...baseCard, event_id: "   " })).toBeNull();
  });

  it("excludes partial lower-bound points from bar/donut visuals while retaining them with >= in tableMatrix", () => {
    const cards: OrganizerChatCard[] = [
      {
        kind: "event",
        event_id: "e1",
        event_title: "Show A",
        event_status: "LIVE",
        showtime_id: null,
        showtime_title: null,
        ticket_type_id: null,
        ticket_type_title: null,
        start_time: "2026-12-01T19:00:00+07:00",
        end_time: null,
        metrics: [{ key: "tickets_sold", value: 300, unit: "count", period: null, completeness: "complete" }],
      },
      {
        kind: "event",
        event_id: "e2",
        event_title: "Show B",
        event_status: "LIVE",
        showtime_id: null,
        showtime_title: null,
        ticket_type_id: null,
        ticket_type_title: null,
        start_time: "2026-12-05T19:00:00+07:00",
        end_time: null,
        metrics: [{ key: "tickets_sold", value: 200, unit: "count", period: null, completeness: "complete" }],
      },
      {
        kind: "event",
        event_id: "e3",
        event_title: "Show C (Partial)",
        event_status: "LIVE",
        showtime_id: null,
        showtime_title: null,
        ticket_type_id: null,
        ticket_type_title: null,
        start_time: "2026-12-10T19:00:00+07:00",
        end_time: null,
        metrics: [{ key: "tickets_sold", value: 150, unit: "count", period: null, completeness: "partial" }],
      },
    ];

    const spec = deriveInlineChartSpec({
      cards,
      question: "So sánh vé bán các sự kiện",
      translateMetric: (k) => k,
    });

    expect(spec).not.toBeNull();
    // Only the 2 complete events are plotted in the BarChart
    expect(spec!.points).toHaveLength(2);
    // Because 1 peer had partial data, Donut share of the whole set is disabled
    expect(spec!.enabledTabs.donut).toBe(false);
    // Distinct events with start_time MUST NOT pretend to be a time-series trend line!
    expect(spec!.enabledTabs.line).toBe(false);
    // All 3 events (including Show C with >= 150) remain visible in the tableMatrix!
    expect(spec!.tableMatrix.rows).toHaveLength(3);
    expect(spec!.tableMatrix.rows[2].cells.tickets_sold.formatted).toBe("≥ 150");
  });

  it("prioritizes typed ISO YYYY-MM-DD daily DISPLAY_DATA_TABLE series as Trend, localizing known metric keys and disabling Donut", () => {
    const labels: Record<string, string> = {
      ticket_sales_revenue: "Giá trị vé bán trước voucher",
      tickets_sold: "Vé đã bán",
    };
    const spec = deriveInlineChartSpec({
      tableRows: [
        { date: "2026-11-21", ticket_sales_revenue: 18000000 },
        { date: "2026-11-19", ticket_sales_revenue: 12000000 },
        { date: "2026-11-20", ticket_sales_revenue: 15000000 },
      ],
      consumedActionIndex: 0,
      question: "Diễn biến doanh thu theo ngày",
      translateMetric: (k) => labels[k] ?? k,
      dateColumnLabel: "Ngày",
    });

    expect(spec).not.toBeNull();
    expect(spec!.source).toBe("data_table");
    expect(spec!.consumedActionIndex).toBe(0);
    expect(spec!.unit).toBe("VND");
    expect(spec!.title).toBe("Giá trị vé bán trước voucher");
    expect(spec!.defaultTab).toBe("line");
    expect(spec!.enabledTabs).toEqual({
      bar: true,
      donut: false,
      line: true,
      table: true,
    });
    // Sorted chronologically: 19/11 -> 20/11 -> 21/11
    expect(spec!.points.map((p) => p.shortLabel)).toEqual(["19/11", "20/11", "21/11"]);
    expect(spec!.tableMatrix.entityHeaderVi).toBe("Ngày");
    expect(spec!.exportColumns).toEqual([
      { key: "date", label: "Ngày" },
      { key: "ticket_sales_revenue", label: "Giá trị vé bán trước voucher" },
    ]);
    // Temporal series keeps vertical columns (dates left-to-right on X-axis)
    expect(shouldUseHorizontalBars(spec!, false)).toBe(false);
  });

  it("disables Line tab for showtime comparisons even when showtimes have start_time, and uses horizontal bars when compact", () => {
    const showtimes: OrganizerChatCard[] = [
      {
        kind: "showtime",
        event_id: "e1",
        event_title: "Musical",
        event_status: "LIVE",
        showtime_id: "s1",
        showtime_title: "Đêm 1",
        ticket_type_id: null,
        ticket_type_title: null,
        start_time: "2026-12-10T19:30:00+07:00",
        end_time: null,
        metrics: [{ key: "occupancy_rate", value: 92, unit: "percent", period: null, completeness: "complete" }],
      },
      {
        kind: "showtime",
        event_id: "e1",
        event_title: "Musical",
        event_status: "LIVE",
        showtime_id: "s2",
        showtime_title: "Đêm 2",
        ticket_type_id: null,
        ticket_type_title: null,
        start_time: "2026-12-11T19:30:00+07:00",
        end_time: null,
        metrics: [{ key: "occupancy_rate", value: 75, unit: "percent", period: null, completeness: "complete" }],
      },
    ];

    const spec = deriveInlineChartSpec({
      cards: showtimes,
      question: "Tỷ lệ lấp đầy các suất diễn",
      translateMetric: (k) => k,
    });

    expect(spec).not.toBeNull();
    expect(spec!.enabledTabs.donut).toBe(false);
    expect(spec!.enabledTabs.line).toBe(false);
    expect(shouldUseHorizontalBars(spec!, false)).toBe(true);
  });
});

describe("organizerAnalyticsExport - XLSX & CSV Sanitization (Including Labels)", () => {
  it("neutralizes spreadsheet formula prefixes in column labels, row labels, and string cells while keeping finite numbers numeric", () => {
    expect(sanitizeSpreadsheetCell("=CMD|' /C calc'!A0")).toBe("'=CMD|' /C calc'!A0");
    expect(sanitizeSpreadsheetCell("  +SUM(A1:A2)")).toBe("'  +SUM(A1:A2)");
    expect(sanitizeSpreadsheetCell("-1+1")).toBe("'-1+1");
    expect(sanitizeSpreadsheetCell("@HYPERLINK(\"https://evil.test\")")).toBe("'@HYPERLINK(\"https://evil.test\")");
    expect(sanitizeSpreadsheetCell("|calc")).toBe("'|calc");
    expect(sanitizeSpreadsheetCell("\t=1+1")).toBe("'\t=1+1");
    expect(sanitizeSpreadsheetCell("\n=1+1")).toBe("'\n=1+1");
    expect(sanitizeSpreadsheetCell(-250000)).toBe(-250000);
    expect(sanitizeSpreadsheetCell(50000000)).toBe(50000000);
    expect(sanitizeSpreadsheetCell(NaN)).toBe("");

    const cols = [
      { key: "entity", label: "=MaliciousHeader" },
      { key: "note", label: "@FormulaCol" },
      { key: "amount", label: "Số tiền (VND)" },
    ];
    const rows = [
      {
        entity: "+Event Hack",
        note: "\t@SUM(A1:B1)",
        amount: -150000,
      },
    ];

    const aoa = buildAnalyticsSheetRows(cols, rows);
    expect(aoa).toEqual([
      ["'=MaliciousHeader", "'@FormulaCol", "Số tiền (VND)"],
      ["'+Event Hack", "'\t@SUM(A1:B1)", -150000],
    ]);

    const wb = buildAnalyticsWorkbook(cols, rows);
    const ws = wb.Sheets[wb.SheetNames[0]];
    expect(ws.A1.v).toBe("'=MaliciousHeader");
    expect(ws.B1.v).toBe("'@FormulaCol");
    expect(ws.A2.v).toBe("'+Event Hack");
    expect(ws.C2.t).toBe("n");
    expect(ws.C2.v).toBe(-150000);

    const writer = vi.fn();
    downloadAnalyticsXlsx(cols, rows, "test export!", writer);
    expect(writer).toHaveBeenCalledTimes(1);
    expect(writer.mock.calls[0][1]).toBe("test_export.xlsx");

    const csv = buildAnalyticsCsvContent(cols, rows);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    const parsedBack = XLSX.read(csv.slice(1), { type: "string" });
    const csvSheet = parsedBack.Sheets[parsedBack.SheetNames[0]];
    expect(csvSheet.A1.v).toBe("'=MaliciousHeader");
    expect(csvSheet.B1.v).toBe("'@FormulaCol");
    expect(csvSheet.A2.v).toBe("'+Event Hack");
    expect(csvSheet.C2.v).toBe(-150000);
  });
});
