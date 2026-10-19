import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { OrganizerChatMessage, AgentPipelineStep } from '@/types/ai';
import { 
  Bot,
  User, 
  CheckCircle2, 
  Clock, 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  TrendingUp, 
  Ticket, 
  DollarSign, 
  Users, 
  Layers, 
  Wand2
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface OrganizerAIChatMessageProps {
  message: OrganizerChatMessage;
  onSendMessage?: (text: string) => void;
}

export const OrganizerAIChatMessage: React.FC<OrganizerAIChatMessageProps> = ({ message }) => {
  const [showPipelineDetails, setShowPipelineDetails] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const isUser = message.sender === 'user';
  const hasRichActions = Boolean(message.actions && message.actions.length > 0);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getStepIcon = (step: AgentPipelineStep['step']) => {
    switch (step) {
      case 'INTENT':
        return <Layers className="w-3.5 h-3.5 text-brand-primary" />;
      case 'TOOL_EXECUTION':
        return <Wand2 className="w-3.5 h-3.5 text-brand-primary" />;
      case 'SYNTHESIS':
        return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    }
  };

  return (
    <div className={`flex w-full mb-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* AI Bot Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-brand-primary flex items-center justify-center text-white mr-1.5 flex-shrink-0 shadow-sm mt-0.5">
          <Bot size={15} />
        </div>
      )}

      {/* Message Bubble */}
      <div className={`${
        isUser
          ? 'max-w-[85%] bg-brand-primary text-white rounded-2xl rounded-tr-sm'
          : hasRichActions
            ? 'w-full max-w-full bg-white dark:bg-[#1e1e22] text-text-main rounded-2xl rounded-tl-sm border border-gray-100 dark:border-gray-800'
            : 'max-w-[88%] bg-white dark:bg-[#1e1e22] text-text-main rounded-2xl rounded-tl-sm border border-gray-100 dark:border-gray-800'
      } px-3.5 py-2.5 shadow-xs overflow-hidden`}>

        {/* Pipeline Progress Header (Only for AI) */}
        {!isUser && message.pipelineSteps && message.pipelineSteps.length > 0 && (
          <div className="mb-2.5 pb-2 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowPipelineDetails(!showPipelineDetails)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-primary dark:text-brand-accent hover:opacity-80 transition-opacity cursor-pointer group"
              >
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-brand-primary/10 border border-brand-primary/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-ping"></span>
                  <span>Agent Pipeline ({message.pipelineSteps.length} bước)</span>
                </span>
                {showPipelineDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />}
              </button>

              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                {message.isCached && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-medium border border-amber-200/60 dark:border-amber-800/60">
                    <Zap className="w-2.5 h-2.5" />
                    Cache Hit
                  </span>
                )}
                {message.executionTimeMs !== undefined && (
                  <span className="inline-flex items-center gap-0.5 font-mono">
                    <Clock className="w-2.5 h-2.5" />
                    {message.executionTimeMs}ms
                  </span>
                )}
              </div>
            </div>

            {/* Collapsible Pipeline Details */}
            {showPipelineDetails && (
              <div className="mt-2 space-y-1.5 bg-gray-50 dark:bg-[#18181b] p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 text-[11px]">
                {message.pipelineSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="mt-0.5 shrink-0">
                      {getStepIcon(step.step)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{step.name}</span>
                        {step.duration_ms !== undefined && (
                          <span className="text-[10px] font-mono text-gray-400">{step.duration_ms}ms</span>
                        )}
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-[10.5px] truncate">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Text Content */}
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        ) : (
          message.text ? (
            <div className="text-sm prose dark:prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-table:my-2 prose-td:p-1.5 prose-th:p-1.5 prose-td:border prose-th:border prose-a:text-brand-primary">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.text}
              </ReactMarkdown>
            </div>
          ) : null
        )}

        {/* Rich Action Widgets */}
        {!isUser && message.actions && message.actions.length > 0 && (
          <div className="mt-3 space-y-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-800">
            {message.actions.map((act, idx) => {
              // 1. KPI Summary Cards
              if (act.action === 'DISPLAY_KPI_SUMMARY' && act.database_data) {
                const data = act.database_data;
                return (
                  <div key={idx} className="grid grid-cols-2 gap-2 mt-2">
                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#27272a] border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1.5 text-brand-primary text-xs font-medium mb-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Doanh thu</span>
                      </div>
                      <div className="text-sm font-bold text-gray-800 dark:text-white">
                        {formatCurrency(data.total_revenue || 0)}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#27272a] border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1.5 text-brand-primary text-xs font-medium mb-1">
                        <Ticket className="w-3.5 h-3.5" />
                        <span>Vé đã bán</span>
                      </div>
                      <div className="text-sm font-bold text-gray-800 dark:text-white">
                        {data.tickets_sold || 0} / {data.total_capacity || 0}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#27272a] border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Tỷ lệ lấp đầy</span>
                      </div>
                      <div className="text-sm font-bold text-gray-800 dark:text-white">
                        {data.occupancy_rate || 0}%
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#27272a] border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 text-xs font-medium mb-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>Đơn hàng</span>
                      </div>
                      <div className="text-sm font-bold text-gray-800 dark:text-white">
                        {data.paid_orders || 0} đơn
                      </div>
                    </div>
                  </div>
                );
              }

              // 2. Voucher Card
              if (act.action === 'DISPLAY_VOUCHER_CARD' && act.database_data) {
                const vc = act.database_data;
                const isCopied = copiedCode === vc.voucher_code;
                return (
                  <div key={idx} className="p-3 rounded-xl bg-gray-50 dark:bg-[#27272a] border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-brand-primary">
                        🎁 {vc.voucher_name || "Voucher kích cầu"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(vc.voucher_code)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-white dark:bg-[#18181b] border border-gray-300 dark:border-gray-600 text-brand-primary hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
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

              // 3. Data Table Widget
              if (act.action === 'DISPLAY_DATA_TABLE' && Array.isArray(act.database_data) && act.database_data.length > 0) {
                const rows = act.database_data;
                const headers = Object.keys(rows[0] || {});
                return (
                  <div key={idx} className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700/80">
                    <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
                      <thead className="bg-gray-100 dark:bg-[#18181b] text-gray-700 dark:text-gray-200 font-semibold border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          {headers.map((h, i) => (
                            <th key={i} className="px-3 py-2 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {rows.slice(0, 5).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            {headers.map((h, cIdx) => (
                              <td key={cIdx} className="px-3 py-2 whitespace-nowrap">
                                {typeof row[h] === 'number' && (h.toLowerCase().includes('amount') || h.toLowerCase().includes('revenue') || h.toLowerCase().includes('price'))
                                  ? formatCurrency(row[h])
                                  : String(row[h] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 ml-2 flex-shrink-0 shadow-sm">
          <User size={18} />
        </div>
      )}
    </div>
  );
};

export default OrganizerAIChatMessage;
