// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const chatAdminAssistant = vi.fn();
const analyzeData = vi.fn();
const createPin = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
const adminHistory = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn(), create: vi.fn(), pin: vi.fn(), remove: vi.fn(), send: vi.fn() }));
vi.mock("@/services/adminChatApi", () => ({ adminChatApi: () => adminHistory }));
vi.mock("@/services/keycloakSession", () => ({
  getKeycloakSession: () => ({
    getCurrentToken: () => `x.${btoa(JSON.stringify({ sub: "admin-a", iss: "https://realm.test" }))}.x`,
  }),
}));

vi.mock("@/services/aiApi", () => ({
  aiApi: {
    chatAdminAssistant: (...a: unknown[]) => chatAdminAssistant(...a), analyzeData: (...a: unknown[]) => analyzeData(...a), createPin: (...a: unknown[]) => createPin(...a),
  },
}));
vi.mock("@/services/eventApi", () => ({ eventApi: { getApprovalEvents: vi.fn().mockResolvedValue([]) } }));
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a), info: vi.fn() } }));
vi.mock("recharts", () => {
  const Null = () => null;
  return { BarChart: Null, Bar: Null, XAxis: Null, YAxis: Null, CartesianGrid: Null, Tooltip: Null, ResponsiveContainer: Null, PieChart: Null, Pie: Null, Cell: Null, LineChart: Null, Line: Null, Legend: Null };
});

import "@/i18n";
import AdminAiAssistant from "@/features/admin/AdminAiAssistant";
import AdminAiChatWidget from "@/features/admin/AdminAiChatWidget";
import { AdminAiAnalytics } from "@/features/admin/AdminAiAnalytics";

