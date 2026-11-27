import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
  X,
  Send,
  Loader2,
  Maximize2,
  Minimize2,
  PanelLeftOpen,
  PanelLeftClose,
  Plus,
  RotateCcw,
} from 'lucide-react';
import axios from 'axios';
import { aiApi } from '@/services/aiApi';
import type {
  OrganizerChatMessage,
  OrganizerConversationSummary,
} from '@/types/ai';
import { ChatSuggestionBar, ChatTypingBubble } from '../ChatFeedback';
import { ChatWindow, type ChatAnchor } from '../ChatWindow';
import { ChatLauncher } from '../ChatLauncher';
import { ChatHistoryResizeHandle } from '../ChatHistoryResizeHandle';
import { useChatWindowPresence } from '../useChatWindowPresence';
import OrganizerAIChatMessage from './OrganizerAIChatMessage';
import OrganizerSessionDrawer from './OrganizerSessionDrawer';
import {
  type OrganizerChatScope,
  newMessageId,
  getCurrentUserSubject,
  useOrganizerChatSubject,
  getSessionStorageKey,
  getSelectedSessionKey,
  loadSelectedSessionState,
  saveSelectedSessionState,
  clearSelectedSessionState,
  getStarterTopics,
  deriveNextSuggestedQuestions,
} from './organizerChatStorage';
import {
  createRequestId,
  sortOrganizerSessions,
  upsertOrganizerSession,
  pickInitialConversationId,
  matchesConversationScope,
  mapConversationDetailToMessages,
  resolveOrganizerChatError,
} from './organizerChatSessions';

export type { OrganizerChatScope };


const isAbortError = (err: unknown, signal?: AbortSignal): boolean =>
  Boolean(
    signal?.aborted ||
      axios.isCancel(err) ||
      (err as { name?: string })?.name === 'CanceledError' ||
      (err as { name?: string })?.name === 'AbortError',
  );

const prefersReducedMotion = (): boolean => {
  try {
    return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    return false;
  }
};

const useIsDesktopViewport = (): boolean => {
  const getMatches = () => {
    if (typeof window === 'undefined') return true;
    if (typeof window.matchMedia === 'function') {
      const mql = window.matchMedia('(min-width: 768px)');
      if (typeof mql?.matches === 'boolean') {
        if (!mql.matches && window.innerWidth >= 768 && mql.media === '(min-width: 768px)') {
          return true;
        }
        return mql.matches;
      }
    }
    return window.innerWidth >= 768;
  };

  const [isDesktop, setIsDesktop] = useState<boolean>(getMatches);

  useEffect(() => {
    const update = () => setIsDesktop(getMatches());
    window.addEventListener('resize', update);
    const mql = typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 768px)') : null;
    mql?.addEventListener?.('change', update);
    return () => {
      window.removeEventListener('resize', update);
      mql?.removeEventListener?.('change', update);
    };
  }, []);

  return isDesktop;
};

interface FailedSendAttempt {
  text: string;
  requestId: string;
  conversationId: string | null;
  retryable: boolean;
}

/** Props cho nội dung khung chat bên trong (được gắn key theo ngữ cảnh). */
interface OrganizerAIChatInnerProps {
  userSubject: string;
  activeScope: OrganizerChatScope;
  activeEventId?: string;
  propEventTitle?: string;
  isOpen: boolean;
  isExpanded: boolean;
  onExited: () => void;
  anchor?: ChatAnchor;
  onToggleExpand: () => void;
  onClose: () => void;
}

/**
 * Thành phần bên trong quản lý toàn bộ vòng đời phiên hội thoại trên máy chủ, tin nhắn và request của một ngữ cảnh cụ thể.
 * Được mount với key duy nhất theo accountSubject:scope:eventId, đảm bảo cách ly tuyệt đối giữa tài khoản và sự kiện.
 */
