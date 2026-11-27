import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { OrganizerChatMessage } from '@/types/ai';
import {
  Copy,
  Check,
  TrendingUp,
  Ticket,
  DollarSign,
  Users,
  AlertTriangle,
  FileText,
  Download,
  ChevronDown,
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { ChatMessageTime } from '../ChatMessageTime';
import {
  buildCardsComparisonMatrix,
  buildKpiCards,
  deriveInlineChartSpec,
  findPrimaryChartableDataTable,
  formatMessageTime,
  formatMetricValue,
  formatRawUnitValue,
  getPercentProgressMeta,
  inferColumnUnit,
  normalizeVietnameseQuery,
  resolveColumnDisplayLabel,
  resolveWarningActionLink,
  type ComparisonColumn,
  type ComparisonMatrixSpec,
  type ComparisonRow,
} from './organizerAnalyticsModel';
import {
  downloadAnalyticsCsv,
  downloadAnalyticsXlsx,
  type AnalyticsExportColumn,
} from './organizerAnalyticsExport';
import { OrganizerInlineChart } from './OrganizerInlineChart';
import { OrganizerComparisonTable } from './OrganizerComparisonTable';

/** Props của bong bóng tin nhắn trợ lý tổ chức. */
export interface OrganizerAIChatMessageProps {
  message: OrganizerChatMessage;
  question?: string;
  onChooseFollowUp?: (text: string) => void;
  isExpanded?: boolean;
}

const GFM_TABLE_REGEX = /(?:^|\n)\|[^\n]+\|\s*\n\|[\s:|-]+\|/m;
const BREAKDOWN_QUERY = /\b(so sanh|bieu do|bang so lieu|bang thong ke|chi tiet|theo ngay|tung ngay|theo tung|theo su kien|theo hang ve|theo suat|ban chay|ban cham|cao nhat|nhieu nhat|co cau|ty trong|phan bo|compare|chart|table|trend|breakdown|by day|by event|by showtime|best|most|highest|lowest|slow)\b/;
const VALID_ORGANIZER_HREF = /^\/organizer(?:\/|$)/;

/** Turn chat-style bullets into Markdown while keeping literal examples in code. */
function normalizeReplyBullets(reply: string) {
  let fence: string | undefined;
  return reply.split(/\r?\n/).map((line) => {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      if (marker && marker[1].startsWith(fence) && !marker[2].trim()) fence = undefined;
      return line;
    }
    if (marker) {
      fence = marker[1];
      return line;
    }
    if (!/^ {0,3}•[ \t]+\S/.test(line)) return line;

    const indent = line.slice(0, line.indexOf('•'));
    return line.trimStart().replace(/(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)|(^|[ \t]+)•[ \t]+(?=\S)/g,
      (match: string, codeSpan: string | undefined, separator: string | undefined) =>
        codeSpan ? match : `${separator ? '\n' : ''}${indent}- `);
  }).join('\n');
}

/**
 * Bong bóng tin nhắn giàu nội dung trong khung chat trợ lý AI của ban tổ chức.
 * Hiển thị Markdown (bảng sticky cột đầu), dải KPI 2x2 mở sẵn kèm chênh lệch kỳ,
 * biểu đồ tương tác Recharts (`OrganizerInlineChart`), ma trận so sánh sticky,
 * cảnh báo mở sẵn với liên kết điều hướng hợp lệ, bản nháp sao chép được,
 * các widget hành động cũ và chân bong bóng sao chép + giờ `HH:mm`.
 */
