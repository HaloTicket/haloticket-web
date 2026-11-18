/** Một cột của bảng xuất: khóa dữ liệu và nhãn tiêu đề. */
export interface FinanceExportColumn {
  key: string;
  label: string;
}

/** Một sheet xuất Excel: tên sheet, tên bộ dữ liệu, trường ngày dùng để lọc, các cột và bản ghi. */
export interface FinanceExportSheet {
  name: string;
  dataset: string;
  dateField: string;
  columns: FinanceExportColumn[];
  records: Record<string, unknown>[];
}

/** Chuyển giá trị sang kiểu ghi được vào bảng tính; chuỗi bắt đầu bằng ký tự công thức (=, +, -, @, tab, xuống dòng) được thêm dấu nháy đơn để tránh chèn công thức. */
function spreadsheetValue(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") {
    const formulaPrefix = /^[=+\-@]/.test(value.trimStart()) || value.startsWith("\t") || value.startsWith("\r") || value.startsWith("\n");
    return formulaPrefix ? `'${value}` : value;
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

/** Dựng các dòng của sheet: hai dòng thông tin bộ dữ liệu, một dòng trống, dòng tiêu đề rồi các bản ghi. */
export function buildOrganizerFinanceSheet(
  dataset: string,
  dateField: string,
  columns: FinanceExportColumn[],
  records: Record<string, unknown>[],
): (string | number | boolean)[][] {
  return [
    ["Bộ dữ liệu", dataset],
    ["Trường ngày", dateField],
    [],
    columns.map((column) => column.label),
    ...records.map((record) => columns.map((column) => spreadsheetValue(record[column.key]))),
  ];
}

/** Tạo và tải xuống tệp Excel từ các sheet (nạp thư viện xlsx khi cần); tên sheet bị cắt còn 31 ký tự và có bộ lọc tự động. */
export async function downloadOrganizerFinanceWorkbook(sheets: FinanceExportSheet[], filename: string) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const rows = buildOrganizerFinanceSheet(sheet.dataset, sheet.dateField, sheet.columns, sheet.records);
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet["!cols"] = sheet.columns.map((column, index) => ({ wch: Math.min(48, rows.slice(4).reduce((width, row) => Math.max(width, String(row[index] ?? "").length + 2), Math.max(18, column.label.length + 2))) }));
    // Tiêu đề ở dòng 4; dòng xuất cuối cùng là dòng tổng kết, nằm ngoài bộ lọc.
    worksheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: Math.max(3, rows.length - 2), c: sheet.columns.length - 1 } }) };
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }
  XLSX.writeFile(workbook, filename);
}