const OrganizerAIChatInner: React.FC<OrganizerAIChatInnerProps> = ({
  userSubject,
  activeScope,
  activeEventId,
  propEventTitle,
  isOpen,
  isExpanded,
  onExited,
  anchor,
  onToggleExpand,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith('en'));
  const isDesktopViewport = useIsDesktopViewport();
  const isDockedSidebar = isExpanded && isDesktopViewport;

  const selectionKey = useMemo(
    () => getSelectedSessionKey(userSubject, activeScope, activeEventId),
    [userSubject, activeScope, activeEventId],
  );

  const canFetchScope = activeScope !== 'event' || Boolean(activeEventId);

  const [sessions, setSessions] = useState<OrganizerConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<OrganizerChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [historyWidth, setHistoryWidth] = useState(224);

  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(canFetchScope);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [mutatingSessionId, setMutatingSessionId] = useState<string | null>(null);

  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<{ id: string; message: string; retryable: boolean } | null>(null);
  const [failedSendAttempt, setFailedSendAttempt] = useState<FailedSendAttempt | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const streamRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyToggleRef = useRef<HTMLButtonElement>(null);
  const closeHistory = useCallback(() => {
    setIsDrawerOpen(false);
    historyToggleRef.current?.focus({ preventScroll: true });
  }, []);

  const listAbortRef = useRef<AbortController | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);
  const sendAbortRef = useRef<AbortController | null>(null);
  const mutationAbortRef = useRef<AbortController | null>(null);

  const listReqSeqRef = useRef(0);
  const detailReqSeqRef = useRef(0);
  const sendReqSeqRef = useRef(0);
  // Bộ đếm thế hệ thay đổi phiên (gửi/ghim/xóa/làm sạch): chặn mọi kết quả tải danh sách cũ ghi đè lên trạng thái mới hơn
  const mutationGenRef = useRef(0);
  const hasUserInteractedRef = useRef(false);
  const activeConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  /** Kiểm tra tài khoản hiện tại vẫn khớp tuyệt đối với phiên đã mở khung chat. */
  const isSameAuthenticatedSubject = useCallback((): boolean => {
    const current = getCurrentUserSubject();
    return Boolean(current && current === userSubject);
  }, [userSubject]);

  /** Hủy đọc danh sách đang bay và tăng thế hệ thay đổi để vô hiệu hóa phản hồi danh sách cũ. */
  const invalidatePendingListReads = useCallback(() => {
    mutationGenRef.current += 1;
    listReqSeqRef.current += 1;
    listAbortRef.current?.abort();
    listAbortRef.current = null;
    setIsLoadingSessions(false);
  }, []);

  /** Hủy đọc chi tiết đang bay. */
  const invalidatePendingDetailReads = useCallback(() => {
    detailReqSeqRef.current += 1;
    detailAbortRef.current?.abort();
    detailAbortRef.current = null;
    setIsLoadingDetail(false);
  }, []);

  /** Hủy toàn bộ request đang chạy khi đóng/đổi ngữ cảnh/đăng xuất. */
  const abortAllRequests = useCallback(() => {
    listAbortRef.current?.abort();
    listAbortRef.current = null;
    detailAbortRef.current?.abort();
    detailAbortRef.current = null;
    sendAbortRef.current?.abort();
    sendAbortRef.current = null;
    mutationAbortRef.current?.abort();
    mutationAbortRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      abortAllRequests();
    };
  }, [abortAllRequests]);

  /** Tải chi tiết một cuộc trò chuyện từ máy chủ với khóa chống ghi đè kết quả cũ. */
  const loadConversationDetail = useCallback(
    async (conversationId: string, options?: { closeOverlayOnSuccess?: boolean }) => {
      if (!isSameAuthenticatedSubject()) return;

      detailAbortRef.current?.abort();
      const controller = new AbortController();
      detailAbortRef.current = controller;
      const reqSeq = ++detailReqSeqRef.current;

      setActiveConversationId(conversationId);
      activeConversationIdRef.current = conversationId;
      saveSelectedSessionState(selectionKey, { conversationId, isDraft: false });
      setDetailError(null);
      setFailedSendAttempt(null);
      setIsLoadingDetail(true);

      if (options?.closeOverlayOnSuccess) {
        setIsDrawerOpen(false);
      }

      try {
        const detail = await aiApi.getOrganizerConversation(conversationId, {
          signal: controller.signal,
        });

        if (controller.signal.aborted || reqSeq !== detailReqSeqRef.current || !isSameAuthenticatedSubject()) {
          return;
        }

        if (!matchesConversationScope(detail, activeScope, activeEventId)) {
          mutationGenRef.current += 1;
          setSessions((prev) => prev.filter((item) => item.id !== conversationId));
          setActiveConversationId(null);
          activeConversationIdRef.current = null;
          clearSelectedSessionState(selectionKey);
          setMessages([]);
          return;
        }

        const mapped = mapConversationDetailToMessages(detail);
        setSessions((prev) => upsertOrganizerSession(prev, detail));
        setMessages(
          mapped.length > 0
            ? mapped
            : [],
        );
      } catch (err: unknown) {
        if (isAbortError(err, controller.signal) || reqSeq !== detailReqSeqRef.current || !isSameAuthenticatedSubject()) {
          return;
        }

        const resolved = resolveOrganizerChatError(err, t, 'sessions');
        if (resolved.isStaleConversation) {
          mutationGenRef.current += 1;
          setSessions((prev) => prev.filter((item) => item.id !== conversationId));
          setActiveConversationId(null);
          activeConversationIdRef.current = null;
          clearSelectedSessionState(selectionKey);
          setMessages([]);
          setMutationError(resolved.message);
        } else {
          setDetailError({
            id: conversationId,
            message: resolved.message,
            retryable: resolved.retryable,
          });
        }
      } finally {
        if (!controller.signal.aborted && reqSeq === detailReqSeqRef.current) {
          setIsLoadingDetail(false);
          detailAbortRef.current = null;
        }
      }
    },
    [activeEventId, activeScope, isSameAuthenticatedSubject, selectionKey, t],
  );

  /** Làm mới danh sách phiên hội thoại theo thao tác người dùng. */
  const refreshConversationsList = useCallback(async () => {
    if (!isSameAuthenticatedSubject() || !canFetchScope) return;

    listAbortRef.current?.abort();
    const controller = new AbortController();
    listAbortRef.current = controller;
    const reqSeq = ++listReqSeqRef.current;
    const capturedMutationGen = mutationGenRef.current;

    setIsLoadingSessions(true);
    setSessionsError(null);

    try {
      const list = await aiApi.listOrganizerConversations({
        scope: activeScope,
        eventId: activeScope === 'event' ? activeEventId : undefined,
        signal: controller.signal,
      });

      if (
        controller.signal.aborted ||
        reqSeq !== listReqSeqRef.current ||
        capturedMutationGen !== mutationGenRef.current ||
        !isSameAuthenticatedSubject()
      ) {
        return;
      }

      const validScoped = sortOrganizerSessions(
        list.filter((item) => matchesConversationScope(item, activeScope, activeEventId)),
      );
      setSessions(validScoped);

      const currentActiveId = activeConversationIdRef.current;
      if (currentActiveId && !validScoped.some((item) => item.id === currentActiveId)) {
        invalidatePendingDetailReads();
        setActiveConversationId(null);
        activeConversationIdRef.current = null;
        clearSelectedSessionState(selectionKey);
        setFailedSendAttempt(null);
        setMessages([]);
      }
    } catch (err: unknown) {
      if (
        isAbortError(err, controller.signal) ||
        reqSeq !== listReqSeqRef.current ||
        capturedMutationGen !== mutationGenRef.current ||
        !isSameAuthenticatedSubject()
      ) {
        return;
      }
      const resolved = resolveOrganizerChatError(err, t, 'sessions');
      setSessionsError(resolved.message);
    } finally {
      if (
        !controller.signal.aborted &&
        reqSeq === listReqSeqRef.current &&
        capturedMutationGen === mutationGenRef.current
      ) {
        setIsLoadingSessions(false);
        listAbortRef.current = null;
      }
    }
  }, [
    activeEventId,
    activeScope,
    canFetchScope,
    invalidatePendingDetailReads,
    isSameAuthenticatedSubject,
    selectionKey,
    t,
  ]);

  // Nạp lười danh sách phiên ngay khi khung chat hiển thị (không gọi setState đồng bộ trong thân effect)
  useEffect(() => {
    if (!canFetchScope || !isSameAuthenticatedSubject()) return;

    const controller = new AbortController();
    listAbortRef.current = controller;
    const reqSeq = ++listReqSeqRef.current;
    const capturedMutationGen = mutationGenRef.current;

    void aiApi
      .listOrganizerConversations({
        scope: activeScope,
        eventId: activeScope === 'event' ? activeEventId : undefined,
        signal: controller.signal,
      })
      .then((list) => {
        if (
          controller.signal.aborted ||
          reqSeq !== listReqSeqRef.current ||
          capturedMutationGen !== mutationGenRef.current ||
          !isSameAuthenticatedSubject()
        ) {
          return;
        }

        const validScoped = sortOrganizerSessions(
          list.filter((item) => matchesConversationScope(item, activeScope, activeEventId)),
        );
        setSessions(validScoped);
        setSessionsError(null);

        if (!hasUserInteractedRef.current && activeConversationIdRef.current === null) {
          const savedSelection = loadSelectedSessionState(selectionKey);
          const initialId = pickInitialConversationId(validScoped, savedSelection);
          if (initialId) {
            void loadConversationDetail(initialId);
          }
        }
      })
      .catch((err: unknown) => {
        if (
          isAbortError(err, controller.signal) ||
          reqSeq !== listReqSeqRef.current ||
          capturedMutationGen !== mutationGenRef.current ||
          !isSameAuthenticatedSubject()
        ) {
          return;
        }
        const resolved = resolveOrganizerChatError(err, t, 'sessions');
        setSessionsError(resolved.message);
      })
      .finally(() => {
        if (
          !controller.signal.aborted &&
          reqSeq === listReqSeqRef.current &&
          capturedMutationGen === mutationGenRef.current
        ) {
          setIsLoadingSessions(false);
          listAbortRef.current = null;
        }
      });

    return () => {
      controller.abort();
      if (listAbortRef.current === controller) {
        listAbortRef.current = null;
      }
    };
  }, [activeEventId, activeScope, canFetchScope, isSameAuthenticatedSubject, loadConversationDetail, selectionKey, t]);

  const showWelcome = messages.length === 0 && !isLoadingDetail && !isSending && !detailError;

  useEffect(() => {
    const container = streamRef.current;
    if (!container) return;
    const targetTop = showWelcome ? 0 : container.scrollHeight;
    if (typeof container.scrollTo === 'function') {
      container.scrollTo({
        top: targetTop,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    } else {
      container.scrollTop = targetTop;
    }
  }, [messages, isSending, showWelcome]);

  useLayoutEffect(() => {
    const input = textareaRef.current;
    if (!input) return;

    const resizeInput = () => {
      const scrollTop = input.scrollTop;
      input.style.height = 'auto';
      if (!input.value) return;
      input.style.height = `${input.scrollHeight}px`;
      input.scrollTop = scrollTop;
    };
    resizeInput();

    // Recalculate wrapping when expanding the widget or resizing its history pane.
    if (typeof ResizeObserver === 'undefined') return;
    let width = input.offsetWidth;
    const observer = new ResizeObserver(() => {
      if (input.offsetWidth === width) return;
      width = input.offsetWidth;
      resizeInput();
    });
    observer.observe(input, { box: 'border-box' });
    return () => observer.disconnect();
  }, [inputText]);

  // Đưa tiêu điểm vào ô nhập khi mở khung chat và xử lý phím Escape phân lớp
  useEffect(() => {
    if (isOpen) textareaRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (confirmDeleteId !== null) {
        e.preventDefault();
        setConfirmDeleteId(null);
        return;
      }
      if (confirmClearAll) {
        e.preventDefault();
        setConfirmClearAll(false);
        return;
      }
      if (isDrawerOpen) {
        e.preventDefault();
        closeHistory();
        return;
      }
      e.preventDefault();
      onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, confirmClearAll, confirmDeleteId, closeHistory, isDrawerOpen, onClose]);

  /** Mở bản nháp cục bộ mới (lần gửi đầu tiên sẽ tự tạo hội thoại trên máy chủ). */
  const handleStartNewDraft = useCallback(() => {
    if (isSending || isClearingAll) return;
    hasUserInteractedRef.current = true;
    invalidatePendingDetailReads();

    setActiveConversationId(null);
    activeConversationIdRef.current = null;
    saveSelectedSessionState(selectionKey, { conversationId: null, isDraft: true });
    setDetailError(null);
    setFailedSendAttempt(null);
    setMutationError(null);
    setConfirmDeleteId(null);
    setConfirmClearAll(false);
    setMessages([]);
    setInputText('');

    if (!isDockedSidebar) {
      setIsDrawerOpen(false);
    }
    setTimeout(() => {
      textareaRef.current?.focus({ preventScroll: true });
    }, 0);
  }, [
    invalidatePendingDetailReads,
    isClearingAll,
    isDockedSidebar,
    isSending,
    selectionKey,
  ]);

  /** Chọn một phiên hội thoại đã lưu từ ngăn kéo. */
  const handleSelectSession = useCallback(
    (conversationId: string) => {
      if (isSending || isClearingAll) return;
      hasUserInteractedRef.current = true;
      setConfirmDeleteId(null);
      setConfirmClearAll(false);
      setMutationError(null);

      if (conversationId === activeConversationIdRef.current && !detailError) {
        if (!isDockedSidebar) setIsDrawerOpen(false);
        return;
      }

      void loadConversationDetail(conversationId, {
        closeOverlayOnSuccess: !isDockedSidebar,
      });
    },
    [detailError, isClearingAll, isDockedSidebar, isSending, loadConversationDetail],
  );

  /** Bật/tắt ghim một phiên hội thoại (vô hiệu hóa các lần đọc danh sách cũ đang bay). */
  const handleTogglePin = useCallback(
    async (session: OrganizerConversationSummary) => {
      if (isSending || isClearingAll || mutatingSessionId) return;
      if (!isSameAuthenticatedSubject()) return;

      invalidatePendingListReads();
      mutationAbortRef.current?.abort();
      const controller = new AbortController();
      mutationAbortRef.current = controller;

      setMutatingSessionId(session.id);
      setMutationError(null);

      try {
        const updated = await aiApi.pinOrganizerConversation(session.id, !session.is_pinned, {
          signal: controller.signal,
        });
        if (controller.signal.aborted || !isSameAuthenticatedSubject()) return;
        mutationGenRef.current += 1;
        setSessions((prev) => upsertOrganizerSession(prev, updated));
      } catch (err: unknown) {
        if (isAbortError(err, controller.signal) || !isSameAuthenticatedSubject()) return;
        const resolved = resolveOrganizerChatError(err, t, 'sessions');
        if (resolved.isStaleConversation) {
          mutationGenRef.current += 1;
          setSessions((prev) => prev.filter((item) => item.id !== session.id));
          if (activeConversationIdRef.current === session.id) {
            invalidatePendingDetailReads();
            setActiveConversationId(null);
            activeConversationIdRef.current = null;
            clearSelectedSessionState(selectionKey);
            setFailedSendAttempt(null);
            setMessages([]);
          }
        }
        setMutationError(resolved.message);
      } finally {
        if (!controller.signal.aborted) {
          setMutatingSessionId(null);
          mutationAbortRef.current = null;
        }
      }
    },
    [
      invalidatePendingDetailReads,
      invalidatePendingListReads,
      isClearingAll,
      isSameAuthenticatedSubject,
      isSending,
      mutatingSessionId,
      selectionKey,
      t,
    ],
  );

  /** Xóa một phiên hội thoại và tuyệt đối không để lại lịch sử cũ nếu đang mở phiên đó. */
  const handleConfirmDeleteSession = useCallback(
    async (conversationId: string) => {
      if (isSending || isClearingAll || mutatingSessionId) return;
      if (!isSameAuthenticatedSubject()) return;

      invalidatePendingListReads();
      mutationAbortRef.current?.abort();
      const controller = new AbortController();
      mutationAbortRef.current = controller;

      setMutatingSessionId(conversationId);
      setMutationError(null);

      const resetIfActive = () => {
        if (activeConversationIdRef.current === conversationId) {
          invalidatePendingDetailReads();
          setActiveConversationId(null);
          activeConversationIdRef.current = null;
          clearSelectedSessionState(selectionKey);
          saveSelectedSessionState(selectionKey, { conversationId: null, isDraft: true });
          setDetailError(null);
          setFailedSendAttempt(null);
          setMessages([]);
          setInputText('');
        }
      };

      try {
        await aiApi.deleteOrganizerConversation(conversationId, {
          signal: controller.signal,
        });
        if (controller.signal.aborted || !isSameAuthenticatedSubject()) return;
        mutationGenRef.current += 1;
        setSessions((prev) => prev.filter((item) => item.id !== conversationId));
        setConfirmDeleteId(null);
        resetIfActive();
      } catch (err: unknown) {
        if (isAbortError(err, controller.signal) || !isSameAuthenticatedSubject()) return;
        const resolved = resolveOrganizerChatError(err, t, 'sessions');
        if (resolved.status === 404) {
          mutationGenRef.current += 1;
          setSessions((prev) => prev.filter((item) => item.id !== conversationId));
          setConfirmDeleteId(null);
          resetIfActive();
        } else {
          if (resolved.status === 403) {
            mutationGenRef.current += 1;
            setSessions((prev) => prev.filter((item) => item.id !== conversationId));
            resetIfActive();
          }
          setMutationError(resolved.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setMutatingSessionId(null);
          mutationAbortRef.current = null;
        }
      }
    },
    [
      invalidatePendingDetailReads,
      invalidatePendingListReads,
      isClearingAll,
      isSameAuthenticatedSubject,
      isSending,
      mutatingSessionId,
      selectionKey,
      t,
    ],
  );

  /** Xóa toàn bộ hội thoại thuộc đúng phạm vi hiện tại. */
  const handleConfirmClearAll = useCallback(async () => {
    if (isSending || isClearingAll || mutatingSessionId) return;
    if (!isSameAuthenticatedSubject()) return;

    invalidatePendingListReads();
    mutationAbortRef.current?.abort();
    const controller = new AbortController();
    mutationAbortRef.current = controller;

    setIsClearingAll(true);
    setMutationError(null);

    try {
      await aiApi.clearOrganizerConversations({
        scope: activeScope,
        eventId: activeScope === 'event' ? activeEventId : undefined,
        signal: controller.signal,
      });
      if (controller.signal.aborted || !isSameAuthenticatedSubject()) return;

      mutationGenRef.current += 1;
      invalidatePendingDetailReads();

      setSessions([]);
      setConfirmClearAll(false);
      setConfirmDeleteId(null);
      setActiveConversationId(null);
      activeConversationIdRef.current = null;
      clearSelectedSessionState(selectionKey);
      saveSelectedSessionState(selectionKey, { conversationId: null, isDraft: true });
      setDetailError(null);
      setFailedSendAttempt(null);
      setMessages([]);
      setInputText('');
    } catch (err: unknown) {
      if (isAbortError(err, controller.signal) || !isSameAuthenticatedSubject()) return;
      const resolved = resolveOrganizerChatError(err, t, 'sessions');
      setMutationError(resolved.message);
    } finally {
      if (!controller.signal.aborted) {
        setIsClearingAll(false);
        mutationAbortRef.current = null;
      }
    }
  }, [
    activeEventId,
    activeScope,
    invalidatePendingDetailReads,
    invalidatePendingListReads,
    isClearingAll,
    isSameAuthenticatedSubject,
    isSending,
    mutatingSessionId,
    selectionKey,
    t,
  ]);

  /** Điền gợi ý từ thẻ chủ đề khởi đầu vào ô nháp mà không tự gửi. */
  const fillDraft = useCallback((promptText: string) => {
    hasUserInteractedRef.current = true;
    setInputText(promptText.slice(0, 1000));
    textareaRef.current?.focus({ preventScroll: true });
  }, []);

  /** Gửi tin nhắn ở chế độ lưu trữ bền vững (persist: true, request_id bất biến khi thử lại, không gửi history từ client). */
  const sendMessage = useCallback(
    async (textToSend: string, retry = false) => {
      const cleanText = textToSend.trim().slice(0, 1000);
      if (!cleanText || isSending || isLoadingDetail || isClearingAll) return;
      if (!isSameAuthenticatedSubject()) return;

      hasUserInteractedRef.current = true;
      invalidatePendingListReads();

      const attemptRequestId =
        retry && failedSendAttempt?.text === cleanText
          ? failedSendAttempt.requestId
          : createRequestId();
      const targetConversationId =
        retry && failedSendAttempt?.text === cleanText
          ? failedSendAttempt.conversationId
          : activeConversationIdRef.current;

      sendAbortRef.current?.abort();
      const controller = new AbortController();
      sendAbortRef.current = controller;
      const reqSeq = ++sendReqSeqRef.current;

      const userMessage: OrganizerChatMessage = {
        id: newMessageId(),
        sender: 'user',
        text: cleanText,
        timestamp: new Date(),
      };

      setDetailError(null);
      setFailedSendAttempt(null);
      setMessages((prev) => {
        if (retry && prev.at(-1)?.isError) {
          return prev.slice(0, -1);
        }
        return [...prev, userMessage];
      });
      setIsSending(true);

      try {
        const response = await aiApi.chatWithOrganizerAgent({
          scope: activeScope,
          eventId: activeScope === 'event' ? activeEventId : undefined,
          message: cleanText,
          locale: isEn ? 'en' : 'vi',
          conversationId: targetConversationId ?? undefined,
          requestId: attemptRequestId,
          persist: true,
          signal: controller.signal,
        });

        if (controller.signal.aborted || reqSeq !== sendReqSeqRef.current || !isSameAuthenticatedSubject()) {
          return;
        }

        const resolvedConvId =
          typeof response.conversation_id === 'string' ? response.conversation_id.trim() : '';
        if (!resolvedConvId) {
          // Chế độ persist:true bắt buộc phải trả về conversation_id; tuyệt đối không âm thầm coi là thành công không lưu
          throw new Error('Missing conversation_id in persistent organizer chat response');
        }

        mutationGenRef.current += 1;
        setActiveConversationId(resolvedConvId);
        activeConversationIdRef.current = resolvedConvId;
        saveSelectedSessionState(selectionKey, { conversationId: resolvedConvId, isDraft: false });

        const nowIso = new Date().toISOString();
        setSessions((prev) => {
          const existing = prev.find((item) => item.id === resolvedConvId);
          const summary: OrganizerConversationSummary = existing
            ? { ...existing, updated_at: nowIso }
            : {
                id: resolvedConvId,
                scope: activeScope,
                event_id: activeScope === 'event' ? activeEventId ?? null : null,
                title: cleanText.slice(0, 60),
                is_pinned: false,
                created_at: nowIso,
                updated_at: nowIso,
              };
          return upsertOrganizerSession(prev, summary);
        });

        const aiMessage: OrganizerChatMessage = {
          id: newMessageId(),
          sender: 'ai',
          text: response.reply,
          followUp: response.follow_up,
          suggestedQuestions: Array.isArray(response.suggested_questions)
            ? response.suggested_questions
                .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
                .slice(0, 3)
            : undefined,
          showAnalytics: response.show_analytics,
          pipelineSteps: response.pipeline_steps || [],
          actions: response.actions || [],
          cards: response.cards || [],
          totals: response.totals || [],
          warnings: response.warnings || [],
          drafts: response.drafts || [],
          status: response.status || 'ok',
          executionTimeMs: response.execution_time_ms ?? null,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);
      } catch (err: unknown) {
        if (isAbortError(err, controller.signal) || reqSeq !== sendReqSeqRef.current || !isSameAuthenticatedSubject()) {
          return;
        }

        const resolved = resolveOrganizerChatError(err, t, 'chat');
        const errorMessage: OrganizerChatMessage = {
          id: newMessageId(),
          sender: 'ai',
          text: resolved.message,
          isError: true,
          timestamp: new Date(),
        };

        if (targetConversationId && (resolved.status === 404 || resolved.status === 403)) {
          // Khi hội thoại đang mở bị xóa (404) hoặc thu hồi quyền (403): xóa sạch lịch sử cũ trong khung chat và con trỏ chọn
          mutationGenRef.current += 1;
          invalidatePendingDetailReads();
          setSessions((prev) => prev.filter((item) => item.id !== targetConversationId));
          setActiveConversationId(null);
          activeConversationIdRef.current = null;
          clearSelectedSessionState(selectionKey);
          saveSelectedSessionState(selectionKey, { conversationId: null, isDraft: true });

          if (resolved.status === 404) {
            // Chỉ giữ tin nhắn người dùng vừa gửi để thử lại trong đoạn chat mới
            setFailedSendAttempt({
              text: cleanText,
              requestId: createRequestId(),
              conversationId: null,
              retryable: true,
            });
            setMessages([userMessage, errorMessage]);
          } else {
            // 403 không thử lại được: xóa sạch cả tin nhắn cũ lẫn tin tạm
            setFailedSendAttempt(null);
            setMessages([errorMessage]);
          }
          return;
        }

        setFailedSendAttempt({
          text: cleanText,
          requestId: attemptRequestId,
          conversationId: targetConversationId,
          retryable: resolved.retryable,
        });
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        if (!controller.signal.aborted && reqSeq === sendReqSeqRef.current) {
          setIsSending(false);
          sendAbortRef.current = null;
        }
      }
    },
    [
      activeEventId,
      activeScope,
      failedSendAttempt,
      invalidatePendingDetailReads,
      invalidatePendingListReads,
      isClearingAll,
      isEn,
      isLoadingDetail,
      isSameAuthenticatedSubject,
      isSending,
      selectionKey,
      t,
    ],
  );

  /** Xử lý gửi tin nhắn từ ô nhập */
  const handleSendMessage = () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending || isLoadingDetail || isClearingAll) return;
    setInputText('');
    void sendMessage(trimmed, false);
  };

  const starterTopics = useMemo(() => getStarterTopics(activeScope, isEn), [activeScope, isEn]);
  const suggestedChips = useMemo(
    () => deriveNextSuggestedQuestions({ scope: activeScope, isEn, messages }),
    [activeScope, isEn, messages],
  );


  const canRetrySend =
    !isSending &&
    Boolean(failedSendAttempt?.retryable) &&
    Boolean(messages.at(-1)?.isError) &&
    messages.at(-2)?.sender === 'user';

  const contentColumnClass = isExpanded ? 'w-full max-w-4xl mx-auto' : 'w-full';

  const drawerElement = (
    <OrganizerSessionDrawer
      variant={isDockedSidebar ? 'sidebar' : 'overlay'}
      sidebarWidth={historyWidth}
      isOpen={isDrawerOpen}
      activeScope={activeScope}
      eventTitle={propEventTitle}
      eventId={activeEventId}
      sessions={sessions}
      activeConversationId={activeConversationId}
      searchQuery={searchQuery}
      onSearchQueryChange={(val) => {
        hasUserInteractedRef.current = true;
        setSearchQuery(val);
      }}
      isLoadingSessions={isLoadingSessions}
      sessionsError={sessionsError}
      mutationError={mutationError}
      onDismissMutationError={() => setMutationError(null)}
      isBusy={isSending}
      isClearingAll={isClearingAll}
      mutatingSessionId={mutatingSessionId}
      confirmDeleteId={confirmDeleteId}
      onRequestDeleteSession={setConfirmDeleteId}
      onConfirmDeleteSession={(id) => void handleConfirmDeleteSession(id)}
      confirmClearAll={confirmClearAll}
      onRequestClearAll={setConfirmClearAll}
      onConfirmClearAll={() => void handleConfirmClearAll()}
      onSelectSession={handleSelectSession}
      onNewChat={handleStartNewDraft}
      onTogglePin={(session) => void handleTogglePin(session)}
      onRefresh={() => void refreshConversationsList()}
      onClose={closeHistory}
    />
  );

  return (
    <ChatWindow className="organizer-ai-chat" label={t('ai.organizer.assistantTitle', 'HaloTicket Organizer Assistant')}
      isOpen={isOpen} isExpanded={isExpanded} anchor={anchor} onExited={onExited}>
      {/* Thanh tiêu đề & Hành động */}
      <div className="min-h-12 px-2 sm:px-3 flex justify-between items-center gap-2 bg-brand-primary dark:bg-blue-700 text-white shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
            <button
              ref={historyToggleRef}
              type="button"
              data-testid="organizer-toggle-drawer-btn"
              onClick={() => setIsDrawerOpen((prev) => !prev)}
              aria-expanded={isDrawerOpen}
              aria-controls={isDrawerOpen ? 'organizer-session-drawer' : undefined}
              title={t('ai.organizer.sessions.toggleHistory', isEn ? 'Conversation history' : 'Lịch sử hội thoại')}
              aria-label={t('ai.organizer.sessions.toggleHistory', isEn ? 'Conversation history' : 'Lịch sử hội thoại')}
              className={`grid place-items-center size-9 rounded-lg transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-white ${isDrawerOpen ? 'bg-white/25' : 'hover:bg-white/15'}`}
            >
              {isDrawerOpen ? <PanelLeftClose size={17} aria-hidden="true" /> : <PanelLeftOpen size={17} aria-hidden="true" />}
            </button>

          <div className="relative size-6 rounded-full bg-white shrink-0 ring-2 ring-sky-200 flex items-center justify-center">
            <span className="w-full h-full rounded-full overflow-hidden block">
              <img
                src="/assets/brand/logo-ai.png"
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover scale-[1.08]"
              />
            </span>
            <span
              data-testid="organizer-header-online-dot"
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white"
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0 flex-1 leading-tight">
            <h3 className="font-semibold truncate text-sm">HaloTicket AI</h3>
            <div className="flex items-center gap-1.5 min-w-0 text-[11px] text-blue-50">
              <span
                data-testid="organizer-chat-scope-badge"
                className="truncate"
              >
                {activeScope === 'event'
                  ? t('ai.organizer.scopeEvent', isEn ? 'This Event' : 'Sự kiện này')
                  : t('ai.organizer.scopeManagedEvents', isEn ? 'My Managed Events' : 'Các sự kiện tôi quản lý')}
              </span>
              {activeScope === 'event' && (
                <span
                  data-testid="organizer-chat-event-name"
                  className="min-w-0 truncate"
                  title={propEventTitle || activeEventId}
                >
                  {propEventTitle || activeEventId}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            data-testid="organizer-new-chat-header-btn"
            onClick={handleStartNewDraft}
            disabled={isSending || isClearingAll}
            className="grid place-items-center size-9 rounded-lg hover:bg-white/15 transition-colors cursor-pointer disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-white"
            title={t('ai.organizer.sessions.newChat', isEn ? 'New conversation' : 'Đoạn chat mới')}
            aria-label={t('ai.organizer.sessions.newChat', isEn ? 'New conversation' : 'Đoạn chat mới')}
          >
            <Plus size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onToggleExpand}
            className="grid place-items-center size-9 rounded-lg hover:bg-white/15 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
            title={
              isExpanded
                ? t('ai.organizer.minimizeTooltip', isEn ? 'Collapse' : 'Thu nhỏ')
                : t('ai.organizer.expandTooltip', isEn ? 'Expand' : 'Phóng to')
            }
            aria-label={
              isExpanded
                ? t('ai.organizer.minimizeTooltip', isEn ? 'Collapse' : 'Thu nhỏ')
                : t('ai.organizer.expandTooltip', isEn ? 'Expand' : 'Phóng to')
            }
          >
            {isExpanded ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid place-items-center size-9 rounded-lg hover:bg-white/15 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
            title={t('ai.organizer.closeTooltip', isEn ? 'Close' : 'Đóng')}
            aria-label={t('ai.organizer.closeTooltip', isEn ? 'Close' : 'Đóng')}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Lịch sử nằm cạnh hội thoại trên desktop và phủ lên hội thoại ở khung nhỏ. */}
      <div className="relative flex-1 min-h-0 flex overflow-hidden">
        {drawerElement}
        {isDockedSidebar && isDrawerOpen && (
          <ChatHistoryResizeHandle label={t('ai.organizer.sessions.resize')} width={historyWidth} setHistoryWidth={setHistoryWidth} />
        )}

        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          {/* Khu vực luồng hội thoại */}
          <div
            ref={streamRef}
            role="log"
            aria-live="polite"
            aria-busy={isSending || isLoadingDetail}
            className="@container min-h-0 flex-1 p-3 sm:p-4 overflow-y-auto overscroll-contain bg-gray-50/50 dark:bg-[#18181b]"
          >
            <div className={contentColumnClass}>
              {isLoadingDetail ? (
                <div
                  data-testid="organizer-conversation-loading"
                  className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400"
                >
                  <Loader2 size={20} className="motion-safe:animate-spin text-brand-primary" aria-hidden="true" />
                  <span role="status">
                    {t('ai.organizer.sessions.loadingDetail', isEn ? 'Loading conversation…' : 'Đang tải cuộc trò chuyện…')}
                  </span>
                </div>
              ) : detailError ? (
                <div
                  role="alert"
                  className="my-4 p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-800 dark:text-red-200 space-y-2.5"
                >
                  <p className="font-medium leading-relaxed">{detailError.message}</p>
                  <div className="flex items-center gap-2">
                    {detailError.retryable && (
                      <button
                        type="button"
                        onClick={() => void loadConversationDetail(detailError.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-red-300 dark:border-red-800 font-semibold text-red-700 dark:text-red-200 cursor-pointer"
                      >
                        <RotateCcw size={12} aria-hidden="true" />
                        <span>{t('ai.action.retry', isEn ? 'Try again' : 'Thử lại')}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleStartNewDraft}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-semibold text-gray-700 dark:text-gray-200 cursor-pointer"
                    >
                      <Plus size={12} aria-hidden="true" />
                      <span>{t('ai.organizer.sessions.newChat', isEn ? 'New conversation' : 'Đoạn chat mới')}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, index) => (
                    <OrganizerAIChatMessage
                      key={msg.id}
                      message={msg}
                      question={messages[index - 1]?.sender === 'user' ? messages[index - 1].text : undefined}
                      onChooseFollowUp={!isSending && index === messages.length - 1 ? fillDraft : undefined}
                      isExpanded={isExpanded}
                    />
                  ))}

                  {showWelcome && (
                    <section className="py-1.5">
                      <div className="flex items-start gap-2.5">
                        <img
                          src="/assets/brand/logo-ai.png"
                          alt=""
                          className="mt-1 size-8 shrink-0 rounded-full bg-white object-cover ring-2 ring-brand-primary/60"
                        />
                        <div className="rounded-2xl border border-brand-primary/15 bg-white px-3.5 py-3 shadow-xs dark:bg-[#202024]">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {t('ai.organizer.welcome.title')}
                          </h4>
                          <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                            {t(activeScope === 'event' ? 'ai.organizer.welcome.event' : 'ai.organizer.welcome.managed')}
                          </p>
                        </div>
                      </div>
                      <div
                        data-testid="organizer-starter-topics"
                        className="mt-3 grid grid-cols-1 @min-[350px]:ml-[42px] @min-[350px]:grid-cols-2 gap-2.5"
                      >
                        {starterTopics.map((topic) => (
                          <button
                            key={topic.id}
                            type="button"
                            disabled={isClearingAll}
                            onClick={() => fillDraft(topic.prompt)}
                            className="p-3 rounded-xl border border-gray-200/90 dark:border-zinc-700/80 bg-white dark:bg-[#202024] hover:border-brand-primary/50 hover:bg-brand-primary/5 transition-colors text-left group shadow-2xs cursor-pointer disabled:opacity-50"
                          >
                            <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-brand-primary transition-colors">
                              {t(`ai.organizer.topics.${topic.id}.title`, topic.title)}
                            </div>
                            <div className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                              {t(`ai.organizer.topics.${topic.id}.desc`, topic.description)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {canRetrySend && failedSendAttempt && (
                    <button
                      type="button"
                      className="ml-10 mb-3 inline-flex items-center gap-1.5 rounded-lg border app-border bg-white dark:bg-[#202024] px-3 py-1.5 text-xs font-semibold text-brand-primary hover:bg-brand-primary/10 transition-colors cursor-pointer"
                      onClick={() => void sendMessage(failedSendAttempt.text, true)}
                    >
                      <RotateCcw size={12} aria-hidden="true" />
                      <span>{t('ai.action.retry', isEn ? 'Try again' : 'Thử lại')}</span>
                    </button>
                  )}

                  {isSending && (
                    <ChatTypingBubble testId="organizer-ai-typing-bubble"
                      status={t('ai.organizer.analyzing', isEn ? 'AI is analyzing data...' : 'AI đang phân tích số liệu...')} />
                  )}
                </>
              )}
            </div>
          </div>

          <ChatSuggestionBar questions={suggestedChips}
            label={t('ai.organizer.suggestionsLabel', isEn ? 'Suggestions:' : 'Gợi ý:')}
            onSelect={fillDraft} disabled={isSending || isLoadingDetail || isClearingAll}
            testIdPrefix="organizer" columnClassName={contentColumnClass} wrap={isDockedSidebar} />

          {/* Khu vực nhập liệu (có chặn gửi nhầm khi gõ tổ hợp phím IME Tiếng Việt) */}
          <div className="shrink-0 p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#18181b]">
            <div className={contentColumnClass}>
              <div className="flex items-end gap-2 overflow-hidden bg-gray-50 dark:bg-[#27272a] p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 focus-within:border-brand-primary/60 focus-within:ring-1 focus-within:ring-brand-primary/30 transition-colors shadow-inner">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  maxLength={1000}
                  onChange={(e) => {
                    hasUserInteractedRef.current = true;
                    setInputText(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === 'Enter' &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing &&
                      e.keyCode !== 229
                    ) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={t(
                    'ai.organizer.inputPlaceholder',
                    isEn
                      ? 'Ask about revenue, ticket sales…'
                      : 'Hỏi về doanh thu, vé bán…',
                  )}
                  aria-label={t(
                    'ai.organizer.inputLabel',
                    isEn ? 'Type a message for the AI assistant' : 'Nhập tin nhắn cho trợ lý AI',
                  )}
                  className="min-w-0 flex-1 bg-transparent border-none focus:outline-none resize-none min-h-9 max-h-15 overflow-y-auto overscroll-contain text-sm leading-6 py-1.5 px-2 text-text-main dark:text-white"
                  rows={1}
                  disabled={isSending || isLoadingDetail || isClearingAll}
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isSending || isLoadingDetail || isClearingAll}
                  className="p-2 gradient-btn text-white rounded-lg disabled:opacity-50 disabled:grayscale hover:brightness-110 transition-all shadow-sm cursor-pointer shrink-0"
                  title={t('ai.organizer.sendTooltip', isEn ? 'Send message' : 'Gửi tin nhắn')}
                  aria-label={t('ai.organizer.sendTooltip', isEn ? 'Send message' : 'Gửi tin nhắn')}
                >
                  <Send size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ChatWindow>
  );
};

/** Props của khung chat trợ lý AI cho ban tổ chức. */
export interface OrganizerAIChatWidgetProps {
  eventId?: string;
  eventTitle?: string;
  scope?: OrganizerChatScope;
}

/**
 * Khung chat nổi của trợ lý AI dành cho ban tổ chức (Wrapper).
 * Quản lý trạng thái mở/đóng, hồi phục tiêu điểm nút mở và cô lập tuyệt đối theo account/scope/eventId.
 */
export const OrganizerAIChatWidget: React.FC<OrganizerAIChatWidgetProps> = ({
  eventId: propEventId,
  eventTitle: propEventTitle,
  scope: propScope,
}) => {
  const { t } = useTranslation();
  const routeParams = useParams<{ eventId?: string }>();
  const activeEventId = propEventId || routeParams.eventId;
  const activeScope: OrganizerChatScope = propScope || (activeEventId ? 'event' : 'managed_events');

  const { isOpen, isPresent, openWindow, closeWindow, finishClose } = useChatWindowPresence();
  const [isExpanded, setIsExpanded] = useState(false);
  const [anchor, setAnchor] = useState<ChatAnchor>();
  const triggerBtnRef = useRef<HTMLButtonElement>(null);
  const userSubject = useOrganizerChatSubject();

  useEffect(() => {
    if (!isOpen || !isExpanded) return;
    const rootStyle = document.documentElement.style;
    const previousOverflow = rootStyle.overflow;
    rootStyle.overflow = 'hidden';
    return () => {
      rootStyle.overflow = previousOverflow;
    };
  }, [isOpen, isExpanded]);

  const innerChatKey = getSessionStorageKey(userSubject, activeScope, activeEventId);

  const handleClose = useCallback(() => {
    closeWindow();
    setTimeout(() => {
      triggerBtnRef.current?.focus({ preventScroll: true });
    }, 0);
  }, [closeWindow]);

  if (!innerChatKey || !userSubject) return null;

  return (
    <>
      {isPresent && createPortal(
        <OrganizerAIChatInner
          key={innerChatKey}
          userSubject={userSubject}
          activeScope={activeScope}
          activeEventId={activeEventId}
          propEventTitle={propEventTitle}
          isOpen={isOpen}
          isExpanded={isExpanded}
          onExited={finishClose}
          anchor={anchor}
          onToggleExpand={() => setIsExpanded((prev) => !prev)}
          onClose={handleClose}
        />,
        document.body,
      )}

      {/* Nút nổi tròn mở chat */}
      <ChatLauncher kind="organizer" label={t('ai.organizer.chatWithAi', 'Chat với AI')} hidden={isOpen}
        buttonRef={triggerBtnRef} hintTestId="organizer-chat-hover-tooltip"
        onOpen={location => { setAnchor(location); openWindow(); }} />
    </>
  );
};

export default OrganizerAIChatWidget;
