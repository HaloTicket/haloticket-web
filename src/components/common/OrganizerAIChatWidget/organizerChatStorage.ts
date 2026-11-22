import { useEffect, useState } from 'react';
import { getKeycloakSession } from '@/services/keycloakSession';
import { parseJwt } from '@/services/userApi';
import type { OrganizerChatMessage } from '@/types/ai';

/** Phạm vi hoạt động của trợ lý AI tổ chức: toàn bộ sự kiện quản lý hoặc một sự kiện cụ thể. */
export type OrganizerChatScope = 'managed_events' | 'event';

/** Một chủ đề khởi đầu gợi ý cho đoạn chat mới (điền vào ô nhập khi bấm). */
export interface OrganizerStarterTopic {
  id: string;
  title: string;
  description: string;
  prompt: string;
}

/** Trạng thái phiên đang chọn của một ngữ cảnh cụ thể (chỉ lưu id hoặc cờ nháp, không bao giờ lưu nội dung chat). */
export interface OrganizerSelectedSessionState {
  conversationId: string | null;
  isDraft: boolean;
}

const SELECTION_KEY_PREFIX = 'organizer_ai_chat_sel:';
const LEGACY_MSG_KEY_PREFIX = 'organizer_ai_chat:';
const LEGACY_LOCAL_HISTORY_KEY = 'organizer_ai_chat_history';

/** Sinh id ngẫu nhiên cho một tin nhắn mới. */
export const newMessageId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback
    }
  }
  return 'msg_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
};

/** Trích xuất subject định danh tài khoản từ chuỗi JWT. */
export const extractSubjectFromToken = (token: string | null | undefined): string | null => {
  if (!token) return null;
  try {
    const payload = parseJwt(token);
    if (payload?.sub) {
      return payload.iss ? `${payload.iss}#${payload.sub}` : payload.sub;
    }
  } catch {
    // ignore
  }
  return null;
};

/**
 * Lấy định danh tài khoản từ access token hiện tại.
 */
export const getCurrentUserSubject = (): string | null => {
  try {
    const token = getKeycloakSession().getCurrentToken();
    return extractSubjectFromToken(token);
  } catch {
    return null;
  }
};

/** Dọn sạch khóa lịch sử cũ trên localStorage/sessionStorage để không bao giờ rò rỉ dữ liệu cũ. */
export const purgeLegacyOrganizerChatStorage = (): void => {
  try {
    localStorage.removeItem(LEGACY_LOCAL_HISTORY_KEY);
  } catch {
    // ignore
  }
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(LEGACY_MSG_KEY_PREFIX)) {
        toRemove.push(k);
      }
    }
    for (const k of toRemove) {
      sessionStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
};

/** Xóa mọi con trỏ chọn phiên khi đăng xuất hoặc hết hạn phiên. */
export const clearAllOrganizerSelectionStates = (): void => {
  purgeLegacyOrganizerChatStorage();
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(SELECTION_KEY_PREFIX)) {
        toRemove.push(k);
      }
    }
    for (const k of toRemove) {
      sessionStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
};

/**
 * Theo dõi định danh người dùng theo thời gian thực và làm mới token khi vào route có phạm vi rõ ràng.
 */
export function useOrganizerChatSubject(): string | null {
  const [subject, setSubject] = useState<string | null>(() => {
    purgeLegacyOrganizerChatStorage();
    return getCurrentUserSubject();
  });

  useEffect(() => {
    let active = true;

    const refreshIfNeeded = () => {
      const immediate = getCurrentUserSubject();
      if (immediate) {
        if (active) setSubject(immediate);
        return;
      }
      try {
        const session = getKeycloakSession() as {
          getCurrentToken: () => string | null;
          isAuthenticated?: () => boolean;
          getAccessToken?: () => Promise<string | null>;
        };
        if (typeof session.isAuthenticated === 'function' && session.isAuthenticated() && typeof session.getAccessToken === 'function') {
          void session.getAccessToken().then((freshToken) => {
            if (!active) return;
            const refreshedSubject = extractSubjectFromToken(freshToken);
            setSubject(refreshedSubject);
          }).catch(() => {
            if (active) setSubject(null);
          });
          return;
        }
      } catch {
        // ignore
      }
      if (active) {
        clearAllOrganizerSelectionStates();
        setSubject(null);
      }
    };

    const expire = () => {
      clearAllOrganizerSelectionStates();
      if (active) setSubject(null);
    };

    const storageChanged = (event: StorageEvent) => {
      if (event.key === 'access_token' || event.key === null) {
        refreshIfNeeded();
      }
    };

    refreshIfNeeded();
    window.addEventListener('auth-changed', refreshIfNeeded);
    window.addEventListener('user-updated', refreshIfNeeded);
    window.addEventListener('session-expired', expire);
    window.addEventListener('storage', storageChanged);
    return () => {
      active = false;
      window.removeEventListener('auth-changed', refreshIfNeeded);
      window.removeEventListener('user-updated', refreshIfNeeded);
      window.removeEventListener('session-expired', expire);
      window.removeEventListener('storage', storageChanged);
    };
  }, []);

  return subject;
}

