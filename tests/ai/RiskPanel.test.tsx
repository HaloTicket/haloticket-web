// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const analyzeRiskScore = vi.fn();
const getApprovalEvents = vi.fn();

vi.mock("@/services/aiApi", () => ({ aiApi: { analyzeRiskScore: (...a: unknown[]) => analyzeRiskScore(...a), recordRiskDecision: vi.fn() } }));
vi.mock("@/services/eventApi", () => ({ eventApi: { getApprovalEvents: (...a: unknown[]) => getApprovalEvents(...a), approveEvent: vi.fn(), rejectEvent: vi.fn() } }));
vi.mock("@/services/ticketApi", () => ({ ticketApi: { getSeatLayoutByEventId: vi.fn().mockResolvedValue(null) } }));
vi.mock("@/features/organizer/event-manage/components/seating/SeatCanvas", () => ({ SeatCanvas: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import "@/i18n";
import { EventApprovalDetail } from "@/features/admin/events/EventApprovalDetail";

const event = { id: "ev1", title: "Đêm nhạc", description: "Mô tả", organizerName: "BTC", eventApprovalStatus: "PENDING" };

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/events-approval/ev1"]}>
      <Routes><Route path="/admin/events-approval/:eventId" element={<EventApprovalDetail />} /></Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  analyzeRiskScore.mockReset();
  getApprovalEvents.mockReset();
  getApprovalEvents.mockResolvedValue([event]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const full = {
  risk_score: 55, risk_level: "MEDIUM", reasons: ["Có số điện thoại"], complete: true, ruleset_version: "1", assessed_at: "2026-11-08T10:00:00Z",
  coverage: { rules: true, signals: { assessed: 6, total: 6, missing: [] }, ai: "ran" },
  reason_items: [{ layer: "RULE", code: "contact_phone", severity: "HIGH", weight: 25, message: "Có số điện thoại", evidence: [{ field: "description", text: "Mô tả" }] }],
};

describe("EventApprovalDetail risk panel", () => {
  it("shows 'Chưa chấm được' with a retry, never a green 0, and keeps nothing in the browser", async () => {
    analyzeRiskScore.mockRejectedValueOnce({ response: { status: 502, data: { code: "AI_GENERATION_FAILED" } } });
    renderPage();
    await screen.findByText("Chưa chấm được");
    expect(screen.queryByText("0")).toBeNull();
    expect(screen.getByText("AI chưa tạo được kết quả. Vui lòng thử lại.")).toBeTruthy();
    expect(localStorage.getItem("admin_risk_score_ev1")).toBeNull();

    analyzeRiskScore.mockResolvedValueOnce({ risk_score: 72, risk_level: "HIGH", reasons: ["Mô tả mơ hồ"] });
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await screen.findByText("72");
    expect(screen.getByText("Mô tả mơ hồ")).toBeTruthy(); // old contract (plain reasons) still renders
    expect(screen.queryByText("Chưa chấm được")).toBeNull();
    expect(localStorage.getItem("admin_risk_score_ev1")).toBeNull();
    expect(analyzeRiskScore).toHaveBeenLastCalledWith("ev1", "Đêm nhạc", "Mô tả", "BTC", { refresh: true });
  });

  it("treats a response without a score as a failure", async () => {
    analyzeRiskScore.mockResolvedValueOnce({ risk_level: "LOW" });
    renderPage();
    await screen.findByText("Chưa chấm được");

    analyzeRiskScore.mockResolvedValueOnce({ risk_score: 0, risk_level: "LOW", complete: true });
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(screen.queryByText("Chưa chấm được")).toBeNull());
    expect(screen.getByText("0")).toBeTruthy(); // a real, complete score of 0 is still shown
  });

  it("ignores a result an older build left in localStorage and asks the server", async () => {
    localStorage.setItem("admin_risk_score_ev1", JSON.stringify({ risk_score: 0, risk_level: "UNKNOWN", reasons: ["Xin lỗi, lỗi"] }));
    analyzeRiskScore.mockResolvedValueOnce({ risk_score: 10, risk_level: "LOW", reasons: [], complete: true });
    renderPage();
    await screen.findByText("10");
    expect(screen.queryByText("Xin lỗi, lỗi")).toBeNull();
    expect(analyzeRiskScore).toHaveBeenCalledWith("ev1", "Đêm nhạc", "Mô tả", "BTC", { refresh: false });
  });

  it("shows the layered reasons, highlights the quoted text in the description and re-scores on request", async () => {
    analyzeRiskScore.mockResolvedValueOnce(full);
    renderPage();
    await screen.findByText("Luật kiểm duyệt");
    const mark = screen.getByTestId("event-description").querySelector("mark");
    expect(mark?.textContent).toBe("Mô tả");
    expect(screen.getByText(/Bộ luật v1/)).toBeTruthy();

    analyzeRiskScore.mockResolvedValueOnce({ ...full, risk_score: 60, risk_level: "HIGH" });
    fireEvent.click(screen.getByRole("button", { name: "Chấm lại" }));
    await waitFor(() => expect(analyzeRiskScore).toHaveBeenCalledTimes(2));
    expect(analyzeRiskScore).toHaveBeenLastCalledWith("ev1", "Đêm nhạc", "Mô tả", "BTC", { refresh: true });
  });

  it("says the rules could not be loaded instead of showing a score", async () => {
    analyzeRiskScore.mockResolvedValueOnce({ ...full, coverage: { rules: false, signals: { assessed: 0, total: 6, missing: [] }, ai: "skipped" } });
    renderPage();
    await screen.findByText("Chưa chấm được");
    expect(screen.getByText("Không nạp được bộ luật kiểm duyệt nên chưa thể chấm.")).toBeTruthy();
  });
});
