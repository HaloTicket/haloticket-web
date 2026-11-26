import type { IconType } from "react-icons";
import { FiBell, FiShield, FiTag } from "react-icons/fi";
import { LuMegaphone } from "react-icons/lu";
import type {
  AnnouncementCategory,
  AnnouncementStaffRole,
  AnnouncementTarget,
  AnnouncementTargetGroup,
  CustomerAnnouncementScope,
  StaffAnnouncementScope,
} from "@/types";
import type { OrganizerAnnouncementStatus } from "@/services/notificationApi";
import type { Label } from "./useLabel";

export const announcementCategories: Record<AnnouncementCategory, { vi: string; en: string; descVi: string; descEn: string; Icon: IconType; tone: string }> = {
  EVENT_UPDATE: { vi: "Cập nhật sự kiện", en: "Event update", descVi: "Thay đổi lịch trình, địa điểm, quy định", descEn: "Schedule, venue or rule changes", Icon: LuMegaphone, tone: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300" },
  PROMOTION: { vi: "Quảng bá & ưu đãi", en: "Promotion & offers", descVi: "Giới thiệu thông tin, chương trình mới", descEn: "Introduce news and new programs", Icon: FiTag, tone: "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300" },
  REMINDER: { vi: "Nhắc nhở", en: "Reminder", descVi: "Check-in, thời gian diễn ra", descEn: "Check-in and show times", Icon: FiBell, tone: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300" },
  INTERNAL: { vi: "Thông báo nội bộ", en: "Internal notice", descVi: "Hướng dẫn vận hành, phân công nhân sự", descEn: "Operational updates and staff coordination", Icon: FiShield, tone: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300" },
};

export const categoryPill: Record<AnnouncementCategory, string> = {
  EVENT_UPDATE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  PROMOTION: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  REMINDER: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  INTERNAL: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
};

export const CUSTOMER_CATEGORIES: AnnouncementCategory[] = ["EVENT_UPDATE", "PROMOTION", "REMINDER"];
export const STAFF_CATEGORIES: AnnouncementCategory[] = ["EVENT_UPDATE", "INTERNAL", "REMINDER"];

export const categoriesForGroup = (group: AnnouncementTargetGroup): AnnouncementCategory[] =>
  group === "STAFF" ? STAFF_CATEGORIES : CUSTOMER_CATEGORIES;

export const adaptCategoryForGroup = (category: AnnouncementCategory, group: AnnouncementTargetGroup): AnnouncementCategory => {
  if (group === "STAFF") return category === "PROMOTION" ? "INTERNAL" : category;
  return category === "INTERNAL" ? "PROMOTION" : category;
};

export const CUSTOMER_SCOPES: { value: CustomerAnnouncementScope; vi: string; en: string }[] = [
  { value: "ALL", vi: "Tất cả khách hàng của sự kiện", en: "All event customers" },
  { value: "TICKET_TYPE", vi: "Khách theo hạng vé", en: "Customers by ticket type" },
  { value: "SHOWTIME", vi: "Khách theo suất diễn", en: "Customers by showtime" },
  { value: "CHECKED_IN", vi: "Khách đã check-in", en: "Checked-in customers" },
  { value: "NOT_CHECKED_IN", vi: "Khách chưa check-in", en: "Not checked-in customers" },
];

export const STAFF_SCOPES: { value: StaffAnnouncementScope; vi: string; en: string }[] = [
  { value: "ALL", vi: "Tất cả nhân sự của sự kiện", en: "All event staff" },
  { value: "MEMBER", vi: "Thành viên cụ thể", en: "Specific member" },
];

export const STAFF_ROLE_LABELS: Record<AnnouncementStaffRole, { vi: string; en: string }> = {
  OWNER: { vi: "Chủ sự kiện", en: "Event owner" },
  ADMIN: { vi: "Quản trị viên", en: "Administrator" },
  MANAGER: { vi: "Quản lý", en: "Manager" },
  CHECKIN_STAFF: { vi: "Nhân viên check-in", en: "Check-in staff" },
};

export const DEFAULT_ANNOUNCEMENT_TARGET: AnnouncementTarget = { group: "CUSTOMER", scope: "ALL" };

export function normalizeAnnouncementTarget(target?: AnnouncementTarget | null): AnnouncementTarget {
  if (!target) return DEFAULT_ANNOUNCEMENT_TARGET;
  const group: AnnouncementTargetGroup = target.group === "STAFF" ? "STAFF" : "CUSTOMER";
  if (group === "STAFF") {
    const scope: StaffAnnouncementScope = STAFF_SCOPES.some((item) => item.value === target.scope)
      ? target.scope as StaffAnnouncementScope
      : "ALL";
    return {
      group,
      scope,
      ...(scope === "ROLE" && target.role ? { role: target.role } : {}),
      ...(scope === "MEMBER" && target.memberId ? { memberId: target.memberId } : {}),
    };
  }
  const scope: CustomerAnnouncementScope = CUSTOMER_SCOPES.some((item) => item.value === target.scope)
    ? target.scope as CustomerAnnouncementScope
    : "ALL";
  return {
    group,
    scope,
    ...(scope === "TICKET_TYPE" && target.ticketTypeId ? { ticketTypeId: target.ticketTypeId } : {}),
    ...(scope === "SHOWTIME" && target.showtimeId ? { showtimeId: target.showtimeId } : {}),
  };
}

export function isTargetComplete(target: AnnouncementTarget): boolean {
  if (target.group === "CUSTOMER") {
    if (target.scope === "TICKET_TYPE") return Boolean(target.ticketTypeId?.trim());
    if (target.scope === "SHOWTIME") return Boolean(target.showtimeId?.trim());
    return true;
  }
  if (target.scope === "ROLE") return Boolean(target.role);
  if (target.scope === "MEMBER") return Boolean(target.memberId?.trim());
  return true;
}

export function staffRoleText(role: AnnouncementStaffRole | string | undefined, label: Label): string {
  if (!role) return "";
  const entry = STAFF_ROLE_LABELS[role as AnnouncementStaffRole];
  return entry ? label(entry.vi, entry.en) : role;
}

export function formatAnnouncementTarget(
  rawTarget: AnnouncementTarget | undefined | null,
  label: Label,
  lookup?: { ticketTypeName?: string; showtimeLabel?: string; memberLabel?: string },
): string {
  const target = normalizeAnnouncementTarget(rawTarget);
  if (target.group === "STAFF") {
    const groupLabel = label("Nhân viên (STAFF)", "Staff");
    if (target.scope === "ALL") return `${groupLabel} · ${label("Tất cả nhân sự của sự kiện", "All event staff")}`;
    if (target.scope === "CHECKIN_STAFF") return `${groupLabel} · ${label("Nhân viên check-in", "Check-in staff")}`;
    if (target.scope === "ROLE") {
      const roleLabel = target.role ? staffRoleText(target.role, label) : label("Chưa chọn vai trò", "No role selected");
      return `${groupLabel} · ${label("Theo vai trò", "By role")}: ${roleLabel}`;
    }
    const memberLabel = lookup?.memberLabel || (target.memberId
      ? label("Không có thông tin thành viên", "Member details unavailable")
      : label("Chưa chọn thành viên", "No member selected"));
    return `${groupLabel} · ${label("Thành viên cụ thể", "Specific member")}: ${memberLabel}`;
  }
  if (target.scope === "ALL") return label("Tất cả khách hàng của sự kiện", "All event customers");
  if (target.scope === "CHECKED_IN") return label("Khách đã check-in", "Checked-in customers");
  if (target.scope === "NOT_CHECKED_IN") return label("Khách chưa check-in", "Not checked-in customers");
  if (target.scope === "TICKET_TYPE") {
    const name = lookup?.ticketTypeName || target.ticketTypeId || label("Chưa chọn hạng vé", "No ticket type selected");
    return `${label("Khách theo hạng vé", "Customers by ticket type")}: ${name}`;
  }
  const showtime = lookup?.showtimeLabel || target.showtimeId || label("Chưa chọn suất diễn", "No showtime selected");
  return `${label("Khách theo suất diễn", "Customers by showtime")}: ${showtime}`;
}

export const statusMeta: Record<OrganizerAnnouncementStatus, { vi: string; en: string; tone: string }> = {
  PENDING_REVIEW: { vi: "Chờ duyệt", en: "Pending review", tone: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
  CHANGES_REQUESTED: { vi: "Cần chỉnh sửa", en: "Changes requested", tone: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300" },
  REJECTED: { vi: "Đã từ chối", en: "Rejected", tone: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300" },
  QUEUED: { vi: "Đang chờ gửi", en: "Queued", tone: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300" },
  PROCESSING: { vi: "Đang gửi", en: "Sending", tone: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300" },
  COMPLETED: { vi: "Đã gửi", en: "Sent", tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
  FAILED: { vi: "Gửi thất bại", en: "Delivery failed", tone: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300" },
};

export const categoryText = (category: AnnouncementCategory, label: Label) => {
  const entry = announcementCategories[category] ?? announcementCategories.EVENT_UPDATE;
  return label(entry.vi, entry.en);
};
export const statusText = (status: OrganizerAnnouncementStatus, label: Label) => label(statusMeta[status].vi, statusMeta[status].en);

export const titleLimit = 150;
export const messageLimit = 5000;
export const reasonLimit = 500;

/** Lỗi HTTP 409: bản ghi đã đổi (revision cũ), số người nhận thay đổi hoặc đã được xử lý. */
export const isConflict = (error: unknown) => (error as { response?: { status?: number } } | null)?.response?.status === 409;
export const isAborted = (error: unknown) => (error as { code?: string } | null)?.code === "ERR_CANCELED" || (error as { name?: string } | null)?.name === "CanceledError" || (error as { name?: string } | null)?.name === "AbortError";
