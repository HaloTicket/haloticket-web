import { useTranslation } from "react-i18next";

import { AdminDataState } from "@/components/admin/AdminDataState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export interface UnavailableSection {
  title: string;
  detail: string;
  action?: string;
}

export interface AdminUnavailableScreenProps {
  title: string;
  description: string;
  reason: string;
  action?: string;
  tableTitle?: string;
  columns?: string[];
  sections: UnavailableSection[];
}

/** A domain-shaped admin surface for workflows without an admin read/write contract. */
export function AdminUnavailableScreen({ title, description, reason, action, tableTitle, columns, sections }: AdminUnavailableScreenProps) {
  const { t } = useTranslation();
  const unavailable = t("Chức năng chưa tích hợp API quản trị", { defaultValue: "Admin API integration is unavailable" });

  return <div className="space-y-5">
    <AdminPageHeader title={t(title)} description={t(description)} actions={action && <button type="button" disabled title={reason} className="min-h-11 rounded-lg border app-border app-bg-card px-4 text-sm font-semibold app-text-muted opacity-70 cursor-not-allowed">{t(action)}</button>} />
    <div role="status" className="rounded-lg border app-border app-bg-subnav px-4 py-3 text-sm app-text-main">
      <strong className="font-semibold">{unavailable}.</strong> <span className="app-text-muted">{t(reason)}</span>
    </div>
    {tableTitle && columns && <section aria-label={t(tableTitle)} className="overflow-hidden rounded-xl border app-border app-bg-card">
      <div className="border-b app-border px-4 py-3"><h2 className="text-sm font-semibold app-text-main">{t(tableTitle)}</h2></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
        <thead className="app-bg-subnav app-text-muted"><tr>{columns.map((column) => <th key={column} scope="col" className="whitespace-nowrap border-b app-border px-4 py-3 font-semibold">{t(column)}</th>)}</tr></thead>
        <tbody><tr><td colSpan={columns.length} className="p-4"><AdminDataState state="empty" message={t("Chưa có dữ liệu", { defaultValue: "No data available" })} /></td></tr></tbody>
      </table></div>
    </section>}
    {sections.map((section) => <section key={section.title} className="rounded-xl border app-border app-bg-card px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h2 className="text-sm font-semibold app-text-main">{t(section.title)}</h2><p className="mt-1 text-sm app-text-muted">{t(section.detail)}</p></div>
        {section.action && <button type="button" disabled title={reason} className="min-h-11 rounded-lg border app-border px-4 text-sm font-semibold app-text-muted opacity-70 cursor-not-allowed">{t(section.action)}</button>}
      </div>
    </section>)}
  </div>;
}
