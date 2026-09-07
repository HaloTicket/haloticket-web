import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import React, { useState } from "react";
import { FiChevronDown, FiChevronUp, FiInfo } from "react-icons/fi";
import type { EventDetailData } from "@/mock/eventData";

interface EventDescriptionProps {
  event: EventDetailData;
}

export const EventDescription: React.FC<EventDescriptionProps> = ({ event }) => {
  useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const cast = event.cast ?? [];
  const description = event.descriptionText || translate("Chưa có mô tả.");

  return (
    <div className="mb-6">
      <h2 className="text-xl md:text-2xl font-extrabold app-text-main flex items-center gap-2 mb-3 tracking-tight">
        <FiInfo className="w-5 h-5 app-text-brand" />
        <span>{translate("Giới thiệu")}</span>
      </h2>

      {/* Main Glass Card Container */}
      <div className="relative app-bg-card border app-border rounded-3xl p-5 md:p-6 shadow-lg transition-all duration-500 overflow-hidden">
        {/* Content Box with Collapsible Max-Height */}
        <div
          className={`transition-all duration-500 overflow-hidden ${isExpanded ? "max-h-[5000px] mb-2" : "max-h-[240px]"
            }`}
        >
          {/* Main Summary Text */}
          <div className="whitespace-pre-line text-sm md:text-base app-text-main font-medium leading-relaxed mb-4">
            {description}
          </div>

          {/* Credits Box (Author, Director, Cast) */}
          <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border app-border text-xs md:text-sm space-y-2 mb-4">
            <div>
              <span className="font-extrabold text-rose-500 italic">{translate("Tác giả:")}</span>
              <span className="font-bold app-text-main">{event.author}</span>
            </div>
            <div>
              <span className="font-extrabold text-rose-500 italic">{translate("Đạo diễn:")}</span>
              <span className="font-bold app-text-main">{event.director}</span>
            </div>
            <div>
              <span className="font-extrabold text-rose-500 italic underline">{translate("Với sự tham gia của nghệ sĩ:")}</span>
              <span className="app-text-main font-medium leading-relaxed">
                {cast.join(", ")}
              </span>
            </div>
          </div>

          {/* Gallery Images Grid */}
          {event.galleryImages && event.galleryImages.length > 0 && (
            <div className="mt-4 pb-2">
              <h4 className="font-extrabold text-sm md:text-base app-text-main mb-3">
                {translate("Hình ảnh chương trình")}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {event.galleryImages.map((imgUrl, index) => (
                  <div
                    key={index}
                    className="rounded-2xl overflow-hidden shadow-md aspect-[4/3] bg-slate-900 border app-border hover:scale-105 transition-transform duration-300"
                  >
                    <img
                      src={imgUrl}
                      alt={`Gallery ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Gradient overlay when collapsed */}
        {!isExpanded && (
          <div className="absolute inset-x-0 bottom-14 h-24 bg-gradient-to-t from-[#ffffff] dark:from-[#18181b] via-[#ffffff]/85 dark:via-[#18181b]/85 to-transparent pointer-events-none z-10" />
        )}

        {/* Toggle button */}
        <div className="relative z-20 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex justify-center bg-white dark:bg-[#18181b]">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 px-6 py-2 rounded-full bg-zinc-200/90 dark:bg-zinc-800 hover:bg-brand-primary hover:text-white app-text-main font-extrabold text-xs md:text-sm transition-all duration-300 cursor-pointer shadow-md hover:scale-105 active:scale-95"
          >
            <span>{isExpanded ? translate("Thu gọn") : translate("Xem thêm")}</span>
            {isExpanded ? (
              <FiChevronUp className="w-4 h-4" />
            ) : (
              <FiChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDescription;
