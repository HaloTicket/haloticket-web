import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { countIssues, type SeatMapIssue } from '../../seatMapValidation';

interface SeatMapIssuesPanelProps {
  issues: SeatMapIssue[];
  isOpen: boolean;
  onToggle: () => void;
  /** Clicking an issue selects and scrolls to the element it concerns. */
  onSelectIssue: (issue: SeatMapIssue) => void;
}

// "Check before publishing": a summary bar that opens into the list of problems found in the layout
export const SeatMapIssuesPanel: React.FC<SeatMapIssuesPanelProps> = ({ issues, isOpen, onToggle, onSelectIssue }) => {
  const { t } = useTranslation();
  const { errors, warnings } = countIssues(issues);
  const clean = issues.length === 0;

  return (
    <div className="rounded-xl border app-border app-bg-card overflow-hidden" data-testid="seatmap-issues-panel">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-3 px-4 py-2 text-xs font-bold app-text-main hover:bg-slate-500/5 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2 flex-wrap">
          {clean ? (
            <FiCheckCircle className="w-4 h-4 text-emerald-500" />
          ) : errors > 0 ? (
            <FiAlertCircle className="w-4 h-4 text-rose-500" />
          ) : (
            <FiAlertTriangle className="w-4 h-4 text-amber-500" />
          )}
          <span>{t('Kiểm tra trước khi xuất bản')}</span>
          {clean ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px]">
              {t('Không có vấn đề')}
            </span>
          ) : (
            <>
              {errors > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px]">
                  {errors} {t('lỗi')}
                </span>
              )}
              {warnings > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px]">
                  {warnings} {t('cảnh báo')}
                </span>
              )}
            </>
          )}
        </span>
        {isOpen ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
      </button>

      {isOpen && (
        <ul className="max-h-56 overflow-y-auto divide-y app-border border-t app-border">
          {clean && <li className="px-4 py-3 text-xs app-text-muted">{t('Sơ đồ đã sẵn sàng để xuất bản.')}</li>}
          {issues.map((issue) => (
            <li key={issue.id}>
              <button
                type="button"
                onClick={() => onSelectIssue(issue)}
                disabled={!issue.target}
                className="w-full flex items-start gap-2.5 px-4 py-2 text-left text-xs app-text-main hover:bg-slate-500/5 transition-colors cursor-pointer disabled:cursor-default"
              >
                {issue.severity === 'error' ? (
                  <FiAlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-px" aria-label={t('Lỗi')} />
                ) : (
                  <FiAlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-px" aria-label={t('Cảnh báo')} />
                )}
                <span className="flex-1">{t(issue.template, issue.params)}</span>
                {issue.target && <span className="text-[10px] font-bold text-blue-500 shrink-0">{t('Đến vị trí')}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