export const OrganizerAIChatMessage: React.FC<OrganizerAIChatMessageProps> = ({
  message,
  question = '',
  onChooseFollowUp,
  isExpanded = false,
}) => {
  const { t, i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith('en'));

  const [copiedReply, setCopiedReply] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedDraftIndex, setCopiedDraftIndex] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsId = useId();

  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
      if (codeTimerRef.current) clearTimeout(codeTimerRef.current);
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, []);

  const isUser = message.sender === 'user';
  const showAnalytics = !isUser && message.showAnalytics !== false;
  const showBreakdown = showAnalytics &&
    (message.showAnalytics == null || BREAKDOWN_QUERY.test(normalizeVietnameseQuery(question)));
  const warnings = showAnalytics ? message.warnings : undefined;

  const metricLabel = useCallback(
    (key: string) =>
      t(`ai.organizer.metric.${key}`, {
        defaultValue: key.replace(/_/g, ' '),
      }),
    [t],
  );

  const kpiCards = useMemo(
    () => (showAnalytics ? buildKpiCards(message.totals, message.cards, isEn) : []),
    [showAnalytics, message.totals, message.cards, isEn],
  );

  const primaryDataTable = useMemo(
    () => (isUser ? null : findPrimaryChartableDataTable(message.actions)),
    [isUser, message.actions],
  );

  const inlineChartSpec = useMemo(() => {
    if (!showBreakdown && !(showAnalytics && primaryDataTable)) return null;
    return deriveInlineChartSpec({
      cards: message.cards,
      totals: message.totals,
      tableRows: primaryDataTable?.rows,
      consumedActionIndex: primaryDataTable?.actionIndex,
      question,
      isEn,
      translateMetric: metricLabel,
      dateColumnLabel: t('ai.organizer.analytics.dateColumn', {
        defaultValue: isEn ? 'Date' : 'Ngày',
      }),
      periodLabels: {
        current: t('ai.organizer.periodCurrent', {
          defaultValue: isEn ? 'Current period' : 'Kỳ hiện tại',
        }),
        previous: t('ai.organizer.periodPrevious', {
          defaultValue: isEn ? 'Previous period' : 'Kỳ trước',
        }),
      },
    });
  }, [showAnalytics, showBreakdown, message.cards, message.totals, primaryDataTable, question, isEn, metricLabel, t]);

  const cardsMatrix = useMemo(() => {
    if (!showBreakdown || !message.cards?.some((card) => card.metrics.some((metric) => metric.value != null))) return null;
    return buildCardsComparisonMatrix(message.cards, question, isEn, metricLabel);
  }, [showBreakdown, message.cards, question, isEn, metricLabel]);

  const remainingActions = useMemo(() => {
    if (isUser || !message.actions || message.actions.length === 0) return [];
    return message.actions
      .map((act, idx) => ({ act, idx }))
      .filter(({ act, idx }) => idx !== inlineChartSpec?.consumedActionIndex &&
        (showAnalytics || !['DISPLAY_DATA_TABLE', 'DISPLAY_KPI_SUMMARY'].includes(act.action)));
  }, [isUser, message.actions, inlineChartSpec?.consumedActionIndex, showAnalytics]);

  const hasMarkdownTable = !isUser && Boolean(message.text && GFM_TABLE_REGEX.test(message.text));
  const hasRichContent =
    !isUser &&
    Boolean(
      kpiCards.length > 0 ||
        inlineChartSpec ||
        cardsMatrix ||
        warnings?.length ||
        (message.drafts && message.drafts.length > 0) ||
        remainingActions.length > 0 ||
        hasMarkdownTable,
    );
  const reply = isUser ? message.text.trim() : normalizeReplyBullets(message.text).trim();
  const compactText = !isUser && !message.isError &&
    (reply.length > 300 || reply.split(/\r?\n/).length > 4 || hasMarkdownTable);
  const firstBlock = reply.split(/\n[ \t]*\n|\n(?=[-*+] |\x60{3}|~{3})/, 1)[0];
  const canKeepIntro = compactText && firstBlock.length <= 220 && firstBlock.length < reply.length &&
    !/^(?:[|>#]|\d+\.\s|```|~~~)/.test(firstBlock) && !GFM_TABLE_REGEX.test(firstBlock);
  const summary = canKeepIntro ? firstBlock : compactText ? '' : reply;
  const detailText = compactText ? (canKeepIntro ? reply.slice(firstBlock.length).trimStart() : reply) : '';
  const plainPreview = compactText && !canKeepIntro && !hasMarkdownTable
    ? reply.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#*`_]/g, '').replace(/\s+/g, ' ').trim()
    : '';
  const preview = plainPreview.length > 180 ? plainPreview.slice(0, 180).replace(/\s+\S*$/, '') + '…' : plainPreview;
  const hasDetails = !isUser && !message.isError && (hasRichContent || Boolean(detailText));

  const formattedTime = formatMessageTime(message.timestamp);

  const writeClipboardSafe = (content: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(content).catch(() => {});
      }
    } catch {
      // ignore clipboard permission errors
    }
  };

  /** Sao chép của trợ lý ở chân bong bóng */
  const handleCopyReply = () => {
    if (!message.text) return;
    writeClipboardSafe(message.text);
    setCopiedReply(true);
    if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    replyTimerRef.current = setTimeout(() => setCopiedReply(false), 2000);
  };

  /** Sao chép mã voucher vào clipboard */
  const handleCopyCode = (code: string) => {
    writeClipboardSafe(code);
    setCopiedCode(code);
    if (codeTimerRef.current) clearTimeout(codeTimerRef.current);
    codeTimerRef.current = setTimeout(() => setCopiedCode(null), 2000);
  };

  /** Sao chép nội dung bản nháp vào clipboard */
  const handleCopyDraft = (content: string, index: number) => {
    writeClipboardSafe(content);
    setCopiedDraftIndex(index);
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => setCopiedDraftIndex(null), 2000);
  };

  const bubbleClasses = isUser
    ? 'max-w-[85%] bg-brand-primary text-white rounded-2xl rounded-tr-sm'
    : message.isError
      ? `${hasRichContent ? 'w-full flex-1 min-w-0' : 'max-w-[85%]'} bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 rounded-2xl rounded-tl-sm border border-red-200 dark:border-red-900/50`
      : `${hasRichContent ? 'w-full flex-1 min-w-0' : 'max-w-[85%]'} bg-white dark:bg-[#1e1e22] text-text-main rounded-2xl rounded-tl-sm border border-gray-100 dark:border-gray-800`;

  const renderMarkdown = (text: string) => text ? (
    <div className="prose prose-sm max-w-none text-gray-800 dark:prose-invert dark:text-gray-100 text-sm leading-6 break-words prose-headings:mt-3 prose-headings:mb-1 prose-headings:text-sm prose-p:my-1.5 prose-p:whitespace-pre-line prose-li:my-0.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-a:text-brand-primary">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div
              role="region"
              aria-label={t('ai.organizer.analytics.markdownTableAria', {
                defaultValue: isEn ? 'Table in the reply' : 'Bảng số liệu trong câu trả lời',
              })}
              tabIndex={0}
              className="not-prose max-w-full overflow-x-auto my-2.5 rounded-xl border border-gray-200 dark:border-gray-700/80"
            >
              <table className="w-full min-w-max border-separate border-spacing-0 text-xs [&_tr>*:first-child]:sticky [&_tr>*:first-child]:left-0 [&_tr>*:first-child]:z-10 [&_tr>*:first-child]:border-r [&_tr>*:first-child]:border-gray-200 dark:[&_tr>*:first-child]:border-gray-700/80">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="bg-gray-50 dark:bg-[#202024] px-3 py-2 text-left font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700/80 whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="bg-white dark:bg-[#1e1e22] px-3 py-2 align-top text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-gray-800 whitespace-nowrap first:font-semibold">
              {children}
            </td>
          ),
          a: ({ href, children }) => {
            if (href && VALID_ORGANIZER_HREF.test(href)) {
              return (
                <Link to={href} className="font-medium text-brand-primary hover:underline">
                  {children}
                </Link>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-primary hover:underline"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  ) : null;

  const detailContent = detailsOpen ? (
      <>
        {renderMarkdown(detailText)}
        {/* 1. Dải KPI 2x2 Mở sẵn + Huy hiệu Tăng/Giảm Kỳ */}
        {!isUser && kpiCards.length > 0 && (
          <section
            data-testid="chat-totals-section"
            aria-label={t('ai.organizer.totalsTitle', {
              defaultValue: isEn ? 'Aggregated Totals' : 'Tổng hợp số liệu',
            })}
            className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {kpiCards.map((kpi) => {
                const label = metricLabel(kpi.key);
                const isMissing =
                  kpi.current.value === null ||
                  kpi.current.value === undefined ||
                  !Number.isFinite(kpi.current.value) ||
                  kpi.current.completeness === 'missing';
                const isPartial = !isMissing && kpi.current.completeness === 'partial';

                return (
                  <div
                    key={kpi.key}
                    data-testid={`chat-kpi-card-${kpi.key}`}
                    className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#27272a] border border-gray-200 dark:border-gray-700/80 flex flex-col justify-between gap-1"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300 leading-snug">
                        {label}
                      </span>
                      {isPartial && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                          {t('ai.organizer.completeness.partial', {
                            defaultValue: isEn ? 'Partial' : 'Một phần',
                          })}
                        </span>
                      )}
                    </div>

                    <div className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                      {isMissing ? (
                        <span className="text-xs font-normal italic text-gray-400 dark:text-gray-500">
                          {t('ai.organizer.completeness.missing', {
                            defaultValue: isEn ? 'Missing' : 'Thiếu dữ liệu',
                          })}
                        </span>
                      ) : (
                        formatMetricValue(kpi.current, isEn)
                      )}
                    </div>

                    {kpi.delta ? (
                      <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                        <span
                          data-testid={`chat-kpi-delta-${kpi.key}`}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10.5px] font-semibold tabular-nums ${
                            kpi.delta.direction === 'up'
                              ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10'
                              : kpi.delta.direction === 'down'
                                ? 'text-rose-700 dark:text-rose-400 bg-rose-500/10'
                                : 'text-gray-600 dark:text-gray-300 bg-gray-500/10'
                          }`}
                        >
                          {kpi.delta.direction === 'up' && <span aria-hidden="true">▲</span>}
                          {kpi.delta.direction === 'down' && <span aria-hidden="true">▼</span>}
                          <span>
                            {t('ai.organizer.analytics.periodDeltaBadge', {
                              pct: kpi.delta.formattedPct,
                              delta: kpi.delta.formattedPct,
                              defaultValue: isEn
                                ? `${kpi.delta.formattedPct} vs previous period`
                                : `${kpi.delta.formattedPct} so với kỳ trước`,
                            })}
                          </span>
                        </span>
                      </div>
                    ) : (
                      kpi.prior &&
                      typeof kpi.prior.value === 'number' &&
                      Number.isFinite(kpi.prior.value) &&
                      kpi.prior.completeness !== 'missing' && (
                        <div className="text-[10.5px] text-gray-500 dark:text-gray-400 tabular-nums">
                          {t('ai.organizer.periodPrevious', {
                            defaultValue: isEn ? 'Previous period' : 'Kỳ trước',
                          })}
                          {': '}
                          {formatMetricValue(kpi.prior, isEn)}
                        </div>
                      )
                    )}

                    {kpi.currentPeriodStr && (
                      <div className="text-[10px] text-gray-400 dark:text-gray-400 tabular-nums">
                        {kpi.currentPeriodStr}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 2. Khối Biểu đồ Tương tác Recharts (`OrganizerInlineChart` - bao gồm chuỗi ngày từ DISPLAY_DATA_TABLE) */}
        {!isUser && inlineChartSpec && (
          <OrganizerInlineChart
            spec={inlineChartSpec}
            isExpanded={isExpanded}
            exportBaseName={`haloticket_btc_${message.id}`}
          />
        )}

        {/* 3. Mở sẵn Cảnh báo Khẩn cấp (`Critical Warnings`) */}
        {!isUser && warnings && warnings.length > 0 && (
          <section
            data-testid="chat-warnings-section"
            aria-label={t('ai.organizer.warningsTitle', {
              defaultValue: isEn ? 'Warnings Needing Attention' : 'Cảnh báo cần lưu ý',
            })}
            className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800 space-y-2"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
              <AlertTriangle size={14} className="text-amber-600 shrink-0" aria-hidden="true" />
              <span>
                {t('ai.organizer.warningsTitle', {
                  defaultValue: isEn ? 'Warnings Needing Attention' : 'Cảnh báo cần lưu ý',
                })}{' '}
                ({warnings.length})
              </span>
            </div>
            {warnings.map((warn, idx) => {
              const actionLink = resolveWarningActionLink(warn);
              const isCritical = warn.code === 'paid_order_missing_tickets';
              return (
                <div
                  key={`${warn.code}-${warn.event_id}-${idx}`}
                  data-testid={`chat-warning-card-${warn.code}`}
                  className={`p-3 rounded-xl border ${
                    isCritical
                      ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
                      : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                    <div
                      className={`font-semibold text-xs flex items-center gap-1.5 flex-wrap ${
                        isCritical
                          ? 'text-rose-900 dark:text-rose-200'
                          : 'text-amber-900 dark:text-amber-200'
                      }`}
                    >
                      <AlertTriangle
                        size={13}
                        className={isCritical ? 'text-rose-600 shrink-0' : 'text-amber-600 shrink-0'}
                        aria-hidden="true"
                      />
                      <span>{t(`ai.organizer.warning.${warn.code}`, warn.code)}</span>
                      <span className="rounded bg-white/80 dark:bg-black/30 px-1.5 py-0.5 text-[10px] font-bold">
                        {isCritical
                          ? t('ai.organizer.analytics.severityCritical', {
                              defaultValue: isEn ? 'Critical' : 'Khẩn cấp',
                            })
                          : t('ai.organizer.analytics.severityWarning', {
                              defaultValue: isEn ? 'Warning' : 'Cần lưu ý',
                            })}
                      </span>
                    </div>
                    {actionLink && (
                      <Link
                        to={actionLink.href}
                        className="text-[11px] font-semibold text-brand-primary hover:underline shrink-0"
                      >
                        {t(actionLink.labelKey, {
                          defaultValue: isEn ? actionLink.defaultEn : actionLink.defaultVi,
                        })}
                      </Link>
                    )}
                  </div>

                  <p className="text-xs font-medium app-text-main">
                    {[warn.event_title, warn.showtime_title, warn.ticket_type_title]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {warn.metrics.length > 0 && (
                    <p className="my-1 text-xs app-text-muted tabular-nums">
                      {warn.metrics
                        .map((metric) => `${metricLabel(metric.key)}: ${formatMetricValue(metric, isEn)}`)
                        .join(' · ')}
                    </p>
                  )}
                  <p className="text-xs app-text-main">
                    {t(`ai.organizer.warning.${warn.code}_action`)}
                  </p>
                </div>
              );
            })}
          </section>
        )}

        {/* 4. Ma trận So sánh Sticky Cột đầu + Thanh Tỷ lệ Lấp đầy (`Comparison Matrix`) */}
        {!isUser && cardsMatrix && (
          <section
            data-testid="chat-cards-section"
            aria-label={t('ai.organizer.cardsTitle', {
              defaultValue: isEn ? 'Details by Event / Showtime' : 'Chi tiết theo sự kiện / suất diễn',
            })}
            className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800 space-y-2"
          >
            <div className="text-xs font-bold text-gray-700 dark:text-gray-200">
              {t('ai.organizer.cardsTitle', {
                defaultValue: isEn ? 'Details by Event / Showtime' : 'Chi tiết theo sự kiện / suất diễn',
              })}{' '}
              ({cardsMatrix.rows.length})
            </div>
            <OrganizerComparisonTable matrix={cardsMatrix} />
          </section>
        )}

        {/* 5. Bản nháp gợi ý có thể sao chép (Drafts) */}
        {!isUser && message.drafts && message.drafts.length > 0 && (
          <div
            className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800 space-y-2.5"
            data-testid="chat-drafts-section"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200">
              <FileText size={14} className="text-brand-primary" aria-hidden="true" />
              <span>
                {t('ai.organizer.draftsTitle', 'Bản nháp gợi ý')} ({message.drafts.length})
              </span>
            </div>
            {message.drafts.map((draft, idx) => {
              const isCopied = copiedDraftIndex === idx;
              const draftTitle = draft.title || t('ai.organizer.draftsTitle', 'Bản nháp');
              return (
                <div
                  key={idx}
                  data-testid={`chat-draft-${idx}`}
                  className="p-3 rounded-xl bg-gray-50 dark:bg-[#202024] border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-brand-primary dark:text-brand-accent">
                      {draftTitle}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyDraft(draft.content, idx)}
                      aria-label={`${t('ai.organizer.analytics.copyDraftAria', {
                        defaultValue: isEn ? 'Copy draft' : 'Sao chép bản nháp',
                      })}: ${draftTitle}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-white dark:bg-[#18181b] border border-gray-300 dark:border-gray-600 text-brand-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors motion-reduce:transition-none cursor-pointer"
                    >
                      {isCopied ? (
                        <Check size={12} className="text-emerald-500" aria-hidden="true" />
                      ) : (
                        <Copy size={12} aria-hidden="true" />
                      )}
                      <span>
                        {isCopied
                          ? t('ai.organizer.copiedDraft', 'Đã sao chép')
                          : t('ai.organizer.analytics.copyDraftButton', {
                              defaultValue: isEn ? 'Copy draft' : 'Sao chép bản nháp',
                            })}
                      </span>
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#18181b] border border-gray-200/70 dark:border-gray-800 text-xs font-sans text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed select-text">
                    {draft.content}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 6. Các widget hành động hệ thống còn lại (`actions` chưa được gộp vào `OrganizerInlineChart` chính) */}
        {!isUser && remainingActions.length > 0 && (
          <div className="mt-3 space-y-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-800">
            {remainingActions.map(({ act, idx }) => {
              if (act.action === 'DISPLAY_KPI_SUMMARY' && act.database_data) {
                const data = act.database_data;
                return (
                  <div key={idx} className="grid grid-cols-2 gap-2 mt-2">
                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#27272a] border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1.5 text-brand-primary text-xs font-medium mb-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>
                          {t('ai.organizer.metric.ticket_sales_revenue', {
                            defaultValue: isEn ? 'Gross ticket sales before vouchers' : 'Giá trị vé bán trước voucher',
                          })}
                        </span>
                      </div>
                      <div className="text-sm font-bold tabular-nums text-gray-800 dark:text-white">
                        {formatCurrency(data.total_revenue || 0)}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#27272a] border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1.5 text-brand-primary text-xs font-medium mb-1">
                        <Ticket className="w-3.5 h-3.5" />
                        <span>
                          {t('ai.organizer.metric.tickets_sold', {
                            defaultValue: isEn ? 'Tickets sold' : 'Vé đã bán',
                          })}
                        </span>
                      </div>
                      <div className="text-sm font-bold tabular-nums text-gray-800 dark:text-white">
                        {data.tickets_sold || 0} / {data.total_capacity || 0}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#27272a] border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>
                          {t('ai.organizer.metric.occupancy_rate', {
                            defaultValue: isEn ? 'Occupancy rate' : 'Tỷ lệ lấp đầy',
                          })}
                        </span>
                      </div>
                      <div className="text-sm font-bold tabular-nums text-gray-800 dark:text-white">
                        {data.occupancy_rate || 0}%
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#27272a] border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 text-xs font-medium mb-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>
                          {t('ai.organizer.metric.paid_orders', {
                            defaultValue: isEn ? 'Paid orders' : 'Đơn đã thanh toán',
                          })}
                        </span>
                      </div>
                      <div className="text-sm font-bold tabular-nums text-gray-800 dark:text-white">
                        {data.paid_orders || 0}
                      </div>
                    </div>
                  </div>
                );
              }

              if (act.action === 'DISPLAY_VOUCHER_CARD' && act.database_data) {
                const vc = act.database_data;
                const isCopied = copiedCode === vc.voucher_code;
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-gray-50 dark:bg-[#27272a] border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-brand-primary">
                        🎁 {vc.voucher_name || 'Voucher kích cầu'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(vc.voucher_code)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-white dark:bg-[#18181b] border border-gray-300 dark:border-gray-600 text-brand-primary hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        {isCopied ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{vc.voucher_code}</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-600 dark:text-gray-300">
                      <div>
                        <span className="text-gray-400 block">Giảm giá:</span>
                        <span className="font-bold text-rose-500">{vc.discount_percent}%</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Đơn tối thiểu:</span>
                        <span className="font-semibold">{formatCurrency(vc.min_order_value || 0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Lượt dùng:</span>
                        <span className="font-semibold">{vc.max_usage_count || 100} lượt</span>
                      </div>
                    </div>
                  </div>
                );
              }

              if (
                act.action === 'DISPLAY_DATA_TABLE' &&
                Array.isArray(act.database_data) &&
                act.database_data.length > 0
              ) {
                const rawRows = act.database_data.filter(
                  (r: unknown): r is Record<string, unknown> =>
                    Boolean(r && typeof r === 'object' && !Array.isArray(r)),
                );
                if (rawRows.length === 0) return null;

                const extraChartSpec = deriveInlineChartSpec({
                  tableRows: rawRows,
                  question,
                  isEn,
                  translateMetric: metricLabel,
                  dateColumnLabel: t('ai.organizer.analytics.dateColumn', {
                    defaultValue: isEn ? 'Date' : 'Ngày',
                  }),
                });

                if (extraChartSpec) {
                  return (
                    <OrganizerInlineChart
                      key={`dt-chart-${idx}`}
                      spec={extraChartSpec}
                      isExpanded={isExpanded}
                      exportBaseName={`haloticket_table_${message.id}_${idx}`}
                    />
                  );
                }

                // Fallback cho bảng 1 dòng hoặc bảng chữ: hiển thị bảng sticky cột đầu + Xuất Excel/CSV
                const headers = Object.keys(rawRows[0]);
                const firstCol = headers[0];
                const restCols: ComparisonColumn[] = headers.slice(1).map((h) => {
                  const unit = inferColumnUnit(h);
                  const isNumeric = rawRows.some((r) => typeof r[h] === 'number');
                  return {
                    key: h,
                    label: resolveColumnDisplayLabel(h, metricLabel),
                    unit,
                    isNumeric,
                  };
                });
                const fallbackRows: ComparisonRow[] = rawRows.map((r, rIdx) => {
                  const cells: ComparisonRow['cells'] = {};
                  for (const col of restCols) {
                    const val = r[col.key];
                    const num = typeof val === 'number' && Number.isFinite(val) ? val : null;
                    cells[col.key] = {
                      key: col.key,
                      unit: col.unit,
                      value: num,
                      completeness: val === null || val === undefined ? 'missing' : 'complete',
                      formatted:
                        num !== null
                          ? formatRawUnitValue(num, col.unit, isEn)
                          : val === null || val === undefined
                            ? '—'
                            : String(val),
                      progress:
                        num !== null && col.unit === 'percent' ? getPercentProgressMeta(num) : null,
                    };
                  }
                  return {
                    id: `fallback-dt-${rIdx}`,
                    label: String(r[firstCol] ?? `#${rIdx + 1}`),
                    manageLink: null,
                    cells,
                  };
                });
                const firstHeaderLabel = /^(date|day|sale_date|ngay)$/i.test(firstCol)
                  ? t('ai.organizer.analytics.dateColumn', { defaultValue: isEn ? 'Date' : 'Ngày' })
                  : resolveColumnDisplayLabel(firstCol, metricLabel);
                const fallbackMatrix: ComparisonMatrixSpec = {
                  entityHeaderKey: 'ai.organizer.analytics.entityColumn',
                  entityHeaderVi: firstHeaderLabel,
                  entityHeaderEn: firstHeaderLabel,
                  columns: restCols,
                  rows: fallbackRows,
                };
                const exportCols: AnalyticsExportColumn[] = headers.map((h) => ({
                  key: h,
                  label:
                    h === firstCol
                      ? firstHeaderLabel
                      : resolveColumnDisplayLabel(h, metricLabel),
                }));

                return (
                  <div key={`dt-fallback-${idx}`} className="space-y-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          downloadAnalyticsXlsx(
                            exportCols,
                            rawRows,
                            `haloticket_table_${message.id}_${idx}`,
                          )
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181b] text-[11px] font-medium text-gray-700 dark:text-gray-200 hover:text-brand-primary cursor-pointer"
                      >
                        <Download size={12} aria-hidden="true" />
                        <span>Excel</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          downloadAnalyticsCsv(
                            exportCols,
                            rawRows,
                            `haloticket_table_${message.id}_${idx}`,
                          )
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181b] text-[11px] font-medium text-gray-700 dark:text-gray-200 hover:text-brand-primary cursor-pointer"
                      >
                        <Download size={12} aria-hidden="true" />
                        <span>CSV</span>
                      </button>
                    </div>
                    <OrganizerComparisonTable matrix={fallbackMatrix} />
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}

      </>
  ) : null;

  return (
    <div className={`flex w-full mb-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Ảnh đại diện của trợ lý AI (giữ nguyên logo thương hiệu; bỏ avatar phía người dùng) */}
      {!isUser &&
        (message.isError ? (
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white mr-2 flex-shrink-0 shadow-sm mt-0.5">
            <AlertTriangle size={15} />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-white mr-2 shrink-0 ring-2 ring-brand-primary/75 overflow-hidden mt-0.5 flex items-center justify-center">
            <img
              src="/assets/brand/logo-ai.png"
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover scale-[1.08]"
            />
          </div>
        ))}

      {/* Bong bóng tin nhắn */}
      <div
        data-testid={isUser ? 'organizer-user-bubble' : 'organizer-ai-bubble'}
        className={`${bubbleClasses} px-3.5 py-2.5 shadow-xs overflow-hidden`}
      >
        {/* Nội dung văn bản / Markdown */}
        {isUser ? (
          <>
            <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
            <ChatMessageTime timestamp={message.timestamp} />
          </>
        ) : renderMarkdown(summary)}
        {!detailsOpen && !summary && preview && (
          <p className="text-sm leading-6 text-gray-800 dark:text-gray-100">{preview}</p>
        )}

        {hasDetails && (
          <>
            <button
              type="button"
              aria-expanded={detailsOpen}
              aria-controls={detailsId}
              onClick={() => setDetailsOpen((open) => !open)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-brand-primary dark:text-brand-accent hover:bg-brand-primary/10 focus-visible:outline-2 focus-visible:outline-brand-primary"
            >
              <ChevronDown size={14} aria-hidden="true" className={detailsOpen ? 'rotate-180' : undefined} />
              {detailsOpen ? t('ai.organizer.reply.collapse', 'Thu gọn chi tiết') : t('ai.organizer.reply.expand', 'Xem chi tiết')}
            </button>
            {!detailsOpen && Boolean(warnings?.length) && (
              <span className="ml-1.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                {t('ai.organizer.reply.alertCount', {
                  count: warnings?.length ?? 0,
                  defaultValue: '{{count}} cảnh báo',
                })}
              </span>
            )}
            <div id={detailsId} hidden={!detailsOpen} className="mt-2">
              {detailContent}
            </div>
          </>
        )}

        {!isUser && !message.isError && message.followUp && (
          <div className="mt-3 border-l-2 border-brand-primary/40 pl-2.5">
            <p className="text-[11px] font-semibold text-brand-primary dark:text-brand-accent">
              {t('ai.organizer.reply.followUp', 'Gợi ý')}
            </p>
            <p className="mt-0.5 text-sm leading-5 text-gray-800 dark:text-gray-100">{message.followUp.question}</p>
            {onChooseFollowUp && message.followUp.options.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {message.followUp.options.map(({ label, message: answer }) => (
                  <button
                    key={answer}
                    type="button"
                    onClick={() => onChooseFollowUp(answer)}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs font-medium hover:bg-brand-primary/10 focus-visible:outline-2 focus-visible:outline-brand-primary"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chân bong bóng trợ lý AI: nút Sao chép + giờ HH:mm */}
        {!isUser && (Boolean(message.text?.trim()) || Boolean(formattedTime)) && (
          <div
            data-testid="organizer-ai-footer"
            className="mt-2.5 pt-1.5 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-2 text-[11px] text-gray-400 dark:text-gray-400"
          >
            {message.text?.trim() ? (
              <button
                type="button"
                data-testid="chat-copy-reply"
                onClick={handleCopyReply}
                aria-label={t('ai.organizer.analytics.copyReplyAria', {
                  defaultValue: isEn ? 'Copy' : 'Sao chép',
                })}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 -ml-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#27272a] text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors motion-reduce:transition-none cursor-pointer"
              >
                {copiedReply ? (
                  <>
                    <Check size={12} className="text-emerald-500" aria-hidden="true" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {t('ai.organizer.analytics.copiedReply', {
                        defaultValue: isEn ? 'Copied' : 'Đã chép',
                      })}
                    </span>
                  </>
                ) : (
                  <>
                    <Copy size={12} aria-hidden="true" />
                    <span>
                      {t('ai.organizer.analytics.copyReply', {
                        defaultValue: isEn ? 'Copy' : 'Sao chép',
                      })}
                    </span>
                  </>
                )}
              </button>
            ) : (
              <span />
            )}
            {formattedTime && (
              <span data-testid="organizer-ai-time" className="tabular-nums shrink-0">
                {formattedTime}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerAIChatMessage;
