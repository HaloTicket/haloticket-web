import React from "react";
import { Link } from "react-router-dom";
import { FiRefreshCw, FiCheckCircle } from "react-icons/fi";
import { RESALE_EVENTS } from "@/mock/eventData";
import { EventCard } from "@/components/common/EventCard";

export const ResaleTicketsSection: React.FC = () => {
  return (
    <div className="mb-12 bg-gradient-to-r from-brand-500/10 via-slate-100 to-indigo-500/10 dark:from-brand-900/40 dark:via-[#18181b] dark:to-indigo-950/40 border border-brand-500/30 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl">
      {/* Background Glow */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Title & Banner Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-extrabold text-xs rounded-md mb-2 shadow-md shadow-rose-500/20">
            <FiRefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "8s" }} />
            <span>RESALE TICKET - VÉ BÁN LẠI</span>
          </div>
          <h3 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
            <span>Sàn Nhượng Vé Chính Thức</span>
            <FiCheckCircle className="w-5 h-5 text-accent-cyan" />
          </h3>
          <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-300 mt-1">
            An tâm mua bán vé sang nhượng với cơ chế <span className="text-brand-600 dark:text-brand-400 font-bold">Hủy cũ - Cấp mới</span> độc quyền tại HaloTicket.
          </p>
        </div>

        <Link
          to="/resale"
          className="px-5 py-2.5 gradient-btn text-white font-extrabold text-xs md:text-sm rounded-xl transition-all shadow-lg shadow-brand-500/25 shrink-0 cursor-pointer"
        >
          Khám phá vé bán lại
        </Link>
      </div>

      {/* Resale Event Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {RESALE_EVENTS.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
};

export default ResaleTicketsSection;
