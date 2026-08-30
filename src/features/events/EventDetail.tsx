import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { MOCK_EVENT_DETAIL, SPECIAL_EVENTS, WEEKEND_EVENTS } from "@/mock/eventData";
import EventHero from "./components/detail/EventHero";
import EventDescription from "./components/detail/EventDescription";
import EventSchedule from "./components/detail/EventSchedule";
import EventStickyHeader from "./components/detail/EventStickyHeader";
import EventOrganizer from "./components/detail/EventOrganizer";
import EventCard from "@/components/common/EventCard";
import { FiGrid } from "react-icons/fi";

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  console.log("Viewing event id:", id);
  const [isStickyVisible, setIsStickyVisible] = useState(false);

  // Always scroll to top when opening event detail page
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [id]);

  // Scroll listener for sticky header bar on scroll
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

  const eventData = MOCK_EVENT_DETAIL;

  // Recommended events list
  const recommendedEvents = [...SPECIAL_EVENTS, ...WEEKEND_EVENTS].slice(0, 8);

  return (
    <div className="w-full transition-colors duration-300">
      {/* Fixed Top Header Bar on Scroll*/}
      <EventStickyHeader
        event={eventData}
        isVisible={isStickyVisible}
        onBuyTicketsClick={handleScrollToSchedule}
      />

      {/* Main Container */}
      <div className="container mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Top Physical Ticket Stub Banner*/}
        <EventHero
          event={eventData}
          onBuyTicketsClick={handleScrollToSchedule}
        />

        {/* Compact Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-6">
          {/* Main Content Column */}
          <div className="lg:col-span-7 space-y-8">
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
            <EventOrganizer organizer={eventData.organizer} />
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
