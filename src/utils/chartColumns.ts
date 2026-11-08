const UUID_START = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

/** Picks the column that names each data point and the numeric column that is plotted. An id or UUID column is never the label. */
export function pickChartColumns(data: Record<string, unknown>[]): { labelCol: string; numCols: string[] } | null {
  if (!data || data.length === 0) return null;
  const columns = Object.keys(data[0]);
  if (columns.length < 2) return null;
  const looksLikeId = (col: string) =>
    /(^|_)id$/i.test(col) || data.every((row) => typeof row[col] === "string" && UUID_START.test(String(row[col])));
  const numericText = (value: unknown) => typeof value === "string" && value.trim() !== "" && !isNaN(Number(value));
  const textCols = columns.filter((col) => typeof data[0][col] === "string" && !numericText(data[0][col]));
  const labelCol = textCols.find((col) => !looksLikeId(col)) || textCols[0] || columns[0];
  let numCols = columns.filter((col) => typeof data[0][col] === "number");
  if (numCols.length === 0) {
    numCols = columns.filter((col) => col !== labelCol && !isNaN(Number(data[0][col])));
  }
  return numCols.length === 0 ? null : { labelCol, numCols };
}
