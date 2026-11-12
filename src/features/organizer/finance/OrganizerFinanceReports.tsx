import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "react-hot-toast";
import { FiDownload, FiFileText, FiX } from "react-icons/fi";
import type { EventSettlement, PayoutResponse } from "@/types";
import { downloadOrganizerFinanceWorkbook, type FinanceExportColumn, type FinanceExportSheet } from "./organizerFinanceExport";

import { revenueRange } from "./revenuePeriods";

export interface OrganizerRevenueSeriesItem {
  date: string;
  grossAmount: string | number;
  refundAmount: string | number;
}
export interface OrganizerFinanceReportsProps {
  events: EventSettlement[];
  payouts: PayoutResponse[];
  series: OrganizerRevenueSeriesItem[];
  from: string;
  to: string;
  refundDataAvailable?: boolean;
  refundDataNote?: string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  eventId?: string;
  onEventChange?: (eventId: string) => void;
  onRangeChange?: (from: string, to: string) => void;
}

type ReportType = "revenue" | "settlements" | "payouts" | "refunds";
type DateField = "createdAt" | "transferredAt";
type ReportColumn = FinanceExportColumn & { align?: "left" | "right" };
type ReportRow = Record<string, unknown>;
const reportLabels: Record<ReportType, string> = { revenue: "Doanh thu", settlements: "Số dư theo sự kiện", payouts: "Yêu cầu rút tiền", refunds: "Hoàn tiền" };
const statusNames: Record<string, string> = { PENDING: "Chờ duyệt", APPROVED: "Đã duyệt", PROCESSING: "Đang xử lý", COMPLETED: "Hoàn tất", FAILED: "Thất bại", NEEDS_VERIFICATION: "Cần xác minh", REJECTED: "Từ chối", CANCELLED: "Đã hủy", DISPUTE: "Tạm giữ" };
const toBigInt = (value: unknown): bigint => {
  const raw = String(value ?? "").trim();
  return /^-?\d+$/.test(raw) ? BigInt(raw) : 0n;
};
const money = (value: bigint) => `${value.toLocaleString("vi-VN")} ₫`;
const inRange = (dateValue: string | undefined, from: string, to: string) => {
  if (!dateValue) return false;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : dateValue.slice(0, 10);
  return (!from || day >= from) && (!to || day <= to);
};
const formatDate = (value: unknown) => {
  if (typeof value !== "string" || !value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};
const revenueColumns: ReportColumn[] = [
  { key: "date", label: "Ngày ghi nhận" },
  { key: "grossAmount", label: "Doanh thu đã thu (VND)", align: "right" },
];
const settlementColumns: ReportColumn[] = [
  { key: "eventName", label: "Sự kiện" }, { key: "eventEndAt", label: "Ngày kết thúc" },
  { key: "grossAmount", label: "Tổng thu (VND)", align: "right" }, { key: "platformFees", label: "Phí nền tảng (VND)", align: "right" },
  { key: "refunds", label: "Hoàn tiền (VND)", align: "right" },
  { key: "paidAmount", label: "Đã chi (VND)", align: "right" }, { key: "heldAmount", label: "Đang giữ (VND)", align: "right" },
  { key: "availableAmount", label: "Khả dụng (VND)", align: "right" },
];
const payoutColumns: ReportColumn[] = [
  { key: "id", label: "Mã yêu cầu" }, { key: "eventName", label: "Sự kiện" }, { key: "requestType", label: "Loại" },
  { key: "reportDate", label: "Ngày theo bộ lọc" }, { key: "statusLabel", label: "Trạng thái" },
  { key: "grossAmount", label: "Tổng tiền (VND)", align: "right" }, { key: "platformFee", label: "Phí nền tảng (VND)", align: "right" },
  { key: "netAmount", label: "Số tiền ròng (VND)", align: "right" }, { key: "transferReference", label: "Mã giao dịch" },
];
const refundColumns: ReportColumn[] = [
  { key: "date", label: "Ngày ghi nhận" }, { key: "refundAmount", label: "Hoàn tiền tổng hợp (VND)", align: "right" },
];

export function OrganizerFinanceReports({ events, payouts, series, from, to, refundDataAvailable = false, refundDataNote, loading = false, error = "", onRetry, eventId = "", onEventChange, onRangeChange }: OrganizerFinanceReportsProps) {
  const [reportType, setReportType] = useState<ReportType>("revenue");
  const [payoutDateField, setPayoutDateField] = useState<DateField>("createdAt");
  const [exporting, setExporting] = useState(false);
  const [customFilename, setCustomFilename] = useState("");
  const defaultFilename = `Bao_cao_${reportType}_${from || "bat-dau"}_${to || "hien-tai"}`;
  const filename = (customFilename.trim().replace(/\.xlsx$/i, "").replace(/[<>:"/\\|?*]/g, "_").split("").filter(char => char.charCodeAt(0) >= 32).join("").slice(0, 120) || defaultFilename) + ".xlsx";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const chooseRange = (value: string) => {
    const range = value === "recent" || value === "month" || value === "year" ? revenueRange(value, today) : null;
    if (range) onRangeChange?.(range.from, range.to);
  };
  const report = useMemo(() => {
    let columns: ReportColumn[];
    let records: ReportRow[];
    let totals: Record<string, unknown>;
    let note = "";
    let dataset: string;
    let dateLabel: string;

    if (reportType === "revenue") {
      columns = revenueColumns;
      const filtered = series.filter((item) => inRange(item.date, from, to)).slice().sort((a, b) => a.date.localeCompare(b.date));
      records = filtered.map((item) => ({ date: item.date, grossAmount: toBigInt(item.grossAmount) }));
      totals = { grossAmount: records.reduce((sum, row) => sum + (row.grossAmount as bigint), 0n) };
      dataset = "Doanh thu theo ngày ghi nhận thanh toán";
      dateLabel = "date";
    } else if (reportType === "settlements") {
      columns = settlementColumns;
      const filtered = events.filter((event) => !eventId || event.eventId === eventId);
      records = filtered.map((event) => ({
        eventId: event.eventId, eventName: event.eventName, eventEndAt: event.eventEndAt,
        grossAmount: toBigInt(event.grossAmount), platformFees: event.platformFees === undefined ? undefined : toBigInt(event.platformFees),
        refunds: event.refunds === undefined ? undefined : toBigInt(event.refunds), paidAmount: toBigInt(event.paidAmount),
        heldAmount: toBigInt(event.heldAmount), availableAmount: toBigInt(event.availableAmount),
      }));
      totals = Object.fromEntries(["grossAmount", "paidAmount", "heldAmount", "availableAmount"].map((key) => [key, records.reduce((sum, row) => sum + (row[key] as bigint), 0n)]));
      for (const key of ["platformFees", "refunds"]) {
        const present = records.filter((row) => row[key] !== undefined);
        totals[key] = present.length ? present.reduce((sum, row) => sum + (row[key] as bigint), 0n) : undefined;
      }
      dataset = "Số dư hiện tại theo sự kiện";
      dateLabel = "eventEndAt (chỉ để tham khảo; không lọc số liệu tích lũy theo kỳ)";
      note = "Báo cáo hiển thị số dư hiện tại. Dùng bộ lọc sự kiện để thu hẹp danh sách.";
    } else if (reportType === "payouts") {
      columns = payoutColumns;
      const filtered = payouts.filter((payout) => (!eventId || payout.eventId === eventId) && inRange(payout[payoutDateField], from, to));
      records = filtered.map((payout) => ({
        id: payout.id, eventId: payout.eventId, eventName: payout.eventName || payout.eventId,
        requestType: payout.requestType === "ADVANCE" ? "Tạm ứng (cũ)" : "Rút tiền", reportDate: payout[payoutDateField], statusLabel: statusNames[payout.status] || payout.status,
        grossAmount: toBigInt(payout.grossAmount), platformFee: toBigInt(payout.platformFee), netAmount: toBigInt(payout.netAmount), transferReference: payout.transferReference || "",
      }));
      totals = Object.fromEntries(["grossAmount", "platformFee", "netAmount"].map((key) => [key, records.reduce((sum, row) => sum + (row[key] as bigint), 0n)]));
      dataset = "Yêu cầu rút tiền";
      dateLabel = payoutDateField;
    } else {
      columns = refundColumns;
      const filtered = refundDataAvailable ? series.filter((item) => inRange(item.date, from, to)).slice().sort((a, b) => a.date.localeCompare(b.date)) : [];
      records = filtered.map((item) => ({ date: item.date, refundAmount: toBigInt(item.refundAmount) }));
      totals = { refundAmount: records.reduce((sum, row) => sum + (row.refundAmount as bigint), 0n) };
      dataset = refundDataAvailable ? "Hoàn tiền tổng hợp theo ngày" : "Không có dữ liệu hoàn tiền";
      dateLabel = "date";
      note = refundDataAvailable ? (refundDataNote || "Chỉ có tổng tiền hoàn theo ngày; chưa có hồ sơ hoàn tiền chi tiết.") : (refundDataNote || "Chưa có dữ liệu hoàn tiền đáng tin cậy.");
    }
    return { columns, records, totals, note, dataset, dateLabel };
  }, [reportType, events, payouts, series, from, to, eventId, payoutDateField, refundDataAvailable, refundDataNote]);

  const tableRows = report.records.map((record) => record);
  const exportCurrent = async () => {
    if (exporting || loading || error || !report.records.length) return;
    setExporting(true);
    try {
      const sheet: FinanceExportSheet = {
        name: reportLabels[reportType], dataset: report.dataset, dateField: report.dateLabel,
        columns: report.columns.map(({ key, label }) => ({ key, label })),
        records: [...report.records, { [report.columns[0].key]: "Tổng cộng", ...report.totals }],
      };
      await downloadOrganizerFinanceWorkbook([sheet], filename);
      toast.success("Đã xuất báo cáo Excel.");
    } catch {
      toast.error("Không thể xuất báo cáo Excel.");
    } finally { setExporting(false); }
  };
  const totalLabelIndex = report.columns.findIndex((column) => column.align !== "right");

  return <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50" />
    <Dialog.Content className="finance-theme fixed left-1/2 top-1/2 z-[101] flex max-h-[90dvh] w-[calc(100%-24px)] max-w-[1100px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border app-border app-bg-card shadow-xl focus:outline-none">
    <header className="flex shrink-0 items-start justify-between gap-4 border-b app-border p-4 sm:p-5">
      <div><Dialog.Title className="text-lg font-bold app-text-main">Xem trước báo cáo tài chính</Dialog.Title><Dialog.Description className="mt-1 text-sm app-text-muted">Chọn dữ liệu, xem trước và tải file Excel.</Dialog.Description></div>
      <Dialog.Close aria-label="Đóng xem trước" className="rounded-lg p-2 app-text-muted hover:bg-slate-100"><FiX /></Dialog.Close>
    </header>
    <section className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" aria-label="Báo cáo tài chính" aria-busy={loading}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold app-text-main">Dữ liệu xuất</h3><div className="flex flex-wrap gap-2" aria-label="Chọn nhanh thời gian">{([["recent", "7 ngày gần nhất"], ["month", "Tháng này"], ["year", "Năm nay"]] as const).map(([value, label]) => <button key={value} type="button" disabled={!onRangeChange || reportType === "settlements" || exporting} onClick={() => chooseRange(value)} className="rounded-lg border app-border px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-40">{label}</button>)}</div></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm font-semibold app-text-main">Báo cáo<select aria-label="Loại báo cáo" value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)} className="mt-1 h-10 w-full rounded-lg border app-border bg-white px-3">{Object.entries(reportLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-sm font-semibold app-text-main">Sự kiện<select aria-label="Sự kiện" value={eventId} onChange={(event) => onEventChange?.(event.target.value)} disabled={!onEventChange} className="mt-1 h-10 w-full rounded-lg border app-border bg-white px-3 disabled:bg-slate-50"><option value="">Tất cả sự kiện</option>{events.map((event) => <option key={event.eventId} value={event.eventId}>{event.eventName}</option>)}</select></label>
      <label className="text-sm font-semibold app-text-main">Từ ngày<input aria-label="Từ ngày" type="date" value={from} onChange={(event) => onRangeChange?.(event.target.value, to)} disabled={!onRangeChange || reportType === "settlements" || exporting} className="mt-1 h-10 w-full rounded-lg border app-border bg-white px-3 disabled:bg-slate-50" /></label>
      <label className="text-sm font-semibold app-text-main">Đến ngày<input aria-label="Đến ngày" type="date" value={to} onChange={(event) => onRangeChange?.(from, event.target.value)} disabled={!onRangeChange || reportType === "settlements" || exporting} className="mt-1 h-10 w-full rounded-lg border app-border bg-white px-3 disabled:bg-slate-50" /></label>
    </div>
    {reportType === "payouts" && <label className="inline-flex items-center gap-2 text-sm app-text-muted">Lọc ngày theo<select aria-label="Lọc ngày yêu cầu" value={payoutDateField} onChange={(event) => setPayoutDateField(event.target.value as DateField)} className="h-9 rounded-lg border app-border bg-white px-2 text-app-main"><option value="createdAt">Ngày tạo yêu cầu</option><option value="transferredAt">Ngày ghi nhận chuyển</option></select></label>}
    {report.note && <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">{report.note}</p>}
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span>{error}</span>{onRetry && <button type="button" onClick={onRetry} className="font-semibold underline">Thử lại</button>}</div>}
    {loading ? <p role="status" className="rounded-xl border app-border app-bg-card p-8 text-center text-sm app-text-muted">Đang tải báo cáo…</p> : !error && <div className="max-h-[48dvh] overflow-auto rounded-xl border app-border app-bg-card"><table className="w-full min-w-[720px] text-left text-sm"><caption className="p-4 text-left text-sm font-bold app-text-main">{reportLabels[reportType]}{reportType === "settlements" ? " · số liệu tích lũy hiện tại" : ""}</caption><thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold text-slate-600"><tr>{report.columns.map((column) => <th key={column.key} className={`px-4 py-3 ${column.align === "right" ? "text-right" : ""}`}>{column.label}</th>)}</tr></thead><tbody className="divide-y divide-[#edf2fa]">{tableRows.length ? tableRows.map((row, index) => <tr key={String(row.id || row.eventId || row.date || index)}>{report.columns.map((column) => <td key={column.key} className={`px-4 py-3 ${column.align === "right" ? "text-right tabular-nums" : ""} ${column.key === "netAmount" ? "font-semibold text-emerald-700" : "app-text-main"}`}>{["grossAmount", "platformFees", "refunds", "deductions", "paidAmount", "heldAmount", "availableAmount", "platformFee", "netAmount", "refundAmount"].includes(column.key) ? row[column.key] === undefined ? "—" : money(row[column.key] as bigint) : column.key === "date" || column.key === "reportDate" || column.key === "eventEndAt" ? formatDate(row[column.key]) : String(row[column.key] ?? "—")}</td>)}</tr>) : <tr><td colSpan={report.columns.length} className="px-4 py-10 text-center app-text-muted">{reportType === "refunds" && !refundDataAvailable ? "Chưa có dữ liệu hoàn tiền." : "Không có dữ liệu phù hợp với bộ lọc."}</td></tr>}</tbody><tfoot className="sticky bottom-0 border-t-2 border-[#edf2fa] bg-slate-50 font-bold"><tr>{report.columns.map((column, index) => <td key={column.key} className={`px-4 py-3 ${column.align === "right" ? "text-right tabular-nums" : ""}`}>{column.align === "right" ? report.totals[column.key] === undefined ? "—" : money(report.totals[column.key] as bigint) : index === totalLabelIndex ? "Tổng cộng" : ""}</td>)}</tr></tfoot></table></div>}
    <div className="flex flex-wrap items-center gap-3 rounded-xl border app-border bg-slate-50 p-4"><FiFileText aria-hidden="true" className="text-xl text-blue-600" /><label className="min-w-0 flex-1 text-xs font-semibold app-text-muted">Tên file<div className="mt-1 flex items-center gap-2"><input aria-label="Tên file Excel" maxLength={120} value={customFilename} placeholder={defaultFilename} onChange={event => setCustomFilename(event.target.value)} className="h-9 min-w-0 w-full rounded-lg border app-border bg-white px-3 text-sm font-normal app-text-main" /><span className="text-sm">.xlsx</span></div></label><span className="text-xs app-text-muted">{loading || error ? "—" : report.records.length} dòng dữ liệu · Có dòng tổng cộng</span></div>
    </section>
    <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t app-border p-4 sm:px-5">
      <p className="text-xs app-text-muted">{loading ? "Đang tải dữ liệu…" : error ? "Không thể xuất khi có lỗi" : !report.records.length ? "Không có dữ liệu để xuất" : "Xuất đúng dữ liệu đang xem trước"}</p>
      <div className="ml-auto flex gap-2"><Dialog.Close className="min-h-10 rounded-lg border app-border px-4 text-sm font-semibold app-text-main">Đóng</Dialog.Close><button type="button" onClick={() => void exportCurrent()} disabled={exporting || loading || Boolean(error) || !report.records.length} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"><FiDownload aria-hidden="true" />{exporting ? "Đang xuất…" : "Xuất Excel"}</button></div>
    </footer>
    </Dialog.Content></Dialog.Portal>;
}
export default OrganizerFinanceReports;
