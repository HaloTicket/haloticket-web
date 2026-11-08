// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const getAttention = vi.fn();
const getPins = vi.fn();
const getPinData = vi.fn();
const deletePin = vi.fn();
const toastError = vi.fn();

vi.mock("@/services/aiApi", () => ({
  aiApi: {
    getAttention: (...a: unknown[]) => getAttention(...a), getPins: (...a: unknown[]) => getPins(...a),
    getPinData: (...a: unknown[]) => getPinData(...a), deletePin: (...a: unknown[]) => deletePin(...a),
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: (...a: unknown[]) => toastError(...a), info: vi.fn() } }));

import "@/i18n";
import { AttentionFeed } from "@/features/admin/components/AttentionFeed";
import { PinnedReports } from "@/features/admin/components/PinnedReports";

beforeEach(() => {
  getAttention.mockReset();
  getPins.mockReset();
  getPinData.mockReset();
  deletePin.mockReset();
  toastError.mockReset();
});
afterEach(() => cleanup());

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("AttentionFeed", () => {
  it("shows a loading state, then the items with priority, evidence and a link to the page that handles them", async () => {
    getAttention.mockResolvedValue({
      generated_at: "2026-11-08T10:00:00Z", sources: { events: "ok", late_payments: "ok" },
      items: [
        { id: "HIGH_RISK_PENDING:e1", type: "HIGH_RISK_PENDING", priority: "CRITICAL", title: "Sự kiện rủi ro cao chờ duyệt: Đêm nhạc", link: "/admin/events-approval/e1", since: "2026-11-07T00:00:00Z",
          evidence: { event_id: "e1", risk_score: 82, hours_waiting: 30.5, reasons: ["Có số điện thoại"] } },
        { id: "LATE_PAYMENT_OPEN:p1", type: "LATE_PAYMENT_OPEN", priority: "HIGH", title: "Thanh toán muộn chờ xử lý: BK1", link: "/admin/reconciliation", since: null, evidence: { booking_code: "BK1", minutes_open: 95 } },
      ],
    });
    wrap(<AttentionFeed />);
    expect(screen.getByRole("status")).toBeTruthy();
    const items = await screen.findAllByTestId("attention-item");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("Khẩn cấp").getAttribute("data-priority")).toBe("CRITICAL");
    expect(items[0].textContent).toContain("Điểm 82");
    expect(items[0].textContent).toContain("chờ 30.5 giờ");
    expect(items[0].textContent).toContain("Có số điện thoại");
    expect((within(items[0]).getByRole("link", { name: /Xử lý/ }) as HTMLAnchorElement).getAttribute("href")).toBe("/admin/events-approval/e1");
    expect(items[1].textContent).toContain("mở 95 phút");
    expect(screen.queryByText("Không có cảnh báo")).toBeNull();
  });

  it("says 'no alerts' only when the list is empty and every source was checked", async () => {
    getAttention.mockResolvedValue({ generated_at: "", items: [], sources: { events: "ok", services: "ok" } });
    wrap(<AttentionFeed />);
    await screen.findByText("Không có cảnh báo");
  });

  it("does not claim 'no alerts' when a source could not be checked, and names it", async () => {
    getAttention.mockResolvedValue({ generated_at: "", items: [], sources: { events: "ok", late_payments: "unavailable" } });
    wrap(<AttentionFeed />);
    await screen.findByText("Không kiểm tra được: thanh toán muộn");
    expect(screen.queryByText("Không có cảnh báo")).toBeNull();
  });

  it("shows the items it has and also the partial-source note", async () => {
    getAttention.mockResolvedValue({
      generated_at: "", sources: { services: "unavailable" },
      items: [{ id: "x", type: "RESALE_PENDING", priority: "MEDIUM", title: "3 tin bán lại chờ duyệt", link: "/admin/market/resale", since: null, evidence: { count: 3, oldest_hours: 30 } }],
    });
    wrap(<AttentionFeed />);
    await screen.findByText("3 tin bán lại chờ duyệt");
    expect(screen.getByText("Không kiểm tra được: trạng thái dịch vụ")).toBeTruthy();
  });

  it("shows an error with a retry", async () => {
    getAttention.mockRejectedValueOnce(new Error("down"));
    wrap(<AttentionFeed />);
    await screen.findByText("Không tải được danh sách cần chú ý.");
    getAttention.mockResolvedValueOnce({ generated_at: "", items: [], sources: { events: "ok" } });
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await screen.findByText("Không có cảnh báo");
  });
});

