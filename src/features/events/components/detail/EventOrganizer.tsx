import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import React from "react";
import { FiUsers } from "react-icons/fi";
import type { EventDetailData } from "@/mock/eventData";

interface EventOrganizerProps {
  organizer?: EventDetailData["organizer"] | null;
  event?: EventDetailData | null;
}

export const EventOrganizer: React.FC<EventOrganizerProps> = ({ organizer, event }) => {
  useTranslation();

  const name =
    organizer?.name ||
    event?.author ||
    translate("Ban Tổ Chức Sự Kiện");

  const avatar =
    organizer?.avatar ||
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=160&q=80";

  const description =
    organizer?.description ||
    translate("Đơn vị tổ chức sự kiện uy tín, chuyên nghiệp với nhiều chương trình biểu diễn nghệ thuật và giải trí chất lượng cao.");

  return (
    <div id="organizer-section" className="mb-8 scroll-mt-24">
      <h2 className="text-xl md:text-2xl font-extrabold app-text-main flex items-center gap-2 mb-3 tracking-tight">
        <FiUsers className="w-5 h-5 app-text-brand" />
        <span>{translate("Ban tổ chức")}</span>
      </h2>

      <div className="app-bg-card border app-border rounded-3xl p-5 md:p-6 shadow-lg flex items-center gap-4.5">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border app-border shrink-0 bg-slate-900 shadow-md">
          <img
            src={avatar}
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="space-y-1 min-w-0">
          <h3 className="font-extrabold text-base md:text-lg app-text-main truncate">
            {name}
          </h3>
          <p className="text-xs md:text-sm app-text-muted leading-relaxed line-clamp-3">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EventOrganizer;
