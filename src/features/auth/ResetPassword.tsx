import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiCheckCircle } from "react-icons/fi";
import { PasswordField, PasswordRequirements } from "@/features/auth/components";
import { isPasswordValid } from "@/validation/passwordRules";
import { getAuthErrorMessage, secondsUntil, type LocalizedError } from "@/services/authApi";
import { PATHS } from "@/routes/paths";

export interface PasswordResetData {
  resetToken: string;
  password: string;
}

interface ResetPasswordProps {
  onSubmit: (data: PasswordResetData) => Promise<void>;
}

export default function ResetPassword({ onSubmit }: ResetPasswordProps) {
  useTranslation();
  const location = useLocation();
  const recovery = location.state as {
    resetToken?: string;
    expiresAt?: string;
    identifier?: string;
  } | null;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<LocalizedError>();
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    Boolean(recovery?.resetToken) &&
    secondsUntil(recovery?.expiresAt) > 0 &&
    isPasswordValid(password) &&
    password === confirmPassword;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    if (!canSubmit || !recovery?.resetToken)
      return setError({ key: "Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." });

    setIsSubmitting(true);
    try {
      await onSubmit({ resetToken: recovery.resetToken, password });
      setDone(true);
    } catch (submitError) {
      setError(
        getAuthErrorMessage(submitError, "Không thể đặt lại mật khẩu.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-panel">
      <div className="auth-heading">
        <h1 className="auth-title">
          {translate("Đặt lại mật khẩu")}</h1>
        <p className="auth-subtitle">
          {recovery?.identifier
            ? translate("Tạo mật khẩu mới cho {{identifier}}", { identifier: recovery.identifier })
            : translate("Tạo mật khẩu mới cho tài khoản của bạn")}
        </p>
      </div>

      {done ? (
        <div className="auth-result">
          <div className="auth-result-icon">
            <FiCheckCircle size={40} />
          </div>
          <p className="auth-result-copy">
            {translate("Mật khẩu đã được cập nhật thành công! Bây giờ bạn có thể đăng nhập lại.")}</p>
          <Link
            to={PATHS.LOGIN}
            className="auth-button"
          >
            {translate("Đăng nhập ngay")}</Link>
        </div>
      ) : (
        <form className="auth-form" noValidate onSubmit={handleSubmit}>
          <PasswordField
            autoComplete="new-password"
            id="reset-password"
            label={translate("Mật khẩu mới")}
            onChange={setPassword}
            placeholder={translate("Nhập mật khẩu mới")}
            value={password}
          />

          <PasswordField
            autoComplete="new-password"
            error={
              Boolean(confirmPassword) && password !== confirmPassword
                ? translate("Mật khẩu xác nhận chưa khớp.")
                : undefined
            }
            id="reset-confirm-password"
            label={translate("Nhập lại mật khẩu mới")}
            onChange={setConfirmPassword}
            placeholder={translate("Nhập lại mật khẩu mới")}
            value={confirmPassword}
          />

          <PasswordRequirements password={password} />

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
            disabled={!canSubmit || isSubmitting}
            type="submit"
          >
            {isSubmitting ? translate("Đang cập nhật...") : translate("Đặt lại mật khẩu")}
          </button>

          <div className="auth-link-row">
            <Link
              className="auth-link"
              to={PATHS.LOGIN}
            >
              {translate("Quay lại đăng nhập")}</Link>
          </div>
        </form>
      )}
    </section>
  );
}
