import { useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiCalendar, FiMapPin } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";

import { eventApi } from "@/services/eventApi";
import { marketplaceApi } from "@/services/marketplaceApi";
import type { TicketListing } from "@/types/marketplace";

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
const dateTime = (value?: unknown) =>
  value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "long", timeStyle: "short" }).format(new Date(String(value))) : "Đang cập nhật";

export const ResaleEventDetail = () => {
  const { eventId = "" } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Record<string, unknown> | null>(null);
  const [listings, setListings] = useState<TicketListing[]>([]);
  const [sort, setSort] = useState("price-asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
    let active = true;
    Promise.all([eventApi.getEventById(eventId), marketplaceApi.getEventListings(eventId, 0, 100)])
      .then(([eventData, page]) => {
        if (!active) return;
        setEvent(eventData);
        setListings(page.content);
      })
      .catch(() => active && setError("Không thể tải danh sách vé bán lại."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [eventId]);

  const sorted = useMemo(
    () => [...listings].sort((a, b) => (sort === "price-desc" ? b.price - a.price : a.price - b.price)),
    [listings, sort],
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => navigate("/resale-ticket")}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold app-text-muted hover:text-brand-primary"
      >
        <FiArrowLeft /> Sàn vé bán lại
      </button>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        {/* Sidebar — desktop only (poster + info) */}
        <div className="lg:sticky lg:top-24 lg:w-72 lg:shrink-0">
          {/* Desktop poster */}
          <div className="hidden aspect-[3/4] overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 lg:block">
            {Boolean(event?.posterImage) && (
              <img src={String(event?.posterImage)} alt="" className="h-full w-full object-cover" />
            )}
          </div>

          {/* Mobile: horizontal compact header */}
          <div className="flex gap-4 rounded-2xl border app-border app-bg-card p-4 lg:hidden">
            <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
              {Boolean(event?.posterImage) && (
                <img src={String(event?.posterImage)} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold leading-snug app-text-main line-clamp-2">
                {String(event?.title ?? "Sự kiện")}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-xs app-text-muted">
                <FiCalendar className="shrink-0" />
                {dateTime(event?.startTime)}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs app-text-muted">
                <FiMapPin className="shrink-0" />
                {String(event?.locationName ?? "Địa điểm đang cập nhật")}
              </p>
            </div>
          </div>

          {/* Desktop info panel */}
          <div className="mt-4 hidden rounded-2xl border app-border app-bg-card p-5 lg:block">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">Vé bán lại đã xác thực</p>
            <h1 className="mt-2 text-xl font-bold app-text-main">{String(event?.title ?? "Sự kiện")}</h1>
            <div className="mt-4 space-y-2 text-sm app-text-muted">
              <p className="flex items-start gap-2">
                <FiCalendar className="mt-0.5 shrink-0" />
                {dateTime(event?.startTime)}
              </p>
              <p className="flex items-start gap-2">
                <FiMapPin className="mt-0.5 shrink-0" />
                {String(event?.locationName ?? "Địa điểm đang cập nhật")}
              </p>
            </div>
            <div className="mt-5 border-t app-border pt-4 text-sm app-text-muted">
              {listings.length} vé đang bán
            </div>
          </div>
        </div>

        {/* Listing grid */}
        <div className="flex-1">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold app-text-main">
              Chọn vé <span className="ml-1 text-sm font-normal app-text-muted">({listings.length})</span>
            </h2>
            <label className="text-sm app-text-muted">
              <span className="sr-only">Sắp xếp</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-xl border app-border app-bg-card px-3 py-2 text-sm app-text-main"
              >
                <option value="price-asc">Giá thấp trước</option>
                <option value="price-desc">Giá cao trước</option>
              </select>
            </label>
          </div>

          {loading && <p className="rounded-xl border app-border p-8 text-center app-text-muted">Đang tải vé…</p>}
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}
          {!loading && !error && sorted.length === 0 && (
            <p className="rounded-xl border app-border p-8 text-center app-text-muted">Sự kiện hiện chưa có vé bán lại.</p>
          )}

          <section className="grid gap-4 sm:grid-cols-2" aria-label="Vé bán lại">
            {sorted.map((listing) => (
              <button
                key={listing.id}
                type="button"
                onClick={() => navigate(`/resale-ticket/${eventId}/ticket/${listing.id}`)}
                className="group rounded-2xl border app-border app-bg-card p-5 text-left transition hover:border-brand-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <p className="text-sm font-bold text-brand-primary">{listing.ticketTypeName || "Vé sự kiện"}</p>
                {(listing.section || listing.row || listing.seat) && (
                  <p className="mt-1 text-xs app-text-muted">
                    {[listing.section, listing.row && `Hàng ${listing.row}`, listing.seat && `Ghế ${listing.seat}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                <div className="mt-4 flex items-end justify-between gap-4 border-t app-border pt-4">
                  <div>
                    {listing.originalPrice && listing.originalPrice !== listing.price && (
                      <p className="text-xs app-text-muted line-through">{money(listing.originalPrice)}</p>
                    )}
                    <p className="text-xl font-bold text-brand-primary">{money(listing.price)}</p>
                  </div>
                  <span className="flex min-h-[44px] min-w-[80px] items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white group-hover:brightness-110">
                    Chọn vé
                  </span>
                </div>
              </button>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
};

export default ResaleEventDetail;
