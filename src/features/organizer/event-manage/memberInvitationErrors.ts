export interface ApiFailure {
  status?: number;
  code: string;
  retryAfterSeconds?: number;
}

// make sure the error is an AxiosError with a response object before accessing its properties
export function readApiFailure(error: unknown): ApiFailure {
  const response = (error as { response?: { status?: number; data?: unknown; headers?: unknown } } | null)?.response;
  const data = response?.data;
  let raw = "";
  if (typeof data === "string") raw = data;
  else if (data && typeof data === "object") {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string") raw = message;
  }
  return { status: response?.status, code: raw.trim(), retryAfterSeconds: readRetryAfter(response?.headers) };
}

function readRetryAfter(headers: unknown): number | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const bag = headers as Record<string, unknown> & { get?: (name: string) => unknown };
  const value = bag["retry-after"] ?? bag["Retry-After"] ?? (typeof bag.get === "function" ? bag.get("retry-after") : undefined);
  const seconds = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : NaN;
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined;
}

const KNOWN_CODES = [
  "INVITATION_PENDING",
  "ALREADY_MEMBER",
  "INVITATION_RATE_LIMITED",
  "CANNOT_INVITE_YOURSELF",
  "CANNOT_INVITE_OWNER",
  "INVALID_EMAIL",
  "FORBIDDEN_ROLE",
  "INVITATION_NOT_RESENDABLE",
  "INVITATION_NOT_FOUND",
] as const;

export type InvitationErrorCode = (typeof KNOWN_CODES)[number];

// return error code if it is a known invitation error
export function matchInvitationCode(failure: ApiFailure): InvitationErrorCode | null {
  return KNOWN_CODES.find((code) => failure.code.includes(code)) ?? null;
}

export interface InvitationErrorMessage {
  key: string;
  params?: Record<string, unknown>;
}

// select key for i18n message based on error code, or fallback key if unknown
export function describeInvitationFailure(error: unknown, fallbackKey: string): InvitationErrorMessage {
  const failure = readApiFailure(error);
  let code = matchInvitationCode(failure);
  if (code === "INVITATION_NOT_FOUND") code = null;
  if (!code) {
    if (failure.status === 429) code = "INVITATION_RATE_LIMITED";
    else if (failure.status === 403) code = "FORBIDDEN_ROLE";
    else if (failure.status === 422) code = "CANNOT_INVITE_OWNER";
  }
  if (code === "INVITATION_RATE_LIMITED" && failure.retryAfterSeconds) {
    return { key: "members.invitation.error.INVITATION_RATE_LIMITED_RETRY", params: { seconds: failure.retryAfterSeconds } };
  }
  return code ? { key: `members.invitation.error.${code}` } : { key: fallbackKey };
}
