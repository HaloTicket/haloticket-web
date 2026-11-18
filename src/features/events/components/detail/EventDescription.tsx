import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { FiChevronDown, FiChevronUp, FiInfo } from "react-icons/fi";
import type { EventDetailData } from "@/types";

/** Props của phần mô tả: dữ liệu sự kiện. */
interface EventDescriptionProps {
  event: EventDetailData;
}

/** Phần giới thiệu sự kiện: hiển thị mô tả (HTML hoặc văn bản thuần được đổi xuống dòng thành đoạn văn), thu gọn theo chiều cao và có nút xem thêm hoặc thu gọn. */
export const EventDescription: React.FC<EventDescriptionProps> = ({ event }) => {
  const { t: translate } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const rawDescription = event.description || event.descriptionText || translate("Chưa có mô tả.");
  const formattedDescription = React.useMemo(() => {
    if (!rawDescription) return "";
    if (/<[a-z][\s\S]*>/i.test(rawDescription)) {
      return rawDescription.replace(/\n/g, "<br />");
    }
    return rawDescription
      .split(/\n{2,}/)
      .map((para) => `<p class="mb-3">${para.replace(/\n/g, "<br />")}</p>`)
      .join("");
  }, [rawDescription]);

  return (
    <div className="mb-6">
      <h2 className="text-xl md:text-2xl font-extrabold app-text-main flex items-center gap-2 mb-3 tracking-tight">
        <FiInfo className="w-5 h-5 app-text-brand" />
        <span>{translate("Giới thiệu")}</span>
      </h2>

      {/* Khung thẻ kính chính */}
      <div className="relative app-bg-card border app-border rounded-3xl p-5 md:p-6 shadow-lg transition-all duration-500 overflow-hidden">
        {/* Hộp nội dung thu gọn theo chiều cao tối đa */}
        <div
          className={`transition-all duration-500 overflow-hidden ${isExpanded ? "max-h-[8000px] mb-2" : "max-h-[260px]"
            }`}
        >
          {/* Nội dung mô tả chính (HTML) */}
          <div
            className="prose dark:prose-invert max-w-none text-sm md:text-base app-text-main font-medium leading-relaxed mb-4 break-words whitespace-pre-line [&_img]:rounded-2xl [&_img]:max-h-[550px] [&_img]:w-auto [&_img]:my-4 [&_video]:rounded-2xl [&_video]:max-w-full [&_p]:mb-3"
            dangerouslySetInnerHTML={{ __html: formattedDescription }}
          />
        </div>

        {/* Lớp gradient khi đang thu gọn */}
        {!isExpanded && (
          <div className="absolute inset-x-0 bottom-14 h-24 bg-gradient-to-t from-[#ffffff] dark:from-[#18181b] via-[#ffffff]/85 dark:via-[#18181b]/85 to-transparent pointer-events-none z-10" />
        )}

        {/* Nút chuyển trạng thái */}
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
