// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const analyzeRiskScore = vi.fn();
const getApprovalEvents = vi.fn();

vi.mock("@/services/aiApi", () => ({ aiApi: { analyzeRiskScore: (...a: unknown[]) => analyzeRiskScore(...a) } }));
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

describe("EventApprovalDetail risk panel", () => {
  it("shows 'Chưa chấm được' with a retry, never a green 0, and does not cache the failure", async () => {
    analyzeRiskScore.mockRejectedValueOnce({ response: { status: 502, data: { code: "AI_GENERATION_FAILED" } } });
    renderPage();
    await screen.findByText("Chưa chấm được");
    expect(screen.queryByText("0")).toBeNull();
    expect(screen.getByText("AI chưa tạo được kết quả. Vui lòng thử lại.")).toBeTruthy();
    expect(localStorage.getItem("admin_risk_score_ev1")).toBeNull();

    analyzeRiskScore.mockResolvedValueOnce({ risk_score: 72, risk_level: "HIGH", reasons: ["Mô tả mơ hồ"] });
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await screen.findByText("72");
    expect(screen.getByText("Mô tả mơ hồ")).toBeTruthy();
    expect(screen.queryByText("Chưa chấm được")).toBeNull();
    expect(JSON.parse(localStorage.getItem("admin_risk_score_ev1") ?? "{}").risk_score).toBe(72);
  });

  it("treats a response without a score as a failure and tolerates missing reasons", async () => {
    analyzeRiskScore.mockResolvedValueOnce({ risk_level: "LOW" });
    renderPage();
    await screen.findByText("Chưa chấm được");
    expect(localStorage.getItem("admin_risk_score_ev1")).toBeNull();

    analyzeRiskScore.mockResolvedValueOnce({ risk_score: 0, risk_level: "LOW" });
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(screen.queryByText("Chưa chấm được")).toBeNull());
    expect(screen.getByText("0")).toBeTruthy(); // a real score of 0 is still shown
  });

  it("ignores a cached failure left by an older build", async () => {
    localStorage.setItem("admin_risk_score_ev1", JSON.stringify({ risk_score: 0, risk_level: "UNKNOWN", reasons: ["Xin lỗi, lỗi"] }));
    analyzeRiskScore.mockResolvedValueOnce({ risk_score: 10, risk_level: "LOW", reasons: [] });
    renderPage();
    await screen.findByText("10");
    expect(screen.queryByText("Xin lỗi, lỗi")).toBeNull();
  });
});
