import { useEffect, useMemo, useState } from "react";
import { FiCalendar, FiMapPin } from "react-icons/fi";
import { Link, useNavigate, useParams } from "react-router-dom";

import { eventApi } from "@/services/eventApi";
import { marketplaceApi } from "@/services/marketplaceApi";
import type { TicketListing } from "@/types/marketplace";

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);

const dateTime = (value?: unknown) =>
  value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "long", timeStyle: "short" }).format(new Date(String(value))) : "Đang cập nhật";

function getZoneColor(name?: string) {
  const n = (name || "").toUpperCase();
  if (n.includes("VVIP")) return "bg-blue-400";
  if (n.includes("VIP")) return "bg-indigo-400";
  if (n.includes("LẦU")) return "bg-amber-400";
  return "bg-sky-400";
}

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
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumbs */}
      <nav className="mb-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link to="/" className="hover:text-blue-500">Trang chủ</Link>
        <span>&gt;</span>
        <Link to="/resale-ticket" className="hover:text-blue-500">Vé bán lại</Link>
        <span>&gt;</span>
        <span className="truncate font-medium text-slate-900 dark:text-white max-w-xs sm:max-w-md">
          {String(event?.title ?? "Sự kiện")}
        </span>
      </nav>

      {/* HaloTicket Event Hero Banner */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 p-5 sm:p-6 text-white shadow-xl dark:border-slate-800">
        <div className="flex flex-col-reverse items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <span className="inline-block rounded-full border border-blue-500/30 bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-400">
              Bán lại vé
            </span>
            <h1 className="mt-2.5 text-xl font-bold leading-tight sm:text-2xl text-white">
              {String(event?.title ?? "Sự kiện")}
            </h1>
            <div className="mt-3 space-y-1 text-xs sm:text-sm text-slate-300">
              <p className="flex items-center gap-2">
                <FiCalendar className="shrink-0 text-blue-400" />
                <span>{dateTime(event?.startTime)}</span>
              </p>
              <p className="flex items-center gap-2 text-slate-400">
                <FiMapPin className="shrink-0 text-blue-400" />
                <span className="line-clamp-1">{String(event?.locationName ?? "Địa điểm đang cập nhật")}</span>
              </p>
            </div>
          </div>

          {Boolean(event?.posterImage) && (
            <div className="w-full sm:w-60 md:w-72 shrink-0 overflow-hidden rounded-xl bg-slate-800 shadow-md aspect-[16/9]">
              <img
                src={String(event?.posterImage)}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {/* Section Header: Danh sách vé bán lại */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Danh sách vé bán lại
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {listings.length} vé có sẵn từ người bán đã được xác thực
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Sắp xếp:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="price-asc">Giá thấp trước</option>
            <option value="price-desc">Giá cao trước</option>
          </select>
        </div>
      </div>

      {loading && <p className="rounded-xl border app-border p-8 text-center text-xs app-text-muted">Đang tải vé…</p>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">{error}</p>}
      {!loading && !error && sorted.length === 0 && (
        <div className="rounded-xl border app-border p-12 text-center">
          <p className="text-sm font-semibold app-text-main">Sự kiện hiện chưa có vé bán lại.</p>
          <p className="mt-1 text-xs app-text-muted">Vui lòng quay lại sau hoặc theo dõi cập nhật từ người bán khác.</p>
        </div>
      )}

      {/* 4-column Ticket Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" aria-label="Vé bán lại">
        {sorted.map((listing) => {
          const isOwner = listing.ownedByCurrentUser === true;
          const listingCode = `RSL${listing.id.replace(/-/g, "").slice(0, 9).toUpperCase()}`;

          // Business rule:
          // 1 vé -> Bán lẻ
          // 2 vé trở lên + yêu cầu mua cả 2 (allowRetail === false) -> Không bán lẻ
          // 2 vé trở lên + không yêu cầu mua hết -> Bán lẻ
          const quantity = listing.quantity || 1;
          const isRetail = quantity <= 1 || listing.allowRetail !== false;

          return (
            <div
              key={listing.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-900 p-4 text-white shadow transition hover:border-blue-500/50 dark:border-slate-800"
            >
              <div>
                {/* Top row: Colored dot + Zone/TicketTypeName and Pill badge */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${getZoneColor(listing.ticketTypeName || undefined)}`} />
                    <span className="text-xs font-bold uppercase tracking-wide text-white truncate max-w-[100px]">
                      {listing.ticketTypeName || "Vé"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isRetail
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      }`}
                    >
                      {isRetail ? "Bán lẻ" : "Không bán lẻ"}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {listingCode}
                    </span>
                  </div>
                </div>

                {/* Body: Key-value rows */}
                <dl className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Số lượng:</dt>
                    <dd className="font-medium text-slate-200">{quantity} vé</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Suất diễn:</dt>
                    <dd className="font-medium text-slate-200 text-right truncate max-w-[140px]">
                      {dateTime(event?.startTime)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Khu vực:</dt>
                    <dd className="font-medium text-slate-200 truncate max-w-[140px]">
                      {listing.section || listing.ticketTypeName || "Tiêu chuẩn"}
                    </dd>
                  </div>
                  {(listing.row || listing.seat) && (
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Hàng / Ghế:</dt>
                      <dd className="font-medium text-slate-200 truncate max-w-[140px]">
                        {[listing.row && `Hàng ${listing.row}`, listing.seat && `Ghế ${listing.seat}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-800 pt-2 mt-2">
                    <dt className="text-slate-400">Giá bán:</dt>
                    <dd className="text-base font-bold text-blue-400">
                      {money(listing.price)}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Action Button */}
              <div className="mt-4">
                {isOwner ? (
                  <div className="text-center">
                    <span className="inline-block rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-400">
                      Vé của bạn
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(`/resale-ticket/${eventId}/ticket/${listing.id}`)}
                    className="w-full rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Chọn vé
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
};

export default ResaleEventDetail;
