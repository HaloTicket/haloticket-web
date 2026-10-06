import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiRefreshCw, FiCheckCircle, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { eventApi, type EventApiData } from "@/services/eventApi";
import { marketplaceApi } from "@/services/marketplaceApi";
import { EventCard } from "@/components/common/EventCard";

interface ResaleTicketsSectionProps {
  title?: string;
  limit?: number;
}

export const ResaleTicketsSection: React.FC<ResaleTicketsSectionProps> = ({ title, limit = 4 }) => {
  useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);
  const [events, setEvents] = useState<EventApiData[]>([]);

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

  useEffect(() => {
    // Lấy dữ liệu thật từ marketplace
    marketplaceApi.getResaleEvents().then((data: any) => {
      if (data && data.length > 0) {
        // Map ResaleEventSummary sang EventApiData format cho EventCard
        const mapped = data.map((item: any) => ({
          id: item.eventId,
          title: item.title,
          image: item.image,
          thumbnailUrl: item.image,
          startTime: item.eventDate,
          locationName: item.location,
          minPrice: item.minPrice,
          isResale: true,
          resaleCount: item.listingCount || 1,
          minResalePrice: item.minPrice
        }));
        
        // Trộn ngẫu nhiên và lấy số lượng limit
        const shuffled = mapped.sort(() => 0.5 - Math.random());
        setEvents(shuffled.slice(0, limit));
      }
    }).catch(() => {
      // Nếu lỗi API, fallback về mock
      eventApi.getAllEvents().then(data => {
        if (data && data.length > 0) {
          const shuffled = data.sort(() => 0.5 - Math.random());
          setEvents(shuffled.slice(0, limit));
        }
      });
    });
  }, [limit]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -350, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 350, behavior: "smooth" });
    }
  };

  return (
    <div className="mb-12 app-bg-card border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-sm transition-colors duration-300">
      {/* Title & Banner Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500 text-white font-extrabold text-xs rounded-md mb-2 shadow-sm">
            <FiRefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "8s" }} />
            <span>{translate("RESALE TICKET - VÉ BÁN LẠI")}</span>
          </div>
          <h3 className="text-xl md:text-2xl font-extrabold app-text-main flex items-center gap-2">
            <span>{translate(title || "Sàn Nhượng Vé Chính Thức")}</span>
            <FiCheckCircle className="w-5 h-5 text-emerald-500" />
          </h3>
          <p className="text-xs md:text-sm app-text-muted mt-1">
            {translate("An tâm mua bán vé sang nhượng với cơ chế")}<span className="text-blue-600 dark:text-blue-400 font-extrabold">{translate("Hủy cũ - Cấp mới")}</span> {translate("độc quyền tại HaloTicket.")}</p>
        </div>

        <Link
          to="/resale-ticket"
          className="px-5 py-2.5 gradient-btn text-white font-extrabold text-xs md:text-sm rounded-xl transition-all shadow-md shrink-0 cursor-pointer"
        >
          {translate("Khám phá vé bán lại")}</Link>
      </div>

      {/* Resale Event Cards Carousel Wrapper */}
      <div className="relative group">
        {/* Navigation Arrow Left (Smart Visibility) */}
        {showLeft && (
          <button
            type="button"
            onClick={scrollLeft}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 text-white border border-slate-700 shadow-2xl backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-brand-primary hover:scale-110 cursor-pointer"
            aria-label={translate("Cuộn sang trái")}
          >
            <FiChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Scrollable Container (No Scrollbars Visible) */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex items-center gap-4 overflow-x-auto pb-3 no-scrollbar scroll-smooth"
        >
          {events.map((ev) => (
            <div key={ev.id} className="w-[260px] md:w-[285px] shrink-0 h-full">
              <EventCard 
                event={{
                  ...ev,
                  isResale: true,
                  resaleCount: ev.resaleCount || Math.floor(Math.random() * 10) + 1,
                  minResalePrice: ev.minResalePrice || (Number(ev.minPrice) || 500000) * 0.8
                } as any} 
              />
            </div>
          ))}
        </div>

        {/* Navigation Arrow Right (Smart Visibility) */}
        {showRight && (
          <button
            type="button"
            onClick={scrollRight}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 text-white border border-slate-700 shadow-2xl backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-brand-primary hover:scale-110 cursor-pointer"
            aria-label={translate("Cuộn sang phải")}
          >
            <FiChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ResaleTicketsSection;
