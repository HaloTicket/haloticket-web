import axiosClient from "./axiosClient";
import type { BookingCreateRequest, BookingResponse } from "@/types";

export const bookingApi = {
  /** Lấy danh sách đơn đặt vé của người dùng hiện tại; trả về mảng rỗng nếu phản hồi không hợp lệ. */
  getMyBookings: async (): Promise<BookingResponse[]> => {
    const response: unknown = await axiosClient.get("/bookings/my");
    return Array.isArray(response) ? response as BookingResponse[] : [];
  },

  /** Tạo đơn đặt vé mới. Trả về `null` nếu phản hồi không hợp lệ, ném lại lỗi để nơi gọi hiển thị lý do. */
  createBooking: async (request: BookingCreateRequest): Promise<BookingResponse | null> => {
    try {
      const response: unknown = await axiosClient.post("/bookings", request);
      if (response && typeof response === "object") {
        return response as BookingResponse;
      }
      return null;
    } catch (err) {
      console.error("Failed to create booking:", err);
      throw err;
    }
  },

  /** Lấy đơn đặt vé theo mã nội bộ; trả về `null` khi lỗi hoặc không có dữ liệu. */
  getBookingById: async (bookingId: string): Promise<BookingResponse | null> => {
    try {
      const response: unknown = await axiosClient.get(`/bookings/${bookingId}`);
      if (response && typeof response === "object") {
        return response as BookingResponse;
      }
      return null;
    } catch (err) {
      console.error("Failed to fetch booking details:", err);
      return null;
    }
  },

  /** Lấy chi tiết đơn theo mã đơn (`bookingCode`); trả về `null` khi lỗi hoặc dữ liệu không có mã đơn. */
  getBookingByCode: async (bookingCode: string): Promise<import("@/types").BookingDetailResponse | null> => {
    try {
      const response = await axiosClient.get<unknown, import("@/types").BookingDetailResponse>(
        `/bookings/by-code/${encodeURIComponent(bookingCode)}`
      );
      if (response && typeof response === "object" && "bookingCode" in response) {
        return response;
      }
      return null;
    } catch {
      return null;
    }
  },

  /** Yêu cầu phát hành lại vé của đơn đã thanh toán (chỉ chủ đơn). Trả về nguyên phản hồi của máy chủ, từ chối khi request lỗi. */
  reissueByCode: async (bookingCode: string): Promise<unknown> => {
    return axiosClient.post(`/bookings/by-code/${encodeURIComponent(bookingCode)}/reissue`);
  },

  /** Hủy đơn đặt vé; trả về `true` nếu thành công, `false` nếu lỗi. */
  cancelBooking: async (bookingId: string): Promise<boolean> => {
    try {
      await axiosClient.post(`/bookings/${bookingId}/cancel`);
      return true;
    } catch (err) {
      console.error("Failed to cancel booking:", err);
      return false;
    }
  },

  /** Giữ chỗ một ghế cho người dùng trong suất diễn; trả về `false` nếu không giữ được. */
  holdSeat: async (request: { eventId: string; showtimeId?: string; seatId: string; userId: string }): Promise<boolean> => {
    try {
      await axiosClient.post("/seats/hold", request);
      return true;
    } catch {
      return false;
    }
  },

  /** Nhả ghế đang giữ; trả về `false` nếu không nhả được. */
  releaseSeat: async (request: { eventId: string; showtimeId?: string; seatId: string; userId: string }): Promise<boolean> => {
    try {
      await axiosClient.post("/seats/release", request);
      return true;
    } catch {
      return false;
    }
  },
};
