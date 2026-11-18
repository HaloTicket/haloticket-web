import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Toaster, toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import { resetNotificationToastSession } from "@/utils/notificationToastSession";
import { getCachedUserProfile } from "@/services/userApi";

/** Bộ hiển thị toast (sonner) toàn ứng dụng, theo giao diện sáng/tối, tối đa 3 toast cùng lúc. */
export function AppToaster() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const accountId = useRef(getCachedUserProfile()?.id ?? getCachedUserProfile()?.email ?? null);

  useEffect(() => {
    /** Khi tài khoản đăng nhập đổi (sự kiện `auth-changed`): tắt các toast đang hiện và đặt lại phiên toast thông báo. */
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
    position="bottom-right"
    theme={isDark ? "dark" : "light"}
    closeButton
    visibleToasts={3}
    duration={5000}
    offset={24}
    mobileOffset={16}
    toastOptions={{
      classNames: {
        toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border shadow-lg rounded-xl",
        title: "text-[14px] font-bold",
        description: "text-xs font-semibold opacity-80 mt-1",
        actionButton: "group-[.toast]:bg-blue-600 group-[.toast]:text-white group-[.toast]:hover:bg-blue-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors",
        closeButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:hover:text-foreground group-[.toast]:hover:bg-muted-foreground/20 rounded-md",
      },
    }}
    containerAriaLabel={t("Thông báo")}
  />;
}

export default AppToaster;
