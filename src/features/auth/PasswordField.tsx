import { useId, useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

interface PasswordFieldProps {
  autoComplete: string;
  error?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}

export function PasswordField({ autoComplete, error, id, label, onChange, placeholder, value }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const errorId = useId();
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold app-text-main" htmlFor={id}>{label}</label>
      <div className="relative">
        <input aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error)} autoComplete={autoComplete} className={`h-11 w-full rounded-xl border app-bg-card px-3.5 pr-12 text-sm app-text-main outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 ${error ? "border-red-500" : "app-border"}`} id={id} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required type={isVisible ? "text" : "password"} value={value} />
        <button aria-label={isVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={isVisible} className="absolute inset-y-0 right-0 flex min-h-11 w-11 items-center justify-center app-text-muted hover:app-text-brand focus:outline-none focus:ring-2 focus:ring-brand-primary/30" onClick={() => setIsVisible((current) => !current)} type="button">
          {isVisible ? <FiEyeOff aria-hidden="true" size={19} /> : <FiEye aria-hidden="true" size={19} />}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400" id={errorId} role="alert">{error}</p>}
    </div>
  );
}
