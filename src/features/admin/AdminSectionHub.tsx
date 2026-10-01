import { Link, useLocation } from "react-router-dom";
import { FiArrowUpRight } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { resolveAdminNavigation } from "@/layouts/admin/adminNavigation";

export default function AdminSectionHub() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();
  const route = resolveAdminNavigation(pathname);
  if (!route?.isGroup) return null;
  const label = (vi: string, en: string) => t(vi, { defaultValue: i18n.language.startsWith("en") ? en : vi });
  return <section className="space-y-6">
    <AdminPageHeader title={label(route.group.label, route.group.english)} description={t(route.group.description)} />
    <div className="grid gap-4 lg:grid-cols-2">
      {route.group.items.map((item) => <Link key={item.path} to={item.path} className="group flex min-h-36 items-start gap-4 rounded-2xl border app-border app-bg-card p-5 transition-colors hover:bg-[var(--bg-card-hover)]">
        <item.icon className="mt-1 shrink-0 text-xl app-text-brand" aria-hidden="true" />
        <div className="min-w-0 flex-1"><h2 className="text-base font-bold app-text-main">{label(item.label, item.english)}</h2><p className="mt-2 text-sm leading-6 app-text-muted">{t(item.description)}</p></div>
        <FiArrowUpRight className="mt-1 shrink-0 app-text-muted group-hover:app-text-brand" aria-hidden="true" />
      </Link>)}
    </div>
  </section>;
}
