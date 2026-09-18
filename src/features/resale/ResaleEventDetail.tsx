import { useEffect, useMemo, useRef, useState } from "react";
import { FiCalendar, FiCheck, FiChevronDown, FiFilter, FiMapPin } from "react-icons/fi";
import { Link, useNavigate, useParams } from "react-router-dom";

import NotificationModal from "@/components/common/NotificationModal";
import { PATHS } from "@/routes/paths";
import { eventApi } from "@/services/eventApi";
import { getKeycloakSession } from "@/services/keycloakSession";
import { marketplaceApi } from "@/services/marketplaceApi";
import type { TicketListing } from "@/types/marketplace";

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const formatEventDate = (val?: unknown) => {
  if (!val) return "Đang cập nhật";
  const d = new Date(String(val));
  if (isNaN(d.getTime())) return String(val);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day} tháng ${month}, ${year}`;
};

const formatEventTime = (val?: unknown) => {
  if (!val) return "19:00";
  const d = new Date(String(val));
  if (isNaN(d.getTime())) return "19:00";
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${mins}`;
};

const getTierColor = (tierName: string) => {
  const t = tierName.toUpperCase();
  if (t.includes("VVIP")) return { dot: "bg-emerald-400 shadow-emerald-400/80", text: "text-emerald-400" };
  if (t.includes("VIP")) return { dot: "bg-pink-500 shadow-pink-500/80", text: "text-pink-400" };
  if (t.includes("THƯỜNG") || t.includes("STANDARD") || t.includes("GA")) {
    return { dot: "bg-sky-400 shadow-sky-400/80", text: "text-sky-400" };
  }
  if (t.includes("LẦU") || t.includes("BALCONY")) {
    return { dot: "bg-amber-400 shadow-amber-400/80", text: "text-amber-400" };
  }
  return { dot: "bg-indigo-400 shadow-indigo-400/80", text: "text-indigo-400" };
};

const getListingCode = (listing: TicketListing & { ticketCode?: string | null }) => {
  if (listing.ticketCode) return listing.ticketCode;
  const numOnly = String(listing.id).replace(/\D/g, "");
  return `RSL${(numOnly || "758250945").slice(-9).padEnd(9, "0")}`;
};

