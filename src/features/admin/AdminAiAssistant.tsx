import { useEffect, useEffectEvent, useRef, useState, type ComponentPropsWithoutRef, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, ClipboardCheck, BarChart3, Loader2, Maximize2, Minimize2, PanelLeftOpen, Plus, Send, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { aiApi } from '@/services/aiApi';
import { adminChatApi } from '@/services/adminChatApi';
import { eventApi } from '@/services/eventApi';
import type { ChatConversationSummary } from '@/types/ai';
import { resolveAiError, aiErrorMessage, type AiErrorInfo } from '@/utils/aiErrors';
import { Link } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import { ChatSuggestionBar, ChatTypingBubble } from '@/components/common/ChatFeedback';
import { ChatMessageTime } from '@/components/common/ChatMessageTime';
import { ChatHistoryResizeHandle } from '@/components/common/ChatHistoryResizeHandle';
import OrganizerSessionDrawer from '@/components/common/OrganizerAIChatWidget/OrganizerSessionDrawer';
import { createRequestId, sortOrganizerSessions } from '@/components/common/OrganizerAIChatWidget/organizerChatSessions';

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

const logo = '/assets/brand/logo-ai.png';
const headerButton = 'grid size-9 shrink-0 place-items-center rounded-lg hover:bg-white/15 cursor-pointer disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-white';
const topics = [
  { key: 'overview', icon: BarChart3 },
  { key: 'pending', icon: ClipboardCheck },
  { key: 'health', icon: Activity },
] as const;

function isApprovalQuestion(text: string) {
  return /duyệt|approv/i.test(text) && /sự kiện|event/i.test(text);
}

async function approvalEvents(question: string, usedTools?: string[]) {
  if (!isApprovalQuestion(question) && !usedTools?.includes('list_pending_events')) return;
  try {
    const events = await eventApi.getApprovalEvents('PENDING');
    return events.flatMap((event): ActionableEvent[] => {
      const { id, title, organizer } = event;
      if ((typeof id !== 'string' && typeof id !== 'number') || typeof title !== 'string') return [];
      const name = organizer && typeof organizer === 'object' && 'name' in organizer ? organizer.name : undefined;
      return [{ id, title, organizer: typeof name === 'string' ? { name } : undefined }];
    }).slice(0, 3);
  } catch {
    // The answer remains usable even if the live approval list is unavailable.
  }
}

interface PendingTurn {
  message: ChatMessage;
  requestId: string;
  conversationId: string;
  history: ChatMessage[];
}

interface Props {
  owner?: string;
  isOpen?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onClose?: () => void;
}

export default function AdminAiAssistant({ owner, isOpen = true, isExpanded = false, onToggleExpand, onClose }: Props) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [historyWidth, setHistoryWidth] = useState(224);
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isLoadingSessions, setLoadingSessions] = useState(Boolean(owner));
  const [isLoadingDetail, setLoadingDetail] = useState(false);
  const [isClearingAll, setClearingAll] = useState(false);
  const [mutatingSessionId, setMutatingSessionId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pending, setPending] = useState<PendingTurn | null>(null);
  const [chatError, setChatError] = useState<AiErrorInfo | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [isWide, setWide] = useState(() => window.matchMedia?.('(min-width: 768px)').matches ?? false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const historyToggle = useRef<HTMLButtonElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const operation = useRef<AbortController | null>(null);
  const isBusy = isLoading || isLoadingDetail || isLoadingSessions;
  const composerDisabled = isBusy || isClearingAll || Boolean(mutatingSessionId);
  const sidebar = isExpanded && isWide;

  function fillDraft(text: string) {
    setInputText(text);
    inputRef.current?.focus({ preventScroll: true });
  }

  function clearDraft() {
    setPending(null);
    setChatError(null);
    setCooldown(0);
    setInputText('');
  }

  function newConversation() {
    if (operation.current) return;
    clearDraft();
    setActiveId(null);
    setMessages([]);
    if (!sidebar) setDrawerOpen(false);
    inputRef.current?.focus({ preventScroll: true });
  }

  async function runTask(task: (signal: AbortSignal) => Promise<void>, onError: (message: string) => void) {
    if (operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    try {
      await task(controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) onError(aiErrorMessage(resolveAiError(error)));
    } finally {
      if (operation.current === controller) operation.current = null;
    }
  }

  async function loadConversation(id: string, signal: AbortSignal) {
    if (!owner) return;
    setLoadingDetail(true);
    setSessionsError(null);
    try {
      const detail = await adminChatApi(owner, signal).get(id);
      if (signal.aborted) return;
      const restored = detail.messages.map((message): ChatMessage => ({
        id: message.id,
        sender: message.role === 'user' ? 'user' : 'ai',
        text: message.content,
        timestamp: new Date(message.created_at),
        toolsUsed: message.tools_used,
        grounded: message.grounded,
      }));
      clearDraft();
      setActiveId(id);
      setMessages(restored);
      if (!sidebar) setDrawerOpen(false);
      const latest = restored.at(-1);
      if (latest?.sender === 'ai') {
        void approvalEvents(restored.at(-2)?.text ?? '', latest.toolsUsed).then(events => {
          if (!signal.aborted && events?.length) {
            setMessages(current => current.map(message => message.id === latest.id ? { ...message, actionableEvents: events } : message));
          }
        });
      }
    } finally {
      if (!signal.aborted) setLoadingDetail(false);
    }
  }

  const refresh = async (signal: AbortSignal, selectLatest = false) => {
    if (!owner) return;
    setLoadingSessions(true);
    setSessionsError(null);
    try {
      const saved = await adminChatApi(owner, signal).list();
      if (signal.aborted) return;
      setSessions(saved);
      if (activeId && !saved.some(session => session.id === activeId)) {
        clearDraft();
        setActiveId(null);
        setMessages([]);
      }
      if (selectLatest && saved.length) {
        const [latest] = [...saved].sort((first, second) => Date.parse(second.updated_at) - Date.parse(first.updated_at));
        await loadConversation(latest.id, signal);
      }
    } finally {
      if (!signal.aborted) setLoadingSessions(false);
    }
  };

  useEffect(() => {
    const media = window.matchMedia?.('(min-width: 768px)');
    const update = () => setWide(media?.matches ?? false);
    media?.addEventListener?.('change', update);
    return () => media?.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (isOpen && !composerDisabled) inputRef.current?.focus({ preventScroll: true });
  }, [isOpen, composerDisabled]);

  useEffect(() => {
    if (!isOpen || !onClose) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (confirmDeleteId) setConfirmDeleteId(null);
      else if (confirmClearAll) setConfirmClearAll(false);
      else if (isDrawerOpen) {
        setDrawerOpen(false);
        historyToggle.current?.focus();
      } else onClose();
    };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [isOpen, onClose, confirmDeleteId, confirmClearAll, isDrawerOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages, pending, isLoading, chatError]);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(seconds => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const initialize = useEffectEvent(() => void runTask(signal => refresh(signal, true), setSessionsError));

  useEffect(() => {
    if (owner) initialize();
    return () => {
      operation.current?.abort();
      operation.current = null;
    };
  }, [owner]);

  function selectConversation(id: string) {
    void runTask(signal => loadConversation(id, signal), setSessionsError);
  }

  function pinConversation(session: ChatConversationSummary) {
    if (!owner) return;
    void runTask(async signal => {
      setMutatingSessionId(session.id);
      setMutationError(null);
      try {
        const updated = await adminChatApi(owner, signal).pin(session.id, !session.is_pinned);
        if (!signal.aborted) setSessions(current => current.map(row => row.id === updated.id ? updated : row));
      } finally {
        if (!signal.aborted) setMutatingSessionId(null);
      }
    }, setMutationError);
  }

  function deleteConversations(id?: string) {
    if (!owner) return;
    void runTask(async signal => {
      if (id) setMutatingSessionId(id);
      else setClearingAll(true);
      setMutationError(null);
      try {
        await adminChatApi(owner, signal).remove(id);
        if (signal.aborted) return;
        setSessions(current => id ? current.filter(row => row.id !== id) : []);
        setConfirmDeleteId(null);
        setConfirmClearAll(false);
        if (!id || activeId === id) {
          clearDraft();
          setActiveId(null);
          setMessages([]);
        }
      } finally {
        if (!signal.aborted) {
          setMutatingSessionId(null);
          setClearingAll(false);
        }
      }
    }, setMutationError);
  }

  function requestReply(turn: PendingTurn) {
    if (composerDisabled) return;
    void runTask(async signal => {
      setPending(turn);
      setChatError(null);
      setIsLoading(true);
      try {
        let response;
        if (owner) {
          const api = adminChatApi(owner, signal);
          if (activeId !== turn.conversationId) {
            const created = await api.create(turn.conversationId);
            if (signal.aborted) return;
            setActiveId(created.id);
            setSessions(current => [created, ...current.filter(row => row.id !== created.id)]);
          }
          response = await api.send(turn.message.text, turn.conversationId, turn.requestId);
        } else {
          response = await aiApi.chatAdminAssistant(turn.message.text, turn.history.map(entry => ({
            role: entry.sender === 'user' ? 'user' : 'assistant', content: entry.text,
          })));
        }
        if (signal.aborted) return;
        const replyId = createRequestId();
        setMessages(current => [...current, turn.message, {
          id: replyId, sender: 'ai', text: response.reply, timestamp: new Date(),
          toolsUsed: response.tools_used, grounded: response.grounded,
        }]);
        void approvalEvents(turn.message.text, response.tools_used).then(events => {
          if (!signal.aborted && events?.length) {
            setMessages(current => current.map(message => message.id === replyId ? { ...message, actionableEvents: events } : message));
          }
        });
        setPending(null);
        if (owner) {
          const updatedAt = new Date().toISOString();
          setSessions(current => current.map(row => row.id === turn.conversationId
            ? { ...row, title: row.title || Array.from(turn.message.text).slice(0, 60).join(''), updated_at: updatedAt }
            : row));
        }
      } catch (error) {
        if (!signal.aborted) {
          const info = resolveAiError(error);
          setChatError(info);
          setCooldown(info.retryAfterSeconds ?? 0);
        }
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    }, setMutationError);
  }

  function onSend(event: FormEvent) {
    event.preventDefault();
    const text = inputText.trim();
    if (!text || pending || composerDisabled || operation.current) return;
    setInputText('');
    const requestId = createRequestId();
    requestReply({
      requestId, conversationId: activeId ?? createRequestId(), history: messages,
      message: { id: requestId, sender: 'user', text, timestamp: new Date() },
    });
  }

  const last = messages.at(-1);
  const suggestions = last?.toolsUsed?.includes('list_pending_events')
    ? ['pending', 'reviewDetails', 'health']
    : last?.toolsUsed?.includes('get_attention_feed')
      ? ['health', 'systemErrors', 'pending']
      : ['overview', 'pending', 'health'];
  const visibleMessages = pending ? [...messages, pending.message] : messages;
  const column = isExpanded ? 'mx-auto w-full max-w-4xl' : 'w-full';

  return (
    <>
      <header className="flex min-h-12 shrink-0 items-center gap-2 bg-brand-primary px-3 text-white dark:bg-blue-700">
        {owner && <button ref={historyToggle} type="button" className={headerButton}
          aria-label={t('ai.organizer.sessions.toggleHistory')} aria-expanded={isDrawerOpen}
          aria-controls={isDrawerOpen ? 'organizer-session-drawer' : undefined}
          onClick={() => setDrawerOpen(value => !value)}><PanelLeftOpen size={18} aria-hidden="true" /></button>}
        <span className="relative size-7 shrink-0">
          <img src={logo} alt="" className="size-full rounded-full bg-white object-cover" />
          <span className="absolute -right-0.5 bottom-0 size-2.5 rounded-full bg-emerald-400 ring-2 ring-brand-primary dark:ring-blue-700" />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{t('ai.assist.adminTitle')}</h3>
        {owner && <button type="button" className={headerButton} disabled={composerDisabled}
          aria-label={t('ai.organizer.sessions.newChat')} onClick={newConversation}><Plus size={18} aria-hidden="true" /></button>}
        {onToggleExpand && <button type="button" className={headerButton} onClick={onToggleExpand}
          aria-label={t(isExpanded ? 'ai.chat.collapse' : 'ai.chat.expand')}>
          {isExpanded ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}
        </button>}
        {onClose && <button type="button" className={headerButton} aria-label={t('ai.chat.close')} onClick={onClose}><X size={20} aria-hidden="true" /></button>}
      </header>
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {owner && <OrganizerSessionDrawer
          variant={sidebar ? 'sidebar' : 'overlay'} sidebarWidth={historyWidth} isOpen={isDrawerOpen} activeScope="admin"
          sessions={sortOrganizerSessions(sessions)} activeConversationId={activeId}
          searchQuery={searchQuery} onSearchQueryChange={setSearchQuery}
          isLoadingSessions={isLoadingSessions} sessionsError={sessionsError} mutationError={mutationError}
          onDismissMutationError={() => setMutationError(null)} isBusy={isBusy} isClearingAll={isClearingAll}
          mutatingSessionId={mutatingSessionId} confirmDeleteId={confirmDeleteId}
          onRequestDeleteSession={setConfirmDeleteId} onConfirmDeleteSession={deleteConversations}
          confirmClearAll={confirmClearAll} onRequestClearAll={setConfirmClearAll}
          onConfirmClearAll={() => deleteConversations()} onSelectSession={selectConversation}
          onNewChat={newConversation} onTogglePin={pinConversation}
          onRefresh={() => void runTask(signal => refresh(signal, activeId === null && !messages.length), setSessionsError)}
          onClose={() => { setDrawerOpen(false); historyToggle.current?.focus(); }}
        />}
        {sidebar && isDrawerOpen && (
          <ChatHistoryResizeHandle label={t('ai.organizer.sessions.resize')} width={historyWidth} setHistoryWidth={setHistoryWidth} />
        )}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div role="log" aria-live="polite" aria-label={t('ai.chat.conversation')}
            className="min-h-0 flex-1 overflow-y-auto bg-gray-50/60 dark:bg-[#18181b]">
            <div className={`${column} space-y-3.5 px-3 py-4 sm:px-4`}>
              {(isLoadingDetail || isLoadingSessions) && (
                <p role="status" className="flex items-center gap-2 text-sm text-text-muted">
                  <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" /> {t('ai.chat.loadingHistory')}
                </p>
              )}
              {!isDrawerOpen && sessionsError && (
                <div role="alert" className="text-sm text-red-700 dark:text-red-300">
                  {sessionsError}{' '}
                  <button type="button" className="font-semibold underline"
                    onClick={() => void runTask(signal => refresh(signal, activeId === null), setSessionsError)}>{t('ai.action.retry')}</button>
                </div>
              )}
              {!visibleMessages.length && !isLoadingDetail && !isLoadingSessions && (
                <section className="py-1.5">
                  <div className="flex items-start gap-2.5">
                    <img src={logo} alt="" className="mt-1 size-8 shrink-0 rounded-full bg-white ring-2 ring-brand-primary/60" />
                    <p className="rounded-2xl border border-brand-primary/15 bg-white px-3.5 py-3 text-sm text-gray-700 dark:bg-[#202024] dark:text-gray-200">
                      {t('ai.assist.welcome')}
                    </p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:ml-[42px] sm:grid-cols-2">
                    {topics.map(({ key, icon: Icon }) => <button key={key} type="button" onClick={() => fillDraft(t(`ai.assist.prompt.${key}`))}
                      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-left text-xs font-semibold hover:border-brand-primary/50 dark:border-zinc-700 dark:bg-[#202024]">
                      <Icon size={16} className="shrink-0 text-brand-primary" aria-hidden="true" /> {t(`ai.assist.prompt.${key}`)}
                    </button>)}
                  </div>
                </section>
              )}
          {visibleMessages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              {msg.sender === "ai" && <img src={logo} alt="" className="mt-0.5 mr-2 size-8 shrink-0 rounded-full bg-white object-cover ring-2 ring-brand-primary/60" />}
              <div className={`min-w-0 max-w-[90%] sm:max-w-[85%] px-3.5 py-2.5 text-sm shadow-xs ${
                msg.sender === "user" 
                  ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm" 
                  : "bg-white dark:bg-[#1e1e22] app-text-main rounded-2xl rounded-tl-sm border border-slate-200 dark:border-slate-800"
              }`}>
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
                <ChatMessageTime timestamp={msg.timestamp} outgoing={msg.sender === 'user'} />
              </div>
            </div>
          ))}
              {isLoading && <ChatTypingBubble status={t('ai.chat.replying')} />}
              {chatError && !isLoading && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                  <p>{aiErrorMessage(chatError)}</p>
                  {pending && chatError.retryable && (
                    <button type="button" onClick={() => requestReply(pending)} disabled={cooldown > 0 || composerDisabled}
                      className="mt-1 cursor-pointer font-semibold underline disabled:opacity-50">
                      {t('ai.action.resend')}{cooldown > 0 ? ` (${cooldown}s)` : ''}
                    </button>
                  )}
                  <button type="button" className="ml-2 cursor-pointer font-semibold underline"
                    onClick={() => {
                      if (owner && activeId && chatError.status !== 404) selectConversation(activeId);
                      else if (chatError.status === 404) newConversation();
                      else clearDraft();
                    }}>{t('ai.assist.dismissSend')}</button>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          {last?.sender === 'ai' && (
            <ChatSuggestionBar questions={suggestions.map(key => t(`ai.assist.prompt.${key}`))}
              label={t('ai.organizer.suggestionsLabel')} columnClassName={column} wrap={sidebar}
              onSelect={fillDraft} disabled={composerDisabled} testIdPrefix="admin" />
          )}
          <footer className="shrink-0 border-t border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-[#18181b]">
            <form onSubmit={onSend} className={`${column} flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1.5 shadow-inner focus-within:border-brand-primary/60 dark:border-gray-700 dark:bg-[#27272a]`}>
              <textarea ref={inputRef} value={inputText} maxLength={4000} rows={1} disabled={composerDisabled}
                onChange={event => setInputText(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder={t('ai.assist.inputPlaceholder')} aria-label={t('ai.chat.inputLabel')}
                className="min-h-9 max-h-24 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-1.5 text-sm leading-6 text-text-main outline-none [field-sizing:content] dark:text-white" />
              <button type="submit" disabled={!inputText.trim() || Boolean(pending) || composerDisabled} aria-label={t('ai.chat.send')}
                className="gradient-btn grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-white shadow-sm disabled:opacity-50">
                <Send size={17} aria-hidden="true" />
              </button>
            </form>
          </footer>
        </div>
      </div>
    </>
  );
}
