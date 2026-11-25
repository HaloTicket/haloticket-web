import type { TFunction } from 'i18next';
import type {
  OrganizerChatMessage,
  OrganizerConversationDetail,
  OrganizerConversationScope,
  OrganizerConversationSummary,
} from '@/types/ai';
import type { OrganizerSelectedSessionState } from './organizerChatStorage';

/** Sinh UUID v4 chuẩn RFC 4122 cho request_id bất biến qua các lần thử lại. */
export const createRequestId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback below
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
};

/** Chuyển chuỗi thời gian ISO sang mili-giây an toàn để so sánh thứ tự. */
const toEpochMs = (isoString: string): number => {
  const time = Date.parse(isoString);
  return Number.isFinite(time) ? time : 0;
};

/** Sắp xếp danh sách phiên hội thoại: ưu tiên đã ghim trước, sau đó mới nhất theo updated_at. */
export const sortOrganizerSessions = (
  sessions: OrganizerConversationSummary[],
): OrganizerConversationSummary[] => {
  return [...sessions].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) {
      return a.is_pinned ? -1 : 1;
    }
    const timeDiff = toEpochMs(b.updated_at) - toEpochMs(a.updated_at);
    if (timeDiff !== 0) return timeDiff;
    return toEpochMs(b.created_at) - toEpochMs(a.created_at);
  });
};

/** Thêm mới hoặc cập nhật một tóm tắt phiên trong danh sách và giữ đúng thứ tự chuẩn. */
export const upsertOrganizerSession = (
  sessions: OrganizerConversationSummary[],
  summary: OrganizerConversationSummary,
): OrganizerConversationSummary[] => {
  const filtered = sessions.filter((item) => item.id !== summary.id);
  return sortOrganizerSessions([summary, ...filtered]);
};

/** Chọn phiên mở ban đầu từ danh sách máy chủ và trạng thái chọn cục bộ (nếu có). */
export const pickInitialConversationId = (
  sessions: OrganizerConversationSummary[],
  savedState: OrganizerSelectedSessionState | null,
): string | null => {
  if (sessions.length === 0) return null;
  if (savedState?.isDraft) return null;
  if (savedState?.conversationId && sessions.some((s) => s.id === savedState.conversationId)) {
    return savedState.conversationId;
  }
  // Chọn phiên hoạt động gần nhất theo updated_at (hoặc phần tử đầu tiên nếu bằng nhau)
  const mostRecent = [...sessions].sort((a, b) => toEpochMs(b.updated_at) - toEpochMs(a.updated_at))[0];
  return mostRecent?.id ?? sessions[0].id;
};

/** Chuẩn hóa chuỗi phục vụ tìm kiếm tiêu đề tiếng Việt không dấu và có dấu. */
const normalizeSearchText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();

/** Lọc và tách nhóm Đã ghim / Gần đây theo từ khóa tìm kiếm tiêu đề. */
export const filterAndGroupSessions = (
  sessions: OrganizerConversationSummary[],
  searchQuery: string,
): {
  pinned: OrganizerConversationSummary[];
  recent: OrganizerConversationSummary[];
  totalMatched: number;
} => {
  const sorted = sortOrganizerSessions(sessions);
  const rawQuery = searchQuery.trim().toLowerCase();
  const normQuery = normalizeSearchText(searchQuery);

  const matched = !rawQuery
    ? sorted
    : sorted.filter((item) => {
        const titleLower = item.title.toLowerCase();
        if (titleLower.includes(rawQuery)) return true;
        return normalizeSearchText(item.title).includes(normQuery);
      });

  return {
    pinned: matched.filter((item) => item.is_pinned),
    recent: matched.filter((item) => !item.is_pinned),
    totalMatched: matched.length,
  };
};

/** Kiểm tra chi tiết hội thoại trả về có khớp đúng phạm vi đang mở hay không. */
export const matchesConversationScope = (
  item: Pick<OrganizerConversationSummary, 'scope' | 'event_id'>,
  activeScope: OrganizerConversationScope,
  activeEventId?: string,
): boolean => {
  if (item.scope !== activeScope) return false;
  if (activeScope === 'event') {
    return Boolean(activeEventId) && item.event_id === activeEventId;
  }
  return item.event_id === null;
};

/** Chuyển đổi danh sách tin nhắn từ API sang cấu trúc hiển thị của OrganizerAIChatMessage. */
export const mapConversationDetailToMessages = (
  detail: OrganizerConversationDetail,
): OrganizerChatMessage[] => {
  return detail.messages.map((msg) => {
    const parsedTime = new Date(msg.created_at);
    const timestamp = Number.isNaN(parsedTime.getTime()) ? new Date() : parsedTime;

    if (msg.role === 'user') {
      return {
        id: msg.id,
        sender: 'user',
        text: msg.content,
        timestamp,
      };
    }

    const payload = msg.payload ?? undefined;
    return {
      id: msg.id,
      sender: 'ai',
      text: msg.content || payload?.reply || '',
      status: msg.status ?? payload?.status ?? 'ok',
      pipelineSteps: payload?.pipeline_steps ?? [],
      actions: payload?.actions ?? [],
      cards: payload?.cards ?? [],
      totals: payload?.totals ?? [],
      warnings: payload?.warnings ?? [],
      drafts: payload?.drafts ?? [],
      followUp: payload?.follow_up,
      suggestedQuestions: Array.isArray(payload?.suggested_questions)
        ? payload.suggested_questions
            .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            .slice(0, 3)
        : undefined,
      showAnalytics: payload?.show_analytics,
      executionTimeMs: payload?.execution_time_ms ?? null,
      timestamp,
    };
  });
};

