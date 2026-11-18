/** Trạng thái xác minh danh tính (eKYC) của một người dùng. */
export type EkycVerificationStatus =
  | "NOT_STARTED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REVOKED"
  | "EXPIRED"
  | "REQUIRES_UPDATE";

/** Nhãn tiếng Việt hiển thị cho từng trạng thái xác minh eKYC. */
export const EKYC_STATUS_LABELS: Record<EkycVerificationStatus, string> = {
  NOT_STARTED: "Chưa xác minh",
  PENDING: "Đang chờ xét duyệt",
  APPROVED: "Đã xác minh danh tính",
  REJECTED: "Xác minh không được chấp thuận",
  REVOKED: "Xác minh đã bị thu hồi",
  EXPIRED: "Giấy tờ xác minh đã hết hạn",
  REQUIRES_UPDATE: "Cần cập nhật thông tin",
};

/** Trạng thái của một lần thực hiện xác minh eKYC. */
export type EkycAttemptStatus =
  | "CREATED"
  | "PROCESSING"
  | "PASSED"
  | "FAILED"
  | "MANUAL_REVIEW"
  | "EXPIRED"
  | "ERROR";

/** Phản hồi khi tạo phiên xác minh eKYC: mã phiên, trạng thái và thời điểm hết hạn. */
export interface SessionResponse {
  sessionId: string;
  status: EkycAttemptStatus;
  expiresAt: string;
}

/** Trạng thái xác minh eKYC hiện tại và thông tin giấy tờ đã xác minh (nếu có). */
export interface EkycStatusResponse {
  status: EkycVerificationStatus;
  legalName?: string;
  documentNumber?: string;
  verifiedAt?: string;
  identityVersion?: number;
  reasonCode?: string;
  birthDate?: string;
  address?: string;
  documentExpiresOn?: string;
}

/** Kết quả kiểm tra người dùng có đủ điều kiện làm người tổ chức (đã xác minh eKYC) hay không. */
export interface OrganizerEligibilityResponse {
  eligible: boolean;
  userId?: string;
  identityVersion?: number;
  reasonCode?: string;
}
