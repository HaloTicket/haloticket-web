import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ComparisonMatrixSpec, ProgressThresholdTone } from "./organizerAnalyticsModel";

interface OrganizerComparisonTableProps {
  matrix: ComparisonMatrixSpec;
  ariaLabel?: string;
  testId?: string;
}

function progressToneClass(tone: ProgressThresholdTone): string {
  if (tone === "high") return "bg-emerald-500";
  if (tone === "medium") return "bg-blue-500";
  return "bg-amber-500";
}

/**
 * Bảng ma trận so sánh cuộn ngang với cột đầu tiên ghim dính (`sticky left-0`),
 * các ô số căn phải `tabular-nums`, thanh tiến độ theo ngưỡng cho `%` và liên kết quản lý hợp lệ.
 */
export const OrganizerComparisonTable: React.FC<OrganizerComparisonTableProps> = ({
  matrix,
  ariaLabel,
  testId,
}) => {
  const { t, i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));

  const entityHeader = t(matrix.entityHeaderKey, {
    defaultValue: isEn ? matrix.entityHeaderEn : matrix.entityHeaderVi,
  });

  const tableLabel =
    ariaLabel ||
    t("ai.organizer.analytics.comparisonTableAria", {
      defaultValue: isEn ? "Comparison data table" : "Bảng đối chiếu số liệu",
    });

  return (
    <div
      data-testid={testId}
      role="region"
      aria-label={tableLabel}
      tabIndex={0}
      className="max-w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-[#1e1e22] focus-visible:outline-2 focus-visible:outline-brand-primary"
    >
      <table className="w-full min-w-max border-separate border-spacing-0 text-xs">
        <thead>
          <tr className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
            <th
              scope="col"
              className="sticky left-0 z-10 bg-gray-50 dark:bg-[#202024] px-3 py-2 text-left border-b border-r border-gray-200 dark:border-gray-700/80 whitespace-nowrap"
            >
              {entityHeader}
            </th>
            {matrix.columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`bg-gray-50 dark:bg-[#202024] px-3 py-2 border-b border-gray-200 dark:border-gray-700/80 whitespace-nowrap ${
                  col.isNumeric ? "text-right" : "text-left"
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row, rIdx) => {
            const isLast = rIdx === matrix.rows.length - 1;
            const borderB = isLast ? "" : "border-b border-gray-100 dark:border-gray-800";
            return (
              <tr
                key={row.id}
                data-testid={row.kind ? `chat-result-card-${row.kind}` : undefined}
                className="group hover:bg-gray-50/80 dark:hover:bg-[#27272a]/70 transition-colors motion-reduce:transition-none"
              >
                <th
                  scope="row"
                  className={`sticky left-0 z-10 bg-white dark:bg-[#1e1e22] group-hover:bg-gray-50 dark:group-hover:bg-[#27272a] px-3 py-2 text-left align-top border-r border-gray-200 dark:border-gray-700/80 max-w-52 sm:max-w-64 ${borderB}`}
                >
                  <div className="font-semibold text-gray-900 dark:text-gray-100 break-words leading-snug">
                    {row.label}
                  </div>
                  {row.subtitle && (
                    <div className="text-[10px] font-normal text-gray-400 dark:text-gray-400 mt-0.5">
                      {row.subtitle}
                    </div>
                  )}
                  {row.manageLink && (
                    <Link
                      to={row.manageLink.href}
                      className="mt-1 inline-flex items-center text-[11px] font-medium text-brand-primary hover:underline"
                    >
                      {t(row.manageLink.labelKey, {
                        defaultValue: isEn ? row.manageLink.defaultEn : row.manageLink.defaultVi,
                      })}
                    </Link>
                  )}
                </th>
                {matrix.columns.map((col) => {
                  const cell = row.cells[col.key];
                  return (
                    <td
                      key={col.key}
                      className={`px-3 py-2 align-top whitespace-nowrap ${
                        col.isNumeric ? "text-right tabular-nums" : "text-left"
                      } ${borderB}`}
                    >
                      <div className="inline-flex flex-col items-end gap-1 min-w-18">
                        <span
                          className={
                            cell?.value === null
                              ? "text-gray-400 dark:text-gray-500 font-normal"
                              : "font-semibold text-gray-900 dark:text-gray-100"
                          }
                        >
                          {cell?.formatted ?? "—"}
                        </span>
                        {cell?.completeness === "partial" && cell.value !== null && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium">
                            {t("ai.organizer.completeness.partial", {
                              defaultValue: isEn ? "Partial" : "Một phần",
                            })}
                          </span>
                        )}
                        {cell?.progress && (
                          <div
                            role="progressbar"
                            aria-label={`${row.label} - ${col.label}`}
                            aria-valuenow={Math.round(cell.progress.clampedValue * 10) / 10}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            className="w-20 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
                          >
                            <div
                              className={`h-full rounded-full transition-all duration-200 motion-reduce:transition-none ${progressToneClass(
                                cell.progress.tone,
                              )}`}
                              style={{ width: `${cell.progress.clampedValue}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default OrganizerComparisonTable;
