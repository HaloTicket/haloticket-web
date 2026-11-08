import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { FiAlertTriangle, FiCheckCircle, FiChevronRight, FiRefreshCw } from "react-icons/fi";
import { getLocale } from "@/i18n";
import { aiApi } from "@/services/aiApi";
import type { AttentionItem, AttentionResponse } from "@/types/ai";

const PRIORITY_CLASS: Record<string, string> = {
  CRITICAL: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
  HIGH: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  MEDIUM: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
};

const KNOWN_EVIDENCE = new Set(["risk_score", "hours_waiting", "amount", "kind", "minutes_open", "expected_tickets", "issued_tickets", "minutes_since_paid", "count", "oldest_hours", "port"]);

/** One short line of evidence from the server's evidence object (known keys only, each with a translated label). */
function evidenceLine(evidence: Record<string, unknown>, t: TFunction): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(evidence ?? {})) {
    if (key === "reasons" && Array.isArray(value) && typeof value[0] === "string") parts.push(value[0]);
    else if (KNOWN_EVIDENCE.has(key) && (typeof value === "string" || typeof value === "number")) parts.push(t(`ai.attn.ev.${key}`, { v: value }));
  }
  return parts.join(" · ");
}

function sinceText(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString(getLocale(), { dateStyle: "short", timeStyle: "short" }) : null;
}

/** "Needs attention": rule-based items from GET /admin/attention (no AI), each with evidence, priority and a link. */
export function AttentionFeed() {
  const { t } = useTranslation();
  const [data, setData] = useState<AttentionResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      setData(await aiApi.getAttention());
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void load(); });
  }, [load]);

  const unavailable = Object.entries(data?.sources ?? {}).filter(([, status]) => status !== "ok").map(([name]) => t(`ai.attn.source.${name}`, { defaultValue: name }));

  return (
    <section aria-label={t("ai.attn.title")} className="space-y-3 rounded-lg border border-slate-200 p-5 shadow-xs app-bg-card dark:border-slate-800">
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold app-text-main"><FiAlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />{t("ai.attn.title")}</h3>
          <p className="mt-0.5 text-xs app-text-muted">{t("ai.attn.subtitle")}</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={state === "loading"} aria-label={t("Làm mới")} className="cursor-pointer rounded-md border border-slate-200 p-2 hover:border-blue-500 disabled:opacity-50 dark:border-slate-700">
          <FiRefreshCw className={`h-3.5 w-3.5 ${state === "loading" ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
        </button>
      </div>

      {state === "loading" && !data ? (
        <p role="status" className="py-4 text-center text-xs app-text-muted">{t("ai.chat.thinking")}</p>
      ) : state === "error" ? (
        <div role="alert" className="space-y-2 py-2 text-xs">
          <p className="font-semibold text-rose-600 dark:text-rose-400">{t("ai.attn.error")}</p>
          <button type="button" onClick={() => void load()} className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 font-bold hover:border-blue-500 dark:border-slate-600">{t("ai.action.retry")}</button>
        </div>
      ) : (
        <>
          {data && data.items.length === 0 && unavailable.length === 0 && (
            <p className="flex items-center justify-center gap-2 py-4 text-xs font-semibold app-text-muted"><FiCheckCircle className="h-4 w-4 text-emerald-500" aria-hidden="true" />{t("ai.attn.empty")}</p>
          )}
          <ul className="space-y-2">
            {(data?.items ?? []).map((item: AttentionItem) => {
              const evidence = evidenceLine(item.evidence, t);
              const since = sinceText(item.since);
              return (
                <li key={item.id} data-testid="attention-item" className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span data-priority={item.priority} className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${PRIORITY_CLASS[item.priority] ?? PRIORITY_CLASS.MEDIUM}`}>{t(`ai.attn.priority.${item.priority}`, { defaultValue: item.priority })}</span>
                      <span className="break-words font-bold app-text-main">{item.title}</span>
                    </div>
                    {(evidence || since) && <p className="break-words app-text-muted">{[evidence, since ? t("ai.attn.since", { time: since }) : null].filter(Boolean).join(" · ")}</p>}
                  </div>
                  <Link to={item.link} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-md bg-blue-600 px-3 font-bold text-white hover:bg-blue-700">
                    {t("ai.attn.open")}<FiChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
          {unavailable.length > 0 && <p role="note" className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">{t("ai.attn.sourcesDown", { names: unavailable.join(", ") })}</p>}
        </>
      )}
    </section>
  );
}

export default AttentionFeed;
