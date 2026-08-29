import React from "react";
import { HeroCarousel } from "./components/HeroCarousel";
import { FeaturedStars } from "./components/FeaturedStars";
import { SpecialEvents } from "./components/SpecialEvents";
import { TrendingEvents } from "./components/TrendingEvents";
import { ResaleTicketsSection } from "./components/ResaleTicketsSection";
import { CategorySection } from "./components/CategorySection";
import { PromoBanner } from "./components/PromoBanner";
import { DestinationsSection } from "./components/DestinationsSection";
import {
  MUSIC_EVENTS,
  STAGE_EVENTS,
  WORKSHOP_EVENTS,
  EXPERIENCE_EVENTS,
  SPORTS_EVENTS
} from "@/mock/eventData";
import { FiMusic, FiTv, FiBookOpen, FiCompass, FiActivity } from "react-icons/fi";

export const Home: React.FC = () => {
  return (
    <div className="bg-slate-50 dark:bg-[#121418] text-slate-900 dark:text-slate-100 min-h-screen pb-16 transition-colors duration-300">
      {/* Main Container */}
      <div className="container mx-auto px-4 md:px-8 pt-6">
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
          events={MUSIC_EVENTS}
        />

        {/* Category: Sân khấu & Nghệ thuật */}
        <CategorySection
          title="Sân khấu & Nghệ thuật"
          icon={<FiTv className="w-5 h-5" />}
          seeMoreLink="/category/stage"
          events={STAGE_EVENTS}
        />

        {/* Sponsored Promo Banner 2 */}
        <PromoBanner type="vib" />

        {/* Category: Hội thảo & Workshop */}
        <CategorySection
          title="Hội thảo & Workshop"
          icon={<FiBookOpen className="w-5 h-5" />}
          seeMoreLink="/category/workshop"
          events={WORKSHOP_EVENTS}
        />

        {/* Category: Tham quan & Trải nghiệm */}
        <CategorySection
          title="Tham quan & Trải nghiệm"
          icon={<FiCompass className="w-5 h-5" />}
          seeMoreLink="/category/experience"
          events={EXPERIENCE_EVENTS}
        />

        {/* Sponsored Promo Banner 3 */}
        <PromoBanner type="shopee" />

        {/* Category: Thể thao & Thể loại khác */}
        <CategorySection
          title="Thể thao & Thể loại khác"
          icon={<FiActivity className="w-5 h-5" />}
          seeMoreLink="/category/sports"
          events={SPORTS_EVENTS}
        />

        {/* Destinations Highlight Section */}
        <DestinationsSection />
      </div>
    </div>
  );
};

export default Home;
