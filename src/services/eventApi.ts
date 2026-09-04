import axiosClient from "./axiosClient";
import { SPECIAL_EVENTS, MOCK_EVENT_DETAIL } from "@/mock/eventData";

export interface EventApiData {
  id: string;
  title: string;
  description?: string;
  bannerUrl?: string;
  thumbnailUrl?: string;
  locationName?: string;
  address?: string;
  eventStatus?: string;
  startTime?: string;
  endTime?: string;
  categoryName?: string;
  minPrice?: string;
  price?: string;
  image?: string;
  date?: string;
}

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
          descriptionText: response.descriptionText || response.description || "Chưa có mô tả.",
          galleryImages: response.galleryImages || [],
          organizer: response.organizer || null,
          showtimes: response.showtimes || []
        };
      }
      return null;
    } catch (err) {
      console.warn("Failed to fetch event detail from backend API:", err);
      return null;
    }
  },

  // fetch categories safely
  getCategories: async (): Promise<any[]> => {
    try {
      const response: any = await axiosClient.get("/events/categories");
      if (Array.isArray(response) && response.length > 0) {
        return response.filter((cat: any) => cat != null && typeof cat === "object");
      }
      return [];
    } catch (err) {
      return [];
    }
  },

  // fetch top 3 searched keywords dynamically from backend DB query safely
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
      console.warn("Backend API unavailable, using local simulation", err);
      return { success: true, id: `EV_${Date.now()}` };
    }
  },

  // fetch organizer profile for pre-filling
  getOrganizerProfile: async (): Promise<any> => {
    try {
      const response: any = await axiosClient.get("/events/organizer-profile");
      return response;
    } catch (err) {
      return null;
    }
  }
};
