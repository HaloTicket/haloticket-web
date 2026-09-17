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
    return () => { active = false; };
  }, [eventId]);

  const sorted = useMemo(
    () => [...listings].sort((a, b) => sort === "price-desc" ? b.price - a.price : a.price - b.price),
    [listings, sort],
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <button onClick={() => navigate("/resale-ticket")} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold app-text-muted hover:text-brand-primary">
        <FiArrowLeft /> Quay lại sàn vé
      </button>

      <section className="grid overflow-hidden rounded-2xl border app-border app-bg-card md:grid-cols-[260px_1fr]">
        <div className="aspect-[16/9] bg-slate-100 md:aspect-auto">
          {Boolean(event?.posterImage) && <img src={String(event?.posterImage)} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="p-6 md:p-8">
          <p className="text-sm font-semibold text-brand-primary">VÉ BÁN LẠI ĐÃ XÁC THỰC</p>
          <h1 className="mt-2 text-2xl font-bold app-text-main md:text-3xl">{String(event?.title ?? "Sự kiện")}</h1>
          <div className="mt-5 space-y-2 text-sm app-text-muted">
            <p className="flex gap-2"><FiCalendar className="mt-0.5 shrink-0" />{dateTime(event?.startTime)}</p>
            <p className="flex gap-2"><FiMapPin className="mt-0.5 shrink-0" />{String(event?.locationName ?? "Địa điểm đang cập nhật")}</p>
          </div>
        </div>
      </section>

      <div className="mt-10 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold app-text-main">Chọn vé bán lại</h2>
          <p className="mt-1 text-sm app-text-muted">{listings.length} vé còn khả dụng</p>
        </div>
        <label className="text-sm font-medium app-text-muted">
          <span className="sr-only">Sắp xếp</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border app-border app-bg-card px-3 py-2 app-text-main">
            <option value="price-asc">Giá thấp trước</option>
            <option value="price-desc">Giá cao trước</option>
          </select>
        </label>
      </div>

      {loading && <p className="mt-6 rounded-xl border app-border p-6 text-center app-text-muted">Đang tải vé…</p>}
      {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}
      {!loading && !error && sorted.length === 0 && <p className="mt-6 rounded-xl border app-border p-8 text-center app-text-muted">Sự kiện hiện chưa có vé bán lại.</p>}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Vé bán lại">
        {sorted.map((listing) => (
          <button key={listing.id} onClick={() => navigate(`/resale-ticket/${eventId}/ticket/${listing.id}`)}
            className="rounded-xl border app-border app-bg-card p-5 text-left shadow-sm transition hover:border-brand-primary hover:shadow-md">
            <p className="text-sm font-semibold text-brand-primary">{listing.ticketTypeName || "Vé sự kiện"}</p>
            <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
              <dt className="app-text-muted">Khu vực</dt><dd className="text-right font-medium app-text-main">{listing.section || "—"}</dd>
              <dt className="app-text-muted">Hàng / ghế</dt><dd className="text-right font-medium app-text-main">{[listing.row, listing.seat].filter(Boolean).join(" · ") || "—"}</dd>
            </dl>
            <div className="mt-5 border-t app-border pt-4">
              <p className="text-xs app-text-muted">Giá bán</p>
              <p className="mt-1 text-xl font-bold text-brand-primary">{money(listing.price)}</p>
            </div>
          </button>
        ))}
      </section>
    </main>
  );
};

export default ResaleEventDetail;
