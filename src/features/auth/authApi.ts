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

export interface AuthChallengeResponse {
  challengeId: string;
  expiresAt: string;
  resendAvailableAt: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface PasswordResetVerificationResponse {
  resetToken: string;
  expiresAt: string;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  retryAfterSeconds?: number;
  attemptsRemaining?: number;
}

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

async function request<T>(operation: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toApiError(error, fallback);
  }
}

export const authApi = {
  login: (email: string, password: string) => request<LoginResponse>(
    () => axiosClient.post(AUTH_ENDPOINTS.login, { email, password }),
    "Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu.",
  ),
  registerStart: (email: string, password: string, idempotencyKey: string) => request<AuthChallengeResponse>(
    () => axiosClient.post(AUTH_ENDPOINTS.registerStart, { email, password, idempotencyKey }),
    "Không thể gửi mã xác minh đăng ký.",
  ),
  registerVerify: (challengeId: string, email: string, password: string, otp: string) => request<void>(
    () => axiosClient.post(AUTH_ENDPOINTS.registerVerify, { challengeId, email, password, otp }),
    "Mã OTP đăng ký không hợp lệ hoặc đã hết hạn.",
  ),
  registerResend: (challengeId: string) => request<AuthChallengeResponse>(
    () => axiosClient.post(AUTH_ENDPOINTS.registerResend, { challengeId }),
    "Không thể gửi lại mã OTP đăng ký.",
  ),
  forgotStart: (email: string, phoneNumber: string, idempotencyKey: string) => request<AuthChallengeResponse>(
    () => axiosClient.post(AUTH_ENDPOINTS.forgotStart, { email, phoneNumber, idempotencyKey }),
    "Không thể gửi mã khôi phục mật khẩu.",
  ),
  forgotVerify: (challengeId: string, otp: string) => request<PasswordResetVerificationResponse>(
    () => axiosClient.post(AUTH_ENDPOINTS.forgotVerify, { challengeId, otp }),
    "Mã OTP khôi phục không hợp lệ hoặc đã hết hạn.",
  ),
  forgotResend: (challengeId: string) => request<AuthChallengeResponse>(
    () => axiosClient.post(AUTH_ENDPOINTS.forgotResend, { challengeId }),
    "Không thể gửi lại mã OTP khôi phục.",
  ),
  resetPassword: (resetToken: string, password: string) => request<void>(
    () => axiosClient.post(AUTH_ENDPOINTS.resetPassword, { resetToken, password }),
    "Không thể đặt lại mật khẩu.",
  ),
};

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as Partial<ApiError>;
  if (apiError.status === 429) {
    return apiError.retryAfterSeconds ? `Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ${apiError.retryAfterSeconds}s.` : "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.";
  }
  if (apiError.status === 410 || apiError.code === "OTP_EXPIRED") return "Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.";
  if (apiError.status === 423 || apiError.code === "OTP_LOCKED") return "Mã OTP đã bị khóa do nhập sai quá nhiều lần.";
  return error instanceof Error ? error.message : fallback;
}

export function secondsUntil(isoDate: string | undefined, now = Date.now()): number {
  if (!isoDate) return 0;
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - now) / 1000));
}

export function createIdempotencyKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
