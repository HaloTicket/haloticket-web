import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaFire } from "react-icons/fa";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { TRENDING_EVENTS, WEEKEND_EVENTS } from "@/mock/eventData";
import { EventCard } from "@/components/common/EventCard";
import { SectionHeader } from "@/components/common/SectionHeader";
import { eventApi } from "@/services/eventApi";

export const TrendingEvents: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"weekend" | "month">("weekend");
  const rankScrollRef = useRef<HTMLDivElement>(null);
  const eventsScrollRef = useRef<HTMLDivElement>(null);

  const [showRankLeft, setShowRankLeft] = useState(false);
  const [showRankRight, setShowRankRight] = useState(true);

  const [showEventsLeft, setShowEventsLeft] = useState(false);
  const [showEventsRight, setShowEventsRight] = useState(true);

  const [trendingList, setTrendingList] = useState<any[]>(TRENDING_EVENTS);
  const [tabEvents, setTabEvents] = useState<any[]>(WEEKEND_EVENTS);

  // fetch trending events
  useEffect(() => {
    eventApi.getAllEvents().then((data) => {
      if (data && data.length > 0) {
        // build ranked list 1..N
        const ranked = data.map((ev, index) => ({
          id: ev.id,
          rank: index + 1,
          title: ev.title,
          image: ev.bannerUrl || ev.thumbnailUrl || ev.image,
        }));
        setTrendingList(ranked);
        setTabEvents(data);
      }
    });
  }, []);

  const filterTabs = [
    { id: "weekend", label: "Cuối tuần này" },
    { id: "month", label: "Tháng này" }
  ];

  const checkRankScroll = () => {
    if (rankScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rankScrollRef.current;
      setShowRankLeft(scrollLeft > 10);
      setShowRankRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  const checkEventsScroll = () => {
    if (eventsScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = eventsScrollRef.current;
      setShowEventsLeft(scrollLeft > 10);
      setShowEventsRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkRankScroll();
    checkEventsScroll();
  }, [trendingList, tabEvents]);

  const scrollRankLeft = () => {
    if (rankScrollRef.current) {
      rankScrollRef.current.scrollBy({ left: -380, behavior: "smooth" });
    }
  };

  const scrollRankRight = () => {
    if (rankScrollRef.current) {
      rankScrollRef.current.scrollBy({ left: 380, behavior: "smooth" });
    }
  };

  const scrollEventsLeft = () => {
    if (eventsScrollRef.current) {
      eventsScrollRef.current.scrollBy({ left: -380, behavior: "smooth" });
    }
  };

  const scrollEventsRight = () => {
    if (eventsScrollRef.current) {
      eventsScrollRef.current.scrollBy({ left: 380, behavior: "smooth" });
    }
  };

  return (
    <div className="mb-12">
      {/* Section Title Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl md:text-2xl font-extrabold app-text-main flex items-center gap-2 tracking-tight">
          <FaFire className="w-6 h-6 text-rose-500 animate-pulse" />
          <span>Sự kiện xu hướng</span>
        </h2>
      </div>

      {/* Top Ranked Cards Carousel */}
      <div className="relative group mb-10">
        {/* Navigation Arrow Left */}
        {showRankLeft && (
          <button
            type="button"
            onClick={scrollRankLeft}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 text-white border border-slate-700 shadow-2xl backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-brand-primary hover:scale-110 cursor-pointer"
            aria-label="Cuộn sang trái"
          >
            <FiChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Scrollable Ranked Cards Container */}
        <div
          ref={rankScrollRef}
          onScroll={checkRankScroll}
          className="flex items-center gap-5 overflow-x-auto pb-3 no-scrollbar scroll-smooth"
        >
          {trendingList.map((event) => (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="group/rank flex items-center shrink-0 cursor-pointer"
            >
              <div className="rank-number-glow font-black text-6xl md:text-7xl mr-2 italic select-none">
                {event.rank}
              </div>

              <div className="w-[280px] md:w-[340px] aspect-[16/9] rounded-2xl overflow-hidden bg-slate-900 border app-border hover:border-brand-primary transition-all duration-300 group-hover/rank:scale-105 shadow-xl">
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover/rank:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
            </Link>
          ))}
        </div>

        {/* Navigation Arrow Right */}
        {showRankRight && (
          <button
            type="button"
            onClick={scrollRankRight}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 text-white border border-slate-700 shadow-2xl backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-brand-primary hover:scale-110 cursor-pointer"
            aria-label="Cuộn sang phải"
          >
            <FiChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Filter Tabs Sub-header with Smooth Button Transition Animation */}
      <SectionHeader
        title=""
        tabs={filterTabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as "weekend" | "month")}
      />

      {/* Carousel of Weekend / Month Event Cards */}
      <div className="relative group">
        {/* Navigation Arrow Left */}
        {showEventsLeft && (
          <button
            type="button"
            onClick={scrollEventsLeft}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 text-white border border-slate-700 shadow-2xl backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-brand-primary hover:scale-110 cursor-pointer"
            aria-label="Cuộn sang trái"
          >
            <FiChevronLeft className="w-5 h-5" />
          </button>
        )}

        <div
          ref={eventsScrollRef}
          onScroll={checkEventsScroll}
          className="flex items-center gap-4 overflow-x-auto pb-3 no-scrollbar scroll-smooth"
        >
          {tabEvents.map((event) => (
            <div key={event.id} className="w-[260px] md:w-[285px] shrink-0">
              <EventCard event={event} />
            </div>
          ))}
        </div>

        {/* Navigation Arrow Right */}
        {showEventsRight && (
          <button
            type="button"
            onClick={scrollEventsRight}
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

export default TrendingEvents;
