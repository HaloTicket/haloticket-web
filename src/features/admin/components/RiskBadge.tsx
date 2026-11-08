import { useTranslation } from "react-i18next";
import type { AiRiskScoreResponse } from "@/types/ai";

type BadgeSource = Pick<AiRiskScoreResponse, "risk_level" | "risk_score" | "complete" | "coverage">;

interface RiskBadgeProps {
  assessment?: BadgeSource | null;
  /** Show the 0-100 score next to the level. */
  showScore?: boolean;
  className?: string;
}

const LEVEL_CLASS: Record<string, string> = {
  HIGH: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
  MEDIUM: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  LOW: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
};
const NEUTRAL_CLASS = "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300";

/**
 * Risk level badge shared by the review queue and the detail page.
 * A LOW level from an incomplete assessment is never drawn green: it is a neutral dashed "Low (incomplete)".
 */
export function RiskBadge({ assessment, showScore = false, className = "" }: RiskBadgeProps) {
  const { t } = useTranslation();
  if (!assessment) {
    return <span className={`inline-flex items-center rounded-full border border-dashed px-2 py-0.5 text-[11px] font-bold ${NEUTRAL_CLASS} ${className}`}>{t("ai.risk.unscored")}</span>;
  }
  const level = String(assessment.risk_level).toUpperCase();
  const incompleteLow = level === "LOW" && assessment.complete === false;
  const known = level in LEVEL_CLASS;
  const aiMissing = assessment.coverage ? assessment.coverage.ai !== "ran" : false;
  const base = incompleteLow || !known ? `${NEUTRAL_CLASS} border-dashed` : LEVEL_CLASS[level];
  const text = incompleteLow ? t("ai.risk.lowIncomplete") : known ? t(`ai.risk.level.${level}`) : t("ai.risk.unscored");

  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      <span
        data-testid="risk-badge"
        data-level={level}
        data-incomplete={incompleteLow ? "true" : "false"}
        title={incompleteLow ? t("ai.risk.lowIncompleteHint") : undefined}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-extrabold ${base}`}
      >
        {text}
        {showScore && Number.isFinite(assessment.risk_score) && <span className="font-black">{assessment.risk_score}</span>}
      </span>
      {aiMissing && (
        <span data-testid="risk-ai-chip" className="inline-flex items-center rounded-full border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
          {t("ai.risk.notRun")}
        </span>
      )}
    </span>
  );
}

export default RiskBadge;
