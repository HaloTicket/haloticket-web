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
import { adminConfigApi } from "@/services/adminConfigApi";
import type { Banner, EventSection } from "@/types/adminConfig";
import { FiMusic } from "react-icons/fi";

interface HomeProps {
  previewBanners?: Banner[];
  previewSections?: EventSection[];
}

export const Home: React.FC<HomeProps> = ({ previewBanners, previewSections }) => {
  useTranslation();
  const [allEvents, setAllEvents] = useState<EventApiData[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [sections, setSections] = useState<EventSection[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    eventApi.getAllEvents().then((data) => {
      if (data && data.length > 0) setAllEvents(data);
    });

    adminConfigApi.getCategories().then(res => {
      const cats = (res as any)?.data || res;
      if (Array.isArray(cats)) setCategories(cats);
    }).catch(() => {});

    if (!previewBanners) {
      adminConfigApi.getBanners().then(res => {
        const data = Array.isArray(res) ? res : res?.data;
        if (data?.length) setBanners(data);
      }).catch(() => {});
    }

    if (!previewSections) {
      adminConfigApi.getEventSections().then(res => {
        const data = Array.isArray(res) ? res : res?.data;
        if (data?.length) setSections(data);
      }).catch(() => {});
    }
  }, [previewBanners, previewSections]);

  const displayBanners = previewBanners || banners;
  const displaySections = previewSections || sections;

  // Static fallback if no config from DB
  const isDefaultFallback = displaySections.length === 0;

  const renderSection = (section: EventSection, index: number) => {
    switch (section.type) {
      case "featured":
        return <FeaturedStars key={section.id} title={section.title} limit={section.limit} events={allEvents} />;
      case "ads":
        return (
          <PromoBanner 
            key={section.id} 
            title={section.title}
            subtitle={section.adsSubtitle}
            description={section.adsDescription}
            imageUrl={section.adsImageUrl}
            buttonText={section.adsButtonText}
            buttonUrl={section.adsButtonUrl}
          />
        );
      case "resale":
        return <ResaleTicketsSection key={section.id} title={section.title} limit={section.limit} />;
      case "locations":
        return <DestinationsSection key={section.id} title={section.title} limit={section.limit} events={allEvents} />;
      case "trending":
        return <TrendingEvents key={section.id} title={section.title} limit={section.limit} events={allEvents} />;
      case "upcoming":
      case "weekend_events":
      case "month_events":
        return <SpecialEvents key={section.id} title={section.title} limit={section.limit} events={allEvents} />;
      case "categories":
        const catName = section.title.split(":").pop()?.trim() || "";
        const matchedCat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
        const catEvents = matchedCat 
          ? allEvents.filter(e => e.categoryName === matchedCat.name || e.categoryId === matchedCat.id)
          : allEvents.filter(e => e.categoryName === "Nhạc sống" || e.categoryId === "cat-001");
        
        if (catEvents.length > 0) {
           return (
             <CategorySection
               key={section.id}
               title={section.title}
               icon={<FiMusic className="w-5 h-5" />}
               seeMoreLink={`/category/${matchedCat?.slug || "music"}`}
               events={catEvents.slice(0, section.limit || 4)}
             />
           );
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <div className={`app-bg-page ${previewSections ? "min-h-0" : "min-h-screen"} pb-16 transition-colors duration-300`}>
      <div className="w-full max-w-[1340px] mx-auto px-6 md:px-12 lg:px-16 pt-6 space-y-10">
        <HeroCarousel customBanners={displayBanners} />

        {isDefaultFallback ? (
          <>
            <FeaturedStars />
            <SpecialEvents />
            <TrendingEvents />
            <ResaleTicketsSection />
            <PromoBanner type="greensm" />
            
            {allEvents.filter((e) => e.categoryName === "Nhạc sống" || e.categoryId === "cat-001").length > 0 && (
              <CategorySection
                title={translate("Nhạc sống")}
                icon={<FiMusic className="w-5 h-5" />}
                seeMoreLink="/category/music"
                events={allEvents.filter((e) => e.categoryName === "Nhạc sống" || e.categoryId === "cat-001")}
              />
            )}
            
            <DestinationsSection />
          </>
        ) : (
          displaySections.map((section, idx) => renderSection(section, idx))
        )}
      </div>
    </div>
  );
};

export default Home;
