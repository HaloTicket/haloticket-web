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

  // update existing event details in DB
  updateEvent: async (id: string, data: Record<string, unknown>): Promise<unknown> => {
    try {
      const response: unknown = await axiosClient.put(`/events/${id}`, data);
      return response;
    } catch (err) {
      console.error("Failed to update event in DB:", err);
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

  // Member Management APIs
  getEventMembers: async (eventId: string): Promise<any[]> => {
    try {
      const response = await axiosClient.get(`/events/${eventId}/members`);
      return Array.isArray(response) ? response : [];
    } catch (err) {
      console.error("Failed to get event members:", err);
      return [];
    }
  },

  inviteEventMember: async (eventId: string, email: string, role: string): Promise<any> => {
    try {
      const response = await axiosClient.post(`/events/${eventId}/members`, { email, role });
      return response;
    } catch (err) {
      console.error("Failed to invite event member:", err);
      throw err;
    }
  },

  changeEventMemberRole: async (eventId: string, assignmentId: string, newRole: string): Promise<any> => {
    try {
      const response = await axiosClient.put(`/events/${eventId}/members/${assignmentId}/role?newRole=${newRole}`);
      return response;
    } catch (err) {
      console.error("Failed to change event member role:", err);
      throw err;
    }
  },

  changeEventMemberStatus: async (eventId: string, assignmentId: string, newStatus: string): Promise<any> => {
    try {
      const response = await axiosClient.put(`/events/${eventId}/members/${assignmentId}/status?newStatus=${newStatus}`);
      return response;
    } catch (err) {
      console.error("Failed to change event member status:", err);
      throw err;
    }
  },

  removeEventMember: async (eventId: string, assignmentId: string): Promise<void> => {
    try {
      await axiosClient.delete(`/events/${eventId}/members/${assignmentId}`);
    } catch (err) {
      console.error("Failed to remove event member:", err);
      throw err;
    }
  },

  transferOwner: async (eventId: string, assignmentId: string): Promise<void> => {
    try {
      await axiosClient.post(`/events/${eventId}/members/${assignmentId}/transfer-owner`);
    } catch (err) {
      console.error("Failed to transfer owner:", err);
      throw err;
    }
  },

  getMyRoleInEvent: async (eventId: string): Promise<string | null> => {
    try {
      const response = await axiosClient.get(`/events/${eventId}/members/my-role`);
      return (typeof response === "string") ? response : null;
    } catch (err) {
      console.error("Failed to get my role in event:", err);
      return null;
    }
  },

  getEventAnalytics: async (eventId: string, timeRange: "24h" | "30d" = "30d"): Promise<any> => {
    try {
      const response = await axiosClient.get(`/events/${eventId}/analytics`, {
        params: { timeRange }
      });
      return response;
    } catch (err) {
      console.error("Failed to get event analytics:", err);
      throw err;
    }
  },

  logEventView: async (eventId: string): Promise<void> => {
    try {
      let sessionId = localStorage.getItem("halo_session_id");
      if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2, 15);
        localStorage.setItem("halo_session_id", sessionId);
      }
      
      const userStr = localStorage.getItem("user");
      let userId = null;
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          userId = user.id;
        } catch (e) { }
      }

      await axiosClient.post(`/events/${eventId}/view`, { sessionId, userId });
    } catch (err) {
      console.error("Failed to log event view:", err);
    }
  },

  getEventBookings: async (eventId: string, search: string = "", showtimeId: string = "", page: number = 0, size: number = 20): Promise<any> => {
    try {
      const response = await axiosClient.get(`/bookings/events/${eventId}/organizer`, {
        params: { search, showtimeId, page, size }
      });
      return response;
    } catch (err) {
      console.error("Failed to get event bookings:", err);
      throw err;
    }
  }
};
