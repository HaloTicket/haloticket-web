export interface FinanceExportColumn {
  key: string;
  label: string;
}

export interface FinanceExportSheet {
  name: string;
  dataset: string;
  dateField: string;
  columns: FinanceExportColumn[];
  records: Record<string, unknown>[];
}

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

export async function downloadOrganizerFinanceWorkbook(sheets: FinanceExportSheet[], filename: string) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const rows = buildOrganizerFinanceSheet(sheet.dataset, sheet.dateField, sheet.columns, sheet.records);
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet["!cols"] = sheet.columns.map((column, index) => ({ wch: Math.min(48, rows.slice(4).reduce((width, row) => Math.max(width, String(row[index] ?? "").length + 2), Math.max(18, column.label.length + 2))) }));
    // Header is row 4; the last exported row is the summary, outside the filter.
    worksheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: Math.max(3, rows.length - 2), c: sheet.columns.length - 1 } }) };
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }
  XLSX.writeFile(workbook, filename);
}
