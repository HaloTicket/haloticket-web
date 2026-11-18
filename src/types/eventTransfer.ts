/** Chính sách bán lại vé của sự kiện: khoảng giá cho phép, thời gian mở và phạm vi loại vé. */
export interface ResalePolicyData {
  eventId: string;
  enabled: boolean;
  minPricePercent: number;
  maxPricePercent: number;
  serviceFeePercent?: number;
  requireApproval?: boolean;
  opensAt: string | null;
  closesAt: string | null;
  ticketTypeScope: "ALL" | "SELECTED";
  allowedTicketTypeIds: string[];
  termsVersion: string | null;
  version: number;
}

/** Chính sách tặng vé của sự kiện: thời gian mở, hạn lời mời, yêu cầu eKYC và phạm vi loại vé. */
export interface GiftPolicyData {
  eventId: string;
  enabled: boolean;
  opensAt: string | null;
  closesAt: string | null;
  invitationTtlHours: number;
  requireEkyc?: boolean;
  maxGiftCount?: number;
  ticketTypeScope: "ALL" | "SELECTED";
  allowedTicketTypeIds: string[];
  version: number;
}

/** Cài đặt chuyển nhượng vé của sự kiện (bán lại và tặng) và quyền ghi của người xem. */
export interface TransferSettingsData {
  resale: ResalePolicyData | null;
  gift: GiftPolicyData | null;
  canWrite: boolean;
}

/** Thống kê số lượng tin bán lại và quà tặng theo trạng thái. */
export interface TransferSummaryData {
  activeListings: number;
  reservedListings: number;
  completedListings: number;
  pendingGifts: number;
  completedGifts: number;
}

/** Một tin bán lại vé trong màn hình của người tổ chức (email người bán đã che). */
export interface OrganizerListingItem {
  listingId: string;
  refCode: string;
  ticketTypeName: string;
  seatCode: string | null;
  sellerEmailMasked: string;
  price: number;
  originalPrice?: number | null;
  minPriceSnapshot?: number | null;
  maxPriceSnapshot?: number | null;
  currency: string;
  serviceFeePercent?: number;
  moderationReason?: string | null;
  status: string;
  createdAt: string;
  quantity?: number;
  ticketIds?: string[];
}

/** Một lượt tặng vé trong màn hình của người tổ chức (email người gửi và nhận đã che). */
export interface OrganizerGiftItem {
  sagaId: string;
  senderEmailMasked: string;
  recipientEmailMasked: string;
  ticketTypeName: string;
  sentAt: string;
  expiresAt: string;
  receivedAt?: string | null;
  status: string;
  quantity?: number;
  ticketIds?: string[];
  requireEkyc?: boolean | null;
  isRecipientEkycVerified?: boolean | null;
}

/** Trang dữ liệu phân trang kiểu Spring. */
export interface PageData<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
