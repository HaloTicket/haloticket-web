import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiCalendar, FiCheckCircle, FiChevronRight, FiClock, FiLayers, FiRefreshCw, FiSearch, FiX, FiXCircle } from "react-icons/fi";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";

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

interface FormattedDateTime {
  date: string;
  time: string;
}

function parseDateTimeParts(value?: string): FormattedDateTime {
  if (!value) return { date: "Chưa cập nhật", time: "" };
  const trimmed = value.trim();

  // If already matches "dd/MM/yyyy HH:mm" or "dd/MM/yyyy"
  const dmyMatch = /^(\d{1,2}\/\d{1,2}\/\d{4})\s*(\d{1,2}:\d{2})?$/.exec(trimmed);
  if (dmyMatch) {
    return { date: dmyMatch[1], time: dmyMatch[2] ?? "" };
  }

  // Vietnamese format: e.g. "20:00, 25 Tháng 09, 2026" or "20:00, 25/09/2026"
  const vnMatch = /^(\d{1,2}:\d{2}),?\s*(\d{1,2})\s*(?:Tháng|\/)\s*(\d{1,2}),?\s*(\d{4})$/i.exec(trimmed);
  if (vnMatch) {
    const [, time, day, month, year] = vnMatch;
    return {
      date: `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`,
      time,
    };
  }

  // ISO or standard date string
  const date = new Date(trimmed);
  if (Number.isFinite(date.getTime())) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return {
      date: `${day}/${month}/${year}`,
      time: `${hours}:${minutes}`,
    };
  }

  return { date: trimmed, time: "" };
}

function formatScheduleDisplay(value?: string): FormattedDateTime {
  if (!value) return { date: "Chưa cập nhật", time: "" };
  const trimmed = value.trim();
  if (trimmed.includes(" - ")) {
    const [startRaw, endRaw] = trimmed.split(" - ");
    const start = parseDateTimeParts(startRaw);
    const end = parseDateTimeParts(endRaw);

    if (start.date && end.date && start.date !== "Chưa cập nhật" && end.date !== "Chưa cập nhật") {
      let dateDisplay = `${start.date} – ${end.date}`;
      if (start.date.length === 10 && end.date.length === 10) {
        const startYear = start.date.slice(6);
        const endYear = end.date.slice(6);
        if (startYear === endYear) {
          dateDisplay = `${start.date.slice(0, 5)} – ${end.date}`;
        }
      }
      const timeDisplay = start.time && end.time
        ? `${start.time} – ${end.time}`
        : start.time || end.time;
      return { date: dateDisplay, time: timeDisplay };
    }
  }

  return parseDateTimeParts(trimmed);
}

function formatRangeDates(startDate: Date, endDate: Date | null, timeStart: Date, timeEnd: Date | null): FormattedDateTime {
  const pad = (n: number) => String(n).padStart(2, "0");
  const sDay = pad(startDate.getDate());
  const sMonth = pad(startDate.getMonth() + 1);
  const sYear = startDate.getFullYear();

  let dateDisplay = `${sDay}/${sMonth}/${sYear}`;

  if (endDate && Number.isFinite(endDate.getTime())) {
    const eDay = pad(endDate.getDate());
    const eMonth = pad(endDate.getMonth() + 1);
    const eYear = endDate.getFullYear();

    if (sYear === eYear && sMonth === eMonth && sDay === eDay) {
      dateDisplay = `${sDay}/${sMonth}/${sYear}`;
    } else if (sYear === eYear) {
      dateDisplay = `${sDay}/${sMonth} – ${eDay}/${eMonth}/${eYear}`;
    } else {
      dateDisplay = `${sDay}/${sMonth}/${sYear} – ${eDay}/${eMonth}/${eYear}`;
    }
  }

  const sHours = pad(timeStart.getHours());
  const sMinutes = pad(timeStart.getMinutes());
  let timeDisplay = `${sHours}:${sMinutes}`;

  if (timeEnd && Number.isFinite(timeEnd.getTime())) {
    const eHours = pad(timeEnd.getHours());
    const eMinutes = pad(timeEnd.getMinutes());
    timeDisplay = `${sHours}:${sMinutes} – ${eHours}:${eMinutes}`;
  }

  return { date: dateDisplay, time: timeDisplay };
}

