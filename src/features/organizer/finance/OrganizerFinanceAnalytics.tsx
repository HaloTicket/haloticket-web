import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EventSettlement, PayoutResponse } from "@/types";
import { useState } from "react";
import { FiCalendar, FiChevronDown, FiCheck } from "react-icons/fi";
import { formatRevenueDate, revenueRange, type RevenuePeriod } from "./revenuePeriods";

const colors = ["#005cff", "#00b585", "#ffab24"];
const money = (value: unknown) => `${Number(value).toLocaleString("vi-VN")} ₫`;

export function OrganizerFinanceAnalytics({ events, payouts, loading, error, from, to, period = "recent", onRangeChange }: {
  events: EventSettlement[];
  payouts: PayoutResponse[];
  from: string;
  to: string;
  loading?: boolean;
  error?: string;
  period?: RevenuePeriod;
  onRangeChange?: (from: string, to: string, period: RevenuePeriod) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const labels: Record<RevenuePeriod, string> = { recent: "Theo ngày", month: "Theo tháng", year: "Theo năm", custom: "Tùy chọn thời gian" };
  const choose = (next: RevenuePeriod) => {
    setMenuOpen(false);
    const range = next === "custom" ? { from, to } : revenueRange(next, today);
    onRangeChange?.(range.from, range.to, next);
  };
  const grouped = new Map<string, { date: string; revenue: number; available: number }>();
  for (const event of events) {
    const day = event.eventEndAt?.slice(0, 10);
    if (!day || (from && day < from) || (to && day > to)) continue;
    const date = period === "year" ? day.slice(0, 7) : day;
    const bucket = grouped.get(date) ?? { date, revenue: 0, available: 0 };
    bucket.revenue += Number(event.grossAmount);
    bucket.available += Number(event.availableAmount);
    grouped.set(date, bucket);
  }
  const chartData = [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date));
  const segments = [
    { name: "Đã nhận", value: events.reduce((sum, event) => sum + Number(event.paidAmount), 0) },
    { name: "Có thể rút", value: events.reduce((sum, event) => sum + Number(event.availableAmount), 0) },
    { name: "Đang xử lý", value: payouts.filter(p => ["PENDING", "APPROVED", "PROCESSING", "NEEDS_VERIFICATION", "DISPUTE"].includes(p.status)).reduce((sum, p) => sum + Number(p.netAmount), 0) },
  ];
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  return <section className="grid gap-4 lg:grid-cols-[1.7fr_1fr]" aria-label="Biểu đồ doanh thu và dòng tiền">
    <div className="finance-panel min-w-0 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-bold">Doanh thu theo thời gian</h2><p className="mt-1 text-xs app-text-muted">Theo ngày kết thúc sự kiện</p></div><div className="relative" onMouseEnter={() => setMenuOpen(true)} onMouseLeave={() => setMenuOpen(false)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setMenuOpen(false); }} onKeyDown={event => { if (event.key === "Escape") setMenuOpen(false); }}><button type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} className="inline-flex items-center gap-2 rounded-lg border app-border bg-white px-3 py-2 text-xs font-semibold text-blue-700"><FiCalendar />{labels[period]}<FiChevronDown /></button>{menuOpen && <div role="menu" aria-label="Khoảng thời gian doanh thu" className="absolute right-0 top-full z-20 w-52 rounded-xl border app-border bg-white p-1.5 shadow-lg">{(Object.entries(labels) as [RevenuePeriod, string][]).map(([key, label]) => <button type="button" role="menuitem" key={key} onClick={() => choose(key)} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs hover:bg-blue-50 focus:bg-blue-50">{label}{period === key && <FiCheck className="text-blue-600" />}</button>)}</div>}</div></div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs app-text-muted">
        <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#005cff]" />Doanh thu</span>
        <span className="flex items-center gap-2" title="Số dư có thể rút hiện tại, theo ngày kết thúc sự kiện"><i className="h-2 w-2 rounded-full bg-[#00b585]" />Có thể rút</span>
      </div>{period === "recent" ? <span className="text-xs app-text-muted">{formatRevenueDate(from)} — {formatRevenueDate(to)}</span> : period === "month" ? <label className="flex items-center gap-2 text-xs app-text-muted">Chọn tháng<input type="month" aria-label="Tháng doanh thu" value={from.slice(0, 7)} onChange={event => { if (event.target.value) { const range = revenueRange("month", event.target.value); onRangeChange?.(range.from, range.to, "month"); } }} className="rounded-lg border app-border px-2 py-1.5" /></label> : period === "year" ? <label className="flex items-center gap-2 text-xs app-text-muted">Chọn năm<select aria-label="Năm doanh thu" value={from.slice(0, 4)} onChange={event => { const range = revenueRange("year", event.target.value); onRangeChange?.(range.from, range.to, "year"); }} className="rounded-lg border app-border px-2 py-1.5">{[...new Set([from.slice(0, 4), ...Array.from({ length: 10 }, (_, i) => String(Number(today.slice(0, 4)) - i))])].filter(Boolean).map(year => <option key={year}>{year}</option>)}</select></label> : <div className="flex flex-wrap gap-2"><label className="text-xs app-text-muted">Từ ngày<input type="date" value={from} onChange={event => onRangeChange?.(event.target.value, to, "custom")} className="ml-2 rounded-lg border app-border px-2 py-1.5" /></label><label className="text-xs app-text-muted">Đến ngày<input type="date" value={to} onChange={event => onRangeChange?.(from, event.target.value, "custom")} className="ml-2 rounded-lg border app-border px-2 py-1.5" /></label></div>}</div>
      <div className="mt-3 h-52">{error ? <p role="alert" className="flex h-full items-center justify-center text-sm text-rose-700">{error}</p> : loading ? <div className="h-full animate-pulse rounded-lg bg-blue-50" /> : !chartData.length ? <p className="flex h-full items-center justify-center text-sm app-text-muted">Không có sự kiện kết thúc trong khoảng thời gian này.</p> : <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} barGap={4} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf2fa" /><XAxis dataKey="date" tickFormatter={(day: string) => period === "year" ? `${day.slice(5, 7)}/${day.slice(0, 4)}` : `${day.slice(8, 10)}/${day.slice(5, 7)}`} axisLine={false} tickLine={false} tick={{ fill: "#62769c", fontSize: 10 }} minTickGap={22} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#62769c", fontSize: 10 }} width={48} tickFormatter={(amount: number) => amount >= 1e6 ? `${amount / 1e6}tr` : amount >= 1e3 ? `${amount / 1e3}k` : String(amount)} /><Tooltip formatter={money} labelFormatter={formatRevenueDate} contentStyle={{ border: "1px solid #e2ebf7", borderRadius: 10, fontSize: 12 }} /><Bar dataKey="revenue" name="Doanh thu" fill={colors[0]} radius={[2, 2, 0, 0]} maxBarSize={20} minPointSize={3} /><Bar dataKey="available" name="Có thể rút" fill={colors[1]} radius={[2, 2, 0, 0]} maxBarSize={20} minPointSize={3} /></BarChart></ResponsiveContainer>}</div>
    </div>
    <div className="finance-panel min-w-0 p-5"><h2 className="text-sm font-bold">Cơ cấu dòng tiền</h2><p className="mt-1 text-xs app-text-muted">Số dư hiện tại đã nhận, khả dụng và đang xử lý</p><div className="mt-4 flex min-h-52 flex-wrap items-center justify-center gap-4"><div className="relative h-40 w-40 shrink-0">{total > 0 ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={segments} dataKey="value" nameKey="name" innerRadius={51} outerRadius={72} stroke="none" paddingAngle={2}>{segments.map((segment, i) => <Cell key={segment.name} fill={colors[i]} />)}</Pie><Tooltip formatter={money} /></PieChart></ResponsiveContainer> : <div className="absolute inset-2 rounded-full border-[18px] border-blue-50" />}<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-sm">{money(total)}</strong><span className="text-[10px] app-text-muted">Tổng đã phân loại</span></div></div><ul className="min-w-32 flex-1 space-y-4 text-xs">{segments.map((segment, i) => <li key={segment.name}><span className="flex items-center gap-2 app-text-muted"><i className="h-2 w-2 rounded-full" style={{ background: colors[i] }} />{segment.name}</span><strong className="mt-1 block pl-4">{money(segment.value)} <span className="font-normal app-text-muted">({total ? Math.round(segment.value / total * 100) : 0}%)</span></strong></li>)}</ul></div></div>
  </section>;
}
