import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaFire } from "react-icons/fa";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { EventCard } from "@/components/common/EventCard";
import { SectionHeader } from "@/components/common/SectionHeader";
import { eventApi, type EventApiData } from "@/services/eventApi";

interface TrendingRankItem {
  id: string;
  rank: number;
  title: string;
  image?: string;
  [key: string]: unknown;
}

interface TrendingEventsProps {
  title?: string;
  limit?: number;
  events?: EventApiData[];
}

export const TrendingEvents: React.FC<TrendingEventsProps> = ({ title, limit = 8, events: propEvents }) => {
  useTranslation();
  const [activeTab, setActiveTab] = useState<"weekend" | "month">("weekend");
  const rankScrollRef = useRef<HTMLDivElement>(null);
  const eventsScrollRef = useRef<HTMLDivElement>(null);

  const [showRankLeft, setShowRankLeft] = useState(false);
  const [showRankRight, setShowRankRight] = useState(true);

  const [showEventsLeft, setShowEventsLeft] = useState(false);
  const [showEventsRight, setShowEventsRight] = useState(true);

  const [trendingList, setTrendingList] = useState<TrendingRankItem[]>([]);
  const [tabEvents, setTabEvents] = useState<Array<EventApiData>>([]);
  const [allEventsList, setAllEventsList] = useState<EventApiData[]>([]);

  // fetch and store all events
  useEffect(() => {
    if (propEvents && propEvents.length > 0) {
      setAllEventsList(propEvents);
    } else {
      eventApi.getAllEvents().then((data) => {
        if (data) setAllEventsList(data);
      });
    }
  }, [propEvents]);

  // process trending rank and tab events
  useEffect(() => {
    if (allEventsList.length === 0) return;
    
    // 1. process top trending
    const sorted = [...allEventsList].sort((a, b) => {
      const viewsA = (a.pageViews as number) || (a.viewCount as number) || 0;
      const viewsB = (b.pageViews as number) || (b.viewCount as number) || 0;
      return viewsB - viewsA;
    });
    
    const sliced = sorted.slice(0, limit);
    const ranked = sliced.map((ev, index) => ({
      id: ev.id,
      rank: index + 1,
      title: ev.title,
      image: ev.bannerUrl || ev.thumbnailUrl || ev.image,
    }));
    setTrendingList(ranked);
    
    // 2. process filtered events for tabs
    const now = new Date();
    let filtered = allEventsList;
    
    if (activeTab === "weekend") {
      // find the upcoming weekend (Saturday and Sunday)
      const day = now.getDay(); // 0 is Sunday, 6 is Saturday
      const daysUntilSaturday = (day === 0) ? 6 : (6 - day);
      
      const saturday = new Date(now);
      saturday.setDate(now.getDate() + daysUntilSaturday);
      saturday.setHours(0, 0, 0, 0);
      
      const sunday = new Date(saturday);
      sunday.setDate(saturday.getDate() + 1);
      sunday.setHours(23, 59, 59, 999);
      
      filtered = allEventsList.filter(ev => {
        if (!ev.startTime) return false;
        const eventDate = new Date(ev.startTime);
        return eventDate >= saturday && eventDate <= sunday;
      });
    } else if (activeTab === "month") {
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      filtered = allEventsList.filter(ev => {
        if (!ev.startTime) return false;
        const eventDate = new Date(ev.startTime);
        return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
      });
    }
    
    // sort the filtered list by trending views and set
    const sortedFiltered = filtered.sort((a, b) => {
      const viewsA = (a.pageViews as number) || (a.viewCount as number) || 0;
      const viewsB = (b.pageViews as number) || (b.viewCount as number) || 0;
      return viewsB - viewsA;
    });
    setTabEvents(sortedFiltered.slice(0, limit));
    
  }, [allEventsList, activeTab, limit]);

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

  if (trendingList.length === 0) return null;

  return (
    <div className="mb-12">
      {/* Section Title Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl md:text-2xl font-extrabold app-text-main flex items-center gap-2 tracking-tight">
          <FaFire className="w-6 h-6 text-rose-500 animate-pulse" />
          <span>{translate(title || "Sự kiện xu hướng")}</span>
        </h2>
      </div>

      {/* Top Ranked Cards Carousel */}
      <div className="relative group mb-10">
        {/* Navigation Arrow Left */}
        {showRankLeft && (
          <button
            type="button"
            onClick={scrollRankLeft}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 text-white border border-slate-700 shadow-xl backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-blue-600 hover:scale-110 cursor-pointer"
            aria-label={translate("Cuộn sang trái")}
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

              <div className="w-[280px] md:w-[340px] aspect-[16/9] rounded-2xl overflow-hidden bg-slate-900 border app-border hover:border-blue-500 transition-all duration-300 group-hover/rank:scale-105 shadow-xl">
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
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 text-white border border-slate-700 shadow-xl backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-blue-600 hover:scale-110 cursor-pointer"
            aria-label={translate("Cuộn sang phải")}
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
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 text-white border border-slate-700 shadow-xl backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-blue-600 hover:scale-110 cursor-pointer"
            aria-label={translate("Cuộn sang trái")}
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

export default TrendingEvents;
