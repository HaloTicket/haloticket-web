import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { FiCalendar, FiFilter, FiClock } from "react-icons/fi";
import { eventApi, type EventApiData } from "@/services/eventApi";
import { EventCard } from "@/components/common/EventCard";
import DateFilterModal from "./components/DateFilterModal";
import AdvancedFilterModal from "./components/AdvancedFilterModal";

export default function EventSearch() {
  const { t: translate } = useTranslation();
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const cityParam = searchParams.get("city") || "";

  const [allEvents, setAllEvents] = useState<EventApiData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // filter modal toggle states
  const [isDateModalOpen, setIsDateModalOpen] = useState<boolean>(false);
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState<boolean>(false);

  // active filter values
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>("Tất cả các ngày");
  const [selectedLocation, setSelectedLocation] = useState<string>(cityParam || "Toàn quốc");
  const [, setIsFree] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("Tất cả");

  const dateFilterRef = useRef<HTMLDivElement>(null);
  const advancedFilterRef = useRef<HTMLDivElement>(null);

  // close modals on click outside
  useEffect(() => {
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

  // fetch all real events from Backend API
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

  // filter events based on active search parameters
  const filteredEvents = allEvents.filter((ev: EventApiData) => {
    // text query filter
    if (queryParam) {
      const q = queryParam.toLowerCase();
      const matchTitle = ev.title?.toLowerCase().includes(q);
      const matchLoc = ev.locationName?.toLowerCase().includes(q);
      const matchAddress = ev.address?.toLowerCase().includes(q);
      const matchCategory = ev.categoryName?.toLowerCase().includes(q);
      if (!matchTitle && !matchLoc && !matchAddress && !matchCategory) return false;
    }

    // location filter
    if (selectedLocation !== "Toàn quốc") {
      const loc = selectedLocation.toLowerCase();
      const matchLoc = ev.address?.toLowerCase().includes(loc) || ev.locationName?.toLowerCase().includes(loc);
      if (!matchLoc) return false;
    }

    // category filter
    if (selectedCategory !== "Tất cả") {
      if (ev.categoryName !== selectedCategory) return false;
    }

    return true;
  });

  // split into upcoming vs past events
  const upcomingEvents = filteredEvents.filter((ev: EventApiData & { isEnded?: boolean }) => !ev.isEnded);

  return (
    <div className="min-h-screen bg-[#f4f4f5] dark:bg-[#27272a] text-zinc-900 dark:text-zinc-100 pb-16 transition-colors duration-300">
      <div className="container mx-auto px-4 md:px-8 pt-8">
        {/* Top Search Result Header & Filter Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold app-text-main tracking-tight">
              {translate("Sự kiện (")}{filteredEvents.length})
            </h1>
            {queryParam && (
              <p className="text-xs md:text-sm font-semibold app-text-muted mt-1">
                {translate("Kết quả tìm kiếm cho từ khóa:")}<strong className="app-text-brand">"{queryParam}"</strong>
              </p>
            )}
          </div>

          {/* Filter Bar Buttons */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Date Filter Button */}
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

            {/* Advanced Filter Button */}
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

        {/* Loading Spinner State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-extrabold text-sm app-text-muted">{translate("Đang tải danh sách sự kiện...")}</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Upcoming Events */}
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
