import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EventSettlement, PayoutResponse } from "@/types";
import { payoutSlices } from "./financeChartData";

const colors = ["#005cff", "#00b585", "#ffab24", "#fa4668"];
const formatMoney = (value: unknown) => `${Number(value).toLocaleString("vi-VN")} ₫`;

export function FinanceCharts({ bars, slices, title, subtitle, series }: {
  bars: { label: string; first: number; second?: number }[];
  slices: { name: string; value: number }[];
  title: string;
  subtitle: string;
  series: [string, string?];
}) {
  const total = slices.reduce((sum, item) => sum + item.value, 0);
  return <section className="finance-insights grid gap-4 lg:grid-cols-[1.55fr_1fr]" aria-label="Biểu đồ tài chính">
    <div className="finance-panel min-w-0 p-5">
      <h2 className="text-sm font-bold">{title}</h2><p className="mt-1 text-xs app-text-muted">{subtitle}</p>
      <div className="mt-4 flex flex-wrap gap-5 text-xs app-text-muted">{series.filter(Boolean).map((name, index) => <span key={name} className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full" style={{ background: colors[index] }} />{name}</span>)}</div>
      {bars.length ? <div className="mt-4 h-52 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={bars} barGap={5} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}><CartesianGrid vertical={false} stroke="#edf2fa" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#62769c", fontSize: 10 }} tickFormatter={(label: string) => label.length > 15 ? `${label.slice(0, 14)}…` : label} /><YAxis axisLine={false} tickLine={false} width={45} tick={{ fill: "#62769c", fontSize: 10 }} tickFormatter={(value: number) => value >= 1e6 ? `${value / 1e6}tr` : value >= 1e3 ? `${value / 1e3}k` : String(value)} /><Tooltip formatter={formatMoney} contentStyle={{ border: "1px solid #e2ebf7", borderRadius: 10, fontSize: 12 }} /><Bar dataKey="first" name={series[0]} fill={colors[0]} radius={[3, 3, 0, 0]} maxBarSize={24} />{series[1] && <Bar dataKey="second" name={series[1]} fill={colors[1]} radius={[3, 3, 0, 0]} maxBarSize={24} />}</BarChart></ResponsiveContainer></div> : <div className="flex h-60 items-center justify-center text-sm app-text-muted">Chưa có dữ liệu để hiển thị biểu đồ.</div>}
    </div>
    <div className="finance-panel min-w-0 p-5"><h2 className="text-sm font-bold">Trạng thái yêu cầu rút tiền</h2><p className="mt-1 text-xs app-text-muted">Phân bổ theo số yêu cầu đã ghi nhận</p>
      <div className="mt-4 flex min-h-56 flex-wrap items-center justify-center gap-4">
        <div className="relative h-44 w-44 shrink-0">{total > 0 ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={slices} dataKey="value" nameKey="name" innerRadius={58} outerRadius={78} paddingAngle={2} stroke="none">{slices.map((slice, index) => <Cell key={slice.name} fill={colors[index]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <div className="absolute inset-3 rounded-full border-[18px] border-blue-50" />}<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-2xl">{total}</strong><span className="text-[11px] app-text-muted">Tổng yêu cầu</span></div></div>
        <ul className="min-w-32 flex-1 space-y-4 text-xs">{slices.map((slice, index) => <li key={slice.name} className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 app-text-muted"><i className="h-2 w-2 rounded-full" style={{ background: colors[index] }} />{slice.name}</span><strong>{slice.value}</strong></li>)}</ul>
      </div>
    </div>
  </section>;
}

export function FinanceInsights({ events, payouts }: { events: EventSettlement[]; payouts: PayoutResponse[] }) {
  return <FinanceCharts bars={events.slice(0, 8).map(event => ({ label: event.eventName, first: Number(event.grossAmount), second: Number(event.paidAmount) }))} slices={payoutSlices(payouts)} title="Doanh thu & Chi trả theo sự kiện" subtitle="Tối đa 8 sự kiện trong danh sách hiện tại" series={["Doanh thu đã thu", "Đã chi trả"]} />;
}
