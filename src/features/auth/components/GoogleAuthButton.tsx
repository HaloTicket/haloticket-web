import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import { useState, useMemo, useSyncExternalStore, type ButtonHTMLAttributes } from "react";
import { FcGoogle } from "react-icons/fc";
import { FiChevronDown } from "react-icons/fi";
import {
  getSavedGoogleAccount,
  subscribeGoogleAccount,
  cleanDisplayName,
  type GoogleAccountSuggestion,
} from "@/services/googleAccountStorage";

export type { GoogleAccountSuggestion };

/** Props của nút Google: kế thừa thuộc tính nút gốc; có hàm bấm, thông báo lỗi ngoài, hàm bắt lỗi và tài khoản gợi ý. */
export interface GoogleAuthButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children" | "type"> {
  onClick: () => void | Promise<void>;
  error?: string;
  onError?: (error: unknown) => void;
  suggestedAccount?: GoogleAccountSuggestion | null;
}

/** Nút đăng nhập Google: hiển thị tài khoản gợi ý (hoặc tài khoản Google đã lưu) nếu có, ngược lại hiện nút "Tiếp tục với Google". */
export function GoogleAuthButton({
  error,
  onClick,
  onError,
  className = "",
  disabled,
  suggestedAccount,
  ...buttonProps
}: GoogleAuthButtonProps) {
  useTranslation();
  const [isPending, setIsPending] = useState(false);
  const [requestError, setRequestError] = useState<string>();
  const [imgError, setImgError] = useState(false);

  // Theo dõi thay đổi localStorage bên ngoài mà không gây cảnh báo render lan truyền
  const storedAccount = useSyncExternalStore(
    subscribeGoogleAccount,
    getSavedGoogleAccount,
    () => null,
  );

  // Prop tài khoản gợi ý được ưu tiên hơn tài khoản đã lưu
  const rawAccount = suggestedAccount !== undefined ? suggestedAccount : storedAccount;
  const account = useMemo(() => {
    if (!rawAccount) return null;
    return {
      ...rawAccount,
      name: cleanDisplayName(rawAccount.name, rawAccount.email),
      picture: rawAccount.picture || rawAccount.avatarUrl,
    };
  }, [rawAccount]);

  /** Chạy {@code onClick}, bật trạng thái chờ; lỗi hủy đăng nhập thì bỏ qua, lỗi khác hiện thông báo thử lại. */
  async function handleClick() {
    if (isPending || disabled) return;

    setRequestError(undefined);
    setIsPending(true);
    try {
      await onClick();
    } catch (caughtError) {
      onError?.(caughtError);
      const cancelled =
        caughtError instanceof Error && caughtError.message === "Google login was cancelled";
      if (!cancelled) {
        setRequestError(translate("Không thể đăng nhập bằng Google. Vui lòng thử lại."));
      }
    } finally {
      setIsPending(false);
    }
  }

  const displayedError = error ?? requestError;

  if (account) {
    const initial = (account.name || account.email || "G").trim().charAt(0).toUpperCase();
    const buttonLabel = isPending
      ? translate("Đang chuyển đến Google...")
      : translate("Đăng nhập với tên {{name}}", { name: account.name });
    const avatarUrl = account.picture || account.avatarUrl;

    return (
      <div>
        <button
          {...buttonProps}
          aria-label={
            isPending
              ? translate("Đang chuyển đến Google...")
              : translate("Đăng nhập với tên {{name}} ({{email}})", { name: account.name, email: account.email })
          }
          aria-busy={isPending}
          className={`auth-google-suggested-button ${className}`.trim()}
          disabled={disabled || isPending}
          onClick={handleClick}
          type="button"
        >
          <div className="auth-google-suggested-left">
            {avatarUrl && !imgError ? (
              <img
                src={avatarUrl}
                alt={account.name}
                className="auth-google-avatar-img"
                onError={() => setImgError(true)}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="auth-google-avatar" aria-hidden="true">
                {initial}
              </div>
            )}
            <div className="auth-google-info">
              <span className="auth-google-name">{buttonLabel}</span>
              <span className="auth-google-email-row">
                <span className="auth-google-email">{account.email}</span>
                <FiChevronDown className="auth-google-chevron" aria-hidden="true" />
              </span>
            </div>
          </div>

          <span
            aria-label="Google"
            className="auth-google-logo-badge"
            role="img"
          >
            <FcGoogle aria-hidden="true" className="h-5 w-5" />
          </span>
        </button>

        {displayedError && (
          <div aria-live="polite" className="auth-error" role="alert">
            {displayedError}
          </div>
        )}
      </div>
    );
  }

  const buttonLabel = isPending ? translate("Đang chuyển đến Google...") : translate("Tiếp tục với Google");

  return (
    <div>
      <button
        {...buttonProps}
        aria-label={buttonLabel}
        aria-busy={isPending}
        className={`auth-google-button ${className}`.trim()}
        disabled={disabled || isPending}
        onClick={handleClick}
        type="button"
      >
        <span aria-label="Google" className="inline-flex" role="img">
          <FcGoogle aria-hidden="true" className="h-5 w-5" />
        </span>
        {buttonLabel}
      </button>
      {displayedError && (
        <div aria-live="polite" className="auth-error" role="alert">
          {displayedError}
        </div>
      )}
    </div>
  );
}

export default GoogleAuthButton;
