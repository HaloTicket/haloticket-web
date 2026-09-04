import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/common/Button";
import { PasswordField } from "@/features/auth/PasswordField";
import { PATHS } from "@/routes/paths";
import { getAuthErrorMessage } from "@/features/auth/authApi";
import TermsNotice from "@/features/auth/TermsNotice";

export interface LoginCredentials { email: string; password: string; }
interface LoginProps { onSubmit: (credentials: LoginCredentials) => Promise<void>; }

export default function Login({ onSubmit }: LoginProps) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState<string>(); const [isSubmitting, setIsSubmitting] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(undefined); setIsSubmitting(true); try { await onSubmit({ email: email.trim(), password }); } catch (submitError) { setError(getAuthErrorMessage(submitError, "Không thể đăng nhập. Vui lòng thử lại.")); } finally { setIsSubmitting(false); } }
  return <section className="auth-panel"><div className="auth-heading"><p className="auth-eyebrow">HALOTICKET / ACCOUNT</p><h1 className="auth-title">Đăng nhập</h1><p className="auth-subtitle">Chào mừng bạn trở lại với HaloTicket</p></div><form className="auth-form" onSubmit={handleSubmit}><div><label className="auth-label" htmlFor="login-email">Email</label><input autoComplete="email" className="auth-input" id="login-email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required type="email" value={email} /></div><PasswordField autoComplete="current-password" id="login-password" label="Mật khẩu" onChange={setPassword} placeholder="Nhập mật khẩu" value={password} />{error && <p className="auth-error" role="alert">{error}</p>}<div className="flex justify-end"><Link className="auth-link inline-flex min-h-11 items-center text-sm" to={PATHS.FORGOT_PASSWORD}>Quên mật khẩu?</Link></div><Button className="auth-button" disabled={isSubmitting} type="submit">{isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}</Button></form><TermsNotice /><p className="auth-switch app-text-muted">Chưa có tài khoản? <Link className="auth-link" to={PATHS.REGISTER}>Đăng ký ngay</Link></p></section>;
}
