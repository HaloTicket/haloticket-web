import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiStar, FiCheck, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { FEATURED_STARS } from "@/mock/eventData";

export const FeaturedStars: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeft(scrollLeft > 10);
      setShowRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
  }, []);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  return (
    <div className="relative mb-12 py-7 px-4 md:px-6 rounded-3xl bg-[#121418] border border-slate-800/90 overflow-hidden shadow-2xl">
      {/* Background SVG Wave Pattern */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-90 z-0">
        <svg
          className="w-full h-full object-cover"
          viewBox="0 0 1400 300"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-100 150 C 250 -40, 600 340, 1000 40 C 1200 -20, 1350 240, 1500 90"
            stroke="url(#star-wave-grad-1)"
            strokeWidth="8"
            filter="url(#star-glow-heavy)"
          />
          <path
            d="M-100 70 C 350 300, 750 -10, 1150 270 C 1300 310, 1420 90, 1500 160"
            stroke="url(#star-wave-grad-2)"
            strokeWidth="5"
            filter="url(#star-glow-heavy)"
          />
          <path
            d="M-100 220 C 380 20, 780 300, 1180 50 C 1320 -10, 1420 180, 1500 230"
            stroke="url(#star-wave-grad-3)"
            strokeWidth="3.5"
            filter="url(#star-glow-light)"
          />
          <path
            d="M-100 150 C 250 -40, 600 340, 1000 40 C 1200 -20, 1350 240, 1500 90"
            stroke="#FFFFFF"
            strokeWidth="2"
            opacity="0.9"
          />
          <defs>
            <linearGradient id="star-wave-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.9" />
              <stop offset="35%" stopColor="#06B6D4" stopOpacity="1" />
              <stop offset="70%" stopColor="#10B981" stopOpacity="1" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="star-wave-grad-2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#06B6D4" stopOpacity="1" />
              <stop offset="100%" stopColor="#818CF8" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="star-wave-grad-3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#06B6D4" stopOpacity="1" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
            </linearGradient>
            <filter id="star-glow-heavy" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="10" result="blur1" />
              <feGaussianBlur stdDeviation="4" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="star-glow-light" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>
      </div>

      {/* Radial Glow Ambient Orbs */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Section Header */}
      <div className="relative z-10 flex items-center justify-between mb-5 px-1">
        <h2 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2 tracking-tight">
          <FiStar className="w-5 h-5 text-amber-400 fill-amber-400" />
          <span>Featured Stars</span>
        </h2>
        <Link
          to="/artists"
          className="text-xs md:text-sm font-semibold text-slate-300 hover:text-cyan-400 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>Xem thêm</span>
          <FiChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Ticketbox-Style Sleek Dark Glass Cards Carousel */}
      <div className="relative z-10 group">
        {/* Navigation Arrow Left (Only visible when scrolled right) */}
        {showLeft && (
          <button
            type="button"
            onClick={scrollLeft}
            className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 text-white border border-slate-700 shadow-xl backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-cyan-500 hover:scale-110 cursor-pointer"
            aria-label="Cuộn sang trái"
          >
            <FiChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex items-center gap-3.5 md:gap-4 overflow-x-auto pb-3 pt-1 no-scrollbar scroll-smooth"
        >
          {FEATURED_STARS.map((star) => (
            <Link
              key={star.id}
              to={`/artists/${star.id}`}
              className="group/card flex flex-col items-center justify-between shrink-0 w-36 md:w-40 h-48 md:h-52 bg-slate-900/80 border border-emerald-500/40 hover:border-cyan-400 rounded-2xl p-3.5 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/20 cursor-pointer backdrop-blur-md"
            >
              <div className="relative my-auto">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden p-0.5 border-2 border-emerald-400 group-hover/card:border-cyan-300 shadow-lg shadow-emerald-500/25 group-hover/card:shadow-cyan-400/40 transition-all duration-300 bg-slate-950">
                  <img
                    src={star.avatar}
                    alt={star.name}
                    className="w-full h-full object-cover rounded-full group-hover/card:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 w-full pt-1">
                <span className="text-xs md:text-sm font-extrabold text-white group-hover/card:text-cyan-300 transition-colors truncate text-center">
                  {star.name}
                </span>
                {star.verified && (
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] shrink-0 font-black shadow-xs">
                    <FiCheck className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Navigation Arrow Right (Only visible when more items exist to the right) */}
        {showRight && (
          <button
            type="button"
            onClick={scrollRight}
            className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 text-white border border-slate-700 shadow-xl backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-cyan-500 hover:scale-110 cursor-pointer"
            aria-label="Cuộn sang phải"
          >
            <FiChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FeaturedStars;
