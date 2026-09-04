import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import EventHero from "./components/detail/EventHero";
import EventDescription from "./components/detail/EventDescription";
import EventSchedule from "./components/detail/EventSchedule";
import EventStickyHeader from "./components/detail/EventStickyHeader";
import EventOrganizer from "./components/detail/EventOrganizer";
import EventCard from "@/components/common/EventCard";
import { eventApi } from "@/services/eventApi";
import { FiGrid } from "react-icons/fi";

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const [isStickyVisible, setIsStickyVisible] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const [recommendedEvents, setRecommendedEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // always scroll to top when opening event detail page & fetch event data from API
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (id) {
      setIsLoading(true);
      eventApi.getEventById(id).then((data) => {
        setEventData(data);
        setIsLoading(false);
      });
    }

    eventApi.getAllEvents().then((events) => {
      setRecommendedEvents(events.slice(0, 8));
    });
  }, [id]);

  // scroll listener for sticky header bar on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 350) {
        setIsStickyVisible(true);
      } else {
        setIsStickyVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollToSchedule = () => {
    const scheduleEl = document.getElementById("schedule-section");
    if (scheduleEl) {
      scheduleEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-extrabold app-text-muted">Đang tải thông tin sự kiện...</p>
        </div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center p-12 text-center">
        <div className="space-y-3">
          <h3 className="text-lg font-bold app-text-main">Không tìm thấy sự kiện</h3>
          <p className="text-xs app-text-muted">Sự kiện này không tồn tại hoặc đã bị xóa.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full transition-colors duration-300">
      {/* Fixed Top Header Bar on Scroll */}
      <EventStickyHeader
        event={eventData}
        isVisible={isStickyVisible}
        onBuyTicketsClick={handleScrollToSchedule}
      />

      {/* Main Container with side margins */}
      <div className="w-full max-w-[1340px] mx-auto px-6 md:px-12 lg:px-16 py-6 md:py-8">
        {/* Top Physical Ticket Stub Banner*/}
        <EventHero
          event={eventData}
          onBuyTicketsClick={handleScrollToSchedule}
        />

        {/* Compact Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-6">
          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-8">
            {/* Collapsible Event Description & Gallery */}
            <EventDescription event={eventData} />

            {/* Schedule & Tickets */}
            <EventSchedule
              event={eventData}
              onSelectTicket={(st, t) => {
                alert(`Đã chọn suất diễn ${st.timeStr} (${st.dateStr}) - Vé ${t.name} - Giá: ${t.price}`);
              }}
            />

            {/* Organizer Section */}
            {eventData.organizer && <EventOrganizer organizer={eventData.organizer} />}
          </div>
        </div>

        {/* Recommended Events Section */}
        <div className="mt-8 mb-8 pt-8 border-t border-slate-200/60 dark:border-slate-800/60">
          <h2 className="text-xl md:text-2xl font-extrabold app-text-main flex items-center gap-2 mb-6 tracking-tight">
            <FiGrid className="w-5 h-5 app-text-brand" />
            <span>Có thể bạn cũng thích</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {recommendedEvents.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>

          <div className="flex justify-center mt-8">
            <button
              type="button"
              className="px-8 py-3 gradient-btn text-white font-extrabold text-sm rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              Xem thêm sự kiện
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
