import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { SPECIAL_EVENTS, type EventItem } from "@/mock/eventData";

interface SpecialEventsProps {
  events?: EventItem[];
}

export const SpecialEvents: React.FC<SpecialEventsProps> = ({ events = SPECIAL_EVENTS }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const checkScroll = () => {
    if (!scrollContainerRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeft(scrollLeft > 10);
    setShowRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    checkScroll();
  }, [events]);

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -350, behavior: "smooth" });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 350, behavior: "smooth" });
  };

  return (
    <section className="mb-8 py-2">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-extrabold tracking-tight app-text-main md:text-2xl">
          Sự kiện đặc biệt
        </h2>
      </div>

      <div className="relative group">
        {showLeft && (
          <button
            type="button"
            onClick={scrollLeft}
            className="absolute -left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-800 opacity-0 shadow-lg backdrop-blur-md transition-all hover:bg-white group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-white"
            aria-label="Cuộn sang trái"
          >
            <FiChevronLeft className="h-5 w-5" />
          </button>
        )}

        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="no-scrollbar flex items-center gap-4 overflow-x-auto pb-4 scroll-smooth"
        >
          {events.map((event) => (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="group/poster relative aspect-[3/4] w-[180px] shrink-0 cursor-pointer overflow-hidden rounded-xl bg-slate-100 shadow-sm transition-transform duration-300 hover:scale-[1.02] md:w-[220px] dark:bg-slate-900"
            >
              <img
                src={event.image}
                alt={event.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover/poster:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/poster:opacity-100" />
            </Link>
          ))}
        </div>

        {showRight && (
          <button
            type="button"
            onClick={scrollRight}
            className="absolute -right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-800 opacity-0 shadow-lg backdrop-blur-md transition-all hover:bg-white group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-white"
            aria-label="Cuộn sang phải"
          >
            <FiChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </section>
  );
};

export default SpecialEvents;
