/* eslint-disable @typescript-eslint/no-explicit-any */
import { useTranslation } from "react-i18next";
import React, { useMemo, useState } from "react";
import { FiCalendar, FiMapPin, FiShare2, FiArrowLeft } from "react-icons/fi";
import { FaTicketAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import type { EventDetailData } from "@/types";
import { formatCurrency, parseVndAmount } from "@/utils/formatters";

interface EventHeroProps {
  event: EventDetailData;
  onBuyTicketsClick: () => void;
  isResaleTag?: boolean;
}

export const EventHero: React.FC<EventHeroProps> = ({ event, onBuyTicketsClick, isResaleTag = false }) => {
  const { t: translate } = useTranslation();
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);

  // calculate dynamic minimum price across all ticket types / showtimes
  const { displayPrice } = useMemo(() => {
    const prices: number[] = [];
    if (event.minPrice !== undefined && event.minPrice !== null) {
      if (typeof event.minPrice === "number" && !isNaN(event.minPrice) && event.minPrice > 0) {
        prices.push(event.minPrice);
      } else if (typeof event.minPrice === "string") {
        const parsed = parseVndAmount(event.minPrice);
        if (parsed !== undefined && parsed > 0) prices.push(parsed);
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
      const positivePrices = prices.filter((p) => p > 0);
      if (positivePrices.length > 0) {
        const min = Math.min(...positivePrices);
        return { displayPrice: formatCurrency(min) };
      }
      return { displayPrice: translate("Miễn phí") };
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
        const parsed = new Date(y, m - 1, d, h, min, s);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return null;
      return d;
    };
    
    const globalSaleStart = parseSafeDate(event.ticketSaleStartDate);
    const globalSaleEnd = parseSafeDate(event.ticketSaleEndDate);

    let hasAnyShowtimeUpcoming = false;
    let hasAnyShowtimeOnSale = false;
    let hasAnyTicketsAvailable = false;
    let hasTicketInventory = false;
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

        if (Array.isArray(st.tickets)) {
          hasTicketInventory ||= st.tickets.length > 0;
          st.tickets.forEach((t: any) => {
            const q = t.totalQuantity ?? t.quantity ?? 100;
            const s = t.soldQuantity ?? 0;
            if (t.available !== false && q - s > 0) {
              hasAnyTicketsAvailable = true;
            }
          });
        } else {
          hasAnyTicketsAvailable = true;
        }
      });
    } else {
      const isUpcoming = globalSaleStart && now < globalSaleStart;
      const isEnded = globalSaleEnd && now > globalSaleEnd;
      if (isUpcoming) {
        hasAnyShowtimeUpcoming = true;
        earliestSaleStart = globalSaleStart;
      }
      if (!isUpcoming && !isEnded) hasAnyShowtimeOnSale = true;

      const rawTickets = (event as any).tickets || (event as any).ticketTypes;
      if (Array.isArray(rawTickets) && rawTickets.length > 0) {
        hasTicketInventory = true;
        rawTickets.forEach((t: any) => {
          const q = t.totalQuantity ?? t.quantity ?? 100;
          const s = t.soldQuantity ?? 0;
          if (t.available !== false && q - s > 0) {
            hasAnyTicketsAvailable = true;
          }
        });
      }
    }

    const isSoldOut = (event as any).isSoldOut || (hasTicketInventory && !hasAnyTicketsAvailable && !hasAnyShowtimeUpcoming);

    if (isSoldOut) {
      return { isClosed: true, buttonText: translate("Đã hết vé"), statusLabel: translate("Đã hết vé"), statusColor: "bg-rose-500" };
    }

    if (hasAnyShowtimeOnSale) {
      return { isClosed: false, buttonText: translate("Mua vé ngay"), statusLabel: translate("Đang mở bán"), statusColor: "bg-emerald-500" };
    }

    if (hasAnyShowtimeUpcoming && earliestSaleStart) {
      return {
        isClosed: true,
        buttonText: `${translate("Chưa mở bán")}`,
        statusLabel: translate("Sắp mở bán"),
        statusColor: "bg-amber-500",
      };
    }

    return { isClosed: true, buttonText: translate("Ngừng bán vé"), statusLabel: translate("Ngừng bán"), statusColor: "bg-slate-500" };
  }, [event]);

  // Format display date
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
       displayDate = `${startObj.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - ${endObj.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}, ${startObj.toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" })}`;
    } else if (startObj.getTime() !== endObj.getTime()) {
       displayDate = `${formatDt(finalStart)} - ${formatDt(finalEnd)}`;
    } else {
       displayDate = formatDt(finalStart);
    }
  } else if (finalStart) {
    displayDate = formatDt(finalStart);
  }

  const locationName = event.locationName || translate("Địa điểm chưa cập nhật");
  const posterImage = event.posterImage || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80";

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch { /* ignore */ }
  };

  return (
    <>
      {/* ── MOBILE HEADER BAR (Inspired by Image 1, in HaloTicket brand blue) ── */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 -mx-6 -mt-6 md:-mx-12 md:-mt-8 mb-5 bg-brand-primary shadow-md relative z-20">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label={translate("Quay lại")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer backdrop-blur-xs"
        >
          <FiArrowLeft className="w-4 h-4" />
        </button>

        <h2 className="text-base font-bold text-white tracking-wide truncate max-w-[200px]">
          {translate("Chi tiết sự kiện")}
        </h2>

        <button
          type="button"
          onClick={handleShare}
          aria-label={translate("Chia sẻ sự kiện")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer backdrop-blur-xs"
        >
          <FiShare2 className="w-4 h-4" />
        </button>
      </div>

      {/* ── MAIN HERO SECTION ── */}
      <div className="relative w-full mb-8">
        {/* DESKTOP LAYOUT: Ticket Style */}
        <div className="hidden lg:flex w-full relative rounded-3xl overflow-hidden shadow-2xl app-bg-card">
          {/* Left: Banner Image (Ticket Left Side) */}
          <div className="w-[65%] relative bg-slate-950 aspect-[16/10] group shrink-0">
            <img
              src={posterImage}
              alt={event.title}
              className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImageLoaded(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />

            {/* Top badges */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              {isResaleTag && (
                <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-lg">
                  {translate("Bán lại vé")}
                </span>
              )}
              <span className={`px-3.5 py-1 rounded-full text-xs font-bold text-white shadow-lg ${salesStatus.statusColor}`}>
                {salesStatus.statusLabel}
              </span>
            </div>

            {/* Desktop share button */}
            <button
              type="button"
              onClick={handleShare}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition cursor-pointer"
            >
              <FiShare2 className="w-4 h-4" />
            </button>
          </div>

          {/* Ticket Perforation (Vertical) */}
          <div className="relative flex flex-col items-center justify-between w-10 h-auto bg-transparent z-20 pointer-events-none -ml-5 -mr-5 self-stretch">
             <div className="w-10 h-10 -mt-5 rounded-full bg-[var(--bg-page)]" />
             <div className="h-full border-l-[3px] border-dashed border-slate-400/80 dark:border-slate-500/80 my-2" />
             <div className="w-10 h-10 -mb-5 rounded-full bg-[var(--bg-page)]" />
          </div>

          {/* Right: Event Info Card (Ticket Right Side) */}
          <div className="flex-1 flex flex-col z-10 pl-4 bg-[var(--bg-card)]">
            <div className="flex-1 p-6 pb-4 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-3 py-0.5 rounded-full text-xs font-bold text-white ${salesStatus.statusColor}`}>
                  {salesStatus.statusLabel}
                </span>
                {isResaleTag && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white">
                    {translate("Bán lại vé")}
                  </span>
                )}
              </div>
              <h1 className="text-xl xl:text-2xl font-black app-text-main leading-snug tracking-tight mb-6">
                {event.title}
              </h1>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0 border app-border">
                    <FiCalendar className="w-4 h-4 app-text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-bold app-text-brand leading-snug">
                      {displayDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0 border app-border">
                    <FiMapPin className="w-4 h-4 app-text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-bold app-text-brand leading-snug">
                      {locationName}
                    </p>
                    {event.address && (
                      <p className="text-xs app-text-muted mt-0.5 leading-relaxed">
                        {event.address}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-dashed app-border p-6 mt-auto">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs app-text-muted font-medium mb-1">{translate("Giá từ")}</p>
                  <p className="text-3xl font-black app-text-main font-mono">{displayPrice}</p>
                </div>
                <button
                  type="button"
                  disabled={salesStatus.isClosed}
                  onClick={onBuyTicketsClick}
                  className={`w-full py-3.5 font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
                    salesStatus.isClosed
                      ? "bg-[var(--bg-subnav)] app-text-muted cursor-not-allowed shadow-none"
                      : "bg-brand-primary hover:bg-brand-700 text-white shadow-blue-500/25"
                  }`}
                >
                  <FaTicketAlt className="w-4 h-4" />
                  <span>{salesStatus.buttonText}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── MOBILE LAYOUT: Inspired directly by Reference Image 1 ── */}
        <div className="lg:hidden relative">
          {/* Ambient blurred backdrop */}
          <div className="absolute inset-0 -top-8 -bottom-8 -mx-6 md:-mx-12 overflow-hidden pointer-events-none opacity-20 dark:opacity-10 blur-2xl -z-10">
            <img src={posterImage} alt="" className="w-full h-full object-cover scale-125" />
          </div>

          {/* Ticket Card Stub: Outer rounded container */}
          <div className="event-ticket-card relative rounded-3xl overflow-hidden shadow-2xl app-bg-card app-text-main">
            {/* Top: Banner Image */}
            <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
              <img
                src={posterImage}
                alt={event.title}
                className={`w-full h-full object-cover transition-all duration-700 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setImageLoaded(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

              {/* Status badge in top-left */}
              <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold text-white shadow-md ${salesStatus.statusColor}`}>
                  {salesStatus.statusLabel}
                </span>
                {isResaleTag && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500 text-white shadow-md">
                    {translate("Bán lại")}
                  </span>
                )}
              </div>
            </div>

            {/* Perforated / Scalloped ticket divider with side circular notches */}
            <div className="relative flex items-center justify-between w-full h-10 -my-5 overflow-hidden z-20 pointer-events-none">
              <div className="w-10 h-10 -ml-5 rounded-full bg-[var(--bg-page)]" />
              <div className="flex-1 border-b-[3px] border-dashed border-slate-400/80 dark:border-slate-500/80 mx-2" />
              <div className="w-10 h-10 -mr-5 rounded-full bg-[var(--bg-page)]" />
            </div>

            {/* Bottom Info Section (Adapts dynamically to both Light & Dark modes) */}
            <div className="p-5 pt-4 pb-6 space-y-4">
              {/* Event Title */}
              <h1 className="text-lg font-black app-text-main leading-snug tracking-tight">
                {event.title}
              </h1>

              {/* Date & Time */}
              <div className="flex items-start gap-2.5">
                <FiCalendar className="w-4 h-4 app-text-brand shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm font-bold app-text-brand leading-tight">
                  {displayDate}
                </p>
              </div>

              {/* Location */}
              <div className="flex items-start gap-2.5">
                <FiMapPin className="w-4 h-4 app-text-brand shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs sm:text-sm font-bold app-text-main leading-tight">
                    {locationName}
                  </p>
                  {event.address && (
                    <p className="text-[11px] app-text-sub leading-relaxed">
                      {event.address}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE STICKY BOTTOM BAR (Matching Image 1 & HaloTicket blue) ── */}
      <div className="event-mobile-buybar lg:hidden fixed bottom-0 inset-x-0 z-50 backdrop-blur-md border-t app-border shadow-[0_-4px_20px_rgba(0,0,0,0.12)] px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase font-bold app-text-muted tracking-wider">{translate("Giá từ")}</p>
          <p className="text-lg font-black app-text-main leading-tight truncate font-mono">{displayPrice}</p>
        </div>
        <button
          type="button"
          disabled={salesStatus.isClosed}
          onClick={onBuyTicketsClick}
          className={`px-6 py-3 font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98] shrink-0 ${
            salesStatus.isClosed
              ? "bg-[var(--bg-subnav)] app-text-muted cursor-not-allowed shadow-none"
              : "bg-brand-primary hover:bg-brand-700 text-white shadow-blue-500/25"
          }`}
        >
          <FaTicketAlt className="w-3.5 h-3.5" />
          <span>{salesStatus.buttonText}</span>
        </button>
      </div>
    </>
  );
};

export default EventHero;