describe("PinnedReports", () => {
  const pin = (id: string, chart = "bar") => ({ pin_id: id, title: `Báo cáo ${id}`, question: "q", sql: "select 1", chart_type: chart, snapshot: [], created_at: "2026-11-01T00:00:00Z" });

  it("shows the empty state", async () => {
    getPins.mockResolvedValue({ pins: [], max: 12 });
    wrap(<PinnedReports />);
    await screen.findByText(/Chưa ghim báo cáo nào/);
  });

  it("shows live rows without a stale badge, and the 'data from <time>' badge when the query could not run again", async () => {
    getPins.mockResolvedValue({ pins: [pin("p1"), pin("p2", "table")], max: 12 });
    getPinData.mockImplementation(async (id: string) => id === "p1"
      ? { pin_id: "p1", title: "Báo cáo p1", chart_type: "bar", live: true, rows: [{ ten: "A", so: 10 }, { ten: "B", so: 5 }] }
      : { pin_id: "p2", title: "Báo cáo p2", chart_type: "table", live: false, snapshot_at: "2026-11-01T00:00:00Z", rows: [{ ten: "C", so: 7 }] });
    wrap(<PinnedReports />);
    const cards = await screen.findAllByTestId("pinned-report");
    await waitFor(() => expect(within(cards[0]).getByTestId("pin-bars")).toBeTruthy());
    expect(within(cards[0]).queryByTestId("pin-stale")).toBeNull();
    await waitFor(() => expect(within(cards[1]).getByTestId("pin-stale").textContent).toMatch(/^Dữ liệu lúc /));
    expect(within(cards[1]).getByTestId("pin-table")).toBeTruthy();
  });

  it("unpins a report and keeps the others; a failed delete keeps it and tells the admin", async () => {
    getPins.mockResolvedValue({ pins: [pin("p1"), pin("p2")], max: 12 });
    getPinData.mockResolvedValue({ pin_id: "x", title: "t", chart_type: "table", live: true, rows: [] });
    deletePin.mockRejectedValueOnce(new Error("nope")).mockResolvedValueOnce(undefined);
    wrap(<PinnedReports />);
    await screen.findByRole("button", { name: "Bỏ ghim: Báo cáo p1" });

    fireEvent.click(screen.getByRole("button", { name: "Bỏ ghim: Báo cáo p1" }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Không bỏ ghim được. Vui lòng thử lại."));
    expect(screen.getByRole("button", { name: "Bỏ ghim: Báo cáo p1" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Bỏ ghim: Báo cáo p1" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Bỏ ghim: Báo cáo p1" })).toBeNull());
    expect(deletePin).toHaveBeenCalledWith("p1");
    expect(screen.getByRole("button", { name: "Bỏ ghim: Báo cáo p2" })).toBeTruthy();
  });

  it("shows an error with a retry for the list and for one report's data", async () => {
    getPins.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce({ pins: [pin("p1")], max: 12 });
    getPinData.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce({ pin_id: "p1", title: "t", chart_type: "table", live: true, rows: [{ a: 1 }] });
    wrap(<PinnedReports />);
    await screen.findByText("Không tải được báo cáo đã ghim.");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await screen.findByText("Không tải được số liệu của báo cáo này.");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await screen.findByTestId("pin-table");
  });
});
