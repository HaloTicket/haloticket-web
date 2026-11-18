/** Một thông báo gửi tới người dùng. */
export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  readStatus?: boolean;
  createdAt?: string;
  /** Văn bản JSON; thông báo duyệt sự kiện mang {eventId, link, flaggedFields} (thông báo cũ có thể không có). */
  variablesJson?: string | null;
}
