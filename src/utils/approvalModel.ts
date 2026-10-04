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

export const APPROVAL_STATUSES = ["ALL", "PENDING", "UPDATE_PENDING", "APPROVED", "REJECTED"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];
export type ApprovalSort = "newest" | "oldest" | "title";

export interface ApprovalFilters {
  status: ApprovalStatus;
  query: string;
  category: string;
  sort: ApprovalSort;
  from: string;
  to: string;
}

export function readApprovalSort(value: string | null): ApprovalSort {
  return value === "oldest" || value === "title" ? value : "newest";
}

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  ALL: "Tất cả",
  PENDING: "Chờ duyệt",
  UPDATE_PENDING: "Cập nhật",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
};

export const APPROVAL_STATUS_CLASSES: Record<ApprovalStatus, string> = {
  ALL: "app-border app-text-main",
  PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  UPDATE_PENDING: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  APPROVED: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300",
  REJECTED: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};

export function readApprovalStatus(value: string | null): ApprovalStatus {
  return APPROVAL_STATUSES.find((status) => status === value) ?? "ALL";
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

function validDatePart(value?: string): string | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return undefined;
  const [, year, month, day] = match;
  const calendarDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (calendarDate.toISOString().slice(0, 10) !== `${year}-${month}-${day}`) return undefined;
  return `${year}-${month}-${day}`;
}

function submittedDate(event: ApprovalEventItem): string | undefined {
  return validDatePart(event.submittedAt) ?? validDatePart(event.createdAt);
}

function submittedTimestamp(event: ApprovalEventItem): number | undefined {
  const value = validDatePart(event.submittedAt) ? event.submittedAt : event.createdAt;
  if (!validDatePart(value)) return undefined;
  return Date.parse(value!);
}

export function filterApprovalEvents<T extends ApprovalEventItem>(events: T[], filters: ApprovalFilters): T[] {
  const phrase = filters.query.trim().toLocaleLowerCase();
  const matching = events.filter((event) => {
    if (filters.status !== "ALL" && event.eventApprovalStatus !== filters.status) return false;
    if (filters.category && event.categoryName !== filters.category) return false;
    if (phrase && !`${event.title} ${event.id} ${event.organizerName ?? ""}`.toLocaleLowerCase().includes(phrase)) return false;
    if (filters.from || filters.to) {
      const date = submittedDate(event);
      if (!date || (filters.from && date < filters.from) || (filters.to && date > filters.to)) return false;
    }
    return true;
  });
  return matching.sort((a, b) => {
    if (filters.sort === "title") return a.title.localeCompare(b.title, "vi") || a.id.localeCompare(b.id);
    const first = submittedTimestamp(a);
    const second = submittedTimestamp(b);
    if (first === undefined) return second === undefined ? 0 : 1;
    if (second === undefined) return -1;
    return filters.sort === "oldest" ? first - second : second - first;
  });
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
