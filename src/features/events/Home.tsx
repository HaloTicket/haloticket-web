import React, { useState, useEffect } from "react";
import { HeroCarousel } from "./components/HeroCarousel";
import { FeaturedStars } from "./components/FeaturedStars";
import { SpecialEvents } from "./components/SpecialEvents";
import { TrendingEvents } from "./components/TrendingEvents";
import { ResaleTicketsSection } from "./components/ResaleTicketsSection";
import { CategorySection } from "./components/CategorySection";
import { PromoBanner } from "./components/PromoBanner";
import { DestinationsSection } from "./components/DestinationsSection";
import { eventApi } from "@/services/eventApi";
import {
  MUSIC_EVENTS,
  STAGE_EVENTS,
  WORKSHOP_EVENTS,
  EXPERIENCE_EVENTS,
  SPORTS_EVENTS
} from "@/mock/eventData";
import { FiMusic, FiTv, FiBookOpen, FiCompass, FiActivity } from "react-icons/fi";

export const Home: React.FC = () => {
  const [allEvents, setAllEvents] = useState<any[]>([]);

  useEffect(() => {
    eventApi.getAllEvents().then((data) => {
      if (data && data.length > 0) {
        setAllEvents(data);
      }
    });
  }, []);

  const musicEvents = allEvents.length > 0
    ? allEvents.filter((e) => e.categoryName === "Nhạc sống" || e.categoryId === "cat-001")
    : MUSIC_EVENTS;

  const stageEvents = allEvents.length > 0
    ? allEvents.filter((e) => e.categoryName === "Sân khấu & Nghệ thuật" || e.categoryId === "cat-003")
    : STAGE_EVENTS;

  const workshopEvents = allEvents.length > 0
    ? allEvents.filter((e) => e.categoryName === "Hội thảo & Workshop" || e.categoryId === "cat-004")
    : WORKSHOP_EVENTS;

  const experienceEvents = allEvents.length > 0
    ? allEvents.filter((e) => e.categoryName === "Tham quan & Trải nghiệm" || e.categoryId === "cat-005")
    : EXPERIENCE_EVENTS;

  const sportsEvents = allEvents.length > 0
    ? allEvents.filter((e) => e.categoryName === "Thể Thao" || e.categoryId === "cat-002")
    : SPORTS_EVENTS;

  return (
    <div className="app-bg-page min-h-screen pb-16 transition-colors duration-300">
      {/* Main Container with generous horizontal side padding */}
      <div className="w-full max-w-[1340px] mx-auto px-6 md:px-12 lg:px-16 pt-6">
        {/* Hero Carousel Switcher */}
        <HeroCarousel />

        {/* Featured Stars Carousel */}
        <FeaturedStars />

        {/* Special Events (Tall Posters) */}
        <SpecialEvents />

        {/* Trending Events (Ranked 1..4 + Weekend/Month filter) */}
        <TrendingEvents />

        {/* Resale Tickets Mechanism Highlight */}
        <ResaleTicketsSection />

        {/* Sponsored Promo Banner 1 */}
        <PromoBanner type="greensm" />

        {/* Category: Nhạc sống */}
        <CategorySection
          title="Nhạc sống"
          icon={<FiMusic className="w-5 h-5" />}
          seeMoreLink="/category/music"
          events={musicEvents.length > 0 ? musicEvents : MUSIC_EVENTS}
        />

        {/* Category: Sân khấu & Nghệ thuật */}
        <CategorySection
          title="Sân khấu & Nghệ thuật"
          icon={<FiTv className="w-5 h-5" />}
          seeMoreLink="/category/stage"
          events={stageEvents.length > 0 ? stageEvents : STAGE_EVENTS}
        />

        {/* Sponsored Promo Banner 2 */}
        <PromoBanner type="vib" />

        {/* Category: Hội thảo & Workshop */}
        <CategorySection
          title="Hội thảo & Workshop"
          icon={<FiBookOpen className="w-5 h-5" />}
          seeMoreLink="/category/workshop"
          events={workshopEvents.length > 0 ? workshopEvents : WORKSHOP_EVENTS}
        />

        {/* Category: Tham quan & Trải nghiệm */}
        <CategorySection
          title="Tham quan & Trải nghiệm"
          icon={<FiCompass className="w-5 h-5" />}
          seeMoreLink="/category/experience"
          events={experienceEvents.length > 0 ? experienceEvents : EXPERIENCE_EVENTS}
        />

        {/* Sponsored Promo Banner 3 */}
        <PromoBanner type="shopee" />

        {/* Category: Thể thao & Thể loại khác */}
        <CategorySection
          title="Thể thao & Thể loại khác"
          icon={<FiActivity className="w-5 h-5" />}
          seeMoreLink="/category/sports"
          events={sportsEvents.length > 0 ? sportsEvents : SPORTS_EVENTS}
        />

        {/* Destinations Highlight Section */}
        <DestinationsSection />
      </div>
    </div>
  );
};

export default Home;
