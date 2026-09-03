import React, { useState, useEffect } from "react";
import { HeroCarousel } from "./components/HeroCarousel";
import { FeaturedStars } from "./components/FeaturedStars";
import { SpecialEvents } from "./components/SpecialEvents";
import { TrendingEvents } from "./components/TrendingEvents";
import { ResaleTicketsSection } from "./components/ResaleTicketsSection";
import { CategorySection } from "./components/CategorySection";
import { DestinationsSection } from "./components/DestinationsSection";
import { eventApi } from "@/services/eventApi";
import {
  SPECIAL_EVENTS,
  TRENDING_EVENTS,
  WEEKEND_EVENTS,
  RESALE_EVENTS,
  MUSIC_EVENTS,
  STAGE_EVENTS,
  WORKSHOP_EVENTS,
  type EventItem
} from "@/mock/eventData";
import { FiBookOpen, FiMusic, FiTv } from "react-icons/fi";

type HomeEvent = EventItem & {
  categoryId?: string;
  categoryName?: string;
};

const getCategoryEvents = (
  events: HomeEvent[],
  categoryName: string,
  categoryId: string,
  fallback: EventItem[]
) => {
  if (events.length === 0) return fallback;

  const matchedEvents = events.filter((event) => (
    event.categoryName === categoryName ||
    event.category === categoryName ||
    event.categoryId === categoryId
  ));

  return matchedEvents.length > 0 ? matchedEvents : fallback;
};

export const Home: React.FC = () => {
  const [allEvents, setAllEvents] = useState<HomeEvent[]>([]);

  useEffect(() => {
    eventApi.getAllEvents().then((data) => {
      if (data && data.length > 0) {
        setAllEvents(data as HomeEvent[]);
      }
    });
  }, []);

  const liveEvents = allEvents.length > 0 ? allEvents : [];
  const specialEvents = liveEvents.length > 0 ? liveEvents.slice(0, 5) : SPECIAL_EVENTS;
  const trendingEvents = liveEvents.length > 0
    ? liveEvents.slice(0, 4).map((event, index) => ({ ...event, rank: index + 1 }))
    : TRENDING_EVENTS;
  const weekendEvents = liveEvents.length > 0 ? liveEvents.slice(0, 4) : WEEKEND_EVENTS;
  const resaleEvents = liveEvents.filter((event) => event.isResale).slice(0, 3);

  const musicEvents = getCategoryEvents(liveEvents, "Nhạc sống", "cat-001", MUSIC_EVENTS);
  const stageEvents = getCategoryEvents(liveEvents, "Sân khấu & Nghệ thuật", "cat-003", STAGE_EVENTS);
  const workshopEvents = getCategoryEvents(liveEvents, "Hội thảo & Workshop", "cat-004", WORKSHOP_EVENTS);

  return (
    <div className="app-bg-page min-h-screen pb-20 transition-colors duration-300">
      <main className="mx-auto w-full max-w-[1200px] px-4 pt-6 md:px-8">
        <HeroCarousel />

        <FeaturedStars />

        <SpecialEvents events={specialEvents} />

        <TrendingEvents
          trendingEvents={trendingEvents}
          weekendEvents={weekendEvents}
          monthEvents={liveEvents.length > 4 ? liveEvents.slice(4, 8) : WEEKEND_EVENTS}
        />

        <ResaleTicketsSection events={resaleEvents.length > 0 ? resaleEvents : RESALE_EVENTS} />

        <CategorySection
          title="Nhạc sống"
          icon={<FiMusic className="w-5 h-5" />}
          seeMoreLink="/category/music"
          events={musicEvents}
        />

        <CategorySection
          title="Sân khấu & Nghệ thuật"
          icon={<FiTv className="w-5 h-5" />}
          seeMoreLink="/category/stage"
          events={stageEvents}
        />

        <CategorySection
          title="Hội thảo & Workshop"
          icon={<FiBookOpen className="w-5 h-5" />}
          seeMoreLink="/category/workshop"
          events={workshopEvents}
        />

        <DestinationsSection />
      </main>
    </div>
  );
};

export default Home;
