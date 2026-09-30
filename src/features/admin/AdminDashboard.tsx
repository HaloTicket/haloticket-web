import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiRefreshCw } from "react-icons/fi";
import { Link } from "react-router-dom";

import { AdminDataState } from "@/components/admin/AdminDataState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PATHS } from "@/routes/paths";
import { eventApi } from "@/services/eventApi";
import { venueApi } from "@/services/venueApi";
import type { ApprovalEventItem } from "@/types";
import { normalizeApprovalEvents } from "./events/approvalModel";

type Result<T> = { state: "loading" | "refreshing" | "error" | "ready"; data: T };

export function AdminDashboard() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<Result<ApprovalEventItem[]>>({ state: "loading", data: [] });
  const [venues, setVenues] = useState<Result<number>>({ state: "loading", data: 0 });
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setEvents((current) => current.state === "ready" || current.state === "refreshing" ? { ...current, state: "refreshing" } : { state: "loading", data: [] });
      setVenues((current) => current.state === "ready" || current.state === "refreshing" ? { ...current, state: "refreshing" } : { state: "loading", data: 0 });
      const [eventResult, venueResult] = await Promise.allSettled([
        eventApi.getApprovalEvents("PENDING"),
        venueApi.getAdminVenues(),
      ]);
      if (!active) return;
      setEvents(eventResult.status === "fulfilled"
        ? { state: "ready", data: normalizeApprovalEvents(eventResult.value).filter((event) => (event.eventApprovalStatus || "PENDING") === "PENDING") }
        : { state: "error", data: [] });
      setVenues(venueResult.status === "fulfilled"
        ? { state: "ready", data: venueResult.value.length }
        : { state: "error", data: 0 });
    };
    void load();
    return () => { active = false; };
  }, [refreshKey]);

  useEffect(() => {
    window.addEventListener("approval-events-updated", refresh);
    return () => window.removeEventListener("approval-events-updated", refresh);
  }, [refresh]);

  const metric = (title: string, value: string, detail: string, href?: string) => (
    <div role="group" aria-label={t(title)} className="flex min-h-32 flex-col justify-between rounded-2xl border app-border app-bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium app-text-muted">{t(title)}</p>
        <p className="text-2xl font-bold leading-7 app-text-main">{value}</p>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-3">
        <p className="text-xs app-text-muted">{t(detail)}</p>
        {href && <Link to={href} className="inline-flex min-h-11 items-center text-sm font-semibold app-text-brand hover:underline">{t("Xem tất cả")}</Link>}
      </div>
    </div>
  );

  return <div className="space-y-6">
    <AdminPageHeader title={t("Tổng quan quản trị")} description={t("Dữ liệu hiện có từ hệ thống quản trị.")} actions={<button type="button" onClick={refresh} className="inline-flex min-h-11 items-center gap-2 rounded-lg border app-border app-bg-card px-4 text-sm font-semibold app-text-main"><FiRefreshCw aria-hidden="true" />{t("Làm mới")}</button>} />

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metric("Sự kiện chờ duyệt", events.state === "ready" || events.state === "refreshing" ? String(events.data.length) : "—", events.state === "error" ? "Không thể tải dữ liệu" : events.state === "loading" ? "Đang tải dữ liệu" : events.state === "refreshing" ? "Đang cập nhật dữ liệu…" : "Hàng chờ phê duyệt", PATHS.ADMIN_EVENTS_APPROVAL)}
      {metric("Tổng địa điểm", venues.state === "ready" || venues.state === "refreshing" ? String(venues.data) : "—", venues.state === "error" ? "Không thể tải dữ liệu" : venues.state === "loading" ? "Đang tải dữ liệu" : venues.state === "refreshing" ? "Đang cập nhật dữ liệu…" : "Địa điểm trong hệ thống", PATHS.ADMIN_VENUES_MANAGEMENT)}
      {metric("Hồ sơ eKYC chờ xác thực", t("Chưa có dữ liệu"), "Chưa có API hàng chờ quản trị")}
      {metric("Sức khỏe hệ thống", t("Chưa có dữ liệu"), "Chưa có API tổng hợp trạng thái dịch vụ")}
    </div>

    <section className="rounded-2xl border app-border app-bg-card p-4 sm:p-5" aria-label={t("Sự kiện đang chờ phê duyệt")}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold app-text-main">{t("Sự kiện đang chờ phê duyệt")}</h2>
        <Link to={PATHS.ADMIN_EVENTS_APPROVAL} className="inline-flex min-h-11 items-center text-sm font-semibold app-text-brand hover:underline">{t("Xem tất cả")}</Link>
      </div>
      {events.state === "refreshing" && <AdminDataState state="refreshing" />}
      {events.state === "loading" ? <AdminDataState state="loading" /> : events.state === "error" ? <AdminDataState state="error" onRetry={refresh} message={t("Không thể tải danh sách sự kiện từ hệ thống.")} /> : events.data.length === 0 ? <AdminDataState state="empty" message={t("Chưa có yêu cầu sự kiện nào.")} /> : <ul className="divide-y divide-[var(--border-color)]">{events.data.slice(0, 5).map((event) => <li key={event.id} className="flex min-w-0 items-center justify-between gap-4 py-3 text-sm">
        <div className="min-w-0"><p className="truncate font-semibold app-text-main" title={event.title}>{event.title}</p><p className="truncate app-text-muted">{event.organizerName || t("Chưa cập nhật")}</p></div>
        <Link to={`${PATHS.ADMIN_EVENTS_APPROVAL}/${encodeURIComponent(event.id)}`} className="inline-flex min-h-11 shrink-0 items-center font-semibold app-text-brand hover:underline">{t("Xem hồ sơ")}</Link>
      </li>)}</ul>}
    </section>
  </div>;
}

export default AdminDashboard;
