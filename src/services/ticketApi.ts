import axiosClient from "./axiosClient";
import { isForbiddenError } from "@/utils/httpError";
import type {
  TicketTypeApiRequest,
  TicketTypeApiResponse,
  SeatLayoutApiRequest,
  SeatLayoutApiResponse,
  OwnedTicketApiResponse,
} from "@/types";

export const ticketApi = {
  /** Lấy toàn bộ vé của người dùng hiện tại; tự duyệt từng trang (100 vé/trang) cho tới trang cuối. Ném lỗi `INVALID_TICKET_RESPONSE` nếu phản hồi sai cấu trúc. */
  getMyTickets: async (): Promise<OwnedTicketApiResponse[]> => {
    const tickets: OwnedTicketApiResponse[] = [];
    for (let page = 0; ; page++) {
      const response = await axiosClient.get<unknown, OwnedTicketApiResponse[] | {
        content: OwnedTicketApiResponse[]; totalPages: number;
      }>("/tickets/mine", { params: { page, size: 100 } });
      if (Array.isArray(response)) return response;
      if (!response || !Array.isArray(response.content) || !Number.isInteger(response.totalPages) || response.totalPages < 0) throw new Error("INVALID_TICKET_RESPONSE");
      tickets.push(...response.content);
      if (page + 1 >= response.totalPages) return tickets;
    }
  },

  /** Lấy chi tiết một vé theo mã vé. */
  getMyTicket: async (ticketId: string): Promise<OwnedTicketApiResponse> => {
    return axiosClient.get<unknown, OwnedTicketApiResponse>(`/tickets/${encodeURIComponent(ticketId)}`);
  },

  /** Lấy các loại vé của một sự kiện. Trả về mảng rỗng nếu lỗi. */
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

  /** Lấy toàn bộ loại vé của sự kiện (dùng lại `getTicketTypesByEventId`). */
  getAllTicketTypesByEventId: async (eventId: string): Promise<TicketTypeApiResponse[]> => {
    return ticketApi.getTicketTypesByEventId(eventId);
  },

  /** Lấy một loại vé theo id; trả về `null` nếu không có hoặc lỗi. */
  getTicketTypeById: async (id: string): Promise<TicketTypeApiResponse | null> => {
    try {
      const response: unknown = await axiosClient.get(`/tickets/types/${encodeURIComponent(id)}`);
      if (response && typeof response === "object") {
        return response as TicketTypeApiResponse;
      }
      return null;
    } catch {
      return null;
    }
  },

  /** Lấy các loại vé của một suất diễn. Trả về mảng rỗng nếu lỗi. */
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

  /** Đồng bộ (lưu) danh sách loại vé của sự kiện. Lỗi 403 được ném lại; các lỗi khác trả về mảng rỗng. */
  syncTicketTypesForEvent: async (eventId: string, requests: TicketTypeApiRequest[]): Promise<TicketTypeApiResponse[]> => {
    try {
      const response: unknown = await axiosClient.post(`/tickets/types/sync/${eventId}`, requests);
      if (Array.isArray(response)) {
        return response as TicketTypeApiResponse[];
      }
      return [];
    } catch (err) {
      console.error("Failed to sync ticket types:", err);
      if (isForbiddenError(err)) throw err;
      return [];
    }
  },

  /** Lấy sơ đồ ghế của sự kiện; trả về `null` nếu lỗi. */
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

  /** Lưu bản nháp sơ đồ ghế của sự kiện. Ném lại lỗi nếu thất bại. */
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

  /** Xuất bản sơ đồ ghế của sự kiện. Ném lại lỗi nếu thất bại. */
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

  /** Lấy bản đồ trạng thái ghế theo thời gian thực (theo suất diễn nếu có); trả về đối tượng rỗng nếu lỗi. */
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
