import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, X, Send, Loader2, Maximize2, Minimize2, RotateCcw, AlertTriangle } from 'lucide-react';
import { aiApi } from '../../../services/aiApi';
import { getCachedUserProfile } from '../../../services/userApi';
import type { AiChatMessage } from '../../../types/ai';
import { resolveAiError, aiErrorMessage, type AiErrorInfo } from '../../../utils/aiErrors';
import AIChatMessage from './AIChatMessage';

const LEGACY_HISTORY_KEY = 'ai_chat_history';
const HISTORY_KEY_PREFIX = 'ai_chat_history:v2:';

/** Account that owns the chat history: profile id, else email, else anonymous. */
function getChatAccount(): string {
  try {
    const profile = getCachedUserProfile();
    return String(profile?.id ?? profile?.email ?? 'anon');
  } catch {
    return 'anon';
  }
}

const chatHistoryKey = (account: string) => `${HISTORY_KEY_PREFIX}${account}`;

const safeStorage = {
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string) {
    try { localStorage.setItem(key, value); } catch { /* storage may be unavailable or full */ }
  },
  remove(key: string) {
    try { localStorage.removeItem(key); } catch { /* storage may be unavailable */ }
  },
};

/** Wall-clock timestamp in ms, used for message ids (only called from handlers). */
const nowMs = (): number => Date.now();

const greetingMessage = (text: string): AiChatMessage => ({ id: '1', sender: 'ai', text, timestamp: new Date() });

function loadHistory(account: string, greeting: string): AiChatMessage[] {
  const saved = safeStorage.get(chatHistoryKey(account));
  if (saved) {
    try {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return (parsed as AiChatMessage[]).map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
      }
    } catch {
      // fall through to a fresh conversation
    }
  }
  return [greetingMessage(greeting)];
}

interface ChatError {
  info: AiErrorInfo;
  text: string;
  hiddenContext?: string;
  userMessageId: string;
}

