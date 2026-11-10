import axiosClient from "@/services/axiosClient";

// a count is null when its source could not be read: show "unknown", never 0
export interface ReconciliationSummary {
  openExceptions: number | null;
  paidWithoutTickets: number | null;
  stockDiscrepancies: number | null;
}

// who paid, how, and for which event. Every field can be missing: the screen shows a dash.
export interface ReconciliationContext {
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  paymentMethod?: string | null;
  eventId?: string | null;
  eventTitle?: string | null;
}

export interface PaymentExceptionItem extends ReconciliationContext {
  id: string;
  bookingId?: string | null;
  bookingCode?: string | null;
  paymentId?: string | null;
  kind: string;
  amount?: number | null;
  provider?: string | null;
  status: string;
  detail?: string | null;
  createdAt?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolutionNote?: string | null;
}

export interface PaymentExceptionPage { items: PaymentExceptionItem[]; total: number; page: number; size: number }

export interface PaidWithoutTicketsItem extends ReconciliationContext {
  bookingId: string;
  bookingCode?: string | null;
  paidAt?: string | null;
  amount?: number | null;
  expectedTickets: number;
  issuedTickets: number;
  minutesSincePaid: number;
}

export interface StockDiscrepancyItem {
  ticketTypeId: string;
  eventId?: string | null;
  showtimeId?: string | null;
  name?: string | null;
  initial?: number | null;
  remaining?: number | null;
  held?: number | null;
  issued?: number | null;
  heldByReservations?: number | null;
  diffStockVsIssued?: number | null;
  diffHeldVsReservations?: number | null;
  note?: string | null;
  eventTitle?: string | null;
}

export const RECONCILIATION_SOURCE_UNAVAILABLE = "RECONCILIATION_SOURCE_UNAVAILABLE";

const base = "/bookings/admin/reconciliation";

export const adminReconciliationApi = {
  getSummary: (signal?: AbortSignal) =>
    axiosClient.get<ReconciliationSummary>(`${base}/summary`, { signal }) as unknown as Promise<ReconciliationSummary>,
  getExceptions: (params: { status: string; page: number; size: number }, signal?: AbortSignal) =>
    axiosClient.get<PaymentExceptionPage>(`${base}/exceptions`, { params, signal }) as unknown as Promise<PaymentExceptionPage>,
  resolveException: (id: string, body: { note: string; refundedManually: boolean }) =>
    axiosClient.post(`${base}/exceptions/${encodeURIComponent(id)}/resolve`, body) as unknown as Promise<PaymentExceptionItem>,
  getPaidWithoutTickets: (signal?: AbortSignal) =>
    axiosClient.get<{ items: PaidWithoutTicketsItem[]; total: number }>(`${base}/paid-without-tickets`, { signal }) as unknown as Promise<{ items: PaidWithoutTicketsItem[]; total: number }>,
  /** Sends BOOKING_CONFIRMED again for a PAID order. Issuance is idempotent, so a second run never makes duplicate tickets. */
  republishConfirmed: (bookingId: string) =>
    axiosClient.post(`/bookings/admin/${encodeURIComponent(bookingId)}/republish-confirmed`, null, { params: { dryRun: false } }) as unknown as Promise<{ message?: string }>,
  getStockDiscrepancies: (signal?: AbortSignal) =>
    axiosClient.get<{ items: StockDiscrepancyItem[] }>(`${base}/stock-discrepancies`, { signal }) as unknown as Promise<{ items: StockDiscrepancyItem[] }>,
};

/** True when the server said one of the sources behind the screen could not be read. */
export function isSourceUnavailable(err: unknown): boolean {
  const data = (err as { response?: { data?: { code?: unknown; message?: unknown } } } | null)?.response?.data;
  return data?.code === RECONCILIATION_SOURCE_UNAVAILABLE || data?.message === RECONCILIATION_SOURCE_UNAVAILABLE;
}
