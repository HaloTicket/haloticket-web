// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import "@/i18n";
import { RiskBadge } from "@/features/admin/components/RiskBadge";
import { RiskReasonsPanel } from "@/features/admin/components/RiskReasonsPanel";
import { evidenceQuotes, highlightEvidence } from "@/utils/riskHighlight";
import type { AiRiskScoreResponse, RiskCoverage } from "@/types/ai";

afterEach(() => cleanup());

const coverage = (ai: RiskCoverage["ai"] = "ran"): RiskCoverage => ({ rules: true, signals: { assessed: 5, total: 6, missing: ["UNAVAILABLE:near_duplicate"] }, ai });

describe("RiskBadge", () => {
  it("never draws a LOW from an incomplete assessment as a green 'safe' badge", () => {
    render(<RiskBadge assessment={{ risk_level: "LOW", risk_score: 0, complete: false, coverage: coverage("ran") }} />);
    const badge = screen.getByTestId("risk-badge");
    expect(badge.textContent).toBe("Thấp (chưa đủ lớp)");
    expect(badge.getAttribute("data-incomplete")).toBe("true");
    expect(badge.className).not.toContain("emerald");
    expect(badge.className).toContain("border-dashed");
  });

  it("draws a complete LOW green, MEDIUM amber and HIGH red", () => {
    const { rerender } = render(<RiskBadge assessment={{ risk_level: "LOW", risk_score: 3, complete: true, coverage: coverage("ran") }} />);
    expect(screen.getByTestId("risk-badge").className).toContain("emerald");
    rerender(<RiskBadge assessment={{ risk_level: "MEDIUM", risk_score: 40, complete: false }} />);
    expect(screen.getByTestId("risk-badge").className).toContain("amber");
    rerender(<RiskBadge assessment={{ risk_level: "HIGH", risk_score: 80, complete: false }} showScore />);
    expect(screen.getByTestId("risk-badge").className).toContain("rose");
    expect(screen.getByText("80")).toBeTruthy();
  });

  it("shows 'Chưa chạy AI' when the AI layer failed or was skipped, and nothing when it ran", () => {
    const { rerender } = render(<RiskBadge assessment={{ risk_level: "HIGH", risk_score: 70, complete: false, coverage: coverage("failed") }} />);
    expect(screen.getByTestId("risk-ai-chip").textContent).toBe("Chưa chạy AI");
    rerender(<RiskBadge assessment={{ risk_level: "HIGH", risk_score: 70, complete: false, coverage: coverage("skipped") }} />);
    expect(screen.getByTestId("risk-ai-chip")).toBeTruthy();
    rerender(<RiskBadge assessment={{ risk_level: "HIGH", risk_score: 70, complete: true, coverage: coverage("ran") }} />);
    expect(screen.queryByTestId("risk-ai-chip")).toBeNull();
  });

  it("shows 'Chưa chấm' without an assessment", () => {
    render(<RiskBadge assessment={null} />);
    expect(screen.getByText("Chưa chấm")).toBeTruthy();
  });
});

describe("highlightEvidence", () => {
  const html = (text: string, quotes: string[]) => render(<div>{highlightEvidence(text, quotes)}</div>).container.firstElementChild as HTMLElement;

  it("wraps a found quote in <mark> and leaves the rest as text", () => {
    const out = html("Liên hệ 0901234567 ngay", ["0901234567"]);
    expect(out.querySelectorAll("mark")).toHaveLength(1);
    expect(out.querySelector("mark")?.textContent).toBe("0901234567");
    expect(out.textContent).toBe("Liên hệ 0901234567 ngay");
  });

  it("ignores a quote that is not in the text and returns the text unchanged", () => {
    const out = html("Mô tả sạch", ["không có"]);
    expect(out.querySelector("mark")).toBeNull();
    expect(out.textContent).toBe("Mô tả sạch");
  });

  it("merges overlapping quotes and handles several", () => {
    const out = html("abc def ghi", ["abc def", "def ghi"]);
    expect(out.querySelectorAll("mark")).toHaveLength(1);
    expect(out.querySelector("mark")?.textContent).toBe("abc def ghi");
    expect(html("one two", ["one", "two"]).querySelectorAll("mark")).toHaveLength(2);
  });

  it("never turns text into markup", () => {
    const evil = '<img src=x onerror="alert(1)"> gọi 090';
    const out = html(evil, ["gọi 090", "<img src=x onerror=\"alert(1)\">"]);
    expect(out.querySelector("img")).toBeNull();
    expect(out.textContent).toBe(evil);
  });

  it("collects the description quotes from the reason items, longest first", () => {
    const quotes = evidenceQuotes([
      { layer: "RULE", code: "a", weight: 1, message: "m", evidence: [{ field: "description", text: "ab" }, { field: "title", text: "ignored title" }] },
      { layer: "AI", code: "b", weight: 1, message: "m", evidence: [{ field: "description", text: "longer quote" }, { field: "description", text: "ab" }] },
    ]);
    expect(quotes).toEqual(["longer quote", "ab"]);
  });
});

