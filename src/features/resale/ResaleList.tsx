import { useEffect, useMemo, useState } from "react";
import { FiCalendar, FiMapPin, FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

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

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "long", timeStyle: "short" }).format(new Date(value))
    : "Thời gian đang cập nhật";

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
  const navigate = useNavigate();
  const [events, setEvents] = useState<ResaleEvent[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
              title: String(event?.title ?? "Sự kiện"),
              startTime: event?.startTime ? String(event.startTime) : undefined,
              locationName: event?.locationName ? String(event.locationName) : undefined,
              posterImage: event?.posterImage ? String(event.posterImage) : undefined,
            };
          }),
        );
        if (active) setEvents(resolved);
      } catch {
        if (active) setError("Không thể tải vé bán lại. Vui lòng thử lại sau.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const visibleEvents = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return normalized
      ? events.filter((event) => event.title.toLocaleLowerCase("vi").includes(normalized))
      : events;
  }, [events, query]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <header className="mb-8 max-w-3xl">
        <p className="mb-2 text-sm font-semibold text-brand-primary">SÀN VÉ HALOTICKET</p>
        <h1 className="text-3xl font-bold tracking-tight app-text-main sm:text-4xl">Vé bán lại</h1>
        <p className="mt-3 text-base leading-7 app-text-muted">
          Vé được xác thực bởi HaloTicket. Khi giao dịch hoàn tất, mã vé cũ sẽ bị vô hiệu hóa và người mua nhận mã mới.
        </p>
      </header>

      <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-md">
          <span className="sr-only">Tìm sự kiện</span>
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 app-text-muted" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên sự kiện"
            className="w-full rounded-xl border app-border app-bg-card py-3 pl-10 pr-4 text-sm app-text-main outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </label>
        {!loading && !error && <p className="text-sm app-text-muted">{events.length} sự kiện có vé bán lại</p>}
      </div>

      {loading && (
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Đang tải">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </section>
      )}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {!loading && !error && visibleEvents.length === 0 && (
        <div className="rounded-2xl border app-border app-bg-card p-12 text-center">
          <p className="text-lg font-bold app-text-main">
            {query ? "Không tìm thấy sự kiện phù hợp" : "Hiện chưa có vé bán lại."}
          </p>
          <p className="mt-2 text-sm app-text-muted">
            {query
              ? `Không có sự kiện nào khớp với "${query}".`
              : "Khi có người đăng bán, vé sẽ hiển thị tại đây."}
          </p>
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-5 rounded-xl border app-border px-4 py-2 text-sm font-semibold app-text-main hover:bg-slate-500/10"
            >
              Xóa bộ lọc
            </button>
          ) : (
            <a
              href="/events"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-primary hover:underline"
            >
              Khám phá sự kiện →
            </a>
          )}
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Danh sách sự kiện có vé bán lại">
        {visibleEvents.map((event) => (
          <button
            key={event.eventId}
            type="button"
            onClick={() => navigate(`/resale-ticket/${event.eventId}`)}
            className="group overflow-hidden rounded-2xl border app-border app-bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-primary hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            <div className="aspect-[16/9] bg-slate-100 dark:bg-slate-800">
              {event.posterImage && <img src={event.posterImage} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="p-5">
              <h2 className="line-clamp-2 text-lg font-bold app-text-main group-hover:text-brand-primary">{event.title}</h2>
              <div className="mt-4 space-y-2 text-sm app-text-muted">
                <p className="flex items-start gap-2"><FiCalendar className="mt-0.5 shrink-0" />{formatDate(event.startTime)}</p>
                <p className="flex items-start gap-2"><FiMapPin className="mt-0.5 shrink-0" />{event.locationName || "Địa điểm đang cập nhật"}</p>
              </div>
              <div className="mt-5 flex items-end justify-between gap-4 border-t app-border pt-4">
                <span className="text-sm font-medium app-text-muted">{event.activeListings} vé đang bán</span>
                <span className="font-bold text-brand-primary">Từ {formatCurrency(event.minPrice)}</span>
              </div>
            </div>
          </button>
        ))}
      </section>
    </main>
  );
};

export default ResaleList;
