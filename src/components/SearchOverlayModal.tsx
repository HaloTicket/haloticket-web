import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiTrendingUp, FiClock, FiCalendar, FiMapPin, FiChevronRight, FiTrash2 } from "react-icons/fi";
import { DESTINATIONS } from "@/mock/eventData";
import { eventApi, type EventApiData } from "@/services/eventApi";
import { adminConfigApi } from "@/services/adminConfigApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { Category } from "@/types/adminConfig";
import {
  getSearchHistory,
  removeSearchHistoryItem
} from "@/utils/searchHistory";

/** Props của hộp gợi ý tìm kiếm: trạng thái mở/đóng, từ khóa hiện tại, hàm đóng và hàm chọn từ khóa. */
interface SearchOverlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSelectKeyword: (kw: string) => void;
}

/**
 * Hộp gợi ý hiện dưới ô tìm kiếm ở Header: lịch sử tìm kiếm, từ khóa thịnh hành, sự kiện đề xuất
 * và thẻ danh mục hoặc thành phố. Trả về `null` khi đang đóng.
 */
export const SearchOverlayModal: React.FC<SearchOverlayModalProps> = ({
  isOpen,
  onClose,
  searchQuery,
  onSelectKeyword
}) => {
  const { t: translate } = useTranslation();
  const [activeTab, setActiveTab] = useState<"category" | "city">("category");
  const [history, setHistory] = useState<string[]>(() => getSearchHistory());
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setHistory(getSearchHistory());
    }
  }
  const [realEvents, setRealEvents] = useState<EventApiData[]>([]);
  const [trendingKeywords, setTrendingKeywords] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  // gợi ý sự kiện khi gõ dở: gửi yêu cầu sau khi ngừng gõ, tối thiểu 2 ký tự
  const [suggestions, setSuggestions] = useState<EventApiData[]>([]);
  const debouncedQuery = useDebouncedValue(searchQuery.trim(), 250);
  const typedQuery = debouncedQuery.length >= 2 ? debouncedQuery : "";

  // Mỗi lần mở hộp, nạp lại các từ khóa thịnh hành từ truy vấn trong DB
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    eventApi.getTrendingSearches(3).then((list) => {
      if (isMounted && list && list.length > 0) {
        setTrendingKeywords(list);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Lấy sự kiện và danh mục thật từ API chỉ khi hộp được mở lần đầu (không tải toàn bộ sự kiện ngay khi trang vừa vào)
  const hasLoadedSuggestions = React.useRef(false);
  useEffect(() => {
    if (!isOpen || hasLoadedSuggestions.current) return;
    hasLoadedSuggestions.current = true;
    eventApi.getAllEvents().then((events) => {
      if (events && events.length > 0) {
        setRealEvents(events.slice(0, 6));
      }
    });
    adminConfigApi
      .getCategories()
      .then((res) => {
        const list = Array.isArray(res) ? res : (res as { data?: Category[] })?.data;
        if (Array.isArray(list)) {
          setCategories(list.filter((c) => c.active && c.status !== "INACTIVE").slice(0, 8));
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // gợi ý sự kiện khớp phần đang gõ (máy chủ tìm không dấu); lỗi thì chỉ không hiện gợi ý
  useEffect(() => {
    if (!isOpen || !typedQuery) {
      setSuggestions([]);
      return;
    }
    let isMounted = true;
    eventApi
      .searchEvents({ q: typedQuery, size: 5 })
      .then((page) => {
        if (isMounted) setSuggestions(page.content);
      })
      .catch(() => {
        if (isMounted) setSuggestions([]);
      });
    return () => {
      isMounted = false;
    };
  }, [isOpen, typedQuery]);

  // Nhấn ESC để đóng hộp
  useEffect(() => {
    /** Đóng hộp khi người dùng nhấn Escape. */
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // thẻ danh mục lấy từ API; đường dẫn dùng đúng slug mà trang danh mục so khớp
  const categoryCards = categories.map((cat) => ({
    title: cat.name,
    image: cat.imageUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80",
    path: `/category/${cat.slug?.trim() || cat.id}`,
  }));

  /** Xóa một mục khỏi lịch sử tìm kiếm (không kích hoạt chọn từ khóa) rồi nạp lại danh sách. */
  const handleRemoveHistory = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    removeSearchHistoryItem(item);
    setHistory(getSearchHistory());
  };

  return (
    <div className="header-search-suggestions absolute top-full left-0 z-50 mt-2.5 w-[82vw] max-w-3xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl border app-border rounded-3xl p-5 md:p-6 shadow-2xl space-y-5 max-h-[75vh] overflow-y-auto no-scrollbar">

      {/* Gợi ý sự kiện khi đang gõ */}
      {typedQuery && suggestions.length > 0 && (
        <div className="space-y-1" role="listbox" aria-label={translate("Gợi ý sự kiện")}>
          <p className="px-3 text-[11px] font-extrabold uppercase tracking-wider app-text-muted">{translate("Gợi ý sự kiện")}</p>
          {suggestions.map((ev) => (
            <Link
              key={ev.id}
              to={`/events/${ev.id}`}
              role="option"
              aria-selected={false}
              onClick={onClose}
              className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 transition-colors group"
            >
              <img src={ev.image} alt="" className="w-12 h-9 rounded-md object-cover shrink-0 bg-slate-200 dark:bg-slate-800" loading="lazy" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-xs md:text-sm app-text-main group-hover:app-text-brand truncate">{ev.title}</span>
                <span className="block text-[11px] app-text-muted truncate">
                  {[ev.city || ev.locationName, ev.startTime ? new Date(ev.startTime).toLocaleDateString("vi-VN") : ""].filter(Boolean).join(" · ")}
                </span>
              </span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              onSelectKeyword(typedQuery);
              onClose();
            }}
            className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-xl text-xs font-extrabold app-text-brand hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
          >
            <span>{translate("Xem tất cả kết quả cho")} "{typedQuery}"</span>
            <FiChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
                title={translate("Xóa lịch sử này")}
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

      {/* AI Natural Language Search Prompt Suggestions */}
      <div className="space-y-2 p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 border border-blue-500/20">
        <div className="flex items-center gap-2 text-xs font-extrabold text-blue-600 dark:text-blue-400">
          <span>{translate("Gợi ý tìm kiếm thông minh bằng AI:")}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            "Đêm nhạc acoustic lãng mạn cuối tuần",
            "Kịch nói kịch thiếu nhi cả gia đình",
            "Giải đấu thể thao pickleball sôi động",
            "Concert âm nhạc hot nhất tháng này"
          ].map((promptText) => (
            <button
              key={promptText}
              type="button"
              onClick={() => {
                onSelectKeyword(promptText);
                onClose();
              }}
              className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer shadow-2xs"
            >
              {promptText}
            </button>
          ))}
        </div>
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
            {translate("Khám phá theo Thể loại")}{" "}{activeTab === "category" && (
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
            {translate("Khám phá theo Thành phố")}{" "}{activeTab === "city" && (
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
                    {translate(cat.title)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* Lưới thẻ thành phố */
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
                    {translate(city.name)}
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
          {translate("Gợi ý dành cho bạn")}</h4>

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
                {translate(ev.title)}
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
            <span>{translate("Xem thêm sự kiện")}</span>
            <FiChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SearchOverlayModal;
