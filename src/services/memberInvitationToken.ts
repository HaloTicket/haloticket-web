export const MEMBER_INVITATION_TOKEN_KEY = "haloticket_member_invitation_token";
export const MEMBER_INVITATION_TOKEN_TTL_MS = 30 * 60 * 1000;

export function saveMemberInvitationToken(token: string, now = Date.now()): void {
  try {
    sessionStorage.setItem(MEMBER_INVITATION_TOKEN_KEY, JSON.stringify({ token, savedAt: now }));
  } catch {
    // sessionStorage may be disabled; the token then only lives in memory for this page view.
  }
}

export function clearMemberInvitationToken(): void {
  try {
    sessionStorage.removeItem(MEMBER_INVITATION_TOKEN_KEY);
  } catch {
    // ignore
  }
}

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

export function readTokenFromHash(hash: string): string {
  const match = /^#(.*)$/.exec(hash);
  if (!match) return "";
  return new URLSearchParams(match[1]).get("token") ?? "";
}
