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

const DEFAULT_RESALE_EVENTS: ResaleEventSummary[] = [
  {
    eventId: "EVT-123",
    eventName: "The Eras Tour - Hanoi",
    activeListings: 12,
    minPrice: 1200000,
  },
  {
    eventId: "EVT-456",
    eventName: "Rap Viet All-Star Live Concert",
    activeListings: 8,
    minPrice: 650000,
  },
  {
    eventId: "EVT-789",
    eventName: "Monsoon Music Festival 2026",
    activeListings: 15,
    minPrice: 450000,
  },
];

const DEFAULT_EVENT_LISTINGS: Record<string, TicketListing[]> = {
  "EVT-123": [
    {
      id: "LST-001",
      ticketId: "TCK-1001",
      eventId: "EVT-123",
      ticketTypeName: "Vé VIP Khu A",
      seat: "A-12",
      originalPrice: 2500000,
      price: 2800000,
      status: "ACTIVE",
      publishedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: "LST-002",
      ticketId: "TCK-1002",
      eventId: "EVT-123",
      ticketTypeName: "Vé Phổ Thông Đứng (GA)",
      seat: "GA-Zone1",
      originalPrice: 1200000,
      price: 1350000,
      status: "ACTIVE",
      publishedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: "LST-003",
      ticketId: "TCK-1003",
      eventId: "EVT-123",
      ticketTypeName: "Vé Khán Đài B",
      seat: "B-44",
      originalPrice: 1800000,
      price: 2000000,
      status: "ACTIVE",
      publishedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
  ],
  "EVT-456": [
    {
      id: "LST-004",
      ticketId: "TCK-2001",
      eventId: "EVT-456",
      ticketTypeName: "Vé MoshPit VIP",
      seat: "VIP-08",
      originalPrice: 1200000,
      price: 1400000,
      status: "ACTIVE",
      publishedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: "LST-005",
      ticketId: "TCK-2002",
      eventId: "EVT-456",
      ticketTypeName: "Vé Standard Khán Đài",
      seat: "S-102",
      originalPrice: 650000,
      price: 700000,
      status: "ACTIVE",
      publishedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    },
  ],
};

export const marketplaceApi = {
  getResaleEvents: async (): Promise<ResaleEventSummary[]> => {
    try {
      const data = await axiosClient.get<unknown, ResaleEventSummary[]>("/marketplace/events");
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (e) {
      console.warn("Using sample resale events for UI testing:", e);
    }
    return DEFAULT_RESALE_EVENTS;
  },

  getEventListings: async (eventId: string, page = 0, size = 20): Promise<MarketplacePage<TicketListing>> => {
    try {
      const data = await axiosClient.get<unknown, MarketplacePage<TicketListing>>(
        `/marketplace/events/${encodeURIComponent(eventId)}/listings?page=${page}&size=${size}`,
      );
      if (data && Array.isArray(data.content) && data.content.length > 0) return data;
    } catch (e) {
      console.warn("Using sample event listings for UI testing:", e);
    }
    const listings = DEFAULT_EVENT_LISTINGS[eventId] || DEFAULT_EVENT_LISTINGS["EVT-123"];
    return {
      content: listings,
      totalElements: listings.length,
      totalPages: 1,
      number: page,
      size,
    };
  },

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
    axiosClient.post<unknown, MarketplaceSagaResponse>(`/marketplace/gifts/${encodeURIComponent(sagaId)}/accept`, null, { params: token ? { token } : {} }),

  getGiftInvitation: (sagaId: string, token?: string) =>
    axiosClient.get<unknown, {
      ticketId: string; eventId: string; ticketTypeName: string;
      section: string; row: string; seat: string; message: string;
      recipientEmail: string; expiresAt: string; state: string;
      senderUserId?: string; senderName?: string;
      ticketIds?: string[]; quantity?: number; tickets?: TransferTicketSnapshot[];
    }>(
      `/marketplace/gifts/${encodeURIComponent(sagaId)}/invitation`, { params: token ? { token } : {} },
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
