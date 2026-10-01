import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiMapPin } from "react-icons/fi";
import { eventApi } from "@/services/eventApi";

export const DestinationsSection: React.FC = () => {
  useTranslation();
  const [destinations, setDestinations] = useState<{name: string, count: number, image: string}[]>([]);

  useEffect(() => {
    eventApi.getAllEvents().then(data => {
      if (!data || data.length === 0) return;
      const cityMap: Record<string, number> = {};
      data.forEach(e => {
        if (e.city) {
          cityMap[e.city] = (cityMap[e.city] || 0) + 1;
        }
      });
      
      const cityImages: Record<string, string> = {
        "Hà Nội": "https://images.unsplash.com/photo-1599708153386-62bf3f034eb8?w=800&q=80",
        "TP. Hồ Chí Minh": "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80",
        "Đà Nẵng": "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800&q=80",
        "Hưng Yên": "https://images.unsplash.com/photo-1625621437142-650058b88ce8?w=800&q=80"
      };

      const computedDestinations = Object.entries(cityMap)
        .sort((a, b) => b[1] - a[1]) // sort by count
        .slice(0, 4) // take top 4
        .map(([name, count]) => ({
          name,
          count,
          image: cityImages[name] || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80"
        }));
        
      setDestinations(computedDestinations);
    });
  }, []);

  if (destinations.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <FiMapPin className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">{translate("Điểm đến thú vị")}</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {destinations.map((dest, i) => (
          <Link
            key={i}
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
                  {translate(dest.name)}
                </h4>
                <p className="text-[11px] text-slate-100 font-semibold">
                  {dest.count} {translate("sự kiện đang diễn ra")}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default DestinationsSection;
