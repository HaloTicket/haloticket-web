// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import AdminEventReports from "./AdminEventReports";
import AdminEventReportDetail from "./AdminEventReportDetail";
import { getAdminEventReports, getAllAdminEventReportRows, type AdminEventReport } from "@/services/adminReportsApi";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (value: string) => value, i18n: { resolvedLanguage: "vi" } }) }));
vi.mock("@/services/adminReportsApi", () => ({ getAdminEventReports: vi.fn(), getAllAdminEventReportRows: vi.fn() }));
function LocationSearch() { const location = useLocation(); return <output data-testid="route-search">{location.search}</output>; }
function response(title = "Summer show"): AdminEventReport {
  return { from: "2026-09-03", to: "2026-10-02", timezone: "Asia/Ho_Chi_Minh", generatedAt: "2026-10-02T01:00:00Z", completeness: "COMPLETE", warnings: [],
    summary: { revenue: 500, orders: 2, tickets: 3, eventsWithSales: 1 }, previous: { revenue: 0, orders: 0, tickets: 0, eventsWithSales: 0 },
    timeline: [], rows: [{ eventId: "event-1", title, organizer: "Org", category: "Music", status: "APPROVED", revenue: 500, orders: 2, tickets: 3 }],
    page: 2, size: 10, totalElements: 11, totalPages: 2, options: { categories: [], organizers: [], statuses: [] } };
}
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const from = "2026-09-03";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("admin event reports", () => {
  it("keeps URL filters when opening a report and offers a return URL with the same page", async () => {
    vi.mocked(getAdminEventReports).mockResolvedValue(response());
    render(<MemoryRouter initialEntries={[`/admin/events/reports?from=${from}&to=${today}&q=Summer&categoryId=cat&page=2&size=10&sort=orders`]}><Routes>
      <Route path="/admin/events/reports" element={<><AdminEventReports /><LocationSearch /></>} />
      <Route path="/admin/events/reports/:eventId" element={<><AdminEventReportDetail /><LocationSearch /></>} />
    </Routes></MemoryRouter>);
    const link = await screen.findByRole("link", { name: "Summer show" });
    fireEvent.click(link);
    await screen.findByText("Org");
    expect(screen.getByTestId("route-search").textContent).toContain(`q=Summer`);
    expect(screen.getByRole("link", { name: "Quay lại báo cáo" }).getAttribute("href")).toContain(`page=2`);
  });

  it("exports the entire active filter scope rather than the visible page", async () => {
    vi.mocked(getAdminEventReports).mockResolvedValue(response());
    vi.mocked(getAllAdminEventReportRows).mockResolvedValue({ ...response(), page: 1, size: 10000, totalElements: 11, rows: [...response().rows, { ...response().rows[0], eventId: "event-2", title: "Second show" }] });
    URL.createObjectURL = vi.fn(() => "blob:report");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<MemoryRouter initialEntries={[`/admin/events/reports?from=${from}&to=${today}&q=Summer&organizerId=org-1&page=2&size=10&sort=orders`]}><Routes><Route path="/admin/events/reports" element={<AdminEventReports />} /></Routes></MemoryRouter>);
    await screen.findByRole("link", { name: "Summer show" });
    fireEvent.click(screen.getByRole("button", { name: "Xuất báo cáo" }));
    fireEvent.click(screen.getByText("CSV"));
    await waitFor(() => expect(getAllAdminEventReportRows).toHaveBeenCalledWith(expect.objectContaining({ from, to: today, q: "Summer", organizerId: "org-1", sort: "orders" })));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it("discards a late response for the previous filter instead of showing stale rows", async () => {
    const pending: Array<(value: AdminEventReport) => void> = [];
    vi.mocked(getAdminEventReports).mockImplementation(() => new Promise(resolve => { pending.push(resolve); }));
    render(<MemoryRouter initialEntries={[`/admin/events/reports?from=${from}&to=${today}`]}><Routes><Route path="/admin/events/reports" element={<AdminEventReports />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(pending).toHaveLength(1));
    const search = screen.getByRole("textbox", { name: "Tìm sự kiện" });
    fireEvent.change(search, { target: { value: "new" } });
    await waitFor(() => expect(pending).toHaveLength(2));
    pending[1](response("New show"));
    expect(await screen.findByRole("link", { name: "New show" })).toBeTruthy();
    pending[0](response("Old show"));
    await waitFor(() => expect(screen.queryByRole("link", { name: "Old show" })).toBeNull());
    expect(screen.getByRole("link", { name: "New show" })).toBeTruthy();
  });

  it("explains a 422 source ceiling as an error instead of showing zero metrics", async () => {
    vi.mocked(getAdminEventReports).mockRejectedValue({ isAxiosError: true, response: { status: 422, data: {} } });
    render(<MemoryRouter initialEntries={[`/admin/events/reports?from=${from}&to=${today}`]}><Routes><Route path="/admin/events/reports" element={<AdminEventReports />} /></Routes></MemoryRouter>);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("100.000 giao dịch");
    expect(screen.queryByRole("link", { name: "Summer show" })).toBeNull();
  });

  it("lets an incomplete-data warning be dismissed for the current report scope", async () => {
    vi.mocked(getAdminEventReports).mockResolvedValue({ ...response(), completeness: "PARTIAL", warnings: ["Dữ liệu chưa đầy đủ; một số khoản thanh toán chưa được đối soát."] });
    render(<MemoryRouter initialEntries={[`/admin/events/reports?from=${from}&to=${today}`]}><Routes><Route path="/admin/events/reports" element={<AdminEventReports />} /></Routes></MemoryRouter>);
    expect(await screen.findByText("Dữ liệu chưa đầy đủ")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ẩn cảnh báo" }));
    expect(screen.queryByText("Dữ liệu chưa đầy đủ")).toBeNull();
  });

  it("shows PARTIAL warnings on event detail and lets the admin dismiss them", async () => {
    vi.mocked(getAdminEventReports).mockResolvedValue({ ...response(), completeness: "PARTIAL", warnings: ["Dữ liệu chưa đầy đủ; một số khoản thanh toán chưa được đối soát."] });
    render(<MemoryRouter initialEntries={[`/admin/events/reports/event-1?from=${from}&to=${today}`]}><Routes><Route path="/admin/events/reports/:eventId" element={<AdminEventReportDetail />} /></Routes></MemoryRouter>);
    expect(await screen.findByText("Dữ liệu chưa đầy đủ")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ẩn cảnh báo" }));
    expect(screen.queryByText("Dữ liệu chưa đầy đủ")).toBeNull();
  });
});
