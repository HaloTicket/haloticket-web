/** Hồ sơ người dùng hiện tại. */
export interface UserProfile {
  id?: string;
  keycloakId?: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  status?: "ACTIVE" | "INACTIVE" | "BANNED";
  roles?: string[];
  createdAt?: string;
}

/** Dữ liệu cập nhật hồ sơ cá nhân. */
export interface UserProfileUpdateRequest {
  fullName: string;
  phoneNumber?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  avatarUrl?: string;
}

/** Phần payload của JWT mà giao diện đọc: id, email, tên và các vai trò. */
export interface JwtPayload {
  iss?: string;
  sub?: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  realm_access?: {
    roles?: string[];
  };
  resource_access?: Record<string, { roles?: string[] }>;
}

/** Một dòng trong danh sách người dùng của admin. */
export interface AdminUserListItem {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  avatarUrl: string;
  gender: string;
  status: string;
  roles: string[];
  createdAt: string;
  ekycStatus: string;
}

/** Chi tiết người dùng cho admin, gồm thông tin eKYC, ngân hàng và thuế. */
export interface AdminUserDetailResponse {
  id: string;
  keycloakId: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  avatarUrl: string;
  gender: string;
  status: string;
  roles: string[];
  createdAt: string;
  lastLoginAt: string;
  
  // Thông tin eKYC
  ekycStatus: string;
  ekycDocumentType: string;
  ekycDocumentNumber: string;
  ekycLegalName: string;
  ekycBirthDate: string;
  ekycAddress: string;
  ekycFrontImageUrl: string;
  ekycBackImageUrl: string;
  ekycFaceVideoUrl: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBranch: string;
  businessType: string;
  taxName: string;
  taxCode: string;
  taxAddress: string;
  ekycApprovedAt: string;
}
