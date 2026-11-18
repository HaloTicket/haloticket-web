import { useTranslation } from "react-i18next";
import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { eventApi } from "@/services/eventApi";

import type { EventApiData } from "@/services/eventApi";

/** Props của khu vực sự kiện đặc biệt: tiêu đề, số lượng tối đa và danh sách sự kiện (nếu không truyền thì tự tải từ API). */
interface SpecialEventsProps {
  title?: string;
  limit?: number;
  events?: EventApiData[];
}

/** Khu vực sự kiện đặc biệt: poster các sự kiện nổi bật (đang hot hoặc giá trên 500.000), bổ sung ngẫu nhiên cho đủ {@code limit}, cuộn ngang. */
export const SpecialEvents: React.FC<SpecialEventsProps> = ({ title, limit = 8, events: propEvents }) => {
  const { t: translate } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);
  const [events, setEvents] = useState<Array<EventApiData>>([]);

  // tải dữ liệu sự kiện
  useEffect(() => {
    /** Lọc sự kiện đặc biệt và bổ sung ngẫu nhiên nếu chưa đủ số lượng. */
    const filterSpecialEvents = (data: EventApiData[]) => {
      // tiêu chí sự kiện đặc biệt: giá trị cao hoặc isHot
      const special = data.filter(e => e.isHot || Number(e.minPrice || e.price) > 500000);
      // nếu chưa đủ thì chọn ngẫu nhiên thêm
      if (special.length < limit) {
        const others = data.filter(e => !special.includes(e));
        special.push(...others.sort(() => 0.5 - Math.random()).slice(0, limit - special.length));
      }
      return special.slice(0, limit);
    };

    if (propEvents && propEvents.length > 0) {
      setEvents(filterSpecialEvents(propEvents));
    } else {
      eventApi.getAllEvents().then((data) => {
        if (data && data.length > 0) {
          setEvents(filterSpecialEvents(data));
        }
      });
    }
  }, [propEvents, limit]);

  /** Cập nhật việc hiện hay ẩn nút cuộn trái và phải theo vị trí cuộn hiện tại. */
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeft(scrollLeft > 10);
      setShowRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
  }, [events]);

  /** Cuộn dải poster sang trái 350 điểm ảnh. */
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -350, behavior: "smooth" });
    }
  };

  /** Cuộn dải poster sang phải 350 điểm ảnh. */
  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 350, behavior: "smooth" });
    }
  };

  if (events.length === 0) return null;

  return (
    <div className="mb-12">
      {/* Tiêu đề */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl md:text-2xl font-extrabold app-text-main tracking-tight">
          {translate(title || "Sự kiện đặc biệt")}</h2>
      </div>

      {/* Khung băng chuyền poster */}
      <div className="relative group">
        {/* Nút mũi tên trái */}
        {showLeft && (
          <button
            type="button"
            onClick={scrollLeft}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 text-white border border-slate-700 shadow-xl backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-blue-600 hover:scale-110 cursor-pointer"
            aria-label={translate("Cuộn sang trái")}
          >
            <FiChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Vùng cuộn các poster */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex items-center gap-4 overflow-x-auto pb-2 no-scrollbar scroll-smooth"
        >
          {events.map((event) => (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="group/poster relative shrink-0 w-[220px] md:w-[250px] aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 border app-border hover:border-blue-500 transition-all duration-300 hover:scale-105 shadow-xl cursor-pointer"
            >
              <img
                src={event.image || event.bannerUrl || event.thumbnailUrl}
                alt={event.title}
                className="w-full h-full object-cover group-hover/poster:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-0 group-hover/poster:opacity-100 transition-opacity duration-300" />
            </Link>
          ))}
        </div>

        {/* Nút mũi tên phải */}
        {showRight && (
          <button
            type="button"
            onClick={scrollRight}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 text-white border border-slate-700 shadow-xl backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-blue-600 hover:scale-110 cursor-pointer"
            aria-label={translate("Cuộn sang phải")}
          >
            <FiChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default SpecialEvents;
