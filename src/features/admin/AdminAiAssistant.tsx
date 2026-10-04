import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FiSend, FiLoader, FiZap, FiDatabase } from "react-icons/fi";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { aiApi } from "@/services/aiApi";

export default function AdminAiAssistant() {
  const { t, i18n } = useTranslation();
  const label = (vi: string, en: string) => t(vi, { defaultValue: i18n.language.startsWith("en") ? en : vi });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<{ id: string; sender: "ai" | "user"; text: string; timestamp: Date }[]>([
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
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      
      const response = await aiApi.chatWithSmartBooking(userMessage.text, history);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: response.reply,
        timestamp: new Date()
      }]);
    } catch (error) {
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
    <div className="flex flex-col h-[calc(100vh-100px)] min-h-0 space-y-4">
      <AdminPageHeader
        title={label("Trợ lý AI Quản trị viên", "Admin AI Assistant")}
        description={label(
          "Hỗ trợ phân tích dữ liệu, giải đáp thắc mắc và đề xuất hướng xử lý cho các tác vụ quản trị.",
          "Supports data analysis, answers queries, and suggests actions for administrative tasks."
        )}
      />

      <div className="flex-1 min-h-0 border app-border rounded-lg app-bg-card flex flex-col shadow-xs">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
          {messages.length === 1 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <FiZap className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold app-text-main mb-1">
                  {label("Tôi có thể giúp gì cho bạn?", "How can I help you?")}
                </h3>
                <p className="text-sm app-text-muted max-w-md mx-auto">
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
                    className="px-4 py-2 rounded-md border border-slate-200 dark:border-slate-800 text-xs font-bold app-text-main hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors shadow-xs hover:border-blue-500"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-4 py-3 text-sm shadow-xs ${
                msg.sender === "user" 
                  ? "bg-blue-600 text-white rounded-br-sm" 
                  : "bg-slate-100 dark:bg-slate-800 app-text-main rounded-bl-sm border border-slate-200 dark:border-slate-700"
              }`}>
                {msg.sender === "ai" && idx === 0 ? (
                  <div className="flex items-center gap-2 mb-1">
                    <FiDatabase className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">System AI</span>
                  </div>
                ) : null}
                <div className="leading-relaxed whitespace-pre-wrap">{msg.text}</div>
                <div className={`text-[10px] mt-1 ${msg.sender === "user" ? "text-blue-100 text-right" : "app-text-muted"}`}>
                  {msg.timestamp.toLocaleTimeString(i18n.resolvedLanguage === 'en' ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg rounded-bl-sm px-4 py-3 flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-xs">
                <FiLoader className="w-4 h-4 text-blue-600 animate-spin" />
                <span className="text-xs font-medium app-text-muted">{label("Đang phân tích...", "Analyzing...")}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t app-border rounded-b-lg">
          <form onSubmit={handleSendMessage} className="relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md pl-4 pr-12 min-h-9 py-2 text-xs font-medium app-text-main focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-xs transition-all placeholder:text-slate-400"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="absolute right-1.5 h-7 w-7 flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white transition-colors"
            >
              <FiSend className="w-4 h-4" />
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
