import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { FiCalendar, FiFilter, FiCpu, FiAlertCircle } from "react-icons/fi";
import { eventApi, type EventApiData, type EventSearchParams } from "@/services/eventApi";
import { adminConfigApi } from "@/services/adminConfigApi";
import type { Category } from "@/types/adminConfig";
import { aiApi } from "@/services/aiApi";
import { resolveAiError, aiErrorMessage, type AiErrorInfo } from "@/utils/aiErrors";
import { EventCard } from "@/components/common/EventCard";
import DateFilterModal, { type DateFilterValue } from "./components/DateFilterModal";
import AdvancedFilterModal, { type AdvancedFilterValues } from "./components/AdvancedFilterModal";
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  applyFiltersToParams,
  filterAndSortEvents,
  getDateRange,
  parseFilters,
  type SearchFilters,
  type SortKey,
} from "./eventSearchFilters";

/** Số sự kiện hiển thị mỗi lần; bấm "Xem thêm" để hiện tiếp. */
const PAGE_SIZE = 12;

/** Nhãn tiếng Việt (khóa dịch) của các lựa chọn ngày nhanh, dùng cho nhãn nút lọc ngày. */
const DATE_LABELS: Record<string, string> = {
  all: "Tất cả các ngày",
  today: "Hôm nay",
  tomorrow: "Ngày mai",
  weekend: "Cuối tuần này",
  month: "Tháng này",
  custom: "Khoảng ngày tự chọn",
};

/** Các cách sắp xếp kết quả: giá trị lưu trên URL và nhãn tiếng Việt làm khóa dịch. */
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevance", label: "Liên quan nhất" },
  { value: "soonest", label: "Diễn ra sớm nhất" },
  { value: "priceAsc", label: "Giá thấp đến cao" },
  { value: "priceDesc", label: "Giá cao đến thấp" },
];

/**
 * Trang tìm kiếm và lọc sự kiện theo từ khóa, thành phố, danh mục, ngày, miễn phí và sắp xếp; mọi bộ lọc nằm trên URL nên chia sẻ,
 * tải lại và nút Back đều hoạt động. Hỗ trợ tìm theo ngữ nghĩa bằng AI khi có từ khóa. Danh sách hiện theo từng trang, có trạng thái lỗi (thử lại)
 * và trạng thái rỗng (xóa bộ lọc).
 */
