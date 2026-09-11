export type EkycVerificationStatus =
  | "NOT_STARTED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REVOKED"
  | "EXPIRED"
  | "REQUIRES_UPDATE";

export const EKYC_STATUS_LABELS: Record<EkycVerificationStatus, string> = {
  NOT_STARTED: "Chưa xác minh",
  PENDING: "Đang chờ xét duyệt",
  APPROVED: "Đã xác minh danh tính",
  REJECTED: "Xác minh không được chấp thuận",
  REVOKED: "Xác minh đã bị thu hồi",
  EXPIRED: "Giấy tờ xác minh đã hết hạn",
  REQUIRES_UPDATE: "Cần cập nhật thông tin",
};

export type EkycAttemptStatus =
  | "CREATED"
  | "PROCESSING"
  | "PASSED"
  | "FAILED"
  | "MANUAL_REVIEW"
  | "EXPIRED"
  | "ERROR";

export interface SessionResponse {
  sessionId: string;
  status: EkycAttemptStatus;
  expiresAt: string;
}

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

export interface OrganizerEligibilityResponse {
  eligible: boolean;
  userId?: string;
  identityVersion?: number;
  reasonCode?: string;
}
