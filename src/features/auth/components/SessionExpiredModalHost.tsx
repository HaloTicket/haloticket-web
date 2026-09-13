import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import NotificationModal from "@/components/common/NotificationModal";

interface SessionExpiredModalHostProps {
  onLoginAgain: () => void | Promise<void>;
}

export function SessionExpiredModalHost({ onLoginAgain }: SessionExpiredModalHostProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleSessionExpired = () => setOpen(true);
    window.addEventListener("session-expired", handleSessionExpired);
    return () => window.removeEventListener("session-expired", handleSessionExpired);
  }, []);

  const handleLoginAgain = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onLoginAgain();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <NotificationModal
      open={open}
      title={t("Phiên đăng nhập đã hết hạn")}
      message={t("Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.")}
      variant="warning"
      dismissible={false}
      actions={[
        {
          label: submitting ? t("Đang chuyển hướng...") : t("Đăng nhập lại"),
          onClick: handleLoginAgain,
          disabled: submitting,
        },
      ]}
    />
  );
}

export default SessionExpiredModalHost;
