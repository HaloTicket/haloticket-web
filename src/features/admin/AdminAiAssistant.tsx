import React, { useState, useRef, useEffect, type ComponentPropsWithoutRef } from "react";
import { useTranslation } from "react-i18next";
import { FiSend, FiLoader, FiZap, FiDatabase, FiTrash2 } from "react-icons/fi";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { aiApi } from "@/services/aiApi";
import { eventApi } from "@/services/eventApi";
import { resolveAiError, aiErrorMessage, type AiErrorInfo } from "@/utils/aiErrors";
import { Link } from "react-router-dom";
import { PATHS } from "@/routes/paths";

/** Sự kiện chờ duyệt mà trợ lý gợi ý thao tác nhanh: id, tên và ban tổ chức. */
interface ActionableEvent {
  id: string | number;
  title: string;
  organizer?: { name?: string };
}

/** Một tin nhắn trong khung chat trợ lý admin: người gửi, nội dung, thời gian, sự kiện gợi ý, công cụ đã dùng và cờ có dữ liệu căn cứ. */
interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  timestamp: Date;
  actionableEvents?: ActionableEvent[];
  toolsUsed?: string[];
  grounded?: boolean;
}

/** Chuẩn hóa Markdown do AI trả về: sửa bảng bị dính các dòng hoặc dòng phân cách tiêu đề bằng `||`. */
const normalizeMarkdown = (text: string) => {
  if (!text) return "";
  // sửa bảng bị dính các dòng hoặc dòng phân cách tiêu đề bằng ||
  let formatted = text.replace(/\|\|\s*\|/g, "|\n|");
  formatted = formatted.replace(/\|\|\s*/g, "|\n");
  return formatted;
};

/** Trả về bản sao của props không có `node`: react-markdown truyền `node` đã parse vào mọi renderer và không được rải nó lên phần tử DOM. */
function withoutNode<T extends object>(props: T): Omit<T, "node"> {
  const rest = { ...props } as Record<string, unknown>;
  delete rest.node;
  return rest as Omit<T, "node">;
}

/** Tin nhắn dạng đã lưu trong `localStorage`, thời gian là chuỗi hoặc số thay vì `Date`. */
type StoredMessage = Omit<ChatMessage, "timestamp"> & { timestamp?: string | number };

/** Sinh id tin nhắn duy nhất từ thời gian hiện tại và chuỗi ngẫu nhiên ngắn. */
const newMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * Khung chat trợ lý AI cho quản trị viên (trang riêng hoặc dạng ngăn kéo): lưu lịch sử trong `localStorage`
 * (khóa `admin_ai_chat_history`), hiện lỗi AI dưới dạng bong bóng hệ thống có thể gửi lại, và gợi ý nhanh các sự kiện chờ duyệt
 * khi câu hỏi liên quan tới duyệt sự kiện.
 * @param isDrawer hiển thị dạng ngăn kéo
 * @param initialPrompt nội dung ô nhập do cha truyền vào
 */
