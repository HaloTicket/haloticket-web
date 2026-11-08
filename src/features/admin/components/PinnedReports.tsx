import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiBookmark, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import { toast } from "sonner";
import { getLocale } from "@/i18n";
import { aiApi } from "@/services/aiApi";
import type { PinData, PinnedReport } from "@/types/ai";

const MAX_TABLE_ROWS = 8;
const MAX_TABLE_COLUMNS = 4;

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return value.toLocaleString(getLocale());
  return String(value);
}

function stamp(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString(getLocale(), { dateStyle: "short", timeStyle: "short" }) : "";
}

/** A label + one number per row reads best as bars; everything else is a small table. */
function Rows({ rows, chartType }: { rows: Record<string, unknown>[]; chartType: string }) {
  const { t } = useTranslation();
  if (rows.length === 0) return <p className="py-3 text-xs app-text-muted">{t("ai.pin.noRows")}</p>;
  const columns = Object.keys(rows[0]).slice(0, MAX_TABLE_COLUMNS);
  const numeric = columns.filter((column) => rows.every((row) => typeof row[column] === "number"));
  const labelColumn = columns.find((column) => !numeric.includes(column));
  if (chartType !== "table" && labelColumn && numeric.length >= 1) {
    const valueColumn = numeric[0];
    const max = Math.max(...rows.map((row) => Math.abs(Number(row[valueColumn]))), 1);
    return (
      <ul className="space-y-1.5" data-testid="pin-bars">
        {rows.slice(0, MAX_TABLE_ROWS).map((row, index) => (
          <li key={index} className="space-y-0.5 text-xs">
            <div className="flex justify-between gap-2"><span className="truncate app-text-main">{formatCell(row[labelColumn])}</span><span className="font-bold app-text-main">{formatCell(row[valueColumn])}</span></div>
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${Math.max(2, (Math.abs(Number(row[valueColumn])) / max) * 100)}%` }} /></div>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs" data-testid="pin-table">
        <thead><tr className="border-b border-slate-200 app-text-muted dark:border-slate-800">{columns.map((column) => <th key={column} className="px-2 py-1.5 font-bold">{column}</th>)}</tr></thead>
        <tbody>{rows.slice(0, MAX_TABLE_ROWS).map((row, index) => <tr key={index} className="border-b border-slate-100 dark:border-slate-800/60">{columns.map((column) => <td key={column} className="px-2 py-1.5 app-text-main">{formatCell(row[column])}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function PinCard({ pin, onDeleted }: { pin: PinnedReport; onDeleted: (pinId: string) => void }) {
  const { t } = useTranslation();
  const [data, setData] = useState<PinData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setData(await aiApi.getPinData(pin.pin_id));
      setState("ready");
    } catch {
      setState("error");
    }
  }, [pin.pin_id]);

  useEffect(() => {
    queueMicrotask(() => { void load(); });
  }, [load]);

  const remove = async () => {
    setDeleting(true);
    try {
      await aiApi.deletePin(pin.pin_id);
      onDeleted(pin.pin_id);
    } catch {
      toast.error(t("ai.pin.deleteFailed"));
      setDeleting(false);
    }
  };

  return (
    <article className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50" data-testid="pinned-report">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-xs font-bold app-text-main" title={pin.question || pin.title}>{pin.title}</h4>
          {state === "ready" && data && !data.live && (
            <span data-testid="pin-stale" className="mt-0.5 inline-block rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              {t("ai.pin.stale", { time: stamp(data.snapshot_at ?? pin.created_at) })}
            </span>
          )}
        </div>
        <button type="button" onClick={() => void remove()} disabled={deleting} aria-label={`${t("ai.pin.delete")}: ${pin.title}`} className="shrink-0 cursor-pointer rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-rose-400 hover:text-rose-600 disabled:opacity-50 dark:border-slate-700">
          <FiTrash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </header>
      {state === "loading" ? (
        <p role="status" className="py-2 text-xs app-text-muted">{t("ai.pin.rowsLoading")}</p>
      ) : state === "error" || !data ? (
        <div role="alert" className="space-y-1.5 text-xs">
          <p className="text-rose-600 dark:text-rose-400">{t("ai.pin.rowsError")}</p>
          <button type="button" onClick={() => void load()} className="cursor-pointer rounded-md border border-slate-300 px-2.5 py-1 font-bold hover:border-blue-500 dark:border-slate-600">{t("ai.action.retry")}</button>
        </div>
      ) : (
        <Rows rows={data.rows} chartType={data.chart_type || pin.chart_type} />
      )}
    </article>
  );
}

/** Reports the admin pinned from the AI data analysis page. Each one is read again without calling the model. */
export function PinnedReports() {
  const { t } = useTranslation();
  const [pins, setPins] = useState<PinnedReport[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      setPins((await aiApi.getPins()).pins);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void load(); });
  }, [load]);

  return (
    <section aria-label={t("ai.pin.title")} className="space-y-3 rounded-lg border border-slate-200 p-5 shadow-xs app-bg-card dark:border-slate-800">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
        <h3 className="flex items-center gap-2 text-sm font-bold app-text-main"><FiBookmark className="h-4 w-4 text-purple-500" aria-hidden="true" />{t("ai.pin.title")}</h3>
        <button type="button" onClick={() => void load()} aria-label={t("Làm mới")} className="cursor-pointer rounded-md border border-slate-200 p-2 hover:border-blue-500 dark:border-slate-700"><FiRefreshCw className={`h-3.5 w-3.5 ${state === "loading" ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" /></button>
      </div>
      {state === "loading" ? (
        <p role="status" className="py-4 text-center text-xs app-text-muted">{t("ai.pin.rowsLoading")}</p>
      ) : state === "error" ? (
        <div role="alert" className="space-y-2 text-xs">
          <p className="font-semibold text-rose-600 dark:text-rose-400">{t("ai.pin.error")}</p>
          <button type="button" onClick={() => void load()} className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 font-bold hover:border-blue-500 dark:border-slate-600">{t("ai.action.retry")}</button>
        </div>
      ) : pins.length === 0 ? (
        <p className="py-4 text-center text-xs app-text-muted">{t("ai.pin.empty")}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {pins.map((pin) => <PinCard key={pin.pin_id} pin={pin} onDeleted={(id) => setPins((current) => current.filter((item) => item.pin_id !== id))} />)}
        </div>
      )}
    </section>
  );
}

export default PinnedReports;
