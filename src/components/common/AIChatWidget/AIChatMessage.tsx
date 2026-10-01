import React from 'react';
import type { AiChatMessage } from '../../../types/ai';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIChatMessageProps {
  message: AiChatMessage;
}

const AIChatMessage: React.FC<AIChatMessageProps> = ({ message }) => {
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

        {/* Nếu AI có gọi tool để highlight ghế, ta render 1 cái badge nho nhỏ */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs flex flex-col gap-1.5">
            {message.actions.map((action, idx) => (
              <div key={idx} className="flex items-center text-brand-primary dark:text-brand-accent font-medium bg-brand-primary/10 px-2.5 py-1.5 rounded-md">
                Đã khoanh vùng {action.database_data?.seats?.length || 0} ghế ({action.database_data?.seats?.join(', ')}) trên sơ đồ!
              </div>
            ))}
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
