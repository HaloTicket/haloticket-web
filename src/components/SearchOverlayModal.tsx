import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiTrendingUp, FiClock, FiCalendar, FiMapPin, FiChevronRight, FiTrash2 } from "react-icons/fi";
import { DESTINATIONS } from "@/mock/eventData";
import { eventApi } from "@/services/eventApi";
import {
  getSearchHistory,
  removeSearchHistoryItem
} from "@/utils/searchHistory";

interface SearchOverlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSelectKeyword: (kw: string) => void;
}

export const SearchOverlayModal: React.FC<SearchOverlayModalProps> = ({
  isOpen,
  onClose,
  onSelectKeyword
}) => {
  const [activeTab, setActiveTab] = useState<"category" | "city">("category");
  const [history, setHistory] = useState<string[]>([]);
  const [realEvents, setRealEvents] = useState<any[]>([]);
  const [trendingKeywords, setTrendingKeywords] = useState<string[]>(["idecaf", "xoay tròn", "Pickleball World Cup"]);

  // Sync search history & trending keywords from DB query whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setHistory(getSearchHistory());
      eventApi.getTrendingSearches(3).then((list) => {
        if (list && list.length > 0) {
          setTrendingKeywords(list);
        }
      });
    }
  }, [isOpen]);

  // Fetch real events from backend API for recommendations
  useEffect(() => {
    eventApi.getAllEvents().then((events) => {
      if (events && events.length > 0) {
        setRealEvents(events.slice(0, 6));
      }
    });
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categoryCards = [
    {
      title: "Nhạc sống",
      image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80",
      path: "/category/music"
    },
    {
      title: "Sân khấu & Nghệ thuật",
      image: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=500&q=80",
      path: "/category/stage"
    },
    {
      title: "Thể Thao",
      image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&q=80",
      path: "/category/sports"
    },
    {
      title: "Hội thảo & Workshop",
      image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&q=80",
      path: "/category/workshop"
    }
  ];

  const handleRemoveHistory = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    removeSearchHistoryItem(item);
    setHistory(getSearchHistory());
  };

  return (
    <div className="absolute top-full left-0 z-50 mt-2.5 w-[82vw] max-w-3xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl border app-border rounded-3xl p-5 md:p-6 shadow-2xl space-y-5 animate-in fade-in slide-in-from-top-2 max-h-[75vh] overflow-y-auto no-scrollbar">

      {/* Saved Search History Items */}
      {history.length > 0 && (
        <div className="space-y-1">
          {history.map((item) => (
            <div
              key={item}
              onClick={() => {
                onSelectKeyword(item);
                onClose();
              }}
              className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FiClock className="w-4 h-4 app-text-muted group-hover:app-text-brand transition-colors shrink-0" />
                <span className="font-semibold text-xs md:text-sm app-text-main group-hover:app-text-brand transition-colors">
                  {item}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => handleRemoveHistory(e, item)}
                className="p-1 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                title="Xóa lịch sử này"
              >
                <FiTrash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Top 3 Dynamic Searched Keywords */}
      <div className="space-y-1">
        {trendingKeywords.map((kw) => (
          <button
            key={kw}
            type="button"
            onClick={() => {
              onSelectKeyword(kw);
              onClose();
            }}
            className="flex items-center gap-3 w-full text-left py-2 px-3 rounded-xl hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 transition-colors group cursor-pointer"
          >
            <FiTrendingUp className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform shrink-0" />
            <span className="font-semibold text-xs md:text-sm app-text-main group-hover:app-text-brand transition-colors">
              {kw}
            </span>
          </button>
        ))}
      </div>

      <hr className="border-slate-200/60 dark:border-slate-800/60" />

      {/* Explore Tab Switcher*/}
      <div>
        <div className="flex items-center gap-6 mb-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-2.5">
          <button
            type="button"
            onClick={() => setActiveTab("category")}
            className={`font-extrabold text-xs md:text-sm relative pb-1.5 transition-colors cursor-pointer ${activeTab === "category"
                ? "app-text-brand"
                : "app-text-muted hover:app-text-main"
              }`}
          >
            Khám phá theo Thể loại
            {activeTab === "category" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-full shadow-xs" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("city")}
            className={`font-extrabold text-xs md:text-sm relative pb-1.5 transition-colors cursor-pointer ${activeTab === "city"
                ? "app-text-brand"
                : "app-text-muted hover:app-text-main"
              }`}
          >
            Khám phá theo Thành phố
            {activeTab === "city" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-full shadow-xs" />
            )}
          </button>
        </div>

        {/* Categories Cards Grid */}
        {activeTab === "category" ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {categoryCards.map((cat) => (
              <Link
                key={cat.title}
                to={cat.path}
                onClick={onClose}
                className="group relative aspect-[16/9] rounded-xl overflow-hidden bg-slate-900 border app-border shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
              >
                <img
                  src={cat.image}
                  alt={cat.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 brightness-75"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-2.5">
                  <span className="font-extrabold text-[11px] md:text-xs text-white line-clamp-1">
                    {cat.title}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* Cities Cards Grid */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DESTINATIONS.map((city) => (
              <Link
                key={city.id}
                to={`/search?city=${encodeURIComponent(city.name)}`}
                onClick={onClose}
                className="group relative aspect-[16/9] rounded-xl overflow-hidden bg-slate-900 border app-border shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
              >
                <img
                  src={city.image}
                  alt={city.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 brightness-75"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-2.5">
                  <span className="font-extrabold text-[11px] md:text-xs text-white line-clamp-1 flex items-center gap-1">
                    <FiMapPin className="w-3 h-3 app-text-brand" />
                    {city.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <hr className="border-slate-200/60 dark:border-slate-800/60" />

      {/* Recommendations Grid */}
      <div>
        <h4 className="font-extrabold text-xs md:text-sm app-text-main mb-3 tracking-tight">
          Gợi ý dành cho bạn
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {realEvents.map((ev) => (
            <Link
              key={ev.id}
              to={`/events/${ev.id}`}
              onClick={onClose}
              className="group app-bg-card rounded-xl overflow-hidden border app-border hover:border-brand-primary transition-all duration-300 shadow-xs hover:shadow-md p-3 flex flex-col justify-between"
            >
              <div className="relative aspect-[16/9] rounded-lg overflow-hidden mb-2.5 bg-slate-950">
                <img
                  src={ev.image}
                  alt={ev.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <h5 className="font-extrabold text-xs app-text-main line-clamp-2 leading-snug mb-2 group-hover:app-text-brand transition-colors">
                {ev.title}
              </h5>

              <div className="space-y-0.5 text-[11px]">
                <p className="font-extrabold text-xs app-text-brand">
                  {ev.price}
                </p>
                <div className="flex items-center gap-1 app-text-muted font-semibold">
                  <FiCalendar className="w-3 h-3" />
                  <span>{ev.date}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Load More Button */}
        <div className="flex justify-center mt-5">
          <Link
            to="/search"
            onClick={onClose}
            className="px-6 py-2 gradient-btn text-white font-extrabold text-xs rounded-lg shadow-sm hover:scale-105 transition-transform inline-flex items-center gap-1.5"
          >
            <span>Xem thêm sự kiện</span>
            <FiChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SearchOverlayModal;
