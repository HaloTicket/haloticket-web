import { describe, expect, it } from "vitest";
import { filtersFromSearch, hcmToday, isValidReportPeriod, percentageChange, reportQuery, safeCsvCell, shiftDate, summarizeTimeline } from "./reportUtils";
import { reportStatusText, reportText } from "./reportTranslations";

describe("event report query helpers", () => {
  it("keeps report filters in the URL and defaults to 30 HCM calendar days", () => {
    expect(hcmToday(new Date("2026-10-01T17:30:00Z"))).toBe("2026-10-02");
    expect(shiftDate("2026-10-02", -29)).toBe("2026-09-03");
    expect(filtersFromSearch("", "2026-10-02")).toMatchObject({ from: "2026-09-03", to: "2026-10-02", sort: "revenue", page: 1, size: 10 });
    const query = reportQuery({ ...filtersFromSearch("", "2026-10-02"), q: "Jazz", categoryId: "music", organizerId: "org-2", status: "APPROVED", page: 3, size: 20, sort: "tickets" });
    expect(filtersFromSearch(query, "2026-10-02")).toMatchObject({ q: "Jazz", categoryId: "music", organizerId: "org-2", status: "APPROVED", page: 3, size: 20, sort: "tickets" });
  });

  it("validates inclusive date bounds and groups timeline values by week", () => {
    expect(isValidReportPeriod("2026-09-01", "2026-09-30")).toBe(true);
    expect(isValidReportPeriod("2026-09-30", "2026-09-01")).toBe(false);
    expect(summarizeTimeline([
      { date: "2026-09-28", revenue: 2, orders: 1, tickets: 2 },
      { date: "2026-09-29", revenue: 3, orders: 2, tickets: 3 },
      { date: "2026-10-05", revenue: 7, orders: 1, tickets: 7 },
    ], "revenue", "week")).toEqual([{ date: "2026-09-28", value: 5 }, { date: "2026-10-05", value: 7 }]);
    expect(percentageChange(5, 0)).toBeNull();
    expect(percentageChange(15, 10)).toBe(50);
  });

  it("quotes CSV data and neutralizes formula-leading event titles", () => {
    expect(safeCsvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(safeCsvCell("Saigon, live")).toBe("\"Saigon, live\"");
  });

  it("keeps Vietnamese KPI/status labels canonical and translates source warnings", () => {
    expect(reportText("Doanh thu vé", "vi")).toBe("Doanh thu vé");
    expect(reportStatusText("APPROVED", "vi")).toBe("Đã duyệt");
    expect(reportStatusText("LIVE", "en")).toBe("Live");
    expect(reportText("Một số thanh toán thành công chưa có thời điểm xác nhận.", "en")).toBe("Some successful payments do not have a confirmation time.");
    expect(reportText("Một số thanh toán chưa khớp với sự kiện hoặc đơn đã thanh toán; các đơn này chưa được tính.", "en")).toContain("were excluded");
    expect(reportText("Có quá nhiều đơn thanh toán trong kỳ để tổng hợp. Vui lòng thu hẹp khoảng thời gian.", "vi")).toContain("100.000");
    expect(reportText("Có quá nhiều đơn thanh toán trong kỳ để tổng hợp. Vui lòng thu hẹp khoảng thời gian.", "en")).toContain("combined current and previous periods");
    expect(reportText("Báo cáo vượt quá giới hạn 10.000 sự kiện. Vui lòng thu hẹp bộ lọc trước khi xuất.", "en")).toContain("10,000-event export limit");
    expect(reportText("Trang phải bắt đầu từ 1 và kích thước trang là 10, 20 hoặc 50.", "en")).toContain("page size must be 10, 20, or 50");
  });
});
