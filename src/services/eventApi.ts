import axiosClient from "./axiosClient";
import type { AnalyticsRange, EventAnalyticsQuery } from "@/types/eventAnalytics";
import { describeDevice } from "@/utils/deviceInfo";
import type { CheckinLookupItem, CheckinPage, CheckinSummary } from "@/types/checkin";
import type { VoucherItem } from "@/types/voucher";
import type { EventApiData, MemberItem, MemberInvitationPreview, MemberInvitationAcceptResult } from "@/types";
import { parseEventSaveFailure } from "@/utils/eventSaveErrors";
export type { EventApiData };

export const eventApi = {
  // fetch all events safely
  getAllEvents: async (): Promise<EventApiData[]> => {
    try {
      const response: unknown = await axiosClient.get("/events");
      if (Array.isArray(response)) {
        const now = new Date();
        const parseDate = (val: any) => {
          if (!val) return null;
          if (Array.isArray(val)) {
            return new Date(val[0], val[1] - 1, val[2], val[3] || 0, val[4] || 0);
          }
          return new Date(val);
        };
        
        return (response as Record<string, unknown>[])
          .filter((item) => item != null && typeof item === "object")
          .map((item) => ({
            ...item,
            image: (item.bannerUrl || item.thumbnailUrl || item.posterImage || item.image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80") as string,
          } as EventApiData))
          .filter(item => {
            const saleEnd = parseDate(item.saleEndTime);
            if (saleEnd) return saleEnd > now;
            
            const end = parseDate(item.endTime);
            if (end) return end > now;
            
            return true;
          });
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
          showtimes: response.showtimes || [],
          tickets: (response.tickets || (typeof response.ticketsData === "string" ? (() => { try { return JSON.parse(response.ticketsData as string); } catch { return []; } })() : response.ticketsData) || [])
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
      // 502 TICKETS_SYNC_FAILED (event saved) and 422 QUANTITY_BELOW_SOLD_AND_HELD must reach the screen.
      if (parseEventSaveFailure(err)) throw err;
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
      if (parseEventSaveFailure(err)) throw err;
      return null;
    }
  },

  // send the stored ticket types to the ticket service again; throws on failure (502 TICKETS_SYNC_FAILED)
  resyncTickets: async (id: string): Promise<unknown> => {
    return axiosClient.post(`/events/${encodeURIComponent(id)}/tickets/resync`);
  },

  // get list approval events
  getApprovalEvents: async (status: string = "ALL"): Promise<Record<string, unknown>[]> => {
    const url = status && status !== "ALL" ? `/events/approvals?status=${encodeURIComponent(status)}` : "/events/approvals";
    const response: unknown = await axiosClient.get(url);
    if (!Array.isArray(response)) throw new Error("Invalid approval events response");
    return response as Record<string, unknown>[];
  },

  approveEvent: async (id: string): Promise<unknown> => {
    return axiosClient.patch(`/events/${id}/approve`);
  },

  revertApproval: async (id: string, reason?: string): Promise<unknown> => {
    return axiosClient.patch(`/events/${id}/revert-approval`, { reason });
  },

  cancelApprovalRequest: async (id: string): Promise<unknown> => {
    return axiosClient.patch(`/events/${id}/cancel-approval-request`);
  },

  rejectEvent: async (id: string, reason: string, notes?: string): Promise<unknown> => {
    return axiosClient.patch(`/events/${id}/reject`, { reason, notes });
  },

  // voucher management
  getVouchersByEventId: async (eventId: string): Promise<any[]> => {
    try {
      const response = await axiosClient.get(`/events/${eventId}/vouchers`);
      return Array.isArray(response) ? response : [];
    } catch (err) {
      console.warn("Failed to get vouchers:", err);
      return [];
    }
  },

  // the voucher a buyer typed: returned only when it has been released, so unreleased codes stay hidden
  lookupVoucher: async (eventId: string, code: string): Promise<VoucherItem | null> => {
    try {
      const response = await axiosClient.get(`/events/${eventId}/vouchers/lookup`, { params: { code } });
      return (response as unknown as VoucherItem) ?? null;
    } catch {
      return null;
    }
  },

  // member management APIs
  getEventMembers: async (eventId: string): Promise<MemberItem[]> => {
    try {
      const response = await axiosClient.get(`/events/${eventId}/members`);
      return Array.isArray(response) ? (response as unknown as MemberItem[]) : [];
    } catch (err) {
      console.error("Failed to get event members:", err);
      throw err;
    }
  },

  resendEventMemberInvitation: async (eventId: string, assignmentId: string): Promise<MemberItem> => {
    const response = await axiosClient.post(`/events/${eventId}/members/${assignmentId}/resend`);
    return response as unknown as MemberItem;
  },

  previewMemberInvitation: async (token: string): Promise<MemberInvitationPreview> => {
    const response = await axiosClient.post("/events/member-invitations/preview", { token });
    return response as unknown as MemberInvitationPreview;
  },

  acceptMemberInvitation: async (token: string): Promise<MemberInvitationAcceptResult> => {
    const response = await axiosClient.post("/events/member-invitations/accept", { token });
    return response as unknown as MemberInvitationAcceptResult;
  },

  declineMemberInvitation: async (token: string): Promise<void> => {
    await axiosClient.post("/events/member-invitations/decline", { token });
  },

  inviteEventMember: async (eventId: string, email: string, role: string): Promise<MemberItem> => {
    try {
      const response = await axiosClient.post(`/events/${eventId}/members`, { email, role });
      return response as unknown as MemberItem;
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
  // A string is the rolling window (24h, 7d, 30d); an object adds a custom from-to period and the comparison with the period before.
  getEventAnalytics: async (eventId: string, query: AnalyticsRange | EventAnalyticsQuery = "30d"): Promise<any> => {
    try {
      const q: EventAnalyticsQuery = typeof query === "string" ? { timeRange: query } : query;
      const params: Record<string, string | boolean> = { timeRange: q.timeRange ?? "30d" };
      if (q.from && q.to) {
        params.from = q.from;
        params.to = q.to;
      }
      if (q.compare) params.compare = true;
      const response = await axiosClient.get(`/events/${eventId}/analytics`, { params });
      return response.data || response;
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
  },

  getEventCheckins: async (eventId: string, showtimeId: string = ""): Promise<any[]> => {
    try {
      const response: any = await axiosClient.get(`/tickets/checkin/events/${eventId}`, {
        params: showtimeId ? { showtimeId } : {}
      });
      return Array.isArray(response) ? response : (response.data || []);
    } catch (err) {
      console.error("Failed to get event checkins:", err);
      return [];
    }
  },

  /** Entered / total for the door, per showtime and ticket type. Door staff may read it. */
  getCheckinSummary: async (eventId: string): Promise<CheckinSummary> => {
    const response = (await axiosClient.get(`/tickets/checkin/events/${eventId}/summary`)) as unknown as CheckinSummary;
    return response;
  },

  /** The people who entered, one server page at a time (page counts from 0), newest first. */
  getCheckinPage: async (eventId: string, params: { showtimeId?: string; page?: number; size?: number } = {}): Promise<CheckinPage> => {
    const response = (await axiosClient.get(`/tickets/checkin/events/${eventId}/page`, {
      params: { page: params.page ?? 0, size: params.size ?? 20, ...(params.showtimeId ? { showtimeId: params.showtimeId } : {}) },
    })) as unknown as CheckinPage;
    return response;
  },

  /** Finds tickets by a fragment of the ticket code, order id, seat or ticket type (the server needs at least two characters). */
  searchCheckinTickets: async (eventId: string, q: string, params: { showtimeId?: string; limit?: number } = {}): Promise<CheckinLookupItem[]> => {
    const response = (await axiosClient.get(`/tickets/checkin/events/${eventId}/search`, {
      params: { q, limit: params.limit ?? 20, ...(params.showtimeId ? { showtimeId: params.showtimeId } : {}) },
    })) as unknown as CheckinLookupItem[];
    return Array.isArray(response) ? response : [];
  },

  checkinTicket: async (eventId: string, qrCodeHash: string, showtimeId?: string): Promise<any> => {
    try {
      const response = await axiosClient.post(`/tickets/checkin`, {
        eventId,
        qrCodeHash,
        showtimeId: showtimeId || null,
        deviceInfo: describeDevice(),
        staffAssignmentId: 'web-admin-session'
      });
      return response;
    } catch (err) {
      console.error("Failed to checkin ticket:", err);
      throw err;
    }
  }
};
