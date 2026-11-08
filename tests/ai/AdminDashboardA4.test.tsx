// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const getDashboardKpis = vi.fn();
const getDashboardSummary = vi.fn();
const getAttention = vi.fn();
const getPins = vi.fn();
const getRiskAgreement = vi.fn();

vi.mock("@/services/aiApi", () => ({
  aiApi: {
    getDashboardKpis: (...a: unknown[]) => getDashboardKpis(...a), getDashboardSummary: (...a: unknown[]) => getDashboardSummary(...a),
    getAttention: (...a: unknown[]) => getAttention(...a), getPins: (...a: unknown[]) => getPins(...a),
    getRiskAgreement: (...a: unknown[]) => getRiskAgreement(...a), getPinData: vi.fn(),
  },
}));
vi.mock("@/services/eventApi", () => ({ eventApi: { getApprovalEvents: vi.fn().mockResolvedValue([]) } }));
vi.mock("@/services/venueApi", () => ({ venueApi: { getVenues: vi.fn().mockResolvedValue([]) } }));
vi.mock("@/services/marketplaceApi", () => ({ marketplaceApi: { getResaleEvents: vi.fn().mockResolvedValue([]) } }));
vi.mock("@/services/userApi", () => ({ getCachedUserProfile: () => ({ fullName: "Admin Một" }) }));

import "@/i18n";
import { AdminDashboard } from "@/features/admin/AdminDashboard";

const kpis = (over: Record<string, unknown> = {}) => ({
  generated_at: "2026-11-08T10:00:00Z", hash: "h",
  pending_events: { total: 4, pending: 3, update_pending: 1, by_risk: { HIGH: 1, MEDIUM: 1, LOW: 1, UNASSESSED: 1 } },
  live_events: 12, resale_pending: { count: 2, oldest_hours: 30.4 },
  transactions_7d: { days: [], orders_total: 50, revenue_total: 1500000 },
  late_payments_open: 3, paid_without_tickets: 1, stock_discrepancies: 0,
  services: { up: 12, total: 13, down: ["ticket-service"] }, sources: { events: "ok", resale: "ok" },
  ...over,
});

function renderDashboard() {
  return render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
}

beforeEach(() => {
  localStorage.clear();
  [getDashboardKpis, getDashboardSummary, getAttention, getPins, getRiskAgreement].forEach((fn) => fn.mockReset());
  getDashboardKpis.mockResolvedValue(kpis());
  getAttention.mockResolvedValue({ generated_at: "", items: [], sources: { events: "ok" } });
  getPins.mockResolvedValue({ pins: [], max: 12 });
  getRiskAgreement.mockResolvedValue({ days: 30, decided: 0, agree: 0, disagree: 0, neutral: 0, derived: 0, pending: 0, by_level: {} });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("AdminDashboard real KPIs", () => {
  it("shows the figures from the server, including a real 0", async () => {
    renderDashboard();
    await waitFor(() => expect(within(screen.getByTestId("kpi-live")).getByText("12")).toBeTruthy());
    expect(within(screen.getByTestId("kpi-pending")).getByText("4")).toBeTruthy();
    expect(screen.getByTestId("kpi-pending").textContent).toContain("1 rủi ro cao · 1 trung bình · 1 thấp · 1 chưa chấm");
    expect(within(screen.getByTestId("kpi-orders")).getByText("50")).toBeTruthy();
    expect(within(screen.getByTestId("kpi-stock")).getByText("0")).toBeTruthy(); // measured and zero
    expect(screen.getByTestId("kpi-services").textContent).toContain("12/13 dịch vụ");
    expect(screen.getByTestId("kpi-services").textContent).toContain("Đang lỗi: ticket-service");
  });

  it("shows 'Không có dữ liệu' for a missing figure, never 0", async () => {
    getDashboardKpis.mockResolvedValue(kpis({ late_payments_open: null, paid_without_tickets: null, stock_discrepancies: null, resale_pending: null, transactions_7d: null, services: null, live_events: null,
      sources: { reconciliation: "unavailable", resale: "unavailable" } }));
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId("kpi-late").textContent).toContain("Không có dữ liệu"));
    for (const id of ["late", "paid-no-tickets", "stock", "resale", "orders", "services", "live"]) {
      const text = screen.getByTestId(`kpi-${id}`).textContent ?? "";
      expect(text, id).toContain("Không có dữ liệu");
      expect(text, id).not.toMatch(/(^|[^\d])0([^\d]|$)/);
    }
    expect(screen.getByText(/Không đọc được nguồn: reconciliation, resale/)).toBeTruthy();
  });

  it("shows an error with a retry when the KPI request fails", async () => {
    getDashboardKpis.mockRejectedValueOnce(new Error("down"));
    renderDashboard();
    await screen.findByText("Không tải được số liệu tổng quan.");
    fireEvent.click(screen.getAllByRole("button", { name: "Thử lại" })[0]);
    await waitFor(() => expect(screen.getByTestId("kpi-live")).toBeTruthy());
  });

  it("no longer invents a summary: nothing is generated on load and no summary is cached in the browser", async () => {
    renderDashboard();
    await screen.findByTestId("kpi-live");
    expect(getDashboardSummary).not.toHaveBeenCalled();
    expect(screen.getByText(/Chỉ tạo khi bạn bấm/)).toBeTruthy();
    expect(Object.keys(localStorage).some((key) => key.startsWith("admin_ai_executive_summary"))).toBe(false);
  });
});

