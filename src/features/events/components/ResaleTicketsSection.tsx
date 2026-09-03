import React from "react";
import { Link } from "react-router-dom";
import { FiChevronRight } from "react-icons/fi";
import { RESALE_EVENTS, type EventItem } from "@/mock/eventData";

interface ResaleTicketsSectionProps {
  events?: EventItem[];
}

export const ResaleTicketsSection: React.FC<ResaleTicketsSectionProps> = ({
  events = RESALE_EVENTS
}) => {
  return (
    <section className="mb-8 py-2">
      <div className="relative overflow-hidden rounded-2xl border border-green-500/20 bg-gradient-to-r from-green-500/10 to-green-600/10 p-6 md:p-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-2xl font-extrabold text-green-600 md:text-3xl dark:text-green-400">
            Resale Ticket - Vé Bán Lại
          </h3>

          <Link
            to="/resale-ticket"
            className="inline-flex items-center gap-1 text-sm font-semibold text-green-700 transition-colors hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
          >
            <span>Xem thêm</span>
            <FiChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="no-scrollbar flex gap-4 overflow-x-auto">
          {events.slice(0, 4).map((event) => (
            <Link key={event.id} to={`/events/${event.id}`} className="group w-[200px] shrink-0">
              <div className="mb-2 aspect-video overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900">
                <img
                  src={event.image}
                  alt={event.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <p className="line-clamp-1 text-sm font-semibold transition-colors app-text-main group-hover:text-green-700 dark:group-hover:text-green-300">
                {event.title}
              </p>
              <p className="text-xs app-text-muted">{event.date}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ResaleTicketsSection;
