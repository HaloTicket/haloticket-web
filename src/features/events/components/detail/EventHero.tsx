import React from "react";
import { FiCalendar, FiMapPin, FiChevronRight } from "react-icons/fi";
import { FaTicketAlt } from "react-icons/fa";
import type { EventDetailData } from "@/mock/eventData";

interface EventHeroProps {
  event: EventDetailData;
  onBuyTicketsClick: () => void;
  isResaleTag?: boolean;
}

export const EventHero: React.FC<EventHeroProps> = ({ event, onBuyTicketsClick, isResaleTag = false }) => {
  return (
    <div className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden shadow-xl app-bg-card border-0 mb-8 transition-colors duration-300">
      {/* Top Large Semi-Circular Ticket Stub Notch */}
      <div className="hidden md:block absolute -top-7 left-[35%] -translate-x-1/2 w-14 h-14 rounded-full bg-[#f4f4f5] dark:bg-[#27272a] z-30 shadow-inner" />

      {/* Bottom Large Semi-Circular Ticket Stub Notch */}
      <div className="hidden md:block absolute -bottom-7 left-[35%] -translate-x-1/2 w-14 h-14 rounded-full bg-[#f4f4f5] dark:bg-[#27272a] z-30 shadow-inner" />

      {/* Vertical Dashed Perforation Tear Line (Thicker & Bolder) */}
      <div className="hidden md:block absolute top-0 bottom-0 left-[35%] border-r-4 border-dashed border-slate-400/80 dark:border-zinc-600/90 z-20" />

      {/* Main Ticket Layout */}
      <div className="flex flex-col md:flex-row items-stretch h-auto md:h-[450px]">
        {/* Left side - Event Info (No Border) */}
        <div className="w-full md:w-[35%] p-4 md:p-5 flex flex-col justify-between relative z-10 app-bg-card border-0">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 left-0 w-48 h-48 bg-brand-primary/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            {/* Optional Resale Tag Badge */}
            {isResaleTag && (
              <div className="mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-black gradient-btn text-white shadow-md inline-block">
                  Bán lại vé
                </span>
              </div>
            )}

            {/* Event Title (Bold Uppercase) */}
            <h1 className="text-base md:text-xl font-extrabold uppercase app-text-main tracking-tight leading-snug mb-3 line-clamp-2">
              {event.title}
            </h1>

            {/* Date & Time */}
            <div className="flex items-start gap-2 mb-2.5 text-xs">
              <FiCalendar className="w-3.5 h-3.5 app-text-brand shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold app-text-brand leading-tight">
                  {event.datesSummary}
                </div>
                {event.extraDaysCount > 0 && (
                  <button
                    type="button"
                    onClick={onBuyTicketsClick}
                    className="mt-1 inline-block px-2 py-0.5 text-[10px] font-bold rounded-md bg-brand-primary/10 app-text-brand border border-brand-primary/20 hover:bg-brand-primary hover:text-white transition-colors cursor-pointer"
                  >
                    +{event.extraDaysCount} ngày khác
                  </button>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-2 text-xs">
              <FiMapPin className="w-3.5 h-3.5 app-text-brand shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold app-text-brand leading-tight">
                  {event.locationName}
                </div>
                <div className="app-text-muted text-[11px] mt-0.5 leading-snug line-clamp-2">
                  {event.address}
                </div>
              </div>
            </div>
          </div>

          {/* Divider & Price / CTA Button */}
          <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-2.5 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold app-text-muted">
                Giá từ
              </span>
              <span className="text-sm md:text-base font-black app-text-brand flex items-center gap-0.5">
                {event.minPrice}
                <FiChevronRight className="w-4 h-4" />
              </span>
            </div>

            {/* CTA Button */}
            <button
              type="button"
              onClick={onBuyTicketsClick}
              className="w-full py-2.5 gradient-btn text-white font-extrabold text-xs md:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <FaTicketAlt className="w-3.5 h-3.5" />
              <span>Mua vé ngay</span>
            </button>
          </div>
        </div>

        {/* Right side - Event Image */}
        <div className="w-full md:w-[65%] relative overflow-hidden bg-slate-950 min-h-[200px] md:min-h-[300px]">
          <img
            src={event.posterImage}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export default EventHero;
