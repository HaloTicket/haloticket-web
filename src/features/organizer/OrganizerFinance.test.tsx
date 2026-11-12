// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import OrganizerFinance from "./OrganizerFinance";
import { payoutApi } from "@/services/payoutApi";
import { organizerApi } from "@/services/organizerApi";
import { downloadOrganizerFinanceWorkbook } from "./finance/organizerFinanceExport";

vi.mock("./finance/organizerFinanceExport", () => ({ downloadOrganizerFinanceWorkbook: vi.fn().mockResolvedValue(undefined) }));

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (value: string) => value }) }));
vi.mock("@/services/payoutApi", () => ({ payoutApi: {
  getOrganizerSummary: vi.fn(), getOrganizerAnalytics: vi.fn(), getOrganizerEvents: vi.fn(), getOrganizerPayouts: vi.fn(), getEligibleEvents: vi.fn(),
  getPayoutQuote: vi.fn(), requestPayout: vi.fn(), lookupPayoutByKey: vi.fn(),
} }));
vi.mock("@/services/organizerApi", () => ({ organizerApi: { getPayoutAccountFromServer: vi.fn() } }));

const event = {
  eventId: "event-1", eventName: "Spring festival", grossAmount: "1000000", deductions: "50000", paidAmount: "0",
  heldAmount: "0", availableAmount: "950000", settlementStatus: "SETTLED", eligible: true, reasonCodes: [],
};
const quote = {
  quoteId: "quote-1", eventId: "event-1", type: "FINAL_SETTLEMENT", expiresAt: "2099-01-01T00:00:00Z", accountVersion: "v1", grossAmount: "1000000",
  deductions: "50000", availableAmount: "950000", payoutFee: "0", expectedTransferAmount: "950000", eligible: true,
  reasonCodes: [], maximumAmount: "285000", requestType: "FINAL_SETTLEMENT", processingTime: "Theo chính sách",
};

