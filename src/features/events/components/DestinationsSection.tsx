import React from "react";
import { Link } from "react-router-dom";
import { DESTINATIONS } from "@/mock/eventData";

export const DestinationsSection: React.FC = () => {
  return (
    <section className="pt-4">
      <div className="mb-5">
        <h2 className="text-xl font-extrabold tracking-tight app-text-main md:text-2xl">
          Điểm đến thú vị
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DESTINATIONS.map((dest) => (
          <Link
            key={dest.id}
            to={`/events?location=${encodeURIComponent(dest.name)}`}
            className="group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-xl bg-slate-900 shadow-sm"
          >
            <img
              src={dest.image}
              alt={dest.name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <h3 className="absolute bottom-6 left-6 text-2xl font-extrabold text-white">
              {dest.name}
            </h3>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default DestinationsSection;
