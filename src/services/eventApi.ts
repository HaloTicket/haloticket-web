import axiosClient from "./axiosClient";
import type { EventApiData } from "@/types";
export type { EventApiData };

export const eventApi = {
  // fetch all events safely
  getAllEvents: async (): Promise<EventApiData[]> => {
    try {
      const response: unknown = await axiosClient.get("/events");
      if (Array.isArray(response)) {
        return (response as Record<string, unknown>[])
          .filter((item) => item != null && typeof item === "object")
          .map((item) => ({
            ...item,
            image: (item.bannerUrl || item.thumbnailUrl || item.posterImage || item.image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80") as string,
          } as EventApiData));
      }
      return [];
    } catch (err) {
      console.warn("Failed to fetch events from backend API:", err);
      return [];
    }
  },

  // fetch event details by id safely
  getEventById: async (id: string): Promise<Record<string, unknown> | null> => {
    try {
      const response = await axiosClient.get(`/events/${id}`) as unknown as Record<string, unknown>;
      if (response && response.id) {
        return {
          ...response,
          id: response.id,
          title: response.title,
          locationName: response.locationName,
          address: response.address || "",
          minPrice: response.minPrice,
          startTime: response.startTime,
          endTime: response.endTime,
          posterImage: response.posterImage || response.bannerUrl || response.thumbnailUrl || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80",
          datesSummary: response.datesSummary,
          extraDaysCount: response.extraDaysCount ?? 0,
          author: response.author || "",
          director: response.director || "",
          cast: response.cast || [],
          descriptionText: response.descriptionText || response.description,
          galleryImages: response.galleryImages || [],
          organizer: response.organizer || null,
          showtimes: response.showtimes || []
        };
      }
      return null;
    } catch (err) {
      console.warn("Failed to fetch event details by id:", err);
      return null;
    }
  },

  // fetch top searched keywords dynamically from backend DB query safely
  getTrendingSearches: async (limit = 3): Promise<string[]> => {
    try {
      const response: unknown = await axiosClient.get(`/events/trending-searches?limit=${limit}`);
      if (Array.isArray(response) && response.length > 0) {
        return (response as unknown[]).filter((k): k is string => typeof k === "string" && k.trim() !== "");
      }
      return ["idecaf", "xoay tròn", "Pickleball World Cup"];
    } catch {
      return ["idecaf", "xoay tròn", "Pickleball World Cup"];
    }
  },

  // log user search query to backend DB for search analytics safely
  logSearchQuery: async (query: string): Promise<void> => {
    if (!query || !query.trim()) return;
    try {
      await axiosClient.post(`/events/search-log?query=${encodeURIComponent(query.trim())}`);
    } catch {
      // silent catch
    }
  },

  // submit new event creation approval request
  createEventApprovalRequest: async (data: Record<string, unknown>): Promise<unknown> => {
    try {
      const response: unknown = await axiosClient.post("/events", data);
      return response;
    } catch (err) {
      console.error("Failed to create/submit event in DB:", err);
      return null;
    }
  },

  // get list approval events
  getApprovalEvents: async (status: string = "ALL"): Promise<Record<string, unknown>[]> => {
    try {
      const url = status && status !== "ALL" ? `/events/approvals?status=${encodeURIComponent(status)}` : "/events/approvals";
      const response: unknown = await axiosClient.get(url);
      if (Array.isArray(response)) {
        return response as Record<string, unknown>[];
      }
      return [];
    } catch (err) {
      console.warn("Failed to fetch approval events from DB API:", err);
      return [];
    }
  },

  approveEvent: async (id: string): Promise<unknown> => {
    try {
      const response: unknown = await axiosClient.patch(`/events/${id}/approve`);
      return response;
    } catch (err) {
      console.error("Failed to approve event in DB:", err);
      return null;
    }
  },

  rejectEvent: async (id: string, reason: string, notes?: string): Promise<unknown> => {
    try {
      const response: unknown = await axiosClient.patch(`/events/${id}/reject`, { reason, notes });
      return response;
    } catch (err) {
      console.error("Failed to reject event in DB:", err);
      return null;
    }
  },
};
