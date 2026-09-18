import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import React from "react";
import { FiMapPin } from "react-icons/fi";
import { FaTicketAlt } from "react-icons/fa";
import type { EventDetailData } from "@/types";

interface EventStickyHeaderProps {
  event: EventDetailData;
  isVisible: boolean;
  onBuyTicketsClick: () => void;
}

export const EventStickyHeader: React.FC<EventStickyHeaderProps> = ({
  event,
  isVisible,
  onBuyTicketsClick
}) => {
  useTranslation();

  const salesStatus = React.useMemo(() => {
    const now = new Date();
    const saleStart = event.ticketSaleStartDate ? new Date(event.ticketSaleStartDate) : null;
    const saleEnd = event.ticketSaleEndDate ? new Date(event.ticketSaleEndDate) : null;

    if (saleStart && now < saleStart) {
      return { isClosed: true, buttonText: translate("Chưa mở bán") };
    }
    if (saleEnd && now > saleEnd) {
      return { isClosed: true, buttonText: translate("Đã hết hạn bán vé") };
    }

    const rawTickets = (event as any).tickets || (event as any).ticketTypes;
    let totalAvailable = 0;
    let hasTicketData = false;

    if (Array.isArray(rawTickets) && rawTickets.length > 0) {
      hasTicketData = true;
      rawTickets.forEach((t: any) => {
        const q = t.totalQuantity ?? t.quantity ?? 100;
        const s = t.soldQuantity ?? 0;
        if (t.available !== false && q - s > 0) {
          totalAvailable += q - s;
        }
      });
    }

    if (Array.isArray(event.showtimes) && event.showtimes.length > 0) {
      hasTicketData = true;
      event.showtimes.forEach((st: any) => {
        if (Array.isArray(st.tickets)) {
          st.tickets.forEach((t: any) => {
            if (t.available) totalAvailable += 1;
          });
        }
      });
    }

    const isSoldOut = (event as any).isSoldOut || (hasTicketData && totalAvailable === 0);
    if (isSoldOut) {
      return { isClosed: true, buttonText: translate("Đã hết vé") };
    }

    return { isClosed: false, buttonText: translate("Mua vé ngay") };
  }, [event]);

  return (
    <div
      className={`fixed top-0 inset-x-0 z-[100] h-18 app-bg-header backdrop-blur-xl border-b app-border shadow-2xl transition-all duration-300 flex items-center justify-between px-4 md:px-12 lg:px-16 ${isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
        }`}
    >
      {/* Left Event Title & Location (Bigger & Clearer) */}
      <div className="flex items-center gap-6 min-w-0 pr-4">
        <h3 className="text-base md:text-lg lg:text-xl font-extrabold app-text-main truncate max-w-lg md:max-w-2xl tracking-tight">
          {event.title}
        </h3>
        <div className="hidden md:flex items-center gap-1.5 text-xs md:text-sm app-text-brand font-extrabold shrink-0 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800/60">
          <FiMapPin className="w-4 h-4 shrink-0" />
          <span className="truncate">{event.locationName}</span>
        </div>
      </div>

      {/* Right CTA Button */}
      <button
        type="button"
        disabled={salesStatus.isClosed}
        onClick={onBuyTicketsClick}
        className={`px-8 py-3 font-black text-sm md:text-base rounded-2xl shadow-xl shrink-0 flex items-center gap-2 transition-all cursor-pointer min-w-[170px] justify-center ${
          salesStatus.isClosed
            ? "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none"
            : "gradient-btn text-white hover:scale-105 active:scale-95"
        }`}
      >
        <FaTicketAlt className="w-4 h-4 md:w-5 md:h-5" />
        <span>{salesStatus.buttonText}</span>
      </button>
    </div>
  );
};

export default EventStickyHeader;
