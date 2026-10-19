import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, X, Send, Loader2, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { aiApi } from '../../../services/aiApi';
import type { AiChatMessage } from '../../../types/ai';
import AIChatMessage from './AIChatMessage';

const AIChatWidget: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<AiChatMessage[]>(() => {
    const saved = localStorage.getItem('ai_chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      } catch {
        // ignore
      }
    }
    return [
      {
        id: '1',
        sender: 'ai',
        text: t('Xin chào! Mình là trợ lý AI thông minh của HaloTicket. Mình có thể giúp bạn tìm ghế VIP hoặc giải đáp bất kỳ thắc mắc nào!'),
        timestamp: new Date()
      }
    ];
  });
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    localStorage.setItem('ai_chat_history', JSON.stringify(messages));
  }, [messages, isOpen]);

  const sendMessage = async (text: string, hiddenContext?: string) => {
    if (!text.trim()) return;

    const userMessage: AiChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: text.trim(),
      hiddenContext: hiddenContext,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // exclude the first generic greeting message
      const history = messages.slice(1).map(m => ({ 
        role: m.sender === 'user' ? 'user' : 'assistant', 
        content: m.hiddenContext ? `${m.text} ${m.hiddenContext}` : m.text 
      }));
      
      const finalContent = hiddenContext ? `${userMessage.text} ${hiddenContext}` : userMessage.text;
      const response = await aiApi.chatWithSmartBooking(finalContent, history);

      const aiMessage: AiChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: response.reply,
        actions: response.system_actions,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("AI Chat error:", error);
      const errorMessage: AiChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: t('Xin lỗi, tôi đang gặp sự cố kết nối tới Server AI. Vui lòng thử lại sau nhé!'),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => {
    sendMessage(inputText);
    setInputText('');
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed z-[100] bg-white dark:bg-[#18181b] shadow-[0_12px_40px_rgb(0,0,0,0.18)] dark:shadow-[0_12px_40px_rgb(0,0,0,0.6)] border border-gray-200 dark:border-gray-700/80 flex flex-col overflow-hidden origin-bottom-right transition-all duration-300 ease-in-out ${
          isExpanded 
            ? 'bottom-0 right-0 w-full md:w-screen h-[100dvh] max-h-none rounded-none' 
            : 'bottom-5 right-4 sm:right-6 w-[95vw] sm:w-[440px] md:w-[460px] h-[640px] max-h-[85vh] rounded-2xl animate-in fade-in zoom-in-95'
        }`}>

          {/* Header */}
          <div className="gradient-btn p-4 flex justify-between items-center text-white shadow-sm">
            <div>
              <h3 className="font-bold flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400"></span>
                </span>
                HaloTicket Assistant
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('ai_chat_history');
                  setMessages([
                    {
                      id: '1',
                      sender: 'ai',
                      text: t('Xin chào! Mình là trợ lý AI thông minh của HaloTicket. Mình có thể giúp bạn tìm vé sự kiện, bảng giá và sơ đồ ghế!'),
                      timestamp: new Date()
                    }
                  ]);
                }}
                className="hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer"
                title={t("Làm mới cuộc trò chuyện")}
              >
                <RotateCcw size={16} />
              </button>
              <button onClick={() => setIsExpanded(!isExpanded)} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer" title={isExpanded ? t("Thu nhỏ") : t("Phóng to")}>
                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer" title={t("Đóng")}>
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50 dark:bg-[#18181b]">
            {messages.map((msg, index) => (
              <AIChatMessage 
                key={msg.id} 
                message={index === 0 && msg.id === '1' ? { ...msg, text: t('Xin chào! Mình là trợ lý AI thông minh của HaloTicket. Mình có thể giúp bạn tìm ghế VIP hoặc giải đáp bất kỳ thắc mắc nào!') } : msg} 
                onSendMessage={sendMessage} 
              />
            ))}
            {isLoading && (
              <div className="flex items-center text-text-muted gap-2 ml-2 mb-4">
                <Loader2 size={16} className="animate-spin text-brand-primary" />
                <span className="text-sm italic">{t("AI đang phân tích...")}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 bg-gray-50/80 dark:bg-[#18181b]/80 border-t border-gray-100 dark:border-gray-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { label: t("Sự kiện hot nhất"), text: "Cho tôi xem các sự kiện hot nhất hiện nay" },
                { label: t("Show ca nhạc cuối tuần"), text: "Cuối tuần này có show ca nhạc nào hay không?" },
                { label: t("Kịch & Nghệ thuật"), text: "Tôi muốn tìm vé xem kịch nghệ thuật" },
                { label: t("Sự kiện tại TP.HCM"), text: "Có những sự kiện nào đang diễn ra tại TP. Hồ Chí Minh?" }
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendMessage(chip.text)}
                  disabled={isLoading}
                  className="px-2.5 py-1 text-[11px] font-medium bg-white dark:bg-[#27272a] text-brand-primary dark:text-brand-accent border border-gray-200 dark:border-gray-700 rounded-full hover:bg-brand-primary/10 transition-colors whitespace-nowrap cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#18181b]">
            <div className="flex items-end gap-2 bg-gray-50 dark:bg-[#27272a] p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 focus-within:border-brand-primary/60 focus-within:ring-1 focus-within:ring-brand-primary/30 transition-all shadow-inner">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={t("Ví dụ: Tìm tôi 2 ghế VVIP...")}
                className="flex-1 bg-transparent border-none focus:outline-none resize-none max-h-32 text-sm py-1.5 px-2 text-text-main dark:text-white"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isLoading}
                className="p-2 gradient-btn text-white rounded-lg disabled:opacity-50 disabled:grayscale hover:brightness-110 transition-all shadow-sm cursor-pointer"
                title={t("Gửi tin nhắn")}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <div className="fixed bottom-24 right-8 z-50">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`w-12 h-12 rounded-full ${isOpen ? 'bg-gray-500' : 'gradient-btn hover:scale-110'} text-white flex items-center justify-center shadow-xl transition-all duration-300 relative group cursor-pointer`}
            aria-label={t("Chat với AI")}
            title={t("Chat với AI")}
          >
            {!isOpen && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border-2 border-white dark:border-[#18181b]"></span>
              </span>
            )}
            {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6 group-hover:-translate-y-0.5 transition-transform duration-300" />}
          </button>
        </div>
      )}
    </>
  );
};

export default AIChatWidget;
