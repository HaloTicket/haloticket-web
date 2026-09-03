import React from "react";
import { Link } from "react-router-dom";
import { FiCalendar, FiMapPin } from "react-icons/fi";
import type { EventItem } from "@/mock/eventData";
import { Badge } from "./Badge";

interface EventCardProps {
  event: EventItem | any;
  variant?: "standard" | "compact" | "ranked" | "poster";
  className?: string;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  variant = "standard",
  className = ""
}) => {
  if (!event) return null;

  const isPoster = variant === "poster";
  const displayPrice = event.price
    ? event.price.startsWith("Từ")
      ? event.price
      : `Từ ${event.price}`
    : "Từ 250.000đ";

  const locationText = event.location || event.locationName || event.address;

  return (
    <Link
      to={`/events/${event.id}`}
      className={`group flex flex-col h-full app-bg-card border-0 rounded-2xl overflow-hidden card-hover-zoom cursor-pointer shadow-xs hover:shadow-xl transition-all duration-300 ${className}`}
    >
      {/* Image Container */}
      <div className={`relative w-full overflow-hidden ${isPoster ? "aspect-[3/4]" : "aspect-[16/9]"} bg-slate-200 dark:bg-slate-800 shrink-0`}>
        <img
          src={event.image || event.bannerUrl || event.thumbnailUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80"}
          alt={event.title || "Sự kiện"}
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
          {(event.category || event.categoryName) && (
            <Badge variant="dark">{event.category || event.categoryName}</Badge>
          )}
        </div>

        {/* Hover overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content Container */}
      <div className="p-3.5 flex flex-col grow justify-between">
        <div>
          <h4 className="font-extrabold text-sm md:text-base app-text-main group-hover:text-brand-primary transition-colors line-clamp-2 leading-snug mb-2 min-h-[2.6rem] flex items-start">
            {event.title}
          </h4>
        </div>

        <div className="mt-auto space-y-1.5 pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
          {/* Price */}
          <div className="app-text-brand font-extrabold text-sm md:text-base">
            {displayPrice}
          </div>

          {/* Date & Location */}
          <div className="flex items-center gap-1.5 text-xs app-text-muted font-medium">
            <FiCalendar className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{event.date || "25/09/2026"}</span>
          </div>

          {locationText && (
            <div className="flex items-center gap-1.5 text-xs app-text-muted font-medium">
              <FiMapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{locationText}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default EventCard;
