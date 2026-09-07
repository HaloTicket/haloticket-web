import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MOCK_RESALE_EVENTS } from "@/mock/resaleData";
import { FiSearch, FiCalendar, FiTag } from "react-icons/fi";

export const ResaleList: React.FC = () => {
  useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  return (
    <div className="w-full transition-colors duration-300 pb-16">
      {/* Hero Promo Banner */}
      <div className="w-full bg-blue-600 dark:bg-blue-700 py-12 md:py-16 px-4 text-center relative overflow-hidden shadow-xl mb-8">
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />

        <div className="container mx-auto relative z-10 max-w-4xl">
          <span className="px-4 py-1.5 rounded-full bg-white/20 text-white font-black text-xs md:text-sm uppercase tracking-widest backdrop-blur-md mb-3 inline-block border border-white/30">
            {translate("Sàn Nhượng Vé Chính Thức")}</span>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-md mb-3">
            {translate("Resale Ticket • VÉ BÁN LẠI")}</h1>
          <p className="text-white/90 text-sm md:text-base max-w-xl mx-auto font-medium">
            {translate("Mua lại vé chính chủ an toàn, nhanh chóng và bảo mật 100% qua nền tảng HaloTicket")}</p>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="container mx-auto px-4 md:px-8">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 app-bg-card p-4 rounded-2xl border app-border shadow-md">
          <div className="relative w-full sm:w-96 md:w-[480px]">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 app-text-muted" />
            <input
              type="text"
              placeholder={translate("Nhập tên sự kiện bán lại...")}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border app-border text-sm app-text-main focus:outline-none focus:border-brand-primary"
            />
          </div>

          <div className="flex items-center gap-3 text-xs md:text-sm font-bold app-text-muted">
            <span>{translate("Tổng cộng:")}<strong className="app-text-brand">{MOCK_RESALE_EVENTS.length}</strong> {translate("sự kiện")}</span>
          </div>
        </div>

        {/* Grid of Resale Events */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {MOCK_RESALE_EVENTS.map((ev) => (
            <div
              key={ev.id}
              onClick={() => navigate(`/resale-ticket/${ev.id}`)}
              className="group app-bg-card rounded-2xl overflow-hidden border app-border hover:border-brand-primary transition-all duration-300 shadow-md hover:shadow-2xl cursor-pointer flex flex-col justify-between"
            >
              {/* Image Container */}
              <div className="relative aspect-[16/9] overflow-hidden bg-slate-950">
                <img
                  src={ev.posterImage}
                  alt={ev.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Status Badge */}
                {ev.isEnded ? (
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-[10px] font-black bg-amber-500 text-slate-950 shadow-md">
                    {translate("Đã diễn ra")}</span>
                ) : (
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-[10px] font-black gradient-btn text-white shadow-md flex items-center gap-1">
                    <FiTag className="w-3 h-3" />
                    {ev.availableListingsCount} {translate("vé bán lại")}</span>
                )}
              </div>

              {/* Card Details */}
              <div className="p-4 flex flex-col justify-between flex-1">
                <div>
                  <h3 className="font-extrabold text-sm md:text-base app-text-main line-clamp-2 leading-snug mb-3 group-hover:app-text-brand transition-colors">
                    {translate(ev.title)}
                  </h3>
                </div>

                {/* Enlarged Date Display */}
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2 text-sm md:text-base font-extrabold app-text-brand">
                  <FiCalendar className="w-4 h-4 shrink-0" />
                  <span>{ev.datesSummary}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResaleList;
