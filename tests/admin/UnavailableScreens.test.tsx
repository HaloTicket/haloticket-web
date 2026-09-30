// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { AdminDashboard } from "@/features/admin/AdminDashboard";
import { CategoryConfig } from "@/features/admin/CategoryConfig";
import { EkycApproval } from "@/features/admin/EkycApproval";
import { HomepageConfig } from "@/features/admin/HomepageConfig";
import { PaymentMonitoring } from "@/features/admin/PaymentMonitoring";
import { ResaleManagement } from "@/features/admin/ResaleManagement";
import { SystemHealth } from "@/features/admin/SystemHealth";
import { UserManagement } from "@/features/admin/UserManagement";
import { eventApi } from "@/services/eventApi";
import { venueApi } from "@/services/venueApi";

vi.mock("@/services/eventApi", () => ({ eventApi: { getApprovalEvents: vi.fn() } }));
vi.mock("@/services/venueApi", () => ({ venueApi: { getAdminVenues: vi.fn() } }));

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("admin screens without management APIs", () => {
  it.each([
    ["eKYC", EkycApproval],
    ["users", UserManagement],
    ["resale", ResaleManagement],
    ["homepage", HomepageConfig],
    ["categories", CategoryConfig],
    ["payments", PaymentMonitoring],
    ["health", SystemHealth],
  ])("%s shows the unavailable contract and disables mutations", (_, Screen) => {
    const { container } = render(<Screen />);
    expect(screen.getAllByRole("status").some((status) => /(?:chưa tích hợp API quản trị|admin api integration is unavailable)/i.test(status.textContent || ""))).toBe(true);
    expect(screen.getAllByRole("button").every((button) => button.hasAttribute("disabled"))).toBe(true);
    expect(container).not.toHaveTextContent(/thành công|99\.9%|8\/8 dịch vụ/i);
    expect(container.querySelector("tbody tr:not(:has(td[colspan]))")).toBeNull();
  });
});

describe("admin dashboard", () => {
  it("uses the actual pending queue and venue count while leaving unsupported metrics unavailable", async () => {
    vi.mocked(eventApi.getApprovalEvents).mockResolvedValue([
      { id: "EV_A", title: "Sự kiện thật", organizerName: "Ban tổ chức A" },
      { id: "EV_B", title: "Sự kiện thứ hai" },
      { id: "EV_C", title: "Đã duyệt", eventApprovalStatus: "APPROVED" },
    ]);
    vi.mocked(venueApi.getAdminVenues).mockResolvedValue([
      { id: 1, name: "Địa điểm thật" },
    ] as Awaited<ReturnType<typeof venueApi.getAdminVenues>>);
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    expect(eventApi.getApprovalEvents).toHaveBeenCalledWith("PENDING");
    await waitFor(() => expect(screen.getByText("Sự kiện thật")).toBeInTheDocument());
    expect(within(screen.getByRole("group", { name: "Sự kiện chờ duyệt" })).getByText("2")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Tổng địa điểm" })).getByText("1")).toBeInTheDocument();
    expect(screen.getAllByText("Chưa có dữ liệu")).toHaveLength(2);
    expect(screen.queryByText("Đã duyệt")).not.toBeInTheDocument();
    expect(screen.queryByText(/Sky Tour|99\.9%|8\/8|Max \+20%/i)).not.toBeInTheDocument();
  });

  it("does not turn a failed request into a zero count or fake rows", async () => {
    vi.mocked(eventApi.getApprovalEvents).mockRejectedValue(new Error("offline"));
    vi.mocked(venueApi.getAdminVenues).mockResolvedValue([]);
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(within(screen.getByRole("group", { name: "Sự kiện chờ duyệt" })).queryByText("0")).not.toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Tổng địa điểm" })).getByText("0")).toBeInTheDocument();
    expect(screen.queryByText("Sự kiện thật")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(eventApi.getApprovalEvents).toHaveBeenCalledTimes(2);
  });

  it("keeps the last verified data visible while refreshing", async () => {
    vi.mocked(eventApi.getApprovalEvents).mockResolvedValueOnce([{ id: "EV_A", title: "Sự kiện thật" }]);
    vi.mocked(venueApi.getAdminVenues).mockResolvedValueOnce([]);
    vi.mocked(eventApi.getApprovalEvents).mockReturnValueOnce(new Promise(() => {}));
    vi.mocked(venueApi.getAdminVenues).mockReturnValueOnce(new Promise(() => {}));
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("Sự kiện thật")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Làm mới" }));
    expect(screen.getByText("Sự kiện thật")).toBeInTheDocument();
    expect(screen.getAllByText("Đang cập nhật dữ liệu…").length).toBeGreaterThan(0);
  });
});
