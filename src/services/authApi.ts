import axios, { AxiosError } from "axios";
import axiosClient from "@/services/axiosClient";

export const AUTH_ENDPOINTS = {
  login: "/auth/login",
  registerStart: "/auth/register/start",
  registerVerify: "/auth/register/verify",
  registerResend: "/auth/register/resend",
  forgotStart: "/auth/password/forgot",
  forgotVerify: "/auth/password/verify",
  forgotResend: "/auth/password/resend",
  resetPassword: "/auth/password/reset",
} as const;

/** Phản hồi khi máy chủ tạo một thử thách OTP: mã thử thách, thời điểm hết hạn và thời điểm được gửi lại. */
export interface AuthChallengeResponse {
  challengeId: string;
  expiresAt: string;
  resendAvailableAt: string;
}

/** Phản hồi đăng nhập bằng mật khẩu: access token và các token tùy chọn kèm thời hạn. */
export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
}

/** Phản hồi sau khi xác thực OTP quên mật khẩu: token đặt lại mật khẩu và thời điểm hết hạn. */
export interface PasswordResetVerificationResponse {
  resetToken: string;
  expiresAt: string;
}

/** Lỗi API đã chuẩn hóa, mang mã HTTP, mã lỗi nghiệp vụ, số giây chờ thử lại và số lần thử còn lại. */
export interface ApiError extends Error {
  status?: number;
  code?: string;
  retryAfterSeconds?: number;
  attemptsRemaining?: number;
}

/** Thông điệp lỗi cần dịch: `key` là khóa hoặc nội dung mẫu, `values` là giá trị thay vào mẫu. */
export interface LocalizedError {
  key: string;
  values?: Record<string, string | number>;
}

/** Chuyển lỗi bất kỳ thành `ApiError`: lấy thông điệp, mã lỗi, thời gian chờ từ phản hồi của máy chủ, nếu không phải lỗi Axios thì dùng thông điệp dự phòng. */
function toApiError(error: unknown, fallback: string): ApiError {
  if (!axios.isAxiosError(error)) return Object.assign(new Error(fallback), { status: undefined });
  const axiosError = error as AxiosError<{ message?: string; code?: string; retryAfterSeconds?: number; attemptsRemaining?: number }>;
  const data = axiosError.response?.data;
  const message = data?.message || fallback;
  return Object.assign(new Error(message), {
    status: axiosError.response?.status,
    code: data?.code,
    retryAfterSeconds: data?.retryAfterSeconds,
    attemptsRemaining: data?.attemptsRemaining,
  });
}

/** Chạy một thao tác gọi API và đổi mọi lỗi ném ra thành `ApiError` với thông điệp dự phòng. */
async function request<T>(operation: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toApiError(error, fallback);
  }
}

export const authApi = {
  /** Đăng nhập bằng email và mật khẩu. */
  login: (email: string, password: string) => request<LoginResponse>(
    () => axiosClient.post(AUTH_ENDPOINTS.login, { email, password }),
    "Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu.",
  ),
  /** Bắt đầu đăng ký: gửi mã OTP tới email, kèm khóa idempotency. */
  registerStart: (email: string, password: string, idempotencyKey: string) => request<AuthChallengeResponse>(
    () => axiosClient.post(AUTH_ENDPOINTS.registerStart, { email, password, idempotencyKey }),
    "Không thể gửi mã xác minh đăng ký.",
  ),
  /** Xác thực mã OTP để hoàn tất đăng ký. */
  registerVerify: (challengeId: string, email: string, password: string, otp: string) => request<void>(
    () => axiosClient.post(AUTH_ENDPOINTS.registerVerify, { challengeId, email, password, otp }),
    "Mã OTP đăng ký không hợp lệ hoặc đã hết hạn.",
  ),
  /** Gửi lại mã OTP đăng ký. */
  registerResend: (challengeId: string) => request<AuthChallengeResponse>(
    () => axiosClient.post(AUTH_ENDPOINTS.registerResend, { challengeId }),
    "Không thể gửi lại mã OTP đăng ký.",
  ),
  /** Bắt đầu quên mật khẩu: gửi mã OTP tới định danh người dùng, kèm khóa idempotency. */
  forgotStart: (identifier: string, idempotencyKey: string) => request<AuthChallengeResponse>(
    () => axiosClient.post(AUTH_ENDPOINTS.forgotStart, { identifier, idempotencyKey }),
    "Không thể gửi mã khôi phục mật khẩu.",
  ),
  /** Xác thực mã OTP quên mật khẩu, trả về token đặt lại mật khẩu. */
  forgotVerify: (challengeId: string, otp: string) => request<PasswordResetVerificationResponse>(
    () => axiosClient.post(AUTH_ENDPOINTS.forgotVerify, { challengeId, otp }),
    "Mã OTP khôi phục không hợp lệ hoặc đã hết hạn.",
  ),
  /** Gửi lại mã OTP quên mật khẩu. */
  forgotResend: (challengeId: string) => request<AuthChallengeResponse>(
    () => axiosClient.post(AUTH_ENDPOINTS.forgotResend, { challengeId }),
    "Không thể gửi lại mã OTP khôi phục.",
  ),
  /** Đặt mật khẩu mới bằng token đặt lại. */
  resetPassword: (resetToken: string, password: string) => request<void>(
    () => axiosClient.post(AUTH_ENDPOINTS.resetPassword, { resetToken, password }),
    "Không thể đặt lại mật khẩu.",
  ),
};

/** Quy lỗi xác thực về khóa thông điệp hiển thị: xử lý riêng các mã 429 (thử quá nhiều), 410 (OTP hết hạn), 423 (OTP bị khóa), 409 (email đã đăng ký), còn lại dùng thông điệp của lỗi hoặc `fallback`. */
export function getAuthErrorMessage(error: unknown, fallback: string): LocalizedError {
  const apiError = error as Partial<ApiError>;
  if (apiError.status === 429) {
    return apiError.retryAfterSeconds
      ? { key: "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau {{seconds}}s.", values: { seconds: apiError.retryAfterSeconds } }
      : { key: "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau." };
  }
  if (apiError.status === 410 || apiError.code === "OTP_EXPIRED") return { key: "Mã OTP đã hết hạn. Vui lòng gửi lại mã mới." };
  if (apiError.status === 423 || apiError.code === "OTP_LOCKED") return { key: "Mã OTP đã bị khóa do nhập sai quá nhiều lần." };
  if (apiError.status === 409 || apiError.code === "USER_ALREADY_EXISTS") return { key: "Email này đã được đăng ký. Vui lòng đăng nhập." };
  return { key: error instanceof Error ? error.message : fallback };
}

/** Số giây còn lại tới một mốc thời gian ISO (làm tròn lên, tối thiểu 0); trả về 0 nếu không có mốc. */
export function secondsUntil(isoDate: string | undefined, now = Date.now()): number {
  if (!isoDate) return 0;
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - now) / 1000));
}

/** Tạo khóa idempotency ngẫu nhiên có tiền tố, dùng cho các bước bắt đầu đăng ký và quên mật khẩu. */
export function createIdempotencyKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
