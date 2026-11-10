import { PATHS } from '@/routes/paths';
import type { NotificationItem } from '@/types';

// Older messages contain no reliable record ID. Keep them in the inbox rather
// than guessing an event from a title or a notification delivery identifier.
export function adminNotificationTarget(item: NotificationItem): string | null {
  // a payment that needs a person (late payment, tickets that could not be issued): the reconciliation page lists it
  if (item.type === 'PAYMENT_EXCEPTION') return PATHS.ADMIN_RECONCILIATION;
  if (!['NEW_EVENT_APPROVAL', 'EVENT_UPDATED'].includes(item.type)) return null;
  return PATHS.ADMIN_EVENTS_APPROVAL;
}
