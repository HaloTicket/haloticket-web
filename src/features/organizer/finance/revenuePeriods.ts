export type RevenuePeriod = "recent" | "month" | "year" | "custom";

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

/** Format API day/month labels without UTC conversion shifting the day. */
export function formatRevenueDate(value: unknown): string {
  const text = String(value ?? "");
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(text);
  return match ? match[3] ? `${match[3]}/${match[2]}/${match[1]}` : `${match[2]}/${match[1]}` : text;
}
