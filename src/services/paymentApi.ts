import axiosClient from "./axiosClient";
import type { PaymentCreateRequest, PaymentResponse, VnPayUrlResponse } from "@/types";

export const paymentApi = {
  createPayment: async (request: PaymentCreateRequest): Promise<PaymentResponse | null> => {
    try {
      const response: unknown = await axiosClient.post("/payments", request);
      if (response && typeof response === "object") {
        return response as PaymentResponse;
      }
      return null;
    } catch (err) {
      console.error("Failed to create payment:", err);
      throw err;
    }
  },

  createVnPayUrl: async (amount: number, orderInfo?: string, bookingId?: string): Promise<string | null> => {
    try {
      const params = new URLSearchParams();
      params.append("amount", amount.toString());
      if (orderInfo) params.append("orderInfo", orderInfo);
      if (bookingId) params.append("bookingId", bookingId);

      const response: unknown = await axiosClient.post(`/payments/vnpay/create-url?${params.toString()}`);
      if (response && typeof response === "object" && "paymentUrl" in response) {
        return (response as VnPayUrlResponse).paymentUrl;
      }
      return null;
    } catch (err) {
      console.error("Failed to generate VNPay URL:", err);
      throw err;
    }
  },
};
