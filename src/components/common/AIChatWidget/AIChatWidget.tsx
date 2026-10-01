import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { aiApi } from '../../../services/aiApi';
import type { AiChatMessage } from '../../../types/ai';
import AIChatMessage from './AIChatMessage';

const AIChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Xin chào! Mình là trợ lý AI thông minh của HaloTicket. Mình có thể giúp bạn tìm ghế VIP hoặc giải đáp bất kỳ thắc mắc nào!',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: AiChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await aiApi.chatWithSmartBooking(userMessage.text);

      const aiMessage: AiChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: response.reply,
        actions: response.system_actions,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      // if a "Highlight Seat" command is issued, we can fire a CustomEvent for the SeatMap component to listen for.
      if (response.system_actions && response.system_actions.length > 0) {
        const highlightAction = response.system_actions.find(a => a.action === 'HIGHLIGHT_SEATS');
        if (highlightAction) {
          console.log("AI Requested to highlight seats:", highlightAction.database_data);
          // document.dispatchEvent(new CustomEvent('aiHighlightSeats', { detail: highlightAction.database_data }));
        }
      }

    } catch (error) {
      console.error("AI Chat error:", error);
      const errorMessage: AiChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'Xin lỗi, tôi đang gặp sự cố kết nối tới Server AI. Vui lòng thử lại sau nhé!',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className={`${
          isExpanded 
            ? 'fixed bottom-0 right-0 w-full h-[100dvh] z-[100] rounded-none' 
            : 'fixed bottom-40 right-8 w-[90vw] sm:w-[350px] h-[500px] z-50 rounded-2xl'
        } bg-white dark:bg-[#18181b] shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-gray-200 dark:border-gray-700/60 flex flex-col overflow-hidden origin-bottom-right animate-in fade-in zoom-in-95 duration-300 ease-out transition-all`}>

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
              <p className="text-xs text-white/80 mt-0.5">Gemini Flash Agent</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsExpanded(!isExpanded)} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50 dark:bg-[#18181b]">
            {messages.map((msg) => (
              <AIChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="flex items-center text-text-muted gap-2 ml-2 mb-4">
                <Loader2 size={16} className="animate-spin text-brand-primary" />
                <span className="text-sm italic">AI đang phân tích...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

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
                placeholder="Ví dụ: Tìm tôi 2 ghế VVIP..."
                className="flex-1 bg-transparent border-none focus:outline-none resize-none max-h-32 text-sm py-1.5 px-2 text-text-main dark:text-white"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isLoading}
                className="p-2 gradient-btn text-white rounded-lg disabled:opacity-50 disabled:grayscale hover:brightness-110 transition-all shadow-sm"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      {!isExpanded && (
        <div className="fixed bottom-24 right-8 z-50">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`w-12 h-12 rounded-full ${isOpen ? 'bg-gray-500' : 'gradient-btn hover:scale-110'} text-white flex items-center justify-center shadow-xl transition-all duration-300 relative group`}
            aria-label="Chat với AI"
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
