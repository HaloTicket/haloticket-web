import { useTranslation } from "react-i18next";
import React from "react";
import { Link } from "react-router-dom";
import { FiCalendar, FiMapPin } from "react-icons/fi";
import type { EventItem } from "@/mock/eventData";
import type { EventApiData } from "@/types";
import { formatCurrency, formatDate, formatLegacyVietnameseDate, parseVndAmount } from "@/utils/formatters";
import { Badge } from "./Badge";

export type EventCardData = Partial<EventItem> & Partial<EventApiData>;

interface EventCardProps {
  event: EventCardData | null | undefined;
  variant?: "standard" | "compact" | "ranked" | "poster";
  className?: string;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  variant = "standard",
  className = ""
}) => {
  const { t: translate } = useTranslation();
  if (!event) return null;

  const isPoster = variant === "poster";
  
  // dynamically determine minPrice by comparing prices across all event ticket tiers
  const rawTickets = (event as any).tickets || (event as any).ticketTypes;
  let computedMinPrice: number | undefined = undefined;

  if (Array.isArray(rawTickets) && rawTickets.length > 0) {
    const validPrices = rawTickets
      .filter((t: any) => t && t.status !== "HIDDEN" && t.ticketTypeStatus !== "HIDDEN")
      .map((t: any) => {
        if (typeof t.price === "number") return t.price;
        return parseVndAmount(t.price);
      })
      .filter((p: any): p is number => typeof p === "number" && !isNaN(p));
      
    if (validPrices.length > 0) {
      computedMinPrice = Math.min(...validPrices);
    }
  }

  if (Array.isArray(event.showtimes)) {
    event.showtimes.forEach((st: any) => {
      if (Array.isArray(st.tickets)) {
        st.tickets.forEach((t: any) => {
          if (t && t.status !== "HIDDEN" && t.ticketTypeStatus !== "HIDDEN") {
            const p = typeof t.price === "number" ? t.price : parseVndAmount(t.price ?? t.priceValue);
            if (typeof p === "number" && !isNaN(p)) {
              if (computedMinPrice === undefined || p < computedMinPrice) {
                computedMinPrice = p;
              }
            }
          }
        });
      }
    });
  }

  const rawPrice = computedMinPrice ?? event.minPrice ?? event.price;
  const numericPrice = parseVndAmount(rawPrice);
  const displayPrice = numericPrice !== undefined
    ? numericPrice > 0
      ? translate("Từ {{price}}", { price: formatCurrency(numericPrice) })
      : translate("Miễn phí")
    : rawPrice ? String(rawPrice) : translate("Chưa mở bán");
  const displayDate = event.startTime
    ? formatDate(event.startTime)
    : event.date ? formatLegacyVietnameseDate(event.date) ?? translate(event.date) : translate("Sắp diễn ra");

  const locationText = event.location || event.locationName || event.address || translate("Địa điểm chưa cập nhật");

  return (
    <Link
      to={`/events/${event.id}`}
      className={`group flex flex-col h-full app-bg-card border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden card-hover-zoom cursor-pointer shadow-xs hover:shadow-lg hover:border-blue-500/40 transition-all duration-300 ${className}`}
    >
      {/* Image Container */}
      <div className={`relative w-full overflow-hidden ${isPoster ? "aspect-[3/4]" : "aspect-[16/9]"} bg-slate-200 dark:bg-slate-800 shrink-0`}>
        <img
          src={event.image || event.bannerUrl || event.thumbnailUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80"}
          alt={event.title || translate("Sự kiện")}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
          {event.isResale && (
            <Badge variant="resale">{translate("VÉ BÁN LẠI")}</Badge>
          )}
          {event.isHot && (
            <Badge variant="danger">🔥 HOT</Badge>
          )}
          {(event.category || event.categoryName) && (
            <Badge variant="dark">{translate(String(event.category || event.categoryName))}</Badge>
          )}
        </div>

        {/* Hover overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content Container */}
      <div className="p-3.5 flex flex-col grow justify-between">
        <div>
          <h4 className="font-extrabold text-sm md:text-base app-text-main group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug mb-2 min-h-[2.6rem] flex items-start">
            {event.title}
          </h4>
        </div>

        <div className="mt-auto space-y-1.5 pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
          {/* Price */}
          <div className="text-blue-600 dark:text-blue-400 font-extrabold text-sm md:text-base">
            {displayPrice}
          </div>

          {/* Date & Location */}
          <div className="flex items-center gap-1.5 text-xs app-text-muted font-medium">
            <FiCalendar className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{displayDate}</span>
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
