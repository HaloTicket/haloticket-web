import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiRefreshCw, FiSearch } from "react-icons/fi";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";

import { AdminDataState } from "@/components/admin/AdminDataState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminStatusTabs } from "@/components/admin/AdminStatusTabs";
import { eventApi } from "@/services/eventApi";
import type { ApprovalEventItem } from "@/types";
import { approvalDetailUrl, displayApprovalStatus, normalizeApprovalEvents, readApprovalStatus } from "./events/approvalModel";

export function EventApproval() {
  const { t } = useTranslation();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const status = readApprovalStatus(params.get("status"));
  const query = params.get("q") ?? "";
  const pageValue = Number(params.get("page"));
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const [pageSize, setPageSize] = useState(10);
  const legacyEventId = params.get("eventId");
  const [events, setEvents] = useState<ApprovalEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadedStatus, setLoadedStatus] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await eventApi.getApprovalEvents(status);
        if (active) {
          setEvents(normalizeApprovalEvents(data));
          setLoadedStatus(status);
        }
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [status, refreshKey]);

  useEffect(() => {
    const refresh = () => setRefreshKey((key) => key + 1);
    window.addEventListener("approval-events-updated", refresh);
    return () => window.removeEventListener("approval-events-updated", refresh);
  }, []);

  const filtered = useMemo(() => events.filter((event) => {
    const matchesStatus = status === "ALL" || event.eventApprovalStatus === status;
    const phrase = query.trim().toLocaleLowerCase();
    return matchesStatus && (!phrase || `${event.title} ${event.organizerName || ""}`.toLocaleLowerCase().includes(phrase));
  }), [events, query, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (!loading && !error && loadedStatus === status && page > totalPages) {
      setParams((current) => {
        const next = new URLSearchParams(current);
        if (totalPages === 1) next.delete("page");
        else next.set("page", String(totalPages));
        return next;
      }, { replace: true });
    }
  }, [error, loadedStatus, loading, page, setParams, status, totalPages]);

  const changeQuery = (key: "status" | "q" | "page", value: string) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });
  };

  if (legacyEventId) return <Navigate to={approvalDetailUrl(legacyEventId, location.search)} replace />;

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t("Kiểm Duyệt Yêu Cầu Đăng Tải & Cập Nhật Sự Kiện")} description={t("Đánh giá hồ sơ, địa điểm, hạng vé và thông tin Ban Tổ Chức trước khi công khai mở bán vé.")} />
      <section className="overflow-hidden rounded-2xl border app-border app-bg-card" aria-label={t("Trạng thái")}>
        <div className="px-4 sm:px-5"><AdminStatusTabs value={status} onChange={(next) => changeQuery("status", next)} options={[
        { value: "PENDING", label: t("Chờ duyệt mới") },
        { value: "UPDATE_PENDING", label: t("Cần xem xét cập nhật") },
        { value: "APPROVED", label: t("Đã duyệt") },
        { value: "REJECTED", label: t("Bị từ chối") },
        { value: "ALL", label: t("Tất cả") },
        ]} /></div>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <label className="flex min-h-11 w-full items-center gap-2 rounded-xl border app-border app-bg-subnav px-3 sm:max-w-sm">
            <FiSearch className="shrink-0 app-text-muted" aria-hidden="true" />
            <span className="sr-only">{t("Tìm tên sự kiện, BTC")}</span>
            <input type="search" value={query} onChange={(event) => changeQuery("q", event.target.value)} placeholder={t("Tìm tên sự kiện, BTC...")} className="w-full bg-transparent text-sm app-text-main outline-none" />
          </label>
          <button type="button" onClick={() => setRefreshKey((key) => key + 1)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border app-border app-bg-card px-4 text-sm font-semibold app-text-main"><FiRefreshCw aria-hidden="true" />{t("Làm mới")}</button>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border app-border app-bg-card" aria-label={t("Danh sách duyệt sự kiện")}>
        {loadedStatus !== status && !error ? <AdminDataState state="loading" /> : error ? <AdminDataState state="error" onRetry={() => setRefreshKey((key) => key + 1)} message={t("Không thể tải danh sách sự kiện từ hệ thống.")} /> : events.length === 0 ? <AdminDataState state="empty" message={t("Chưa có yêu cầu sự kiện nào.")} /> : filtered.length === 0 ? <AdminDataState state="no-results" onReset={() => setParams(new URLSearchParams())} message={t("Không tìm thấy yêu cầu sự kiện nào.")} /> : (
          <>
            {loading && <div className="border-b app-border px-4 py-2"><AdminDataState state="refreshing" /></div>}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="app-bg-subnav text-xs font-semibold app-text-muted"><tr>
                  <th scope="col" className="px-4 py-3">{t("Sự kiện & BTC")}</th>
                  <th scope="col" className="px-4 py-3">{t("Thể loại & Địa điểm")}</th>
                  <th scope="col" className="px-4 py-3">{t("Thời gian diễn ra")}</th>
                  <th scope="col" className="px-4 py-3">{t("Trạng thái duyệt")}</th>
                  <th scope="col" className="px-4 py-3 text-right">{t("Thao tác Admin")}</th>
                </tr></thead>
                <tbody className="divide-y divide-[var(--border-color)]">{visible.map((event) => <tr key={event.id} className="hover:bg-slate-500/5">
                  <td className="px-4 py-3"><div className="flex items-center gap-3">{event.posterImage && <img src={event.posterImage} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />}<div className="min-w-0"><p className="max-w-64 truncate font-semibold app-text-main" title={event.title}>{event.title}</p><p className="app-text-muted">{event.organizerName || t("Chưa cập nhật")}</p></div></div></td>
                  <td className="px-4 py-3"><p className="font-medium app-text-main">{event.categoryName || t("Chưa cập nhật")}</p><p className="app-text-muted">{event.locationName || t("Chưa cập nhật")}</p></td>
                  <td className="px-4 py-3 app-text-main">{event.datesSummary || event.startTime || t("Chưa cập nhật")}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${displayApprovalStatus(event.eventApprovalStatus).className}`}>{t(displayApprovalStatus(event.eventApprovalStatus).label)}</span></td>
                  <td className="px-4 py-3 text-right"><Link to={approvalDetailUrl(event.id, location.search)} className="inline-flex min-h-11 items-center rounded-lg px-3 font-semibold app-text-brand hover:underline">{t("Xem hồ sơ")}</Link></td>
                </tr>)}</tbody>
              </table>
            </div>
            <AdminPagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={(next) => changeQuery("page", next === 1 ? "" : String(next))}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                changeQuery("page", "");
              }}
              itemLabel={t("sự kiện")}
            />
          </>
        )}
      </section>
    </div>
  );
}

export default EventApproval;
