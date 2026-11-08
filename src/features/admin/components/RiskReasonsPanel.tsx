import { useTranslation } from "react-i18next";
import { FiRefreshCw, FiShield } from "react-icons/fi";
import { getLocale } from "@/i18n";
import type { AiRiskScoreResponse, RiskLayer, RiskReasonItem } from "@/types/ai";
import { RiskBadge } from "./RiskBadge";

interface RiskReasonsPanelProps {
  assessment: AiRiskScoreResponse;
  onRefresh: () => void;
  refreshing?: boolean;
}

const LAYERS: RiskLayer[] = ["RULE", "SIGNAL", "AI"];

function formatTime(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString(getLocale(), { dateStyle: "short", timeStyle: "short" }) : null;
}

/** "Why" panel: every reason of the assessment grouped by layer, with the quoted evidence, coverage and a re-score button. */
export function RiskReasonsPanel({ assessment, onRefresh, refreshing = false }: RiskReasonsPanelProps) {
  const { t } = useTranslation();
  const items: RiskReasonItem[] = assessment.reason_items ?? [];
  const coverage = assessment.coverage;
  const rulesDown = coverage ? coverage.rules === false : false;
  const time = formatTime(assessment.assessed_at);
  const hasFindings = items.some((item) => item.status !== "not_assessed");

  // The old contract only has plain strings; show them when the server sent no structured items.
  const legacyReasons = items.length === 0 ? assessment.reasons ?? [] : [];

  return (
    <section aria-label={t("ai.risk.why")} className="space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex flex-wrap items-center gap-2 text-sm font-bold app-text-main">
          <FiShield className="h-4 w-4 text-blue-500" aria-hidden="true" />
          <span>{t("ai.risk.title")}</span>
          <RiskBadge assessment={assessment} showScore />
        </h4>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          title={t("ai.risk.rescoreTitle")}
          className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border app-border app-bg-card px-2.5 py-1 text-[11px] font-bold text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
        >
          <FiRefreshCw className={`h-3 w-3 ${refreshing ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
          <span>{t("ai.risk.rescore")}</span>
        </button>
      </div>

      <h5 className="text-[11px] font-extrabold uppercase tracking-wider app-text-muted">{t("ai.risk.why")}</h5>

      {rulesDown && <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-2 font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{t("ai.risk.rulesUnavailable")}</p>}

      {!hasFindings && legacyReasons.length === 0 && !rulesDown && <p className="app-text-muted">{t("ai.risk.noReasons")}</p>}

      {legacyReasons.length > 0 && (
        <ul className="list-inside list-disc space-y-0.5 app-text-muted">
          {legacyReasons.map((reason, index) => <li key={index}>{reason}</li>)}
        </ul>
      )}

      {LAYERS.map((layer) => {
        const group = items.filter((item) => item.layer === layer);
        if (group.length === 0) return null;
        return (
          <div key={layer} data-layer={layer} className="space-y-1.5">
            <p className="font-bold app-text-main">{t(`ai.risk.layer.${layer}`)}</p>
            <ul className="space-y-1.5">
              {group.map((item) => {
                const muted = item.status === "not_assessed";
                return (
                  <li key={`${item.code}-${item.message}`} className={`rounded-lg border app-border p-2 ${muted ? "bg-slate-50 opacity-75 dark:bg-slate-900/40" : "app-bg-card"}`}>
                    <p className={muted ? "app-text-muted" : "font-semibold app-text-main"}>
                      {muted ? `${t("ai.risk.notAssessed")}: ${item.code.replace(/^UNAVAILABLE:/, "")}` : item.message}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] app-text-muted">
                      {item.code}
                      {!muted && item.weight > 0 ? ` · +${item.weight}` : ""}
                    </p>
                    {!muted && (item.evidence ?? []).length > 0 && (
                      <ul className="mt-1 space-y-0.5" aria-label={t("ai.risk.evidence")}>
                        {(item.evidence ?? []).map((piece, index) => (
                          <li key={index} className="break-words">
                            <q className="rounded bg-amber-100/70 px-1 text-slate-900 dark:bg-amber-400/20 dark:text-amber-100">{piece.text}</q>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <div className="space-y-0.5 border-t app-border pt-2 app-text-muted">
        {coverage && (
          <p>{t("ai.risk.coverage", { assessed: coverage.signals.assessed, total: coverage.signals.total, ai: t(`ai.risk.ai.${coverage.ai}`) })}</p>
        )}
        <p>
          {[assessment.ruleset_version ? t("ai.risk.ruleset", { version: assessment.ruleset_version }) : null, time ? t("ai.risk.assessedAt", { time }) : null, assessment.cached ? t("ai.risk.cached") : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="font-semibold">{t("ai.risk.advisory")}</p>
      </div>
    </section>
  );
}

export default RiskReasonsPanel;
