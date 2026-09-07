import axiosClient from "./axiosClient";
import type { EventApiData } from "@/types";

export const eventApi = {
  // fetch all events safely
  getAllEvents: async (): Promise<EventApiData[]> => {
    try {
      const response: any = await axiosClient.get("/events");
      if (Array.isArray(response)) {
        return response
          .filter((item: any) => item != null && typeof item === "object")
          .map((item: any) => ({
            ...item,
            image: item.bannerUrl || item.thumbnailUrl || item.posterImage || item.image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80",
            price: item.minPrice ? `${item.minPrice.toLocaleString("vi-VN")} đ` : "Miễn phí",
            date: item.datesSummary || (item.startTime ? new Date(item.startTime).toLocaleString("vi-VN", { dateStyle: "full", timeStyle: "short" }) : "Sắp diễn ra")
          }));
      }
      return [];
    } catch (err) {
      console.warn("Failed to fetch events from backend API:", err);
      return [];
    }
  },

  // fetch event details by id safely
  getEventById: async (id: string): Promise<any> => {
    try {
      const response: any = await axiosClient.get(`/events/${id}`);
      if (response && response.id) {
        return {
          ...response,
          id: response.id,
          title: response.title,
          locationName: response.locationName || "Địa điểm chưa cập nhật",
          address: response.address || "",
          minPrice: response.minPrice ? `${response.minPrice.toLocaleString("vi-VN")} đ` : "Miễn phí",
          posterImage: response.posterImage || response.bannerUrl || response.thumbnailUrl || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80",
          datesSummary: response.datesSummary || (response.startTime ? new Date(response.startTime).toLocaleString("vi-VN") : "Sắp diễn ra"),
          extraDaysCount: response.extraDaysCount ?? 0,
          author: response.author || "",
          director: response.director || "",
          cast: response.cast || [],
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
      const response: any = await axiosClient.get(`/events/trending-searches?limit=${limit}`);
      if (Array.isArray(response) && response.length > 0) {
        return response.filter((k: any) => typeof k === "string" && k.trim() !== "");
      }
      return ["idecaf", "xoay tròn", "Pickleball World Cup"];
    } catch (err) {
      return ["idecaf", "xoay tròn", "Pickleball World Cup"];
    }
  },

  // log user search query to backend DB for search analytics safely
  logSearchQuery: async (query: string): Promise<void> => {
    if (!query || !query.trim()) return;
    try {
      await axiosClient.post(`/events/search-log?query=${encodeURIComponent(query.trim())}`);
    } catch (err) {
      // silent catch
    }
  },

  // submit new event creation approval request
  createEventApprovalRequest: async (data: any): Promise<any> => {
    try {
      const response: any = await axiosClient.post("/events", data);
      return response;
    } catch (err) {
      console.error("Failed to create/submit event in DB:", err);
      return null;
    }
  },

  // get list approval events
  getApprovalEvents: async (status: string = "ALL"): Promise<any[]> => {
    try {
      const url = status && status !== "ALL" ? `/events/approvals?status=${encodeURIComponent(status)}` : "/events/approvals";
      const response: any = await axiosClient.get(url);
      if (Array.isArray(response)) {
        return response;
      }
      return [];
    } catch (err) {
      console.warn("Failed to fetch approval events from DB API:", err);
      return [];
    }
  },

  approveEvent: async (id: string): Promise<any> => {
    try {
      const response: any = await axiosClient.patch(`/events/${id}/approve`);
      return response;
    } catch (err) {
      console.error("Failed to approve event in DB:", err);
      return null;
    }
  },

  rejectEvent: async (id: string, reason: string, notes?: string): Promise<any> => {
    try {
      const response: any = await axiosClient.patch(`/events/${id}/reject`, { reason, notes });
      return response;
    } catch (err) {
      console.error("Failed to reject event in DB:", err);
      return null;
    }
  },
};
