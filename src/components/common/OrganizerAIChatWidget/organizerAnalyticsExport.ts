import * as XLSX from "xlsx";

/** Cột xuất dữ liệu bảng tính / CSV cho khung chat trợ lý ban tổ chức. */
export interface AnalyticsExportColumn {
  key: string;
  label: string;
}

const FORMULA_START_REGEX = /^[=+\-@|]/;
const CONTROL_START_REGEX = /^[\t\r\n]/;

/**
 * Làm sạch một giá trị trước khi ghi vào XLSX hoặc CSV để chống Spreadsheet Formula Injection.
 * Áp dụng cho cả nhãn tiêu đề cột, nhãn dòng đầu tiên và mọi ô chuỗi, nhưng giữ nguyên kiểu số hữu hạn (kể cả số âm).
 */
export function sanitizeSpreadsheetCell(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : "";
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "bigint") {
    return sanitizeSpreadsheetCell(value.toString());
  }
  const str = String(value);
  if (str === "") return "";
  if (CONTROL_START_REGEX.test(str) || FORMULA_START_REGEX.test(str.trimStart())) {
    return `'${str}`;
  }
  return str;
}

/**
 * Dựng mảng 2 chiều (AOA) đã khử công thức cho cả hàng tiêu đề lẫn dữ liệu.
 */
export function buildAnalyticsSheetRows(
  columns: AnalyticsExportColumn[],
  rows: Record<string, unknown>[],
): (string | number | boolean)[][] {
  const headerRow = columns.map((col) => String(sanitizeSpreadsheetCell(col.label)));
  const bodyRows = rows.map((row) =>
    columns.map((col) => sanitizeSpreadsheetCell(row[col.key])),
  );
  return [headerRow, ...bodyRows];
}

/**
 * Tạo Workbook SheetJS từ các cột và dòng đã làm sạch công thức.
 */
export function buildAnalyticsWorkbook(
  columns: AnalyticsExportColumn[],
  rows: Record<string, unknown>[],
  sheetName = "PhanTichBTC",
): XLSX.WorkBook {
  const aoa = buildAnalyticsSheetRows(columns, rows);
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  worksheet["!cols"] = columns.map((col, colIdx) => {
    const maxDataWidth = aoa.slice(1).reduce((maxLen, row) => {
      const cellLen = String(row[colIdx] ?? "").length + 2;
      return Math.max(maxLen, cellLen);
    }, Math.max(14, col.label.length + 3));
    return { wch: Math.min(48, maxDataWidth) };
  });
  const workbook = XLSX.utils.book_new();
  const safeSheetName = (sheetName.replace(/[\\/?*[\]:]/g, "").trim() || "PhanTichBTC").slice(0, 31);
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
  return workbook;
}

/**
 * Tạo nội dung CSV (kèm UTF-8 BOM cho Excel tiếng Việt) tái sử dụng `xlsx`,
 * bảo vệ chống chèn công thức trên cả nhãn cột, nhãn dòng và ô dữ liệu.
 */
export function buildAnalyticsCsvContent(
  columns: AnalyticsExportColumn[],
  rows: Record<string, unknown>[],
): string {
  const aoa = buildAnalyticsSheetRows(columns, rows);
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  return `\uFEFF${csv}`;
}

function makeSafeFilename(baseName: string, ext: "xlsx" | "csv"): string {
  const cleaned = baseName
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  const prefix = cleaned || "haloticket_organizer_analytics";
  return `${prefix}.${ext}`;
}

/**
 * Tải tệp `.xlsx` cục bộ bằng thư viện `xlsx` đã cài sẵn.
 */
export function downloadAnalyticsXlsx(
  columns: AnalyticsExportColumn[],
  rows: Record<string, unknown>[],
  baseName = "haloticket_organizer_analytics",
  writeWorkbook: (wb: XLSX.WorkBook, filename: string) => void = XLSX.writeFile,
): void {
  if (!columns.length || !rows.length) return;
  const workbook = buildAnalyticsWorkbook(columns, rows);
  writeWorkbook(workbook, makeSafeFilename(baseName, "xlsx"));
}

/**
 * Tải tệp `.csv` cục bộ đã khử công thức (gồm cả nhãn tiêu đề cột & nhãn dòng).
 */
export function downloadAnalyticsCsv(
  columns: AnalyticsExportColumn[],
  rows: Record<string, unknown>[],
  baseName = "haloticket_organizer_analytics",
): void {
  if (!columns.length || !rows.length || typeof document === "undefined") return;
  const csvContent = buildAnalyticsCsvContent(columns, rows);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", makeSafeFilename(baseName, "csv"));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}
