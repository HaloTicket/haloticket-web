// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Dialog from "@radix-ui/react-dialog";
import { OrganizerFinanceReports as Reports, type OrganizerFinanceReportsProps } from "@/features/organizer/finance/OrganizerFinanceReports";
import { downloadOrganizerFinanceWorkbook } from "@/features/organizer/finance/organizerFinanceExport";
import type { EventSettlement, PayoutResponse } from "@/types";

vi.mock("@/features/organizer/finance/organizerFinanceExport", async () => {
  const actual = await vi.importActual<typeof import("@/features/organizer/finance/organizerFinanceExport")>("@/features/organizer/finance/organizerFinanceExport");
  return { ...actual, downloadOrganizerFinanceWorkbook: vi.fn().mockResolvedValue(undefined) };
});
vi.mock("react-hot-toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const events: EventSettlement[] = [
  { eventId: "e1", eventName: "Alpha", eventEndAt: "2026-09-01T00:00:00Z", grossAmount: "900719925474099300", deductions: "20", paidAmount: "30", heldAmount: "40", availableAmount: "50", settlementStatus: "CONFIRMED", eligible: true, reasonCodes: [] },
  { eventId: "e2", eventName: "Beta", eventEndAt: "2026-09-02T00:00:00Z", grossAmount: "200", deductions: "10", paidAmount: "20", heldAmount: "30", availableAmount: "40", settlementStatus: "CONFIRMED", eligible: true, reasonCodes: [] },
];
const payouts: PayoutResponse[] = [{ id: "p1", eventId: "e1", eventName: "Alpha", organizerUserId: "u1", grossAmount: 100, platformFee: 5, netAmount: 95, status: "COMPLETED", createdAt: "2026-10-04T12:00:00Z", updatedAt: "2026-10-05T12:00:00Z", transferredAt: "2026-10-05T12:00:00Z" }];
const baseProps = { events, payouts, series: [{ date: "2026-10-02", grossAmount: "12", refundAmount: "3" }, { date: "2026-10-04", grossAmount: "30", refundAmount: "7" }], from: "2026-10-01", to: "2026-10-03", refundDataAvailable: true };
const OrganizerFinanceReports = (props: OrganizerFinanceReportsProps) => <Dialog.Root defaultOpen><Reports {...props} /></Dialog.Root>;

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("OrganizerFinanceReports", () => {
  it("supports quick date ranges and a custom Excel filename", async () => {
    const onRangeChange = vi.fn();
    render(<OrganizerFinanceReports {...baseProps} onRangeChange={onRangeChange} />);
    fireEvent.click(screen.getByRole("button", { name: "7 ngày gần nhất" }));
    const [from, to] = onRangeChange.mock.calls[0];
    expect((Date.parse(to) - Date.parse(from)) / 86400000).toBe(6);
    fireEvent.change(screen.getByRole("textbox", { name: "Tên file Excel" }), { target: { value: "Doanh thu.xlsx" } });
    fireEvent.click(screen.getByRole("button", { name: "Xuất Excel" }));
    await waitFor(() => expect(downloadOrganizerFinanceWorkbook).toHaveBeenCalledTimes(1));
    expect(vi.mocked(downloadOrganizerFinanceWorkbook).mock.calls[0][1]).toBe("Doanh thu.xlsx");
  });

  it("blocks empty exports and disables date filters for cumulative settlements", () => {
    render(<OrganizerFinanceReports {...baseProps} series={[]} onRangeChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Xuất Excel" }).hasAttribute("disabled")).toBe(true);
    fireEvent.change(screen.getByRole("combobox", { name: "Loại báo cáo" }), { target: { value: "settlements" } });
    expect(screen.getByLabelText("Từ ngày").hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Tháng này" }).hasAttribute("disabled")).toBe(true);
  });

  it("renders one report workspace without charts or nested report tabs", () => {
    render(<OrganizerFinanceReports {...baseProps} />);
    expect((screen.getByRole("combobox", { name: "Loại báo cáo" }) as HTMLSelectElement).value).toBe("revenue");
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getAllByText("12 ₫").length).toBe(2);
    expect(screen.queryByText("30 ₫")).toBeNull();
  });

  it("filters event rows and exports the identical filtered rows with the displayed total", async () => {
    const onEventChange = vi.fn();
    const firstRender = render(<OrganizerFinanceReports {...baseProps} eventId="" onEventChange={onEventChange} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Loại báo cáo" }), { target: { value: "settlements" } });
    expect(screen.getAllByText("Alpha").length).toBe(2);
    expect(screen.getAllByText("Beta").length).toBe(2);
    fireEvent.change(screen.getByRole("combobox", { name: "Sự kiện" }), { target: { value: "e1" } });
    expect(onEventChange).toHaveBeenCalledWith("e1");
    firstRender.rerender(<OrganizerFinanceReports {...baseProps} eventId="e1" onEventChange={onEventChange} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Loại báo cáo" }), { target: { value: "settlements" } });
    expect(screen.getAllByText("Alpha").length).toBe(2);
    expect(screen.getByRole("table").querySelector("tbody")?.textContent).not.toContain("Beta");
    expect(screen.getAllByText(/900.719.925.474.099.300 ₫/).length).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: /Xuất Excel/ }));
    await waitFor(() => expect(downloadOrganizerFinanceWorkbook).toHaveBeenCalledTimes(1));
    const [sheets] = vi.mocked(downloadOrganizerFinanceWorkbook).mock.calls[0];
    expect(sheets[0].records.length).toBe(2);
    expect(sheets[0].records[0]).toMatchObject({ eventName: "Alpha", grossAmount: 900719925474099300n });
    expect(sheets[0].records[1]).toMatchObject({ eventName: "Tổng cộng", grossAmount: 900719925474099300n });
  });

  it("disables export when report loading fails and does not assert zero refunds without data", () => {
    render(<OrganizerFinanceReports {...baseProps} error="Không tải được báo cáo" refundDataAvailable={false} />);
    expect(screen.getByRole("button", { name: /Xuất Excel/ }).hasAttribute("disabled")).toBe(true);
    cleanup();
    render(<OrganizerFinanceReports {...baseProps} refundDataAvailable={false} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Loại báo cáo" }), { target: { value: "refunds" } });
    expect(screen.getByText("Chưa có dữ liệu hoàn tiền đáng tin cậy.")).not.toBeNull();
    expect(screen.getByText("Chưa có dữ liệu hoàn tiền.")).not.toBeNull();
  });
});
