import React from "react";
import { FiChevronRight } from "react-icons/fi";
import { Link } from "react-router-dom";
import { EventCard } from "@/components/common/EventCard";
import type { EventItem } from "@/mock/eventData";

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
  className = "mb-8 py-4"
}) => {
  return (
    <section className={className}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight app-text-main md:text-2xl">
          {icon && <span className="app-text-brand">{icon}</span>}
          <span>{title}</span>
        </h2>

        {seeMoreLink && (
          <Link
            to={seeMoreLink}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold transition-colors app-text-muted app-hover-text-brand"
          >
            <span>Xem thêm</span>
            <FiChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {events.slice(0, 4).map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
};

export default CategorySection;
