import React from "react";
import { Link } from "react-router-dom";
import { FiMapPin } from "react-icons/fi";
import { DESTINATIONS } from "@/mock/eventData";

export const DestinationsSection: React.FC = () => {
  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <FiMapPin className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">Điểm đến thú vị</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {DESTINATIONS.map((dest) => (
          <Link
            key={dest.id}
            to={`/events?location=${encodeURIComponent(dest.name)}`}
            className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg card-hover-zoom cursor-pointer"
          >
            <img
              src={dest.image}
              alt={dest.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-90"
              loading="lazy"
            />

            {/* Brand Palette Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent flex flex-col justify-end p-4">
              <div className="bg-gradient-to-r from-brand-600/90 to-accent-cyan/90 backdrop-blur-md p-3 rounded-xl border border-white/20 shadow-lg">
                <h4 className="text-base md:text-xl font-black text-white group-hover:text-accent-cyan transition-colors">
                  {dest.name}
                </h4>
                <p className="text-[11px] text-slate-100 font-semibold">
                  {dest.count} sự kiện đang diễn ra
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default DestinationsSection;
