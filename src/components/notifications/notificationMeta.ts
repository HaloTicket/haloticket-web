import type { IconType } from "react-icons";
import { FiAlertCircle, FiBell, FiCalendar, FiShield, FiTag } from "react-icons/fi";
import { LuMegaphone, LuTicket } from "react-icons/lu";
import type { NotificationItem } from "@/types";
import type { Label } from "./useLabel";

export const isOrganizer = (item: NotificationItem) => item.source === "ORGANIZER" || item.type === "ORGANIZER_ANNOUNCEMENT";
export const isInternalNotification = (item: NotificationItem) => item.visibility === "STAFF" || item.category === "INTERNAL";
export const isImportant = (item: NotificationItem) => item.priority === "IMPORTANT" || item.priority === "URGENT";
export const isUnread = (item: NotificationItem) => !item.readStatus;

const hasAny = (value: string, words: string[]) => words.some((word) => value.includes(word));

/** Nhóm loại của thông báo HaloTicket, dùng cho nhãn và biểu tượng. */
export function systemKind(type: string): "transaction" | "event" | "alert" | "system" {
  const value = type.toLowerCase();
  if (hasAny(value, ["ticket", "order", "payment", "refund", "transfer"])) return "transaction";
  if (hasAny(value, ["alert", "warning", "error", "exception"])) return "alert";
  if (hasAny(value, ["event", "calendar"])) return "event";
  return "system";
}

/** Biểu tượng và màu nền theo nguồn, danh mục và loại. */
export function itemVisual(item: NotificationItem): { Icon: IconType; tone: string } {
  if (isOrganizer(item)) {
    if (item.category === "INTERNAL") return { Icon: FiShield, tone: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300" };
    if (item.category === "PROMOTION") return { Icon: FiTag, tone: "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300" };
    if (item.category === "REMINDER") return { Icon: FiBell, tone: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300" };
    return { Icon: LuMegaphone, tone: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300" };
  }
  switch (systemKind(item.type)) {
    case "transaction": return { Icon: LuTicket, tone: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300" };
    case "event": return { Icon: FiCalendar, tone: "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300" };
    case "alert": return { Icon: FiAlertCircle, tone: "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300" };
    default: return { Icon: FiBell, tone: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300" };
  }
}

export const categoryLabels = {
  EVENT_UPDATE: ["Cập nhật sự kiện", "Event update"],
  PROMOTION: ["Quảng bá & ưu đãi", "Promotion & offers"],
  REMINDER: ["Nhắc nhở", "Reminder"],
  INTERNAL: ["Nội bộ", "Internal"],
} as const;

/** Nhãn nguồn: "Từ HaloTicket · Hệ thống" hoặc "Từ BTC · Tên sự kiện". */
export function sourceText(item: NotificationItem, label: Label) {
  if (isOrganizer(item)) return `${label("Từ BTC", "From organizer")} · ${item.eventTitle ?? label("Ban tổ chức", "Organizer")}`;
  const kind = {
    transaction: label("Giao dịch", "Transactions"),
    event: label("Sự kiện", "Event"),
    alert: label("Cảnh báo", "Alert"),
    system: label("Hệ thống", "System"),
  }[systemKind(item.type)];
  return `${label("Từ HaloTicket", "From HaloTicket")} · ${kind}`;
}
