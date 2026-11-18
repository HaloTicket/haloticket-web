import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { FiCalendar, FiFilter, FiClock, FiCpu } from "react-icons/fi";
import { eventApi, type EventApiData } from "@/services/eventApi";
import { adminConfigApi } from "@/services/adminConfigApi";
import type { Category } from "@/types/adminConfig";
import { aiApi } from "@/services/aiApi";
import { resolveAiError, aiErrorMessage, type AiErrorInfo } from "@/utils/aiErrors";
import { EventCard } from "@/components/common/EventCard";
import DateFilterModal from "./components/DateFilterModal";
import AdvancedFilterModal from "./components/AdvancedFilterModal";

/** Trang tìm kiếm và lọc sự kiện theo từ khóa, thành phố, danh mục, ngày và bộ lọc nâng cao; hỗ trợ tìm theo ngữ nghĩa bằng AI khi có từ khóa. */
export default function EventSearch() {
  const { t: translate } = useTranslation();
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const cityParam = searchParams.get("city") || "";
  const aiParam = searchParams.get("ai") === "true";

  const { slug } = useParams<{ slug: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const routeCategory = categories.find(cat => (cat.slug?.trim() || cat.id) === slug);

  useEffect(() => {
    adminConfigApi.getCategories().then(res => {
      const data = Array.isArray(res) ? res : res.data;
      setCategories(data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setSelectedCategory("Tất cả");
  }, [slug]);

  const [allEvents, setAllEvents] = useState<EventApiData[]>([]);
  const [aiEvents, setAiEvents] = useState<EventApiData[]>([]);
  const [isAiMode, setIsAiMode] = useState<boolean>(aiParam);
  const [isAiSearching, setIsAiSearching] = useState<boolean>(false);
  const [aiError, setAiError] = useState<AiErrorInfo | null>(null);
  const [aiDegraded, setAiDegraded] = useState<boolean>(false);
  const [aiRetryTick, setAiRetryTick] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // trạng thái bật tắt các hộp thoại bộ lọc
  const [isDateModalOpen, setIsDateModalOpen] = useState<boolean>(false);
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState<boolean>(false);

  // giá trị các bộ lọc đang áp dụng
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>("Tất cả các ngày");
  const [selectedLocation, setSelectedLocation] = useState<string>(cityParam || "Toàn quốc");
  const [, setIsFree] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("Tất cả");

  const dateFilterRef = useRef<HTMLDivElement>(null);
  const advancedFilterRef = useRef<HTMLDivElement>(null);

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

  // tải toàn bộ sự kiện thật từ API backend
  useEffect(() => {
    let isMounted = true;
    eventApi.getAllEvents().then((data) => {
      if (isMounted) {
        setAllEvents(data || []);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

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
    aiApi.searchEventsByNaturalLanguage(queryParam, 8).then((res) => {
      if (isMounted && res && Array.isArray(res.events) && res.events.length > 0) {
        setAiDegraded(res.degraded === true || res.search_mode === "keyword");
        setAiEvents(res.events as unknown as EventApiData[]);
        // nếu từ khóa giống một câu tự nhiên hoặc có tham số ai thì tự bật chế độ AI
        if (aiParam || queryParam.split(" ").length >= 3) {
          setIsAiMode(true);
        }
      }
      if (isMounted) setIsAiSearching(false);
    }).catch((err: unknown) => {
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

  // chọn danh sách sự kiện: tìm ngữ nghĩa bằng AI hay tìm từ khóa thường
  const baseEvents = (isAiMode && aiEvents.length > 0) ? aiEvents : allEvents;

  // lọc sự kiện theo các tham số tìm kiếm đang áp dụng
  const filteredEvents = baseEvents.filter((ev: EventApiData) => {
    // nếu không ở chế độ AI thì áp dụng bộ lọc từ khóa
    if (!isAiMode && queryParam) {
      const q = queryParam.toLowerCase();
      const matchTitle = ev.title?.toLowerCase().includes(q);
      const matchLoc = ev.locationName?.toLowerCase().includes(q);
      const matchAddress = ev.address?.toLowerCase().includes(q);
      const matchCategory = ev.categoryName?.toLowerCase().includes(q);
      if (!matchTitle && !matchLoc && !matchAddress && !matchCategory) return false;
    }

    // lọc theo địa điểm
    if (selectedLocation !== "Toàn quốc") {
      const loc = selectedLocation.toLowerCase();
      const matchLoc = ev.address?.toLowerCase().includes(loc) || ev.locationName?.toLowerCase().includes(loc) || (ev as any).city?.toLowerCase().includes(loc);
      if (!matchLoc) return false;
    }

    // Danh mục từ thanh điều hướng cũng được áp dụng khi trang tìm kiếm được dùng lại.
    if (slug && (!routeCategory || ev.categoryName !== routeCategory.name)) return false;

    // lọc theo danh mục
    if (selectedCategory !== "Tất cả") {
      if (ev.categoryName !== selectedCategory) return false;
    }

    return true;
  });

  // tách sự kiện sắp diễn ra khỏi sự kiện đã kết thúc
  const upcomingEvents = filteredEvents.filter((ev: EventApiData & { isEnded?: boolean }) => !ev.isEnded);

  return (
    <div className="min-h-screen bg-[#f4f4f5] dark:bg-[#27272a] text-zinc-900 dark:text-zinc-100 pb-16 transition-colors duration-300">
      <div className="container mx-auto px-4 md:px-8 pt-8">
        {/* Tiêu đề kết quả tìm kiếm và thanh thao tác lọc */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold app-text-main tracking-tight">
              {translate("Sự kiện (")}{filteredEvents.length})
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
                {aiEvents.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                    {aiEvents.length}
                  </span>
                )}
              </button>
            )}
            {/* Nút lọc ngày */}
            <div ref={dateFilterRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsDateModalOpen(!isDateModalOpen);
                  setIsAdvancedModalOpen(false);
                }}
                className={`px-4 py-2 rounded-xl text-xs md:text-sm font-extrabold flex items-center gap-2 border transition-all shadow-xs cursor-pointer ${isDateModalOpen || selectedDatePreset !== "Tất cả các ngày"
                  ? "gradient-btn text-white shadow-md"
                  : "app-bg-card border app-border app-text-main hover:border-brand-primary"
                  }`}
              >
                <FiCalendar className="w-4 h-4" />
                <span>{translate(selectedDatePreset)}</span>
              </button>

              <DateFilterModal
                isOpen={isDateModalOpen}
                onClose={() => setIsDateModalOpen(false)}
                currentPreset={translate(selectedDatePreset)}
                onApply={(preset) => setSelectedDatePreset(preset)}
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
                className={`px-4 py-2 rounded-xl text-xs md:text-sm font-extrabold flex items-center gap-2 border transition-all shadow-xs cursor-pointer ${isAdvancedModalOpen || selectedLocation !== "Toàn quốc" || selectedCategory !== "Tất cả"
                  ? "gradient-btn text-white shadow-md"
                  : "app-bg-card border app-border app-text-main hover:border-brand-primary"
                  }`}
              >
                <FiFilter className="w-4 h-4" />
                <span>{translate("Bộ lọc")}</span>
              </button>

              <AdvancedFilterModal
                isOpen={isAdvancedModalOpen}
                onClose={() => setIsAdvancedModalOpen(false)}
                currentLocation={selectedLocation}
                currentCategory={selectedCategory}
                onApply={(filters) => {
                  setSelectedLocation(filters.location);
                  setIsFree(filters.isFree);
                  setSelectedCategory(filters.category);
                }}
              />
            </div>
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
        {isAiMode && queryParam && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <FiCpu className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-bold app-text-main flex items-center gap-2">
                  <span>{translate("Đang hiển thị kết quả tìm kiếm bằng Trí tuệ Nhân tạo (Semantic AI Search)")}</span>
                  {isAiSearching && <span role="status" className="text-[10px] text-blue-500 motion-safe:animate-pulse">({translate("Đang phân tích...")})</span>}
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

        {/* Trạng thái đang tải */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-extrabold text-sm app-text-muted">{translate("Đang tải danh sách sự kiện...")}</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Sự kiện sắp diễn ra */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="flex items-center gap-1.5 font-extrabold text-lg md:text-xl app-text-main">
                  <FiClock className="w-5 h-5 text-emerald-500" />
                  {translate("Sắp diễn ra")}</span>
                <span className="px-3 py-1 rounded-md text-xs font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  {upcomingEvents.length} {translate("đang mở bán")}</span>
              </div>

              {upcomingEvents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {upcomingEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                <div className="app-bg-card p-8 rounded-2xl border app-border text-center">
                  <p className="font-extrabold text-sm app-text-muted">
                    {translate("Không có sự kiện sắp diễn ra phù hợp với tìm kiếm của bạn.")}</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
