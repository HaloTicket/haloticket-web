export interface VoucherItem {
  id: string;
  eventId?: string;
  title: string;
  code: string;
  terms?: string;
  type?: "PERCENTAGE" | "FIXED_AMOUNT";
  discountType?: "PERCENTAGE" | "FIXED_AMOUNT";
  value?: number;
  discountValue?: number;
  applyTicketLimitType?: "LIMITED" | "UNLIMITED";
  ticketLimitCount?: number;
  maxOrdersPerBuyer?: number;
  minTicketsPerOrder?: number;
  maxTicketsPerOrder?: number;
  applyScope?: "ALL" | "LIMITED_SHOWTIMES";
  applicableShowtimes?: string[];
  usedCount?: number;
  startDate: string;
  endDate: string;
  status?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VoucherCreateData {
  creationMode?: "SINGLE" | "BULK";
  title: string;
  code?: string;
  codePrefix?: string;
  bulkCount?: number;
  terms?: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  applyTicketLimitType: "LIMITED" | "UNLIMITED";
  ticketLimitCount: number;
  maxOrdersPerBuyer: number;
  minTicketsPerOrder: number;
  maxTicketsPerOrder: number;
  applyScope: "ALL" | "LIMITED_SHOWTIMES";
  applicableShowtimes?: string[];
  startDate: string;
  endDate: string;
  status?: "DRAFT" | "ACTIVE" | "INACTIVE" | "EXPIRED";
}
