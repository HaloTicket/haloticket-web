import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { SPECIAL_EVENTS } from "@/mock/eventData";
import { eventApi } from "@/services/eventApi";

export const SpecialEvents: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);
  const [events, setEvents] = useState<any[]>(SPECIAL_EVENTS);

  // fetch event data
  useEffect(() => {
    eventApi.getAllEvents().then((data) => {
      if (data && data.length > 0) {
        setEvents(data);
      }
    });
  }, []);

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
    <div className="mb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl md:text-2xl font-extrabold app-text-main tracking-tight">
          Sự kiện đặc biệt
        </h2>
      </div>

      {/* Poster Cards Carousel Wrapper */}
      <div className="relative group">
        {/* Navigation Arrow Left */}
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

        {/* Scrollable Posters Container */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex items-center gap-4 overflow-x-auto pb-2 no-scrollbar scroll-smooth"
        >
          {events.map((event) => (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="group/poster relative shrink-0 w-[220px] md:w-[250px] aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 border app-border hover:border-brand-primary transition-all duration-300 hover:scale-105 shadow-xl cursor-pointer"
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

        {/* Navigation Arrow Right */}
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

export default SpecialEvents;