function setup(initialEntry = "/organizer/finance") {
  vi.mocked(payoutApi.getOrganizerSummary).mockResolvedValue({ collectedRevenue: "1000000", availableAmount: "950000", processingAmount: "0", paidAmount: "0", updatedAt: "2026-10-30T00:00:00Z" });
  vi.mocked(payoutApi.getOrganizerAnalytics).mockResolvedValue({ from: "", to: "", series: [{ date: "2026-10-30", grossAmount: "1000000", refundAmount: "0" }], refundDataAvailable: true });
  vi.mocked(payoutApi.getOrganizerEvents).mockResolvedValue({ content: [event], page: 0, size: 100, totalElements: 1, totalPages: 1 });
  vi.mocked(payoutApi.getOrganizerPayouts).mockResolvedValue([]);
  vi.mocked(payoutApi.getEligibleEvents).mockResolvedValue([event]);
  vi.mocked(payoutApi.getPayoutQuote).mockResolvedValue(quote as never);
  vi.mocked(organizerApi.getPayoutAccountFromServer).mockResolvedValue({ bankName: "Bank", accountNumberMasked: "••1234", accountHolder: "Holder", verified: true, version: "v1" });
  vi.mocked(payoutApi.requestPayout).mockResolvedValue({ id: "payout-1", eventId: "event-1", organizerUserId: "user-1", grossAmount: 1000000, platformFee: 50000, netAmount: 285000, status: "PENDING", createdAt: "2026-10-30T00:00:00Z", updatedAt: "2026-10-30T00:00:00Z" });
  return render(<MemoryRouter initialEntries={[initialEntry]}><OrganizerFinance /></MemoryRouter>);
}

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("organizer withdrawal request", () => {
  it("filters organizer history using six status groups", async () => {
    setup("/organizer/finance?tab=history&from=2026-10-01&to=2026-10-31");
    vi.mocked(payoutApi.getOrganizerPayouts).mockResolvedValue([
      { id: "approved-id", eventName: "Approved event", status: "APPROVED", createdAt: "2026-10-30T00:00:00Z" },
      { id: "failed-id", eventName: "Failed event", status: "FAILED", createdAt: "2026-10-30T00:00:00Z" },
      { id: "pending-id", eventName: "Pending event", status: "PENDING", createdAt: "2026-10-30T00:00:00Z" },
    ] as never);
    await screen.findByText("Approved event");
    const select = screen.getByRole("combobox", { name: "Lọc trạng thái yêu cầu" });
    expect(select.querySelectorAll("option")).toHaveLength(7);
    fireEvent.change(select, { target: { value: "PROCESSING" } });
    expect(screen.getByText("Approved event")).toBeTruthy();
    expect(screen.getByText("Failed event")).toBeTruthy();
    expect(screen.queryByText("Pending event")).toBeNull();
    fireEvent.change(select, { target: { value: "PENDING" } });
    expect(screen.getByText("Pending event")).toBeTruthy();
    expect(screen.queryByText("Approved event")).toBeNull();
  });

  it("blocks export immediately when report filters change and keeps it blocked on a load error", async () => {
    setup("/organizer/finance?reportFrom=2026-10-01&reportTo=2026-10-31");
    await screen.findByRole("button", { name: "Rút tiền" });
    await userEvent.click(screen.getByRole("button", { name: "Xuất Excel" }));
    const preview = within(await screen.findByRole("dialog"));
    await waitFor(() => expect((preview.getByRole("button", { name: "Xuất Excel" }) as HTMLButtonElement).disabled).toBe(false));
    vi.mocked(payoutApi.getOrganizerAnalytics).mockRejectedValueOnce(new Error("Không tải được bảng kê"));
    fireEvent.change(preview.getByRole("combobox", { name: "Sự kiện" }), { target: { value: "event-1" } });
    expect((preview.getByRole("button", { name: "Xuất Excel" }) as HTMLButtonElement).disabled).toBe(true);
    expect(await preview.findByRole("alert")).not.toBeNull();
    expect((preview.getByRole("button", { name: "Xuất Excel" }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(preview.getByRole("button", { name: "Xuất Excel" }));
    expect(downloadOrganizerFinanceWorkbook).not.toHaveBeenCalled();
  });
  it("previews lazily, exports only the filtered preview, and restores filters and focus after closing", async () => {
    setup("/organizer/finance?reportFrom=2026-10-01&reportTo=2026-10-31");
    await screen.findByRole("button", { name: "Rút tiền" });
    expect(vi.mocked(payoutApi.getOrganizerAnalytics).mock.calls.every(call => call.length === 2)).toBe(true);
    expect(screen.queryByRole("dialog")).toBeNull();
    const trigger = screen.getByRole("button", { name: "Xuất Excel" });
    await userEvent.click(trigger);
    const preview = within(await screen.findByRole("dialog", { name: "Xem trước báo cáo tài chính" }));
    await waitFor(() => expect(payoutApi.getOrganizerAnalytics).toHaveBeenCalledWith("2026-10-01", "2026-10-31", undefined));
    expect(downloadOrganizerFinanceWorkbook).not.toHaveBeenCalled();
    expect(preview.getAllByLabelText("Từ ngày")).toHaveLength(1);
    expect(preview.getAllByRole("button", { name: "Xuất Excel" })).toHaveLength(1);
    fireEvent.change(preview.getByRole("combobox", { name: "Loại báo cáo" }), { target: { value: "settlements" } });
    fireEvent.change(preview.getByRole("combobox", { name: "Sự kiện" }), { target: { value: "event-1" } });
    fireEvent.change(preview.getByLabelText("Từ ngày"), { target: { value: "2026-10-02" } });
    await waitFor(() => expect(payoutApi.getOrganizerAnalytics).toHaveBeenCalledWith("2026-10-02", "2026-10-31", "event-1"));
    await waitFor(() => expect((preview.getByRole("button", { name: "Xuất Excel" }) as HTMLButtonElement).disabled).toBe(false));
    expect(preview.getByRole("table").textContent).toContain("Spring festival");
    await userEvent.click(preview.getByRole("button", { name: "Xuất Excel" }));
    await waitFor(() => expect(downloadOrganizerFinanceWorkbook).toHaveBeenCalledTimes(1));
    const [sheets, filename] = vi.mocked(downloadOrganizerFinanceWorkbook).mock.calls[0];
    expect(sheets[0].records).toHaveLength(2);
    expect(sheets[0].records[0]).toMatchObject({ eventId: "event-1", eventName: "Spring festival", grossAmount: 1000000n });
    expect(sheets[0].records[1]).toMatchObject({ eventName: "Tổng cộng", grossAmount: 1000000n });
    expect(filename).toBe("Bao_cao_settlements_2026-10-02_2026-10-31.xlsx");
    await userEvent.click(preview.getByRole("button", { name: "Đóng" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
    await userEvent.click(trigger);
    const reopened = within(await screen.findByRole("dialog"));
    expect((reopened.getByRole("combobox", { name: "Loại báo cáo" }) as HTMLSelectElement).value).toBe("settlements");
    expect((reopened.getByLabelText("Từ ngày") as HTMLInputElement).value).toBe("2026-10-02");
    expect((reopened.getByRole("combobox", { name: "Sự kiện" }) as HTMLSelectElement).value).toBe("event-1");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
    expect(downloadOrganizerFinanceWorkbook).toHaveBeenCalledTimes(1);
    expect(payoutApi.requestPayout).not.toHaveBeenCalled();
    expect(document.querySelector("details")).toBeNull();
  });
  it("maps the legacy reports link to overview, opens the preview, and scopes only report analytics", async () => {
    setup("/organizer/finance?tab=reports&reportEvent=event-1");
    await waitFor(() => expect(payoutApi.getOrganizerAnalytics).toHaveBeenCalledWith(expect.any(String), expect.any(String), "event-1"));
    expect(screen.getByRole("dialog", { name: "Xem trước báo cáo tài chính" })).not.toBeNull();
    expect(document.getElementById("finance-tab-overview")?.getAttribute("aria-selected")).toBe("true");
    expect(within(screen.getByRole("tablist", { name: "Doanh thu và rút tiền", hidden: true })).getAllByRole("tab", { hidden: true })).toHaveLength(2);
    expect(screen.getByRole("combobox", { name: "Loại báo cáo" })).not.toBeNull();
    expect(vi.mocked(payoutApi.getOrganizerAnalytics).mock.calls.some(call => call.length === 2)).toBe(true);
  });
  it("defaults to the overview and keeps history free of overview metrics and charts", async () => {
    setup();
    expect(await screen.findByRole("region", { name: "Tổng quan tài chính" })).not.toBeNull();
    expect(screen.getByRole("region", { name: "Biểu đồ doanh thu và dòng tiền" })).not.toBeNull();

    await userEvent.click(screen.getByRole("tab", { name: "Lịch sử rút tiền" }));
    expect(screen.getByRole("heading", { name: "Doanh thu & Rút tiền" })).not.toBeNull();
    expect(screen.getByRole("tab", { name: "Lịch sử rút tiền" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByRole("region", { name: "Tổng quan tài chính" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Biểu đồ doanh thu và dòng tiền" })).toBeNull();
    expect(screen.getByRole("combobox", { name: "Lọc trạng thái yêu cầu" })).not.toBeNull();
    expect(screen.getByLabelText("Từ ngày")).not.toBeNull();
  });

  it("requests payment occurrence analytics when the overview date range changes", async () => {
    setup("/organizer/finance?tab=overview&period=custom&from=2026-10-01&to=2026-10-07");
    await screen.findByRole("region", { name: "Tổng quan tài chính" });
    fireEvent.change(screen.getAllByLabelText("Từ ngày")[0], { target: { value: "2026-10-02" } });
    await waitFor(() => expect(payoutApi.getOrganizerAnalytics).toHaveBeenCalledWith("2026-10-02", "2026-10-07"));
  });

  it("defaults overview analytics to a complete seven-day range with in-chart period controls", async () => {
    setup("/organizer/finance");
    await waitFor(() => expect(payoutApi.getOrganizerAnalytics).toHaveBeenCalled());
    const [from, to] = vi.mocked(payoutApi.getOrganizerAnalytics).mock.calls[0];
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect((Date.parse(to) - Date.parse(from)) / 86400000).toBe(6);
    expect(screen.getByRole("button", { name: /Theo ngày/ })).not.toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector("details")).toBeNull();
  });

  it("switches chart controls between month, year, and custom ranges", async () => {
    setup("/organizer/finance?period=recent&from=2026-10-24&to=2026-10-30");
    await screen.findByRole("region", { name: "Biểu đồ doanh thu và dòng tiền" });
    const periodMenu = async () => userEvent.click(screen.getByRole("button", { name: /Theo ngày|Theo tháng|Theo năm|Tùy chọn thời gian/ }));

    await periodMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Theo tháng" }));
    expect((await screen.findByLabelText("Tháng doanh thu") as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}$/);
    fireEvent.change(screen.getByLabelText("Tháng doanh thu"), { target: { value: "2026-09" } });
    await waitFor(() => expect(payoutApi.getOrganizerAnalytics).toHaveBeenLastCalledWith("2026-09-01", "2026-09-30"));

    await periodMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Theo năm" }));
    expect(await screen.findByLabelText("Năm doanh thu")).not.toBeNull();
    fireEvent.change(screen.getByLabelText("Năm doanh thu"), { target: { value: "2025" } });
    await waitFor(() => expect(payoutApi.getOrganizerAnalytics).toHaveBeenLastCalledWith("2025-01-01", "2025-12-31"));

    await periodMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Tùy chọn thời gian" }));
    fireEvent.change(screen.getAllByLabelText("Từ ngày")[0], { target: { value: "2025-03-01" } });
    await waitFor(() => expect(payoutApi.getOrganizerAnalytics).toHaveBeenLastCalledWith("2025-03-01", "2025-12-31"));
  });

  it("defaults the report preview to a complete 30-day range", async () => {
    setup("/organizer/finance?tab=reports");
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Loại báo cáo" })).not.toBeNull());
    const from = (screen.getAllByLabelText("Từ ngày")[0] as HTMLInputElement).value;
    const to = (screen.getAllByLabelText("Đến ngày")[0] as HTMLInputElement).value;
    expect((Date.parse(to) - Date.parse(from)) / 86400000).toBe(29);
    await waitFor(() => expect(payoutApi.getOrganizerAnalytics).toHaveBeenCalledWith(from, to, undefined));
  });

  it("shows a financial breakdown for a noneligible event without starting a payout", async () => {
    const ineligible = { ...event, eligible: false, availableAmount: "0", reasonCodes: ["EVENT_NOT_ENDED" as const] };
    setup();
    vi.mocked(payoutApi.getOrganizerEvents).mockResolvedValue({ content: [ineligible], page: 0, size: 100, totalElements: 1, totalPages: 1 });
    await userEvent.click(await screen.findByRole("button", { name: "Xem chi tiết" }));
    expect(await screen.findByRole("heading", { name: "Chi tiết doanh thu sự kiện" })).not.toBeNull();
    expect(screen.getByText("Phí nền tảng")).not.toBeNull();
    expect(screen.getAllByText("Có thể rút").length).toBeGreaterThan(1);
    expect(payoutApi.getPayoutQuote).not.toHaveBeenCalled();
  });

  it("shows an inline range error and skips analytics requests when dates are reversed", async () => {
    setup("/organizer/finance?tab=overview&from=2026-10-30&to=2026-10-01");
    expect((await screen.findAllByText("Ngày bắt đầu phải bằng hoặc trước ngày kết thúc.")).length).toBeGreaterThan(0);
    expect(payoutApi.getOrganizerAnalytics).not.toHaveBeenCalled();
  });

  it("explains the date limit without sending an invalid analytics request", async () => {
    setup("/organizer/finance?from=2024-01-01&to=2026-10-30");
    expect((await screen.findAllByText("Vui lòng chọn khoảng thời gian không quá 366 ngày.")).length).toBeGreaterThan(0);
    expect(payoutApi.getOrganizerAnalytics).not.toHaveBeenCalled();
  });

  it("does not offer withdrawals for an unfinished event even if legacy advance data says it is eligible", async () => {
    setup();
    const unfinished = {
      ...event,
      eligible: false,
      reasonCodes: ["EVENT_NOT_ENDED"],
      eligibilityByType: { ADVANCE: { eligible: true, reasonCodes: [] } },
    };
    vi.mocked(payoutApi.getOrganizerEvents).mockResolvedValue({ content: [unfinished], page: 0, size: 100, totalElements: 1, totalPages: 1 });
    await userEvent.click(await screen.findByRole("button", { name: /Yêu cầu rút tiền/ }));
    expect((await screen.findByRole("button", { name: /Spring festival/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("radio", { name: /Tạm ứng/ })).toBeNull();
  });

  it("submits the server balance after selecting an event and confirming the account", async () => {
    setup();
    await userEvent.click(await screen.findByRole("button", { name: /Yêu cầu rút tiền/ }));
    await userEvent.click(await screen.findByRole("button", { name: /Spring festival/ }));
    await userEvent.click(screen.getByRole("button", { name: /Tiếp tục/ }));
    const submit = await screen.findByRole("button", { name: "Gửi yêu cầu" });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(await screen.findByLabelText(/Tôi xác nhận thông tin tài khoản/));
    await userEvent.click(submit);
    await waitFor(() => expect(payoutApi.requestPayout).toHaveBeenCalledWith("event-1", "FINAL_SETTLEMENT", "quote-1", "v1", "950000", expect.any(String)));
    expect(await screen.findByText("Đã gửi yêu cầu rút tiền thành công!")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Xem chi tiết yêu cầu" }).getAttribute("href")).toBe("/organizer/finance/withdrawals/payout-1");
  });

  it("selects all eligible events and retries only the unsent event after a partial failure", async () => {
    setup();
    const second = { ...event, eventId: "event-2", eventName: "Second festival" };
    const blocked = { ...event, eventId: "event-3", eventName: "Unfinished event", eligible: false };
    vi.mocked(payoutApi.getOrganizerEvents).mockResolvedValue({ content: [event, second, blocked], page: 0, size: 100, totalElements: 3, totalPages: 1 });
    vi.mocked(payoutApi.getPayoutQuote).mockImplementation(async eventId => ({ ...quote, eventId, quoteId: `quote-${eventId}` } as never));
    const first = { id: "payout-1", eventId: "event-1", organizerUserId: "user-1", grossAmount: 1000000, platformFee: 50000, netAmount: 950000, status: "PENDING" as const, createdAt: "2026-10-30T00:00:00Z", updatedAt: "2026-10-30T00:00:00Z" };
    vi.mocked(payoutApi.requestPayout)
      .mockResolvedValueOnce(first)
      .mockRejectedValueOnce({ response: { status: 409, data: { message: "Số dư đã thay đổi" } } })
      .mockResolvedValueOnce({ ...first, id: "payout-2", eventId: "event-2" });

    await userEvent.click(await screen.findByRole("button", { name: /Yêu cầu rút tiền/ }));
    await userEvent.click(await screen.findByRole("checkbox", { name: "Chọn tất cả (2)" }));
    await userEvent.click(screen.getByRole("button", { name: /Tiếp tục/ }));
    await userEvent.click(await screen.findByLabelText(/Tôi xác nhận thông tin tài khoản/));
    expect(screen.getAllByText("Khấu trừ (5%)")).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Gửi 2 yêu cầu" }));
    expect(await screen.findByText("Đã gửi 1 yêu cầu")).toBeTruthy();
    expect(await screen.findByText(/Second festival: Số dư đã thay đổi/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await userEvent.click(await screen.findByLabelText(/Tôi xác nhận thông tin tài khoản/));
    await userEvent.click(screen.getByRole("button", { name: "Gửi yêu cầu" }));
    expect(await screen.findByText("Đã gửi yêu cầu rút tiền thành công!")).toBeTruthy();
    expect(vi.mocked(payoutApi.requestPayout).mock.calls.map(call => call[0])).toEqual(["event-1", "event-2", "event-2"]);
    expect(screen.getAllByRole("link", { name: "Xem chi tiết yêu cầu" })).toHaveLength(2);
  });

  it("retries an uncertain request with the same idempotency key", async () => {
    setup();
    vi.mocked(payoutApi.requestPayout).mockRejectedValueOnce(new Error("network timeout"));
    await userEvent.click(await screen.findByRole("button", { name: /Yêu cầu rút tiền/ }));
    await userEvent.click(await screen.findByRole("button", { name: /Spring festival/ }));
    await userEvent.click(screen.getByRole("button", { name: /Tiếp tục/ }));
    await userEvent.click(await screen.findByLabelText(/Tôi xác nhận thông tin tài khoản/));
    await userEvent.click(screen.getByRole("button", { name: /Gửi yêu cầu/ }));
    expect(await screen.findByText(/Chưa xác định được kết quả gửi/)).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Tra cứu / thử lại" }));
    await waitFor(() => expect(payoutApi.requestPayout).toHaveBeenCalledTimes(2));
    const firstKey = vi.mocked(payoutApi.requestPayout).mock.calls[0][5];
    const retryKey = vi.mocked(payoutApi.requestPayout).mock.calls[1][5];
    expect(firstKey).toBeTruthy();
    expect(retryKey).toBe(firstKey);
    expect(await screen.findByText("Đã gửi yêu cầu rút tiền thành công!")).not.toBeNull();
  });
});
