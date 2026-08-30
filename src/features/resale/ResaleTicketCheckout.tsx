import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { MOCK_RESALE_EVENTS } from "@/mock/resaleData";
import { FiChevronRight, FiCheckSquare, FiSquare, FiInfo, FiLayers } from "react-icons/fi";

export const ResaleTicketCheckout: React.FC = () => {
  const { eventId, ticketId } = useParams<{ eventId: string; ticketId: string }>();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [eventId, ticketId]);

  const resaleEvent = MOCK_RESALE_EVENTS.find((e) => e.id === eventId) || MOCK_RESALE_EVENTS[0];
  const listing = resaleEvent.listings?.find((l) => l.id === ticketId) || resaleEvent.listings[0];

  // Selected seats state
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>(
    listing.seats.filter((s) => s.isSelected).map((s) => s.id)
  );

  // Terms agreement checkbox state
  const [isAgreed, setIsAgreed] = useState<boolean>(true);

  const toggleSeat = (id: string) => {
    if (selectedSeatIds.includes(id)) {
      setSelectedSeatIds(selectedSeatIds.filter((item) => item !== id));
    } else {
      setSelectedSeatIds([...selectedSeatIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedSeatIds.length === listing.seats.length) {
      setSelectedSeatIds([]);
    } else {
      setSelectedSeatIds(listing.seats.map((s) => s.id));
    }
  };

  // Calculate total price
  const totalPriceNumber = selectedSeatIds.length * (listing.priceValue || 2499000);
  const totalPriceFormatted = new Intl.NumberFormat("vi-VN").format(totalPriceNumber) + "đ";

  return (
    <div className="w-full transition-colors duration-300 pb-20">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs md:text-sm app-text-muted mb-6 font-medium">
          <Link to="/" className="hover:app-text-main transition-colors">
            Trang chủ
          </Link>
          <FiChevronRight className="w-3.5 h-3.5" />
          <Link to="/resale-ticket" className="hover:app-text-main transition-colors">
            Vé bán lại
          </Link>
          <FiChevronRight className="w-3.5 h-3.5" />
          <span className="app-text-main font-bold">Chi tiết vé</span>
        </div>

        {/* Page Main Title */}
        <h1 className="text-2xl md:text-3xl font-extrabold app-text-main tracking-tight mb-6">
          Danh sách vé bán lại
        </h1>

        {/* Event Summary Card */}
        <div className="app-bg-card border app-border rounded-3xl p-5 md:p-6 shadow-lg mb-8 space-y-3">
          <div className="text-sm md:text-base font-extrabold app-text-main flex items-center justify-between">
            <div>
              <span className="app-text-muted mr-2 font-normal">Sự kiện:</span>
              <span>{resaleEvent.title}</span>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => alert("Chính sách & Quy định tham gia sự kiện Bán lại vé")}
              className="text-xs md:text-sm font-bold app-text-brand hover:underline flex items-center gap-1 cursor-pointer"
            >
              <FiInfo className="w-4 h-4" />
              <span>Xem quy định tham gia sự kiện</span>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs md:text-sm app-text-main font-semibold">
            <span className="app-text-muted mr-2 font-normal">Suất diễn:</span>
            <span>{listing.showtimeStr}</span>
          </div>
        </div>

        {/* Ticket Selection Container */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-extrabold app-text-main flex items-center gap-2">
              <span>Chọn vé</span>
            </h2>

            <span className="px-3 py-1 rounded-full text-xs font-black bg-sky-500/20 text-sky-400 border border-sky-500/30 uppercase">
              {listing.isRetail ? "Bán lẻ" : "Không bán lẻ"}
            </span>
          </div>

          {/* Tier Name Header */}
          <div className="flex items-center gap-2 text-base md:text-lg font-extrabold app-text-main">
            <FiLayers className="w-5 h-5 app-text-brand" />
            <span>{listing.tierName}</span>
          </div>

          {/* Select All Bar */}
          <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/90 border app-border flex items-center justify-between text-xs md:text-sm font-bold app-text-main">
            <span>Đã chọn {selectedSeatIds.length}/{listing.seats.length}</span>

            <button
              type="button"
              onClick={handleSelectAll}
              className="flex items-center gap-2 cursor-pointer hover:app-text-brand transition-colors"
            >
              <span>Chọn tất cả</span>
              {selectedSeatIds.length === listing.seats.length ? (
                <FiCheckSquare className="w-5 h-5 app-text-brand" />
              ) : (
                <FiSquare className="w-5 h-5 app-text-muted" />
              )}
            </button>
          </div>

          {/* Individual Seat Cards List */}
          <div className="space-y-3">
            {listing.seats.map((seat) => {
              const isChecked = selectedSeatIds.includes(seat.id);
              return (
                <div
                  key={seat.id}
                  onClick={() => toggleSeat(seat.id)}
                  className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-4 cursor-pointer shadow-md ${isChecked
                      ? "app-bg-card border-brand-primary ring-1 ring-brand-primary/30"
                      : "app-bg-card border-slate-200 dark:border-zinc-800 opacity-80"
                    }`}
                >
                  <div className="space-y-1 text-xs md:text-sm">
                    <div className="font-extrabold app-text-main">
                      <span className="app-text-muted font-normal mr-2">Khu vực:</span>
                      <span>{seat.section}</span>
                    </div>

                    <div className="font-extrabold app-text-main">
                      <span className="app-text-muted font-normal mr-2">Hàng ghế:</span>
                      <span>{seat.seatRow}</span>
                    </div>

                    <div className="font-black app-text-brand">
                      <span className="app-text-muted font-normal mr-2">Giá bán mỗi vé:</span>
                      <span>{seat.price}</span>
                    </div>
                  </div>

                  {/* Selection Checkbox */}
                  <div className="shrink-0">
                    {isChecked ? (
                      <div className="w-6 h-6 rounded-lg gradient-btn text-white flex items-center justify-center font-bold shadow-sm">
                        ✓
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-lg border-2 border-zinc-600 bg-zinc-800/40" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Terms Agreement Checkbox */}
        <div className="mb-8 p-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-800/40 border app-border">
          <label className="flex items-start gap-3 text-xs md:text-sm font-semibold app-text-main cursor-pointer">
            <input
              type="checkbox"
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-indigo-600 cursor-pointer"
            />
            <span className="leading-relaxed">
              Tôi đã đọc, hiểu, đồng ý và cam kết tuân thủ các{" "}
              <span className="app-text-brand font-extrabold hover:underline">
                Quy định sử dụng tính năng Bán lại vé
              </span>{" "}
              trên HaloTicket.
            </span>
          </label>
        </div>

        {/* Bottom Action Checkout Button */}
        <button
          type="button"
          disabled={selectedSeatIds.length === 0 || !isAgreed}
          onClick={() => {
            alert(`Xác nhận thanh toán mua vé bán lại: Tổng cộng ${totalPriceFormatted}`);
          }}
          className={`w-full py-4 font-black text-base md:text-lg rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 ${selectedSeatIds.length > 0 && isAgreed
              ? "gradient-btn text-white hover:scale-[1.01] active:scale-98 cursor-pointer"
              : "bg-zinc-700 text-zinc-400 cursor-not-allowed opacity-60"
            }`}
        >
          <span>Tiếp tục - {totalPriceFormatted}</span>
          <span className="text-xl">»</span>
        </button>
      </div>
    </div>
  );
};

export default ResaleTicketCheckout;
