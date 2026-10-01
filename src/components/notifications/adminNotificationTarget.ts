import { PATHS } from '@/routes/paths';
import type { NotificationItem } from '@/types';

// Older messages contain no reliable record ID. Keep them in the inbox rather
// than guessing an event from a title or a notification delivery identifier.
export function adminNotificationTarget(item: NotificationItem): string | null {
  if (!['NEW_EVENT_APPROVAL', 'EVENT_UPDATED'].includes(item.type)) return null;
  return PATHS.ADMIN_EVENTS_APPROVAL;
}
