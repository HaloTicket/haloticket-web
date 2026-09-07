export interface UserProfile {
  id?: string;
  keycloakId?: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  isActive?: boolean;
  gender?: "MALE" | "FEMALE" | "OTHER";
  status?: string;
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
