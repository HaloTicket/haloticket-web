import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaFire } from "react-icons/fa";
import { FiChevronRight } from "react-icons/fi";
import { EventCard } from "@/components/common/EventCard";
import { TRENDING_EVENTS, WEEKEND_EVENTS, type EventItem } from "@/mock/eventData";

interface TrendingEventsProps {
  trendingEvents?: EventItem[];
  weekendEvents?: EventItem[];
  monthEvents?: EventItem[];
}

export const TrendingEvents: React.FC<TrendingEventsProps> = ({
  trendingEvents = TRENDING_EVENTS,
  weekendEvents = WEEKEND_EVENTS,
  monthEvents = WEEKEND_EVENTS
}) => {
  const [activeTab, setActiveTab] = useState<"weekend" | "month">("weekend");
  const filteredEvents = activeTab === "weekend" ? weekendEvents : monthEvents;

  return (
    <>
      <section className="mb-8 py-2">
        <h2 className="mb-5 flex items-center gap-2 text-xl font-extrabold tracking-tight app-text-main md:text-2xl">
          <FaFire className="h-5 w-5 text-red-500" />
          <span>Sự kiện xu hướng</span>
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trendingEvents.slice(0, 4).map((event, index) => (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="group relative aspect-video cursor-pointer overflow-hidden rounded-xl bg-slate-100 shadow-sm dark:bg-slate-900"
            >
              <img
                src={event.image}
                alt={event.title}
                className="h-full w-full object-cover opacity-90 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100"
                loading="lazy"
              />
              <div className="absolute bottom-0 left-2 font-sans text-[80px] font-black leading-none text-white/35 [text-shadow:0_0_1px_rgba(255,255,255,0.7)]">
                {event.rank ?? index + 1}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-8 py-4">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveTab("weekend")}
              className={`pb-1 text-lg font-extrabold transition-colors md:text-xl ${activeTab === "weekend" ? "border-b-2 border-brand-primary app-text-main" : "app-text-muted hover:app-text-main"}`}
            >
              Cuối tuần này
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("month")}
              className={`pb-1 text-lg font-extrabold transition-colors md:text-xl ${activeTab === "month" ? "border-b-2 border-brand-primary app-text-main" : "app-text-muted hover:app-text-main"}`}
            >
              Tháng này
            </button>
          </div>

          <Link
            to="/events"
            className="inline-flex items-center gap-1 text-sm font-semibold transition-colors app-text-muted app-hover-text-brand"
          >
            <span>Xem thêm</span>
            <FiChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filteredEvents.slice(0, 4).map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>
    </>
  );
};

export default TrendingEvents;
