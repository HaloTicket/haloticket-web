import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AiChatMessage } from '../../../types/ai';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIChatMessageProps {
  message: AiChatMessage;
  onSendMessage?: (text: string, hiddenContext?: string) => void;
}

const AIChatMessage: React.FC<AIChatMessageProps> = ({ message, onSendMessage }) => {
  const { t } = useTranslation();
  const isUser = message.sender === 'user';

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white mr-2 flex-shrink-0 shadow-sm">
          <Bot size={18} />
        </div>
      )}

      <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl shadow-sm ${isUser
          ? 'bg-brand-primary text-white rounded-tr-sm'
          : 'bg-white dark:bg-gray-800 text-text-main rounded-tl-sm '
        }`}>
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        ) : (
          <div className="text-sm prose dark:prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-table:my-2 prose-td:p-1.5 prose-th:p-1.5 prose-td:border prose-th:border prose-a:text-blue-500">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
          </div>
        )}

        {/* if the AI ​​calls a tool to highlight a seat or requests confirmation */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs flex flex-col gap-1.5">
            {message.actions.map((action, idx) => {
              if (action.action === 'HIGHLIGHT_SEATS') {
                return (
                  <div key={idx} className="flex items-center text-brand-primary dark:text-brand-accent font-medium bg-brand-primary/10 px-2.5 py-1.5 rounded-md">
                    {t("Đã khoanh vùng")} {action.database_data?.seats?.length || 0} {t("ghế")} ({action.database_data?.seats?.join(', ')}) {t("trên sơ đồ!")}
                  </div>
                );
              }
              
              if (action.action === 'USER_CONFIRMATION_REQUIRED') {
                const actionType = action.extracted_args?.action_type;
                const data = action.extracted_args?.data;
                return (
                  <div key={idx} className="mt-2 flex flex-col gap-2 p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-lg animate-in slide-in-from-bottom-2">
                    <p className="font-bold text-brand-primary text-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                      {t("XÁC NHẬN:")} {actionType === 'BOOK_TICKETS' ? t('ĐẶT VÉ') : actionType}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 font-mono text-[11px] bg-white dark:bg-gray-900 p-2 rounded border border-gray-100 dark:border-gray-800 break-words">
                      {data}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <button className="flex-1 py-2 bg-brand-primary text-white font-semibold rounded-md hover:brightness-110 shadow-sm transition active:scale-95 cursor-pointer">
                        {t("Xác nhận & Thanh toán")}
                      </button>
                      <button className="flex-1 py-2 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 font-semibold rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition active:scale-95 cursor-pointer">
                        {t("Từ chối")}
                      </button>
                    </div>
                  </div>
                );
              }
              
              if (action.action === 'SHOW_EVENT_CARDS') {
                try {
                  const dataStr = action.database_data;
                  const parsed = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr;
                  const events = typeof parsed?.data === 'string' ? JSON.parse(parsed.data) : (parsed?.data || []);
                  
                  if (!Array.isArray(events) || events.length === 0) return null;
                  return (
                    <div key={idx} className="mt-3 flex flex-col gap-3">
                      <p className="font-semibold text-text-main dark:text-white text-sm">{t("Gợi ý dành cho bạn:")}</p>
                      <div className="flex flex-col gap-3">
                        {events.map((evt: any, i: number) => (
                          <div key={i} className="flex gap-3 p-3 bg-white dark:bg-[#27272a] rounded-xl border border-gray-200 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-shadow">
                            {evt.banner_url ? (
                              <img src={evt.banner_url} alt={evt.title} className="w-20 h-24 object-cover rounded-lg flex-shrink-0" />
                            ) : (
                              <div className="w-20 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 text-xs text-center p-2 flex-shrink-0">{t("Không có ảnh")}</div>
                            )}
                            <div className="flex flex-col flex-1 min-w-0 py-0.5">
                              <h4 className="font-bold text-brand-primary text-sm line-clamp-2 leading-tight mb-1" title={evt.title}>{evt.title}</h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-0.5 truncate">
                                <span className="w-3.5 h-3.5 inline-flex items-center justify-center">📍</span> {evt.location || t('Chưa cập nhật')}
                              </p>
                              <p className="text-xs font-semibold text-orange-500 mt-auto">
                                {t("Từ")} {evt.min_price ? evt.min_price.toLocaleString('vi-VN') : 0}đ
                              </p>
                              <div className="mt-2 flex gap-2">
                                <a href={`/events/${evt.event_id}`} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-xs font-semibold text-brand-primary border border-brand-primary hover:bg-brand-primary/10 py-1.5 rounded-lg transition-colors">
                                  {t("Chi tiết")}
                                </a>
                                <button onClick={() => onSendMessage?.(`${t("Tôi muốn chọn sự kiện")} "${evt.title}"`, `(Mã: ${evt.event_id})`)} className="flex-1 text-center text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary py-1.5 rounded-lg transition-colors cursor-pointer">
                                  {t("Chọn sự kiện")}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                } catch {
                  return null;
                }
              }

              if (action.action === 'SHOW_SEATMAP') {
                try {
                  const data = action.database_data || action.extracted_args?.data;
                  const seatmapUrl = typeof data === 'string' && data.startsWith('{') ? JSON.parse(data).data : data;
                  if (!seatmapUrl) return null;
                  return (
                    <div key={idx} className="mt-3 flex flex-col gap-2 p-3 bg-white dark:bg-[#27272a] rounded-xl border border-gray-200 dark:border-gray-700/60 shadow-sm">
                      <p className="font-semibold text-text-main dark:text-white text-sm flex items-center gap-2">
                        <span>🗺️</span> {t("Sơ đồ ghế:")}
                      </p>
                      <div className="relative group">
                        <img src={seatmapUrl} alt="Seatmap" className="w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(seatmapUrl, '_blank')} />
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => window.open(seatmapUrl, '_blank')} className="bg-black/60 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-sm cursor-pointer">
                            {t("Xem ảnh lớn")}
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 text-center mt-1">{t("Nhấn vào ảnh để xem chi tiết sơ đồ")}</p>
                    </div>
                  );
                } catch {
                  return null;
                }
              }

              if (action.action === 'SHOW_TICKET_TYPES') {
                try {
                  const dataStr = action.database_data;
                  const parsed = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr;
                  const tickets = typeof parsed?.data === 'string' ? JSON.parse(parsed.data) : (parsed?.data || []);
                  
                  if (!Array.isArray(tickets) || tickets.length === 0) return null;
                  return (
                    <div key={idx} className="mt-3 flex flex-col gap-2 p-3 bg-white dark:bg-[#27272a] rounded-xl border border-brand-primary/30 shadow-sm">
                      <p className="font-semibold text-brand-primary text-sm flex items-center gap-2">
                        <span>🎟️</span> {t("Bảng giá vé:")}
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="py-2 px-1 font-semibold text-gray-600 dark:text-gray-300">{t("Loại vé")}</th>
                              <th className="py-2 px-1 font-semibold text-gray-600 dark:text-gray-300 text-right">{t("Giá (VNĐ)")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tickets.map((ticketItem: any, i: number) => (
                              <tr key={i} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => onSendMessage?.(`${t("Tôi muốn chọn hạng vé")} ${ticketItem.name}`)}>
                                <td className="py-2 px-1">
                                  <div className="font-medium text-text-main dark:text-white">{ticketItem.name}</div>
                                  {ticketItem.description && <div className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{ticketItem.description}</div>}
                                </td>
                                <td className="py-2 px-1 text-right font-semibold text-orange-500">
                                  {ticketItem.price > 0 ? ticketItem.price.toLocaleString('vi-VN') + 'đ' : t('Miễn phí')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[10px] text-gray-500 text-center mt-1">{t("Nhấn vào một hạng vé để tiếp tục")}</p>
                    </div>
                  );
                } catch {
                  return null;
                }
              }
              
              return null;
            })}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 ml-2 flex-shrink-0 shadow-sm">
          <User size={18} />
        </div>
      )}
    </div>
  );
};

export default AIChatMessage;
