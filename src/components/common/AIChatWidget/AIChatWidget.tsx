import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CalendarDays, Loader2, MapPin, Maximize2, Minimize2, Music2, RotateCcw, Send, Theater, X } from 'lucide-react';
import { aiApi } from '@/services/aiApi';
import { getKeycloakSession } from '@/services/keycloakSession';
import type { AiChatMessage, CustomerChatHistory } from '@/types/ai';
import { aiErrorMessage, resolveAiError, type AiErrorInfo } from '@/utils/aiErrors';
import { ChatSuggestionBar, ChatTypingBubble } from '../ChatFeedback';
import { ChatWindow, type ChatAnchor } from '../ChatWindow';
import { ChatLauncher } from '../ChatLauncher';
import { useChatWindowPresence } from '../useChatWindowPresence';
import AIChatMessage from './AIChatMessage';
import { dropStaleActions, findSelectedEventId } from './bookingConfirmation';
import { clearLegacyHistory, getCustomerChatIdentity, randomHex, readLegacyHistory, removeLegacyHistory, type CustomerChatIdentity } from './customerChatStorage';

const MAX_INPUT_CHARS = 400;
const logo = '/assets/brand/logo-ai.png';
const headerButton = 'grid size-9 place-items-center rounded-lg hover:bg-white/15 transition-colors cursor-pointer disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-white';
const topics = [
  { key: 'Hot', icon: CalendarDays },
  { key: 'Music', icon: Music2 },
  { key: 'Theatre', icon: Theater },
  { key: 'Hcm', icon: MapPin },
] as const;
const followUps = {
  discovery: ['moreEvents', 'weekendEvents', 'freeEvents'],
  tickets: ['ticketPrices', 'seatMap', 'ticketAvailability'],
  confirmation: ['reviewBooking', 'otherTickets'],
} as const;

function fromServer(history: CustomerChatHistory) {
  const messages = history.messages.map<AiChatMessage>(({ id, role, content, created_at, system_actions }) => ({
    id,
    sender: role === 'user' ? 'user' : 'ai',
    text: content,
    timestamp: new Date(created_at),
    actions: system_actions?.length ? system_actions : undefined,
  }));
  return {
    generation: history.generation,
    olderCursor: history.older_cursor,
    messages: dropStaleActions(messages, Date.now()),
  };
}

const emptyConversation = { generation: 0, olderCursor: null, messages: [] };

interface PendingTurn {
  message: AiChatMessage;
  prompt: string;
  generation: number;
  selectedEventId?: string;
}

interface PanelProps {
  identity: CustomerChatIdentity | null;
  isOpen: boolean;
  isPresent: boolean;
  anchor?: ChatAnchor;
  isExpanded: boolean;
  onExited: () => void;
  onExpand: () => void;
  onClose: () => void;
}

