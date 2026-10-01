import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiCalendar, FiCheckCircle, FiClock, FiLayers, FiRefreshCw, FiSearch, FiX, FiXCircle } from "react-icons/fi";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";

import { AdminDataState } from "@/components/admin/AdminDataState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminStatusTabs } from "@/components/admin/AdminStatusTabs";
import { eventApi } from "@/services/eventApi";
import type { ApprovalEventItem } from "@/types";
import { approvalDetailUrl, displayApprovalStatus, filterApprovalEvents, normalizeApprovalEvents, readApprovalSort, readApprovalStatus } from "./events/approvalModel";

const FILTER_KEYS = ["q", "status", "category", "sort", "from", "to", "page"] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function readDate(value: string | null): string {
  if (!value || !ISO_DATE.test(value)) return "";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : "";
}

export function EventApproval() {
  const { t } = useTranslation();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const status = readApprovalStatus(params.get("status"));
  const query = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const sort = readApprovalSort(params.get("sort"));
  const rawFrom = params.get("from");
  const rawTo = params.get("to");
  const from = readDate(rawFrom);
  const to = readDate(rawTo);
  const invalidDate = Boolean((rawFrom && !from) || (rawTo && !to));
  const invalidRange = Boolean(from && to && from > to);
  const invalidDates = invalidDate || invalidRange;
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

  const categories = useMemo(() => Array.from(new Set(events.map((event) => event.categoryName).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, "vi")), [events]);
  const filtered = useMemo(() => invalidDates ? [] : filterApprovalEvents(events, { status, query, category, sort, from, to }), [events, status, query, category, sort, from, to, invalidDates]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (!loading && !error && !invalidDates && loadedStatus === status && page > totalPages) {
      setParams((current) => {
        const next = new URLSearchParams(current);
        if (totalPages === 1) next.delete("page");
        else next.set("page", String(totalPages));
        return next;
      }, { replace: true });
    }
  }, [error, invalidDates, loadedStatus, loading, page, setParams, status, totalPages]);

  const changeQuery = (key: typeof FILTER_KEYS[number], value: string) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });
  };

  const resetFilters = () => setParams((current) => {
    const next = new URLSearchParams(current);
    FILTER_KEYS.forEach((key) => next.delete(key));
    return next;
  });

  if (legacyEventId) return <Navigate to={approvalDetailUrl(legacyEventId, location.search)} replace />;

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t("Kiểm duyệt sự kiện")} description={t("Xem và xử lý yêu cầu đăng tải, cập nhật sự kiện.")} actions={<button type="button" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border app-border app-bg-card px-4 text-sm font-semibold app-text-main disabled:opacity-50"><FiRefreshCw aria-hidden="true" className={loading ? "animate-spin" : ""} />{t("Làm mới")}</button>} />
      <section className="overflow-hidden rounded-2xl border app-border app-bg-card" aria-label={t("Trạng thái")}>
        <div className="px-4 sm:px-5"><AdminStatusTabs value={status} onChange={(next) => changeQuery("status", next)} options={[
        { value: "PENDING", label: t("Chờ duyệt mới"), icon: <FiClock /> },
        { value: "UPDATE_PENDING", label: t("Cần xem xét cập nhật"), icon: <FiRefreshCw /> },
        { value: "APPROVED", label: t("Đã duyệt"), icon: <FiCheckCircle /> },
        { value: "REJECTED", label: t("Bị từ chối"), icon: <FiXCircle /> },
        { value: "ALL", label: t("Tất cả"), icon: <FiLayers /> },
        ]} /></div>
        <div className="space-y-3 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(160px,220px)_minmax(180px,220px)]">
            <div className="flex min-h-11 items-center gap-2 rounded-xl border app-border app-bg-subnav px-3 focus-within:ring-2 focus-within:ring-[var(--color-primary)]">
              <FiSearch className="shrink-0 app-text-muted" aria-hidden="true" />
              <input type="search" aria-label={t("Tìm sự kiện theo tên, mã hoặc BTC")} value={query} onChange={(event) => changeQuery("q", event.target.value)} placeholder={t("Tìm tên, mã sự kiện hoặc BTC...")} className="min-w-0 w-full bg-transparent text-sm app-text-main outline-none" />
              {query && <button type="button" onClick={() => changeQuery("q", "")} aria-label={t("Xóa tìm kiếm")} className="inline-flex min-h-11 min-w-11 items-center justify-center app-text-muted"><FiX aria-hidden="true" /></button>}
            </div>
            <select aria-label={t("Thể loại")} value={category} onChange={(event) => changeQuery("category", event.target.value)} className="min-h-11 w-full rounded-xl border app-border app-bg-subnav px-3 text-sm app-text-main">
              <option value="">{t("Tất cả thể loại")}</option>
              {category && !categories.includes(category) && <option value={category}>{category}</option>}
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select aria-label={t("Sắp xếp")} value={sort} onChange={(event) => changeQuery("sort", event.target.value === "newest" ? "" : event.target.value)} className="min-h-11 w-full rounded-xl border app-border app-bg-subnav px-3 text-sm app-text-main">
              <option value="newest">{t("Mới gửi nhất")}</option>
              <option value="oldest">{t("Gửi lâu nhất")}</option>
              <option value="title">{t("Tên sự kiện A–Z")}</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t app-border pt-3 sm:flex sm:flex-wrap sm:items-end">
            <span className="col-span-2 flex min-h-11 items-center gap-2 text-sm font-semibold app-text-main"><FiCalendar aria-hidden="true" />{t("Ngày gửi yêu cầu")}</span>
            <label className="flex min-w-0 flex-col gap-1 text-xs app-text-muted"><span>{t("Từ ngày")}</span><input type="date" value={from} onChange={(event) => changeQuery("from", event.target.value)} className="min-h-11 min-w-0 w-full rounded-xl border app-border app-bg-subnav px-3 text-sm app-text-main [color-scheme:light] dark:[color-scheme:dark]" /></label>
            <label className="flex min-w-0 flex-col gap-1 text-xs app-text-muted"><span>{t("Đến ngày")}</span><input type="date" value={to} onChange={(event) => changeQuery("to", event.target.value)} className="min-h-11 min-w-0 w-full rounded-xl border app-border app-bg-subnav px-3 text-sm app-text-main [color-scheme:light] dark:[color-scheme:dark]" /></label>
            <button type="button" onClick={resetFilters} className="col-span-2 ml-auto min-h-11 rounded-xl px-3 text-sm font-semibold app-text-brand hover:underline">{t("Xóa tất cả bộ lọc")}</button>
          </div>
          {invalidDates && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{invalidDate ? t("Ngày trong bộ lọc không hợp lệ.") : t("Ngày bắt đầu không được sau ngày kết thúc.")}</p>}
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border app-border app-bg-card" aria-label={t("Danh sách duyệt sự kiện")}>
        {loadedStatus !== status && !error ? <AdminDataState state="loading" /> : error ? <AdminDataState state="error" onRetry={() => setRefreshKey((key) => key + 1)} message={t("Không thể tải danh sách sự kiện từ hệ thống.")} /> : invalidDates ? <AdminDataState state="no-results" onReset={resetFilters} message={t("Hãy chọn khoảng ngày hợp lệ.")} /> : events.length === 0 ? <AdminDataState state="empty" message={t("Chưa có yêu cầu sự kiện nào.")} /> : filtered.length === 0 ? <AdminDataState state="no-results" onReset={resetFilters} message={t("Không tìm thấy yêu cầu sự kiện nào.")} /> : (
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
