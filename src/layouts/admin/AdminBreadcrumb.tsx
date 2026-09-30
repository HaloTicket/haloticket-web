import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { PATHS } from "@/routes/paths";
import { resolveAdminNavigation } from "./adminNavigation";

export function AdminBreadcrumb() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();
  const route = resolveAdminNavigation(pathname);
  const label = (vi: string, en: string) => t(vi, { defaultValue: i18n.language.startsWith("en") ? en : vi });

  return (
    <nav className="admin-breadcrumb" aria-label={label("Đường dẫn điều hướng", "Breadcrumb")}>
      <Link to={PATHS.ADMIN_DASHBOARD}>{label("Quản trị", "Admin")}</Link>
      <span aria-hidden="true">/</span>
      {route ? <>
        <span>{label(route.group.label, route.group.english)}</span>
        <span aria-hidden="true">/</span>
        {route.eventId ? <>
          <Link to={route.item.path}>{label(route.item.label, route.item.english)}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" title={route.eventId}>{label("Chi tiết sự kiện", "Event detail")} · {route.eventId}</span>
        </> : <span aria-current="page">{label(route.item.label, route.item.english)}</span>}
      </> : <span aria-current="page">{label("Không tìm thấy trang", "Page not found")}</span>}
    </nav>
  );
}