function CustomerChatPanel({ identity, isOpen, isPresent, isExpanded, anchor, onExited, onExpand, onClose }: PanelProps) {
  const { t } = useTranslation();
  const [conversation, setConversation] = useState<ReturnType<typeof fromServer>>(emptyConversation);
  const { generation, olderCursor, messages } = conversation;
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<PendingTurn | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'load-error' | 'sending' | 'resetting'>('loading');
  const [error, setError] = useState<AiErrorInfo | null>(null);
  const [resetError, setResetError] = useState<AiErrorInfo | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [reload, setReload] = useState(0);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<AiErrorInfo | null>(null);
  const historyRequest = useRef<AbortController | null>(null);
  const activeMutation = useRef<AbortController | null>(null);
  const scrollAnchor = useRef<{ height: number; top: number } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const composerDisabled = phase !== 'ready';
  const canLoad = useEffectEvent(() => !activeMutation.current && !pending);

  useEffect(() => {
    if (!isOpen || !identity || !canLoad()) return;
    const { owner, legacyAccounts } = identity;
    historyRequest.current?.abort();
    const controller = new AbortController();
    const { signal } = controller;
    historyRequest.current = controller;
    async function load() {
      try {
        const legacy = readLegacyHistory(legacyAccounts);
        const history = legacy
          ? await aiApi.importCustomerChat(owner, legacy.messages, signal)
          : await aiApi.getCustomerChat(owner, signal);
        if (signal.aborted) return;
        if (legacy?.complete && 'imported' in history && history.imported) removeLegacyHistory(legacy.key);
        setConversation(fromServer(history));
        setError(null);
        setOlderError(null);
        setPhase('ready');
      } catch (failure) {
        if (signal.aborted) return;
        setError(resolveAiError(failure));
        setPhase('load-error');
      } finally {
        if (historyRequest.current === controller) historyRequest.current = null;
      }
    }
    void load();
    return () => controller.abort();
  }, [identity, isOpen, reload]);

  useEffect(() => () => {
    historyRequest.current?.abort();
    activeMutation.current?.abort();
  }, []);

  useLayoutEffect(() => {
    const anchor = scrollAnchor.current;
    const log = logRef.current;
    if (anchor && log) {
      log.scrollTop = anchor.top + log.scrollHeight - anchor.height;
      scrollAnchor.current = null;
      return;
    }
    messagesEnd.current?.scrollIntoView?.({ block: 'end' });
  }, [isOpen, messages, pending, phase, error]);

  useEffect(() => {
    if (isOpen && !composerDisabled && !confirmReset) textarea.current?.focus({ preventScroll: true });
  }, [isOpen, composerDisabled, confirmReset]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (!confirmReset) onClose();
      else if (phase !== 'resetting') setConfirmReset(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, confirmReset, onClose, phase]);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(seconds => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function loadOlder() {
    if (!identity || !olderCursor || historyRequest.current || activeMutation.current) return;
    const controller = new AbortController();
    const { signal } = controller;
    historyRequest.current = controller;
    setLoadingOlder(true);
    setOlderError(null);
    try {
      const history = await aiApi.getCustomerChat(identity.owner, signal, olderCursor);
      if (signal.aborted) return;
      if (history.generation !== generation) {
        setPending(null);
        setConversation(emptyConversation);
        setPhase('loading');
        setReload(value => value + 1);
        return;
      }
      const log = logRef.current;
      if (log) scrollAnchor.current = { height: log.scrollHeight, top: log.scrollTop };
      const previous = fromServer(history);
      setConversation({ ...previous, messages: [...previous.messages, ...messages] });
    } catch (failure) {
      if (!signal.aborted) setOlderError(resolveAiError(failure));
    } finally {
      if (historyRequest.current === controller) historyRequest.current = null;
      setLoadingOlder(false);
    }
  }

  async function submit(turn: PendingTurn) {
    if (!identity || activeMutation.current || composerDisabled || confirmReset) return;
    historyRequest.current?.abort();
    const controller = new AbortController();
    const { signal } = controller;
    activeMutation.current = controller;
    setPending(turn);
    setError(null);
    setPhase('sending');
    try {
      const history = await aiApi.chatWithSmartBooking({
        owner: identity.owner,
        signal,
        message: turn.prompt,
        displayMessage: turn.message.text,
        requestId: turn.message.id,
        generation: turn.generation,
        selectedEventId: turn.selectedEventId,
      });
      if (signal.aborted) return;
      setConversation(fromServer(history));
      setPending(null);
    } catch (failure) {
      if (signal.aborted) return;
      const info = resolveAiError(failure);
      if (info.code === 'AI_CHAT_RESET') {
        setPending(null);
        setConversation(emptyConversation);
        setDraft(turn.message.text);
        setPhase('loading');
        setReload(value => value + 1);
        return;
      }
      setError(info);
      setCooldown(info.retryAfterSeconds ?? 0);
    } finally {
      activeMutation.current = null;
      if (!signal.aborted) setPhase(current => current === 'sending' ? 'ready' : current);
    }
  }

  function sendMessage(text: string, hiddenContext?: string) {
    const content = text.trim();
    if (!content) return;
    void submit({
      message: { id: randomHex(16), sender: 'user', text: content, timestamp: new Date() },
      prompt: hiddenContext ? content + ' ' + hiddenContext : content,
      generation,
      selectedEventId: findSelectedEventId(dropStaleActions(messages, Date.now())),
    });
  }

  function sendDraft() {
    if (!draft.trim() || activeMutation.current || composerDisabled || confirmReset) return;
    sendMessage(draft);
    setDraft('');
  }

  async function resetConversation() {
    if (!identity || activeMutation.current || composerDisabled) return;
    historyRequest.current?.abort();
    const controller = new AbortController();
    const { signal } = controller;
    activeMutation.current = controller;
    setPhase('resetting');
    setResetError(null);
    try {
      const history = await aiApi.resetCustomerChat(identity.owner, signal);
      if (signal.aborted) return;
      clearLegacyHistory(identity.legacyAccounts);
      setConversation(fromServer(history));
      setPending(null);
      setError(null);
      setOlderError(null);
      setCooldown(0);
      setConfirmReset(false);
    } catch (failure) {
      if (!signal.aborted) setResetError(resolveAiError(failure));
    } finally {
      activeMutation.current = null;
      if (!signal.aborted) setPhase('ready');
    }
  }

  if (!isPresent) return null;

  const latestReply = messages.at(-1);
  const actions = latestReply?.actions;
  const suggestedQuestions = actions?.some(action => action.action === 'USER_CONFIRMATION_REQUIRED')
    ? followUps.confirmation
    : actions?.some(action => action.action === 'SHOW_TICKET_TYPES' || action.action === 'SHOW_SEATMAP')
      ? followUps.tickets
      : followUps.discovery;

  return createPortal(
    <ChatWindow label={t('ai.chat.title')} isOpen={isOpen} isExpanded={isExpanded} anchor={anchor} onExited={onExited}>
      <header className="flex min-h-12 shrink-0 items-center justify-between gap-2 bg-brand-primary px-3 text-white dark:bg-blue-700">
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative size-7 shrink-0">
            <img src={logo} alt="" className="size-full rounded-full bg-white object-cover" />
            <span aria-hidden="true" className="absolute -right-0.5 bottom-0 size-2.5 rounded-full bg-emerald-400 ring-2 ring-brand-primary dark:ring-blue-700" />
          </div>
          <h3 className="truncate text-sm font-semibold">{t('ai.chat.title')}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button type="button" onClick={() => { setConfirmReset(true); setResetError(null); }} disabled={composerDisabled}
            className={headerButton} title={t('ai.chat.reset')} aria-label={t('ai.chat.reset')}>
            <RotateCcw size={17} aria-hidden="true" />
          </button>
          <button type="button" onClick={onExpand} className={headerButton}
            title={t(isExpanded ? 'ai.chat.collapse' : 'ai.chat.expand')}
            aria-label={t(isExpanded ? 'ai.chat.collapse' : 'ai.chat.expand')}>
            {isExpanded ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}
          </button>
          <button type="button" onClick={onClose} className={headerButton} title={t('ai.chat.close')} aria-label={t('ai.chat.close')}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      {confirmReset && (
        <div role="alertdialog" aria-label={t('ai.chat.resetConfirm')} className="shrink-0 border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-[#202024]">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-text-main">{t('ai.chat.resetConfirm')}</span>
            <span className="flex gap-2">
              <button type="button" onClick={() => setConfirmReset(false)} disabled={phase === 'resetting'}
                className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-text-main disabled:opacity-50 dark:border-zinc-600">
                {t('ai.chat.resetConfirmNo')}
              </button>
              <button type="button" onClick={() => void resetConversation()} disabled={phase === 'resetting'}
                className="cursor-pointer rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                {t(phase === 'resetting' ? 'ai.chat.resetting' : 'ai.chat.resetConfirmYes')}
              </button>
            </span>
            {resetError && <p role="alert" className="basis-full text-red-700 dark:text-red-300">{aiErrorMessage(resetError)}</p>}
          </div>
        </div>
      )}

      <div ref={logRef} role="log" aria-live="polite" aria-relevant="additions text" aria-label={t('ai.chat.conversation')}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gray-50/60 dark:bg-[#18181b]">
        <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-4">
          {olderCursor && (
            <div className="mb-4 text-center text-sm">
              <button type="button" onClick={() => void loadOlder()} disabled={composerDisabled || loadingOlder || confirmReset}
                className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-brand-primary hover:border-brand-primary/50 disabled:opacity-50 dark:border-zinc-700 dark:bg-[#202024] dark:text-brand-accent">
                {t(loadingOlder ? 'ai.chat.loadingHistory' : 'ai.chat.loadOlder')}
              </button>
              {olderError && <p role="alert" className="mt-1 text-red-700 dark:text-red-300">{aiErrorMessage(olderError)}</p>}
            </div>
          )}
          {phase === 'loading' && (
            <div role="status" className="flex items-center gap-2 text-sm text-text-muted">
              <Loader2 size={16} className="motion-safe:animate-spin text-brand-primary" aria-hidden="true" />
              {t('ai.chat.loadingHistory')}
            </div>
          )}
          {phase === 'ready' && !messages.length && !pending && (
            <section className="py-1.5">
              <div className="flex items-start gap-2.5">
                <img src={logo} alt="" className="mt-1 size-8 shrink-0 rounded-full bg-white object-cover ring-2 ring-brand-primary/60" />
                <p className="rounded-2xl border border-brand-primary/15 bg-white px-3.5 py-3 text-sm leading-relaxed text-gray-700 shadow-xs dark:bg-[#202024] dark:text-gray-200">
                  {t('ai.chat.greeting')}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 min-[375px]:grid-cols-2 sm:ml-[42px]">
                {topics.map(({ key, icon: Icon }) => (
                  <button key={key} type="button" disabled={confirmReset}
                    onClick={() => { setDraft(t(`ai.chat.suggest${key}Text`)); textarea.current?.focus(); }}
                    className="group flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white p-2.5 text-start text-xs font-semibold text-gray-800 shadow-2xs transition-colors hover:border-brand-primary/50 hover:bg-brand-primary/5 focus-visible:outline-2 focus-visible:outline-brand-primary disabled:opacity-50 dark:border-zinc-700 dark:bg-[#202024] dark:text-gray-100">
                    <Icon size={16} className="shrink-0 text-brand-primary dark:text-brand-accent" aria-hidden="true" />
                    {t(`ai.chat.suggest${key}`)}
                  </button>
                ))}
              </div>
            </section>
          )}
          {messages.map(message => <AIChatMessage key={message.id} message={message} onSendMessage={sendMessage} />)}
          {pending && <AIChatMessage key={pending.message.id} message={pending.message} onSendMessage={sendMessage} />}
          {phase === 'sending' && <ChatTypingBubble status={t('ai.chat.replying')} />}
          {error && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p data-ai-error-kind={error.kind}>{error.code === 'AI_CHAT_CHANGED' ? t('ai.chat.changed') : aiErrorMessage(error)}</p>
                {phase === 'load-error' && (
                  <button type="button" className="mt-1 cursor-pointer font-semibold underline underline-offset-2"
                    onClick={() => { setPhase('loading'); setError(null); setReload(value => value + 1); }}>
                    {t('ai.action.retry')}
                  </button>
                )}
                {pending && error.retryable && (
                  <button type="button" onClick={() => void submit(pending)} disabled={cooldown > 0 || confirmReset}
                    className="mt-1 cursor-pointer font-semibold underline underline-offset-2 disabled:opacity-50">
                    {t('ai.action.resend')}{cooldown > 0 ? ` (${cooldown}s)` : ''}
                  </button>
                )}
              </div>
            </div>
          )}
          <div ref={messagesEnd} />
        </div>
      </div>

      <footer className="shrink-0">
        {latestReply?.sender === 'ai' && (
          <ChatSuggestionBar questions={suggestedQuestions.map(question => t(`ai.chat.followUp.${question}`))}
            label={t('ai.organizer.suggestionsLabel')} ariaLabel={t('ai.chat.followUp.label')}
            onSelect={text => { setDraft(text); textarea.current?.focus(); }} disabled={composerDisabled || confirmReset}
            testIdPrefix="customer" columnClassName="mx-auto w-full max-w-3xl" />
        )}
        <div className="border-t border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-[#18181b]">
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1.5 shadow-inner transition-colors focus-within:border-brand-primary/60 focus-within:ring-1 focus-within:ring-brand-primary/30 dark:border-gray-700 dark:bg-[#27272a]">
            <textarea ref={textarea} value={draft} maxLength={MAX_INPUT_CHARS} rows={1}
              aria-label={t('ai.chat.inputLabel')} placeholder={t('ai.chat.inputPlaceholder')}
              onChange={event => setDraft(event.target.value.slice(0, MAX_INPUT_CHARS))}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
                  event.preventDefault();
                  sendDraft();
                }
              }}
              disabled={composerDisabled || confirmReset}
              className="min-h-9 max-h-24 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-1.5 text-sm leading-6 text-text-main outline-none dark:text-white"
            />
            {draft.length >= MAX_INPUT_CHARS - 80 && (
              <span className="self-center font-mono text-[10px] text-text-muted" aria-live="polite">{draft.length}/{MAX_INPUT_CHARS}</span>
            )}
            <button type="button" onClick={sendDraft} disabled={!draft.trim() || composerDisabled || confirmReset}
              aria-label={t('ai.chat.send')} title={t('ai.chat.send')}
              className="gradient-btn grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-white shadow-sm transition-colors hover:brightness-110 focus-visible:outline-2 focus-visible:outline-brand-primary disabled:opacity-50 disabled:grayscale">
              <Send size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </footer>
    </ChatWindow>,
    document.body,
  );
}

