import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiMail, FiAlertCircle } from "react-icons/fi";
import { GoogleAuthButton, PasswordField } from "@/features/auth/components";
import { PATHS } from "@/routes/paths";
import { getAuthErrorMessage, type LocalizedError } from "@/services/authApi";

export interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>;
  onGoogleLogin: () => Promise<void>;
}

export default function Login({ onSubmit, onGoogleLogin }: LoginProps) {
  useTranslation();
  const [searchParams] = useSearchParams();
  const isSessionExpired = searchParams.get("session_expired") === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<LocalizedError>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsSubmitting(true);
    try {
      await onSubmit({ email: email.trim(), password });
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError, "Không thể đăng nhập. Vui lòng thử lại."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-panel auth-panel--login">
      <div className="auth-heading">
        <h1 className="auth-title">{translate("Đăng nhập")}</h1>
        <p className="auth-subtitle">{translate("Chào mừng bạn quay trở lại!")}</p>
      </div>

      {isSessionExpired && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
          <FiAlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.</span>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>

        <div>
          <label className="auth-label" htmlFor="login-email">
            Email
          </label>
          <div className="auth-input-shell">
            <div className="auth-input-icon">
              <FiMail aria-hidden="true" />
            </div>
            <input
              autoComplete="email"
              className="auth-input auth-input--icon"
              id="login-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder={translate("Nhập email của bạn")}
              required
              type="email"
              value={email}
            />
          </div>
        </div>

        {/* Password Field */}
        <PasswordField
          autoComplete="current-password"
          id="login-password"
          label={translate("Mật khẩu")}
          onChange={setPassword}
          placeholder={translate("Nhập mật khẩu của bạn")}
          value={password}
        />

        {/* Error Alert */}
        {error && (
          <div className="auth-error" role="alert">
            {translate(error.key, error.values)}
          </div>
        )}

        <button
          className="auth-button"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? translate("Đang đăng nhập...") : translate("Đăng nhập")}
        </button>

        <div className="auth-link-row">
          <Link
            className="auth-link"
            to={PATHS.FORGOT_PASSWORD}
          >
            {translate("Quên mật khẩu?")}</Link>
        </div>

        <div className="auth-divider" aria-hidden="true">
          <span>{translate("HOẶC")}</span>
        </div>

        <GoogleAuthButton onClick={onGoogleLogin} />

        <div className="auth-switch">
          {translate("Chưa có tài khoản?")}{" "}
          <Link
            className="auth-link"
            to={PATHS.REGISTER}
          >
            {translate("Đăng ký ngay")}</Link>
        </div>
      </form>
    </section>
  );
}
