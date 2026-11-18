import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import EventHero from "./components/detail/EventHero";
import EventDescription from "./components/detail/EventDescription";
import EventSchedule from "./components/detail/EventSchedule";
import EventStickyHeader from "./components/detail/EventStickyHeader";
import EventOrganizer from "./components/detail/EventOrganizer";
import EventCard from "@/components/common/EventCard";
import { eventApi } from "@/services/eventApi";
import { getKeycloakSession } from "@/services/keycloakSession";
import { PATHS } from "@/routes/paths";
import { FiGrid } from "react-icons/fi";

import type { EventDetailData, EventApiData } from "@/types";

/** Trang chi tiết sự kiện: banner, mô tả, lịch và vé, ban tổ chức, sự kiện gợi ý, thanh tiêu đề dính khi cuộn và nút mua vé (yêu cầu đăng nhập trước khi chọn vé). */
export default function EventDetail() {
  const { t: translate } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isStickyVisible, setIsStickyVisible] = useState(false);
  const [eventData, setEventData] = useState<EventDetailData | null>(null);
  const [recommendedEvents, setRecommendedEvents] = useState<EventApiData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"desc" | "schedule" | "organizer">("desc");

  // luôn cuộn lên đầu khi mở trang chi tiết sự kiện, đồng thời tải dữ liệu sự kiện từ API
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
        // ghi nhận lượt xem bất đồng bộ, không chặn giao diện
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

  // lắng nghe cuộn trang để hiện thanh tiêu đề dính
  useEffect(() => {
    /** Hiện thanh tiêu đề dính khi cuộn quá 350 điểm ảnh. */
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

  /** Đi tới trang chọn vé; nếu không chỉ rõ suất diễn thì tự chọn suất đang mở bán duy nhất, hoặc cuộn tới phần lịch để người dùng chọn. Chưa đăng nhập thì lưu đích và chuyển sang trang đăng nhập. */
  const handleGoToSelectTicket = (showtimeId?: string) => {
    let target = `/events/${id}/select-ticket`;
    if (typeof showtimeId === "string") {
      target = `/events/${id}/select-ticket?showtimeId=${showtimeId}`;
    } else {
      // kiểm tra các suất diễn đang mở bán
      if (!eventData) return;
      
      const now = new Date();
      /** Chuyển giá trị ngày mở bán (mảng số hoặc chuỗi, số) thành {@code Date}; không hợp lệ thì trả về {@code null}. */
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
        target = `/events/${id}/select-ticket?showtimeId=${activeShowtimes[0].id}`;
      } else {
        const scheduleEl = document.getElementById("event-schedule-section");
        if (scheduleEl) {
          scheduleEl.scrollIntoView({ behavior: "smooth" });
          return;
        } else {
          const firstShowtime = eventData.showtimes?.[0]?.id || "st_default_1";
          target = `/events/${id}/select-ticket?showtimeId=${firstShowtime}`;
        }
      }
    }

    if (!getKeycloakSession().isAuthenticated()) {
      sessionStorage.setItem("haloticket_auth_redirect", target);
      navigate(PATHS.LOGIN);
      return;
    }

    navigate(target);
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

  /** Đặt tab đang chọn và cuộn mượt tới phần tương ứng của trang. */
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
      {/* Thanh tiêu đề cố định khi cuộn */}
      <EventStickyHeader
        event={eventData}
        isVisible={isStickyVisible}
        onBuyTicketsClick={handleGoToSelectTicket}
      />

      {/* Khung chính có lề hai bên */}
      <div className="w-full max-w-[1340px] mx-auto px-6 md:px-12 lg:px-16 py-6 md:py-8">
        {/* Phần đầu trang (banner và thẻ thông tin) */}
        <EventHero
          event={eventData}
          onBuyTicketsClick={handleGoToSelectTicket}
        />

        {/* Các tab điều hướng (Giới thiệu, Thông tin / Lịch chiếu, Ban tổ chức / Chính sách) */}
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

        {/* Các phần nội dung */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-6">
          {/* Cột nội dung chính */}
          <div className="lg:col-span-12 space-y-8">
            {/* Mô tả sự kiện và thư viện ảnh, có thể thu gọn */}
            <div id="event-desc-section">
              <EventDescription event={eventData} />
            </div>

            {/* Lịch diễn và vé */}
            <div id="event-schedule-section">
              <EventSchedule
                event={eventData}
                onSelectTicket={(st) => handleGoToSelectTicket(st.id)}
              />
            </div>

            {/* Phần ban tổ chức */}
            <div id="event-organizer-section">
              <EventOrganizer organizer={eventData.organizer} event={eventData} />
            </div>
          </div>
        </div>

        {/* Phần sự kiện gợi ý */}
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

      {/* Khoảng đệm phía dưới cho thanh CTA dính trên di động */}
      <div className="lg:hidden h-20" />
    </div>
  );
}
