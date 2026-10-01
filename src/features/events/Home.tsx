import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import React, { useState, useEffect } from "react";
import { HeroCarousel } from "./components/HeroCarousel";
import { FeaturedStars } from "./components/FeaturedStars";
import { SpecialEvents } from "./components/SpecialEvents";
import { TrendingEvents } from "./components/TrendingEvents";
import { ResaleTicketsSection } from "./components/ResaleTicketsSection";
import { CategorySection } from "./components/CategorySection";
import { PromoBanner } from "./components/PromoBanner";
import { DestinationsSection } from "./components/DestinationsSection";
import { eventApi, type EventApiData } from "@/services/eventApi";
import { FiMusic, FiTv, FiBookOpen, FiCompass, FiActivity } from "react-icons/fi";

export const Home: React.FC = () => {
  useTranslation();
  const [allEvents, setAllEvents] = useState<EventApiData[]>([]);

  useEffect(() => {
    eventApi.getAllEvents().then((data) => {
      if (data && data.length > 0) {
        setAllEvents(data);
      }
    });
  }, []);

  const musicEvents = allEvents.filter((e) => e.categoryName === "Nhạc sống" || e.categoryId === "cat-001");
  const stageEvents = allEvents.filter((e) => e.categoryName === "Sân khấu & Nghệ thuật" || e.categoryId === "cat-003");
  const workshopEvents = allEvents.filter((e) => e.categoryName === "Hội thảo & Workshop" || e.categoryId === "cat-004");
  const experienceEvents = allEvents.filter((e) => e.categoryName === "Tham quan & Trải nghiệm" || e.categoryId === "cat-005");
  const sportsEvents = allEvents.filter((e) => e.categoryName === "Thể Thao" || e.categoryId === "cat-002");

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
        {musicEvents.length > 0 && (
          <CategorySection
            title={translate("Nhạc sống")}
            icon={<FiMusic className="w-5 h-5" />}
            seeMoreLink="/category/music"
            events={musicEvents}
          />
        )}

        {/* Category: Sân khấu & Nghệ thuật */}
        {stageEvents.length > 0 && (
          <CategorySection
            title={translate("Sân khấu & Nghệ thuật")}
            icon={<FiTv className="w-5 h-5" />}
            seeMoreLink="/category/stage"
            events={stageEvents}
          />
        )}

        {/* Sponsored Promo Banner 2 */}
        <PromoBanner type="vib" />

        {/* Category: Hội thảo & Workshop */}
        {workshopEvents.length > 0 && (
          <CategorySection
            title={translate("Hội thảo & Workshop")}
            icon={<FiBookOpen className="w-5 h-5" />}
            seeMoreLink="/category/workshop"
            events={workshopEvents}
          />
        )}

        {/* Category: Tham quan & Trải nghiệm */}
        {experienceEvents.length > 0 && (
          <CategorySection
            title={translate("Tham quan & Trải nghiệm")}
            icon={<FiCompass className="w-5 h-5" />}
            seeMoreLink="/category/experience"
            events={experienceEvents}
          />
        )}

        {/* Sponsored Promo Banner 3 */}
        <PromoBanner type="shopee" />

        {/* Category: Thể thao & Thể loại khác */}
        {sportsEvents.length > 0 && (
          <CategorySection
            title={translate("Thể thao & Thể loại khác")}
            icon={<FiActivity className="w-5 h-5" />}
            seeMoreLink="/category/sports"
            events={sportsEvents}
          />
        )}

        {/* Destinations Highlight Section */}
        <DestinationsSection />
      </div>
    </div>
  );
};

export default Home;