const AIChatWidget: React.FC = () => {
  const { t } = useTranslation();
  const greeting = t('ai.chat.greeting');
  const [account, setAccount] = useState<string>(getChatAccount);
  const accountRef = useRef<string>(account);
  useEffect(() => {
    accountRef.current = account;
  }, [account]);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<AiChatMessage[]>(() => {
    // the old global key mixed accounts; drop it once.
    safeStorage.remove(LEGACY_HISTORY_KEY);
    return loadHistory(getChatAccount(), t('ai.chat.greeting'));
  });
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState<ChatError | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);

  // Keep history scoped to the signed-in account (or anonymous).
  useEffect(() => {
    const syncAccount = () => {
      const next = getChatAccount();
      const previous = accountRef.current;
      if (next === previous) return;
      safeStorage.remove(chatHistoryKey(previous));
      accountRef.current = next;
      setAccount(next);
      setMessages(loadHistory(next, t('ai.chat.greeting')));
      setChatError(null);
      setConfirmReset(false);
      setInputText('');
    };
    window.addEventListener('auth-changed', syncAccount);
    window.addEventListener('storage', syncAccount);
    return () => {
      window.removeEventListener('auth-changed', syncAccount);
      window.removeEventListener('storage', syncAccount);
    };
  }, [t]);

  // Persist only real conversation turns; error bubbles live outside `messages`.
  useEffect(() => {
    safeStorage.set(chatHistoryKey(account), JSON.stringify(messages));
  }, [messages, account]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages, isOpen, chatError, isLoading]);

  useEffect(() => {
    if (!isOpen) return;
    textareaRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (confirmReset) setConfirmReset(false);
      else setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, confirmReset]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const requestReply = useCallback(async (text: string, hiddenContext: string | undefined, userMessageId: string, history: AiChatMessage[]) => {
    sendingRef.current = true;
    setIsLoading(true);
    setChatError(null);
    try {
      const historyPayload = history.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.hiddenContext ? `${m.text} ${m.hiddenContext}` : m.text
      }));
      const finalContent = hiddenContext ? `${text} ${hiddenContext}` : text;
      const response = await aiApi.chatWithSmartBooking(finalContent, historyPayload);
      const aiMessage: AiChatMessage = {
        id: `${nowMs() + 1}`,
        sender: 'ai',
        text: response.reply,
        actions: response.system_actions,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const info = resolveAiError(error);
      setChatError({ info, text, hiddenContext, userMessageId });
      setCooldown(info.retryAfterSeconds ?? 0);
    } finally {
      sendingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const sendMessage = (text: string, hiddenContext?: string) => {
    if (!text.trim() || sendingRef.current) return;
    const userMessage: AiChatMessage = {
      id: nowMs().toString(),
      sender: 'user',
      text: text.trim(),
      hiddenContext,
      timestamp: new Date()
    };
    // exclude the first generic greeting message
    const history = messages.slice(1);
    setMessages(prev => [...prev, userMessage]);
    void requestReply(userMessage.text, hiddenContext, userMessage.id, history);
  };

  const resend = () => {
    if (!chatError || sendingRef.current || cooldown > 0) return;
    const index = messages.findIndex(m => m.id === chatError.userMessageId);
    const history = index > 0 ? messages.slice(1, index) : messages.slice(1);
    void requestReply(chatError.text, chatError.hiddenContext, chatError.userMessageId, history);
  };

  const handleSendMessage = () => {
    sendMessage(inputText);
    setInputText('');
  };

  const resetConversation = () => {
    safeStorage.remove(chatHistoryKey(accountRef.current));
    setMessages([greetingMessage(greeting)]);
    setChatError(null);
    setConfirmReset(false);
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={t('ai.chat.title')}
          className={`fixed z-[100] bg-white dark:bg-[#18181b] shadow-[0_12px_40px_rgb(0,0,0,0.18)] dark:shadow-[0_12px_40px_rgb(0,0,0,0.6)] border border-gray-200 dark:border-gray-700/80 flex flex-col overflow-hidden origin-bottom-right transition-all duration-300 ease-in-out motion-reduce:transition-none ${
          isExpanded
            ? 'bottom-0 right-0 w-full md:w-screen h-[100dvh] max-h-none rounded-none'
            : 'bottom-5 right-4 sm:right-6 w-[95vw] sm:w-[440px] md:w-[460px] h-[640px] max-h-[85vh] rounded-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95'
        }`}>

          {/* Header */}
          <div className="gradient-btn p-4 flex justify-between items-center text-white shadow-sm">
            <div>
              <h3 className="font-bold flex items-center gap-2">
                <span className="relative flex h-3 w-3" aria-hidden="true">
                  <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400"></span>
                </span>
                HaloTicket Assistant
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer"
                title={t('ai.chat.reset')}
                aria-label={t('ai.chat.reset')}
              >
                <RotateCcw size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer"
                title={isExpanded ? t('ai.chat.collapse') : t('ai.chat.expand')}
                aria-label={isExpanded ? t('ai.chat.collapse') : t('ai.chat.expand')}
              >
                {isExpanded ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer"
                title={t('ai.chat.close')}
                aria-label={t('ai.chat.close')}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
          </div>

          {confirmReset && (
            <div role="alertdialog" aria-label={t('ai.chat.resetConfirm')} className="px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/50 flex items-center justify-between gap-2 text-sm text-amber-900 dark:text-amber-200">
              <span>{t('ai.chat.resetConfirm')}</span>
              <span className="flex gap-2 shrink-0">
                <button type="button" onClick={() => setConfirmReset(false)} className="px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 text-xs font-semibold cursor-pointer">
                  {t('ai.chat.resetConfirmNo')}
                </button>
                <button type="button" onClick={resetConversation} className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold cursor-pointer">
                  {t('ai.chat.resetConfirmYes')}
                </button>
              </span>
            </div>
          )}

          {/* Messages Area */}
          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-label={t('ai.chat.conversation')}
            className="flex-1 p-4 overflow-y-auto bg-gray-50/50 dark:bg-[#18181b]"
          >
            {messages.map((msg, index) => (
              <AIChatMessage
                key={msg.id}
                message={index === 0 && msg.id === '1' ? { ...msg, text: greeting } : msg}
                onSendMessage={sendMessage}
              />
            ))}
            {isLoading && (
              <div className="flex items-center text-text-muted gap-2 ml-2 mb-4" role="status">
                <Loader2 size={16} className="motion-safe:animate-spin text-brand-primary" aria-hidden="true" />
                <span className="text-sm italic">{t('ai.chat.thinking')}</span>
              </div>
            )}
            {chatError && !isLoading && (
              <div role="alert" className="mb-4 mr-8 flex items-start gap-2 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-2.5 text-sm text-red-800 dark:text-red-200">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p data-ai-error-kind={chatError.info.kind}>{aiErrorMessage(chatError.info)}</p>
                  {chatError.info.retryable && (
                    <button
                      type="button"
                      onClick={resend}
                      disabled={cooldown > 0}
                      className="mt-1.5 inline-flex items-center gap-1 rounded-lg border border-red-300 dark:border-red-800 px-2.5 py-1 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 cursor-pointer"
                    >
                      <RotateCcw size={12} aria-hidden="true" />
                      {t('ai.action.resend')}{cooldown > 0 ? ` (${cooldown}s)` : ''}
                    </button>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 bg-gray-50/80 dark:bg-[#18181b]/80 border-t border-gray-100 dark:border-gray-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { label: t('ai.chat.suggestHot'), text: t('ai.chat.suggestHotText') },
                { label: t('ai.chat.suggestMusic'), text: t('ai.chat.suggestMusicText') },
                { label: t('ai.chat.suggestTheatre'), text: t('ai.chat.suggestTheatreText') },
                { label: t('ai.chat.suggestHcm'), text: t('ai.chat.suggestHcmText') }
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
              <label htmlFor="ai-chat-input" className="sr-only">{t('ai.chat.inputLabel')}</label>
              <textarea
                id="ai-chat-input"
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={t('ai.chat.inputPlaceholder')}
                className="flex-1 bg-transparent border-none focus:outline-none resize-none max-h-32 text-sm py-1.5 px-2 text-text-main dark:text-white"
                rows={1}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isLoading}
                className="p-2 gradient-btn text-white rounded-lg disabled:opacity-50 disabled:grayscale hover:brightness-110 transition-all shadow-sm cursor-pointer"
                title={t('ai.chat.send')}
                aria-label={t('ai.chat.send')}
              >
                <Send size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <div className="fixed bottom-24 right-8 z-50">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="w-12 h-12 rounded-full gradient-btn hover:scale-110 text-white flex items-center justify-center shadow-xl transition-all duration-300 motion-reduce:transition-none relative group cursor-pointer"
            aria-label={t('ai.chat.open')}
            title={t('ai.chat.open')}
          >
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5" aria-hidden="true">
              <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border-2 border-white dark:border-[#18181b]"></span>
            </span>
            <MessageCircle className="w-6 h-6 group-hover:-translate-y-0.5 transition-transform duration-300" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
};

export default AIChatWidget;
