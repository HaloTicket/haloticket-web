/** Vai trò của thành viên trong ban tổ chức sự kiện. */
export type MemberRole = "OWNER" | "ADMIN" | "MANAGER" | "CHECKIN_STAFF";
/** Trạng thái của thành viên hoặc lời mời tham gia. */
export type MemberStatus = "ACTIVE" | "PENDING" | "EXPIRED" | "DECLINED" | "REVOKED";

/** Một thành viên của sự kiện: thông tin, vai trò, trạng thái và hạn lời mời. */
export interface MemberItem {
  id: string;
  /** Mã người dùng chuẩn (canonical userId), khác với mã phân công `id`. */
  userId?: string | null;
  name: string;
  email: string;
  avatar?: string;
  // các phản hồi cũ đặt tên trường ảnh đại diện khác nhau
  avatar_url?: string;
  avatarUrl?: string;
  role: MemberRole;
  status: MemberStatus | (string & {});
  addedAt: string;
  invitationExpiresAt?: string | null;
}

/** Bản xem trước lời mời tham gia sự kiện trước khi người dùng chấp nhận. */
export interface MemberInvitationPreview {
  eventId: string;
  eventTitle: string;
  role: MemberRole;
  expiresAt: string;
  state: "PENDING";
}

/** Kết quả sau khi chấp nhận lời mời: sự kiện và vai trò được giao. */
export interface MemberInvitationAcceptResult {
  eventId: string;
  role: MemberRole;
}