function getEventSchedule(event: ApprovalEventItem): FormattedDateTime {
  // 1. If event has showtimes with real dates:
  const showtimes = (event as ApprovalEventItem & { showtimes?: Array<{ startTime?: string; endTime?: string }> }).showtimes;
  if (Array.isArray(showtimes) && showtimes.length > 0) {
    const validTimes = showtimes
      .map((st) => ({
        start: st.startTime ? new Date(st.startTime) : null,
        end: st.endTime ? new Date(st.endTime) : null,
      }))
      .filter((t): t is { start: Date; end: Date | null } => t.start !== null && Number.isFinite(t.start.getTime()));

    if (validTimes.length > 0) {
      validTimes.sort((a, b) => a.start.getTime() - b.start.getTime());
      const first = validTimes[0].start;
      const last = validTimes[validTimes.length - 1].end ?? validTimes[validTimes.length - 1].start;
      return formatRangeDates(first, last, validTimes[0].start, validTimes[validTimes.length - 1].end ?? validTimes[0].end);
    }
  }

  // 2. If event has startTime / endTime:
  if (event.startTime) {
    const start = new Date(event.startTime);
    if (Number.isFinite(start.getTime())) {
      const end = event.endTime ? new Date(event.endTime) : null;
      return formatRangeDates(start, end && Number.isFinite(end.getTime()) ? end : null, start, end);
    }
  }

  // 3. Fallback to datesSummary if present and not the hardcoded placeholder:
  if (event.datesSummary && !event.datesSummary.includes("25 Tháng 09, 2026 - 23:00, 27 Tháng 09, 2026")) {
    return formatScheduleDisplay(event.datesSummary);
  }

  return { date: "Chưa cập nhật", time: "" };
}

function readCachedCounts(): Record<string, number> | null {
  try {
    const raw = sessionStorage.getItem("ht_approval_counts");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.ALL === "number") return parsed;
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
}

function writeCachedCounts(counts: Record<string, number>) {
  try {
    sessionStorage.setItem("ht_approval_counts", JSON.stringify(counts));
  } catch {
    // Ignore storage write errors (e.g. quota or disabled storage)
  }
}

