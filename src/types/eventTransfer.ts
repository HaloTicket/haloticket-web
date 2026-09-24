export interface ResalePolicyData {
  eventId: string;
  enabled: boolean;
  minPricePercent: number;
  maxPricePercent: number;
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
  currency: string;
  status: string;
  createdAt: string;
}

export interface OrganizerGiftItem {
  sagaId: string;
  senderEmailMasked: string;
  recipientEmailMasked: string;
  ticketTypeName: string;
  sentAt: string;
  expiresAt: string;
  status: string;
}

export interface PageData<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
