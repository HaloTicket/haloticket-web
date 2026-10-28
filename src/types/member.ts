export type MemberRole = "OWNER" | "ADMIN" | "MANAGER" | "CHECKIN_STAFF";
export type MemberStatus = "ACTIVE" | "PENDING" | "EXPIRED" | "DECLINED" | "REVOKED";

export interface MemberItem {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  // older responses spell the picture differently
  avatar_url?: string;
  avatarUrl?: string;
  role: MemberRole;
  status: MemberStatus | (string & {});
  addedAt: string;
  invitationExpiresAt?: string | null;
}

export interface MemberInvitationPreview {
  eventId: string;
  eventTitle: string;
  role: MemberRole;
  expiresAt: string;
  state: "PENDING";
}

export interface MemberInvitationAcceptResult {
  eventId: string;
  role: MemberRole;
}
