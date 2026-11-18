/** Thông tin lỗi API đã chuẩn hóa: mã HTTP, mã lỗi nghiệp vụ (lấy từ thông điệp) và số giây chờ thử lại nếu có. */
export interface ApiFailure {
  status?: number;
  code: string;
  retryAfterSeconds?: number;
}

/**
 * Đọc lỗi trả về từ API thành {@code ApiFailure}. Không giả định lỗi là AxiosError: kiểm tra có đối tượng {@code response} rồi mới đọc thuộc tính.
 * Mã lỗi lấy từ thân phản hồi (chuỗi hoặc trường {@code message}).
 * @param error - lỗi bắt được từ lời gọi API
 * @returns {@code ApiFailure} gồm status, code và retryAfterSeconds
 */
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

/** Đọc header {@code Retry-After} (dạng số giây, hỗ trợ cả headers dạng Axios có {@code get}); trả về {@code undefined} nếu không hợp lệ hoặc không dương, làm tròn lên. */
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

/** Tập mã lỗi lời mời thành viên đã biết. */
export type InvitationErrorCode = (typeof KNOWN_CODES)[number];

/** Tìm mã lỗi lời mời đã biết trong mã lỗi của {@code failure}; trả về {@code null} nếu không khớp mã nào. */
export function matchInvitationCode(failure: ApiFailure): InvitationErrorCode | null {
  return KNOWN_CODES.find((code) => failure.code.includes(code)) ?? null;
}

/** Thông điệp lỗi lời mời dưới dạng khóa i18n kèm tham số nội suy. */
export interface InvitationErrorMessage {
  key: string;
  params?: Record<string, unknown>;
}

/**
 * Chọn khóa i18n cho thông báo lỗi lời mời theo mã lỗi; nếu không nhận ra mã thì suy từ HTTP status (429, 403, 422), không được thì dùng khóa dự phòng.
 * {@code INVITATION_NOT_FOUND} bị bỏ qua để rơi về khóa dự phòng. Với 429 có {@code Retry-After} thì trả khóa kèm số giây.
 * @param error - lỗi bắt được từ lời gọi API
 * @param fallbackKey - khóa i18n dùng khi không xác định được nguyên nhân
 */
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
