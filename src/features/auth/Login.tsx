import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/common/Button";
import { PasswordField } from "@/features/auth/PasswordField";
import { PATHS } from "@/routes/paths";

export interface LoginCredentials { email: string; password: string; }
interface LoginProps { onSubmit?: (credentials: LoginCredentials) => void | Promise<void>; }

export default function Login({ onSubmit }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(undefined); setIsSubmitting(true);
    try { await onSubmit?.({ email: email.trim(), password }); }
    catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Không thể đăng nhập. Vui lòng thử lại."); }
    finally { setIsSubmitting(false); }
  }

  return <section className="w-full max-w-md rounded-2xl border app-border app-bg-card p-5 shadow-lg sm:p-8">
    <div className="mb-7 space-y-2 text-center"><h1 className="text-2xl font-bold app-text-main">Đăng nhập</h1><p className="text-sm app-text-muted">Chào mừng bạn trở lại với HaloTicket</p></div>
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2"><label className="block text-sm font-semibold app-text-main" htmlFor="login-email">Email</label><input autoComplete="email" className="h-11 w-full rounded-xl border app-border app-bg-card px-3.5 text-sm app-text-main outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20" id="login-email" onChange={(event) => setEmail(event.target.value)} placeholder="Nhập email của bạn" required type="email" value={email} /></div>
      <PasswordField autoComplete="current-password" id="login-password" label="Mật khẩu" onChange={setPassword} placeholder="Nhập mật khẩu" value={password} />
      {error && <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300" role="alert">{error}</p>}
      <div className="flex justify-end"><Link className="inline-flex min-h-11 items-center text-sm font-semibold app-text-brand hover:underline" to={PATHS.FORGOT_PASSWORD}>Quên mật khẩu?</Link></div>
      <Button className="min-h-11 w-full" disabled={isSubmitting} type="submit">{isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}</Button>
    </form>
    <p className="mt-6 text-center text-sm app-text-muted">Chưa có tài khoản? <Link className="font-semibold app-text-brand hover:underline" to={PATHS.REGISTER}>Đăng ký ngay</Link></p>
  </section>;
}
