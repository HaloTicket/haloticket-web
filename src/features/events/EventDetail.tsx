import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import EventHero from "./components/detail/EventHero";
import EventDescription from "./components/detail/EventDescription";
import EventSchedule from "./components/detail/EventSchedule";
import EventStickyHeader from "./components/detail/EventStickyHeader";
import EventOrganizer from "./components/detail/EventOrganizer";
import EventCard from "@/components/common/EventCard";
import { eventApi } from "@/services/eventApi";
import { PATHS } from "@/routes/paths";
import { FiGrid } from "react-icons/fi";
import "./components/detail/EventDetail.css";

import type { EventDetailData, EventApiData } from "@/types";

export default function EventDetail() {
  useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isStickyVisible, setIsStickyVisible] = useState(false);
  const [eventData, setEventData] = useState<EventDetailData | null>(null);
  const [recommendedEvents, setRecommendedEvents] = useState<EventApiData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"desc" | "schedule" | "organizer">("desc");

  // always scroll to top when opening event detail page & fetch event data from API
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    let isMounted = true;
    setIsLoading(true);
    setEventData(null);

    if (!id) {
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    eventApi.getEventById(id).then((data) => {
      if (isMounted) {
        setEventData(data as unknown as EventDetailData);
        // log view asynchronously without blocking UI
        void eventApi.logEventView(id);
      }
    }).catch(() => {
      if (isMounted) setEventData(null);
    }).finally(() => {
      if (isMounted) setIsLoading(false);
    });

    eventApi.getAllEvents().then((events) => {
      if (isMounted && events) {
        setRecommendedEvents(events.slice(0, 8));
      }
    }).catch(() => {
      if (isMounted) setRecommendedEvents([]);
    });

    return () => {
      isMounted = false;
    };
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

  const handleGoToSelectTicket = (showtimeId?: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate(`/login?returnUrl=/events/${id}`);
      return;
    }
    
    if (typeof showtimeId === "string") {
      navigate(`/events/${id}/select-ticket?showtimeId=${showtimeId}`);
      return;
    }
    
    // check active showtimes
    if (!eventData) return;
    
    const now = new Date();
    const parseSaleDate = (value: unknown): Date | null => {
      if (Array.isArray(value)) {
        const [year, month, day, hour = 0, minute = 0, second = 0] = value as number[];
        const date = new Date(year, month - 1, day, hour, minute, second);
        return Number.isNaN(date.getTime()) ? null : date;
      }
      if (typeof value !== "string" && typeof value !== "number") return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };
    const activeShowtimes = eventData.showtimes?.filter((st) => {
      const saleStart = parseSaleDate((st as typeof st & { saleStartTime?: unknown }).saleStartTime) || parseSaleDate(eventData.ticketSaleStartDate);
      const saleEnd = parseSaleDate((st as typeof st & { saleEndTime?: unknown }).saleEndTime) || parseSaleDate(eventData.ticketSaleEndDate);
      const isUpcoming = saleStart && now < saleStart;
      const isEnded = saleEnd && now > saleEnd;
      return !isUpcoming && !isEnded;
    }) || [];

    if (activeShowtimes.length === 1) {
      navigate(`/events/${id}/select-ticket?showtimeId=${activeShowtimes[0].id}`);
    } else {
      const scheduleEl = document.getElementById("event-schedule-section");
      if (scheduleEl) {
        scheduleEl.scrollIntoView({ behavior: "smooth" });
      } else {
        const firstShowtime = eventData.showtimes?.[0]?.id || "st_default_1";
        navigate(`/events/${id}/select-ticket?showtimeId=${firstShowtime}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-extrabold app-text-muted">{translate("Đang tải thông tin sự kiện...")}</p>
        </div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center p-12 text-center">
        <div className="space-y-3">
          <h3 className="text-lg font-bold app-text-main">{translate("Không tìm thấy sự kiện")}</h3>
          <p className="text-xs app-text-muted">{translate("Sự kiện này không tồn tại hoặc đã bị xóa.")}</p>
        </div>
      </div>
    );
  }

  const scrollToSection = (sectionId: "desc" | "schedule" | "organizer") => {
    setActiveTab(sectionId);
    const elementId =
      sectionId === "desc"
        ? "event-desc-section"
        : sectionId === "schedule"
        ? "event-schedule-section"
        : "event-organizer-section";
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="event-detail-screen w-full transition-colors duration-300">
      {/* Fixed Top Header Bar on Scroll */}
      <EventStickyHeader
        event={eventData}
        isVisible={isStickyVisible}
        onBuyTicketsClick={handleGoToSelectTicket}
      />

      {/* Main Container with side margins */}
      <div className="w-full max-w-[1340px] mx-auto px-6 md:px-12 lg:px-16 py-6 md:py-8">
        {/* Hero Section (Banner + Info Card) */}
        <EventHero
          event={eventData}
          onBuyTicketsClick={handleGoToSelectTicket}
        />

        {/* Navigation Tabs (Giới thiệu, Thông tin / Lịch chiếu, Ban tổ chức / Chính sách) */}
        <div className="event-detail-tabs sticky top-0 z-20 backdrop-blur-md border-b app-border mb-8 -mx-6 px-6 md:-mx-12 md:px-12 lg:-mx-16 lg:px-16 pt-3 pb-0 shadow-2xs">
          <div className="flex items-center gap-8 overflow-x-auto scrollbar-hide">
            <button
              type="button"
              onClick={() => scrollToSection("desc")}
              className={`pb-3 text-sm font-extrabold transition-all relative whitespace-nowrap cursor-pointer ${
                activeTab === "desc"
                  ? "app-text-brand"
                  : "app-text-muted app-hover-text-brand"
              }`}
            >
              {translate("Giới thiệu")}
              {activeTab === "desc" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => scrollToSection("schedule")}
              className={`pb-3 text-sm font-extrabold transition-all relative whitespace-nowrap cursor-pointer ${
                activeTab === "schedule"
                  ? "app-text-brand"
                  : "app-text-muted app-hover-text-brand"
              }`}
            >
              {translate("Thông tin & Lịch diễn")}
              {activeTab === "schedule" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => scrollToSection("organizer")}
              className={`pb-3 text-sm font-extrabold transition-all relative whitespace-nowrap cursor-pointer ${
                activeTab === "organizer"
                  ? "app-text-brand"
                  : "app-text-muted app-hover-text-brand"
              }`}
            >
              {translate("Ban tổ chức & Chính sách")}
              {activeTab === "organizer" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Content Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-6">
          {/* Main Content Column */}
          <div className="lg:col-span-12 space-y-8">
            {/* Collapsible Event Description & Gallery */}
            <div id="event-desc-section">
              <EventDescription event={eventData} />
            </div>

            {/* Schedule & Tickets */}
            <div id="event-schedule-section">
              <EventSchedule
                event={eventData}
                onSelectTicket={(st) => handleGoToSelectTicket(st.id)}
              />
            </div>

            {/* Organizer Section */}
            <div id="event-organizer-section">
              <EventOrganizer organizer={eventData.organizer} event={eventData} />
            </div>
          </div>
        </div>

        {/* Recommended Events Section */}
        <div className="mt-8 mb-8 pt-8 border-t border-slate-200/60 dark:border-slate-800/60">
          <h2 className="text-xl md:text-2xl font-extrabold app-text-main flex items-center gap-2 mb-6 tracking-tight">
            <FiGrid className="w-5 h-5 app-text-brand" />
            <span>{translate("Có thể bạn cũng thích")}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {recommendedEvents.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>

          <div className="flex justify-center mt-8">
            <button
              type="button"
              onClick={() => navigate(PATHS.EVENTS)}
              className="px-8 py-3 gradient-btn text-white font-extrabold text-sm rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              {translate("Xem thêm sự kiện")}</button>
          </div>
        </div>
      </div>

      {/* Bottom spacing for mobile sticky CTA bar */}
      <div className="lg:hidden h-20" />
    </div>
  );
}
