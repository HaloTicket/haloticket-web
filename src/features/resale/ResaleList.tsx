import { useEffect, useMemo, useState } from "react";
import { FiCalendar, FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { eventApi } from "@/services/eventApi";
import { marketplaceApi } from "@/services/marketplaceApi";
import type { ResaleEventSummary } from "@/types/marketplace";

type ResaleEvent = ResaleEventSummary & {
  title: string;
  startTime?: string;
  locationName?: string;
  posterImage?: string;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border app-border app-bg-card" aria-hidden="true">
      <div className="aspect-[16/9] bg-slate-200 dark:bg-slate-700" />
      <div className="p-5 space-y-3">
        <div className="h-5 w-3/4 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-1/2 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-2/3 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="mt-4 flex justify-between">
          <div className="h-4 w-20 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-24 rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    </div>
  );
}

export const ResaleList = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [events, setEvents] = useState<ResaleEvent[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const formatDate = (value?: string) =>
    value
      ? new Intl.DateTimeFormat(i18n.language.startsWith("vi") ? "vi-VN" : "en-US", { dateStyle: "long", timeStyle: "short" }).format(new Date(value))
      : t("Thời gian đang cập nhật");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
    let active = true;

    const load = async () => {
      try {
        const summaries = await marketplaceApi.getResaleEvents();
        const resolved = await Promise.all(
          summaries.map(async (summary) => {
            const event = await eventApi.getEventById(summary.eventId);
            return {
              ...summary,
              title: String(event?.title ?? t("Sự kiện")),
              startTime: event?.startTime ? String(event.startTime) : undefined,
              locationName: event?.locationName ? String(event.locationName) : undefined,
              posterImage: event?.posterImage ? String(event.posterImage) : undefined,
            };
          }),
        );
        if (active) setEvents(resolved);
      } catch {
        if (active) setError(t("Không thể tải vé bán lại. Vui lòng thử lại sau."));
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [t]);

  const visibleEvents = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return normalized
      ? events.filter((event) => event.title.toLocaleLowerCase("vi").includes(normalized))
      : events;
  }, [events, query]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">HaloTicket Marketplace</p>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight app-text-main sm:text-3xl">{t("Vé bán lại")}</h1>
        <p className="mt-1 text-xs sm:text-sm app-text-muted">
          {t("Vé được xác thực và bảo đảm bởi HaloTicket. Mã vé cũ bị vô hiệu hóa ngay khi giao dịch thành công.")}
        </p>
      </header>

      {/* Search & Filter Bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-md">
          <span className="sr-only">{t("Tìm sự kiện")}</span>
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Tìm theo tên sự kiện")}
            className="w-full rounded-xl border app-border app-bg-card py-2.5 pl-10 pr-4 text-xs sm:text-sm app-text-main outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </label>
        {!loading && !error && (
          <p className="text-xs font-medium app-text-muted">{t("{{count}} sự kiện có vé bán lại", { count: events.length })}</p>
        )}
      </div>

      {loading && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" aria-label={t("Đang tải")}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </section>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && visibleEvents.length === 0 && (
        <div className="rounded-2xl border app-border app-bg-card p-12 text-center">
          <p className="text-base sm:text-lg font-bold app-text-main">
            {query ? t("Không tìm thấy sự kiện phù hợp") : t("Hiện chưa có vé bán lại.")}
          </p>
          <p className="mt-1.5 text-xs sm:text-sm app-text-muted">
            {query
              ? t('Không có sự kiện nào khớp với "{{query}}".', { query })
              : t("Khi có người đăng bán, sự kiện và vé sẽ hiển thị tại đây.")}
          </p>
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-4 rounded-lg border app-border px-4 py-2 text-xs font-semibold app-text-main hover:bg-slate-500/10 cursor-pointer"
            >
              {t("Xóa bộ lọc")}
            </button>
          ) : (
            <a
              href="/events"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t("Khám phá sự kiện →")}
            </a>
          )}
        </div>
      )}

      {/* Ticketbox-style 4-column Event Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" aria-label={t("Danh sách sự kiện có vé bán lại")}>
        {visibleEvents.map((event) => {
          const isUpcoming = event.startTime ? new Date(event.startTime) > new Date() : true;
          return (
            <button
              key={event.eventId}
              type="button"
              onClick={() => navigate(`/resale-ticket/${event.eventId}`)}
              className="group flex flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl cursor-pointer"
            >
              {/* Poster with status badge */}
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-slate-900">
                {event.posterImage ? (
                  <img
                    src={event.posterImage}
                    alt={event.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                    HaloTicket
                  </div>
                )}
                {/* Status Badge: Ticketbox style top-right pill */}
                <span
                  className={`absolute right-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-bold text-white shadow ${
                    isUpcoming ? "bg-amber-500" : "bg-slate-600"
                  }`}
                >
                  {isUpcoming ? t("SẮP DIỄN RA") : t("ĐÃ DIỄN RA")}
                </span>
              </div>

              {/* Event Info below poster */}
              <div className="mt-2.5 flex-1">
                <h2 className="line-clamp-2 text-sm font-bold text-slate-900 transition group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                  {event.title}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <FiCalendar className="shrink-0 text-slate-400" />
                  <span>{formatDate(event.startTime)}</span>
                </p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-500 dark:text-slate-400">{t("{{count}} vé đang bán", { count: event.activeListings })}</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{t("Từ {{price}}", { price: formatCurrency(event.minPrice) })}</span>
                </div>
              </div>
            </button>
          );
        })}
      </section>
    </main>
  );
};

export default ResaleList;
