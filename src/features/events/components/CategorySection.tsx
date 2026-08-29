import React from "react";
import type { EventItem } from "@/mock/eventData";
import { EventCard } from "@/components/common/EventCard";
import { SectionHeader } from "@/components/common/SectionHeader";

interface CategorySectionProps {
  title: string;
  icon?: React.ReactNode;
  seeMoreLink?: string;
  events: EventItem[];
  className?: string;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  title,
  icon,
  seeMoreLink,
  events,
  className = "mb-10"
}) => {
  return (
    <div className={className}>
      <SectionHeader title={title} icon={icon} seeMoreLink={seeMoreLink} />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
};

export default CategorySection;
