import axiosClient from "./axiosClient";
import type { MarketplaceSagaResponse } from "@/types/marketplace";
import type {
  GiftPolicyData,
  OrganizerGiftItem,
  OrganizerListingItem,
  PageData,
  ResalePolicyData,
  TransferSettingsData,
} from "@/types/eventTransfer";

export const eventTransferApi = {
  /** Lấy cấu hình chuyển nhượng (bán lại và tặng vé) của một sự kiện. */
  getSettings: (eventId: string) =>
    axiosClient.get<unknown, TransferSettingsData>(
      `/events/${eventId}/transfer-settings`
    ),

  /** Cập nhật chính sách bán lại vé của sự kiện: khung giá, phí dịch vụ, thời gian mở bán, phạm vi loại vé; `expectedVersion` dùng để phát hiện xung đột phiên bản. */
  updateResalePolicy: (
    eventId: string,
    data: {
      enabled: boolean;
      minPricePercent: number;
      maxPricePercent: number;
      serviceFeePercent: number;
      requireApproval: boolean;
      opensAt: string | null;
      closesAt: string | null;
      ticketTypeScope: string;
      allowedTicketTypeIds: string[];
      termsVersion: string | null;
      expectedVersion: number | null;
    }
  ) =>
    axiosClient.put<unknown, ResalePolicyData>(
      `/events/${eventId}/resale-policy`,
      data
    ),

  /** Cập nhật chính sách tặng vé của sự kiện: thời gian mở, hạn lời mời, yêu cầu eKYC, giới hạn số lượng và phạm vi loại vé; `expectedVersion` dùng để phát hiện xung đột phiên bản. */
  updateGiftPolicy: (
    eventId: string,
    data: {
      enabled: boolean;
      opensAt: string | null;
      closesAt: string | null;
      invitationTtlHours: number;
      requireEkyc: boolean;
      maxGiftCount: number;
      ticketTypeScope: string;
      allowedTicketTypeIds: string[];
      expectedVersion: number | null;
    }
  ) =>
    axiosClient.put<unknown, GiftPolicyData>(
      `/events/${eventId}/gift-policy`,
      data
    ),

  /** Lấy một trang tin đăng bán lại của sự kiện, có thể lọc theo trạng thái. */
  getListings: (eventId: string, page = 0, size = 20, status?: string) =>
    axiosClient.get<unknown, PageData<OrganizerListingItem>>(
      `/marketplace/organizer/events/${eventId}/listings?page=${page}&size=${size}${status ? `&status=${status}` : ""}`
    ),

  /** Lấy một trang các lượt tặng vé của sự kiện, có thể lọc theo trạng thái. */
  getGifts: (eventId: string, page = 0, size = 20, status?: string) =>
    axiosClient.get<unknown, PageData<OrganizerGiftItem>>(
      `/marketplace/organizer/events/${eventId}/gifts?page=${page}&size=${size}${status ? `&status=${status}` : ""}`
    ),

  /** Lấy chi tiết một tin đăng bán lại. */
  getListingDetail: (eventId: string, listingId: string) =>
    axiosClient.get<unknown, OrganizerListingItem>(
      `/marketplace/organizer/events/${eventId}/listings/${listingId}`
    ),

  /** Lấy chi tiết một lượt tặng vé. */
  getGiftDetail: (eventId: string, sagaId: string) =>
    axiosClient.get<unknown, OrganizerGiftItem>(
      `/marketplace/organizer/events/${eventId}/gifts/${sagaId}`
    ),

  /** Duyệt hoặc từ chối một tin đăng bán lại đang chờ, kèm lý do nếu có. */
  moderateListing: (eventId: string, listingId: string, action: "APPROVE" | "REJECT", reason?: string) =>
    axiosClient.post<unknown, MarketplaceSagaResponse>(
      `/marketplace/organizer/events/${encodeURIComponent(eventId)}/listings/${encodeURIComponent(listingId)}/moderate`,
      { action, ...(reason ? { reason } : {}) }
    ),

  /** Nhà tổ chức hủy một tin đăng bán lại, kèm lý do nếu có. */
  cancelListing: (eventId: string, listingId: string, reason?: string) =>
    axiosClient.post<unknown, MarketplaceSagaResponse>(
      `/marketplace/organizer/events/${encodeURIComponent(eventId)}/listings/${encodeURIComponent(listingId)}/cancel`,
      reason ? { reason } : {}
    ),

  /** Nhà tổ chức hủy một lượt tặng vé, kèm lý do nếu có. */
  cancelGift: (eventId: string, sagaId: string, reason?: string) =>
    axiosClient.post<unknown, MarketplaceSagaResponse>(
      `/marketplace/organizer/events/${encodeURIComponent(eventId)}/gifts/${encodeURIComponent(sagaId)}/cancel`,
      reason ? { reason } : {}
    ),
};