describe("dashboard summary", () => {
  it("creates the summary only when the button is pressed, in the page language, and says when it was reused", async () => {
    getDashboardSummary.mockResolvedValue({ summary: "Có 4 sự kiện chờ duyệt.\n\nCó 3 thanh toán muộn.", reason: null, cached: true, created_at: "2026-11-08T03:00:00Z" });
    renderDashboard();
    fireEvent.click(await screen.findByRole("button", { name: "Tạo tóm tắt" }));
    expect(screen.getByRole("status").textContent).toContain("Đang tạo tóm tắt");
    await screen.findByText("Có 4 sự kiện chờ duyệt.");
    expect(getDashboardSummary).toHaveBeenCalledWith("vi", false);
    expect(screen.getAllByTestId("summary-text")).toHaveLength(2);
    expect(screen.getByText(/Dùng lại bản đã tạo lúc/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tạo lại" })).toBeTruthy();
  });

  it("shows only the figures and a note when the summary failed the number check", async () => {
    getDashboardSummary.mockResolvedValue({ summary: null, reason: "UNVERIFIED", cached: false, created_at: "2026-11-08T10:00:00Z" });
    renderDashboard();
    fireEvent.click(await screen.findByRole("button", { name: "Tạo tóm tắt" }));
    await screen.findByText("Đoạn tóm tắt không đạt kiểm tra số liệu nên không hiển thị.");
    expect(screen.queryByTestId("summary-text")).toBeNull();
    expect(screen.getByTestId("kpi-live")).toBeTruthy(); // the figures stay
  });

  it("shows the real error and lets the admin retry", async () => {
    getDashboardSummary.mockRejectedValueOnce({ response: { status: 429, data: { code: "AI_RATE_LIMITED" }, headers: { "retry-after": "30" } } });
    renderDashboard();
    fireEvent.click(await screen.findByRole("button", { name: "Tạo tóm tắt" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Không tạo được tóm tắt.");
    expect(alert.textContent).toContain("30 giây");
    getDashboardSummary.mockResolvedValueOnce({ summary: "Ổn.", reason: null, cached: false, created_at: "2026-11-08T10:00:00Z" });
    fireEvent.click(within(alert).getByRole("button", { name: "Thử lại" }));
    await screen.findByText("Ổn.");
    expect(getDashboardSummary).toHaveBeenCalledTimes(2);
  });
});
