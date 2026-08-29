import React from "react";
import { Link } from "react-router-dom";
import { FiStar, FiCheck, FiChevronRight } from "react-icons/fi";
import { FEATURED_STARS } from "@/mock/eventData";

export const FeaturedStars: React.FC = () => {
  return (
    <div className="mb-10">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <FiStar className="w-5 h-5 text-amber-400 fill-amber-400" />
          <span>Featured Stars</span>
        </h2>
        <Link
          to="/artists"
          className="text-xs md:text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 font-medium flex items-center gap-1 transition-colors"
        >
          <span>Xem thêm</span>
          <FiChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Artists Horizontal Scroll */}
      <div className="flex items-center gap-4 md:gap-6 overflow-x-auto pb-4 pt-2 no-scrollbar">
        {FEATURED_STARS.map((star) => (
          <Link
            key={star.id}
            to={`/artists/${star.id}`}
            className="flex flex-col items-center group shrink-0 w-24 md:w-28 text-center"
          >
            {/* Avatar with Brand Indigo/Cyan Neon Glow Border */}
            <div className="relative mb-2.5">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden p-0.5 neon-glow-avatar bg-slate-900">
                <img
                  src={star.avatar}
                  alt={star.name}
                  className="w-full h-full object-cover rounded-xl"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Name with Verified Checkmark */}
            <div className="flex items-center justify-center gap-1 w-full">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                {star.name}
              </span>
              {star.verified && (
                <span className="w-3.5 h-3.5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[9px] shrink-0 font-bold shadow-sm">
                  <FiCheck className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default FeaturedStars;
