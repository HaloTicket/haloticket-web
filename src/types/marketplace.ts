export type MarketplaceSagaState =
  | "WAITING_LOCK"
  | "WAITING_RECIPIENT"
  | "WAITING_TRANSFER"
  | "COMPLETED"
  | "FAILED"
  | "COMPENSATING"
  | "COMPENSATED";

export interface ResaleEligibility {
  ticketId: string;
  eventId: string;
  eligible: boolean;
  reasonCode?: string | null;
  originalPrice?: number | null;
  serviceFeePercent?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  policyVersion?: number | null;
  closesAt?: string | null;
  termsVersion?: string | null;
}

export interface MarketplaceSagaResponse {
  sagaId: string;
  state: MarketplaceSagaState;
  businessId?: string | null;
  lastError?: string | null;
}

export interface TicketListing {
  id: string;
  ticketId: string;
  ticketIds?: string[];
  tickets?: TransferTicketSnapshot[];
  ticketCode?: string | null;
  ownedByCurrentUser?: boolean;
  eventId?: string | null;
  ticketTypeName?: string | null;
  section?: string | null;
  row?: string | null;
  seat?: string | null;
  price: number;
  originalPrice?: number | null;
  minPriceSnapshot?: number | null;
  maxPriceSnapshot?: number | null;
  quantity?: number | null;
  allowRetail?: boolean | null;
  status: "ACTIVE" | "RESERVED" | "SOLD" | "CANCELLED" | "EXPIRED" | "PAUSED_BY_EVENT";
  pauseReason?: string | null;
  expiresAt?: string | null;
  publishedAt?: string | null;
}

export interface ResaleEventSummary {
  eventId: string;
  eventName?: string;
  activeListings: number;
  minPrice: number;
}

export interface ResaleReservation {
  quantity?: number;
  ticketIds?: string[];
  transactionId: string;
  listingId: string;
  status: "PENDING_PAYMENT";
  amount: number;
  currency: string;
  reservationExpiresAt: string;
}

export interface ResalePaymentInitiation {
  transactionId: string;
  amount: number;
  currency: string;
  expiresAt: string;
}

export interface ResalePurchaseStatus {
  transactionId: string;
  status: "PENDING_PAYMENT" | "PAYMENT_PROCESSING" | "TRANSFERRING" | "COMPLETED" | "REFUND_PENDING" | "REFUNDED" | "CANCELLED" | "EXPIRED";
  sagaId?: string | null;
}

export interface GiftTicketRequest {
  ticketId?: string;
  ticketIds?: string[];
  recipientEmail: string;
  message?: string;
  acceptedTerms: boolean;
}

export interface TransferTicketSnapshot {
  ticketId: string;
  ticketTypeId?: string | null;
  showtimeId?: string | null;
  ticketTypeName?: string | null;
  section?: string | null;
  row?: string | null;
  seat?: string | null;
  price?: number;
  originalPrice?: number;
}

export interface MarketplacePage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
