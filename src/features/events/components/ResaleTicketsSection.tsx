import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiRefreshCw, FiCheckCircle, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { RESALE_EVENTS } from "@/mock/eventData";
import { EventCard } from "@/components/common/EventCard";

export const ResaleTicketsSection: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeft(scrollLeft > 10);
      setShowRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
  }, []);

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
    <div className="mb-12 bg-gradient-to-r from-brand-500/10 via-slate-200/60 to-indigo-500/10 dark:from-brand-900/40 dark:via-[#18181b] dark:to-indigo-950/40 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-lg transition-colors duration-300">
      {/* Background Glow */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Title & Banner Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-extrabold text-xs rounded-md mb-2 shadow-sm">
            <FiRefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "8s" }} />
            <span>RESALE TICKET - VÉ BÁN LẠI</span>
          </div>
          <h3 className="text-xl md:text-2xl font-extrabold app-text-main flex items-center gap-2">
            <span>Sàn Nhượng Vé Chính Thức</span>
            <FiCheckCircle className="w-5 h-5 text-accent-cyan" />
          </h3>
          <p className="text-xs md:text-sm app-text-muted mt-1">
            An tâm mua bán vé sang nhượng với cơ chế <span className="text-brand-primary font-extrabold">Hủy cũ - Cấp mới</span> độc quyền tại HaloTicket.
          </p>
        </div>

        <Link
          to="/resale"
          className="px-5 py-2.5 gradient-btn text-white font-extrabold text-xs md:text-sm rounded-xl transition-all shadow-md shrink-0 cursor-pointer"
        >
          Khám phá vé bán lại
        </Link>
      </div>

      {/* Resale Event Cards Carousel Wrapper */}
      <div className="relative group">
        {/* Navigation Arrow Left (Smart Visibility) */}
        {showLeft && (
          <button
            type="button"
            onClick={scrollLeft}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 text-white border border-slate-700 shadow-2xl backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-brand-primary hover:scale-110 cursor-pointer"
            aria-label="Cuộn sang trái"
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
          {RESALE_EVENTS.map((event) => (
            <div key={event.id} className="w-[260px] md:w-[285px] shrink-0 h-full">
              <EventCard event={event} />
            </div>
          ))}
        </div>

        {/* Navigation Arrow Right (Smart Visibility) */}
        {showRight && (
          <button
            type="button"
            onClick={scrollRight}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 text-white border border-slate-700 shadow-2xl backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-brand-primary hover:scale-110 cursor-pointer"
            aria-label="Cuộn sang phải"
          >
            <FiChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ResaleTicketsSection;
