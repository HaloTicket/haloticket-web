import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader2, 
  Maximize2, 
  Minimize2, 
  RotateCcw
} from 'lucide-react';
import { aiApi } from '@/services/aiApi';
import type { OrganizerChatMessage } from '@/types/ai';
import OrganizerAIChatMessage from './OrganizerAIChatMessage';

interface OrganizerAIChatWidgetProps {
  eventId?: string;
  eventTitle?: string;
}

export const OrganizerAIChatWidget: React.FC<OrganizerAIChatWidgetProps> = ({ 
  eventId: propEventId, 
  eventTitle: propEventTitle 
}) => {
  const { t } = useTranslation();
  const routeParams = useParams<{ eventId?: string }>();
  const activeEventId = propEventId || routeParams.eventId;

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPipelineStage, setCurrentPipelineStage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // initialize messages from localStorage
  const [messages, setMessages] = useState<OrganizerChatMessage[]>(() => {
    const saved = localStorage.getItem('organizer_ai_chat_history');
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
        text: 'Xin chào Ban tổ chức! Tôi là **AI Data Assistant** chuyên trách quản trị thông minh của HaloTicket.\n\nTôi có thể hỗ trợ bạn:\n- **Phân tích doanh thu & tiến độ bán vé thực tế**\n- **Kiểm tra tỷ lệ lấp đầy ghế theo từng suất diễn**\n- **Đề xuất chiến lược Voucher kích cầu bán vé**\n- **Soạn thảo thông báo / email chuyên nghiệp gửi khán giả**\n- **Truy vấn số liệu tổng hợp (Text-to-SQL)**',
        timestamp: new Date()
      }
    ];
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    localStorage.setItem('organizer_ai_chat_history', JSON.stringify(messages));
  }, [messages, isOpen]);

  const sendMessage = async (textToSend: string) => {
    const cleanText = textToSend.trim();
    if (!cleanText || isLoading) return;

    const userMessage: OrganizerChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: cleanText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Dynamic pipeline visual stages simulation for UX feedback
    setCurrentPipelineStage('Phân tích mục tiêu & lập kế hoạch');
    const stageTimer1 = setTimeout(() => {
      setCurrentPipelineStage('Truy xuất cơ sở dữ liệu thực tế');
    }, 600);
    const stageTimer2 = setTimeout(() => {
      setCurrentPipelineStage('Mô hình suy luận & tổng hợp giải pháp');
    }, 1400);

    try {
      // Exclude initial greeting message from history
      const history = messages.slice(1).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const response = await aiApi.chatWithOrganizerAgent(
        cleanText,
        history,
        activeEventId,
        propEventTitle
      );

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      setCurrentPipelineStage(null);

      const aiMessage: OrganizerChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: response.reply || 'Đã phân tích xong dữ liệu.',
        pipelineSteps: response.pipeline_steps || [],
        isCached: response.is_cached || false,
        executionTimeMs: response.execution_time_ms,
        actions: response.actions || [],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      setCurrentPipelineStage(null);

      const errorMessage: OrganizerChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'Xin lỗi Ban tổ chức, hệ thống AI Data Assistant đang gặp sự cố kết nối tới máy chủ. Vui lòng thử lại sau ít phút.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setCurrentPipelineStage(null);
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
                HaloTicket Organizer Assistant
              </h3>
              {activeEventId && (
                <p className="text-[11px] text-white/85 truncate max-w-[260px] mt-0.5">
                  {propEventTitle ? propEventTitle : `Event: ${activeEventId}`}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('organizer_ai_chat_history');
                  setMessages([
                    {
                      id: '1',
                      sender: 'ai',
                      text: 'Xin chào Ban tổ chức! Tôi là **AI Data Assistant** chuyên trách quản trị thông minh của HaloTicket.\n\nTôi có thể hỗ trợ bạn:\n- **Phân tích doanh thu & tiến độ bán vé thực tế**\n- **Kiểm tra tỷ lệ lấp đầy ghế theo từng suất diễn**\n- **Đề xuất chiến lược Voucher kích cầu bán vé**\n- **Soạn thảo thông báo / email chuyên nghiệp gửi khán giả**\n- **Truy vấn số liệu tổng hợp (Text-to-SQL)**',
                      timestamp: new Date()
                    }
                  ]);
                }}
                className="hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer"
                title={t("Làm mới cuộc trò chuyện")}
              >
                <RotateCcw size={16} />
              </button>
              <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer" 
                title={isExpanded ? t("Thu nhỏ") : t("Phóng to")}
              >
                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                className="hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer" 
                title={t("Đóng")}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Active Pipeline Status Bar when AI is thinking */}
          {isLoading && currentPipelineStage && (
            <div className="bg-gray-50 dark:bg-[#202024] border-b border-gray-100 dark:border-gray-800 px-3.5 py-1.5 flex items-center justify-between text-xs text-brand-primary dark:text-brand-accent">
              <div className="flex items-center gap-2">
                <Loader2 size={13} className="animate-spin text-brand-primary" />
                <span className="font-semibold">Pipeline:</span>
                <span>{currentPipelineStage}...</span>
              </div>
              <span className="text-[10px] font-mono opacity-70">Agent Running</span>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50 dark:bg-[#18181b]">
            {messages.map((msg) => (
              <OrganizerAIChatMessage 
                key={msg.id} 
                message={msg} 
                onSendMessage={sendMessage} 
              />
            ))}
            
            {isLoading && !currentPipelineStage && (
              <div className="flex items-center text-text-muted gap-2 ml-2 mb-4 text-xs italic">
                <Loader2 size={14} className="animate-spin text-brand-primary" />
                <span>AI đang phân tích số liệu...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips for Organizers */}
          {messages.length <= 3 && (
            <div className="px-3 py-2 bg-gray-50/80 dark:bg-[#18181b]/80 border-t border-gray-100 dark:border-gray-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { label: "Doanh thu & vé bán", text: "Báo cáo doanh thu và tiến độ bán vé hiện tại" },
                { label: "Tỷ lệ lấp đầy ghế", text: "Kiểm tra tỷ lệ lấp đầy và sức chứa các suất diễn" },
                { label: "Đề xuất Voucher", text: "Đề xuất chiến lược phát hành voucher kích cầu bán vé" },
                { label: "Soạn thông báo", text: "Soạn thư thông báo nhắc nhở giờ check-in gửi khán giả" },
                { label: "Top sự kiện hot", text: "Top các sự kiện có doanh thu cao nhất hệ thống" }
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
                placeholder={t("Hỏi về doanh thu, tỷ lệ ghế, voucher kích cầu, thông báo...")}
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

      {/* Floating Button - identical circular button with centered icon */}
      {!isOpen && (
        <div className="fixed bottom-8 right-8 z-50">
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

export default OrganizerAIChatWidget;
