import axiosClient from "./axiosClient";
import type { AnalyticsRange, EventAnalyticsQuery } from "@/types/eventAnalytics";
import { describeDevice } from "@/utils/deviceInfo";
import type { CheckinLookupItem, CheckinPage, CheckinSummary } from "@/types/checkin";
import type { VoucherItem } from "@/types/voucher";
import type { EventApiData, MemberItem, MemberInvitationPreview, MemberInvitationAcceptResult } from "@/types";
import { parseEventSaveFailure } from "@/utils/eventSaveErrors";
export type { EventApiData };

export const eventApi = {
  /** Lấy danh sách sự kiện còn hiệu lực (chưa hết hạn bán hoặc chưa kết thúc), gắn ảnh đại diện; lỗi thì trả về mảng rỗng. */
  getAllEvents: async (): Promise<EventApiData[]> => {
    try {
      const response: unknown = await axiosClient.get("/events");
      if (Array.isArray(response)) {
        const now = new Date();
        /** Đổi giá trị ngày (mảng số kiểu Java hoặc chuỗi) thành `Date`; trả về `null` nếu rỗng. */
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

  /** Lấy chi tiết sự kiện theo mã, bổ sung giá trị mặc định cho các trường thiếu (ảnh, mô tả, vé); trả về `null` khi lỗi hoặc không có sự kiện. */
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

  /** Lấy các từ khóa được tìm nhiều nhất từ máy chủ; lỗi hoặc rỗng thì dùng danh sách mặc định. */
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

  /** Ghi lại từ khóa tìm kiếm để phân tích; lỗi được bỏ qua âm thầm, từ khóa rỗng thì không gửi. */
  logSearchQuery: async (query: string): Promise<void> => {
    if (!query || !query.trim()) return;
    try {
      await axiosClient.post(`/events/search-log?query=${encodeURIComponent(query.trim())}`);
    } catch {
            // bỏ qua lỗi âm thầm
    }
  },

  /** Gửi yêu cầu tạo sự kiện để chờ duyệt. Lỗi lưu có cấu trúc thì ném lại, lỗi khác trả về `null`. */
  createEventApprovalRequest: async (data: Record<string, unknown>): Promise<unknown> => {
    try {
      const response: unknown = await axiosClient.post("/events", data);
      return response;
    } catch (err) {
      console.error("Failed to create/submit event in DB:", err);
            // Lỗi 502 TICKETS_SYNC_FAILED (sự kiện đã lưu) và 422 QUANTITY_BELOW_SOLD_AND_HELD phải được chuyển tới màn hình.
      if (parseEventSaveFailure(err)) throw err;
      return null;
    }
  },

  /** Cập nhật thông tin sự kiện. Lỗi lưu có cấu trúc thì ném lại, lỗi khác trả về `null`. */
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

  /** Gửi lại các loại vé đã lưu sang dịch vụ vé; ném lỗi khi thất bại (502 TICKETS_SYNC_FAILED). */
  resyncTickets: async (id: string): Promise<unknown> => {
    return axiosClient.post(`/events/${encodeURIComponent(id)}/tickets/resync`);
  },

  /** Lấy danh sách sự kiện chờ duyệt theo trạng thái (`ALL` là tất cả); ném lỗi nếu phản hồi không phải mảng. */
  getApprovalEvents: async (status: string = "ALL"): Promise<Record<string, unknown>[]> => {
    const url = status && status !== "ALL" ? `/events/approvals?status=${encodeURIComponent(status)}` : "/events/approvals";
    const response: unknown = await axiosClient.get(url);
    if (!Array.isArray(response)) throw new Error("Invalid approval events response");
    return response as Record<string, unknown>[];
  },

  /** Duyệt một sự kiện. */
  approveEvent: async (id: string): Promise<unknown> => {
    return axiosClient.patch(`/events/${id}/approve`);
  },

  /** Thu hồi quyết định duyệt một sự kiện, kèm lý do nếu có. */
  revertApproval: async (id: string, reason?: string): Promise<unknown> => {
    return axiosClient.patch(`/events/${id}/revert-approval`, { reason });
  },

  /** Nhà tổ chức hủy yêu cầu duyệt sự kiện. */
  cancelApprovalRequest: async (id: string): Promise<unknown> => {
    return axiosClient.patch(`/events/${id}/cancel-approval-request`);
  },

  /** Từ chối một sự kiện, kèm lý do và ghi chú. */
  rejectEvent: async (id: string, reason: string, notes?: string): Promise<unknown> => {
    return axiosClient.patch(`/events/${id}/reject`, { reason, notes });
  },

    // quản lý voucher
  /** Lấy danh sách voucher của sự kiện; lỗi thì trả về mảng rỗng. */
  getVouchersByEventId: async (eventId: string): Promise<any[]> => {
    try {
      const response = await axiosClient.get(`/events/${eventId}/vouchers`);
      return Array.isArray(response) ? response : [];
    } catch (err) {
      console.warn("Failed to get vouchers:", err);
      return [];
    }
  },

  /** Tra voucher theo mã người mua nhập: chỉ trả về khi voucher đã được phát hành, mã chưa phát hành vẫn bị ẩn; lỗi hoặc không thấy thì trả về `null`. */
  lookupVoucher: async (eventId: string, code: string): Promise<VoucherItem | null> => {
    try {
      const response = await axiosClient.get(`/events/${eventId}/vouchers/lookup`, { params: { code } });
      return (response as unknown as VoucherItem) ?? null;
    } catch {
      return null;
    }
  },

    // các API quản lý thành viên
  /** Lấy danh sách thành viên của sự kiện; ném lại lỗi để nơi gọi xử lý. */
  getEventMembers: async (eventId: string): Promise<MemberItem[]> => {
    try {
      const response = await axiosClient.get(`/events/${eventId}/members`);
      return Array.isArray(response) ? (response as unknown as MemberItem[]) : [];
    } catch (err) {
      console.error("Failed to get event members:", err);
      throw err;
    }
  },

  /** Gửi lại lời mời cho một thành viên đang chờ. */
  resendEventMemberInvitation: async (eventId: string, assignmentId: string): Promise<MemberItem> => {
    const response = await axiosClient.post(`/events/${eventId}/members/${assignmentId}/resend`);
    return response as unknown as MemberItem;
  },

  /** Xem trước lời mời tham gia sự kiện từ token trong liên kết. */
  previewMemberInvitation: async (token: string): Promise<MemberInvitationPreview> => {
    const response = await axiosClient.post("/events/member-invitations/preview", { token });
    return response as unknown as MemberInvitationPreview;
  },

  /** Chấp nhận lời mời tham gia sự kiện bằng token. */
  acceptMemberInvitation: async (token: string): Promise<MemberInvitationAcceptResult> => {
    const response = await axiosClient.post("/events/member-invitations/accept", { token });
    return response as unknown as MemberInvitationAcceptResult;
  },

  /** Từ chối lời mời tham gia sự kiện bằng token. */
  declineMemberInvitation: async (token: string): Promise<void> => {
    await axiosClient.post("/events/member-invitations/decline", { token });
  },

  /** Mời một thành viên vào sự kiện theo email và vai trò. */
  inviteEventMember: async (eventId: string, email: string, role: string): Promise<MemberItem> => {
    try {
      const response = await axiosClient.post(`/events/${eventId}/members`, { email, role });
      return response as unknown as MemberItem;
    } catch (err) {
      console.error("Failed to invite event member:", err);
      throw err;
    }
  },

  /** Đổi vai trò của một thành viên trong sự kiện. */
  changeEventMemberRole: async (eventId: string, assignmentId: string, newRole: string): Promise<any> => {
    try {
      const response = await axiosClient.put(`/events/${eventId}/members/${assignmentId}/role?newRole=${newRole}`);
      return response;
    } catch (err) {
      console.error("Failed to change event member role:", err);
      throw err;
    }
  },

  /** Đổi trạng thái của một thành viên trong sự kiện. */
  changeEventMemberStatus: async (eventId: string, assignmentId: string, newStatus: string): Promise<any> => {
    try {
      const response = await axiosClient.put(`/events/${eventId}/members/${assignmentId}/status?newStatus=${newStatus}`);
      return response;
    } catch (err) {
      console.error("Failed to change event member status:", err);
      throw err;
    }
  },

  /** Xóa một thành viên khỏi sự kiện. */
  removeEventMember: async (eventId: string, assignmentId: string): Promise<void> => {
    try {
      await axiosClient.delete(`/events/${eventId}/members/${assignmentId}`);
    } catch (err) {
      console.error("Failed to remove event member:", err);
      throw err;
    }
  },

  /** Chuyển quyền chủ sở hữu sự kiện cho một thành viên. */
  transferOwner: async (eventId: string, assignmentId: string): Promise<void> => {
    try {
      await axiosClient.post(`/events/${eventId}/members/${assignmentId}/transfer-owner`);
    } catch (err) {
      console.error("Failed to transfer owner:", err);
      throw err;
    }
  },

  /** Lấy vai trò của người dùng hiện tại trong sự kiện; trả về `null` nếu lỗi hoặc không có vai trò. */
  getMyRoleInEvent: async (eventId: string): Promise<string | null> => {
    try {
      const response = await axiosClient.get(`/events/${eventId}/members/my-role`);
      return (typeof response === "string") ? response : null;
    } catch (err) {
      console.error("Failed to get my role in event:", err);
      return null;
    }
  },
  /** Lấy số liệu phân tích sự kiện. Chuỗi là khoảng thời gian trượt (24h, 7d, 30d); đối tượng cho phép thêm khoảng từ ngày đến ngày tùy chọn và so sánh với kỳ trước. */
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

  /** Ghi lượt xem sự kiện kèm mã phiên ẩn danh lưu ở `localStorage` và mã người dùng nếu có; lỗi chỉ được ghi log. */
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

  /** Lấy danh sách đơn của sự kiện cho nhà tổ chức, có tìm kiếm, lọc suất diễn và phân trang. */
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

  /** Lấy danh sách lượt check-in của sự kiện, có thể lọc theo suất diễn; lỗi thì trả về mảng rỗng. */
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

    /** Số người đã vào cổng trên tổng số vé, theo từng suất diễn và loại vé. Nhân viên soát vé được phép đọc. */
  getCheckinSummary: async (eventId: string): Promise<CheckinSummary> => {
    const response = (await axiosClient.get(`/tickets/checkin/events/${eventId}/summary`)) as unknown as CheckinSummary;
    return response;
  },

    /** Danh sách người đã vào cổng, mỗi lần một trang từ máy chủ (số trang tính từ 0), mới nhất trước. */
  getCheckinPage: async (eventId: string, params: { showtimeId?: string; page?: number; size?: number } = {}): Promise<CheckinPage> => {
    const response = (await axiosClient.get(`/tickets/checkin/events/${eventId}/page`, {
      params: { page: params.page ?? 0, size: params.size ?? 20, ...(params.showtimeId ? { showtimeId: params.showtimeId } : {}) },
    })) as unknown as CheckinPage;
    return response;
  },

    /** Tìm vé theo một phần mã vé, mã đơn, ghế hoặc loại vé (máy chủ yêu cầu ít nhất hai ký tự). */
  searchCheckinTickets: async (eventId: string, q: string, params: { showtimeId?: string; limit?: number } = {}): Promise<CheckinLookupItem[]> => {
    const response = (await axiosClient.get(`/tickets/checkin/events/${eventId}/search`, {
      params: { q, limit: params.limit ?? 20, ...(params.showtimeId ? { showtimeId: params.showtimeId } : {}) },
    })) as unknown as CheckinLookupItem[];
    return Array.isArray(response) ? response : [];
  },

  /** Check-in một vé bằng mã băm QR, ghi kèm thông tin thiết bị; ném lại lỗi để màn hình hiển thị. */
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
