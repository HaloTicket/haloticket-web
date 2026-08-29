import React from "react";
import { Link } from "react-router-dom";
import { FiCalendar, FiMapPin } from "react-icons/fi";
import type { EventItem } from "@/mock/eventData";
import { Badge } from "./Badge";

interface EventCardProps {
  event: EventItem;
  variant?: "standard" | "compact" | "ranked" | "poster";
  className?: string;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  variant = "standard",
  className = ""
}) => {
  const isPoster = variant === "poster";

  return (
    <Link
      to={`/events/${event.id}`}
      className={`group flex flex-col app-bg-card border app-border rounded-xl overflow-hidden card-hover-zoom cursor-pointer shadow-xs hover:shadow-xl transition-all duration-300 ${className}`}
    >
      {/* Image Container */}
      <div className={`relative w-full overflow-hidden ${isPoster ? "aspect-[3/4]" : "aspect-[16/9]"} bg-zinc-200 dark:bg-zinc-800`}>
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
          {event.isResale && (
            <Badge variant="resale">VÉ BÁN LẠI</Badge>
          )}
          {event.isHot && (
            <Badge variant="danger">🔥 HOT</Badge>
          )}
          {event.category && (
            <Badge variant="dark">{event.category}</Badge>
          )}
        </div>

        {/* Hover overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content Container */}
      <div className="p-3.5 flex flex-col grow justify-between">
        <div>
          <h4 className="font-bold text-sm md:text-base app-text-main app-hover-text-brand transition-colors line-clamp-2 leading-snug mb-2">
            {event.title}
          </h4>
        </div>

        <div className="mt-2 space-y-1.5 pt-2 border-t app-border">
          {/* Price */}
          <div className="app-text-brand font-extrabold text-sm md:text-base">
            {event.price.startsWith("Từ") ? event.price : `Từ ${event.price}`}
          </div>

          {/* Date & Location */}
          <div className="flex items-center gap-1.5 text-xs app-text-muted font-medium">
            <FiCalendar className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{event.date}</span>
          </div>

          {event.location && (
            <div className="flex items-center gap-1.5 text-xs app-text-muted font-medium">
              <FiMapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default EventCard;
