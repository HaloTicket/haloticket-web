import { useEffect, useMemo, useState } from "react";
import { FiCalendar, FiMapPin } from "react-icons/fi";
import { Link, useNavigate, useParams } from "react-router-dom";

import { PATHS } from "@/routes/paths";
import { eventApi } from "@/services/eventApi";
import { getKeycloakSession } from "@/services/keycloakSession";
import { marketplaceApi } from "@/services/marketplaceApi";
import type { TicketListing } from "@/types/marketplace";

const money = (value: number) => new Intl.NumberFormat("vi-VN", {
  style: "currency", currency: "VND", maximumFractionDigits: 0,
}).format(value);

const dateTime = (value?: unknown) => value
  ? new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric",
    }).format(new Date(String(value)))
  : "Đang cập nhật";

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

  const buy = (listing: TicketListing) => {
    const target = `/resale-ticket/${eventId}/ticket/${listing.id}`;
    if (!getKeycloakSession().isAuthenticated()) {
      navigate(PATHS.LOGIN, { state: { from: target } });
      return;
    }
    navigate(target);
  };

  return (
    <main className="min-h-[calc(100vh-220px)] bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <nav className="mb-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link to="/" className="hover:text-blue-600">Trang chủ</Link><span>/</span>
          <Link to="/resale-ticket" className="hover:text-blue-600">Vé bán lại</Link><span>/</span>
          <span className="max-w-xs truncate text-slate-700 dark:text-slate-200">{String(event?.title ?? "Sự kiện")}</span>
        </nav>

        <section className="mb-8 min-h-[180px] overflow-hidden rounded-xl bg-slate-900 px-6 py-5 text-white sm:h-[190px] sm:px-8">
          <div className="flex h-full flex-col-reverse justify-center gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-blue-400">Vé bán lại</p>
              <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">{String(event?.title ?? "Sự kiện")}</h1>
              <div className="mt-4 space-y-2 text-sm text-slate-300">
                <p className="flex items-center gap-2"><FiCalendar className="text-blue-400" />{dateTime(event?.startTime)}</p>
                <p className="flex items-center gap-2"><FiMapPin className="text-blue-400" />{String(event?.locationName ?? "Địa điểm đang cập nhật")}</p>
              </div>
            </div>
            {Boolean(event?.posterImage) && (
              <div className="hidden h-[150px] w-[240px] shrink-0 overflow-hidden rounded-lg bg-slate-800 sm:block lg:h-[175px] lg:w-[280px]">
                <img src={String(event?.posterImage)} alt={String(event?.title ?? "Sự kiện")} className="h-full w-full object-cover" />
              </div>
            )}
          </div>
        </section>

        <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-xl font-bold text-slate-950 dark:text-white">Danh sách vé bán lại</h2><p className="mt-1 text-sm text-slate-500">{listings.length} vé có sẵn</p></div>
          <label className="flex items-center gap-2 text-sm text-slate-500">Sắp xếp
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <option value="price-asc">Giá thấp trước</option><option value="price-desc">Giá cao trước</option>
            </select>
          </label>
        </div>

        {loading && <p className="rounded-xl border app-border bg-white p-8 text-center text-sm app-text-muted dark:bg-slate-900">Đang tải vé…</p>}
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {!loading && !error && sorted.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900"><p className="font-semibold app-text-main">Sự kiện hiện chưa có vé bán lại.</p><p className="mt-1 text-sm app-text-muted">Vui lòng quay lại sau.</p></div>}

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-label="Vé bán lại">
          {sorted.map((listing) => {
            const owner = listing.ownedByCurrentUser === true;
            const quantity = listing.quantity || 1;
            const retail = quantity <= 1 || listing.allowRetail !== false;
            const tier = listing.ticketTypeName || listing.section || "Tiêu chuẩn";
            return (
              <article key={listing.id} className="flex min-h-[190px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">{owner ? "Vé của bạn" : `${tier} · ${quantity} vé`}</p>
                    <p className={`mt-1 text-sm ${owner ? "text-blue-600 dark:text-blue-400" : "text-slate-500"}`}>{owner ? "Đang bán" : dateTime(event?.startTime)}</p>
                  </div>
                  <p className="text-sm text-slate-500">{retail ? "Có thể mua lẻ" : "Mua toàn bộ"}</p>
                </div>
                <div className="mt-6 flex items-end justify-between gap-5">
                  <div>
                    {owner ? <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">{tier} · {quantity} vé</p> : <p className="mb-2 text-sm text-slate-500">Người bán đã xác thực</p>}
                    <p className="text-xs text-slate-500">Giá bán</p><p className="mt-0.5 text-2xl font-bold text-slate-950 dark:text-white">{money(listing.price)}</p>
                  </div>
                  {owner
                    ? <button type="button" onClick={() => navigate("/profile?tab=tickets")} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Quản lý</button>
                    : <button type="button" onClick={() => buy(listing)} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Mua vé</button>}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
};

export default ResaleEventDetail;
