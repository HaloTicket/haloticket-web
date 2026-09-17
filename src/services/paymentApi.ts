import axiosClient from "./axiosClient";
import type {
  PaymentCreateRequest,
  PaymentResponse,
  VnPayUrlResponse,
  VietQrPayloadResponse,
} from "@/types";

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

  createVietQrPayload: async (
    amount: number,
    bookingCode: string,
    bookingId: string
  ): Promise<VietQrPayloadResponse | null> => {
    try {
      const params = new URLSearchParams();
      params.append("amount", amount.toString());
      if (bookingCode) params.append("bookingCode", bookingCode);
      params.append("bookingId", bookingId);

      const response: unknown = await axiosClient.post(`/payments/vietqr/create-payload?${params.toString()}`);
      if (response && typeof response === "object") {
        return response as VietQrPayloadResponse;
      }
      return null;
    } catch (err) {
      console.error("Failed to create VietQR payload:", err);
      throw err;
    }
  },

  createMoMoUrl: async (amount: number, orderInfo?: string, bookingId?: string): Promise<string | null> => {
    try {
      const params = new URLSearchParams();
      params.append("amount", amount.toString());
      if (orderInfo) params.append("orderInfo", orderInfo);
      if (bookingId) params.append("bookingId", bookingId);

      const response: unknown = await axiosClient.post(`/payments/momo/create-url?${params.toString()}`);
      if (response && typeof response === "object" && "paymentUrl" in response) {
        return (response as { paymentUrl: string }).paymentUrl;
      }
      return null;
    } catch (err) {
      console.error("Failed to generate MoMo URL:", err);
      throw err;
    }
  },

  createZaloPayUrl: async (amount: number, orderInfo?: string, bookingId?: string): Promise<string | null> => {
    try {
      const params = new URLSearchParams();
      params.append("amount", amount.toString());
      if (orderInfo) params.append("orderInfo", orderInfo);
      if (bookingId) params.append("bookingId", bookingId);

      const response: unknown = await axiosClient.post(`/payments/zalopay/create-url?${params.toString()}`);
      if (response && typeof response === "object" && "paymentUrl" in response) {
        return (response as { paymentUrl: string }).paymentUrl;
      }
      return null;
    } catch (err) {
      console.error("Failed to generate ZaloPay URL:", err);
      throw err;
    }
  },

  createShopeePayUrl: async (amount: number, orderInfo?: string, bookingId?: string): Promise<string | null> => {
    try {
      const params = new URLSearchParams();
      params.append("amount", amount.toString());
      if (orderInfo) params.append("orderInfo", orderInfo);
      if (bookingId) params.append("bookingId", bookingId);

      const response: unknown = await axiosClient.post(`/payments/shopeepay/create-url?${params.toString()}`);
      if (response && typeof response === "object" && "paymentUrl" in response) {
        return (response as { paymentUrl: string }).paymentUrl;
      }
      return null;
    } catch (err) {
      console.error("Failed to generate ShopeePay URL:", err);
      throw err;
    }
  },

  verifyPaymentStatus: async (bookingId: string): Promise<PaymentResponse | null> => {
    try {
      const response: unknown = await axiosClient.get(`/payments/verify/${bookingId}`);
      if (response && typeof response === "object") {
        return response as PaymentResponse;
      }
      return null;
    } catch (err) {
      console.error("Failed to verify payment status:", err);
      return null;
    }
  },
};
