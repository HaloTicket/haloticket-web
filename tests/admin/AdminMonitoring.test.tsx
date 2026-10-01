// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminAuditLogs } from "@/features/admin/monitoring/AdminAuditLogs";
import { SystemHealth } from "@/features/admin/SystemHealth";
import { aiApi } from "@/services/aiApi";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "vi" } }),
}));

vi.mock("@/services/aiApi", () => ({
  aiApi: {
    getSystemLogs: vi.fn(),
    getSystemHealth: vi.fn(),
    getAnomalyDetection: vi.fn(),
  },
}));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminAuditLogs", () => {
  const mockLogs = [
    {
      id: "LOG-1001",
      time: "2026-10-02 02:00:00",
      service: "API Gateway",
      event: "Routed auth request",
      status: "HEALTHY",
      ipAddress: "192.168.1.1",
      operator: "system_gateway",
    },
    {
      id: "LOG-1002",
      time: "2026-10-02 02:01:00",
      service: "Booking Service",
      event: "High load warning on booking queue",
      status: "WARN",
      ipAddress: "192.168.1.2",
      operator: "worker_1",
    },
  ];

  it("renders audit logs table with loaded logs and stat cards", async () => {
    vi.mocked(aiApi.getSystemLogs).mockResolvedValue(mockLogs);

    render(
      <MemoryRouter>
        <AdminAuditLogs />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("LOG-1001")).toBeInTheDocument();
      expect(screen.getByText("LOG-1002")).toBeInTheDocument();
    });

    expect(screen.getByText("Routed auth request")).toBeInTheDocument();
    expect(screen.getByText("High load warning on booking queue")).toBeInTheDocument();
  });

  it("filters logs by search query and opens detail modal on click", async () => {
    vi.mocked(aiApi.getSystemLogs).mockResolvedValue(mockLogs);

    render(
      <MemoryRouter>
        <AdminAuditLogs />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("LOG-1001")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm theo mã log/i);
    await userEvent.type(searchInput, "LOG-1002");

    expect(screen.queryByText("LOG-1001")).not.toBeInTheDocument();
    expect(screen.getByText("LOG-1002")).toBeInTheDocument();

    // Click on row to open modal
    fireEvent.click(screen.getByText("LOG-1002"));

    await waitFor(() => {
      expect(screen.getByText("Chi tiết bản ghi kiểm toán")).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    expect(screen.queryByText("Chi tiết bản ghi kiểm toán")).not.toBeInTheDocument();
  });
});

describe("SystemHealth Monitoring", () => {
  it("renders microservice monitoring cards and anomaly scanner", async () => {
    vi.mocked(aiApi.getSystemHealth).mockResolvedValue([
      {
        name: "API Gateway",
        port: 8080,
        type: "Spring Cloud Gateway",
        status: "UP",
        uptime: "99.98%",
        latencyMs: 15,
        memoryUsage: "340 MB",
        cpuLoad: "2.1%",
      },
    ]);

    render(
      <MemoryRouter>
        <SystemHealth />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("API Gateway")).toBeInTheDocument();
    });

    expect(screen.getByText("Trợ lý AI Giám sát Bất thường (Anomaly Detection)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Quét Logs bằng AI/i })).toBeInTheDocument();
  });
});
