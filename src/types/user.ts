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

export interface UserProfileUpdateRequest {
  fullName: string;
  phoneNumber?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  avatarUrl?: string;
}

export interface JwtPayload {
  sub?: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  realm_access?: {
    roles?: string[];
  };
  resource_access?: Record<string, { roles?: string[] }>;
}

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
  
  // Ekyc info
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
