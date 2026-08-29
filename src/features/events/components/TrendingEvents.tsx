import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FiCalendar } from "react-icons/fi";
import { FaFire } from "react-icons/fa";
import { TRENDING_EVENTS, WEEKEND_EVENTS } from "@/mock/eventData";
import { EventCard } from "@/components/common/EventCard";
import { SectionHeader } from "@/components/common/SectionHeader";

export const TrendingEvents: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"weekend" | "month">("weekend");

  const filterTabs = [
    { id: "weekend", label: "Cuối tuần này" },
    { id: "month", label: "Tháng này" }
  ];

  return (
    <div className="mb-12">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <FaFire className="w-6 h-6 text-rose-500" />
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">Sự kiện xu hướng</h2>
      </div>

      {/* Top Ranked Events 1..4 Horizontal Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {TRENDING_EVENTS.map((event) => (
          <Link
            key={event.id}
            to={`/events/${event.id}`}
            className="group relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden p-2.5 hover:border-brand-500/50 transition-all shadow-sm hover:shadow-lg"
          >
            {/* Rank Number with Indigo/Cyan Glow */}
            <div className="rank-number-glow font-black text-5xl md:text-6xl px-3 italic select-none">
              {event.rank}
            </div>

            {/* Event Image */}
            <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 relative bg-slate-100 dark:bg-slate-800 mr-3">
              <img
                src={event.image}
                alt={event.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Info */}
            <div className="grow min-w-0">
              <h4 className="text-xs md:text-sm font-bold text-slate-800 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2 leading-tight mb-1.5">
                {event.title}
              </h4>
              <div className="text-brand-600 dark:text-brand-400 text-xs font-extrabold mb-1">
                {event.price}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <FiCalendar className="w-3 h-3 shrink-0" />
                <span className="truncate">{event.date}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Sub-Section with Tabs */}
      <SectionHeader
        title=""
        tabs={filterTabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as "weekend" | "month")}
        seeMoreLink="/events?trending=true"
      />

      {/* Grid of weekend / month events */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {WEEKEND_EVENTS.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
};

export default TrendingEvents;
