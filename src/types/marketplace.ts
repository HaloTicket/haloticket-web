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
  sellerId: string;
  eventId?: string | null;
  price: number;
  originalPrice?: number | null;
  minPriceSnapshot?: number | null;
  maxPriceSnapshot?: number | null;
  status: "ACTIVE" | "SOLD" | "CANCELLED" | "EXPIRED";
  expiresAt?: string | null;
  publishedAt?: string | null;
}

export interface GiftTicketRequest {
  ticketId: string;
  recipientEmail: string;
  message?: string;
}

export interface MarketplacePage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
