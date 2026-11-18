import axiosClient from "./axiosClient";
import type { VenueApiData } from "@/types";

export const venueApi = {
  /** Màn hình admin cần phân biệt cơ sở dữ liệu rỗng với yêu cầu bị lỗi, nên hàm này ném lỗi khi phản hồi không hợp lệ. */
  getAdminVenues: async (): Promise<VenueApiData[]> => {
    const response: unknown = await axiosClient.get("/events/venues");
    if (!Array.isArray(response)) throw new Error("Invalid venue response");
    return response as VenueApiData[];
  },
  /** Lấy toàn bộ địa điểm từ backend; trả về mảng rỗng nếu lỗi. */
  getVenues: async (): Promise<VenueApiData[]> => {
    try {
      const response: unknown = await axiosClient.get("/events/venues");
      if (Array.isArray(response)) {
        return response as VenueApiData[];
      }
      return [];
    } catch (err) {
      console.warn("Failed to fetch venues from DB API:", err);
      return [];
    }
  },

  /** Tạo địa điểm mới; trả về `null` nếu lỗi. */
  createVenue: async (data: Partial<VenueApiData>): Promise<VenueApiData | null> => {
    try {
      const response: unknown = await axiosClient.post("/events/venues", data);
      return response as VenueApiData;
    } catch (err) {
      console.error("Failed to create venue in DB:", err);
      return null;
    }
  },

  /** Cập nhật địa điểm; trả về `null` nếu lỗi. */
  updateVenue: async (id: number | string, data: Partial<VenueApiData>): Promise<VenueApiData | null> => {
    try {
      const response: unknown = await axiosClient.put(`/events/venues/${id}`, data);
      return response as VenueApiData;
    } catch (err) {
      console.error("Failed to update venue in DB:", err);
      return null;
    }
  },

  /** Đảo trạng thái xác minh của địa điểm; trả về `null` nếu lỗi. */
  toggleVerifyVenue: async (id: number | string): Promise<VenueApiData | null> => {
    try {
      const response: unknown = await axiosClient.patch(`/events/venues/${id}/verify`);
      return response as VenueApiData;
    } catch (err) {
      console.error("Failed to toggle venue verification in DB:", err);
      return null;
    }
  },

  /** Xóa địa điểm theo id; trả về `true` nếu thành công. */
  deleteVenue: async (id: number | string): Promise<boolean> => {
    try {
      await axiosClient.delete(`/events/venues/${id}`);
      return true;
    } catch (err) {
      console.error("Failed to delete venue from DB:", err);
      return false;
    }
  },

  /** Lấy mọi sơ đồ chỗ ngồi gắn với địa điểm (mẫu của admin và sơ đồ của người tổ chức). */
  getVenueSeatmaps: async (id: number | string): Promise<import("@/types").VenueSeatmapsResponse | null> => {
    try {
      const response: unknown = await axiosClient.get(`/events/venues/${id}/seatmaps`);
      return response as import("@/types").VenueSeatmapsResponse;
    } catch (err) {
      console.warn(`Failed to fetch seatmaps for venue ${id}:`, err);
      return null;
    }
  },

  /** Lưu mẫu sơ đồ chỗ ngồi của admin cho một địa điểm. */
  saveVenueSeatmapTemplate: async (id: number | string, seatmapTemplate: string): Promise<VenueApiData | null> => {
    try {
      const response: unknown = await axiosClient.put(`/events/venues/${id}/seatmap-template`, { seatmapTemplate });
      return response as VenueApiData;
    } catch (err) {
      console.error(`Failed to save seatmap template for venue ${id}:`, err);
      return null;
    }
  },
};
