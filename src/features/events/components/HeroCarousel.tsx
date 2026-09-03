import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { HERO_BANNERS, type EventItem, type HeroBannerItem } from "@/mock/eventData";

interface HeroCarouselProps {
  events?: EventItem[];
}

type HeroSlide = Pick<HeroBannerItem, "id" | "title" | "image" | "link" | "badge">;

const toHeroSlides = (events?: EventItem[]): HeroSlide[] => {
  if (!events || events.length === 0) {
    return HERO_BANNERS;
  }

  return events.map((event) => ({
    id: event.id,
    title: event.title,
    image: event.image,
    link: `/events/${event.id}`,
    badge: event.category
  }));
};

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ events }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const banners = useMemo(() => toHeroSlides(events), [events]);

  useEffect(() => {
    if (banners.length === 0) return;

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
    }, 4500);

    return () => window.clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const normalizedIndex = activeIndex % banners.length;
  const currentBanner = banners[normalizedIndex];

  const nextBanner = () => {
    setActiveIndex((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
  };

  const prevBanner = () => {
    setActiveIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  };

  return (
    <section className="mb-8 group">
      <div className="relative aspect-[21/9] w-full overflow-hidden rounded-2xl bg-slate-100 shadow-sm md:aspect-[21/7] dark:bg-slate-900">
        <Link to={currentBanner.link} aria-label={currentBanner.title}>
          <img
            src={currentBanner.image}
            alt={currentBanner.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.015]"
          />
        </Link>

        <button
          type="button"
          onClick={prevBanner}
          className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-slate-800 opacity-0 shadow-md transition-all hover:bg-white group-hover:opacity-100 dark:bg-slate-950/75 dark:text-white dark:hover:bg-slate-950"
          aria-label="Banner trước"
        >
          <FiChevronLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={nextBanner}
          className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-slate-800 opacity-0 shadow-md transition-all hover:bg-white group-hover:opacity-100 dark:bg-slate-950/75 dark:text-white dark:hover:bg-slate-950"
          aria-label="Banner tiếp theo"
        >
          <FiChevronRight className="h-5 w-5" />
        </button>

        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {banners.map((banner, idx) => (
            <button
              key={banner.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`h-2.5 rounded-full transition-all ${idx === normalizedIndex ? "w-6 bg-white" : "w-2.5 bg-white/55 hover:bg-white/80"}`}
              aria-label={`Chọn banner ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroCarousel;
