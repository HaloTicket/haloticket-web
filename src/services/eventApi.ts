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
  // fetch all events
  getAllEvents: async (): Promise<EventApiData[]> => {
    try {
      const response: any = await axiosClient.get("/events");
      if (Array.isArray(response) && response.length > 0) {
        return response.map((item: any) => ({
          ...item,
          image: item.bannerUrl || item.thumbnailUrl || item.image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80",
          price: item.minPrice ? `${item.minPrice.toLocaleString("vi-VN")} đ` : "250.000đ",
          date: item.startTime ? new Date(item.startTime).toLocaleDateString("vi-VN") : "25 tháng 09, 2026"
        }));
      }
      return SPECIAL_EVENTS as any;
    } catch (err) {
      console.warn("Backend API unavailable, using fallback mock events data:", err);
      return SPECIAL_EVENTS as any;
    }
  },

  // fetch event details by id
  getEventById: async (id: string): Promise<any> => {
    try {
      const response: any = await axiosClient.get(`/events/${id}`);
      if (response && response.id) {
        return {
          id: response.id,
          title: response.title,
          locationName: response.locationName || MOCK_EVENT_DETAIL.locationName,
          address: response.address || MOCK_EVENT_DETAIL.address,
          minPrice: response.minPrice ? `${response.minPrice.toLocaleString("vi-VN")} đ` : MOCK_EVENT_DETAIL.minPrice,
          posterImage: response.posterImage || response.bannerUrl || response.thumbnailUrl || MOCK_EVENT_DETAIL.posterImage,
          datesSummary: response.datesSummary || MOCK_EVENT_DETAIL.datesSummary,
          extraDaysCount: response.extraDaysCount ?? MOCK_EVENT_DETAIL.extraDaysCount,
          author: response.author || MOCK_EVENT_DETAIL.author,
          director: response.director || MOCK_EVENT_DETAIL.director,
          cast: (response.cast && response.cast.length > 0) ? response.cast : MOCK_EVENT_DETAIL.cast,
          descriptionText: response.descriptionText || response.description || MOCK_EVENT_DETAIL.descriptionText,
          galleryImages: (response.galleryImages && response.galleryImages.length > 0) ? response.galleryImages : MOCK_EVENT_DETAIL.galleryImages,
          organizer: response.organizer || MOCK_EVENT_DETAIL.organizer,
          showtimes: MOCK_EVENT_DETAIL.showtimes
        };
      }
      return MOCK_EVENT_DETAIL;
    } catch (err) {
      console.warn("Backend API unavailable, using fallback mock event detail:", err);
      return MOCK_EVENT_DETAIL;
    }
  },

  // fetch categories
  getCategories: async (): Promise<any[]> => {
    try {
      const response: any = await axiosClient.get("/events/categories");
      if (Array.isArray(response) && response.length > 0) {
        return response;
      }
      return [];
    } catch (err) {
      return [];
    }
  }
};
