import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import React from "react";
import { FiUsers } from "react-icons/fi";
import type { EventDetailData } from "@/types";

interface EventOrganizerProps {
  organizer?: EventDetailData["organizer"] | null;
}

export const EventOrganizer: React.FC<EventOrganizerProps> = ({ organizer }) => {
  useTranslation();

  const name = organizer?.name || translate("Ban tổ chức HaloTicket");
  const avatar = organizer?.avatar || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=160&q=80";
  const description = organizer?.description || translate("Ban tổ chức sự kiện uy tín hàng đầu trên hệ thống HaloTicket.");

  return (
    <div className="mb-4">
      <h2 className="text-xl md:text-2xl font-extrabold app-text-main flex items-center gap-2 mb-2 tracking-tight">
        <FiUsers className="w-5 h-5 app-text-brand" />
        <span>{translate("Ban tổ chức")}</span>
      </h2>

      <div className="app-bg-card border app-border rounded-3xl p-5 md:p-6 shadow-lg flex items-center gap-4 min-h-[120px]">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border app-border shrink-0 bg-slate-900 shadow-md">
          <img
            src={avatar}
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>

        <div>
          <h3 className="font-extrabold text-base md:text-lg app-text-main">
            {name}
          </h3>
          <p className="text-xs md:text-sm app-text-muted mt-1">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EventOrganizer;
