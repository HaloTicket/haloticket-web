export const MEMBER_INVITATION_TOKEN_KEY = "haloticket_member_invitation_token";
export const MEMBER_INVITATION_TOKEN_TTL_MS = 30 * 60 * 1000;

/** Lưu token lời mời thành viên vào `sessionStorage` kèm thời điểm lưu. */
export function saveMemberInvitationToken(token: string, now = Date.now()): void {
  try {
    sessionStorage.setItem(MEMBER_INVITATION_TOKEN_KEY, JSON.stringify({ token, savedAt: now }));
  } catch {
        // `sessionStorage` có thể bị tắt; khi đó token chỉ tồn tại trong bộ nhớ ở lần xem trang này.
  }
}

/** Xóa token lời mời đã lưu. */
export function clearMemberInvitationToken(): void {
  try {
    sessionStorage.removeItem(MEMBER_INVITATION_TOKEN_KEY);
  } catch {
    // ignore
  }
}

/** Đọc token lời mời đã lưu; trả về chuỗi rỗng nếu không có, đã quá 30 phút hoặc dữ liệu hỏng (và xóa token đó). */
export function loadMemberInvitationToken(now = Date.now()): string {
  try {
    const raw = sessionStorage.getItem(MEMBER_INVITATION_TOKEN_KEY);
    if (!raw) return "";
    const saved = JSON.parse(raw) as { token?: unknown; savedAt?: unknown };
    if (
      typeof saved.token === "string" && saved.token &&
      typeof saved.savedAt === "number" &&
      now - saved.savedAt >= 0 && now - saved.savedAt < MEMBER_INVITATION_TOKEN_TTL_MS
    ) {
      return saved.token;
    }
    clearMemberInvitationToken();
  } catch {
    clearMemberInvitationToken();
  }
  return "";
}

/** Lấy `token` từ phần hash của URL (`#token=...`); trả về chuỗi rỗng nếu không có. */
export function readTokenFromHash(hash: string): string {
  const match = /^#(.*)$/.exec(hash);
  if (!match) return "";
  return new URLSearchParams(match[1]).get("token") ?? "";
}
