import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PATHS } from "@/routes/paths";
import { FiX } from "react-icons/fi";

export interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  redirectUrl?: string;
}

export const LoginRequiredModal: React.FC<LoginRequiredModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  redirectUrl = PATHS.MY_TICKETS,
}) => {
  const { t: translate } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoToLogin = () => {
    if (redirectUrl) sessionStorage.setItem("haloticket_auth_redirect", redirectUrl);
    onClose();
    navigate(PATHS.LOGIN);
  };

  const handleGoToRegister = () => {
    if (redirectUrl) sessionStorage.setItem("haloticket_auth_redirect", redirectUrl);
    onClose();
    navigate(PATHS.REGISTER);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <div className="relative w-full max-w-[360px] rounded-2xl app-bg-card border app-border p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-center">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label={translate("Đóng")}
        >
          <FiX className="w-4 h-4" />
        </button>

        {/* Title & Message */}
        <div className="space-y-2 pt-2">
          <h3
            id="login-modal-title"
            className="text-base font-bold app-text-main"
          >
            {title || translate("Vui lòng đăng nhập để tiếp tục")}
          </h3>
          <p className="text-xs app-text-muted leading-relaxed">
            {message ||
              translate(
                "Bạn cần đăng nhập để xem danh sách vé đã mua và quản lý vé sự kiện của mình."
              )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-3 rounded-xl border app-border text-xs font-semibold app-text-muted hover:app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              {translate("Để sau")}
            </button>

            <button
              type="button"
              onClick={handleGoToLogin}
              className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-95 cursor-pointer"
            >
              {translate("Đăng nhập")}
            </button>
          </div>

          <div className="text-center text-[11px] app-text-muted">
            {translate("Chưa có tài khoản?")}{" "}
            <button
              type="button"
              onClick={handleGoToRegister}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
            >
              {translate("Đăng ký")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const portalTarget =
    typeof document !== "undefined"
      ? document.fullscreenElement || document.body
      : null;
  if (!portalTarget) return null;

  return createPortal(modalContent, portalTarget);
};

export default LoginRequiredModal;