export default function EventSearch() {
  const { t: translate } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const aiParam = searchParams.get("ai") === "true";
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const { slug } = useParams<{ slug: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState<boolean>(false);
  const routeCategory = categories.find((cat) => (cat.slug?.trim() || cat.id) === slug);

  useEffect(() => {
    adminConfigApi
      .getCategories()
      .then((res) => {
        const data = Array.isArray(res) ? res : res.data;
        setCategories(data || []);
      })
      .catch(() => {})
      .finally(() => setCategoriesLoaded(true));
  }, []);

  // kết quả tìm kiếm từ máy chủ (lọc, sắp xếp, phân trang ở máy chủ) và tổng số sự kiện khớp
  const [results, setResults] = useState<EventApiData[]>([]);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [nextPage, setNextPage] = useState<number>(1);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [loadMoreError, setLoadMoreError] = useState<boolean>(false);
  const [aiEvents, setAiEvents] = useState<EventApiData[]>([]);
  const [isAiMode, setIsAiMode] = useState<boolean>(aiParam);
  const [isAiSearching, setIsAiSearching] = useState<boolean>(false);
  const [aiError, setAiError] = useState<AiErrorInfo | null>(null);
  const [aiDegraded, setAiDegraded] = useState<boolean>(false);
  const [aiRetryTick, setAiRetryTick] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [loadTick, setLoadTick] = useState<number>(0);

  // trạng thái bật tắt các hộp thoại bộ lọc
  const [isDateModalOpen, setIsDateModalOpen] = useState<boolean>(false);
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState<boolean>(false);

  const dateFilterRef = useRef<HTMLDivElement>(null);
  const advancedFilterRef = useRef<HTMLDivElement>(null);

  /** Ghi bộ lọc mới lên URL (giữ nguyên từ khóa và các tham số khác). */
  const updateFilters = useCallback(
    (next: SearchFilters) => {
      setSearchParams(applyFiltersToParams(searchParams, next));
    },
    [searchParams, setSearchParams]
  );

  // đóng các hộp thoại khi bấm ra ngoài
  useEffect(() => {
    /** Đóng hộp thoại lọc ngày và lọc nâng cao khi bấm ra ngoài vùng của chúng. */
    const handleClickOutside = (e: MouseEvent) => {
      if (dateFilterRef.current && !dateFilterRef.current.contains(e.target as Node)) {
        setIsDateModalOpen(false);
      }
      if (advancedFilterRef.current && !advancedFilterRef.current.contains(e.target as Node)) {
        setIsAdvancedModalOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // tham số tìm kiếm gửi máy chủ: ngày nhanh được đổi thành khoảng ngày, danh mục của route dùng id
  const searchKey = useMemo(() => {
    const range = getDateRange(filters, new Date());
    const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const params: EventSearchParams = {
      q: queryParam,
      city: filters.city || undefined,
      category: slug ? undefined : filters.category || undefined,
      categoryId: slug ? routeCategory?.id : undefined,
      from: range?.start ? day(range.start) : undefined,
      to: range?.end ? day(new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate() - 1)) : undefined,
      free: filters.free || undefined,
      sort: filters.sort,
      size: PAGE_SIZE,
    };
    return JSON.stringify(params);
  }, [filters, queryParam, slug, routeCategory]);

  // trang danh mục theo route cần biết danh mục trước khi tìm; chưa biết thì chưa gửi yêu cầu
  const waitingForRouteCategory = Boolean(slug) && !categoriesLoaded;
  const routeCategoryMissing = Boolean(slug) && categoriesLoaded && !routeCategory;

  // tải trang đầu từ máy chủ mỗi khi từ khóa hoặc bộ lọc đổi; lỗi mạng hiện trạng thái lỗi kèm nút thử lại thay vì "không có sự kiện"
  useEffect(() => {
    if (waitingForRouteCategory) return;
    if (routeCategoryMissing) {
      setResults([]);
      setTotalResults(0);
      setLoading(false);
      setLoadError(false);
      return;
    }
    let isMounted = true;
    setLoading(true);
    setLoadError(false);
    setLoadMoreError(false);
    eventApi
      .searchEvents({ ...(JSON.parse(searchKey) as EventSearchParams), page: 0 })
      .then((page) => {
        if (!isMounted) return;
        setResults(page.content);
        setTotalResults(page.totalElements);
        setNextPage(1);
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setLoadError(true);
        setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [searchKey, loadTick, waitingForRouteCategory, routeCategoryMissing]);

  /** Tải trang kế tiếp từ máy chủ và nối vào danh sách hiện có. */
  const loadMore = () => {
    setIsLoadingMore(true);
    setLoadMoreError(false);
    eventApi
      .searchEvents({ ...(JSON.parse(searchKey) as EventSearchParams), page: nextPage })
      .then((page) => {
        setResults((previous) => {
          const known = new Set(previous.map((event) => event.id));
          return [...previous, ...page.content.filter((event) => !known.has(event.id))];
        });
        setTotalResults(page.totalElements);
        setNextPage((value) => value + 1);
      })
      .catch(() => setLoadMoreError(true))
      .finally(() => setIsLoadingMore(false));
  };

  // tìm kiếm theo ngữ nghĩa và ngôn ngữ tự nhiên bằng AI khi từ khóa thay đổi
  useEffect(() => {
    if (!queryParam.trim()) {
      setAiEvents([]);
      return;
    }

    let isMounted = true;
    setIsAiSearching(true);
    setAiError(null);
    setAiDegraded(false);
    aiApi
      .searchEventsByNaturalLanguage(queryParam, 8)
      .then((res) => {
        if (isMounted && res && Array.isArray(res.events) && res.events.length > 0) {
          setAiDegraded(res.degraded === true || res.search_mode === "keyword");
          setAiEvents(res.events as unknown as EventApiData[]);
          // nếu từ khóa giống một câu tự nhiên hoặc có tham số ai thì tự bật chế độ AI
          if (aiParam || queryParam.split(" ").length >= 3) {
            setIsAiMode(true);
          }
        }
        if (isMounted) setIsAiSearching(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        // Quay về tìm kiếm từ khóa thường, đồng thời báo cho người dùng biết lý do.
        setAiEvents([]);
        setIsAiMode(false);
        setAiError(resolveAiError(err));
        setIsAiSearching(false);
      });

    return () => {
      isMounted = false;
    };
  }, [queryParam, aiParam, aiRetryTick]);

  // chỉ coi là kết quả AI khi AI thật sự trả về sự kiện (tối đa vài sự kiện nên lọc và sắp xếp ngay ở trình duyệt);
  // ngược lại dùng kết quả đã lọc, sắp xếp, phân trang từ máy chủ
  const useAiResults = isAiMode && aiEvents.length > 0;
  const aiFiltered = useMemo(
    () => (useAiResults ? filterAndSortEvents(aiEvents, filters, { routeCategoryName: slug ? routeCategory?.name ?? "\u0000" : null }) : []),
    [useAiResults, aiEvents, filters, slug, routeCategory]
  );
  const displayEvents = useAiResults ? aiFiltered : results;
  const displayTotal = useAiResults ? aiFiltered.length : totalResults;
  const hasMore = !useAiResults && results.length < totalResults;
  const filterCount = activeFilterCount(filters);
  const dateActive = filters.date !== "all";
  const advancedActive = filters.city !== "" || filters.category !== "" || filters.free;
  const dateLabel = DATE_LABELS[filters.date] ?? DATE_LABELS.all;

  /** Bỏ mọi bộ lọc nhưng giữ từ khóa, kiểu sắp xếp và các tham số khác. */
  const clearFilters = () => updateFilters({ ...DEFAULT_FILTERS, sort: filters.sort });

  return (
    <div className="min-h-screen bg-[#f4f4f5] dark:bg-[#27272a] text-zinc-900 dark:text-zinc-100 pb-16 transition-colors duration-300">
      <div className="container mx-auto px-4 md:px-8 pt-8">
        {/* Tiêu đề kết quả tìm kiếm và thanh thao tác lọc */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold app-text-main tracking-tight">
              {translate("Sự kiện (")}
              {displayTotal})
            </h1>
            {queryParam && (
              <p className="text-xs md:text-sm font-semibold app-text-muted mt-1">
                {translate("Kết quả tìm kiếm cho:")} <strong className="app-text-brand">"{queryParam}"</strong>
              </p>
            )}
          </div>

          {/* Các nút của thanh lọc */}
          <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
            {/* Nút bật tắt tìm kiếm ngữ nghĩa bằng AI */}
            {queryParam && (
              <button
                type="button"
                onClick={() => setIsAiMode(!isAiMode)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isAiMode
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-md shadow-blue-500/20"
                    : "app-bg-card border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                }`}
                title={translate("Tìm kiếm theo ngữ nghĩa và ngôn ngữ tự nhiên bằng AI")}
              >
                <FiCpu className="w-3.5 h-3.5" />
                <span>{translate("AI Tìm kiếm")}</span>
                {aiEvents.length > 0 && <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">{aiEvents.length}</span>}
              </button>
            )}

            {/* Sắp xếp */}
            <label className="flex items-center gap-2 text-xs font-bold app-text-muted">
              <span className="sr-only sm:not-sr-only">{translate("Sắp xếp")}</span>
              <select
                value={filters.sort}
                onChange={(e) => updateFilters({ ...filters, sort: e.target.value as SortKey })}
                aria-label={translate("Sắp xếp")}
                className="px-3 py-2 rounded-xl text-xs md:text-sm font-extrabold app-bg-card border app-border app-text-main cursor-pointer"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {translate(option.label)}
                  </option>
                ))}
              </select>
            </label>

            {/* Nút lọc ngày */}
            <div ref={dateFilterRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsDateModalOpen(!isDateModalOpen);
                  setIsAdvancedModalOpen(false);
                }}
                className={`px-4 py-2 rounded-xl text-xs md:text-sm font-extrabold flex items-center gap-2 border transition-all shadow-xs cursor-pointer ${
                  isDateModalOpen || dateActive ? "gradient-btn text-white shadow-md" : "app-bg-card border app-border app-text-main hover:border-brand-primary"
                }`}
              >
                <FiCalendar className="w-4 h-4" />
                <span>{translate(dateLabel)}</span>
              </button>

              <DateFilterModal
                isOpen={isDateModalOpen}
                onClose={() => setIsDateModalOpen(false)}
                value={{ date: filters.date, from: filters.from, to: filters.to }}
                onApply={(value: DateFilterValue) => updateFilters({ ...filters, ...value })}
              />
            </div>

            {/* Nút lọc nâng cao */}
            <div ref={advancedFilterRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsAdvancedModalOpen(!isAdvancedModalOpen);
                  setIsDateModalOpen(false);
                }}
                className={`px-4 py-2 rounded-xl text-xs md:text-sm font-extrabold flex items-center gap-2 border transition-all shadow-xs cursor-pointer ${
                  isAdvancedModalOpen || advancedActive ? "gradient-btn text-white shadow-md" : "app-bg-card border app-border app-text-main hover:border-brand-primary"
                }`}
              >
                <FiFilter className="w-4 h-4" />
                <span>{translate("Bộ lọc")}</span>
              </button>

              <AdvancedFilterModal
                isOpen={isAdvancedModalOpen}
                onClose={() => setIsAdvancedModalOpen(false)}
                value={{ city: filters.city, category: filters.category, free: filters.free }}
                onApply={(value: AdvancedFilterValues) => updateFilters({ ...filters, ...value })}
              />
            </div>

            {filterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-extrabold px-3 py-2 rounded-xl border app-border app-bg-card app-text-muted hover:app-text-main cursor-pointer"
              >
                {translate("Xóa bộ lọc")} ({filterCount})
              </button>
            )}
          </div>
        </div>

        {/* Tìm kiếm AI thất bại: hiển thị kết quả theo từ khóa thay thế */}
        {aiError && queryParam.trim() && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="text-xs md:text-sm app-text-main">
              <p className="font-bold">{translate("ai.search.fallbackNotice")}</p>
              <p className="mt-0.5 app-text-muted">{aiErrorMessage(aiError)}</p>
            </div>
            {aiError.retryable && (
              <button
                type="button"
                onClick={() => setAiRetryTick((tick) => tick + 1)}
                disabled={isAiSearching}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border app-border app-bg-card hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0 self-start sm:self-auto disabled:opacity-50"
              >
                {translate("ai.action.retry")}
              </button>
            )}
          </div>
        )}

        {/* Biểu ngữ tìm kiếm ngữ nghĩa bằng AI */}
        {useAiResults && queryParam && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <FiCpu className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-bold app-text-main flex items-center gap-2">
                  <span>{translate("Đang hiển thị kết quả tìm kiếm bằng Trí tuệ Nhân tạo (Semantic AI Search)")}</span>
                  {isAiSearching && (
                    <span role="status" className="text-[10px] text-blue-500 motion-safe:animate-pulse">
                      ({translate("Đang phân tích...")})
                    </span>
                  )}
                </p>
                <p className="text-[11px] app-text-muted mt-0.5">
                  {translate("Hệ thống tự động phân tích ngữ nghĩa tự nhiên cho:")} <strong className="text-blue-600 dark:text-blue-400">"{queryParam}"</strong>
                </p>
                {aiDegraded && <p className="text-[11px] app-text-muted mt-0.5">{translate("ai.search.degraded")}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAiMode(false)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border app-border app-bg-card hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
            >
              {translate("ai.search.keywordSwitch")}
            </button>
          </div>
        )}

        {/* Trạng thái đang tải, lỗi, rỗng và danh sách */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-extrabold text-sm app-text-muted">{translate("Đang tải danh sách sự kiện...")}</p>
          </div>
        ) : loadError ? (
          <div role="alert" className="app-bg-card p-8 rounded-2xl border app-border text-center space-y-4">
            <FiAlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="font-extrabold text-sm app-text-main">{translate("Không tải được danh sách sự kiện. Vui lòng kiểm tra kết nối và thử lại.")}</p>
            <button
              type="button"
              onClick={() => setLoadTick((tick) => tick + 1)}
              className="px-5 py-2.5 rounded-xl gradient-btn text-white text-xs font-extrabold shadow-md cursor-pointer"
            >
              {translate("Thử lại")}
            </button>
          </div>
        ) : displayEvents.length === 0 ? (
          <div className="app-bg-card p-8 rounded-2xl border app-border text-center space-y-4">
            <p className="font-extrabold text-sm app-text-muted">{translate("Không có sự kiện phù hợp với tìm kiếm của bạn.")}</p>
            {filterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-5 py-2.5 rounded-xl gradient-btn text-white text-xs font-extrabold shadow-md cursor-pointer"
              >
                {translate("Xóa bộ lọc")}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {displayEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {hasMore && (
              <div className="flex flex-col items-center gap-2">
                {loadMoreError && (
                  <p role="alert" className="text-xs font-semibold text-rose-500">
                    {translate("Không tải thêm được. Vui lòng thử lại.")}
                  </p>
                )}
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="px-6 py-3 rounded-xl app-bg-card border app-border app-text-main text-xs md:text-sm font-extrabold hover:border-brand-primary transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isLoadingMore ? translate("Đang tải...") : `${translate("Xem thêm")} (${displayTotal - results.length})`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
