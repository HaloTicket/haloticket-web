import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LuChevronRight } from "react-icons/lu";

import { PATHS } from "@/routes/paths";
import { resolveAdminNavigation } from "./adminNavigation";

const SETTING_SECTION_LABELS: Record<string, { vi: string; en: string }> = {
  profile: { vi: "Thông tin cá nhân", en: "Personal information" },
  "account-security": { vi: "Tài khoản và bảo mật", en: "Account and security" },
  appearance: { vi: "Giao diện", en: "Appearance" },
  privacy: { vi: "Quyền riêng tư", en: "Privacy" },
  notifications: { vi: "Thông báo", en: "Notifications" },
  messages: { vi: "Tin nhắn", en: "Messages" },
};

export function AdminBreadcrumb() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();
  const route = resolveAdminNavigation(pathname);
  const label = (vi: string, en: string) => t(vi, { defaultValue: i18n.language.startsWith("en") ? en : vi });

  if (pathname === PATHS.ADMIN_IDENTITY_VERIFICATION) {
    return (
      <nav className="admin-breadcrumb select-none" aria-label={label("Đường dẫn điều hướng", "Breadcrumb")}>
        <Link to={PATHS.ADMIN_SETTINGS_SECTION("account-security")} className="text-muted-foreground hover:text-foreground transition-colors">
          {label("Cài đặt", "Settings")}
        </Link>
        <LuChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" aria-hidden="true" />
        <span aria-current="page" className="font-bold text-foreground">
          {label("Xác minh danh tính (eKYC)", "Identity verification (eKYC)")}
        </span>
      </nav>
    );
  }

  if (pathname === PATHS.ADMIN_SETTINGS || pathname.startsWith(`${PATHS.ADMIN_SETTINGS}/`)) {
    const sectionKey = pathname === PATHS.ADMIN_SETTINGS ? "" : pathname.replace(`${PATHS.ADMIN_SETTINGS}/`, "").split("/")[0];
    const sectionMeta = SETTING_SECTION_LABELS[sectionKey];
    return (
      <nav className="admin-breadcrumb select-none" aria-label={label("Đường dẫn điều hướng", "Breadcrumb")}>
        {sectionMeta ? (
          <>
            <Link to={PATHS.ADMIN_SETTINGS_SECTION("profile")} className="text-muted-foreground hover:text-foreground transition-colors">
              {label("Cài đặt", "Settings")}
            </Link>
            <LuChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" aria-hidden="true" />
            <span aria-current="page" className="font-bold text-foreground">
              {label(sectionMeta.vi, sectionMeta.en)}
            </span>
          </>
        ) : (
          <span aria-current="page" className="font-bold text-foreground">
            {label("Cài đặt", "Settings")}
          </span>
        )}
      </nav>
    );
  }

  return (
    <nav className="admin-breadcrumb" aria-label={label("Đường dẫn điều hướng", "Breadcrumb")}>
      <Link to={PATHS.ADMIN_DASHBOARD}>{label("Quản trị", "Admin")}</Link>
      <span aria-hidden="true">/</span>
      {route ? (
        <>
          {route.group.items.length > 1 && (
            <>
              <span>{label(route.group.label, route.group.english)}</span>
              <span aria-hidden="true">/</span>
            </>
          )}
          {route.eventId ? (
            <>
              <Link to={route.item.path}>{label(route.item.label, route.item.english)}</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page" title={route.eventId}>
                {label("Chi tiết sự kiện", "Event detail")} · {route.eventId}
              </span>
            </>
          ) : (
            <span aria-current="page">{label(route.item.label, route.item.english)}</span>
          )}
        </>
      ) : (
        <span aria-current="page">{label("Không tìm thấy trang", "Page not found")}</span>
      )}
    </nav>
  );
}
