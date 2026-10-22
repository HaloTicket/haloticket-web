import axiosClient from "./axiosClient";
import type {
  GiftTicketRequest,
  MarketplacePage,
  MarketplaceSagaResponse,
  ResaleEventSummary,
  ResaleReservation,
  ResalePaymentInitiation, ResalePurchaseStatus,
  ResaleEligibility,
  TicketListing,
  TransferTicketSnapshot,
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

  reserveListing: (listingId: string, idempotencyKey = newIdempotencyKey(), ticketIds?: string[]) =>
    axiosClient.post<unknown, ResaleReservation>(
      `/marketplace/listings/${encodeURIComponent(listingId)}/reserve`,
      ticketIds ? { ticketIds } : null,
      { headers: { "Idempotency-Key": idempotencyKey } },
    ),

  cancelReservation: (listingId: string) =>
    axiosClient.post<unknown, void>(
      `/marketplace/listings/${encodeURIComponent(listingId)}/cancel-reservation`,
    ),

  startResalePayment: (transactionId: string) =>
    axiosClient.post<unknown, ResalePaymentInitiation>(
      `/marketplace/transactions/${encodeURIComponent(transactionId)}/payment`,
    ),

  getResalePurchaseStatus: (transactionId: string) =>
    axiosClient.get<unknown, ResalePurchaseStatus>(
      `/marketplace/transactions/${encodeURIComponent(transactionId)}`,
    ),

  getResaleEligibility: (ticketId: string) =>
    axiosClient.get<unknown, ResaleEligibility>(`/marketplace/tickets/${encodeURIComponent(ticketId)}/resale-eligibility`),

  createResaleListing: (request: { ticketId?: string; ticketIds?: string[]; price: number; policyVersion?: number; termsVersion?: string; allowRetail?: boolean }, idempotencyKey = newIdempotencyKey()) =>
    axiosClient.post<unknown, MarketplaceSagaResponse>("/marketplace/listings", request, { headers: { "Idempotency-Key": idempotencyKey } }),

  getSaga: (sagaId: string) =>
    axiosClient.get<unknown, MarketplaceSagaResponse>(`/marketplace/sagas/${encodeURIComponent(sagaId)}`),

  getPublicListings: (page = 0, size = 20) =>
    axiosClient.get<unknown, MarketplacePage<TicketListing>>(`/marketplace/listings?page=${page}&size=${size}`),

  createGift: (request: GiftTicketRequest, idempotencyKey = newIdempotencyKey()) =>
    axiosClient.post<unknown, MarketplaceSagaResponse>("/marketplace/gifts", request, { headers: { "Idempotency-Key": idempotencyKey } }),

  acceptGift: (sagaId: string, token?: string) =>
    axiosClient.post<unknown, MarketplaceSagaResponse>(`/marketplace/gifts/${encodeURIComponent(sagaId)}/accept`, null, { params: { token: token ?? "" } }),

  cancelGift: (sagaId: string) =>
    axiosClient.post<unknown, MarketplaceSagaResponse>(`/marketplace/gifts/${encodeURIComponent(sagaId)}/cancel`),

  declineGift: (sagaId: string) =>
    axiosClient.post<unknown, MarketplaceSagaResponse>(`/marketplace/gifts/${encodeURIComponent(sagaId)}/decline`),

  getActiveGiftByTicket: (ticketId: string) =>
    axiosClient.get<unknown, { sagaId: string; ticketId: string; status: string; recipientEmail: string; expiresAt: string }>(
      `/marketplace/gifts/by-ticket/${encodeURIComponent(ticketId)}`
    ),

  getGiftInvitation: (sagaId: string, token?: string) =>
    axiosClient.get<unknown, {
      ticketId: string; eventId: string; ticketTypeName: string;
      section: string; row: string; seat: string; message: string;
      recipientEmail: string; expiresAt: string; state: string;
      requireEkyc?: boolean; maxGiftCount?: number;
      senderUserId?: string; senderName?: string;
      ticketIds?: string[]; quantity?: number; tickets?: TransferTicketSnapshot[];
    }>(
      `/marketplace/gifts/${encodeURIComponent(sagaId)}/invitation`, { params: { token: token ?? "" } },
    ),

  getMyGiftInvitations: () =>
    axiosClient.get<unknown, Array<{
      sagaId: string; eventId: string; ticketTypeName: string;
      section?: string; row?: string; seat?: string;
      expiresAt: string; senderName?: string;
      ticketIds?: string[]; quantity?: number; tickets?: TransferTicketSnapshot[];
    }>>(
      "/marketplace/gifts/mine",
    ),

  getMyListings: (page = 0, size = 50) =>
    axiosClient.get<unknown, MarketplacePage<TicketListing>>(`/marketplace/listings/me?page=${page}&size=${size}`),

  cancelListing: (listingId: string) =>
    axiosClient.post<unknown, MarketplaceSagaResponse>(`/marketplace/listings/${encodeURIComponent(listingId)}/cancel`),
};
