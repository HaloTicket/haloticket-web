import { useId, useState, type ReactNode } from "react";
import { FiEye, FiEyeOff, FiLock } from "react-icons/fi";

interface PasswordFieldProps {
  autoComplete: string;
  error?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
  leftIcon?: ReactNode;
}

export function PasswordField({
  autoComplete,
  error,
  id,
  label,
  onChange,
  placeholder,
  value,
  leftIcon = <FiLock aria-hidden="true" />,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const errorId = useId();

  return (
    <div>
      <label className="auth-label" htmlFor={id}>
        {label}
      </label>
      <div className="auth-input-shell">
        {leftIcon && (
          <div className="auth-input-icon">
            {leftIcon}
          </div>
        )}
        <input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          autoComplete={autoComplete}
          className={`auth-input auth-input--password ${leftIcon ? "auth-input--icon" : ""} ${
            error ? "auth-input--error" : ""
          }`}
          id={id}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required
          type={isVisible ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={isVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={isVisible}
          className="auth-password-toggle"
          onClick={() => setIsVisible((current) => !current)}
          type="button"
        >
          {isVisible ? <FiEyeOff size={19} aria-hidden="true" /> : <FiEye size={19} aria-hidden="true" />}
        </button>
      </div>
      {error && (
        <p className="auth-field-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
