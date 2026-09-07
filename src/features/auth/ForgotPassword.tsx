import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiUser } from "react-icons/fi";
import { PATHS } from "@/routes/paths";
import { getAuthErrorMessage, secondsUntil, type LocalizedError } from "@/services/authApi";

export interface PasswordRecoveryRequest {
  identifier: string;
}

interface Challenge {
  challengeId: string;
  expiresAt: string;
  resendAvailableAt: string;
}

interface ForgotPasswordProps {
  onSubmit: (data: PasswordRecoveryRequest) => Promise<Challenge>;
  onVerifyOtp: (
    challengeId: string,
    otp: string
  ) => Promise<{ resetToken: string; expiresAt: string }>;
  onResendOtp: (challengeId: string) => Promise<Challenge>;
}

export default function ForgotPassword({
  onSubmit,
  onVerifyOtp,
  onResendOtp,
}: ForgotPasswordProps) {
  useTranslation();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [challenge, setChallenge] = useState<Challenge>();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<LocalizedError>();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setError(undefined);
    setIsSubmitting(true);
    try {
      const result = await onSubmit({ identifier: identifier.trim() });
      setChallenge(result);
      setStep("otp");
      setCooldown(secondsUntil(result.resendAvailableAt));
    } catch (submitError) {
      setError(
        getAuthErrorMessage(submitError, "Không thể gửi mã xác minh.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    if (!/^\d{6}$/.test(otp)) return setError({ key: "Mã OTP gồm đúng 6 chữ số." });
    if (!challenge || secondsUntil(challenge.expiresAt) === 0)
      return setError({ key: "Mã OTP đã hết hạn. Vui lòng gửi lại mã mới." });

    setIsSubmitting(true);
    try {
      const result = await onVerifyOtp(challenge.challengeId, otp);
      navigate(PATHS.RESET_PASSWORD, {
        state: {
          resetToken: result.resetToken,
          expiresAt: result.expiresAt,
          identifier: identifier.trim(),
        },
      });
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
    <section className="auth-panel">
      <div className="auth-heading">
        <h1 className="auth-title">
          {step === "form" ? translate("Quên mật khẩu") : translate("Xác minh OTP")}
        </h1>
        <p className="auth-subtitle">
          {step === "form"
            ? translate("Nhập email hoặc số điện thoại đã đăng ký")
            : translate("Mã xác minh đã được gửi tới email đăng ký của bạn")}
        </p>
      </div>

      {step === "form" ? (
        <form className="auth-form" onSubmit={requestOtp}>
          <div>
            <label
              className="auth-label"
              htmlFor="forgot-identifier"
            >
              {translate("Email hoặc số điện thoại")}</label>
            <div className="auth-input-shell">
              <div className="auth-input-icon">
                <FiUser aria-hidden="true" />
              </div>
              <input
                autoComplete="username"
                className="auth-input auth-input--icon"
                id="forgot-identifier"
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={translate("email@example.com hoặc 0912 345 678")}
                required
                type="text"
                value={identifier}
              />
            </div>
          </div>

          {error && (
            <div
              className="auth-error"
              role="alert"
            >
              {translate(error.key, error.values)}
            </div>
          )}

          <button
            className="auth-button"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? translate("Đang gửi mã...") : translate("Gửi mã OTP")}
          </button>

          <div className="auth-divider" aria-hidden="true">
            <span>{translate("HOẶC")}</span>
          </div>

          <div className="auth-switch">
            <Link
              className="auth-link"
              to={PATHS.LOGIN}
            >
              {translate("Quay lại đăng nhập")}</Link>
          </div>
        </form>
      ) : (
        <form className="auth-form" onSubmit={verifyOtp}>
          <div>
            <label
              className="auth-label"
              htmlFor="forgot-otp"
            >
              {translate("Mã OTP 6 số")}</label>
            <input
              autoComplete="one-time-code"
              className="auth-input auth-otp"
              id="forgot-otp"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, ""))
              }
              placeholder="000000"
              required
              value={otp}
            />
          </div>

          {error && (
            <div
              className="auth-error"
              role="alert"
            >
              {translate(error.key, error.values)}
            </div>
          )}

          <button
            className="auth-button"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? translate("Đang xác minh...") : translate("Xác minh OTP")}
          </button>

          <div className="auth-link-row">
            <button
              className="auth-secondary-button"
              disabled={Boolean(cooldown) || isSubmitting}
              onClick={resendOtp}
              type="button"
            >
              {cooldown ? translate("Gửi lại mã sau {{seconds}}s", { seconds: cooldown }) : translate("Gửi lại mã OTP")}
            </button>
          </div>

          <div className="auth-link-row">
            <button
              onClick={() => setStep("form")}
              type="button"
              className="auth-back-link"
            >
              {translate("← Thay đổi thông tin nhận mã")}</button>
          </div>
        </form>
      )}
    </section>
  );
}
