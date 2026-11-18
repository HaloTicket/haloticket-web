import { useTranslation } from "react-i18next";
import React, { useRef, useState, useEffect } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import type { EventApiData } from "@/types";
import { EventCard } from "@/components/common/EventCard";
import { SectionHeader } from "@/components/common/SectionHeader";

/** Props của khu vực danh mục: tiêu đề, biểu tượng, liên kết xem thêm, danh sách sự kiện và giới hạn số thẻ. */
interface CategorySectionProps {
  title: string;
  icon?: React.ReactNode;
  seeMoreLink?: string;
  events: Array<EventApiData>;
  limit?: number;
  className?: string;
}

/** Khu vực một danh mục sự kiện: tiêu đề kèm dải thẻ sự kiện cuộn ngang, có nút cuộn trái phải hiện theo vị trí cuộn. */
export const CategorySection: React.FC<CategorySectionProps> = ({
  title,
  icon,
  seeMoreLink,
  events,
  limit = 8,
  className = "mb-10"
}) => {
  const { t: translate } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  /** Cập nhật việc hiện hay ẩn nút cuộn trái và phải theo vị trí cuộn hiện tại. */
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeft(scrollLeft > 10);
      setShowRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
  }, []);

  /** Cuộn dải thẻ sang trái 350 điểm ảnh. */
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -350, behavior: "smooth" });
    }
  };

  /** Cuộn dải thẻ sang phải 350 điểm ảnh. */
  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 350, behavior: "smooth" });
    }
  };

  return (
    <div className={className}>
      <SectionHeader title={translate(title)} icon={icon} seeMoreLink={seeMoreLink} />

      <div className="relative group">
        {/* Nút mũi tên trái (hiện thông minh) */}
        {showLeft && (
          <button
            type="button"
            onClick={scrollLeft}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 text-white border border-slate-700 shadow-2xl backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-brand-primary hover:scale-110 cursor-pointer"
            aria-label={translate("Cuộn sang trái")}
          >
            <FiChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Dải thẻ sự kiện cuộn ngang */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex items-center gap-4 overflow-x-auto pb-3 no-scrollbar scroll-smooth"
        >
          {events.slice(0, limit).map((event) => (
            <div key={event.id} className="w-[260px] md:w-[285px] shrink-0">
              <EventCard event={event} />
            </div>
          ))}
        </div>

        {/* Nút mũi tên phải (hiện thông minh) */}
        {showRight && (
          <button
            type="button"
            onClick={scrollRight}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 text-white border border-slate-700 shadow-2xl backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-brand-primary hover:scale-110 cursor-pointer"
            aria-label={translate("Cuộn sang phải")}
          >
            <FiChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default CategorySection;
