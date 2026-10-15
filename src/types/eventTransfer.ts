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

export interface TransferSettingsData {
  resale: ResalePolicyData | null;
  gift: GiftPolicyData | null;
  canWrite: boolean;
}

export interface TransferSummaryData {
  activeListings: number;
  reservedListings: number;
  completedListings: number;
  pendingGifts: number;
  completedGifts: number;
}

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

export interface PageData<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
