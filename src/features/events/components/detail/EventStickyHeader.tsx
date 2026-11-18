import { useTranslation } from "react-i18next";
import React from "react";
import { FiMapPin } from "react-icons/fi";
import { FaTicketAlt } from "react-icons/fa";
import type { EventDetailData } from "@/types";
import { isTicketInStock } from "@/utils/ticketQuantities";

/** Props của thanh tiêu đề dính: sự kiện hiển thị, trạng thái hiện/ẩn và hàm xử lý khi bấm nút mua vé. */
interface EventStickyHeaderProps {
  event: EventDetailData;
  isVisible: boolean;
  onBuyTicketsClick: () => void;
}

/**
 * Thanh tiêu đề dính ở đầu trang chi tiết sự kiện: hiện tên, địa điểm và nút mua vé khi người dùng cuộn qua phần đầu trang.
 * Nhãn và trạng thái khóa của nút được suy ra từ thời gian mở bán và tồn kho vé của các suất diễn.
 */
export const EventStickyHeader: React.FC<EventStickyHeaderProps> = ({
  event,
  isVisible,
  onBuyTicketsClick
}) => {
  const { t: translate } = useTranslation();

  const salesStatus = React.useMemo(() => {
    const now = new Date();
    
    /** Chuyển giá trị ngày (mảng [năm, tháng, ngày, giờ, phút, giây] hoặc chuỗi) thành {@code Date}; trả về {@code null} nếu rỗng hoặc không hợp lệ. */
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
    
    // dùng thời gian mở bán chung của sự kiện khi suất diễn không có mốc riêng
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

        // kiểm tra còn vé của suất diễn này
        if (Array.isArray(st.tickets)) {
          hasTicketInventory ||= st.tickets.length > 0;
          st.tickets.forEach((t: any) => {
            if (isTicketInStock(t)) {
              hasAnyTicketsAvailable = true;
            }
          });
        } else {
          // suất diễn không gắn vé cụ thể: coi là còn vé (trạng thái mở bán xét ở trên)
          hasAnyTicketsAvailable = true;
        }
      });
    } else {
      // không có suất diễn: kiểm tra theo thời gian bán vé chung
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
          if (isTicketInStock(t)) {
            hasAnyTicketsAvailable = true;
          }
        });
      }
    }

    const isSoldOut = (event as any).isSoldOut || (hasTicketInventory && !hasAnyTicketsAvailable && !hasAnyShowtimeUpcoming);

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

    // mặc định: đã ngừng bán
    return { isClosed: true, buttonText: translate("Ngừng Bán vé") };
  }, [event]);

  return (
    <div
      className={`fixed top-0 inset-x-0 z-[100] h-18 app-bg-header backdrop-blur-xl border-b app-border shadow-2xl transition-all duration-300 flex items-center justify-between px-4 md:px-12 lg:px-16 ${isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
        }`}
    >
      {/* Bên trái: tên sự kiện và địa điểm */}
      <div className="flex items-center gap-6 min-w-0 pr-4">
        <h3 className="text-base md:text-lg lg:text-xl font-extrabold app-text-main truncate max-w-lg md:max-w-2xl tracking-tight">
          {event.title}
        </h3>
        <div className="hidden md:flex items-center gap-1.5 text-xs md:text-sm app-text-brand font-extrabold shrink-0 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800/60">
          <FiMapPin className="w-4 h-4 shrink-0" />
          <span className="truncate">{event.locationName}</span>
        </div>
      </div>

      {/* Bên phải: nút mua vé */}
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
