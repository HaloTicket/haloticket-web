import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  MessageSquare,
  PanelLeftClose,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { OrganizerConversationSummary } from '@/types/ai';
import type { OrganizerChatScope } from './organizerChatStorage';
import { filterAndGroupSessions, formatSessionTimestamp } from './organizerChatSessions';

export interface OrganizerSessionDrawerProps {
  variant: 'overlay' | 'sidebar';
  sidebarWidth?: number;
  isOpen: boolean;
  activeScope: OrganizerChatScope;
  eventTitle?: string;
  eventId?: string;
  sessions: OrganizerConversationSummary[];
  activeConversationId: string | null;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  isLoadingSessions: boolean;
  sessionsError: string | null;
  mutationError: string | null;
  onDismissMutationError: () => void;
  isBusy: boolean;
  isClearingAll: boolean;
  mutatingSessionId: string | null;
  confirmDeleteId: string | null;
  onRequestDeleteSession: (id: string | null) => void;
  onConfirmDeleteSession: (id: string) => void;
  confirmClearAll: boolean;
  onRequestClearAll: (open: boolean) => void;
  onConfirmClearAll: () => void;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onTogglePin: (session: OrganizerConversationSummary) => void;
  onRefresh: () => void;
  onClose: () => void;
}

/**
 * Ngăn kéo quản lý phiên hội thoại AI của ban tổ chức:
 * - Chế độ thu gọn / di động hẹp: trượt đè có lớp nền mờ (overlay)
 * - Chế độ phóng to trên màn hình rộng: cột trái có thể thay đổi kích thước
 */
