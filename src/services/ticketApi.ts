import axiosClient from "./axiosClient";
import type {
  TicketTypeApiRequest,
  TicketTypeApiResponse,
  SeatLayoutApiRequest,
  SeatLayoutApiResponse,
} from "@/types";

export const ticketApi = {
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
};