export function EventApproval() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
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
  const cached = useMemo(() => readCachedCounts(), []);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>(() => cached ?? {
    ALL: 0,
    PENDING: 0,
    UPDATE_PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
  });
  const [countsReady, setCountsReady] = useState<boolean>(() => cached !== null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await eventApi.getApprovalEvents(status);
        if (active) {
          const normalized = normalizeApprovalEvents(data);
          setEvents(normalized);
          setLoadedStatus(status);
          setStatusCounts((prev) => {
            const next = { ...prev };
            if (status === "ALL") {
              next.ALL = normalized.length;
              next.PENDING = 0;
              next.UPDATE_PENDING = 0;
              next.APPROVED = 0;
              next.REJECTED = 0;
              normalized.forEach((event) => {
                const st = event.eventApprovalStatus;
                if (st && st in next) {
                  next[st] = (next[st] || 0) + 1;
                }
              });
            } else {
              next[status] = normalized.length;
              normalized.forEach((event) => {
                const st = event.eventApprovalStatus;
                if (st && st in next && st !== status) {
                  next[st] = (next[st] || 0) + 1;
                }
              });
              const specificSum =
                (next.PENDING || 0) +
                (next.UPDATE_PENDING || 0) +
                (next.APPROVED || 0) +
                (next.REJECTED || 0);
              if (next.ALL < specificSum) {
                next.ALL = specificSum;
              }
            }
            writeCachedCounts(next);
            return next;
          });
          setCountsReady(true);
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const result: Array<{
      id: string;
      label: string;
      sub: string;
      type: "event" | "organizer";
      value: string;
    }> = [];

    if (!trimmed) {
      const popularTitles = Array.from(new Set(events.map((e) => e.title).filter(Boolean))).slice(0, 4);
      popularTitles.forEach((title) => {
        result.push({
          id: `recent-title-${title}`,
          label: title,
          sub: t("Sự kiện"),
          type: "event",
          value: title,
        });
      });
      const popularOrgs = Array.from(new Set(events.map((e) => e.organizerName).filter((o): o is string => Boolean(o)))).slice(0, 2);
      popularOrgs.forEach((org) => {
        result.push({
          id: `recent-org-${org}`,
          label: org,
          sub: t("Ban tổ chức"),
          type: "organizer",
          value: org,
        });
      });
      return result;
    }

    const addedValues = new Set<string>();
    for (const event of events) {
      if (event.title && event.title.toLowerCase().includes(trimmed) && !addedValues.has(event.title)) {
        addedValues.add(event.title);
        result.push({
          id: `match-title-${event.id}`,
          label: event.title,
          sub: event.organizerName ? `${t("BTC")}: ${event.organizerName}` : t("Tên sự kiện"),
          type: "event",
          value: event.title,
        });
      }
      if (
        event.organizerName &&
        event.organizerName.toLowerCase().includes(trimmed) &&
        !addedValues.has(event.organizerName)
      ) {
        addedValues.add(event.organizerName);
        result.push({
          id: `match-org-${event.organizerName}`,
          label: event.organizerName,
          sub: t("Ban tổ chức"),
          type: "organizer",
          value: event.organizerName,
        });
      }
      if (result.length >= 6) break;
    }
    return result;
  }, [events, query, t]);

  const categories = useMemo(
    () =>
      Array.from(new Set(events.map((event) => event.categoryName).filter((value): value is string => Boolean(value)))).sort(
        (a, b) => a.localeCompare(b, "vi"),
      ),
    [events],
  );


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
      <section className="rounded-2xl border border-border bg-card shadow-2xs" aria-label={t("Trạng thái")}>
        <div className="px-3 sm:px-4">
          <AdminStatusTabs
            value={status}
            onChange={(next) => changeQuery("status", next)}
            options={[
              { value: "ALL", label: t("Tất cả"), icon: <FiLayers className="h-4 w-4" />, count: countsReady ? statusCounts.ALL : undefined },
              { value: "PENDING", label: t("Chờ duyệt"), icon: <FiClock className="h-4 w-4" />, count: countsReady ? statusCounts.PENDING : undefined },
              { value: "UPDATE_PENDING", label: t("Cập nhật"), icon: <FiRefreshCw className="h-4 w-4" />, count: countsReady ? statusCounts.UPDATE_PENDING : undefined },
              { value: "APPROVED", label: t("Đã duyệt"), icon: <FiCheckCircle className="h-4 w-4" />, count: countsReady ? statusCounts.APPROVED : undefined },
              { value: "REJECTED", label: t("Bị từ chối"), icon: <FiXCircle className="h-4 w-4" />, count: countsReady ? statusCounts.REJECTED : undefined },
            ]}
          />
        </div>
        <div className="p-4 space-y-3 bg-card/60">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1" ref={searchContainerRef}>
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input
                type="search"
                aria-label={t("Tìm sự kiện theo tên, mã hoặc BTC")}
                value={query}
                onChange={(event) => {
                  changeQuery("q", event.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setShowSuggestions(false);
                }}
                placeholder={t("Tìm tên, mã sự kiện hoặc BTC...")}
                className="w-full h-10 rounded-xl bg-muted/40 pl-9 pr-8 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-600/20 border border-border/80 focus:border-blue-600 transition-all [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    changeQuery("q", "");
                    setShowSuggestions(false);
                  }}
                  aria-label={t("Xóa tìm kiếm")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                >
                  <FiX className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  role="listbox"
                  aria-label={t("Gợi ý tìm kiếm")}
                  className="absolute left-0 right-0 top-full mt-1.5 z-50 overflow-hidden rounded-xl border border-border bg-card shadow-lg p-1 animate-in fade-in-50 duration-150"
                >
                  <div className="px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 flex items-center justify-between">
                    <span>{query.trim() ? t("Gợi ý phù hợp") : t("Gợi ý tìm nhanh")}</span>
                    <span className="text-[10px] lowercase text-muted-foreground/80">{t("Nhấn để chọn")}</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto py-1">
                    {suggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={false}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          changeQuery("q", item.value);
                          setShowSuggestions(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left rounded-lg hover:bg-muted/70 focus:bg-muted/70 transition-colors group cursor-pointer"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-blue-600/10 group-hover:text-blue-600 transition-colors">
                          <FiSearch className="h-3.5 w-3.5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {item.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">{item.sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
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
              <table className="w-full text-left text-sm table-fixed">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th scope="col" className="w-12 text-center px-2 py-3 text-xs font-bold uppercase text-muted-foreground">
                      {t("STT")}
                    </th>
                    <th scope="col" className="px-3 py-3 text-xs font-bold uppercase text-muted-foreground">
                      {t("Sự kiện & BTC")}
                    </th>
                    <th scope="col" className="w-36 sm:w-40 px-3 py-3 text-xs font-bold uppercase text-muted-foreground">
                      {t("Loại yêu cầu")}
                    </th>
                    <th scope="col" className="w-28 sm:w-32 px-3 py-3 text-xs font-bold uppercase text-muted-foreground">
                      {t("Ngày gửi")}
                    </th>
                    <th scope="col" className="w-40 sm:w-44 px-3 py-3 text-xs font-bold uppercase text-muted-foreground">
                      {t("Thời gian diễn ra")}
                    </th>
                    <th scope="col" className="w-28 sm:w-32 px-3 py-3 text-xs font-bold uppercase text-muted-foreground">
                      {t("Trạng thái")}
                    </th>
                    <th scope="col" className="w-10 sm:w-12 px-2 py-3 text-center text-xs font-bold uppercase text-muted-foreground">
                      <span className="sr-only">{t("Xem hồ sơ")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((event, index) => {
                    const isUpdate = event.eventApprovalStatus === "UPDATE_PENDING";
                    const submitted = parseDateTimeParts(event.submittedAt || event.createdAt);
                    const schedule = getEventSchedule(event);
                    return (
                      <tr
                        key={event.id}
                        onClick={() => navigate(approvalDetailUrl(event.id, location.search))}
                        className="border-border hover:bg-blue-50/50 dark:hover:bg-blue-950/20 cursor-pointer transition-colors group"
                        title={t("Nhấp để xem chi tiết hồ sơ")}
                      >
                        <td className="text-center font-medium text-xs text-muted-foreground px-2 py-3">
                          {(page - 1) * pageSize + index + 1}
                        </td>
                        <td className="px-3 py-3 overflow-hidden">
                          <div className="flex items-center gap-2.5 sm:gap-3">
                            <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-muted border border-border group-hover:border-blue-500/40 transition-colors">
                              {event.posterImage ? (
                                <img
                                  src={event.posterImage}
                                  alt=""
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                  <FiLayers className="h-4 w-4 opacity-40" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <p
                                className="truncate text-xs font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                                title={event.title}
                              >
                                {event.title}
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {event.organizerName ? `${event.organizerName}` : t("Chưa cập nhật")}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {isUpdate ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 dark:text-sky-300 whitespace-nowrap">
                              <FiRefreshCw className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />
                              <span>{t("Cập nhật sự kiện")}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                              <span>{t("Đăng sự kiện mới")}</span>
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium text-foreground whitespace-nowrap">{submitted.date}</p>
                            {submitted.time && (
                              <p className="text-[11px] text-muted-foreground whitespace-nowrap">{submitted.time}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium text-foreground whitespace-nowrap">{schedule.date}</p>
                            {schedule.time && (
                              <p className="text-[11px] text-muted-foreground whitespace-nowrap">{schedule.time}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {isUpdate ? (
                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                              {t("Chờ duyệt")}
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
                                displayApprovalStatus(event.eventApprovalStatus).className
                              }`}
                            >
                              {t(displayApprovalStatus(event.eventApprovalStatus).label)}
                            </span>
                          )}
                        </td>
                        <td className="w-10 sm:w-12 px-2 py-3 text-center">
                          <Link
                            to={approvalDetailUrl(event.id, location.search)}
                            aria-label={t("Xem hồ sơ")}
                            title={t("Xem chi tiết hồ sơ")}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 group-hover:translate-x-0.5 transition-all"
                          >
                            <FiChevronRight className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
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
