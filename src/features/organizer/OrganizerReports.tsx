import { getLocale } from "@/i18n";
import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { FiFileText, FiInbox, FiDownloadCloud, FiPlus, FiMessageSquare, FiX, FiSend, FiCpu, FiDatabase } from "react-icons/fi";
import { aiApi } from "@/services/aiApi";

interface OrganizerReportItem {
  id: string;
  fileName: string;
  createdDate: string;
  creator: string;
  status: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  data?: any[];
  sqlQuery?: string;
  isProcessing?: boolean;
}

export const OrganizerReports: React.FC = () => {
  const { t: translate } = useTranslation();
  const [reports, setReports] = useState<OrganizerReportItem[]>([]);
  
  // data chatbot state
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "ai",
      text: "Xin chào! Tôi là Trợ lý AI Dữ liệu. Bạn có thể hỏi tôi bất kỳ thông tin nào về doanh thu, tình hình bán vé hoặc người tham gia của các sự kiện."
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: chatInput
    };
    
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsTyping(true);

    try {
      const res = await aiApi.analyzeData(userMsg.text);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: res.reply || "Tôi không thể xử lý dữ liệu lúc này.",
        data: res.data,
        sqlQuery: res.generated_sql
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: "Có lỗi xảy ra khi kết nối tới Hệ thống Phân tích AI."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="w-full min-h-screen app-bg-page p-4 md:p-8 space-y-6">
      {/* Top Quick Actions */}
      <div className="flex justify-end">

        <button
          type="button"
          onClick={() => {
            const newReport = {
              id: `REP_${Date.now().toString().slice(-4)}`,
              fileName: `Bao_Cao_Doanh_Thu_HaloTicket_${new Date().toLocaleDateString(getLocale()).replace(/\//g, "")}.xlsx`,
              createdDate: new Date().toLocaleDateString(getLocale()) + " " + new Date().toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' }),
              creator: "Trần Long Vũ",
              status: "Đã hoàn thành"
            };
            setReports([newReport, ...reports]);
          }}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <FiPlus className="w-4 h-4" />
          <span>{translate("Tạo báo cáo mới")}</span>
        </button>
      </div>

      {/* Reports Table Container */}
      <div className="w-full app-bg-card border app-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 border-b app-border text-xs font-extrabold app-text-main uppercase tracking-wider">
                <th className="p-4 w-12 text-center">
                  <input type="checkbox" className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                </th>
                <th className="p-4">{translate("File")}</th>
                <th className="p-4">{translate("Ngày Tạo")}</th>
                <th className="p-4">{translate("Người tạo")}</th>
                <th className="p-4">{translate("Trạng thái xử lý")}</th>
                <th className="p-4 text-right">{translate("Thao tác")}</th>
              </tr>
            </thead>
            <tbody className="divide-y app-border text-xs font-medium app-text-main">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-zinc-400 flex items-center justify-center">
                        <FiInbox className="w-8 h-8 stroke-[1.5]" />
                      </div>
                      <span className="text-xs font-extrabold app-text-muted">{translate("No data")}</span>
                      <p className="text-[11px] app-text-muted max-w-xs">
                        {translate("Chưa có file báo cáo nào được khởi tạo trong hệ thống.")} </p>
                    </div>
                  </td>
                </tr>
              ) : (
                reports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 text-center">
                      <input type="checkbox" className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                    </td>
                    <td className="p-4 font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <FiFileText className="w-4 h-4 shrink-0" />
                      <span>{rep.fileName}</span>
                    </td>
                    <td className="p-4 app-text-muted">{rep.createdDate}</td>
                    <td className="p-4 font-bold">{translate(rep.creator)}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold rounded-md text-[11px]">
                        {translate(rep.status)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        className="px-3 py-1.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg font-bold text-[11px] transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <FiDownloadCloud className="w-3.5 h-3.5" />
                        <span>{translate("Tải về")}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Chatbot Button */}
      {!showChatbot && (
        <button
          type="button"
          onClick={() => setShowChatbot(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform cursor-pointer z-40 group"
        >
          <FiMessageSquare className="w-6 h-6" />
          <span className="absolute right-full mr-4 bg-zinc-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Trợ lý AI Dữ liệu
          </span>
        </button>
      )}

      {/* Chatbot Window */}
      {showChatbot && (
        <div className="fixed bottom-6 right-6 w-full max-w-[400px] bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_8px_40px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgb(0,0,0,0.5)] border border-zinc-200 dark:border-zinc-800 z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <FiCpu className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-black tracking-tight">AI Data Analyst</h4>
                <p className="text-[10px] text-blue-100 font-medium">Text-to-SQL Powered</p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setShowChatbot(false)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 h-[400px] overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-zinc-900/50">
            {chatMessages.map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  msg.sender === "user" 
                    ? "bg-blue-600 text-white rounded-br-sm" 
                    : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-100 dark:border-zinc-700 rounded-bl-sm shadow-sm"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
                {msg.sender === "ai" && msg.sqlQuery && (
                  <div className="mt-2 max-w-[85%] w-full bg-slate-900 text-slate-300 p-2.5 rounded-xl text-[10px] font-mono shadow-inner border border-slate-700">
                    <div className="flex items-center gap-1.5 text-blue-400 mb-1 font-bold">
                      <FiDatabase className="w-3 h-3" />
                      <span>Generated SQL:</span>
                    </div>
                    <p className="break-words opacity-80">{msg.sqlQuery}</p>
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex items-start">
                <div className="bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 p-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-100" />
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 pr-1.5">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendMessage()}
                placeholder="VD: Tổng doanh thu tháng này?"
                className="flex-1 bg-transparent px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none placeholder-zinc-400"
              />
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={isTyping || !chatInput.trim()}
                className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
              >
                <FiSend className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerReports;