export default function AIChatWidget() {
  const { t } = useTranslation();
  const [identity, setIdentity] = useState<CustomerChatIdentity | null>(null);
  const { isOpen, isPresent, openWindow, closeWindow, finishClose } = useChatWindowPresence();
  const [isExpanded, setIsExpanded] = useState(false);
  const [anchor, setAnchor] = useState<ChatAnchor>();
  const launcher = useRef<HTMLButtonElement>(null);
  const identityAttempt = useRef({ latest: 0 });

  const syncIdentity = useCallback(() => {
    const attempts = identityAttempt.current;
    const attempt = ++attempts.latest;
    const session = getKeycloakSession();
    const commit = (token: string | null) => {
      if (attempt !== attempts.latest) return;
      const next = getCustomerChatIdentity(token);
      setIdentity(previous => previous?.key === next.key ? previous : next);
    };
    const token = session.getCurrentToken();
    if (!token && (session.hasKeycloakSession() || session.isAuthenticated())) {
      setIdentity(null);
      void session.getAccessToken().then(commit, () => commit(null));
    } else {
      commit(token);
    }
  }, []);

  useEffect(() => {
    removeLegacyHistory();
    if (!isOpen) return;
    const attempts = identityAttempt.current;
    const events = ['auth-changed', 'storage', 'session-expired'];
    for (const name of events) window.addEventListener(name, syncIdentity);
    return () => {
      attempts.latest++;
      for (const name of events) window.removeEventListener(name, syncIdentity);
    };
  }, [isOpen, syncIdentity]);

  useEffect(() => {
    if (!isOpen || !isExpanded) return;
    const { style } = document.documentElement;
    const previous = style.overflow;
    style.overflow = 'hidden';
    return () => { style.overflow = previous; };
  }, [isOpen, isExpanded]);

  const close = useCallback(() => {
    closeWindow();
    requestAnimationFrame(() => launcher.current?.focus({ preventScroll: true }));
  }, [closeWindow]);

  return (
    <>
      {(identity || isPresent) && (
        <CustomerChatPanel key={identity?.key ?? 'loading-owner'} identity={identity}
          isOpen={isOpen} isPresent={isPresent} isExpanded={isExpanded} anchor={anchor} onExited={finishClose}
          onExpand={() => setIsExpanded(value => !value)} onClose={close} />
      )}
      <ChatLauncher kind="customer" label={t('ai.chat.open')} hidden={isOpen} buttonRef={launcher}
        hintTestId="ai-chat-hover-tooltip"
        onOpen={location => {
          setAnchor(location);
          syncIdentity();
          if (!isPresent) setIsExpanded(false);
          openWindow();
        }} />
    </>
  );
}
