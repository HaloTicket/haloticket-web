import axiosClient from "./axiosClient";
import type { BookingCreateRequest, BookingResponse } from "@/types";

export const bookingApi = {
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

  cancelBooking: async (bookingId: string): Promise<boolean> => {
    try {
      await axiosClient.post(`/bookings/${bookingId}/cancel`);
      return true;
    } catch (err) {
      console.error("Failed to cancel booking:", err);
      return false;
    }
  },
};
