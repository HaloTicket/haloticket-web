import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/common/Button";
import { PasswordField } from "@/features/auth/PasswordField";
import { PasswordRequirements } from "@/features/auth/PasswordRequirements";
import { isPasswordValid } from "@/features/auth/passwordRules";
import { PATHS } from "@/routes/paths";

export interface PasswordResetData { email?: string; phoneNumber?: string; otp?: string; password: string; }
interface ResetPasswordProps { onSubmit?: (data: PasswordResetData) => void | Promise<void>; }

export default function ResetPassword({ onSubmit }: ResetPasswordProps) {
  const location = useLocation();
  const recovery = location.state as { email?: string; phoneNumber?: string; otp?: string } | null;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordsMatch = password === confirmPassword;
  const canSubmit = isPasswordValid(password) && Boolean(confirmPassword) && passwordsMatch;
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(undefined); if (!canSubmit) return; setIsSubmitting(true);
    try { await onSubmit?.({ ...recovery, password }); setDone(true); }
    catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Không thể đặt lại mật khẩu."); }
    finally { setIsSubmitting(false); }
  }
  return <section className="w-full max-w-md rounded-2xl border app-border app-bg-card p-5 shadow-lg sm:p-8"><div className="mb-7 space-y-2 text-center"><h1 className="text-2xl font-bold app-text-main">Đặt lại mật khẩu</h1><p className="text-sm app-text-muted">{recovery?.email ? "Tạo mật khẩu mới cho " + recovery.email : "Nhập mật khẩu mới của bạn"}</p></div>{done ? <div className="space-y-5 text-center"><p className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300" role="status">Mật khẩu đã được cập nhật. Bạn có thể đăng nhập lại.</p><Link className="inline-flex min-h-11 items-center justify-center font-semibold app-text-brand" to={PATHS.LOGIN}>Quay lại đăng nhập</Link></div> : <form className="space-y-5" noValidate onSubmit={handleSubmit}><PasswordField autoComplete="new-password" id="reset-password" label="Mật khẩu mới" onChange={setPassword} placeholder="Nhập mật khẩu mới" value={password} /><PasswordField autoComplete="new-password" error={Boolean(confirmPassword) && !passwordsMatch ? "Mật khẩu xác nhận chưa khớp." : undefined} id="reset-confirm-password" label="Nhập lại mật khẩu mới" onChange={setConfirmPassword} placeholder="Nhập lại mật khẩu mới" value={confirmPassword} /><PasswordRequirements password={password} />{error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}<Button className="min-h-11 w-full" disabled={!canSubmit || isSubmitting} type="submit">{isSubmitting ? "Đang cập nhật..." : "Đặt lại mật khẩu"}</Button></form>}<p className="mt-6 text-center text-sm app-text-muted"><Link className="font-semibold app-text-brand hover:underline" to={PATHS.LOGIN}>Quay lại đăng nhập</Link></p></section>;
}