export default function AdminAiAssistant({ isDrawer = false, initialPrompt = "" }: { isDrawer?: boolean, initialPrompt?: string }) {
  const { t, i18n } = useTranslation();
  /** Chọn nhãn theo ngôn ngữ hiện tại: bản tiếng Anh khi ngôn ngữ là `en`, còn lại bản tiếng Việt. */
  const label = (vi: string, en: string) => t(vi, { defaultValue: i18n.language.startsWith("en") ? en : vi });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /** Tạo tin chào đầu tiên của trợ lý theo ngôn ngữ hiện tại. */
  const getWelcomeMessage = (): ChatMessage => ({
    id: "welcome-1",
    sender: "ai",
    text: label(
      "Xin chào, tôi là trợ lý AI dành cho Quản trị viên. Tôi có thể giúp bạn kiểm tra hệ thống, tóm tắt sự kiện hoặc tra cứu Audit Logs. Bạn cần giúp gì hôm nay?",
      "Hello, I am your Admin AI Assistant. I can help you check system health, summarize events, or query Audit Logs. How can I help you today?"
    ),
    timestamp: new Date(),
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('admin_ai_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: StoredMessage) => ({
            ...m,
            timestamp: new Date(m.timestamp || Date.now())
          }));
        }
      }
    } catch {
      // lịch sử đã lưu không đọc được hoặc hỏng: bắt đầu lại từ tin chào
    }
    return [getWelcomeMessage()];
  });

  const [inputText, setInputText] = useState(initialPrompt);
  const [isLoading, setIsLoading] = useState(false);
  // lỗi hiện dưới dạng bong bóng hệ thống nằm ngoài `messages`: không bao giờ được lưu và không bao giờ gửi lại làm lịch sử.
  const [chatError, setChatError] = useState<{ info: AiErrorInfo; text: string; userMessageId: string } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('admin_ai_chat_history', JSON.stringify(messages));
    } catch (e) {
      console.warn("Storage quota exceeded", e);
    }
  }, [messages]);

  /** Xóa cuộc trò chuyện, đưa về tin chào và ghi đè lịch sử đã lưu. */
  const clearChatHistory = () => {
    const fresh = [getWelcomeMessage()];
    setMessages(fresh);
    setChatError(null);
    localStorage.setItem('admin_ai_chat_history', JSON.stringify(fresh));
  };

  // prompt mới do cha truyền vào sẽ thay bản nháp (điều chỉnh state ngay lúc render thay vì dùng effect)
  const [seenPrompt, setSeenPrompt] = useState(initialPrompt);
  if (initialPrompt !== seenPrompt) {
    setSeenPrompt(initialPrompt);
    if (initialPrompt) setInputText(initialPrompt);
  }

  /** Cuộn khung tin nhắn xuống cuối. */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, chatError]);

  /** Thêm tin của quản trị viên vào hội thoại rồi xin câu trả lời; bỏ qua nội dung rỗng. */
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const userMessage = {
      id: newMessageId(),
      sender: "user" as const,
      text: inputText.trim(),
      timestamp: new Date()
    };
    
    const history = messages.slice(1);
    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    void requestReply(userMessage.text, userMessage.id, history);
  };

  /** Gửi lại câu hỏi vừa lỗi với lịch sử đến trước tin đó; không làm gì khi đang tải hoặc không có lỗi. */
  const resendLast = () => {
    if (!chatError || isLoading) return;
    const index = messages.findIndex(m => m.id === chatError.userMessageId);
    void requestReply(chatError.text, chatError.userMessageId, index > 0 ? messages.slice(1, index) : messages.slice(1));
  };

  /**
   * Gọi trợ lý admin và thêm câu trả lời; với câu hỏi về duyệt sự kiện thì lấy thêm tối đa 3 sự kiện đang chờ duyệt để gợi ý thao tác.
   * @param text nội dung câu hỏi
   * @param userMessageId id tin nhắn người dùng (để gửi lại khi lỗi)
   * @param previous các tin nhắn trước đó dùng làm lịch sử
   */
  const requestReply = async (text: string, userMessageId: string, previous: ChatMessage[]) => {
    const userMessage = { text };
    setChatError(null);
    setIsLoading(true);

    try {
      const history = previous.map(m => ({ 
        role: m.sender === "user" ? "user" : "assistant", 
        content: m.text 
      }));
      const isApprovalQuestion = userMessage.text.toLowerCase().includes("duyệt") && (userMessage.text.toLowerCase().includes("sự kiện") || userMessage.text.toLowerCase().includes("event"));
      let actionableEvents: ActionableEvent[] | undefined = undefined;

      const response = await aiApi.chatAdminAssistant(userMessage.text, history);

      if (isApprovalQuestion) {
         try {
            const pendingEvents = await eventApi.getApprovalEvents("PENDING");
            if (pendingEvents && pendingEvents.length > 0) {
               actionableEvents = pendingEvents.slice(0, 3) as unknown as ActionableEvent[];
            }
         } catch (e) {
            console.error("Failed to load actionable events for AI:", e);
         }
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: response.reply,
        actionableEvents,
        toolsUsed: Array.isArray(response.tools_used) ? response.tools_used : undefined,
        grounded: typeof response.grounded === "boolean" ? response.grounded : undefined,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error("AI Assistant Error:", error);
      setChatError({ info: resolveAiError(error), text, userMessageId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col min-h-0 space-y-4 ${isDrawer ? 'h-full' : 'h-[calc(100vh-100px)]'}`}>
      {!isDrawer ? (
        <AdminPageHeader
          title={label("Trợ lý AI Quản trị viên", "Admin AI Assistant")}
          description={label(
            "Hỗ trợ phân tích dữ liệu, giải đáp thắc mắc và đề xuất hướng xử lý cho các tác vụ quản trị.",
            "Supports data analysis, answers queries, and suggests actions for administrative tasks."
          )}
          actions={
            messages.length > 1 ? (
              <button
                type="button"
                onClick={clearChatHistory}
                className="inline-flex min-h-9 items-center gap-2 rounded-md border app-border app-bg-card px-3 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              >
                <FiTrash2 className="w-3.5 h-3.5" />
                <span>{label("Xóa lịch sử trò chuyện", "Clear conversation")}</span>
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex justify-between items-center px-2 pb-1 border-b app-border">
          <span className="text-xs font-bold app-text-main flex items-center gap-1.5"><FiZap className="w-3.5 h-3.5 text-blue-500" /> System AI</span>
          {messages.length > 1 && (
            <button
              type="button"
              onClick={clearChatHistory}
              className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <FiTrash2 className="w-3 h-3" />
              <span>{label("Xóa lịch sử", "Clear")}</span>
            </button>
          )}
        </div>
      )}

      <div className={`flex-1 min-h-0 flex flex-col shadow-xs ${isDrawer ? '' : 'border app-border rounded-lg app-bg-card'}`}>
        {/* Danh sách tin nhắn */}
        <div role="log" aria-live="polite" aria-label={label("Cuộc trò chuyện với trợ lý AI", "Conversation with the AI assistant")} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
          {messages.length === 1 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <FiZap className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold app-text-main mb-1">
                  {label("Tôi có thể giúp gì cho bạn?", "How can I help you?")}
                </h3>
                <p className="text-[11px] app-text-muted max-w-md mx-auto">
                  {label("Bạn có thể đặt câu hỏi về doanh thu, sự kiện đang chờ duyệt, hoặc kiểm tra trạng thái của các microservices.", "You can ask about revenue, pending events, or check the status of microservices.")}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg">
                {[
                  label("Tóm tắt doanh thu tháng này", "Summarize this month's revenue"),
                  label("Có sự kiện nào cần duyệt không?", "Any events pending approval?"),
                  label("Kiểm tra sức khỏe hệ thống", "Check system health")
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputText(prompt);
                    }}
                    className="px-3.5 py-1.5 rounded-md border app-border text-[11px] font-semibold app-text-main hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors shadow-xs hover:border-blue-500"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[90%] sm:max-w-[85%] px-4 py-3 text-xs shadow-xs ${
                msg.sender === "user" 
                  ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm" 
                  : "bg-white dark:bg-[#18181b] app-text-main rounded-2xl rounded-tl-sm border border-slate-200 dark:border-slate-800"
              }`}>
                {msg.sender === "ai" && idx === 0 ? (
                  <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800 text-blue-600 dark:text-blue-400">
                    <FiDatabase className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">System AI</span>
                  </div>
                ) : null}
                <div className="leading-relaxed text-xs">
                  {msg.sender === "ai" ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        /** Bọc bảng Markdown trong khung cuộn ngang. */
                        table: (props) => (
                          <div className="my-2.5 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-xs text-left" {...withoutNode(props)} />
                          </div>
                        ),
                        /** Kiểu cho phần đầu bảng Markdown. */
                        thead: (props) => (
                          <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 font-bold text-[11px]" {...withoutNode(props)} />
                        ),
                        /** Kiểu cho phần thân bảng Markdown. */
                        tbody: (props) => (
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300" {...withoutNode(props)} />
                        ),
                        /** Kiểu cho dòng của bảng Markdown. */
                        tr: (props) => (
                          <tr className="hover:bg-blue-50/50 dark:hover:bg-slate-800/40 transition-colors" {...withoutNode(props)} />
                        ),
                        /** Kiểu cho ô tiêu đề của bảng Markdown. */
                        th: (props) => (
                          <th className="px-3 py-2 font-bold text-slate-900 dark:text-white whitespace-nowrap border-b border-slate-200 dark:border-slate-700" {...withoutNode(props)} />
                        ),
                        /** Kiểu cho ô dữ liệu của bảng Markdown. */
                        td: (props) => (
                          <td className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/60 leading-relaxed" {...withoutNode(props)} />
                        ),
                        /** Kiểu cho đoạn văn Markdown. */
                        p: (props) => (
                          <p className="my-1.5 leading-relaxed text-xs text-slate-800 dark:text-slate-200" {...withoutNode(props)} />
                        ),
                        /** Kiểu cho chữ in đậm Markdown. */
                        strong: (props) => (
                          <strong className="font-bold text-slate-900 dark:text-white" {...withoutNode(props)} />
                        ),
                        /** Kiểu cho danh sách không thứ tự Markdown. */
                        ul: (props) => (
                          <ul className="my-2 pl-4 list-disc space-y-1 text-xs text-slate-800 dark:text-slate-200" {...withoutNode(props)} />
                        ),
                        /** Kiểu cho danh sách có thứ tự Markdown. */
                        ol: (props) => (
                          <ol className="my-2 pl-4 list-decimal space-y-1 text-xs text-slate-800 dark:text-slate-200" {...withoutNode(props)} />
                        ),
                        /** Kiểu cho mục danh sách Markdown. */
                        li: (props) => (
                          <li className="leading-relaxed" {...withoutNode(props)} />
                        ),
                        /** Kiểu cho mã Markdown: mã nội dòng dùng nền nhạt, khối mã nhiều dòng hoặc có ngôn ngữ dùng kiểu khối. */
                        code: ({ className, children, ...rest }: ComponentPropsWithoutRef<"code">) => {
                          const props = withoutNode(rest);
                          const match = /language-(\w+)/.exec(className || "");
                          const isInline = !match && !String(children).includes("\n");
                          return isInline ? (
                            <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-mono text-[11px]" {...props}>
                              {children}
                            </code>
                          ) : (
                            <div className="my-2 p-2.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </div>
                          );
                        }
                      }}
                    >
                      {normalizeMarkdown(msg.text)}
                    </ReactMarkdown>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  )}
                </div>
                {msg.actionableEvents && msg.actionableEvents.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">⚡ Hành động đề xuất:</p>
                    {msg.actionableEvents.map((ev) => (
                      <div key={ev.id} className="app-bg-card border app-border rounded-md p-2.5 flex items-center justify-between shadow-xs hover:border-blue-500 transition-colors">
                        <div className="flex-1 min-w-0 pr-3">
                          <p className="text-sm font-bold app-text-main truncate">{ev.title}</p>
                          <p className="text-[11px] app-text-muted mt-0.5 truncate">{ev.organizer?.name || 'Unknown Organizer'}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                           <Link to={`${PATHS.ADMIN_EVENTS_APPROVAL}?eventId=${ev.id}`} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-bold transition-colors shadow-xs">Xem & Duyệt</Link>
                        </div>
                      </div>
                    ))}
                    {msg.actionableEvents.length >= 3 && (
                       <div className="text-center mt-2">
                         <Link to={PATHS.ADMIN_EVENTS_APPROVAL} className="text-xs font-semibold text-blue-600 hover:underline">Xem tất cả</Link>
                       </div>
                    )}
                  </div>
                )}
                {msg.sender === "ai" && msg.grounded === false && (
                  <p role="note" data-testid="assistant-ungrounded" className="mt-2 text-[11px] font-medium app-text-muted">{t("ai.assist.ungrounded")}</p>
                )}
                {msg.sender === "ai" && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                  <p data-testid="assistant-tools" className="mt-2 text-[11px] app-text-muted">
                    {t("ai.assist.toolsUsed", { tools: Array.from(new Set(msg.toolsUsed)).map((tool) => t(`ai.assist.tool.${tool}`, { defaultValue: tool })).join(", ") })}
                  </p>
                )}
                <div className={`text-[10px] mt-2 ${msg.sender === "user" ? "text-blue-100 text-right" : "app-text-muted"}`}>
                  {msg.timestamp.toLocaleTimeString(i18n.resolvedLanguage === 'en' ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-[#18181b] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 border border-slate-200 dark:border-slate-800 shadow-xs">
                <FiLoader className="w-4 h-4 text-blue-600 motion-safe:animate-spin" />
                <span className="text-[11px] font-medium app-text-muted">{label("Đang phân tích...", "Analyzing...")}</span>
              </div>
            </div>
          )}
          {chatError && !isLoading && (
            <div className="flex justify-start">
              <div role="alert" className="max-w-[90%] sm:max-w-[85%] rounded-2xl rounded-tl-sm border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-xs text-rose-800 dark:text-rose-200">
                <p>{aiErrorMessage(chatError.info)}</p>
                {chatError.info.retryable && (
                  <button type="button" onClick={resendLast} className="mt-2 inline-flex items-center rounded-md border border-rose-300 dark:border-rose-800 px-2.5 py-1 text-[11px] font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40 cursor-pointer">
                    {label("Gửi lại", "Resend")}
                  </button>
                )}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Khu vực nhập liệu */}
        <div className="p-3.5 app-bg-subnav border-t app-border rounded-b-md">
          <form onSubmit={handleSendMessage} className="relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              aria-label={label("Nhập tin nhắn cho trợ lý AI", "Type a message to the AI assistant")}
              className="w-full app-bg-card border app-border rounded-xl pl-3.5 pr-11 min-h-9 py-2 text-xs font-medium app-text-main focus:outline-none focus:border-blue-500 shadow-xs transition-all placeholder:text-slate-400"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="absolute right-1.5 h-7 w-7 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              <FiSend className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[10px] app-text-muted">
              {label("AI có thể đưa ra thông tin không chính xác. Hãy kiểm tra lại các quyết định quan trọng.", "AI can make mistakes. Consider verifying important decisions.")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
