import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FiSend, FiLoader, FiZap, FiDatabase } from "react-icons/fi";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import ReactMarkdown from 'react-markdown';
import { aiApi } from "@/services/aiApi";
import { eventApi } from "@/services/eventApi";
import { Link } from "react-router-dom";
import { PATHS } from "@/routes/paths";

interface ActionableEvent {
  id: string | number;
  title: string;
  organizer?: { name?: string };
}

interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  timestamp: Date;
  actionableEvents?: ActionableEvent[];
}

export default function AdminAiAssistant({ isDrawer = false, initialPrompt = "" }: { isDrawer?: boolean, initialPrompt?: string }) {
  const { t, i18n } = useTranslation();
  const label = (vi: string, en: string) => t(vi, { defaultValue: i18n.language.startsWith("en") ? en : vi });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "ai",
      text: label(
        "Xin chào, tôi là trợ lý AI dành cho Quản trị viên. Tôi có thể giúp bạn kiểm tra hệ thống, tóm tắt sự kiện hoặc tra cứu Audit Logs. Bạn cần giúp gì hôm nay?",
        "Hello, I am your Admin AI Assistant. I can help you check system health, summarize events, or query Audit Logs. How can I help you today?"
      ),
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState(initialPrompt);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialPrompt) {
      setInputText(initialPrompt);
    }
  }, [initialPrompt]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      sender: "user" as const,
      text: inputText.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const history = messages.slice(1).map(m => ({ 
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
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error("AI Assistant Error:", error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: label("Rất tiếc, máy chủ AI hiện không phản hồi. Vui lòng thử lại sau.", "Sorry, the AI server is not responding. Please try again later."),
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col min-h-0 space-y-4 ${isDrawer ? 'h-full' : 'h-[calc(100vh-100px)]'}`}>
      {!isDrawer && (
        <AdminPageHeader
          title={label("Trợ lý AI Quản trị viên", "Admin AI Assistant")}
          description={label(
            "Hỗ trợ phân tích dữ liệu, giải đáp thắc mắc và đề xuất hướng xử lý cho các tác vụ quản trị.",
            "Supports data analysis, answers queries, and suggests actions for administrative tasks."
          )}
        />
      )}

      <div className={`flex-1 min-h-0 flex flex-col shadow-xs ${isDrawer ? '' : 'border app-border rounded-lg app-bg-card'}`}>
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
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
              <div className={`max-w-[85%] sm:max-w-[75%] rounded-md px-3.5 py-2.5 text-xs shadow-xs ${
                msg.sender === "user" 
                  ? "gradient-btn rounded-br-sm text-white" 
                  : "app-bg-subnav app-text-main rounded-bl-sm border app-border"
              }`}>
                {msg.sender === "ai" && idx === 0 ? (
                  <div className="flex items-center gap-2 mb-1">
                    <FiDatabase className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">System AI</span>
                  </div>
                ) : null}
                <div className="leading-relaxed text-xs prose prose-sm max-w-none dark:prose-invert prose-p:text-xs prose-li:text-xs">
                  {msg.sender === "ai" ? (
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
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
                           <Link to={`${PATHS.ADMIN_EVENTS_APPROVAL}?eventId=${ev.id}`} className="px-3 py-1.5 gradient-btn rounded-md text-[11px] font-bold transition-colors shadow-xs">Xem & Duyệt</Link>
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
                <div className={`text-[10px] mt-2 ${msg.sender === "user" ? "text-blue-100 text-right" : "app-text-muted"}`}>
                  {msg.timestamp.toLocaleTimeString(i18n.resolvedLanguage === 'en' ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="app-bg-subnav rounded-md rounded-bl-sm px-3.5 py-2.5 flex items-center gap-2 border app-border shadow-xs">
                <FiLoader className="w-4 h-4 text-blue-600 animate-spin" />
                <span className="text-[11px] font-medium app-text-muted">{label("Đang phân tích...", "Analyzing...")}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3.5 app-bg-subnav border-t app-border rounded-b-md">
          <form onSubmit={handleSendMessage} className="relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full app-bg-card border app-border rounded-md pl-3.5 pr-11 min-h-8 py-1.5 text-xs font-medium app-text-main focus:outline-none focus:border-blue-500 shadow-xs transition-all placeholder:text-slate-400"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="absolute right-1.5 h-6 w-6 flex items-center justify-center rounded-md gradient-btn disabled:opacity-50 transition-colors"
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
