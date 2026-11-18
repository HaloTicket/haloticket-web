import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import NotificationModal from "@/components/common/NotificationModal";

/** Props của hộp thoại hết phiên: hàm đăng nhập lại và hàm đăng xuất tùy chọn. */
interface SessionExpiredModalHostProps {
  onLoginAgain: () => void | Promise<void>;
  onLogout?: () => void | Promise<void>;
}

/** Hộp thoại không thể đóng, hiện khi nhận sự kiện {@code session-expired}, buộc người dùng đăng nhập lại hoặc đăng xuất. */
export function SessionExpiredModalHost({ onLoginAgain, onLogout }: SessionExpiredModalHostProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    /** Mở hộp thoại hết phiên, trừ khi đang ở trang đăng nhập hoặc trang xác thực. */
    const handleSessionExpired = () => {
      // không mở nếu đang ở màn hình đăng nhập hoặc xác thực
      const path = window.location.pathname;
      if (path.startsWith("/login") || path.startsWith("/auth/")) {
        return;
      }
      setOpen(true);
    };

    window.addEventListener("session-expired", handleSessionExpired);
    return () => window.removeEventListener("session-expired", handleSessionExpired);
  }, []);

  /** Đóng hộp thoại rồi gọi {@code onLoginAgain}; bỏ qua nếu đang xử lý. */
  const handleContinueLogin = async () => {
    if (submitting) return;
    setSubmitting(true);
    setOpen(false); // đóng ngay để hộp thoại không còn lại ở trang đăng nhập
    try {
      await onLoginAgain();
    } finally {
      setSubmitting(false);
    }
  };

  /** Đóng hộp thoại rồi gọi {@code onLogout}, nếu không có thì dùng {@code onLoginAgain}. */
  const handleConfirmLogout = async () => {
    if (submitting) return;
    setSubmitting(true);
    setOpen(false); // đóng ngay
    try {
      if (onLogout) {
        await onLogout();
      } else {
        await onLoginAgain();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <NotificationModal
      open={open}
      title={t("Phiên đăng nhập đã hết hạn")}
      message={t("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.")}
      variant="warning"
      dismissible={false}
      actions={[
        {
          label: t("Đồng ý đăng xuất"),
          onClick: handleConfirmLogout,
          variant: "secondary",
          disabled: submitting,
        },
        {
          label: submitting ? t("Đang chuyển hướng...") : t("Đăng nhập lại"),
          onClick: handleContinueLogin,
          variant: "primary",
          disabled: submitting,
        },
      ]}
    />
  );
}

export default SessionExpiredModalHost;
