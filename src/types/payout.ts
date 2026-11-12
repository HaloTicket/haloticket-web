/** Money values from payout endpoints are decimal integer VND strings. */
export type Money = string;

export type PayoutStatus =
  | "PENDING"
  | "APPROVED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "NEEDS_VERIFICATION"
  | "REJECTED"
  | "CANCELLED"
  | "DISPUTE"
  | (string & {});

export type PayoutType = "ADVANCE" | "FINAL_SETTLEMENT";

export type PayoutReasonCode =
  | "EVENT_NOT_ENDED"
  | "RECONCILIATION_PENDING"
  | "RECONCILIATION_REQUIRED"
  | "NO_SETTLED_REVENUE"
  | "PAYOUT_ACCOUNT_MISSING"
  | "PAYOUT_ACCOUNT_UNVERIFIED"
  | "FINANCIAL_PERMISSION_REQUIRED"
  | "FUNDS_ON_HOLD"
  | "PAYOUT_IN_PROGRESS"
  | "ADVANCE_DISABLED"
  | "ADVANCE_LIMIT_EXCEEDED"
  | "NO_AVAILABLE_FUNDS"
  | (string & {});

export interface PayoutResponse {
  id: string;
  eventId: string;
  eventName?: string;
  requestType?: PayoutType;
  organizerUserId: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: PayoutStatus;
  transferredAt?: string;
  disputeReason?: string;
  publicReason?: string;
  transferReference?: string;
  accountHolderSnapshot?: string;
  maskedAccountNumber?: string;
  bankNameSnapshot?: string;
  canCancel?: boolean;
  quoteId?: string;
  createdAt: string;
  updatedAt: string;
  allowedActions?: string[];
  accountSnapshot?: PayoutAccountSnapshot;
  timeline?: PayoutTimelineEntry[];
}

export interface FinanceSummary {
  collectedRevenue: Money;
  availableAmount: Money;
  processingAmount: Money;
  paidAmount: Money;
  updatedAt: string;
}

export interface OrganizerFinanceAnalytics {
  from: string;
  to: string;
  series: { date: string; grossAmount: Money; refundAmount: Money }[];
  refundDataAvailable: boolean;
  refundDataNote?: string;
}

export interface EventSettlement {
  eventId: string;
  eventName: string;
  imageUrl?: string;
  eventEndAt?: string;
  grossAmount: Money;
  deductions: Money;
  platformFees?: Money;
  refunds?: Money;
  paidAmount: Money;
  heldAmount: Money;
  availableAmount: Money;
  settlementStatus: string;
  eligible: boolean;
  reasonCodes: PayoutReasonCode[];
  reason?: string;
  eligibilityByType?: Partial<Record<PayoutType, { eligible: boolean; reasonCodes: PayoutReasonCode[] }>>;
  maximumAdvanceAmount?: Money;
}

export interface PayoutPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PayoutAccountSnapshot {
  bankName: string;
  accountNumberMasked: string;
  accountHolder: string;
}

export interface PayoutQuote {
  quoteId: string;
  eventId: string;
  type: PayoutType;
  expiresAt: string;
  accountVersion: string | number;
  grossAmount: Money;
  deductions: Money;
  availableAmount: Money;
  maximumAmount: Money;
  payoutFee: Money;
  expectedTransferAmount: Money;
  processingTime?: string;
  eligible: boolean;
  reasonCodes: PayoutReasonCode[];
  account?: PayoutAccountSnapshot;
}

export interface PayoutDetail extends PayoutResponse {
  eventName?: string;
  eventEndAt?: string;
  accountSnapshot?: PayoutAccountSnapshot;
  timeline: PayoutTimelineEntry[];
  allowedActions: string[];
  receiptUrl?: string;
  transactionReference?: string;
  payoutAccountVerified?: boolean;
  transferReceiptUrl?: string;
}

export type AdminPayoutRequestType = "ADVANCE" | "FINAL_SETTLEMENT";

export interface AdminPayoutRow extends PayoutResponse {
  requestType?: AdminPayoutRequestType;
  eventName?: string;
  allowedActions?: string[];
  accountSnapshot?: PayoutAccountSnapshot;
  accountHolderSnapshot?: string;
  maskedAccountNumber?: string;
  bankNameSnapshot?: string;
  transferReference?: string;
  transactionReference?: string;
  payoutAccountVerified?: boolean;
  transferReceiptUrl?: string;
  receiptUrl?: string;
}

export interface AdminPayoutDetail extends PayoutDetail {
  requestType?: AdminPayoutRequestType;
  reconciliation?: {
    grossCollected: Money;
    platformFees: Money;
    refunds: Money;
    heldAmount: Money;
    advancesPaid: Money;
    settlementsPaid: Money;
    reservedAmount: Money;
    settlementAvailable: Money;
    confirmedAt?: string;
  };
  advancePolicy?: {
    snapshotRate: number;
    currentRate: number;
    policySource: "SYSTEM" | "ORGANIZER" | "EVENT";
    baseAmount: Money;
    cumulativeLimit: Money;
    alreadyPaid: Money;
    otherReservations: Money;
    currentReservation: Money;
  };
  checks?: { code: string; label: string; passed: boolean; detail?: string }[];
  internalNotes?: { note: string; createdAt: string; author: string }[];
  rejectionReason?: string;
  transactionReference?: string;
  receiptUrl?: string;
  transferReceiptUrl?: string;
  payoutAccountVerified?: boolean;
}

export interface AdminReconciliationQueueItem {
  eventId: string;
  eventName: string;
  organizerUserId?: string;
  grossCollected: Money;
  platformFees: Money;
  refunds: Money;
  heldAmount: Money;
  reconciliationStatus: string;
  confirmedAt?: string;
  reason?: string;
}

export interface AdminFinanceSummary {
  collectedRevenue: Money;
  platformFees: Money;
  heldAmount: Money;
  processingAmount: Money;
  paidAmount: Money;
  countsByStatus: Record<string, number>;
}

export interface AdminAdvancePolicy {
  advanceEnabled: boolean;
  advanceRate: number;
  processingTime?: string;
  version: number;
  updatedAt?: string;
  updatedBy?: string;
  reason?: string;
}

export interface AdminPolicyOverride {
  id: string;
  scope: "ORGANIZER" | "EVENT";
  targetId: string;
  targetName?: string;
  advanceRate: number;
  advanceEnabled: boolean;
  version: number;
  updatedBy?: string;
  updatedAt?: string;
}

export interface AdminPolicyAuditEntry {
  id: string;
  scope: string;
  targetId?: string;
  oldAdvanceRate?: number;
  newAdvanceRate?: number;
  oldEnabled?: boolean;
  newEnabled?: boolean;
  oldProcessingTime?: string;
  newProcessingTime?: string;
  reason: string;
  actorId: string;
  changedAt: string;
}

export interface AdminReconciliationRequest {
  organizerUserId: string;
  grossCollected: Money;
  platformFees: Money;
  refunds: Money;
  heldAmount: Money;
  reason: string;
}

export interface AdminReconciliationResponse extends AdminReconciliationRequest {
  eventId: string;
  confirmedAt: string;
  confirmedBy: string;
  version: number;
}

export interface PayoutTimelineEntry {
  status: PayoutStatus;
  occurredAt: string;
  publicMessage?: string;
}

export interface PayoutAccount {
  bankName?: string;
  accountNumber?: string;
  accountNumberMasked?: string;
  accountHolder?: string;
  verified?: boolean;
  isVerified?: boolean;
  version?: string | number;
  accountVersion?: number;
}
