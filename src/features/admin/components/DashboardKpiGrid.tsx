import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiActivity, FiAlertOctagon, FiArrowUpRight, FiCheckSquare, FiCreditCard, FiPackage, FiRefreshCw, FiShoppingBag, FiTag, FiThumbsUp } from "react-icons/fi";
import { PATHS } from "@/routes/paths";
import { getLocale } from "@/i18n";
import { aiApi } from "@/services/aiApi";
import type { DashboardKpis, RiskAgreementResponse } from "@/types/ai";

interface DashboardKpiGridProps {
  kpis: DashboardKpis | null;
  state: "loading" | "ready" | "error";
  onRetry: () => void;
}

interface CardProps {
  id: string;
  title: string;
  value: string | null;
  detail?: string | null;
  link: string;
  icon: React.ReactNode;
  warn?: boolean;
}

function KpiCard({ id, title, value, detail, link, icon, warn }: CardProps) {
  const { t } = useTranslation();
  return (
    <Link
      to={link}
      data-testid={`kpi-${id}`}
      className="group flex flex-col justify-between space-y-3 rounded-lg border border-slate-200 p-4 shadow-xs transition-all hover:border-blue-500 app-bg-card dark:border-slate-800"
    >
      <div className="flex items-start justify-between">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/60">{icon}</div>
        <FiArrowUpRight className="h-4 w-4 text-blue-600 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 dark:text-blue-400" aria-hidden="true" />
      </div>
      <div className="space-y-0.5">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{title}</span>
        {/* a missing figure is "no data", never 0 */}
        <div className={`text-xl font-extrabold tracking-tight ${value === null ? "text-slate-400 dark:text-slate-500" : warn ? "text-rose-600 dark:text-rose-400" : "app-text-main"}`}>
          {value ?? t("ai.dash.noData")}
        </div>
      </div>
      {detail && <p className="border-t border-slate-200 pt-2 text-[11px] font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">{detail}</p>}
    </Link>
  );
}

const num = (value: number | null | undefined): string | null => (typeof value === "number" && Number.isFinite(value) ? value.toLocaleString(getLocale()) : null);

