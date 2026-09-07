import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import React, { useState } from "react";
import {
  FiCalendar,
  FiList,
  FiChevronDown,
  FiChevronUp,
  FiChevronLeft,
  FiChevronRight,
  FiCheckCircle,
  FiClock
} from "react-icons/fi";
import type { EventDetailData, Showtime, TicketTier } from "@/mock/eventData";

interface EventScheduleProps {
  event: EventDetailData;
  onSelectTicket?: (showtime: Showtime, ticket: TicketTier) => void;
}

export const EventSchedule: React.FC<EventScheduleProps> = ({
  event,
  onSelectTicket
}) => {
  useTranslation();
  const showtimes = event.showtimes ?? [];
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [expandedShowtimeId, setExpandedShowtimeId] = useState<string>(
    showtimes[0]?.id || "st-1"
  );
  const [selectedCalendarMonth, setSelectedCalendarMonth] = useState<number>(9);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(25);

  const activeShowtimeDays = [25, 26, 27];

  const handleToggleShowtime = (id: string) => {
    setExpandedShowtimeId((prev) => (prev === id ? "" : id));
  };

  const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);
  const emptyDaysOffset = [null];

  const activeDayShowtimes = showtimes.filter(
    (st) => st.dayNumber === selectedCalendarDay && st.monthNumber === selectedCalendarMonth
  );

  return (
    <div id="schedule-section" className="mb-10 scroll-mt-24">
      {/* Section Header with View Toggle Buttons */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-extrabold app-text-main flex items-center gap-2 tracking-tight">
          <FiCalendar className="w-5 h-5 app-text-brand" />
          <span>{translate("Lịch diễn")}</span>
        </h2>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-200/80 dark:bg-slate-800/80 p-1 rounded-xl border app-border">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg transition-all duration-300 cursor-pointer ${viewMode === "list"
              ? "gradient-btn text-white shadow-md scale-105"
              : "app-text-muted hover:app-text-main"
              }`}
            title={translate("Xem danh sách")}
          >
            <FiList className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`p-2 rounded-lg transition-all duration-300 cursor-pointer ${viewMode === "calendar"
              ? "gradient-btn text-white shadow-md scale-105"
              : "app-text-muted hover:app-text-main"
              }`}
            title={translate("Xem lịch tháng")}
          >
            <FiCalendar className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="app-bg-card border app-border rounded-3xl p-4 md:p-6 shadow-lg">
        {/* List view */}
        {viewMode === "list" && (
          <div className="space-y-4">
            {showtimes.map((st) => {
              const isExpanded = expandedShowtimeId === st.id;
              return (
                <div
                  key={st.id}
                  className="rounded-2xl border app-border overflow-hidden transition-all duration-300 bg-slate-50/50 dark:bg-zinc-900/50"
                >
                  {/* Showtime Accordion Header */}
                  <div
                    onClick={() => handleToggleShowtime(st.id)}
                    className="p-4 md:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <FiChevronUp className="w-5 h-5 app-text-brand shrink-0" />
                      ) : (
                        <FiChevronDown className="w-5 h-5 app-text-muted shrink-0" />
                      )}
                      <div className="font-extrabold text-sm md:text-base app-text-main flex items-center gap-2">
                        <FiClock className="w-4 h-4 app-text-brand" />
                        <span>{st.fullDateTime}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleShowtime(st.id);
                      }}
                      className="px-4 py-2 gradient-btn text-white font-extrabold text-xs md:text-sm rounded-xl shadow-md cursor-pointer shrink-0"
                    >
                      {translate("Mua vé ngay")}</button>
                  </div>

                  {/* Expanded Tickets Area */}
                  {isExpanded && (
                    <div className="p-4 md:p-5 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-100/60 dark:bg-zinc-900/80 space-y-3">
                      <h4 className="font-extrabold text-xs md:text-sm app-text-muted uppercase tracking-wider mb-3">
                        {translate("Thông tin vé")}</h4>

                      <div className="grid grid-cols-1 gap-2.5">
                        {st.tickets.map((t) => (
                          <div
                            key={t.id}
                            className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${t.available
                              ? "app-bg-card border-slate-200/80 dark:border-zinc-700/80 hover:border-brand-primary cursor-pointer shadow-xs"
                              : "bg-slate-200/50 dark:bg-zinc-800/40 border-slate-200/40 dark:border-zinc-800/40 opacity-70"
                              }`}
                            onClick={() => t.available && onSelectTicket && onSelectTicket(st, t)}
                          >
                            <span className="font-black text-sm md:text-base app-text-main">
                              {translate(t.name)}
                            </span>

                            <div className="flex items-center gap-3">
                              <span className="font-black text-sm md:text-base app-text-brand">
                                {t.price}
                              </span>

                              {!t.available && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-500 border border-amber-500/30">
                                  {t.statusText || translate("Vé chưa mở bán")}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Calendar view */}
        {viewMode === "calendar" && (
          <div>
            {/* Month Selector Bar */}
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-3 mb-4 overflow-x-auto no-scrollbar">
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 app-text-muted"
              >
                <FiChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-6 text-xs md:text-sm font-extrabold whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setSelectedCalendarMonth(9)}
                  className={`py-1 border-b-2 transition-all ${selectedCalendarMonth === 9
                    ? "border-brand-primary app-text-brand"
                    : "border-transparent app-text-muted"
                    }`}
                >
                  {translate("Tháng 9, 2026 (6 suất diễn)")}</button>

                <button
                  type="button"
                  onClick={() => setSelectedCalendarMonth(10)}
                  className={`py-1 border-b-2 transition-all ${selectedCalendarMonth === 10
                    ? "border-brand-primary app-text-brand"
                    : "border-transparent app-text-muted"
                    }`}
                >
                  {translate("Th 10 (0 suất diễn)")}</button>

                <button
                  type="button"
                  onClick={() => setSelectedCalendarMonth(11)}
                  className={`py-1 border-b-2 transition-all ${selectedCalendarMonth === 11
                    ? "border-brand-primary app-text-brand"
                    : "border-transparent app-text-muted"
                    }`}
                >
                  {translate("Th 11 (0 suất diễn)")}</button>
              </div>

              <button
                type="button"
                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 app-text-muted"
              >
                <FiChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* 7-Day Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold app-text-muted mb-3 py-2 border-b border-slate-200/40 dark:border-slate-800/40">
              <div>{translate("Thứ 2")}</div>
              <div>{translate("Thứ 3")}</div>
              <div>{translate("Thứ 4")}</div>
              <div>{translate("Thứ 5")}</div>
              <div>{translate("Thứ 6")}</div>
              <div>{translate("Thứ 7")}</div>
              <div>{translate("Chủ nhật")}</div>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-2 mb-6">
              {emptyDaysOffset.map((_, i) => (
                <div key={`empty-${i}`} className="h-12 md:h-14" />
              ))}

              {daysInMonth.map((day) => {
                const hasShowtime = activeShowtimeDays.includes(day);
                const isSelected = selectedCalendarDay === day;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => hasShowtime && setSelectedCalendarDay(day)}
                    className={`h-12 md:h-14 rounded-xl flex flex-col items-center justify-center font-bold text-sm md:text-base relative transition-all ${hasShowtime
                      ? isSelected
                        ? "gradient-btn text-white shadow-lg scale-105"
                        : "app-bg-card border-2 border-brand-primary app-text-brand hover:scale-105 cursor-pointer"
                      : "app-text-muted opacity-40 cursor-not-allowed"
                      }`}
                  >
                    <span>{day < 10 ? `0${day}` : day}</span>
                    {hasShowtime && (
                      <span
                        className={`w-4 h-1 rounded-full mt-1 ${isSelected ? "bg-white" : "bg-brand-primary"
                          }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Day Showtimes Info Below Calendar */}
            {activeDayShowtimes.length > 0 ? (
              <div className="p-4 md:p-5 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border app-border space-y-3">
                <h4 className="font-extrabold text-sm md:text-base app-text-main flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4 app-text-brand" />
                  <span>{translate("Suất diễn ngày")}{" "}{selectedCalendarDay} {translate("Tháng 9, 2026")}</span>
                </h4>

                {activeDayShowtimes.map((st) => (
                  <div
                    key={st.id}
                    className="p-3.5 rounded-xl app-bg-card border app-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-extrabold text-sm app-text-main">
                        {st.timeStr}
                      </div>
                      <div className="text-xs app-text-muted mt-0.5">
                        {st.tickets.length} {translate("loại vé khả dụng")}</div>
                    </div>

                    <button
                      type="button"
                      className="px-4 py-2 gradient-btn text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      {translate("Mua vé ngay")}</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-zinc-800/50 text-center text-xs md:text-sm app-text-muted">
                {translate("Không có suất diễn nào vào ngày đã chọn")}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventSchedule;