beforeEach(() => {
  localStorage.clear();
  [chatAdminAssistant, analyzeData, createPin, toastSuccess, toastError].forEach((fn) => fn.mockReset());
  vi.spyOn(console, "error").mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function send(text: string) {
  fireEvent.change(screen.getByLabelText("Nhập tin nhắn cho trợ lý AI"), { target: { value: text } });
  fireEvent.submit(screen.getByLabelText("Nhập tin nhắn cho trợ lý AI").closest("form") as HTMLFormElement);
}

describe("AdminAiAssistant tools", () => {
  it("shows the shared launcher prompt on hover", () => {
    render(<MemoryRouter><AdminAiChatWidget /></MemoryRouter>);
    const launcher = screen.getByRole("button", { name: "Trợ lý AI quản trị" });
    expect(screen.queryByText("Trò chuyện cùng trợ lí AI")).toBeNull();
    fireEvent.mouseEnter(launcher);
    expect(screen.getByText("Trò chuyện cùng trợ lí AI")).toBeTruthy();
    fireEvent.mouseLeave(launcher);
    expect(screen.queryByText("Trò chuyện cùng trợ lí AI")).toBeNull();
  });

  it("opens a MongoDB conversation and starts a separate chat from the window header", async () => {
    const stored = { id: "admin-chat-1", title: "Báo cáo đã lưu", is_pinned: false, updated_at: "2026-11-27T00:00:00Z", created_at: "2026-11-27T00:00:00Z" };
    adminHistory.list.mockResolvedValue([stored]);
    adminHistory.get.mockResolvedValue({ ...stored, messages: [{ id: "msg", role: "assistant", content: "Kết quả đã lưu", created_at: stored.created_at, tools_used: ["get_kpis"] }] });
    render(<MemoryRouter><AdminAiAssistant owner="https://realm.test#admin" /></MemoryRouter>);
    await screen.findByText("Kết quả đã lưu");
    expect(screen.getByTestId("assistant-tools").textContent).toContain("số liệu tổng quan");
    fireEvent.click(screen.getByRole("button", { name: "Đoạn chat mới" }));
    expect(screen.queryByText("Kết quả đã lưu")).toBeNull();
    adminHistory.create.mockImplementation(async (id: string) => ({ ...stored, id }));
    adminHistory.send.mockResolvedValue({ reply: "Phản hồi mới", tools_used: [], grounded: true });
    await send("Kiểm tra trạng thái");
    await screen.findByText("Phản hồi mới");
    const id = adminHistory.create.mock.calls.at(-1)?.[0];
    expect(id).not.toBe(stored.id);
    expect(adminHistory.send).toHaveBeenCalledWith("Kiểm tra trạng thái", id, expect.any(String));
  });

  it("shows which read-only tools the answer used", async () => {
    chatAdminAssistant.mockResolvedValue({ reply: "Có 4 sự kiện chờ duyệt.", system_actions: [], tools_used: ["get_kpis", "list_pending_events", "get_kpis"], grounded: true });
    render(<MemoryRouter><AdminAiAssistant /></MemoryRouter>);
    await send("Hôm nay có gì?");
    await screen.findByText("Có 4 sự kiện chờ duyệt.");
    expect(screen.getByTestId("assistant-tools").textContent).toBe("Đã dùng: số liệu tổng quan, danh sách chờ duyệt");
    expect(screen.queryByTestId("assistant-ungrounded")).toBeNull();
  });

  it("shows a muted note when the numbers could not be matched to the tool data", async () => {
    chatAdminAssistant.mockResolvedValue({ reply: "Tôi không xác nhận được các con số.", system_actions: [], tools_used: ["get_kpis"], grounded: false });
    render(<MemoryRouter><AdminAiAssistant /></MemoryRouter>);
    await send("Doanh thu?");
    await screen.findByText("Tôi không xác nhận được các con số.");
    expect(screen.getByTestId("assistant-ungrounded").textContent).toContain("không đối chiếu được");
  });

  it("shows nothing extra when no tool was used (old response shape)", async () => {
    chatAdminAssistant.mockResolvedValue({ reply: "Xin chào!", system_actions: [] });
    render(<MemoryRouter><AdminAiAssistant /></MemoryRouter>);
    await send("Chào");
    await screen.findByText("Xin chào!");
    expect(screen.queryByTestId("assistant-tools")).toBeNull();
    expect(screen.queryByTestId("assistant-ungrounded")).toBeNull();
  });
});

describe("AdminAiAnalytics pin", () => {
  async function askAndGetPin() {
    analyzeData.mockResolvedValue({ reply: "Doanh thu cao nhất là A.", generated_sql: "SELECT title, revenue FROM v_x LIMIT 10", data: [{ title: "A", revenue: 100 }, { title: "B", revenue: 50 }, { title: "C", revenue: 20 }] });
    render(<MemoryRouter><AdminAiAnalytics /></MemoryRouter>);
    const input = screen.getAllByRole("textbox")[0];
    fireEvent.change(input, { target: { value: "Top sự kiện theo doanh thu" } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);
    return await screen.findByRole("button", { name: /Ghim Dashboard/ });
  }

  it("pins the question, the checked SQL, the chart type and a snapshot — not a fake toast", async () => {
    createPin.mockResolvedValue({ pin_id: "p1" });
    fireEvent.click(await askAndGetPin());
    await waitFor(() => expect(createPin).toHaveBeenCalledTimes(1));
    expect(createPin).toHaveBeenCalledWith({
      title: "Top sự kiện theo doanh thu", question: "Top sự kiện theo doanh thu", sql: "SELECT title, revenue FROM v_x LIMIT 10",
      chart_type: "pie", snapshot: [{ title: "A", revenue: 100 }, { title: "B", revenue: 50 }, { title: "C", revenue: 20 }],
    });
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Đã ghim báo cáo ra Dashboard."));
  });

  it("caps the snapshot at 50 rows", async () => {
    createPin.mockResolvedValue({ pin_id: "p1" });
    analyzeData.mockResolvedValue({ reply: "ok", generated_sql: "SELECT 1", data: Array.from({ length: 80 }, (_, i) => ({ title: `T${i}`, revenue: i })) });
    render(<MemoryRouter><AdminAiAnalytics /></MemoryRouter>);
    const input = screen.getAllByRole("textbox")[0];
    fireEvent.change(input, { target: { value: "nhiều dòng" } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);
    fireEvent.click(await screen.findByRole("button", { name: /Ghim Dashboard/ }));
    await waitFor(() => expect(createPin).toHaveBeenCalled());
    expect(createPin.mock.calls[0][0].snapshot).toHaveLength(50);
  });

  it("explains the pin limit and other failures instead of pretending it worked", async () => {
    createPin.mockRejectedValueOnce({ response: { status: 409, data: { detail: { code: "PIN_LIMIT", message: "raw" } } } });
    fireEvent.click(await askAndGetPin());
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Bạn đã ghim tối đa số báo cáo cho phép. Hãy bỏ ghim một báo cáo trước.", undefined));
    expect(toastSuccess).not.toHaveBeenCalled();

    createPin.mockRejectedValueOnce({ response: { status: 503, data: { code: "AI_DB_NOT_CONFIGURED" } } });
    fireEvent.click(screen.getByRole("button", { name: /Ghim Dashboard/ }));
    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(2));
    expect(toastError.mock.calls[1][0]).toBe("Không ghim được báo cáo.");
  });
});
