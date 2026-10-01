import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiChevronLeft, FiChevronRight, FiPlay } from "react-icons/fi";
import { eventApi } from "@/services/eventApi";

interface HeroBannerItem {
  id: string;
  title: string;
  image?: string;
  link: string;
  badge?: string;
  subtitle?: string;
}

export const HeroCarousel: React.FC = () => {
  useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [banners, setBanners] = useState<HeroBannerItem[]>([]);

  // fetch live event data
  useEffect(() => {
    eventApi.getAllEvents().then((data) => {
      if (data && data.length > 0) {
        const liveBanners = data.map((ev) => ({
          id: ev.id,
          title: ev.title,
          image: ev.bannerUrl || ev.thumbnailUrl || ev.image,
          link: `/events/${ev.id}`,
          badge: ev.categoryName || "Sự kiện nổi bật"
        }));
        setBanners(liveBanners);
      }
    });
  }, []);

  useEffect(() => {
    if (!banners || banners.length === 0) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
    }, 4500);
    return () => clearInterval(timer);
  }, [banners]);

  const nextBanner = () => {
    if (!banners || banners.length === 0) return;
    setActiveIndex((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
  };

  const prevBanner = () => {
    if (!banners || banners.length === 0) return;
    setActiveIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  };

  if (!banners || banners.length === 0) return null;

  const currentBanner1 = banners[activeIndex % banners.length];
  const currentBanner2 = banners[(activeIndex + 1) % banners.length];

  return (
    <div className="relative mb-8 group">
      {/* Dual Side-by-Side Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {[currentBanner1, currentBanner2].map((banner, index) => (
          <div
            key={`${banner.id}-${index}`}
            className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl group/item"
          >
            <img
              src={banner.image}
              alt={banner.title}
              className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-700 brightness-90"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent flex flex-col justify-end p-5 md:p-6">
              {banner.badge && (
                <span className="self-start px-2.5 py-0.5 bg-blue-600 dark:bg-blue-500 text-white text-[10px] font-extrabold rounded-md mb-2 shadow-md">
                  {translate(banner.badge)}
                </span>
              )}
              <h3 className="text-lg md:text-xl font-extrabold text-white mb-3 line-clamp-2 leading-tight">
                {banner.title}
              </h3>

              <div className="flex items-center justify-between">
                <Link
                  to={banner.link}
                  className="px-4 py-1.5 gradient-btn text-white text-xs font-bold rounded-lg transition-all shadow-md active:scale-95"
                >
                  {translate("Xem chi tiết")}</Link>
                <div className="w-8 h-8 rounded-full bg-slate-950/60 flex items-center justify-center text-white backdrop-blur-md">
                  <FiPlay className="w-3.5 h-3.5 fill-current ml-0.5" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        type="button"
        onClick={prevBanner}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-slate-950/70 hover:bg-brand-600 text-white backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-lg"
      >
        <FiChevronLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={nextBanner}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-slate-950/70 hover:bg-brand-600 text-white backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-lg"
      >
        <FiChevronRight className="w-5 h-5" />
      </button>

      {/* Slide Dots Indicator */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {banners.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveIndex(idx)}
            className={`transition-all duration-300 rounded-full ${idx === activeIndex
                ? "w-6 h-2 bg-brand-500 shadow-md shadow-brand-500/50"
                : "w-2 h-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-500"
              }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;
