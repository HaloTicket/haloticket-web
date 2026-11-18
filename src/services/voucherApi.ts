import axiosClient from "./axiosClient";
import type { VoucherItem, VoucherCreateData } from "@/types";
import { isForbiddenError } from "@/utils/httpError";

export const voucherApi = {
  /** Lấy tất cả voucher của một sự kiện. Lỗi 403 được ném lại; lỗi khác trả về mảng rỗng. */
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

  /** Tạo một voucher hoặc nhiều voucher cùng lúc; luôn trả về dạng mảng. */
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

  /** Cập nhật voucher. */
  updateVoucher: async (voucherId: string, data: Partial<VoucherCreateData>): Promise<VoucherItem | null> => {
    try {
      const response: unknown = await axiosClient.put(`/events/vouchers/${voucherId}`, data);
      return response as VoucherItem;
    } catch (err) {
      console.error("Failed to update voucher:", err);
      throw err;
    }
  },

  /** Bật hoặc tắt trạng thái hoạt động của voucher. */
  toggleVoucherStatus: async (voucherId: string): Promise<VoucherItem | null> => {
    try {
      const response: unknown = await axiosClient.patch(`/events/vouchers/${voucherId}/status`);
      return response as VoucherItem;
    } catch (err) {
      console.error("Failed to toggle voucher status:", err);
      throw err;
    }
  },

  /** Xóa voucher theo id. */
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
