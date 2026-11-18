const UUID_START = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

/**
 * Chọn cột làm nhãn cho từng điểm dữ liệu và các cột số để vẽ biểu đồ. Cột `id` hoặc UUID không bao giờ được chọn làm nhãn.
 *
 * @param data - Các dòng kết quả truy vấn; cột được xác định theo dòng đầu tiên.
 * @returns Tên cột nhãn và danh sách cột số, hoặc `null` nếu không đủ dữ liệu để vẽ.
 */
export function pickChartColumns(data: Record<string, unknown>[]): { labelCol: string; numCols: string[] } | null {
  if (!data || data.length === 0) return null;
  const columns = Object.keys(data[0]);
  if (columns.length < 2) return null;
  /** Cột trông giống mã định danh: tên kết thúc bằng `id` hoặc mọi giá trị đều bắt đầu như UUID. */
  const looksLikeId = (col: string) =>
    /(^|_)id$/i.test(col) || data.every((row) => typeof row[col] === "string" && UUID_START.test(String(row[col])));
  /** Giá trị là chuỗi không rỗng nhưng biểu diễn một số. */
  const numericText = (value: unknown) => typeof value === "string" && value.trim() !== "" && !isNaN(Number(value));
  const textCols = columns.filter((col) => typeof data[0][col] === "string" && !numericText(data[0][col]));
  const labelCol = textCols.find((col) => !looksLikeId(col)) || textCols[0] || columns[0];
  let numCols = columns.filter((col) => typeof data[0][col] === "number");
  if (numCols.length === 0) {
    numCols = columns.filter((col) => col !== labelCol && !isNaN(Number(data[0][col])));
  }
  return numCols.length === 0 ? null : { labelCol, numCols };
}
