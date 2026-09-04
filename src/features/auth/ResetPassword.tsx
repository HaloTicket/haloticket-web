import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiCheckCircle } from "react-icons/fi";
import { PasswordField } from "@/features/auth/PasswordField";
import { PasswordRequirements } from "@/features/auth/PasswordRequirements";
import { isPasswordValid } from "@/features/auth/passwordRules";
import { getAuthErrorMessage, secondsUntil } from "@/features/auth/authApi";
import { PATHS } from "@/routes/paths";

export interface PasswordResetData {
  resetToken: string;
  password: string;
}

interface ResetPasswordProps {
  onSubmit: (data: PasswordResetData) => Promise<void>;
}

export default function ResetPassword({ onSubmit }: ResetPasswordProps) {
  const location = useLocation();
  const recovery = location.state as {
    resetToken?: string;
    expiresAt?: string;
    identifier?: string;
  } | null;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string>();
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
      return setError("Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");

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
          Đặt lại mật khẩu
        </h1>
        <p className="auth-subtitle">
          {recovery?.identifier
            ? `Tạo mật khẩu mới cho ${recovery.identifier}`
            : "Tạo mật khẩu mới cho tài khoản của bạn"}
        </p>
      </div>

      {done ? (
        <div className="auth-result">
          <div className="auth-result-icon">
            <FiCheckCircle size={40} />
          </div>
          <p className="auth-result-copy">
            Mật khẩu đã được cập nhật thành công! Bây giờ bạn có thể đăng nhập lại.
          </p>
          <Link
            to={PATHS.LOGIN}
            className="auth-button"
          >
            Đăng nhập ngay
          </Link>
        </div>
      ) : (
        <form className="auth-form" noValidate onSubmit={handleSubmit}>
          <PasswordField
            autoComplete="new-password"
            id="reset-password"
            label="Mật khẩu mới"
            onChange={setPassword}
            placeholder="Nhập mật khẩu mới"
            value={password}
          />

          <PasswordField
            autoComplete="new-password"
            error={
              Boolean(confirmPassword) && password !== confirmPassword
                ? "Mật khẩu xác nhận chưa khớp."
                : undefined
            }
            id="reset-confirm-password"
            label="Nhập lại mật khẩu mới"
            onChange={setConfirmPassword}
            placeholder="Nhập lại mật khẩu mới"
            value={confirmPassword}
          />

          <PasswordRequirements password={password} />

          {error && (
            <div
              className="auth-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            className="auth-button"
            disabled={!canSubmit || isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
          </button>

          <div className="auth-link-row">
            <Link
              className="auth-link"
              to={PATHS.LOGIN}
            >
              Quay lại đăng nhập
            </Link>
          </div>
        </form>
      )}
    </section>
  );
}
