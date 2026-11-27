import type { NotificationItem } from '@/types';
import { notificationTarget } from '@/utils/notificationTarget';

/** Trả về đường dẫn đích khi admin bấm vào một thông báo. Dùng chung một cách ánh xạ cho chuông, toast và hộp thư: xem `notificationTarget`. */
export function adminNotificationTarget(item: NotificationItem): string | null {
  if (item.type === 'SYSTEM_ANNOUNCEMENT') return null;
  return notificationTarget(item, 'admin');
}
