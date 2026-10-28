import axiosClient from "./axiosClient";
import type { VoucherItem, VoucherCreateData } from "@/types";
import { isForbiddenError } from "@/utils/httpError";

export const voucherApi = {
  // get all vouchers for an event
  getVouchersByEvent: async (eventId: string): Promise<VoucherItem[]> => {
    try {
      const response: unknown = await axiosClient.get(`/events/${eventId}/vouchers`);
      if (Array.isArray(response)) {
        return response as VoucherItem[];
      }
      return [];
    } catch (err) {
      if (isForbiddenError(err)) throw err;
      console.warn("Failed to fetch vouchers from backend API:", err);
      return [];
    }
  },

  // create single or bulk vouchers
  createVoucher: async (eventId: string, data: VoucherCreateData): Promise<VoucherItem[]> => {
    try {
      const response: unknown = await axiosClient.post(`/events/${eventId}/vouchers`, data);
      if (Array.isArray(response)) {
        return response as VoucherItem[];
      }
      if (response && typeof response === "object") {
        return [response as VoucherItem];
      }
      return [];
    } catch (err) {
      console.error("Failed to create voucher:", err);
      throw err;
    }
  },

  // update voucher
  updateVoucher: async (voucherId: string, data: Partial<VoucherCreateData>): Promise<VoucherItem | null> => {
    try {
      const response: unknown = await axiosClient.put(`/events/vouchers/${voucherId}`, data);
      return response as VoucherItem;
    } catch (err) {
      console.error("Failed to update voucher:", err);
      throw err;
    }
  },

  // toggle voucher active status
  toggleVoucherStatus: async (voucherId: string): Promise<VoucherItem | null> => {
    try {
      const response: unknown = await axiosClient.patch(`/events/vouchers/${voucherId}/status`);
      return response as VoucherItem;
    } catch (err) {
      console.error("Failed to toggle voucher status:", err);
      throw err;
    }
  },

  // delete voucher
  deleteVoucher: async (voucherId: string): Promise<boolean> => {
    try {
      await axiosClient.delete(`/events/vouchers/${voucherId}`);
      return true;
    } catch (err) {
      console.error("Failed to delete voucher:", err);
      throw err;
    }
  },
};
