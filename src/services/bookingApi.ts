import axiosClient from "./axiosClient";
import type { BookingCreateRequest, BookingResponse } from "@/types";

export const bookingApi = {
  getMyBookings: async (): Promise<BookingResponse[]> => {
    const response: unknown = await axiosClient.get("/bookings/my");
    return Array.isArray(response) ? response as BookingResponse[] : [];
  },

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

  cancelBooking: async (bookingId: string): Promise<boolean> => {
    try {
      await axiosClient.post(`/bookings/${bookingId}/cancel`);
      return true;
    } catch (err) {
      console.error("Failed to cancel booking:", err);
      return false;
    }
  },

  holdSeat: async (request: { eventId: string; showtimeId?: string; seatId: string; userId: string }): Promise<boolean> => {
    try {
      await axiosClient.post("/seats/hold", request);
      return true;
    } catch {
      return false;
    }
  },

  releaseSeat: async (request: { eventId: string; showtimeId?: string; seatId: string; userId: string }): Promise<boolean> => {
    try {
      await axiosClient.post("/seats/release", request);
      return true;
    } catch {
      return false;
    }
  },
};
