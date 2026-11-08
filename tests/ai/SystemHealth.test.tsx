// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const getSystemHealth = vi.fn();
const getAiHealth = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("@/services/aiApi", () => ({
  aiApi: {
    getSystemHealth: (...a: unknown[]) => getSystemHealth(...a),
    getAiHealth: (...a: unknown[]) => getAiHealth(...a),
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
const providers = {
  providers: [
    { name: "groq", configured: true, status: "ok", last_ok_at: "2026-11-07T10:00:00Z", last_error_code: null, ok_count: 5, fail_count: 1 },
    { name: "openai", configured: false, status: "unknown", last_ok_at: null, last_error_code: null, ok_count: 0, fail_count: 0 },
    { name: "gemini", configured: true, status: "down", last_ok_at: null, last_error_code: "AI_UNAVAILABLE", ok_count: 0, fail_count: 3 },
  ],
  probe: null,
};

beforeEach(() => {
  getSystemHealth.mockReset();
  getAiHealth.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
  getAiHealth.mockResolvedValue(providers);
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

  it("shows the AI providers card with real status and the quick check result", async () => {
    getSystemHealth.mockResolvedValue([service()]);
    render(<SystemHealth />);
    const card = (await screen.findByRole("region", { name: "Nhà cung cấp AI" })) as HTMLElement;
    await within(card).findByText("groq");
    expect(within(card).getByText("Ổn định")).toBeTruthy();
    expect(within(card).getByText("Chưa cấu hình")).toBeTruthy();
    expect(within(card).getByText("Ngừng hoạt động")).toBeTruthy();
    expect(within(card).getByText("AI_UNAVAILABLE")).toBeTruthy();

    getAiHealth.mockResolvedValueOnce({ ...providers, probe: { status: "ok", checked_at: "2026-11-07T10:05:00Z", provider: "groq" } });
    fireEvent.click(within(card).getByRole("button", { name: "Kiểm tra nhanh" }));
    await within(card).findByText(/Kiểm tra nhanh thành công/);
    expect(getAiHealth).toHaveBeenLastCalledWith(true);
  });

  it("shows an error and retry for the AI providers card, and a rate-limited quick check", async () => {
    getSystemHealth.mockResolvedValue([service()]);
    getAiHealth.mockRejectedValueOnce({ response: { status: 503, data: { code: "AI_UNAVAILABLE" } } });
    render(<SystemHealth />);
    const card = (await screen.findByRole("region", { name: "Nhà cung cấp AI" })) as HTMLElement;
    await within(card).findByText(/Không tải được trạng thái nhà cung cấp AI/);
    fireEvent.click(within(card).getByRole("button", { name: "Thử lại" }));
    await within(card).findByText("groq");

    getAiHealth.mockRejectedValueOnce({ response: { status: 429, data: { code: "AI_RATE_LIMITED" }, headers: { "retry-after": "20" } } });
    fireEvent.click(within(card).getByRole("button", { name: "Kiểm tra nhanh" }));
    await within(card).findByText(/20 giây/);
    expect(within(card).getByText("groq")).toBeTruthy();
  });
});
