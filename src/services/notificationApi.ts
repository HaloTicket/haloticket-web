import axiosClient from "./axiosClient";
import type { AnnouncementCategory, AnnouncementTarget, NotificationChannel, NotificationPriority } from "@/types";

export type AnnouncementAudience = { kind: "ALL" }
  | { kind: "USER"; userId: string }
  | { kind: "EVENT_ORGANIZING_TEAM"; eventId: string };

export interface AnnouncementRequest {
  requestId: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  audience: AnnouncementAudience;
}

export interface AnnouncementStatus {
  id: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  recipientCount: number;
  deliveredCount: number;
  errorCode?: string;
}

export type OrganizerAnnouncementStatus = "PENDING_REVIEW" | "CHANGES_REQUESTED" | "REJECTED" | "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
export type ModerationAction = "APPROVE" | "REQUEST_CHANGES" | "REJECT";

export interface AnnouncementScan {
  status: "COMPLETE" | "UNAVAILABLE";
  score?: number;
  level?: "LOW" | "MEDIUM" | "HIGH";
  findings?: string[];
}

export interface OrganizerAnnouncement {
  id: string;
  eventId: string;
  eventTitle: string;
  title: string;
  message: string;
  category: AnnouncementCategory;
  audience?: string;
  target?: AnnouncementTarget;
  status: OrganizerAnnouncementStatus;
  revision: number;
  submittedAt: string;
  reviewedAt?: string;
  reviewReason?: string;
  recipientCount: number;
  deliveredCount: number;
  scan?: AnnouncementScan;
}

export interface AnnouncementPage { items: OrganizerAnnouncement[]; total: number }
export interface OrganizerAnnouncementDraft {
  title: string;
  message: string;
  category: AnnouncementCategory;
  target?: AnnouncementTarget;
  expectedRecipientCount?: number;
}
export interface RecipientCountResponse { recipientCount: number }

const announcementsUrl = (eventId: string) => `/notifications/events/${encodeURIComponent(eventId)}/announcements`;
const asPage = (response: unknown): AnnouncementPage => {
  const page = response as Partial<AnnouncementPage> | null;
  if (!page || !Array.isArray(page.items) || typeof page.total !== "number") throw new Error("INVALID_ANNOUNCEMENT_RESPONSE");
  return { items: page.items, total: page.total };
};
const asRecipientCount = (response: unknown): RecipientCountResponse => {
  const data = response as Partial<RecipientCountResponse> | null;
  if (!data || typeof data.recipientCount !== "number" || !Number.isFinite(data.recipientCount) || data.recipientCount < 0) {
    throw new Error("INVALID_RECIPIENT_COUNT_RESPONSE");
  }
  return { recipientCount: data.recipientCount };
};
export const notificationApi = {
    /** Lấy danh sách thông báo của người dùng; ném lỗi nếu phản hồi không phải mảng. */
  getUserNotifications: async (userId: string = "ADMIN", channel?: NotificationChannel): Promise<Record<string, unknown>[]> => {
    const url = `/notifications/users/${encodeURIComponent(userId)}`;
    const response: unknown = channel
      ? await axiosClient.get(url, { params: { channel } })
      : await axiosClient.get(url);
    if (Array.isArray(response)) {
      return response as Record<string, unknown>[];
    }
    throw new Error("INVALID_NOTIFICATION_RESPONSE");
  },

    /** Đánh dấu một thông báo là đã đọc. */
  markNotificationAsRead: async (id: string): Promise<unknown> => {
    return await axiosClient.patch(`/notifications/${encodeURIComponent(id)}/read`);
  },

  /** Mark one notification as unread. */
  markNotificationAsUnread: async (id: string): Promise<unknown> => {
    return await axiosClient.patch(`/notifications/${encodeURIComponent(id)}/unread`);
  },

    /** Đánh dấu toàn bộ thông báo của người dùng là đã đọc. */
  markAllNotificationsAsRead: async (userId: string, channel?: NotificationChannel): Promise<Record<string, unknown>[]> => {
    const url = `/notifications/users/${encodeURIComponent(userId)}/read-all`;
    const response: unknown = channel
      ? await axiosClient.patch(url, undefined, { params: { channel } })
      : await axiosClient.patch(url);
    if (!Array.isArray(response)) throw new Error("INVALID_NOTIFICATION_RESPONSE");
    return response;
  },

  deleteNotification: async (id: string): Promise<void> => {
    await axiosClient.delete(`/notifications/${encodeURIComponent(id)}`);
  },

  listEventAnnouncements: async (eventId: string, page = 0, size = 20, signal?: AbortSignal): Promise<AnnouncementPage> =>
    asPage(await axiosClient.get(announcementsUrl(eventId), { params: { page, size }, signal })),

  estimateAnnouncementRecipients: async (eventId: string, target: AnnouncementTarget, signal?: AbortSignal): Promise<RecipientCountResponse> =>
    asRecipientCount(await axiosClient.post(`${announcementsUrl(eventId)}/recipient-count`, { target }, { signal })),

  createEventAnnouncement: (eventId: string, data: OrganizerAnnouncementDraft & { requestId: string }, signal?: AbortSignal) =>
    axiosClient.post<unknown, OrganizerAnnouncement>(announcementsUrl(eventId), data, { signal }),

  resubmitEventAnnouncement: (eventId: string, id: string, data: OrganizerAnnouncementDraft & { revision: number }, signal?: AbortSignal) =>
    axiosClient.put<unknown, OrganizerAnnouncement>(`${announcementsUrl(eventId)}/${encodeURIComponent(id)}`, data, { signal }),

  listModeration: async (page = 0, size = 20, q = "", signal?: AbortSignal): Promise<AnnouncementPage> =>
    asPage(await axiosClient.get("/notifications/admin/moderation", { params: { page, size, ...(q.trim() ? { q: q.trim() } : {}) }, signal })),

  moderateAnnouncement: (id: string, data: { revision: number; action: ModerationAction; reason?: string }, signal?: AbortSignal) =>
    axiosClient.patch<unknown, OrganizerAnnouncement>(`/notifications/admin/moderation/${encodeURIComponent(id)}`, data, { signal }),

  createAnnouncement: (data: AnnouncementRequest, signal?: AbortSignal) =>
    axiosClient.post<unknown, AnnouncementStatus>("/notifications/admin/announcements", data, { signal }),

  getAnnouncement: (id: string, signal?: AbortSignal) =>
    axiosClient.get<unknown, AnnouncementStatus>(`/notifications/admin/announcements/${encodeURIComponent(id)}`, { signal }),

    /** Gửi nội dung thông báo qua backend; lỗi thì ghi cảnh báo và trả về `null`. */
  publishNotification: async (data: { userId: string; type: string; title: string; message: string }): Promise<unknown> => {
    try {
      const response: unknown = await axiosClient.post("/notifications/publish", data);
      return response;
    } catch (err) {
      console.warn("Failed to publish notification via backend API:", err);
      return null;
    }
  },
};
