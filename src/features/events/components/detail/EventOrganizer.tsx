import React from "react";
import { FiUsers } from "react-icons/fi";
import type { EventDetailData } from "@/mock/eventData";

interface EventOrganizerProps {
  organizer: EventDetailData["organizer"];
}

export const EventOrganizer: React.FC<EventOrganizerProps> = ({ organizer }) => {
  return (
    <div className="mb-4">
      <h2 className="text-xl md:text-2xl font-extrabold app-text-main flex items-center gap-2 mb-2 tracking-tight">
        <FiUsers className="w-5 h-5 app-text-brand" />
        <span>Ban tổ chức</span>
      </h2>

      <div className="app-bg-card border app-border rounded-3xl p-5 md:p-6 shadow-lg flex items-center gap-4 h-[150px]">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border app-border shrink-0 bg-slate-900 shadow-md">
          <img
            src={organizer.avatar}
            alt={organizer.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div>
          <h3 className="font-extrabold text-base md:text-lg app-text-main">
            {organizer.name}
          </h3>
          {organizer.description && (
            <p className="text-xs md:text-sm app-text-muted mt-1">
              {organizer.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventOrganizer;
