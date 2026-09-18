import axiosClient from "./axiosClient";
import type {
  GiftTicketRequest,
  MarketplacePage,
  MarketplaceSagaResponse,
  ResaleEventSummary,
  ResaleReservation,
  ResalePaymentInitiation,
  ResaleEligibility,
  TicketListing,
} from "@/types/marketplace";

const newIdempotencyKey = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const marketplaceApi = {
  getResaleEvents: () =>
    axiosClient.get<unknown, ResaleEventSummary[]>("/marketplace/events"),

  getEventListings: (eventId: string, page = 0, size = 20) =>
    axiosClient.get<unknown, MarketplacePage<TicketListing>>(
      `/marketplace/events/${encodeURIComponent(eventId)}/listings?page=${page}&size=${size}`,
    ),

  getListing: (listingId: string) =>
    axiosClient.get<unknown, TicketListing>(`/marketplace/listings/${encodeURIComponent(listingId)}`),

  reserveListing: (listingId: string, idempotencyKey = newIdempotencyKey()) =>
    axiosClient.post<unknown, ResaleReservation>(
      `/marketplace/listings/${encodeURIComponent(listingId)}/reserve`,
      null,
      { headers: { "Idempotency-Key": idempotencyKey } },
    ),

  startResalePayment: (transactionId: string) =>
    axiosClient.post<unknown, ResalePaymentInitiation>(
      `/marketplace/transactions/${encodeURIComponent(transactionId)}/payment`,
    ),

  getResaleEligibility: (ticketId: string) =>
    axiosClient.get<unknown, ResaleEligibility>(`/marketplace/tickets/${encodeURIComponent(ticketId)}/resale-eligibility`),

  createResaleListing: (request: { ticketId: string; price: number; policyVersion?: number; termsVersion?: string; allowRetail?: boolean }, idempotencyKey = newIdempotencyKey()) =>
    axiosClient.post<unknown, MarketplaceSagaResponse>("/marketplace/listings", request, { headers: { "Idempotency-Key": idempotencyKey } }),

  getSaga: (sagaId: string) =>
    axiosClient.get<unknown, MarketplaceSagaResponse>(`/marketplace/sagas/${encodeURIComponent(sagaId)}`),

  getPublicListings: (page = 0, size = 20) =>
    axiosClient.get<unknown, MarketplacePage<TicketListing>>(`/marketplace/listings?page=${page}&size=${size}`),

  createGift: (request: GiftTicketRequest, idempotencyKey = newIdempotencyKey()) =>
    axiosClient.post<unknown, MarketplaceSagaResponse>("/marketplace/gifts", request, { headers: { "Idempotency-Key": idempotencyKey } }),

  acceptGift: (sagaId: string, token: string) =>
    axiosClient.post<unknown, MarketplaceSagaResponse>(`/marketplace/gifts/${encodeURIComponent(sagaId)}/accept`, null, { params: { token } }),
};
