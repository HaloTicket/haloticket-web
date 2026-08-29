import React from "react";
import { SPECIAL_EVENTS } from "@/mock/eventData";
import { EventCard } from "@/components/common/EventCard";
import { SectionHeader } from "@/components/common/SectionHeader";

export const SpecialEvents: React.FC = () => {
  return (
    <div className="mb-10">
      <SectionHeader title="Sự kiện đặc biệt" seeMoreLink="/events?filter=special" />

      {/* Tall Poster Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {SPECIAL_EVENTS.map((event) => (
          <EventCard key={event.id} event={event} variant="poster" />
        ))}
      </div>
    </div>
  );
};

export default SpecialEvents;
