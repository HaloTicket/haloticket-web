// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const getSystemLogs = vi.fn();
const getSslStatus = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("@/services/aiApi", () => ({
  aiApi: {
    getSystemLogs: (...a: unknown[]) => getSystemLogs(...a),
    getSslStatus: (...a: unknown[]) => getSslStatus(...a),
  },
}));
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a), info: vi.fn() } }));

import "@/i18n";
import { AdminAuditLogs } from "@/features/admin/monitoring/AdminAuditLogs";
import { SslCertificateCard } from "@/features/admin/monitoring/SslCertificateCard";

const entry = (over: Record<string, unknown> = {}) => ({
  id: "log-1", time: "2026-11-07 10:00:00", service: "ai-assistant", event: "Provider failed", status: "ERROR",
  details: "stack", operator: null, ipAddress: null, endpoint: null, ...over,
});

beforeEach(() => {
  getSystemLogs.mockReset();
  getSslStatus.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
});
afterEach(() => cleanup());

describe("AdminAuditLogs", () => {
  it("shows the source status instead of an empty list when the log source is unavailable", async () => {
    getSystemLogs.mockResolvedValue({ entries: [], source: { status: "unavailable" } });
    render(<AdminAuditLogs />);
    await waitFor(() => expect(screen.getAllByText("Nguồn log không khả dụng").length).toBeGreaterThan(0));
    expect(screen.queryByText("Không tìm thấy nhật ký phù hợp")).toBeNull();
  });

  it("says there are no logs yet when the source is empty", async () => {
    getSystemLogs.mockResolvedValue({ entries: [], source: { status: "empty" } });
    render(<AdminAuditLogs />);
    await waitFor(() => expect(screen.getAllByText("Chưa có log").length).toBeGreaterThan(0));
  });

  it("does not fabricate operator, IP or endpoint values", async () => {
    getSystemLogs.mockResolvedValue({ entries: [entry()], source: { status: "ok" } });
    const { container } = render(<AdminAuditLogs />);
    await screen.findByText("Provider failed");
    const text = container.textContent ?? "";
    expect(text).not.toContain("127.0.0.1");
    expect(text).not.toContain("/api/v1/event");
    expect(text).not.toContain("system"); // the old fabricated operator
    expect(screen.queryByText("Endpoint")).toBeNull();
    expect(screen.queryByText("Người thực hiện")).toBeNull();

    // details modal shows '-' for the missing values
    fireEvent.click(screen.getByText("Provider failed"));
    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(2);
  });

  it("uses stable ids so repeated polls do not duplicate rows, and shows operator when provided", async () => {
    getSystemLogs.mockResolvedValue({ entries: [entry({ id: "", operator: "admin@x.com" })], source: { status: "ok" } });
    render(<AdminAuditLogs />);
    await screen.findByText("admin@x.com");
    getSystemLogs.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /Làm mới/ }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(screen.getAllByText("Provider failed")).toHaveLength(1);
  });

  it("shows a refresh error with retry, keeps existing rows, and reports failure honestly", async () => {
    getSystemLogs.mockResolvedValueOnce({ entries: [entry()], source: { status: "ok" } });
    render(<AdminAuditLogs />);
    await screen.findByText("Provider failed");

    getSystemLogs.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    fireEvent.click(screen.getByRole("button", { name: /Làm mới/ }));
    await screen.findByText("Không tải được nhật ký từ máy chủ.");
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(screen.getByText("Provider failed")).toBeTruthy();

    getSystemLogs.mockResolvedValueOnce({ entries: [entry()], source: { status: "ok" } });
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(screen.queryByText("Không tải được nhật ký từ máy chủ.")).toBeNull());
  });
});

describe("SslCertificateCard", () => {
  it("shows a real error with retry and no fabricated certificate when the request fails", async () => {
    getSslStatus.mockRejectedValueOnce({ response: { status: 503, data: {} } });
    const { container } = render(<SslCertificateCard />);
    await screen.findByText("Không lấy được trạng thái chứng chỉ SSL/TLS từ máy chủ.", { selector: "span" });
    const text = container.textContent ?? "";
    expect(text).not.toContain("58");
    expect(text).not.toContain("Browser Trusted CA");
    expect(text).not.toContain("HỢP LỆ");
    expect(screen.getByText("KHÔNG KIỂM TRA ĐƯỢC")).toBeTruthy();

    getSslStatus.mockResolvedValueOnce({
      has_ssl: true, status: "ACTIVE_VALID", domain: "halo.example", port: 443, protocol: "TLSv1.3",
      issuer: "Let's Encrypt", remaining_days: 42, expire_date: "2027-01-01", message: "ok",
    });
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await screen.findByText("42 ngày còn lại");
    expect(screen.getByText("HỢP LỆ (SECURE HTTPS)")).toBeTruthy();
  });

  it("shows an expired certificate as expired", async () => {
    getSslStatus.mockResolvedValueOnce({
      has_ssl: true, status: "EXPIRED", domain: "halo.example", port: 443, protocol: "TLSv1.3",
      issuer: "CA", remaining_days: -3, expire_date: "2026-11-04", message: "expired",
    });
    render(<SslCertificateCard />);
    await screen.findByText("ĐÃ HẾT HẠN");
    expect(screen.queryByText("HỢP LỆ (SECURE HTTPS)")).toBeNull();
  });
});
