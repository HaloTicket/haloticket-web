import { PATHS } from "@/routes/paths";
import type { NotificationItem } from "@/types/notification";

const PLAIN_ID = /^[A-Za-z0-9_-]{1,100}$/;

/**
 * Where a click on an event approval notification goes: the edit page of that very event when the notification carries its id
 * (variablesJson.eventId), otherwise the list of the organiser's events. Only the id is used, never the `link` of the payload,
 * and only when it is a plain id, so a notification can not send anyone to another path or address.
 */
export function eventTargetOfNotification(notification: Pick<NotificationItem, "variablesJson">): string {
  try {
    const raw = notification.variablesJson;
    if (typeof raw === "string" && raw.trim().startsWith("{")) {
      const parsed = JSON.parse(raw) as { eventId?: unknown };
      if (typeof parsed.eventId === "string" && PLAIN_ID.test(parsed.eventId)) return PATHS.EVENT_MANAGE_EDIT(parsed.eventId);
    }
  } catch {
    // malformed JSON: fall back to the list
  }
  return PATHS.MY_EVENTS;
}
