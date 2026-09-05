import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { FiMail, FiCheckCircle } from "react-icons/fi";
import {
  GoogleAuthButton,
  PasswordField,
  PasswordRequirements,
  TermsNotice,
} from "@/features/auth/components";
import { isPasswordValid } from "@/validation/passwordRules";
import { getAuthErrorMessage, secondsUntil } from "@/services/authApi";
import { PATHS } from "@/routes/paths";

export interface RegistrationData {
  email: string;
  password: string;
}

export interface RegistrationOtpData extends RegistrationData {
  otp: string;
  challengeId: string;
}

export interface AuthChallenge {
  challengeId: string;
  expiresAt: string;
  resendAvailableAt: string;
}

interface RegisterProps {
  onSubmit: (data: RegistrationData) => Promise<AuthChallenge>;
  onVerifyOtp: (data: RegistrationOtpData) => Promise<void>;
  onResendOtp: (challengeId: string) => Promise<AuthChallenge>;
  onGoogleLogin: () => Promise<void>;
}

export default function Register({ onSubmit, onVerifyOtp, onResendOtp, onGoogleLogin }: RegisterProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [challenge, setChallenge] = useState<AuthChallenge>();
  const [step, setStep] = useState<"form" | "otp" | "done">("form");
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canContinue =
    Boolean(email.trim()) &&
    isPasswordValid(password) &&
    Boolean(confirmPassword) &&
    password === confirmPassword;

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setInterval(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000
    );
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canContinue) return;
    setError(undefined);
    setIsSubmitting(true);
    try {
      const result = await onSubmit({ email: email.trim(), password });
      setChallenge(result);
      setStep("otp");
      setCooldown(secondsUntil(result.resendAvailableAt));
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError, "Không thể gửi mã xác minh."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    if (!/^\d{6}$/.test(otp)) return setError("Mã OTP gồm đúng 6 chữ số.");
    if (!challenge || secondsUntil(challenge.expiresAt) === 0)
      return setError("Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.");

    setIsSubmitting(true);
    try {
      await onVerifyOtp({
        email: email.trim(),
        password,
        otp,
        challengeId: challenge.challengeId,
      });
      setStep("done");
    } catch (submitError) {
      setError(
        getAuthErrorMessage(submitError, "Mã OTP không hợp lệ hoặc đã hết hạn.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendOtp() {
    if (!challenge || cooldown || isSubmitting) return;
    setError(undefined);
    setIsSubmitting(true);
    try {
      const result = await onResendOtp(challenge.challengeId);
      setChallenge(result);
      setCooldown(secondsUntil(result.resendAvailableAt));
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError, "Không thể gửi lại mã OTP."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-panel auth-panel--register">
      <div className="auth-heading">
        <h1 className="auth-title">
          {step === "form"
            ? "Đăng ký tài khoản"
            : step === "otp"
            ? "Xác minh email"
            : "Hoàn tất đăng ký"}
        </h1>
        <p className="auth-subtitle">
          {step === "form"
            ? "Tạo tài khoản để bắt đầu đặt vé"
            : step === "otp"
            ? `Nhập mã 6 số đã gửi tới ${email}`
            : "Tài khoản của bạn đã được tạo thành công."}
        </p>
      </div>

      {step === "done" ? (
        <div className="auth-result">
          <div className="auth-result-icon">
            <FiCheckCircle size={40} />
          </div>
          <p className="auth-result-copy">
            Email của bạn đã được xác minh thành công! Bây giờ bạn có thể đăng nhập.
          </p>
          <Link
            to={PATHS.LOGIN}
            className="auth-button"
          >
            Đăng nhập ngay
          </Link>
        </div>
      ) : step === "otp" ? (
        <form className="auth-form" onSubmit={verifyOtp}>
          <div>
            <label className="auth-label" htmlFor="register-otp">
              Mã OTP 6 số
            </label>
            <input
              autoComplete="one-time-code"
              className="auth-input auth-otp"
              id="register-otp"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              required
              value={otp}
            />
          </div>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button
            className="auth-button"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Đang xác minh..." : "Xác minh và tạo tài khoản"}
          </button>

          <div className="auth-link-row">
            <button
              className="auth-secondary-button"
              disabled={Boolean(cooldown) || isSubmitting}
              onClick={resendOtp}
              type="button"
            >
              {cooldown ? `Gửi lại mã sau ${cooldown}s` : "Gửi lại mã OTP"}
            </button>
          </div>

          <div className="auth-link-row">
            <button
              onClick={() => setStep("form")}
              type="button"
              className="auth-back-link"
            >
              ← Thay đổi email đăng ký
            </button>
          </div>
        </form>
      ) : (
        <form className="auth-form" noValidate onSubmit={requestOtp}>
          <div>
            <label className="auth-label" htmlFor="register-email">
              Email
            </label>
            <div className="auth-input-shell">
              <div className="auth-input-icon">
                <FiMail aria-hidden="true" />
              </div>
              <input
                autoComplete="email"
                className="auth-input auth-input--icon"
                id="register-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Nhập email của bạn"
                required
                type="email"
                value={email}
              />
            </div>
          </div>

          {/* Password Field */}
          <PasswordField
            autoComplete="new-password"
            id="register-password"
            label="Mật khẩu"
            onChange={setPassword}
            placeholder="Nhập mật khẩu"
            value={password}
          />

          {/* Confirm Password Field */}
          <PasswordField
            autoComplete="new-password"
            error={
              Boolean(confirmPassword) && password !== confirmPassword
                ? "Mật khẩu xác nhận chưa khớp."
                : undefined
            }
            id="register-confirm-password"
            label="Nhập lại mật khẩu"
            onChange={setConfirmPassword}
            placeholder="Nhập lại mật khẩu"
            value={confirmPassword}
          />

          <PasswordRequirements password={password} />

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button
            className="auth-button"
            disabled={!canContinue || isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Đang gửi mã..." : "Tiếp tục"}
          </button>

          <TermsNotice />

          <div className="auth-divider" aria-hidden="true">
            <span>HOẶC</span>
          </div>

          <GoogleAuthButton onClick={onGoogleLogin} />

          <div className="auth-switch">
            Đã có tài khoản?{" "}
            <Link
              className="auth-link"
              to={PATHS.LOGIN}
            >
              Đăng nhập ngay
            </Link>
          </div>
        </form>
      )}
    </section>
  );
}
