import { useEffect, useState } from "react";
import { FiAlertCircle, FiCheckCircle, FiClock, FiRefreshCw } from "react-icons/fi";
import { payoutApi } from "@/services/payoutApi";
import type { AdminFinanceSummary, AdminPayoutRow, PayoutStatus } from "@/types";
import { FinanceCharts } from "@/features/organizer/finance/FinanceInsights";
import { payoutSlices } from "@/features/organizer/finance/financeChartData";

const amount = (value?: string | number) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric.toLocaleString("vi-VN")} ₫` : "—";
};

export function FinanceOverview({ onOpenQueue }: { onOpenQueue: (status: PayoutStatus) => void }) {
  const [summary, setSummary] = useState<AdminFinanceSummary | null>(null);
  const [payouts, setPayouts] = useState<AdminPayoutRow[]>([]);
  const [updatedAt, setUpdatedAt] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    setError("");
    const [summaryResult, payoutsResult] = await Promise.allSettled([payoutApi.getAdminFinanceSummary(), payoutApi.getAdminPayoutQueue()]);
    if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
    else setError("Không tải được số liệu tổng hợp.");
    if (payoutsResult.status === "fulfilled") setPayouts(payoutsResult.value);
    setUpdatedAt(new Date().toLocaleString("vi-VN"));
    setLoading(false);
  };
  useEffect(() => {
    let active = true;
    Promise.allSettled([payoutApi.getAdminFinanceSummary(), payoutApi.getAdminPayoutQueue()]).then(([summaryResult, payoutsResult]) => {
      if (!active) return;
      if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
      else setError("Không tải được số liệu tổng hợp.");
      if (payoutsResult.status === "fulfilled") setPayouts(payoutsResult.value);
      setUpdatedAt(new Date().toLocaleString("vi-VN"));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const count = (status: string) => Number(summary?.countsByStatus?.[status] || 0);
  const byDate = new Map<string, number>();
  for (const payout of payouts) {
    if (payout.status !== "COMPLETED" || !payout.transferredAt) continue;
    const key = payout.transferredAt.slice(0, 10);
    byDate.set(key, (byDate.get(key) || 0) + Number(payout.netAmount));
  }
  const transferBars = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([day, first]) => ({ label: new Date(`${day}T00:00:00`).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }), first }));

  return <div className="space-y-5">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold app-text-main">Tổng quan tài chính</h2><p className="mt-1 text-sm text-slate-500">Tổng hợp các yêu cầu rút tiền · cập nhật {updatedAt || "—"}</p></div><button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border app-border px-3 py-2 text-sm font-semibold app-text-main"><FiRefreshCw className={loading ? "animate-spin" : ""} /> Làm mới</button></div>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} <button onClick={() => void load()} className="ml-2 underline">Thử lại</button></div>}
    {!summary && !loading && <div className="rounded-xl border app-border p-4 text-sm text-slate-500">Chưa có số liệu tổng hợp.</div>}
    {summary && <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Metric tone="text-orange-700" icon={<FiClock />} label="Đang giữ / xử lý" value={amount(summary.processingAmount)} /><Metric tone="text-emerald-700" icon={<FiCheckCircle />} label="Đã chi trả" value={amount(summary.paidAmount)} /><Metric tone="text-rose-700" icon={<FiAlertCircle />} label="Chờ xử lý" value={String(count("PENDING"))} /></div>
      <FinanceCharts bars={transferBars} slices={payoutSlices(payouts)} title="Giải ngân theo ngày" subtitle="Các ngày có giao dịch chuyển tiền đã được xác nhận" series={["Đã chi trả"]} />
      <div><section className="rounded-2xl border app-border app-bg-card p-5"><h3 className="font-bold app-text-main">Cần xử lý</h3><div className="mt-3 divide-y app-border">{[["PENDING", "Chờ duyệt"], ["APPROVED", "Đã duyệt · chờ chuyển"], ["NEEDS_VERIFICATION", "Cần xác minh"], ["DISPUTE", "Tạm giữ để kiểm tra"]].map(([key, label]) => <button key={key} onClick={() => onOpenQueue(key as PayoutStatus)} className="flex w-full items-center justify-between py-3 text-left text-sm hover:text-[#005cff]"><span>{label}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold">{count(key)}</span></button>)}</div></section></div>
    </>}
  </div>;
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  const chip = tone.includes("emerald") ? "bg-emerald-50" : tone.includes("orange") ? "bg-orange-50" : tone.includes("rose") ? "bg-rose-50" : "bg-blue-50";
  return <div className="rounded-xl border app-border app-bg-card p-5"><div className="flex items-center justify-between gap-2"><span className="text-sm app-text-muted">{label}</span><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${chip} ${tone}`}>{icon}</span></div><div className={`mt-3 text-xl font-bold ${tone}`}>{value}</div></div>;
}

export default FinanceOverview;
