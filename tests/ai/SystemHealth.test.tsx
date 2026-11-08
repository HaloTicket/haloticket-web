// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const getSystemHealth = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("@/services/aiApi", () => ({
  aiApi: {
    getSystemHealth: (...a: unknown[]) => getSystemHealth(...a),
  },
}));
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a), info: vi.fn() } }));
vi.mock("@/features/admin/monitoring/AdminAuditLogs", () => ({ AdminAuditLogs: () => <div data-testid="audit-logs" /> }));
vi.mock("@/features/admin/monitoring/SslCertificateCard", () => ({ SslCertificateCard: () => <div data-testid="ssl-card" /> }));
vi.mock("@/features/admin/monitoring/UptimeMonitorSection", () => ({ UptimeMonitorSection: () => <div data-testid="uptime" /> }));
vi.mock("@/features/admin/monitoring/AlertConfigModal", () => ({ AlertConfigModal: () => null }));

import "@/i18n";
import { SystemHealth } from "@/features/admin/SystemHealth";

const service = (over: Record<string, unknown> = {}) => ({
  name: "Real Gateway", port: 8888, type: "Spring Cloud Gateway", status: "UP",
  uptime: null, latencyMs: 12, memoryUsage: null, cpuLoad: null, ...over,
});

beforeEach(() => {
  getSystemHealth.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
});
afterEach(() => cleanup());

describe("SystemHealth", () => {
  it("shows an error with a retry instead of made-up services when the request fails", async () => {
    getSystemHealth.mockRejectedValue({ response: { status: 500, data: {} } });
    render(<SystemHealth />);
    const alert = await screen.findByText("Không tải được trạng thái hệ thống từ máy chủ.");
    expect(alert).toBeTruthy();
    expect(screen.queryByText("API Gateway")).toBeNull();
    expect(screen.queryByText("AI Assistant & RAG")).toBeNull();
    expect(screen.queryByTestId("uptime")).toBeNull();

    getSystemHealth.mockResolvedValue([service()]);
    fireEvent.click(screen.getAllByRole("button", { name: "Thử lại" })[0]);
    await screen.findByText("Real Gateway");
  });

  it("shows an empty state, not 0/0 as success, when no service is reported", async () => {
    getSystemHealth.mockResolvedValue([]);
    render(<SystemHealth />);
    await screen.findByText("Máy chủ chưa báo cáo dịch vụ nào.");
    expect(screen.queryByText("0 / 0", { selector: "p" })).toBeNull();
    expect(screen.queryByText("Tất cả dịch vụ đang hoạt động")).toBeNull();
  });

  it("renders only what the backend returned and 'Không có dữ liệu' for null fields", async () => {
    getSystemHealth.mockResolvedValue([service(), service({ name: "Mystery", status: "UNKNOWN", port: null, latencyMs: null })]);
    render(<SystemHealth />);
    await screen.findByText("Real Gateway");
    expect(screen.getByText("Mystery")).toBeTruthy();
    expect(screen.queryByText("User & Auth Service")).toBeNull();
    // RAM / CPU null on both cards, latency + port null on the second
    expect(screen.getAllByText("Không có dữ liệu").length).toBeGreaterThanOrEqual(5);
    expect(screen.queryByText("null")).toBeNull();
    expect(screen.queryByText("nullms")).toBeNull();
    expect(screen.getByText("1 / 2")).toBeTruthy();
    expect(screen.queryByText("Tất cả dịch vụ đang hoạt động")).toBeNull();
  });

  it("reports the real result of 'Kiểm tra ngay' with the right toast", async () => {
    getSystemHealth.mockResolvedValueOnce([service()]);
    render(<SystemHealth />);
    await screen.findByText("Real Gateway");

    getSystemHealth.mockResolvedValueOnce([service()]);
    fireEvent.click(screen.getByRole("button", { name: /Kiểm tra ngay/ }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(1));
    expect(toastError).not.toHaveBeenCalled();

    getSystemHealth.mockRejectedValueOnce(new Error("Network Error"));
    fireEvent.click(screen.getByRole("button", { name: /Kiểm tra ngay/ }));
    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(toastSuccess).toHaveBeenCalledTimes(1);
  });
});
