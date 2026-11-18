/** Kiểu thống kê doanh thu: gần đây (7 ngày), theo tháng, theo năm hoặc khoảng tùy chọn. */
export type RevenuePeriod = "recent" | "month" | "year" | "custom";

/** Tính khoảng ngày cho kiểu thống kê: năm thì cả năm, tháng thì cả tháng của {@code value}, gần đây thì 7 ngày kết thúc tại {@code value}. */
export function revenueRange(period: Exclude<RevenuePeriod, "custom">, value: string) {
  if (period === "year") return { from: `${value.slice(0, 4)}-01-01`, to: `${value.slice(0, 4)}-12-31` };
  if (period === "month") {
    const month = value.slice(0, 7);
    const [year, number] = month.split("-").map(Number);
    return { from: `${month}-01`, to: `${month}-${new Date(Date.UTC(year, number, 0)).getUTCDate()}` };
  }
  const end = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() - 6);
  return { from: end.toISOString().slice(0, 10), to: value.slice(0, 10) };
}

/** Định dạng nhãn ngày hoặc tháng từ API thành dd/MM/yyyy hoặc MM/yyyy mà không bị lệch ngày do đổi múi giờ UTC. */
export function formatRevenueDate(value: unknown): string {
  const text = String(value ?? "");
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(text);
  return match ? match[3] ? `${match[3]}/${match[2]}/${match[1]}` : `${match[2]}/${match[1]}` : text;
}
