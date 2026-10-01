import { beforeEach, describe, expect, it, vi } from "vitest";
import axiosClient from "@/services/axiosClient";
import { getAllAdminEventReportRows, type AdminEventReport } from "@/services/adminReportsApi";

vi.mock("@/services/axiosClient", () => ({ default: { get: vi.fn() } }));
const response: AdminEventReport = {
  from: "2026-09-01", to: "2026-09-30", timezone: "Asia/Ho_Chi_Minh", generatedAt: "2026-10-01T03:00:00Z",
  completeness: "COMPLETE", warnings: [], summary: { revenue: 0, orders: 0, tickets: 0, eventsWithSales: 0 },
  previous: { revenue: 0, orders: 0, tickets: 0, eventsWithSales: 0 }, timeline: [], rows: [], page: 1, size: 10000,
  totalElements: 0, totalPages: 0, options: { categories: [], organizers: [], statuses: [] },
};

describe("admin reports export request", () => {
  beforeEach(() => vi.clearAllMocks());
  it("asks for all filtered rows and preserves the complete filter scope", async () => {
    vi.mocked(axiosClient.get).mockResolvedValue(response as never);
    const filters = { from: response.from, to: response.to, q: "music", categoryId: "c1", organizerId: "o1", status: "APPROVED" as const, sort: "orders" as const, page: 4, size: 20 };
    await getAllAdminEventReportRows(filters);
    expect(axiosClient.get).toHaveBeenCalledWith("/events/admin/reports/export", {
      params: { from: filters.from, to: filters.to, q: filters.q, categoryId: filters.categoryId, organizerId: filters.organizerId, status: filters.status, sort: filters.sort }, signal: undefined,
    });
  });

  it("leaves server errors visible to the caller", async () => {
    const unavailable = new Error("report source unavailable");
    vi.mocked(axiosClient.get).mockRejectedValue(unavailable);
    await expect(getAllAdminEventReportRows({ from: response.from, to: response.to, sort: "revenue", page: 1, size: 10 })).rejects.toBe(unavailable);
  });
});
