import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MOCK_RESALE_EVENTS } from "@/mock/resaleData";
import { MOCK_EVENT_DETAIL } from "@/mock/eventData";
import EventHero from "@/features/events/components/detail/EventHero";
import ResaleFilterModal, { type FilterState } from "./components/ResaleFilterModal";
import { FiFilter, FiCalendar, FiArrowLeft, FiChevronDown, FiChevronUp } from "react-icons/fi";

export const ResaleEventDetail: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [eventId]);

  const resaleEvent = MOCK_RESALE_EVENTS.find((e) => e.id === eventId) || MOCK_RESALE_EVENTS[0];

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    sortOption: "latest",
    selectedQuantity: 0,
    selectedShowtime: "19:00, 06 tháng 09, 2026",
    selectedTier: "all",
    retailFilter: "all"
  });

  const handleResetFilters = () => {
    setFilters({
      sortOption: "latest",
      selectedQuantity: 0,
      selectedShowtime: "19:00, 06 tháng 09, 2026",
      selectedTier: "all",
      retailFilter: "all"
    });
  };

  // Filtered listings logic
  let filteredListings = [...(resaleEvent.listings || [])];

  if (filters.retailFilter === "retail") {
    filteredListings = filteredListings.filter((t) => t.isRetail);
  } else if (filters.retailFilter === "non-retail") {
    filteredListings = filteredListings.filter((t) => !t.isRetail);
  }

  if (filters.selectedQuantity > 0) {
    filteredListings = filteredListings.filter((t) => t.quantity === filters.selectedQuantity);
  }

  if (filters.selectedTier !== "all") {
    filteredListings = filteredListings.filter((t) => t.tierName.includes(filters.selectedTier));
  }

  if (filters.sortOption === "price-asc") {
    filteredListings.sort((a, b) => a.priceValue - b.priceValue);
  } else if (filters.sortOption === "price-desc") {
    filteredListings.sort((a, b) => b.priceValue - a.priceValue);
  }

  // Convert resale event to EventDetailData format for EventHero component
  const heroEventData = {
    ...MOCK_EVENT_DETAIL,
    id: resaleEvent.id,
    title: resaleEvent.title,
    locationName: resaleEvent.venueName,
    address: resaleEvent.address,
    datesSummary: resaleEvent.datesSummary,
    posterImage: resaleEvent.posterImage,
    minPrice: resaleEvent.minPrice
  };

  return (
    <div className="w-full transition-colors duration-300 pb-16">
      <div className="container mx-auto px-4 md:px-8 py-6">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => navigate("/resale-ticket")}
          className="mb-4 inline-flex items-center gap-2 text-xs md:text-sm font-bold app-text-muted hover:app-text-main transition-colors cursor-pointer"
        >
          <FiArrowLeft className="w-4 h-4" />
          <span>Quay lại Sàn vé bán lại</span>
        </button>

        {/* 1. Re-used EventHero Banner with Bán lại vé Badge */}
        <EventHero
          event={heroEventData}
          onBuyTicketsClick={() => {
            const listEl = document.getElementById("resale-list-section");
            if (listEl) listEl.scrollIntoView({ behavior: "smooth" });
          }}
          isResaleTag={true}
        />

        {/* 2. Section "Danh sách vé bán lại" Header with Filter Toggle */}
        <div id="resale-list-section" className="scroll-mt-20 mt-8 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-4 relative z-30">
          <h2 className="text-xl md:text-2xl font-extrabold app-text-main tracking-tight">
            Danh sách vé bán lại
          </h2>

          <div className="flex items-center gap-3 relative">
            <span className="px-3 py-1.5 rounded-xl bg-zinc-200/80 dark:bg-zinc-800 text-xs font-extrabold app-text-main flex items-center gap-1.5 border app-border">
              <FiCalendar className="w-3.5 h-3.5 app-text-brand" />
              {resaleEvent.datesSummary}
            </span>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="px-4 py-1.5 rounded-xl gradient-btn text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer hover:scale-105 transition-transform"
            >
              <FiFilter className="w-3.5 h-3.5" />
              <span>Bộ lọc</span>
              {isFilterOpen ? <FiChevronUp className="w-3.5 h-3.5" /> : <FiChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Extracted ResaleFilterModal Component */}
            <ResaleFilterModal
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
              filters={filters}
              onApplyFilters={(newFilters) => setFilters(newFilters)}
              onResetFilters={handleResetFilters}
            />
          </div>
        </div>

        {/* 3. Grid of Resale Ticket Stub Cards */}
        {filteredListings && filteredListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredListings.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => navigate(`/resale-ticket/${resaleEvent.id}/ticket/${ticket.id}`)}
                className="relative rounded-2xl overflow-hidden app-bg-card border app-border hover:border-brand-primary transition-all duration-300 shadow-lg hover:shadow-2xl cursor-pointer p-4 flex flex-col justify-between"
              >
                {/* Top Header Badge & Code */}
                <div>
                  {/* Category Tier Badge Bar */}
                  <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-200/60 dark:border-slate-800/60">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: ticket.tierColor || "#06B6D4" }}
                    />
                    <span className="font-extrabold text-xs md:text-sm app-text-main truncate">
                      {ticket.tierName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${ticket.isRetail
                          ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                          : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        }`}
                    >
                      {ticket.isRetail ? "Bán lẻ" : "Không bán lẻ"}
                    </span>
                    <span className="text-xs font-mono font-bold app-text-muted">
                      {ticket.resaleCode}
                    </span>
                  </div>

                  {/* Info Lines */}
                  <div className="space-y-1.5 text-xs app-text-main mb-4">
                    <div className="flex justify-between">
                      <span className="app-text-muted">Số lượng:</span>
                      <span className="font-extrabold">{ticket.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="app-text-muted">Suất diễn:</span>
                      <span className="font-bold text-[11px]">{ticket.showtimeStr}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="app-text-muted">Khu vực:</span>
                      <span className="font-extrabold">{ticket.areaName}</span>
                    </div>
                  </div>
                </div>

                {/* Price Line */}
                <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                  <span className="text-xs app-text-muted font-medium">Giá bán mỗi vé:</span>
                  <span className="text-sm font-black app-text-brand">
                    {ticket.pricePerTicket}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="app-bg-card border app-border rounded-3xl p-12 text-center text-sm app-text-muted">
            Không tìm thấy vé bán lại nào phù hợp với bộ lọc đã chọn.
          </div>
        )}
      </div>
    </div>
  );
};

export default ResaleEventDetail;
