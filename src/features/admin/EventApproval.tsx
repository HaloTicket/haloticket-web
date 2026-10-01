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
import {
  approvalDetailUrl,
  displayApprovalStatus,
  filterApprovalEvents,
  normalizeApprovalEvents,
  readApprovalSort,
  readApprovalStatus,
} from "./events/approvalModel";

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
    return () => {
      active = false;
    };
  }, [status, refreshKey]);

  useEffect(() => {
    const refresh = () => setRefreshKey((key) => key + 1);
    window.addEventListener("approval-events-updated", refresh);
    return () => window.removeEventListener("approval-events-updated", refresh);
  }, []);

  const categories = useMemo(
    () =>
      Array.from(new Set(events.map((event) => event.categoryName).filter((value): value is string => Boolean(value)))).sort(
        (a, b) => a.localeCompare(b, "vi"),
      ),
    [events],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: events.length,
      PENDING: 0,
      UPDATE_PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
    };
    events.forEach((event) => {
      const st = event.eventApprovalStatus;
      if (st && st in counts) {
        counts[st] = (counts[st] || 0) + 1;
      }
    });
    return counts;
  }, [events]);

  const filtered = useMemo(
    () => (invalidDates ? [] : filterApprovalEvents(events, { status, query, category, sort, from, to })),
    [events, status, query, category, sort, from, to, invalidDates],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (!loading && !error && !invalidDates && loadedStatus === status && page > totalPages) {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (totalPages === 1) next.delete("page");
          else next.set("page", String(totalPages));
          return next;
        },
        { replace: true },
      );
    }
  }, [error, invalidDates, loadedStatus, loading, page, setParams, status, totalPages]);

  const changeQuery = (key: (typeof FILTER_KEYS)[number], value: string) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });
  };

  const resetFilters = () =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      FILTER_KEYS.forEach((key) => next.delete(key));
      return next;
    });

  if (legacyEventId) return <Navigate to={approvalDetailUrl(legacyEventId, location.search)} replace />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("Kiểm duyệt sự kiện")}
        description={t("Xem và xử lý yêu cầu đăng tải, cập nhật sự kiện.")}
        actions={
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {t("Làm mới")}
          </button>
        }
      />
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs" aria-label={t("Trạng thái")}>
        <div className="px-3 sm:px-4">
          <AdminStatusTabs
            value={status}
            onChange={(next) => changeQuery("status", next)}
            options={[
              { value: "ALL", label: t("Tất cả"), icon: <FiLayers className="h-4 w-4" />, count: status === "ALL" ? events.length : undefined },
              { value: "PENDING", label: t("Chờ duyệt"), icon: <FiClock className="h-4 w-4" />, count: status === "ALL" ? statusCounts.PENDING : (status === "PENDING" ? events.length : undefined) },
              { value: "UPDATE_PENDING", label: t("Cập nhật"), icon: <FiRefreshCw className="h-4 w-4" />, count: status === "ALL" ? statusCounts.UPDATE_PENDING : (status === "UPDATE_PENDING" ? events.length : undefined) },
              { value: "APPROVED", label: t("Đã duyệt"), icon: <FiCheckCircle className="h-4 w-4" />, count: status === "ALL" ? statusCounts.APPROVED : (status === "APPROVED" ? events.length : undefined) },
              { value: "REJECTED", label: t("Bị từ chối"), icon: <FiXCircle className="h-4 w-4" />, count: status === "ALL" ? statusCounts.REJECTED : (status === "REJECTED" ? events.length : undefined) },
            ]}
          />
        </div>
        <div className="p-4 space-y-3 bg-card/60">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input
                type="search"
                aria-label={t("Tìm sự kiện theo tên, mã hoặc BTC")}
                value={query}
                onChange={(event) => changeQuery("q", event.target.value)}
                placeholder={t("Tìm tên, mã sự kiện hoặc BTC...")}
                className="w-full h-10 rounded-xl bg-muted/40 pl-9 pr-8 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-600/20 border border-border/80 focus:border-blue-600 transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => changeQuery("q", "")}
                  aria-label={t("Xóa tìm kiếm")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                >
                  <FiX className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="sm:w-52">
              <select
                aria-label={t("Thể loại")}
                value={category}
                onChange={(event) => changeQuery("category", event.target.value)}
                className="w-full h-10 rounded-xl bg-muted/40 px-3 text-xs font-medium text-foreground border border-border/80 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 cursor-pointer transition-all"
              >
                <option value="">{t("Tất cả thể loại")}</option>
                {category && !categories.includes(category) && <option value={category}>{category}</option>}
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:w-52">
              <select
                aria-label={t("Sắp xếp")}
                value={sort}
                onChange={(event) => changeQuery("sort", event.target.value === "newest" ? "" : event.target.value)}
                className="w-full h-10 rounded-xl bg-muted/40 px-3 text-xs font-medium text-foreground border border-border/80 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 cursor-pointer transition-all"
              >
                <option value="newest">{t("Mới gửi nhất")}</option>
                <option value="oldest">{t("Gửi lâu nhất")}</option>
                <option value="title">{t("Tên sự kiện A–Z")}</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-border/60 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <FiCalendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              {t("Ngày gửi yêu cầu:")}
            </span>
            <label className="flex items-center gap-2">
              <span className="text-[11px]">{t("Từ ngày:")}</span>
              <input
                type="date"
                aria-label={t("Từ ngày")}
                value={from}
                onChange={(event) => changeQuery("from", event.target.value)}
                className="h-8 rounded-lg bg-muted/40 px-2.5 text-xs text-foreground border border-border focus:border-blue-600 focus:outline-none [color-scheme:light] dark:[color-scheme:dark]"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-[11px]">{t("Đến ngày:")}</span>
              <input
                type="date"
                aria-label={t("Đến ngày")}
                value={to}
                onChange={(event) => changeQuery("to", event.target.value)}
                className="h-8 rounded-lg bg-muted/40 px-2.5 text-xs text-foreground border border-border focus:border-blue-600 focus:outline-none [color-scheme:light] dark:[color-scheme:dark]"
              />
            </label>
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t("Xóa tất cả bộ lọc")}
            </button>
          </div>
          {invalidDates && (
            <p role="alert" className="text-xs text-rose-600 dark:text-rose-400 font-medium pt-1">
              {invalidDate ? t("Ngày trong bộ lọc không hợp lệ.") : t("Ngày bắt đầu không được sau ngày kết thúc.")}
            </p>
          )}
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs" aria-label={t("Danh sách duyệt sự kiện")}>
        {loadedStatus !== status && !error ? (
          <AdminDataState state="loading" />
        ) : error ? (
          <AdminDataState state="error" onRetry={() => setRefreshKey((key) => key + 1)} message={t("Không thể tải danh sách sự kiện từ hệ thống.")} />
        ) : invalidDates ? (
          <AdminDataState state="no-results" onReset={resetFilters} message={t("Hãy chọn khoảng ngày hợp lệ.")} />
        ) : events.length === 0 ? (
          <AdminDataState state="empty" message={t("Chưa có yêu cầu sự kiện nào.")} />
        ) : filtered.length === 0 ? (
          <AdminDataState state="no-results" onReset={resetFilters} message={t("Không tìm thấy yêu cầu sự kiện nào.")} />
        ) : (
          <>
            {loading && <div className="border-b border-border px-4 py-2"><AdminDataState state="refreshing" /></div>}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th scope="col" className="w-14 text-center px-3 py-3 text-xs font-bold uppercase text-muted-foreground">
                      {t("STT")}
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground">
                      {t("Sự kiện & BTC")}
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground">
                      {t("Thể loại & Địa điểm")}
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground">
                      {t("Thời gian diễn ra")}
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground">
                      {t("Trạng thái duyệt")}
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-bold uppercase text-muted-foreground pr-6">
                      {t("Thao tác Admin")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((event, index) => (
                    <tr key={event.id} className="border-border hover:bg-muted/30 transition-colors">
                      <td className="text-center font-medium text-xs text-muted-foreground px-3 py-3.5">
                        {(page - 1) * pageSize + index + 1}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-16 sm:h-14 sm:w-20 shrink-0 overflow-hidden rounded-xl bg-muted border border-border group">
                            {event.posterImage ? (
                              <img
                                src={event.posterImage}
                                alt=""
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <FiLayers className="h-5 w-5 opacity-40" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <p className="max-w-64 truncate text-xs font-bold text-foreground" title={event.title}>
                              {event.title}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {event.organizerName || t("Chưa cập nhật")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-foreground">
                            {event.categoryName || t("Chưa cập nhật")}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {event.locationName || t("Chưa cập nhật")}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-foreground">
                        {event.datesSummary || event.startTime || t("Chưa cập nhật")}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                            displayApprovalStatus(event.eventApprovalStatus).className
                          }`}
                        >
                          {t(displayApprovalStatus(event.eventApprovalStatus).label)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right pr-6">
                        <Link
                          to={approvalDetailUrl(event.id, location.search)}
                          className="inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-600/10 transition-colors"
                        >
                          {t("Xem hồ sơ")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
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
