import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import React, { useMemo } from "react";
import { FiCalendar, FiMapPin, FiChevronRight } from "react-icons/fi";
import { FaTicketAlt } from "react-icons/fa";
import type { EventDetailData } from "@/types";
import { formatCurrency, parseVndAmount } from "@/utils/formatters";

interface EventHeroProps {
  event: EventDetailData;
  onBuyTicketsClick: () => void;
  isResaleTag?: boolean;
}

export const EventHero: React.FC<EventHeroProps> = ({ event, onBuyTicketsClick, isResaleTag = false }) => {
  useTranslation();

  // calculate dynamic minimum price across all ticket types / showtimes
  const { displayPrice } = useMemo(() => {
    const prices: number[] = [];
    if (event.minPrice !== undefined && event.minPrice !== null) {
      if (typeof event.minPrice === "number" && !isNaN(event.minPrice)) {
        prices.push(event.minPrice);
      } else if (typeof event.minPrice === "string") {
        const parsed = parseVndAmount(event.minPrice);
        if (parsed !== undefined) prices.push(parsed);
      }
    }

    const rawTickets = (event as any).tickets || (event as any).ticketTypes;
    if (Array.isArray(rawTickets) && rawTickets.length > 0) {
      rawTickets.forEach((t: any) => {
        if (typeof t.price === "number" && !isNaN(t.price)) {
          prices.push(t.price);
        } else if (typeof t.price === "string") {
          const p = parseVndAmount(t.price);
          if (p !== undefined) prices.push(p);
        }
      });
    }

    if (Array.isArray(event.showtimes)) {
      event.showtimes.forEach((st: any) => {
        if (Array.isArray(st.tickets)) {
          st.tickets.forEach((t: any) => {
            if (typeof t.priceValue === "number" && !isNaN(t.priceValue)) {
              prices.push(t.priceValue);
            } else if (typeof t.price === "number" && !isNaN(t.price)) {
              prices.push(t.price);
            } else if (typeof t.price === "string") {
              const p = parseVndAmount(t.price);
              if (p !== undefined) prices.push(p);
            }
          });
        }
      });
    }

    if (prices.length > 0) {
      const min = Math.min(...prices);
      if (min === 0) return { displayPrice: translate("Miễn phí") };
      return { displayPrice: formatCurrency(min) };
    }
    return { displayPrice: translate("Miễn phí") };
  }, [event]);

  // calculate buy ticket button status according to sale schedule and ticket availability
  const salesStatus = useMemo(() => {
    const now = new Date();
    
    const parseSafeDate = (dateVal: any): Date | null => {
      if (!dateVal) return null;
      if (Array.isArray(dateVal)) {
        const [y, m, d, h = 0, min = 0, s = 0] = dateVal;
        return new Date(y, m - 1, d, h, min, s);
      }
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return null;
      return d;
    };
    
    // fallbacks to global sale times if needed
    const globalSaleStart = parseSafeDate(event.ticketSaleStartDate);
    const globalSaleEnd = parseSafeDate(event.ticketSaleEndDate);

    let hasAnyShowtimeUpcoming = false;
    let hasAnyShowtimeOnSale = false;
    let hasAnyTicketsAvailable = false;
    let earliestSaleStart: Date | null = null;

    if (Array.isArray(event.showtimes) && event.showtimes.length > 0) {
      event.showtimes.forEach((st: any) => {
        const saleStart = parseSafeDate(st.saleStartTime) || globalSaleStart;
        const saleEnd = parseSafeDate(st.saleEndTime) || globalSaleEnd;
        const isUpcoming = saleStart && now < saleStart;
        const isEnded = saleEnd && now > saleEnd;
        const isActive = !isUpcoming && !isEnded;

        if (isUpcoming) hasAnyShowtimeUpcoming = true;
        if (isActive) hasAnyShowtimeOnSale = true;
        
        if (isUpcoming && saleStart) {
          if (!earliestSaleStart || saleStart < earliestSaleStart) {
            earliestSaleStart = saleStart;
          }
        }

        // check ticket availability for this showtime
        if (Array.isArray(st.tickets)) {
          st.tickets.forEach((t: any) => {
            const q = t.totalQuantity ?? t.quantity ?? 100;
            const s = t.soldQuantity ?? 0;
            if (t.available !== false && q - s > 0) {
              hasAnyTicketsAvailable = true;
            }
          });
        } else {
          // if no specific tickets attached, assume available if showtime is active
          hasAnyTicketsAvailable = true;
        }
      });
    } else {
      // no showtimes, fallback to global checking
      const isUpcoming = globalSaleStart && now < globalSaleStart;
      const isEnded = globalSaleEnd && now > globalSaleEnd;
      if (isUpcoming) {
        hasAnyShowtimeUpcoming = true;
        earliestSaleStart = globalSaleStart;
      }
      if (!isUpcoming && !isEnded) hasAnyShowtimeOnSale = true;

      const rawTickets = (event as any).tickets || (event as any).ticketTypes;
      if (Array.isArray(rawTickets) && rawTickets.length > 0) {
        rawTickets.forEach((t: any) => {
          const q = t.totalQuantity ?? t.quantity ?? 100;
          const s = t.soldQuantity ?? 0;
          if (t.available !== false && q - s > 0) {
            hasAnyTicketsAvailable = true;
          }
        });
      }
    }

    const isSoldOut = (event as any).isSoldOut || (!hasAnyTicketsAvailable && !hasAnyShowtimeUpcoming);

    if (isSoldOut) {
      return { isClosed: true, buttonText: translate("Đã hết vé") };
    }

    if (hasAnyShowtimeOnSale) {
      return { isClosed: false, buttonText: translate("Mua vé ngay") };
    }

    if (hasAnyShowtimeUpcoming && earliestSaleStart) {
      return {
        isClosed: true,
        buttonText: `${translate("Chưa mở bán")} (${earliestSaleStart.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} ${earliestSaleStart.toLocaleDateString("vi-VN")})`,
      };
    }

    // default catch-all
    return { isClosed: true, buttonText: translate("Ngừng Bán vé") };
  }, [event]);

  let displayDate = translate("Sắp diễn ra");
  const formatDt = (dtStr: string) => `${new Date(dtStr).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}, ${new Date(dtStr).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
  
  let finalStart = event.startTime;
  let finalEnd = event.endTime;

  if ((event as any).showtimes && (event as any).showtimes.length > 0) {
    const sts = (event as any).showtimes;
    const startDates = sts.map((st: any) => new Date(st.startTime || st.fullDateTime || finalStart).getTime()).filter((t: number) => !isNaN(t));
    const endDates = sts.map((st: any) => new Date(st.endTime || st.fullDateTime || finalEnd || st.startTime || finalStart).getTime()).filter((t: number) => !isNaN(t));
    
    if (startDates.length > 0) finalStart = new Date(Math.min(...startDates)).toISOString();
    if (endDates.length > 0) finalEnd = new Date(Math.max(...endDates)).toISOString();
  }

  if (finalStart && finalEnd) {
    const startObj = new Date(finalStart);
    const endObj = new Date(finalEnd);
    if (startObj.toDateString() === endObj.toDateString() && startObj.getTime() !== endObj.getTime()) {
       // same day, different times
       displayDate = `${startObj.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - ${endObj.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}, ${startObj.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
    } else if (startObj.getTime() !== endObj.getTime()) {
       // different days
       displayDate = `${formatDt(finalStart)} - ${formatDt(finalEnd)}`;
    } else {
       // exact same time
       displayDate = formatDt(finalStart);
    }
  } else if (finalStart) {
    displayDate = formatDt(finalStart);
  }
  const locationName = event.locationName || translate("Địa điểm chưa cập nhật");
  const posterImage = event.posterImage || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80";

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
                  {translate("Bán lại vé")}</span>
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
                  {displayDate}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-2 text-xs">
              <FiMapPin className="w-3.5 h-3.5 app-text-brand shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold app-text-brand leading-tight">
                  {locationName}
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
                {translate("Giá từ")}</span>
              <span className="text-sm md:text-base font-black app-text-brand flex items-center gap-0.5">
                {displayPrice}
                <FiChevronRight className="w-4 h-4" />
              </span>
            </div>

            {/* CTA Button */}
            <button
              type="button"
              disabled={salesStatus.isClosed}
              onClick={onBuyTicketsClick}
              className={`w-full py-2.5 font-extrabold text-xs md:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 ${
                salesStatus.isClosed
                  ? "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none"
                  : "gradient-btn text-white"
              }`}
            >
              <FaTicketAlt className="w-3.5 h-3.5" />
              <span>{salesStatus.buttonText}</span>
            </button>
          </div>
        </div>

        {/* Right side - Event Image */}
        <div className="w-full md:w-[65%] relative overflow-hidden bg-slate-950 min-h-[200px] md:min-h-[300px]">
          <img
            src={posterImage}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export default EventHero;
