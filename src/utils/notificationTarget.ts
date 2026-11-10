import { PATHS } from "@/routes/paths";
import type { NotificationItem } from "@/types/notification";
import { eventTargetOfNotification } from "@/utils/notificationLinks";

export type NotificationRole = "customer" | "organizer" | "admin";

type Notice = Pick<NotificationItem, "type" | "message" | "variablesJson">;

const PLAIN_CODE = /^[A-Za-z0-9_-]{1,100}$/;
const SAGA_ID = /Mã lời mời: ([a-f0-9-]{36})/i;
const ADMIN_EVENT_REF = /EV_[a-zA-Z0-9_-]+/;

function variablesOf(notice: Notice): Record<string, unknown> {
  try {
    const raw = notice.variablesJson;
    if (typeof raw === "string" && raw.trim().startsWith("{")) {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    }
  } catch {
    // malformed JSON: treated as no extra data
  }
  return {};
}

// the booking code of a notification, only when it is a plain code (never a path or an address)
function bookingCodeOf(notice: Notice): string | null {
  const code = variablesOf(notice).bookingCode;
  return typeof code === "string" && PLAIN_CODE.test(code) ? code : null;
}

function adminTarget(notice: Notice): string | null {
  const type = notice.type || "";
  // a payment that needs a person (late payment, tickets that could not be issued): the reconciliation page lists it
  if (type === "PAYMENT_EXCEPTION") return PATHS.ADMIN_RECONCILIATION;
  if (type === "NEW_EVENT_APPROVAL" || type === "EVENT_UPDATED") return PATHS.ADMIN_EVENTS_APPROVAL;
  if (type.includes("PAYOUT")) return PATHS.ADMIN_FINANCE;
  return null;
}

/**
 * Where a click on a notification goes, for every kind of bell, toast and inbox. null means "stay where you are": the
 * notification is marked as read and nothing else happens. A type this function does not know never sends anyone to the
 * organiser's event list (the old fallback). Only plain ids and codes from the payload are used, never a link.
 */
export function notificationTarget(notice: Notice, role: NotificationRole): string | null {
  if (role === "admin") {
    const known = adminTarget(notice);
    if (known) return known;
    // an older admin message that names an event (EV_...) opens that event's approval
    const ref = notice.message?.match(ADMIN_EVENT_REF)?.[0];
    return ref ? `${PATHS.ADMIN_EVENTS_APPROVAL}?eventId=${ref}` : null;
  }
  const type = notice.type || "";
  if (type === "GIFT_INVITATION") {
    const sagaId = notice.message?.match(SAGA_ID)?.[1];
    return sagaId ? `${PATHS.GIFT_ACCEPT}?sagaId=${encodeURIComponent(sagaId)}` : null;
  }
  if (type === "PAYOUT_APPROVED" || type === "PAYOUT_REQUESTED") return PATHS.REPORTS;
  if (type === "EVENT_APPROVED" || type === "EVENT_UPDATE_APPROVED" || type === "EVENT_REJECTED") return eventTargetOfNotification(notice);
  if (type === "TICKETS_ISSUED" || type === "TICKET_ISSUED") {
    const code = bookingCodeOf(notice);
    return code ? PATHS.ORDER_DETAIL(encodeURIComponent(code)) : PATHS.MY_TICKETS;
  }
  if (type.startsWith("RESALE_") || type.startsWith("GIFT_") || type.startsWith("TICKET_")) return PATHS.MY_TICKETS;
  return null;
}
