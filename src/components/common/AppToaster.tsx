import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Toaster, toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import { resetNotificationToastSession } from "@/components/notifications/notificationToastSession";
import { getCachedUserProfile } from "@/services/userApi";

export function AppToaster() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const accountId = useRef(getCachedUserProfile()?.id ?? getCachedUserProfile()?.email ?? null);

  useEffect(() => {
    const clearSession = () => {
      const profile = getCachedUserProfile();
      const nextId = profile?.id ?? profile?.email ?? null;
      if (nextId === accountId.current) return;
      accountId.current = nextId;
      toast.dismiss();
      resetNotificationToastSession();
    };
    window.addEventListener("auth-changed", clearSession);
    return () => window.removeEventListener("auth-changed", clearSession);
  }, []);

  return <Toaster
    position="top-right"
    theme={isDark ? "dark" : "light"}
    richColors
    closeButton
    visibleToasts={3}
    duration={4000}
    offset={32}
    mobileOffset={16}
    toastOptions={{ closeButtonAriaLabel: t("Đóng thông báo") }}
    containerAriaLabel={t("Thông báo")}
  />;
}

export default AppToaster;
