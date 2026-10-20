import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import NotificationModal from "@/components/common/NotificationModal";

interface SessionExpiredModalHostProps {
  onLoginAgain: () => void | Promise<void>;
  onLogout?: () => void | Promise<void>;
}

export function SessionExpiredModalHost({ onLoginAgain, onLogout }: SessionExpiredModalHostProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleSessionExpired = () => {
      // do not open if already on login or auth screens
      const path = window.location.pathname;
      if (path.startsWith("/login") || path.startsWith("/auth/")) {
        return;
      }
      setOpen(true);
    };

    window.addEventListener("session-expired", handleSessionExpired);
    return () => window.removeEventListener("session-expired", handleSessionExpired);
  }, []);

  const handleContinueLogin = async () => {
    if (submitting) return;
    setSubmitting(true);
    setOpen(false); // close immediately so it does not persist onto login page
    try {
      await onLoginAgain();
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmLogout = async () => {
    if (submitting) return;
    setSubmitting(true);
    setOpen(false); // close immediately
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