export const ResaleEventDetail = () => {
  const { eventId = "" } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Record<string, unknown> | null>(null);
  const [listings, setListings] = useState<TicketListing[]>([]);
  const [sort, setSort] = useState("price-asc");
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loginPrompt, setLoginPrompt] = useState<string | null>(null);
  const [showSectionMenu, setShowSectionMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const sectionMenuRef = useRef<HTMLDivElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sectionMenuRef.current && !sectionMenuRef.current.contains(event.target as Node)) {
        setShowSectionMenu(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowSectionMenu(false);
        setShowFilterMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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

  const sorted = useMemo(() => {
    let list = [...listings];
    if (selectedSection !== "ALL") {
      list = list.filter(
        (l) => (l.ticketTypeName || l.section || "").toUpperCase() === selectedSection.toUpperCase(),
      );
    }
    return list.sort((a, b) => (sort === "price-desc" ? b.price - a.price : a.price - b.price));
  }, [listings, sort, selectedSection]);

  const uniqueSections = useMemo(() => {
    const set = new Set<string>();
    listings.forEach((l) => {
      const name = l.ticketTypeName || l.section;
      if (name) set.add(name);
    });
    return Array.from(set);
  }, [listings]);

  const buy = (listing: TicketListing) => {
    const target = `/resale-ticket/${eventId}/ticket/${listing.id}`;
    if (!getKeycloakSession().isAuthenticated()) {
      setLoginPrompt(target);
      return;
    }
    navigate(target);
  };

  const eventTitle = String(event?.title ?? "Sự kiện");
  const venueName = String(event?.venueName ?? event?.locationName ?? "Địa điểm đang cập nhật");
  const address = String(event?.address ?? event?.location ?? "");
  const posterImage = String(event?.posterImage ?? event?.thumbnailUrl ?? event?.bannerUrl ?? "");
  const startTime = event?.startTime ? String(event.startTime) : undefined;
  const endTime = event?.endTime ? String(event.endTime) : undefined;

  const showtimeString = startTime
    ? `${formatEventTime(startTime)}${endTime ? ` - ${formatEventTime(endTime)}` : ""}, ${formatEventDate(startTime)}`
    : "Đang cập nhật thời gian";

  return (
    <>
      <main className="min-h-[calc(100vh-220px)] bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Link to="/" className="hover:text-blue-600 transition-colors">
              Trang chủ
            </Link>
            <span>/</span>
            <Link to="/resale-ticket" className="hover:text-blue-600 transition-colors">
              Vé bán lại
            </Link>
            <span>/</span>
            <span className="max-w-xs truncate font-medium text-slate-700 dark:text-slate-200">
              {eventTitle}
            </span>
          </nav>

          {/* Ticket-stub Top Event Banner (Ảnh 2) */}
          <section
            aria-label="Thông tin sự kiện vé bán lại"
            className="relative mb-8 overflow-hidden rounded-2xl md:rounded-3xl border app-border bg-slate-900 text-white shadow-xl"
          >
            <div className="relative grid grid-cols-1 md:grid-cols-10 min-h-[280px] md:h-[390px] lg:h-[430px] xl:h-[450px] md:min-h-0">
              {/* Left Ticket Stub Info (4 parts - 40%) */}
              <div className="flex flex-col justify-between p-6 sm:p-7 lg:p-8 xl:p-9 md:col-span-4 z-10">
                <div>
                  <span className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold tracking-wide text-white shadow-sm">
                    Bán lại vé
                  </span>
                  <h1 className="mt-3.5 text-xl sm:text-2xl lg:text-3xl font-black leading-snug text-white line-clamp-3">
                    {eventTitle}
                  </h1>
                </div>

                <div className="mt-5 space-y-3 text-xs sm:text-sm">
                  <div className="flex items-center gap-2.5 text-slate-200 font-medium">
                    <FiCalendar className="text-blue-400 shrink-0 text-base" />
                    <span className="line-clamp-1">{showtimeString}</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-slate-200 font-medium">
                    <FiMapPin className="text-blue-400 shrink-0 text-base mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-white font-bold block truncate">{venueName}</span>
                      {address && (
                        <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed mt-0.5">{address}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seam Cutouts & Perforation Line (Visible on desktop at exact 40% mark) */}
              <div
                className="hidden md:block absolute -top-5 left-[40%] -translate-x-1/2 w-10 h-10 rounded-full app-bg-page z-20 border-b app-border"
                aria-hidden="true"
              />
              <div
                className="hidden md:block absolute -bottom-5 left-[40%] -translate-x-1/2 w-10 h-10 rounded-full app-bg-page z-20 border-t app-border"
                aria-hidden="true"
              />
              <div
                className="hidden md:block absolute top-6 bottom-6 left-[40%] -translate-x-1/2 border-l-2 border-dashed app-border z-10"
                aria-hidden="true"
              />

              {/* Right Ticket Stub Poster Banner (6 parts - 60%) */}
              <div className="relative md:col-span-6 min-h-[220px] md:min-h-0 md:h-full bg-slate-900 overflow-hidden">
                {posterImage ? (
                  <img
                    src={posterImage}
                    alt={eventTitle}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-center text-slate-400 text-sm">
                    {eventTitle}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none md:bg-gradient-to-r md:from-black/30 md:via-transparent" />
              </div>
            </div>
          </section>

          {/* Title & Filter Header (Nền nổi bật nhẹ trên màu nền hiện có) */}
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border app-border app-bg-card p-4 sm:px-6 sm:py-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Danh sách vé bán lại
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Button 1: Tất cả suất diễn */}
              <div className="relative" ref={sectionMenuRef}>
                <button
                  type="button"
                  aria-label="Lọc theo suất diễn"
                  onClick={() => {
                    setShowSectionMenu((prev) => !prev);
                    setShowFilterMenu(false);
                  }}
                  className="flex items-center gap-2 rounded-full bg-slate-200/90 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300 dark:bg-[#515158] dark:text-white dark:hover:bg-[#606068] transition-colors shadow-xs"
                >
                  <span>{selectedSection === "ALL" ? "Tất cả suất diễn" : selectedSection}</span>
                  <FiChevronDown
                    className={`text-xs transition-transform duration-200 ${showSectionMenu ? "rotate-180" : ""}`}
                  />
                </button>

                {showSectionMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border app-border app-bg-card p-1.5 shadow-xl z-30">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSection("ALL");
                        setShowSectionMenu(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-colors ${
                        selectedSection === "ALL"
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span>Tất cả suất diễn</span>
                      {selectedSection === "ALL" && <FiCheck className="text-sm shrink-0" />}
                    </button>
                    {uniqueSections.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => {
                          setSelectedSection(sec);
                          setShowSectionMenu(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-colors ${
                          selectedSection === sec
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <span className="truncate">{sec}</span>
                        {selectedSection === sec && <FiCheck className="text-sm shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Button 2: Bộ lọc */}
              <div className="relative" ref={filterMenuRef}>
                <button
                  type="button"
                  aria-label="Bộ lọc sắp xếp"
                  onClick={() => {
                    setShowFilterMenu((prev) => !prev);
                    setShowSectionMenu(false);
                  }}
                  className="flex items-center gap-2 rounded-full bg-slate-200/90 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300 dark:bg-[#515158] dark:text-white dark:hover:bg-[#606068] transition-colors shadow-xs"
                >
                  <FiFilter className="text-sm shrink-0" />
                  <span>Bộ lọc</span>
                  <FiChevronDown
                    className={`text-xs transition-transform duration-200 ${showFilterMenu ? "rotate-180" : ""}`}
                  />
                </button>

                {showFilterMenu && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border app-border app-bg-card p-1.5 shadow-xl z-30">
                    <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Sắp xếp theo giá
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSort("price-asc");
                        setShowFilterMenu(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-colors ${
                        sort === "price-asc"
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span>Giá thấp trước</span>
                      {sort === "price-asc" && <FiCheck className="text-sm shrink-0" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSort("price-desc");
                        setShowFilterMenu(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-colors ${
                        sort === "price-desc"
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span>Giá cao trước</span>
                      {sort === "price-desc" && <FiCheck className="text-sm shrink-0" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {loading && (
            <div className="rounded-2xl border app-border bg-white p-12 text-center text-sm app-text-muted dark:bg-zinc-900">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              <p className="mt-3 text-sm">Đang tải danh sách vé bán lại…</p>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300"
            >
              {error}
            </div>
          )}

          {!loading && !error && sorted.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-base font-bold text-slate-900 dark:text-white">
                Sự kiện hiện chưa có vé bán lại.
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Vui lòng quay lại sau hoặc theo dõi cập nhật từ ban tổ chức.
              </p>
            </div>
          )}

          {/* Ticket Items Grid - Shape & Layout like Ảnh 2, Clickable Entire Ticket */}
          <section
            aria-label="Danh sách các vé bán lại"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {sorted.map((listing) => {
              const owner = listing.ownedByCurrentUser === true;
              const quantity = listing.quantity || 1;
              const retail = quantity <= 1 || listing.allowRetail !== false;
              const tier = listing.ticketTypeName || listing.section || "Tiêu chuẩn";
              const tierColor = getTierColor(tier);
              const listingCode = getListingCode(listing);
              const eventDateString = formatEventDate(event?.startTime);
              const eventTimeString = formatEventTime(event?.startTime);

              return (
                <article
                  key={listing.id}
                  onClick={() => buy(listing)}
                  className="group relative flex min-h-[220px] cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border app-border app-bg-card p-4 sm:p-5 app-text-main shadow-md transition-all duration-200 hover:-translate-y-1 hover:border-blue-500 hover:shadow-xl"
                >
                  {/* Top Tier Header */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${tierColor.dot}`} />
                        <span className="text-sm font-black uppercase tracking-wider app-text-main">
                          {tier} · {quantity} vé
                        </span>
                      </div>
                      {owner && (
                        <span className="rounded-full border border-blue-500/40 bg-blue-900/40 px-2 py-0.5 text-[11px] font-semibold text-blue-300">
                          Vé của bạn
                        </span>
                      )}
                    </div>

                    {/* Semicircle Notches on Left and Right borders */}
                    <div
                      className="absolute -left-2.5 top-[46px] h-5 w-5 rounded-full app-bg-page border-r app-border"
                      aria-hidden="true"
                    />
                    <div
                      className="absolute -right-2.5 top-[46px] h-5 w-5 rounded-full app-bg-page border-l app-border"
                      aria-hidden="true"
                    />

                    {/* Perforation line */}
                    <div className="my-3.5 border-t border-dashed app-border" />

                    {/* Badge & Listing Code Row */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs ${
                          retail ? "bg-blue-600" : "bg-indigo-600"
                        }`}
                      >
                        {retail ? "Bán lẻ" : "Không bán lẻ"}
                      </span>
                      <span className="font-mono text-xs font-bold app-text-muted tracking-wider">
                        {listingCode}
                      </span>
                    </div>

                    {/* Ticket Details Rows (Image 2 style) */}
                    <div className="mt-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="app-text-muted">Số lượng:</span>
                        <span className="font-bold app-text-main">{quantity}</span>
                      </div>

                      <div className="flex items-start justify-between">
                        <span className="app-text-muted mt-0.5">Suất diễn:</span>
                        <div className="text-right">
                          <p className="font-bold app-text-main">{eventTimeString}</p>
                          <p className="text-[11px] app-text-muted">{eventDateString}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="app-text-muted">Khu vực:</span>
                        <span className="font-bold app-text-main truncate max-w-[120px]">
                          Khu vực: {listing.section || tier}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price Row (Bottom) */}
                  <div className="mt-5 flex items-center justify-between border-t app-border pt-3">
                    <div>
                      <span className="text-xs app-text-muted block">Giá bán mỗi vé:</span>
                      <span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 tracking-tight">
                        {money(listing.price)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        buy(listing);
                      }}
                      className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 shadow-xs transition-colors cursor-pointer"
                    >
                      Mua vé
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      </main>

      <NotificationModal
        open={Boolean(loginPrompt)}
        title="Đăng nhập để mua vé"
        message="Bạn có thể xem toàn bộ vé bán lại mà không cần đăng nhập. Hãy đăng nhập để giữ vé và tiếp tục thanh toán."
        variant="info"
        onClose={() => setLoginPrompt(null)}
        actions={[
          {
            label: "Đăng nhập",
            variant: "primary",
            onClick: () => {
              if (loginPrompt) navigate(PATHS.LOGIN, { state: { from: loginPrompt } });
            },
          },
          { label: "Ở lại trang", variant: "secondary", onClick: () => setLoginPrompt(null) },
        ]}
      />
    </>
  );
};

export default ResaleEventDetail;
