import { describe, expect, it } from "vitest";
import { buildOrganizerFinanceSheet } from "@/features/organizer/finance/organizerFinanceExport";

describe("buildOrganizerFinanceSheet", () => {
  it("labels the dataset and date field and preserves raw values", () => {
    const sheet = buildOrganizerFinanceSheet("Yêu cầu rút tiền", "createdAt", [
      { key: "createdAt", label: "Ngày tạo" },
      { key: "id", label: "Mã yêu cầu" },
      { key: "netAmount", label: "Số tiền ròng (VND)" },
    ], [{ createdAt: "2026-10-29T10:00:00Z", id: "pay-1", netAmount: 250000 }]);

    expect(sheet).toEqual([
      ["Bộ dữ liệu", "Yêu cầu rút tiền"],
      ["Trường ngày", "createdAt"],
      [],
      ["Ngày tạo", "Mã yêu cầu", "Số tiền ròng (VND)"],
      ["2026-10-29T10:00:00Z", "pay-1", 250000],
    ]);
  });

  it("escapes formula-like text while leaving numeric values intact", () => {
    const sheet = buildOrganizerFinanceSheet("Sự kiện", "eventEndAt", [
      { key: "eventName", label: "Tên sự kiện" },
      { key: "organizer", label: "Ban tổ chức" },
      { key: "amount", label: "Số tiền" },
    ], [{ eventName: "=HYPERLINK(\"https://bad.example\")", organizer: "\t@SUM(A1:A2)", amount: -100 }]);

    expect(sheet[4]).toEqual(["'=HYPERLINK(\"https://bad.example\")", "'\t@SUM(A1:A2)", -100]);
  });
});