export const OrganizerSessionDrawer: React.FC<OrganizerSessionDrawerProps> = ({
  variant,
  sidebarWidth,
  isOpen,
  activeScope,
  eventTitle,
  eventId,
  sessions,
  activeConversationId,
  searchQuery,
  onSearchQueryChange,
  isLoadingSessions,
  sessionsError,
  mutationError,
  onDismissMutationError,
  isBusy,
  isClearingAll,
  mutatingSessionId,
  confirmDeleteId,
  onRequestDeleteSession,
  onConfirmDeleteSession,
  confirmClearAll,
  onRequestClearAll,
  onConfirmClearAll,
  onSelectSession,
  onNewChat,
  onTogglePin,
  onRefresh,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith('en'));

  if (!isOpen) {
    return null;
  }

  const { pinned, recent, totalMatched } = filterAndGroupSessions(sessions, searchQuery);
  const hasSearch = searchQuery.trim().length > 0;

  const scopeLabel =
    activeScope === 'event'
      ? eventTitle || eventId || t('ai.organizer.scopeEvent', isEn ? 'This Event' : 'Sự kiện này')
      : t('ai.organizer.scopeManagedEvents', isEn ? 'My Managed Events' : 'Các sự kiện tôi quản lý');

  const renderSessionItem = (session: OrganizerConversationSummary) => {
    const isSelected = activeConversationId === session.id;
    const isConfirmingDelete = confirmDeleteId === session.id;
    const isItemMutating = mutatingSessionId === session.id;
    const actionsDisabled = isBusy || isClearingAll || Boolean(mutatingSessionId);

    return (
      <div
        key={session.id}
        data-testid={`organizer-session-row-${session.id}`}
        className={`rounded-xl border transition-colors motion-reduce:transition-none ${
          isSelected
            ? 'bg-brand-primary/10 dark:bg-brand-primary/15 border-brand-primary/30'
            : 'bg-transparent border-transparent hover:bg-gray-100/80 dark:hover:bg-zinc-800/70'
        }`}
      >
        <div className="flex items-center gap-1 px-2 py-1.5">
          <button
            type="button"
            data-testid={`organizer-session-select-${session.id}`}
            aria-current={isSelected ? 'true' : undefined}
            disabled={isBusy || isClearingAll}
            onClick={() => onSelectSession(session.id)}
            className="flex-1 min-w-0 text-left flex items-start gap-2 py-0.5 rounded-lg focus-visible:outline-2 focus-visible:outline-brand-primary disabled:opacity-50 cursor-pointer"
          >
            <MessageSquare
              size={14}
              className={`mt-0.5 shrink-0 ${
                isSelected ? 'text-brand-primary' : 'text-gray-400 dark:text-gray-500'
              }`}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span
                className={`block truncate text-xs ${
                  isSelected
                    ? 'font-bold text-brand-primary dark:text-brand-accent'
                    : 'font-medium text-gray-800 dark:text-gray-200'
                }`}
                title={session.title}
              >
                {session.title || t('ai.organizer.sessions.untitled', isEn ? 'Untitled chat' : 'Đoạn chat chưa đặt tên')}
              </span>
              <span className="block text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums">
                {formatSessionTimestamp(session.updated_at, isEn)}
              </span>
            </span>
          </button>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              data-testid={`organizer-session-pin-${session.id}`}
              aria-pressed={session.is_pinned}
              aria-label={
                session.is_pinned
                  ? t('ai.organizer.sessions.unpin', isEn ? 'Unpin conversation' : 'Bỏ ghim đoạn chat')
                  : t('ai.organizer.sessions.pin', isEn ? 'Pin conversation' : 'Ghim đoạn chat')
              }
              title={
                session.is_pinned
                  ? t('ai.organizer.sessions.unpin', isEn ? 'Unpin conversation' : 'Bỏ ghim đoạn chat')
                  : t('ai.organizer.sessions.pin', isEn ? 'Pin conversation' : 'Ghim đoạn chat')
              }
              disabled={actionsDisabled}
              onClick={() => onTogglePin(session)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 ${
                session.is_pinned
                  ? 'text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-zinc-700'
              }`}
            >
              <Pin size={13} className={session.is_pinned ? 'rotate-45' : ''} aria-hidden="true" />
            </button>

            <button
              type="button"
              data-testid={`organizer-session-delete-${session.id}`}
              aria-label={t('ai.organizer.sessions.deleteItem', isEn ? 'Delete conversation' : 'Xóa đoạn chat')}
              title={t('ai.organizer.sessions.deleteItem', isEn ? 'Delete conversation' : 'Xóa đoạn chat')}
              disabled={actionsDisabled}
              onClick={() => onRequestDeleteSession(isConfirmingDelete ? null : session.id)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer disabled:opacity-40"
            >
              <Trash2 size={13} aria-hidden="true" />
            </button>
          </div>
        </div>

        {isConfirmingDelete && (
          <div
            role="group"
            aria-label={t('ai.organizer.sessions.confirmDeleteLabel', isEn ? 'Confirm deleting conversation' : 'Xác nhận xóa đoạn chat')}
            className="mx-2 mb-2 px-2.5 py-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-center justify-between gap-2 text-[11px]"
          >
            <span className="text-red-800 dark:text-red-200 font-medium truncate">
              {t('ai.organizer.sessions.confirmDeletePrompt', isEn ? 'Delete this chat?' : 'Xóa đoạn chat này?')}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                data-testid={`organizer-session-cancel-delete-${session.id}`}
                disabled={isItemMutating}
                onClick={() => onRequestDeleteSession(null)}
                className="px-2 py-0.5 rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200 font-semibold cursor-pointer disabled:opacity-50"
              >
                {t('ai.organizer.sessions.cancel', isEn ? 'Cancel' : 'Hủy')}
              </button>
              <button
                type="button"
                data-testid={`organizer-session-confirm-delete-${session.id}`}
                disabled={isItemMutating}
                onClick={() => onConfirmDeleteSession(session.id)}
                className="px-2 py-0.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold cursor-pointer disabled:opacity-50"
              >
                {isItemMutating
                  ? t('ai.organizer.sessions.deleting', isEn ? 'Deleting...' : 'Đang xóa...')
                  : t('ai.organizer.sessions.confirmDeleteBtn', isEn ? 'Delete' : 'Xóa')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const drawerPanel = (
    <aside
      id="organizer-session-drawer"
      data-testid="organizer-session-drawer"
      data-variant={variant}
      style={variant === 'sidebar' ? { width: sidebarWidth } : undefined}
      aria-label={t('ai.organizer.sessions.drawerTitle', isEn ? 'Conversation history' : 'Lịch sử hội thoại')}
      className={
        variant === 'sidebar'
          ? 'w-56 shrink-0 h-full border-r border-gray-200 dark:border-gray-800 bg-gray-50/90 dark:bg-[#141417] flex flex-col min-h-0'
          : 'relative z-30 w-[min(15rem,86%)] h-full border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#18181b] shadow-xl flex flex-col min-h-0 motion-safe:animate-in motion-safe:slide-in-from-left-4 duration-200 motion-reduce:transition-none motion-reduce:animate-none'
      }
    >
      {/* Đầu ngăn kéo: phạm vi + làm mới + đóng (khi trượt đè) */}
      <div className="px-2.5 py-1 border-b border-gray-200/80 dark:border-gray-800 flex items-center justify-between gap-1 shrink-0">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-gray-800 dark:text-gray-100">
            {t('ai.organizer.sessions.drawerHeading', isEn ? 'Chat History' : 'Lịch sử đoạn chat')}
          </div>
          <div
            className="text-[11px] font-medium text-brand-primary dark:text-brand-accent truncate mt-0.5"
            title={scopeLabel}
          >
            {scopeLabel}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            data-testid="organizer-sessions-refresh-btn"
            onClick={onRefresh}
            disabled={isLoadingSessions || isBusy || isClearingAll}
            title={t('ai.organizer.sessions.refresh', isEn ? 'Refresh conversations' : 'Làm mới danh sách')}
            aria-label={t('ai.organizer.sessions.refresh', isEn ? 'Refresh conversations' : 'Làm mới danh sách')}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-40"
          >
            <RefreshCw
              size={14}
              className={isLoadingSessions ? 'motion-safe:animate-spin' : ''}
              aria-hidden="true"
            />
          </button>

            <button
              type="button"
              data-testid="organizer-drawer-close-btn"
              onClick={onClose}
              title={t('ai.organizer.sessions.closeDrawer', isEn ? 'Close history' : 'Đóng ngăn lịch sử')}
              aria-label={t('ai.organizer.sessions.closeDrawer', isEn ? 'Close history' : 'Đóng ngăn lịch sử')}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <PanelLeftClose size={15} aria-hidden="true" />
            </button>
        </div>
      </div>

      {/* Nút đoạn chat mới & Ô tìm kiếm tiêu đề */}
      <div className="px-2.5 py-2 space-y-1.5 shrink-0">
        <button
          type="button"
          data-testid="organizer-drawer-new-chat-btn"
          onClick={onNewChat}
          disabled={isBusy || isClearingAll}
          className="w-full py-2 px-3 rounded-xl border border-brand-primary/30 bg-white dark:bg-[#202024] hover:bg-brand-primary/8 text-gray-900 dark:text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
        >
          <Plus size={15} className="text-brand-primary shrink-0" aria-hidden="true" />
          <span>{t('ai.organizer.sessions.newChat', isEn ? 'New conversation' : 'Đoạn chat mới')}</span>
        </button>

        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder={t('ai.organizer.sessions.searchPlaceholder', isEn ? 'Search conversations...' : 'Tìm kiếm tiêu đề...')}
            aria-label={t('ai.organizer.sessions.searchPlaceholder', isEn ? 'Search conversations...' : 'Tìm kiếm tiêu đề...')}
            className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-gray-100/90 dark:bg-[#222227] border border-gray-200/80 dark:border-zinc-700/80 focus:border-brand-primary focus:bg-white dark:focus:bg-[#18181b] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 outline-none transition-colors"
          />
          {hasSearch && (
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              aria-label={t('ai.organizer.sessions.clearSearch', isEn ? 'Clear search' : 'Xóa từ khóa')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
            >
              <X size={12} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Thông báo lỗi thao tác (ghim / xóa / tải chi tiết) */}
      {mutationError && (
        <div
          role="alert"
          className="mx-3 mb-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start justify-between gap-2 text-[11px] text-red-800 dark:text-red-200 shrink-0"
        >
          <span className="leading-snug">{mutationError}</span>
          <button
            type="button"
            onClick={onDismissMutationError}
            aria-label={t('ai.organizer.closeTooltip', isEn ? 'Close' : 'Đóng')}
            className="shrink-0 text-red-500 hover:text-red-700 cursor-pointer"
          >
            <X size={12} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Danh sách hội thoại (Đã ghim & Gần đây) */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2.5 py-1 space-y-3">
        {isLoadingSessions && sessions.length === 0 ? (
          <div data-testid="organizer-sessions-loading" className="space-y-2 py-1" aria-busy="true">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="h-11 rounded-xl bg-gray-200/70 dark:bg-zinc-800/80 motion-safe:animate-pulse"
              />
            ))}
          </div>
        ) : sessionsError && sessions.length === 0 ? (
          <div
            data-testid="organizer-sessions-error"
            role="alert"
            className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-800 dark:text-red-200 space-y-2"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
              <p className="leading-relaxed">{sessionsError}</p>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoadingSessions}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-red-300 dark:border-red-800 text-[11px] font-semibold text-red-700 dark:text-red-200 hover:bg-red-100/60 cursor-pointer"
            >
              <RefreshCw size={12} aria-hidden="true" />
              <span>{t('ai.action.retry', isEn ? 'Try again' : 'Thử lại')}</span>
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div
            data-testid="organizer-sessions-empty"
            className="py-8 px-3 text-center text-xs text-gray-500 dark:text-gray-400 space-y-1"
          >
            <p className="font-semibold text-gray-700 dark:text-gray-300">
              {t('ai.organizer.sessions.emptyTitle', isEn ? 'No conversations yet' : 'Chưa có đoạn chat nào')}
            </p>
            <p className="text-[11px] leading-relaxed">
              {t(
                'ai.organizer.sessions.emptyHint',
                isEn
                  ? 'Ask a question to automatically save history for this scope.'
                  : 'Hãy gửi câu hỏi đầu tiên để tự động lưu lịch sử theo phạm vi này.',
              )}
            </p>
          </div>
        ) : totalMatched === 0 ? (
          <div className="py-6 px-3 text-center text-xs text-gray-500 dark:text-gray-400 space-y-2">
            <p>
              {t(
                'ai.organizer.sessions.noSearchMatch',
                isEn ? 'No matching conversations found.' : 'Không tìm thấy đoạn chat phù hợp.',
              )}
            </p>
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              className="text-[11px] font-semibold text-brand-primary hover:underline cursor-pointer"
            >
              {t('ai.organizer.sessions.clearSearch', isEn ? 'Clear search' : 'Xóa bộ lọc tìm kiếm')}
            </button>
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <div data-testid="organizer-sessions-pinned-group" className="space-y-1">
                <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {t('ai.organizer.sessions.pinnedGroup', isEn ? 'Pinned' : 'Đã ghim')}
                </div>
                {pinned.map(renderSessionItem)}
              </div>
            )}

            {recent.length > 0 && (
              <div data-testid="organizer-sessions-recent-group" className="space-y-1">
                <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {t('ai.organizer.sessions.recentGroup', isEn ? 'Recent' : 'Gần đây')}
                </div>
                {recent.map(renderSessionItem)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Đáy ngăn kéo: Xóa tất cả hội thoại trong phạm vi kèm thanh xác nhận trượt */}
      {sessions.length > 0 && (
        <div className="shrink-0 border-t border-gray-200/80 dark:border-gray-800 p-2.5 bg-gray-50/60 dark:bg-[#141417]">
          <button
            type="button"
            data-testid="organizer-sessions-clear-trigger"
            disabled={isBusy || isClearingAll || Boolean(mutatingSessionId)}
            onClick={() => onRequestClearAll(!confirmClearAll)}
            className="w-full py-1.5 px-2.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
          >
            <Trash2 size={13} aria-hidden="true" />
            <span>
              {isClearingAll
                ? t('ai.organizer.sessions.clearingAll', isEn ? 'Clearing history...' : 'Đang xóa hội thoại...')
                : t('ai.organizer.sessions.clearAll', isEn ? 'Clear all in this scope' : 'Xóa tất cả hội thoại')}
            </span>
          </button>

          <div
            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
              confirmClearAll ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              {confirmClearAll && (
                <div
                  role="group"
                  aria-label={t('ai.organizer.sessions.confirmClearAllLabel', isEn ? 'Confirm clearing scoped conversations' : 'Xác nhận xóa toàn bộ hội thoại trong phạm vi')}
                  className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 space-y-2 text-[11px]"
                >
                  <p className="text-red-800 dark:text-red-200 leading-snug font-medium">
                    {activeScope === 'event'
                      ? t(
                          'ai.organizer.sessions.confirmClearEvent',
                          isEn
                            ? 'Delete all saved chats for this event?'
                            : 'Xóa toàn bộ đoạn chat đã lưu của sự kiện này?',
                        )
                      : t(
                          'ai.organizer.sessions.confirmClearManaged',
                          isEn
                            ? 'Delete all saved chats across managed events overview?'
                            : 'Xóa toàn bộ đoạn chat tổng quan các sự kiện quản lý?',
                        )}
                  </p>
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      data-testid="organizer-sessions-clear-cancel"
                      disabled={isClearingAll}
                      onClick={() => onRequestClearAll(false)}
                      className="px-2.5 py-1 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200 font-semibold cursor-pointer disabled:opacity-50"
                    >
                      {t('ai.organizer.sessions.cancel', isEn ? 'Cancel' : 'Hủy')}
                    </button>
                    <button
                      type="button"
                      data-testid="organizer-sessions-clear-confirm"
                      disabled={isClearingAll}
                      onClick={onConfirmClearAll}
                      className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold cursor-pointer disabled:opacity-50"
                    >
                      {t('ai.organizer.sessions.confirmClearBtn', isEn ? 'Delete all' : 'Xóa tất cả')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );

  if (variant === 'sidebar') {
    return drawerPanel;
  }

  return (
    <div className="absolute inset-0 z-30 flex">
      {drawerPanel}
      <div
        data-testid="organizer-session-drawer-backdrop"
        aria-hidden="true"
        onClick={onClose}
        className="flex-1 bg-slate-950/20 dark:bg-black/40 motion-safe:animate-in motion-safe:fade-in duration-150 motion-reduce:transition-none motion-reduce:animate-none"
      />
    </div>
  );
};

export default OrganizerSessionDrawer;
