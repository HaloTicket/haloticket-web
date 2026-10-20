import axiosClient from "./axiosClient";
import type { PayoutResponse } from "@/types";

// clean up any legacy mock data stored in user's browser
try {
  localStorage.removeItem("haloticket_mock_payouts");
} catch {}

export const payoutApi = {
  getPendingPayouts: async (): Promise<PayoutResponse[]> => {
    const response = await axiosClient.get("/payouts/admin/pending");
    return Array.isArray(response) ? (response as unknown as PayoutResponse[]) : [];
  },

  getAllAdminPayouts: async (): Promise<PayoutResponse[]> => {
    const response = await axiosClient.get("/payouts/admin/all");
    return Array.isArray(response) ? (response as unknown as PayoutResponse[]) : [];
  },

  approvePayout: async (payoutId: string): Promise<PayoutResponse> => {
    const response = await axiosClient.post(`/payouts/admin/${payoutId}/approve`);
    return response as unknown as PayoutResponse;
  },

  disputePayout: async (payoutId: string, reason?: string): Promise<PayoutResponse> => {
    const response = await axiosClient.post(`/payouts/admin/${payoutId}/dispute`, { reason });
    return response as unknown as PayoutResponse;
  },

  reopenPayout: async (payoutId: string): Promise<PayoutResponse> => {
    const response = await axiosClient.post(`/payouts/admin/${payoutId}/reopen`);
    return response as unknown as PayoutResponse;
  },

  rejectPayout: async (payoutId: string): Promise<PayoutResponse> => {
    const response = await axiosClient.post(`/payouts/admin/${payoutId}/reject`);
    return response as unknown as PayoutResponse;
  },

  getOrganizerPayouts: async (): Promise<PayoutResponse[]> => {
    const response = await axiosClient.get(`/payouts/organizer`);
    return Array.isArray(response) ? (response as unknown as PayoutResponse[]) : [];
  },

  getEligibleEvents: async (): Promise<any[]> => {
    try {
      const response = await axiosClient.get(`/payouts/organizer/eligible-events`);
      return Array.isArray(response) ? (response as unknown as any[]) : [];
    } catch {
      return [];
    }
  },

  requestPayout: async (eventId: string, requestAmount: number, platformFeeRate: number): Promise<PayoutResponse> => {
    const response = await axiosClient.post(`/payouts/organizer/request`, { eventId, requestAmount, platformFeeRate });
    return response as unknown as PayoutResponse;
  }
};