/** KPI cards from GET /admin/dashboard/kpis. Every card whose source failed shows "No data", never 0. */
export function DashboardKpiGrid({ kpis, state, onRetry }: DashboardKpiGridProps) {
  const { t } = useTranslation();

  if (state === "loading" && !kpis) {
    return (
      <div role="status" aria-busy="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40" />)}
      </div>
    );
  }
  if (!kpis) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-300 bg-rose-50 p-4 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
        <span>{t("ai.dash.kpiError")}</span>
        <button type="button" onClick={onRetry} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-rose-400 px-3 font-bold hover:bg-rose-100 dark:hover:bg-rose-900/40">
          <FiRefreshCw className="h-3.5 w-3.5" aria-hidden="true" />{t("ai.action.retry")}
        </button>
      </div>
    );
  }

  const pending = kpis.pending_events;
  const resale = kpis.resale_pending;
  const orders = kpis.transactions_7d;
  const services = kpis.services;
  const downSources = Object.entries(kpis.sources ?? {}).filter(([, status]) => status !== "ok").map(([name]) => name);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard id="pending" title={t("ai.dash.kpi.pending")} link={PATHS.ADMIN_EVENTS_APPROVAL} icon={<FiCheckSquare className="h-5 w-5 text-amber-500" aria-hidden="true" />}
          value={pending ? num(pending.total) : null}
          detail={pending ? t("ai.dash.kpi.pendingDetail", { high: pending.by_risk.HIGH, medium: pending.by_risk.MEDIUM, low: pending.by_risk.LOW, unassessed: pending.by_risk.UNASSESSED }) : null} />
        <KpiCard id="live" title={t("ai.dash.kpi.live")} link={PATHS.ADMIN_EVENTS_APPROVAL} icon={<FiTag className="h-5 w-5 text-emerald-500" aria-hidden="true" />} value={num(kpis.live_events)} />
        <KpiCard id="resale" title={t("ai.dash.kpi.resale")} link={PATHS.ADMIN_RESALE_TICKETS} icon={<FiShoppingBag className="h-5 w-5 text-purple-500" aria-hidden="true" />}
          value={resale ? num(resale.count) : null}
          detail={resale && resale.count > 0 && resale.oldest_hours !== null ? t("ai.dash.kpi.resaleDetail", { hours: Math.round(resale.oldest_hours) }) : null} />
        <KpiCard id="orders" title={t("ai.dash.kpi.orders")} link={PATHS.ADMIN_RECONCILIATION} icon={<FiCreditCard className="h-5 w-5 text-blue-500" aria-hidden="true" />}
          value={orders ? num(orders.orders_total) : null}
          detail={orders ? t("ai.dash.kpi.revenue", { amount: num(orders.revenue_total) }) : null} />
        <KpiCard id="late" title={t("ai.dash.kpi.late")} link={PATHS.ADMIN_RECONCILIATION} icon={<FiAlertOctagon className="h-5 w-5 text-rose-500" aria-hidden="true" />}
          value={num(kpis.late_payments_open)} warn={(kpis.late_payments_open ?? 0) > 0} />
        <KpiCard id="paid-no-tickets" title={t("ai.dash.kpi.paidNoTickets")} link={PATHS.ADMIN_RECONCILIATION} icon={<FiPackage className="h-5 w-5 text-rose-500" aria-hidden="true" />}
          value={num(kpis.paid_without_tickets)} warn={(kpis.paid_without_tickets ?? 0) > 0} />
        <KpiCard id="stock" title={t("ai.dash.kpi.stock")} link={PATHS.ADMIN_RECONCILIATION} icon={<FiPackage className="h-5 w-5 text-amber-500" aria-hidden="true" />}
          value={num(kpis.stock_discrepancies)} warn={(kpis.stock_discrepancies ?? 0) > 0} />
        <KpiCard id="services" title={t("ai.dash.kpi.services")} link={PATHS.ADMIN_SYSTEM_HEALTH} icon={<FiActivity className="h-5 w-5 text-indigo-500" aria-hidden="true" />}
          value={services ? t("ai.dash.kpi.servicesValue", { up: services.up, total: services.total }) : null}
          warn={Boolean(services && services.down.length > 0)}
          detail={services && services.down.length > 0 ? t("ai.dash.kpi.servicesDown", { names: services.down.join(", ") }) : null} />
      </div>
      {downSources.length > 0 && (
        <p role="note" className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">{t("ai.dash.kpi.sourcesDown", { names: downSources.join(", ") })}</p>
      )}
    </div>
  );
}

/** How often the AI suggestion matched the admin's decision (HIGH vs rejected, LOW vs approved). */
export function AgreementCard({ days = 30 }: { days?: number }) {
  const { t } = useTranslation();
  const [data, setData] = useState<RiskAgreementResponse | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    aiApi.getRiskAgreement(days).then((value) => { if (!cancelled) setData(value); }).catch(() => { if (!cancelled) setData(null); });
    return () => { cancelled = true; };
  }, [days]);

  const counted = data ? data.agree + data.disagree : 0;
  const value = data && counted > 0 ? t("ai.agree.value", { agree: data.agree, counted }) : null;
  return (
    <div data-testid="agreement-card" className="space-y-1 rounded-lg border border-slate-200 p-4 shadow-xs app-bg-card dark:border-slate-800">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400"><FiThumbsUp className="h-4 w-4 text-emerald-500" aria-hidden="true" />{t("ai.agree.title", { days })}</div>
      <div className={`text-xl font-extrabold ${value ? "app-text-main" : "text-slate-400 dark:text-slate-500"}`}>{data === undefined ? "…" : value ?? (data ? t("ai.agree.none") : t("ai.dash.noData"))}</div>
      {data && <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("ai.agree.detail", { neutral: data.neutral, pending: data.pending })}</p>}
    </div>
  );
}

export default DashboardKpiGrid;
