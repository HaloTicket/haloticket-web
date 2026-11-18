/** Các giá trị tiền từ endpoint rút tiền là chuỗi số nguyên thập phân tính bằng VND. */
export type Money = string;

/** Trạng thái của yêu cầu rút tiền; chấp nhận thêm chuỗi tùy ý để tương thích giá trị mới từ backend. */
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

/** Loại rút tiền: ứng trước hoặc quyết toán cuối. */
export type PayoutType = "ADVANCE" | "FINAL_SETTLEMENT";

/** Mã lý do giải thích vì sao một sự kiện chưa thể rút tiền (hoặc không rút được loại này). */
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

/** Một yêu cầu rút tiền của người tổ chức: số tiền, phí, trạng thái, ảnh chụp tài khoản nhận và dòng thời gian. */
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

/** Tổng quan tài chính của người tổ chức: doanh thu đã thu, số tiền khả dụng, đang xử lý và đã trả. */
export interface FinanceSummary {
  collectedRevenue: Money;
  availableAmount: Money;
  processingAmount: Money;
  paidAmount: Money;
  updatedAt: string;
}

/** Số liệu phân tích tài chính theo ngày (tổng thu và hoàn tiền) trong một khoảng ngày. */
export interface OrganizerFinanceAnalytics {
  from: string;
  to: string;
  series: { date: string; grossAmount: Money; refundAmount: Money }[];
  refundDataAvailable: boolean;
  refundDataNote?: string;
}

/** Tình hình đối soát và điều kiện rút tiền của một sự kiện: doanh thu, khấu trừ, số tiền bị giữ và khả dụng. */
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

/** Trang dữ liệu phân trang của danh sách rút tiền. */
export interface PayoutPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Ảnh chụp tài khoản nhận tiền (số tài khoản đã che) gắn với yêu cầu rút tiền. */
export interface PayoutAccountSnapshot {
  bankName: string;
  accountNumberMasked: string;
  accountHolder: string;
}

/** Báo giá rút tiền: số tiền tối đa, phí, số tiền dự kiến nhận, hạn hiệu lực và điều kiện đủ hay không. */
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

/** Chi tiết yêu cầu rút tiền: dòng thời gian, hành động được phép và thông tin biên lai. */
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

/** Loại yêu cầu rút tiền hiển thị cho admin. */
export type AdminPayoutRequestType = "ADVANCE" | "FINAL_SETTLEMENT";

/** Một dòng yêu cầu rút tiền trong hàng đợi của admin. */
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

/** Chi tiết yêu cầu rút tiền cho admin: đối soát, chính sách ứng trước, các bước kiểm tra và ghi chú nội bộ. */
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

/** Một sự kiện đang chờ admin đối soát, kèm các số tiền đề xuất. */
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

/** Tổng quan tài chính toàn nền tảng cho admin, kèm số lượng yêu cầu theo trạng thái. */
export interface AdminFinanceSummary {
  collectedRevenue: Money;
  platformFees: Money;
  heldAmount: Money;
  processingAmount: Money;
  paidAmount: Money;
  countsByStatus: Record<string, number>;
}

/** Chính sách ứng trước tiền mặc định của hệ thống (tỷ lệ, bật/tắt, thời gian xử lý, phiên bản). */
export interface AdminAdvancePolicy {
  advanceEnabled: boolean;
  advanceRate: number;
  processingTime?: string;
  version: number;
  updatedAt?: string;
  updatedBy?: string;
  reason?: string;
}

/** Ngoại lệ chính sách ứng trước áp dụng riêng cho một người tổ chức hoặc một sự kiện. */
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

/** Một dòng nhật ký kiểm toán khi chính sách ứng trước bị thay đổi (giá trị cũ, mới, lý do và người thay đổi). */
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

/** Dữ liệu admin gửi để xác nhận đối soát một sự kiện. */
export interface AdminReconciliationRequest {
  organizerUserId: string;
  grossCollected: Money;
  platformFees: Money;
  refunds: Money;
  heldAmount: Money;
  reason: string;
}

/** Kết quả xác nhận đối soát: dữ liệu đã xác nhận cùng người xác nhận, thời điểm và phiên bản. */
export interface AdminReconciliationResponse extends AdminReconciliationRequest {
  eventId: string;
  confirmedAt: string;
  confirmedBy: string;
  version: number;
}

/** Một mốc trong dòng thời gian xử lý yêu cầu rút tiền. */
export interface PayoutTimelineEntry {
  status: PayoutStatus;
  occurredAt: string;
  publicMessage?: string;
}

/** Tài khoản nhận tiền của người tổ chức, có hỗ trợ các tên trường cũ và mới cho trạng thái xác minh và phiên bản. */
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
