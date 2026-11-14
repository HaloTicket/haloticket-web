// Shapes the ticket service answers for the door: GET /tickets/checkin/events/{id}/summary, /page and /search.

export interface CheckinSummaryGroup {
  /** showtime id or ticket type id; null for tickets that belong to no showtime */
  id: string | null;
  /** the ticket type name; null for a showtime group (the page knows the showtime names) */
  name: string | null;
  total: number;
  checkedIn: number;
}

export interface CheckinSummary {
  eventId: string;
  total: number;
  checkedIn: number;
  byShowtime: CheckinSummaryGroup[];
  byTicketType: CheckinSummaryGroup[];
  generatedAt?: string;
}

export interface CheckinRow {
  checkinId?: string;
  ticketId?: string;
  qrCodeHash?: string;
  ticketTypeName?: string;
  seatName?: string;
  showtimeId?: string;
  checkedInAt: string;
  ticketKind?: "SEATED" | "STANDING" | "GENERAL" | string;
  zone?: string | null;
  row?: string | null;
  seat?: string | null;
}

export interface CheckinPage {
  content: CheckinRow[];
  /** 0-based */
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface CheckinLookupItem {
  ticketId: string;
  shortCode: string;
  bookingId?: string | null;
  /** the owner is masked by the server (first characters only) */
  ownerMasked?: string | null;
  ticketTypeName?: string | null;
  seatName?: string | null;
  ticketKind?: string | null;
  zone?: string | null;
  row?: string | null;
  seat?: string | null;
  showtimeId?: string | null;
  ticketStatus: string;
  checkedIn: boolean;
  checkedInAt?: string | null;
  /** only for a ticket that can still enter, and only when the caller may scan */
  qrCodeHash?: string | null;
}
