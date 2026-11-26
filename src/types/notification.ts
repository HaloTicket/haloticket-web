export type NotificationSource = "HALOTICKET" | "ORGANIZER";
export type NotificationVisibility = "PUBLIC" | "STAFF";
export type NotificationChannel = "PUBLIC" | "STAFF" | "ALL";
export type AnnouncementCategory = "EVENT_UPDATE" | "PROMOTION" | "REMINDER" | "INTERNAL";
export type NotificationPriority = "NORMAL" | "IMPORTANT" | "URGENT";

export type AnnouncementTargetGroup = "CUSTOMER" | "STAFF";
export type CustomerAnnouncementScope = "ALL" | "TICKET_TYPE" | "SHOWTIME" | "CHECKED_IN" | "NOT_CHECKED_IN";
export type StaffAnnouncementScope = "ALL" | "CHECKIN_STAFF" | "ROLE" | "MEMBER";
export type AnnouncementTargetScope = CustomerAnnouncementScope | StaffAnnouncementScope;
export type AnnouncementStaffRole = "OWNER" | "ADMIN" | "MANAGER" | "CHECKIN_STAFF";

export interface AnnouncementTarget {
  group: AnnouncementTargetGroup;
  scope: AnnouncementTargetScope;
  ticketTypeId?: string;
  showtimeId?: string;
  role?: AnnouncementStaffRole;
  memberId?: string;
}

/** Một thông báo gửi tới người dùng. */
export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  priority?: NotificationPriority;
  title: string;
  message: string;
  readStatus?: boolean;
  createdAt?: string;
  /** Văn bản JSON; thông báo duyệt sự kiện mang {eventId, link, flaggedFields} (thông báo cũ có thể không có). */
  variablesJson?: string | null;
  /** Nguồn hiển thị; thiếu nghĩa là HaloTicket (gồm thông báo hệ thống như duyệt sự kiện). */
  source?: NotificationSource;
  /** Mã sự kiện gắn sẵn với thông báo của BTC. */
  eventId?: string;
  /** Tên sự kiện do dịch vụ gắn sẵn, chỉ có với thông báo của BTC. */
  eventTitle?: string;
  category?: AnnouncementCategory;
  /** Kênh hiển thị của thông báo BTC: công khai cho khách hoặc nội bộ cho nhân sự. */
  visibility?: NotificationVisibility;
}
