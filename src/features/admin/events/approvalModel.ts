import type { ApprovalEventItem } from "@/types";

export interface ApprovalShowtime {
  id?: string;
  name?: string;
  startTime?: string;
  endTime?: string;
  saleStartTime?: string;
  saleEndTime?: string;
}

export type ApprovalEventRecord = ApprovalEventItem & { showtimes?: ApprovalShowtime[] };

export const APPROVAL_STATUSES = ["PENDING", "UPDATE_PENDING", "APPROVED", "REJECTED", "ALL"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  PENDING: "Chờ duyệt mới",
  UPDATE_PENDING: "Cần xem xét cập nhật",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
  ALL: "Tất cả",
};

export const APPROVAL_STATUS_CLASSES: Record<ApprovalStatus, string> = {
  PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  UPDATE_PENDING: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  APPROVED: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300",
  REJECTED: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  ALL: "app-border app-text-main",
};

export function readApprovalStatus(value: string | null): ApprovalStatus {
  return APPROVAL_STATUSES.find((status) => status === value) ?? "PENDING";
}

export function displayApprovalStatus(value?: string) {
  const status = APPROVAL_STATUSES.find((item) => item === value);
  return status
    ? { label: APPROVAL_STATUS_LABELS[status], className: APPROVAL_STATUS_CLASSES[status] }
    : { label: value === "DRAFT" ? "Bản nháp" : value || "Chưa cập nhật", className: "app-border app-text-muted" };
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function timestamp(value?: string): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeApprovalEvents(raw: Record<string, unknown>[]): ApprovalEventRecord[] {
  return raw.flatMap((value) => {
    const id = optionalString(value.id);
    if (!id) return [];
    const organizer = value.organizer && typeof value.organizer === "object"
      ? value.organizer as { name?: unknown }
      : undefined;
    const tickets = Array.isArray(value.tickets)
      ? value.tickets.filter((ticket): ticket is Record<string, unknown> =>
        Boolean(ticket && typeof ticket === "object" && !Array.isArray(ticket)
          && ticket.ticketTypeStatus !== "HIDDEN" && ticket.status !== "HIDDEN"))
      : [];
    const showtimes = Array.isArray(value.showtimes)
      ? value.showtimes.filter((showtime): showtime is ApprovalShowtime => Boolean(showtime && typeof showtime === "object" && !Array.isArray(showtime)))
      : [];
    return [{
      ...value,
      id,
      title: optionalString(value.title) ?? "Sự kiện chưa đặt tên",
      organizerName: optionalString(value.organizerName) ?? optionalString(organizer?.name) ?? optionalString(value.author),
      posterImage: optionalString(value.posterImage) ?? optionalString(value.bannerUrl) ?? optionalString(value.thumbnailUrl),
      bannerUrl: optionalString(value.bannerUrl) ?? optionalString(value.posterImage),
      descriptionText: optionalString(value.descriptionText) ?? optionalString(value.description),
      tickets,
      showtimes,
      galleryImages: Array.isArray(value.galleryImages) ? value.galleryImages.filter((image): image is string => typeof image === "string") : [],
      customQuestions: Array.isArray(value.customQuestions) ? value.customQuestions : [],
    } as ApprovalEventRecord];
  }).sort((a, b) => timestamp(b.createdAt ?? b.submittedAt) - timestamp(a.createdAt ?? a.submittedAt));
}

export function approvalListUrl(search: string): string {
  const params = new URLSearchParams(search);
  params.delete("eventId");
  const query = params.toString();
  return `/admin/events-approval${query ? `?${query}` : ""}`;
}

export function approvalDetailUrl(id: string, search: string): string {
  const params = new URLSearchParams(search);
  params.delete("eventId");
  const query = params.toString();
  return `/admin/events-approval/${encodeURIComponent(id)}${query ? `?${query}` : ""}`;
}