/** Định dạng thời gian ngắn gọn cho dòng lịch sử hội thoại theo múi giờ Việt Nam. */
export const formatSessionTimestamp = (isoString: string, isEn = false): string => {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const tz = 'Asia/Ho_Chi_Minh';
    const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    const isSameDay = dayFmt.format(date) === dayFmt.format(now);
    if (isSameDay) {
      return new Intl.DateTimeFormat(isEn ? 'en-US' : 'vi-VN', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date);
    }
    return new Intl.DateTimeFormat(isEn ? 'en-US' : 'vi-VN', {
      timeZone: tz,
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return '';
  }
};

export interface ResolvedOrganizerChatError {
  message: string;
  status?: number;
  code?: string;
  retryable: boolean;
  isStaleConversation: boolean;
}

/** Phân giải lỗi HTTP cho cả luồng chat và luồng quản lý phiên hội thoại của ban tổ chức. */
export const resolveOrganizerChatError = (
  err: unknown,
  t: TFunction,
  target: 'chat' | 'sessions' = 'chat',
): ResolvedOrganizerChatError => {
  const axiosErr = err as {
    response?: {
      status?: number;
      data?: Record<string, unknown>;
      headers?: Record<string, string>;
    };
  };
  const status = axiosErr?.response?.status;
  const resData = axiosErr?.response?.data;
  const detailObj =
    resData && typeof resData.detail === 'object' && resData.detail !== null
      ? (resData.detail as Record<string, unknown>)
      : null;
  const code =
    (typeof resData?.code === 'string' && resData.code) ||
    (typeof detailObj?.code === 'string' && detailObj.code) ||
    undefined;

  if (status === 401) {
    return {
      message: t('ai.organizer.error.unauthorized', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'),
      status,
      code,
      retryable: false,
      isStaleConversation: false,
    };
  }

  if (status === 404) {
    return {
      message: t(
        'ai.organizer.sessions.errorNotFound',
        'Cuộc trò chuyện này không còn tồn tại hoặc đã bị xóa.',
      ),
      status,
      code,
      retryable: target === 'chat',
      isStaleConversation: true,
    };
  }

  if (status === 403) {
    const message =
      target === 'sessions'
        ? t('ai.organizer.sessions.errorForbidden', 'Bạn không có quyền truy cập cuộc trò chuyện này.')
        : t('ai.organizer.error.notInScope', 'Bạn không có quyền truy cập dữ liệu của sự kiện này.');
    return {
      message,
      status,
      code,
      retryable: false,
      isStaleConversation: target === 'sessions',
    };
  }

  if (status === 422) {
    return {
      message: t('ai.organizer.error.invalidInput', 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại nội dung.'),
      status,
      code,
      retryable: false,
      isStaleConversation: false,
    };
  }

  if (status === 429) {
    const retryHeader = axiosErr.response?.headers?.['retry-after'];
    const parsedHeader = retryHeader ? Number.parseInt(retryHeader, 10) : NaN;
    const retrySeconds =
      (Number.isFinite(parsedHeader) && parsedHeader > 0 ? parsedHeader : undefined) ||
      (typeof resData?.retry_after_seconds === 'number' ? resData.retry_after_seconds : undefined) ||
      (typeof detailObj?.retry_after_seconds === 'number' ? detailObj.retry_after_seconds : undefined) ||
      30;
    return {
      message: t(
        'ai.organizer.error.rateLimit',
        'Bạn đang gửi yêu cầu quá nhanh. Vui lòng thử lại sau {{seconds}} giây.',
        { seconds: retrySeconds },
      ),
      status,
      code,
      retryable: true,
      isStaleConversation: false,
    };
  }

  if (status === 503 || code === 'AI_DB_NOT_CONFIGURED' || code === 'AI_DB_UNAVAILABLE') {
    if (code === 'AI_DB_NOT_CONFIGURED') {
      return {
        message: t(
          'ai.organizer.error.dbNotConfigured',
          'Kho lưu trữ hội thoại chưa được cấu hình.',
        ),
        status,
        code,
        retryable: true,
        isStaleConversation: false,
      };
    }
    if (code === 'AI_DB_UNAVAILABLE') {
      return {
        message: t(
          'ai.organizer.error.dbUnavailable',
          'Kho lưu trữ hội thoại tạm thời gián đoạn. Vui lòng thử lại.',
        ),
        status,
        code,
        retryable: true,
        isStaleConversation: false,
      };
    }
    return {
      message: t(
        'ai.organizer.error.unavailable',
        'Dịch vụ AI hoặc nguồn dữ liệu tạm thời không khả dụng. Vui lòng thử lại sau ít phút.',
      ),
      status,
      code,
      retryable: true,
      isStaleConversation: false,
    };
  }

  return {
    message:
      target === 'sessions'
        ? t('ai.organizer.sessions.errorLoad', 'Không tải được lịch sử hội thoại. Vui lòng thử lại.')
        : t(
            'ai.organizer.error.generic',
            'Xin lỗi Ban tổ chức, hệ thống AI đang gặp sự cố kết nối. Vui lòng thử lại sau ít phút.',
          ),
    status,
    code,
    retryable: true,
    isStaleConversation: false,
  };
};