/** Sinh khóa ngữ cảnh tách biệt theo tài khoản, phạm vi và eventId. */
export const getSessionStorageKey = (userSubject: string | null, scope: OrganizerChatScope, eventId?: string): string | null => {
  if (!userSubject) return null;
  const safeSubject = encodeURIComponent(userSubject);
  if (scope === 'event') {
    return eventId ? `${LEGACY_MSG_KEY_PREFIX}${safeSubject}:event:${encodeURIComponent(eventId)}` : null;
  }
  return `${LEGACY_MSG_KEY_PREFIX}${safeSubject}:managed_events`;
};

/** Sinh khóa lưu con trỏ phiên đang chọn theo tài khoản, phạm vi và eventId. */
export const getSelectedSessionKey = (userSubject: string | null, scope: OrganizerChatScope, eventId?: string): string | null => {
  if (!userSubject) return null;
  const safeSubject = encodeURIComponent(userSubject);
  if (scope === 'event') {
    return eventId ? `${SELECTION_KEY_PREFIX}${safeSubject}:event:${encodeURIComponent(eventId)}` : null;
  }
  return `${SELECTION_KEY_PREFIX}${safeSubject}:managed_events`;
};

/** Đọc con trỏ phiên đang chọn (không chứa nội dung tin nhắn). */
export const loadSelectedSessionState = (selectionKey: string | null): OrganizerSelectedSessionState | null => {
  if (!selectionKey) return null;
  try {
    const raw = sessionStorage.getItem(selectionKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OrganizerSelectedSessionState> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    const conversationId = typeof parsed.conversationId === 'string' && parsed.conversationId ? parsed.conversationId : null;
    const isDraft = Boolean(parsed.isDraft);
    return { conversationId, isDraft };
  } catch {
    return null;
  }
};

/** Lưu con trỏ phiên đang chọn cho thao tác đóng/mở lại khung chat trong cùng tab. */
export const saveSelectedSessionState = (
  selectionKey: string | null,
  state: OrganizerSelectedSessionState,
): void => {
  if (!selectionKey) return;
  try {
    sessionStorage.setItem(
      selectionKey,
      JSON.stringify({
        conversationId: state.conversationId,
        isDraft: state.isDraft,
      }),
    );
  } catch {
    // ignore
  }
};

/** Xóa con trỏ phiên đang chọn của một ngữ cảnh. */
export const clearSelectedSessionState = (selectionKey: string | null): void => {
  if (!selectionKey) return;
  try {
    sessionStorage.removeItem(selectionKey);
  } catch {
    // ignore
  }
};

/** Danh sách 4–6 thẻ chủ đề khởi đầu theo phạm vi (điền vào ô nháp khi chọn). */
export const getStarterTopics = (scope: OrganizerChatScope, isEn = false): OrganizerStarterTopic[] => {
  if (scope === 'event') {
    return isEn
      ? [
          {
            id: 'evt-tier-revenue',
            title: 'Revenue & Ticket Tiers',
            description: 'Compare revenue share and occupancy across VIP, Standard, and GA tiers.',
            prompt: 'How do revenue and seat occupancy compare across ticket tiers for this event?',
          },
          {
            id: 'evt-stock-anomalies',
            title: 'Stock & Order Audit',
            description: 'Check remaining tickets by showtime and detect paid orders missing tickets.',
            prompt: 'How many tickets are left per showtime, and are there any paid orders missing tickets?',
          },
          {
            id: 'evt-checkin-live',
            title: 'Check-in Progress',
            description: 'Monitor real-time attendee check-ins vs eligible issued tickets.',
            prompt: 'How many people have checked in for each showtime, and what is the check-in rate?',
          },
          {
            id: 'evt-voucher-boost',
            title: 'Voucher & Pricing Boost',
            description: 'Propose targeted discount tiers or flash vouchers for slow showtimes.',
            prompt: 'Which showtimes sold slowly over the last 7 days, and what vouchers could help?',
          },
          {
            id: 'evt-period-delta',
            title: '7-Day Sales Trend',
            description: 'Compare this week’s orders and ticket revenue against the previous 7 days.',
            prompt: 'How did ticket revenue and paid orders change compared with the previous 7 days?',
          },
          {
            id: 'evt-announcement-draft',
            title: 'Attendee Announcement',
            description: 'Draft a ready-to-send check-in reminder or last-tickets post.',
            prompt: 'Can you draft a short message explaining how attendees should check in?',
          },
        ]
      : [
          {
            id: 'evt-tier-revenue',
            title: 'Doanh thu & Hạng vé',
            description: 'So sánh tỷ trọng doanh thu và độ lấp đầy giữa các hạng vé.',
            prompt: 'Doanh thu và tỷ lệ lấp đầy ghế của từng hạng vé khác nhau thế nào?',
          },
          {
            id: 'evt-stock-anomalies',
            title: 'Tồn vé & Đơn bất thường',
            description: 'Kiểm tra vé còn lại từng suất diễn và đơn đã thanh toán thiếu vé.',
            prompt: 'Mỗi suất diễn còn bao nhiêu vé, có đơn nào đã thanh toán mà chưa phát hành đủ vé không?',
          },
          {
            id: 'evt-checkin-live',
            title: 'Tiến độ Check-in',
            description: 'Theo dõi số khách thực tế đã check-in so với tổng vé hợp lệ.',
            prompt: 'Mỗi suất đã có bao nhiêu khách check-in, chiếm bao nhiêu phần trăm số vé đã phát hành?',
          },
          {
            id: 'evt-voucher-boost',
            title: 'Chiến lược Voucher',
            description: 'Đề xuất mức giảm giá và số lượng voucher kích cầu cho suất bán chậm.',
            prompt: 'Trong 7 ngày qua, suất nào bán chậm và tôi nên tạo voucher gì để bán thêm vé?',
          },
          {
            id: 'evt-period-delta',
            title: 'Biến động 7 ngày',
            description: 'Đối chiếu doanh thu và đơn thanh toán 7 ngày qua so với kỳ trước.',
            prompt: 'Doanh thu bán vé và số đơn đã thanh toán trong 7 ngày qua thay đổi thế nào so với 7 ngày trước đó?',
          },
          {
            id: 'evt-announcement-draft',
            title: 'Bản nháp Thông báo',
            description: 'Soạn nhanh thông báo nhắc cổng check-in hoặc mở bán vé cuối.',
            prompt: 'Bạn soạn giúp tôi một thông báo ngắn về giờ mở cổng và cách check-in cho khán giả được không?',
          },
        ];
  }

  return isEn
    ? [
        {
          id: 'managed-overview',
          title: 'Portfolio Revenue Summary',
          description: 'Aggregate revenue, tickets sold, and paid orders across all managed events.',
          prompt: 'How much revenue have my events made, and how many tickets and paid orders do I have?',
        },
        {
          id: 'managed-velocity',
          title: 'Best & Slow Sellers (7d)',
          description: 'Spot top-performing events and events losing momentum this week.',
          prompt: 'In the last 7 days, which of my events sold best and which sold slowly compared to last period?',
        },
        {
          id: 'managed-risks',
          title: 'Events Needing Attention',
          description: 'Surface low stock alerts, slow showtimes, or paid orders missing tickets.',
          prompt: 'Which managed events have warnings, paid orders missing tickets, or slow-selling showtimes?',
        },
        {
          id: 'managed-budget',
          title: 'Marketing & Pricing Plan',
          description: 'Prioritize ad spend and promotional vouchers across upcoming events.',
          prompt: 'How should I split my marketing budget and use vouchers for my upcoming events?',
        },
      ]
    : [
        {
          id: 'managed-overview',
          title: 'Tổng hợp Doanh thu',
          description: 'Tổng hợp doanh thu, vé đã bán và đơn thanh toán toàn bộ sự kiện quản lý.',
          prompt: 'Các sự kiện tôi quản lý đã bán được bao nhiêu vé, có bao nhiêu đơn đã thanh toán và doanh thu là bao nhiêu?',
        },
        {
          id: 'managed-velocity',
          title: 'Bán chạy & Bán chậm (7 ngày)',
          description: 'Xếp hạng sự kiện tăng trưởng tốt và sự kiện chững lại trong tuần.',
          prompt: 'Trong 7 ngày qua, sự kiện nào bán tốt nhất và sự kiện nào bán chậm so với kỳ trước?',
        },
        {
          id: 'managed-risks',
          title: 'Sự kiện Cần chú ý',
          description: 'Rà soát cảnh báo đơn thiếu vé, sắp hết vé hoặc suất diễn bán chậm.',
          prompt: 'Sự kiện nào sắp hết vé, có suất bán chậm hoặc có đơn đã thanh toán mà chưa nhận đủ vé?',
        },
        {
          id: 'managed-budget',
          title: 'Phân bổ Ngân sách & Giá vé',
          description: 'Gợi ý ưu tiên ngân sách quảng bá và voucher giữa các sự kiện sắp tới.',
          prompt: 'Tôi nên chia ngân sách quảng bá và dùng voucher thế nào cho các sự kiện sắp tới?',
        },
      ];
};

/** Danh sách 3 câu hỏi gợi ý khởi đầu song ngữ theo phạm vi. */
export const getSuggestedQuestions = (scope: OrganizerChatScope, isEn = false): string[] => {
  if (scope === 'event') {
    return isEn
      ? [
          'How many tickets are left for each showtime?',
          'Which ticket tier has the highest occupancy?',
          'How many attendees have checked in?',
        ]
      : [
          'Mỗi suất diễn còn bao nhiêu vé?',
          'Hạng vé nào có tỷ lệ lấp đầy cao nhất?',
          'Đã có bao nhiêu khách check-in?',
        ];
  }
  return isEn
    ? [
        'Which events sold the most and fewest tickets in the last 7 days?',
        'How many tickets have I sold, and what was the total revenue?',
        'Which events need attention or have alerts?',
      ]
    : [
        'Sự kiện nào bán chạy nhất và bán chậm nhất trong 7 ngày qua?',
        'Tôi đã bán được bao nhiêu vé và tổng doanh thu là bao nhiêu?',
        'Sự kiện nào đang cần chú ý hoặc có cảnh báo?',
      ];
};

const MAX_SUGGESTED_QUESTIONS = 3;

const normalizeSuggestionKey = (text: string): string =>
  text
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[?.!]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const PURE_GREETING_RE = /^(?:hi|hello|hey|alo|chao|xin chao|chao ban|hello ad|hi ad)$/i;

/**
 * Suy ra tối đa 3 câu gợi ý tiếp theo dựa trên phản hồi gần nhất của AI (ưu tiên từ máy chủ,
 * có nhánh dự phòng theo ngữ cảnh câu hỏi ở phía client để hoạt động mượt cả khi backend chưa trả field mới).
 */
export const deriveNextSuggestedQuestions = ({
  scope,
  isEn,
  messages,
}: {
  scope: OrganizerChatScope;
  isEn: boolean;
  messages: OrganizerChatMessage[];
}): string[] => {
  const starters = getSuggestedQuestions(scope, isEn);

  let lastAiIndex = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.sender === 'ai' && !msg.isError) {
      lastAiIndex = i;
      break;
    }
  }

  if (lastAiIndex === -1) {
    return starters;
  }

  const lastAi = messages[lastAiIndex];
  let lastUser: OrganizerChatMessage | undefined;
  for (let i = lastAiIndex - 1; i >= 0; i -= 1) {
    if (messages[i].sender === 'user') {
      lastUser = messages[i];
      break;
    }
  }
  if (!lastUser) {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].sender === 'user') {
        lastUser = messages[i];
        break;
      }
    }
  }

  const askedSet = new Set(
    messages
      .filter((m) => m.sender === 'user')
      .map((m) => normalizeSuggestionKey(m.text))
      .filter(Boolean),
  );

  const hasFinanceRestriction =
    Boolean(lastAi.totals?.length) &&
    !lastAi.totals?.some((m) => m.key === 'ticket_sales_revenue') &&
    !lastAi.cards?.some((c) => c.metrics?.some((m) => m.key === 'ticket_sales_revenue'));

  const results: string[] = [];
  const seen = new Set<string>();

  const pushCandidate = (candidate: string) => {
    const trimmed = candidate.trim();
    if (!trimmed || results.length >= MAX_SUGGESTED_QUESTIONS) return;
    const key = normalizeSuggestionKey(trimmed);
    if (!key || seen.has(key) || askedSet.has(key)) return;
    if (hasFinanceRestriction && /\b(doanh thu|revenue)\b/i.test(key)) return;
    seen.add(key);
    results.push(trimmed);
  };

  if (Array.isArray(lastAi.suggestedQuestions)) {
    for (const item of lastAi.suggestedQuestions) {
      if (typeof item === 'string') pushCandidate(item);
    }
  }

  const q = normalizeSuggestionKey(lastUser?.text ?? '');

  if (PURE_GREETING_RE.test(q)) {
    for (const item of starters) pushCandidate(item);
  } else {
    const hasWarnings = (lastAi.warnings?.length ?? 0) > 0;
    const askedWarnings = /\b(can chu y|canh bao|thieu ve|chua co ve|attention|alert|missing tickets)\b/.test(q);

    if (hasWarnings && !askedWarnings) {
      pushCandidate(
        scope === 'event'
          ? isEn
            ? 'Are there any paid orders missing tickets?'
            : 'Có đơn nào đã thanh toán mà thiếu vé không?'
          : isEn
            ? 'Which events need attention or have alerts?'
            : 'Sự kiện nào đang cần chú ý hoặc có cảnh báo?',
      );
    }

    if (/\b(theo ngay|tung ngay|by day|daily)\b/.test(q)) {
      const pool =
        scope === 'event'
          ? isEn
            ? [
                'Compare revenue this week vs last week?',
                'Which ticket tier has the highest occupancy?',
                'What voucher strategy works best for slow showtimes?',
              ]
            : [
                'So sánh doanh thu tuần này và tuần trước?',
                'Hạng vé nào có tỷ lệ lấp đầy cao nhất?',
                'Đề xuất chiến lược voucher cho suất bán chậm?',
              ]
          : isEn
            ? [
                'Compare revenue this week vs last week?',
                'Which events sold the most and fewest tickets in the last 7 days?',
                'How should I allocate marketing budget across upcoming events?',
              ]
            : [
                'So sánh doanh thu tuần này và tuần trước?',
                'Sự kiện nào bán chạy nhất và bán chậm nhất trong 7 ngày qua?',
                'Tư vấn phân bổ ngân sách quảng bá cho các sự kiện sắp tới?',
              ];
      pool.forEach(pushCandidate);
    } else if (/\b(tu van|ngan sach|quang ba|gia ve|voucher|soan|viet|ke hoach|advise|budget|promot|pric|draft)\b/.test(q)) {
      const pool =
        scope === 'event'
          ? isEn
            ? [
                'Create a 7-day promotion plan for this event?',
                'Draft check-in instructions for attendees?',
                'What voucher strategy works best for slow showtimes?',
              ]
            : [
                'Lập kế hoạch quảng bá trong 7 ngày tới cho sự kiện này?',
                'Soạn thông báo hướng dẫn check-in cho khán giả?',
                'Đề xuất chiến lược voucher cho suất bán chậm?',
              ]
          : isEn
            ? [
                'Create a 7-day promotion plan?',
                'Which events sold the most and fewest tickets in the last 7 days?',
                'Which events need attention or have alerts?',
              ]
            : [
                'Lập kế hoạch quảng bá chi tiết trong 7 ngày tới?',
                'Sự kiện nào bán chạy nhất và bán chậm nhất trong 7 ngày qua?',
                'Sự kiện nào đang cần chú ý hoặc có cảnh báo?',
              ];
      pool.forEach(pushCandidate);
    } else if (/\b(check-in|checkin|check in|tham gia|attendance)\b/.test(q)) {
      const pool = isEn
        ? [
            'Show daily check-ins over the last 7 days?',
            'How many tickets are left for each showtime?',
            'Draft an opening-time and check-in reminder?',
          ]
        : [
            'Xem lượt check-in theo ngày trong 7 ngày qua?',
            'Mỗi suất diễn còn bao nhiêu vé?',
            'Soạn thông báo hướng dẫn giờ mở cổng và check-in?',
          ];
      pool.forEach(pushCandidate);
    } else if (/\b(ton ve|con bao nhieu ve|hang ve|lap day|remaining|occupancy|tier|stock)\b/.test(q)) {
      const pool = isEn
        ? [
            'Are there any paid orders missing tickets?',
            'Compare revenue across ticket tiers?',
            'What voucher strategy works best for slow showtimes?',
          ]
        : [
            'Có đơn nào đã thanh toán mà thiếu vé không?',
            'So sánh doanh thu theo từng hạng vé?',
            'Đề xuất chiến lược voucher cho suất bán chậm?',
          ];
      pool.forEach(pushCandidate);
    } else if (askedWarnings) {
      const pool =
        scope === 'event'
          ? isEn
            ? [
                'How many tickets are left for each showtime?',
                'What voucher strategy works best for slow showtimes?',
                'Draft check-in instructions for attendees?',
              ]
            : [
                'Mỗi suất diễn còn bao nhiêu vé?',
                'Đề xuất chiến lược voucher cho suất bán chậm?',
                'Soạn thông báo hướng dẫn check-in cho khán giả?',
              ]
          : isEn
            ? [
                'How many tickets have I sold, and what was the total revenue?',
                'How should I allocate marketing budget across upcoming events?',
                'Are any of my events still pending approval?',
              ]
            : [
                'Tôi đã bán được bao nhiêu vé và tổng doanh thu là bao nhiêu?',
                'Tư vấn phân bổ ngân sách quảng bá cho các sự kiện sắp tới?',
                'Có sự kiện nào của tôi đang chờ duyệt không?',
              ];
      pool.forEach(pushCandidate);
    } else if (/\b(ban chay|ban cham|ban tot|cao nhat|thap nhat|best|slow|most|fewest)\b/.test(q)) {
      const pool = isEn
        ? [
            'How can I boost sales for slow-selling events?',
            'Show daily ticket sales over the last 7 days?',
            'Compare tickets sold this week vs last week?',
          ]
        : [
            'Tư vấn cách tăng vé cho sự kiện bán chậm?',
            'Xem số vé bán theo ngày trong 7 ngày qua?',
            'So sánh số vé bán tuần này và tuần trước?',
          ];
      pool.forEach(pushCandidate);
    } else if (/\b(cho duyet|pending|quan ly|quan li|danh sach su kien|upcoming|sap toi)\b/.test(q)) {
      const pool = isEn
        ? [
            'Which events am I managing?',
            'How many tickets have I sold, and what was the total revenue?',
            'Which events need attention or have alerts?',
          ]
        : [
            'Tôi đang quản lý những sự kiện nào?',
            'Tôi đã bán được bao nhiêu vé và tổng doanh thu là bao nhiêu?',
            'Sự kiện nào đang cần chú ý hoặc có cảnh báo?',
          ];
      pool.forEach(pushCandidate);
    } else if (/\b(doanh thu|revenue|ve da ban|tong hop|tong quan|tickets sold|overview)\b/.test(q)) {
      const pool =
        scope === 'event'
          ? isEn
            ? [
                'Show daily revenue over the last 7 days?',
                'Which ticket tier has the highest occupancy?',
                'How many tickets are left for each showtime?',
              ]
            : [
                'Xem doanh thu theo ngày trong 7 ngày qua?',
                'Hạng vé nào có tỷ lệ lấp đầy cao nhất?',
                'Mỗi suất diễn còn bao nhiêu vé?',
              ]
          : isEn
            ? [
                'Show daily revenue over the last 7 days?',
                'Compare revenue this week vs last week?',
                'Which events sold the most and fewest tickets in the last 7 days?',
              ]
            : [
                'Xem doanh thu theo ngày trong 7 ngày qua?',
                'So sánh doanh thu tuần này và tuần trước?',
                'Sự kiện nào bán chạy nhất và bán chậm nhất trong 7 ngày qua?',
              ];
      pool.forEach(pushCandidate);
    }
  }

  const secondaryPool =
    scope === 'event'
      ? isEn
        ? [
            'How can I increase revenue for this event?',
            'How should I price tickets for this event?',
            'How can I promote this event over the next 7 days?',
          ]
        : [
            'Làm sao để tăng doanh thu cho sự kiện này?',
            'Tôi nên đặt giá vé thế nào?',
            'Tôi nên quảng bá sự kiện thế nào trong 7 ngày tới?',
          ]
      : isEn
        ? [
            'Are any of my events still pending approval?',
            'Which upcoming events should I spend more on promoting?',
            'Which events am I managing?',
          ]
        : [
            'Có sự kiện nào của tôi đang chờ duyệt không?',
            'Tôi nên tăng ngân sách quảng bá cho sự kiện nào sắp tới?',
            'Tôi đang quản lý những sự kiện nào?',
          ];

  for (const item of [...starters, ...secondaryPool]) {
    pushCandidate(item);
  }

  if (results.length === 0) {
    return starters;
  }
  return results;
};
