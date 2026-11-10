import type { NotificationItem } from '@/types';
import { notificationTarget } from '@/utils/notificationTarget';

// one mapping for the bell, the toast and the inbox: see notificationTarget.
export function adminNotificationTarget(item: NotificationItem): string | null {
  return notificationTarget(item, 'admin');
}