describe("RiskReasonsPanel", () => {
  const assessment: AiRiskScoreResponse = {
    risk_score: 62, risk_level: "HIGH", complete: false, ruleset_version: "1", assessed_at: "2026-11-08T10:00:00Z", coverage: coverage("failed"),
    reasons: ["Có số điện thoại"],
    reason_items: [
      { layer: "RULE", code: "contact_phone", severity: "HIGH", weight: 25, message: "Có số điện thoại trong nội dung.", evidence: [{ field: "description", text: "0901234567" }] },
      { layer: "SIGNAL", code: "organizer_ekyc_not_approved", severity: "HIGH", weight: 15, message: "Ban tổ chức chưa được xác minh eKYC.", evidence: [] },
      { layer: "SIGNAL", code: "UNAVAILABLE:near_duplicate", weight: 0, status: "not_assessed", message: "Không đánh giá được tín hiệu này (không lấy được dữ liệu).", evidence: [] },
    ],
  };

  it("groups the reasons by layer, shows the quote, the muted 'could not assess' item and the coverage line", () => {
    render(<RiskReasonsPanel assessment={assessment} onRefresh={() => {}} />);
    expect(screen.getByText("Luật kiểm duyệt")).toBeTruthy();
    expect(screen.getByText("Tín hiệu dữ liệu")).toBeTruthy();
    expect(screen.queryByText("Phân tích ngữ nghĩa (AI)")).toBeNull(); // no AI items: no AI group
    expect(screen.getByText("Có số điện thoại trong nội dung.")).toBeTruthy();
    expect(screen.getByText("0901234567").tagName).toBe("Q");
    expect(screen.getByText(/Không đánh giá được: near_duplicate/)).toBeTruthy();
    expect(screen.getByText(/Đã đánh giá 5\/6 tín hiệu dữ liệu\. Lớp AI: lỗi, chưa chạy được\./)).toBeTruthy();
    expect(screen.getByText(/Bộ luật v1/)).toBeTruthy();
    expect(screen.getByText("AI chỉ gợi ý, quyết định thuộc về Admin.")).toBeTruthy();
    expect(screen.getByTestId("risk-ai-chip")).toBeTruthy();
  });

  it("calls onRefresh from 'Chấm lại' and disables it while refreshing", () => {
    const onRefresh = vi.fn();
    const { rerender } = render(<RiskReasonsPanel assessment={assessment} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByRole("button", { name: "Chấm lại" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    rerender(<RiskReasonsPanel assessment={assessment} onRefresh={onRefresh} refreshing />);
    expect((screen.getByRole("button", { name: "Chấm lại" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("says plainly when the rules were not loaded", () => {
    render(<RiskReasonsPanel assessment={{ ...assessment, reason_items: [], reasons: [], coverage: { ...coverage("skipped"), rules: false } }} onRefresh={() => {}} />);
    expect(screen.getByRole("alert").textContent).toContain("Không nạp được bộ luật kiểm duyệt");
  });

  it("shows 'no violation' only when layers ran and found nothing", () => {
    render(<RiskReasonsPanel assessment={{ ...assessment, risk_score: 0, risk_level: "LOW", complete: true, coverage: coverage("ran"), reason_items: [], reasons: [] }} onRefresh={() => {}} />);
    expect(screen.getByText("Không phát hiện dấu hiệu vi phạm ở các lớp đã chạy.")).toBeTruthy();
  });
});
