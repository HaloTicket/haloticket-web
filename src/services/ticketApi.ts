import axiosClient from "./axiosClient";
import type {
  TicketTypeApiRequest,
  TicketTypeApiResponse,
  SeatLayoutApiRequest,
  SeatLayoutApiResponse,
  OwnedTicketApiResponse,
} from "@/types";

export const ticketApi = {
  getMyTickets: async (): Promise<OwnedTicketApiResponse[]> => {
    const response = await axiosClient.get("/tickets/mine");
    // handle both old array format and new Page format
    if (Array.isArray(response)) {
      return response as OwnedTicketApiResponse[];
    } else if (response && Array.isArray((response as any).content)) {
      return (response as any).content as OwnedTicketApiResponse[];
    }
    return [];
  },

  getMyTicket: async (ticketId: string): Promise<OwnedTicketApiResponse> => {
    return axiosClient.get<unknown, OwnedTicketApiResponse>(`/tickets/${encodeURIComponent(ticketId)}`);
  },

  // get ticket types for an event
  getTicketTypesByEventId: async (eventId: string): Promise<TicketTypeApiResponse[]> => {
    try {
      const response: unknown = await axiosClient.get(`/tickets/types/event/${eventId}`);
      if (Array.isArray(response)) {
        return response as TicketTypeApiResponse[];
      }
      return [];
    } catch (err) {
      console.warn("Failed to fetch ticket types for event:", err);
      return [];
    }
  },

  // get ticket types for a showtime
  getTicketTypesByShowtimeId: async (showtimeId: string): Promise<TicketTypeApiResponse[]> => {
    try {
      const response: unknown = await axiosClient.get(`/tickets/types/showtime/${showtimeId}`);
      if (Array.isArray(response)) {
        return response as TicketTypeApiResponse[];
      }
      return [];
    } catch (err) {
      console.warn("Failed to fetch ticket types for showtime:", err);
      return [];
    }
  },

  // sync/save ticket types for an event
  syncTicketTypesForEvent: async (eventId: string, requests: TicketTypeApiRequest[]): Promise<TicketTypeApiResponse[]> => {
    try {
      const response: unknown = await axiosClient.post(`/tickets/types/sync/${eventId}`, requests);
      if (Array.isArray(response)) {
        return response as TicketTypeApiResponse[];
      }
      return [];
    } catch (err) {
      console.error("Failed to sync ticket types:", err);
      return [];
    }
  },

  // get seat layout for an event
  getSeatLayoutByEventId: async (eventId: string): Promise<SeatLayoutApiResponse | null> => {
    try {
      const response: unknown = await axiosClient.get(`/tickets/seat-layouts/event/${eventId}`);
      if (response && typeof response === "object") {
        return response as SeatLayoutApiResponse;
      }
      return null;
    } catch (err) {
      console.warn("Failed to fetch seat layout for event:", err);
      return null;
    }
  },

  // save seat layout draft
  saveSeatLayoutDraft: async (eventId: string, data: SeatLayoutApiRequest): Promise<SeatLayoutApiResponse | null> => {
    try {
      const response: unknown = await axiosClient.put(`/tickets/seat-layouts/event/${eventId}/draft`, data);
      if (response && typeof response === "object") {
        return response as SeatLayoutApiResponse;
      }
      return null;
    } catch (err) {
      console.error("Failed to save seat layout draft:", err);
      throw err;
    }
  },

  // publish seat layout
  publishSeatLayout: async (eventId: string, data: SeatLayoutApiRequest): Promise<SeatLayoutApiResponse | null> => {
    try {
      const response: unknown = await axiosClient.post(`/tickets/seat-layouts/event/${eventId}/publish`, data);
      if (response && typeof response === "object") {
        return response as SeatLayoutApiResponse;
      }
      return null;
    } catch (err) {
      console.error("Failed to publish seat layout:", err);
      throw err;
    }
  },

  // get realtime seat status map
  getSeatStatus: async (eventId: string, showtimeId?: string): Promise<Record<string, string>> => {
    try {
      const url = showtimeId ? `/tickets/seat-status?eventId=${eventId}&showtimeId=${showtimeId}` : `/tickets/seat-status?eventId=${eventId}`;
      const response: unknown = await axiosClient.get(url);
      if (response && typeof response === "object") {
        return response as Record<string, string>;
      }
      return {};
    } catch (err) {
      console.warn("Failed to fetch seat status:", err);
      return {};
    }
  },
};
