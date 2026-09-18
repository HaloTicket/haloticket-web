import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import React, { useState, useMemo } from "react";
import {
  FiCalendar,
  FiList,
  FiChevronDown,
  FiChevronUp,
  FiChevronLeft,
  FiChevronRight,
  FiCheckCircle,
  FiClock,
} from "react-icons/fi";
import type { EventDetailData, Showtime, TicketTier } from "@/types";

interface EventScheduleProps {
  event: EventDetailData;
  onSelectTicket?: (showtime: Showtime, ticket: TicketTier) => void;
}

export const EventSchedule: React.FC<EventScheduleProps> = ({
  event,
  onSelectTicket,
}) => {
  useTranslation();

  // ensure showtimes list calculated dynamically from event startTime & endTime
  const showtimes: Showtime[] = useMemo(() => {
    if (event.showtimes && event.showtimes.length > 0) {
      return event.showtimes;
    }

    const start = event.startTime ? new Date(event.startTime) : new Date(2026, 9, 17, 19, 0);
    const end = event.endTime
      ? new Date(event.endTime)
      : event.startTime
        ? new Date(event.startTime)
        : new Date(2026, 9, 18, 23, 59);

    const startHours = String(start.getHours()).padStart(2, "0");
    const startMins = String(start.getMinutes()).padStart(2, "0");
    const endHours = String(end.getHours()).padStart(2, "0");
    const endMins = String(end.getMinutes()).padStart(2, "0");
    const timeRangeStr = `${startHours}:${startMins} - ${endHours}:${endMins}`;

    const showtimeList: Showtime[] = [];
    const curr = new Date(start);
    curr.setHours(0, 0, 0, 0);

    const last = new Date(end);
    last.setHours(0, 0, 0, 0);

    let idx = 1;
    while (curr <= last) {
      const dayNum = curr.getDate();
      const monthNum = curr.getMonth() + 1;
      const yearNum = curr.getFullYear();
      const dateStr = `${dayNum} Tháng ${monthNum < 10 ? "0" + monthNum : monthNum}, ${yearNum}`;
      const fullDateTime = `${timeRangeStr}, ${dateStr}`;

      const eventAny = event as any;
      const rawTickets = eventAny.tickets || eventAny.ticketTypes;
      const tickets: TicketTier[] =
        Array.isArray(rawTickets) && rawTickets.length > 0
          ? rawTickets.map((t: any, tIdx: number) => ({
            id: `t_${idx}_${tIdx}`,
            name: t.name || "Vé Thường",
            price: typeof t.price === "number" ? `${t.price.toLocaleString("vi-VN")} đ` : String(t.price || "0 đ"),
            priceValue: typeof t.price === "number" ? t.price : 1000000,
            available: t.totalQuantity ? t.totalQuantity > 0 : t.available !== false,
          }))
          : [
            { id: `t_${idx}_vip`, name: "VIP", price: "2.000.000 đ", priceValue: 2000000, available: true },
            { id: `t_${idx}_std`, name: "TIÊU CHUẨN", price: "1.000.000 đ", priceValue: 1000000, available: true },
          ];

      showtimeList.push({
        id: `st_${idx}_${curr.getTime()}`,
        dateStr,
        timeStr: timeRangeStr,
        fullDateTime,
        dayNumber: dayNum,
        monthNumber: monthNum,
        yearNumber: yearNum,
        isOpen: true,
        tickets,
      });

      idx++;
      curr.setDate(curr.getDate() + 1);
    }

    return showtimeList.length > 0
      ? showtimeList.reverse()
      : [
        {
          id: "st_default_1",
          dateStr: "17 Tháng 10, 2026",
          timeStr: "19:00 - 23:59",
          fullDateTime: "19:00 - 23:59, 17 Tháng 10, 2026",
          dayNumber: 17,
          monthNumber: 10,
          yearNumber: 2026,
          isOpen: true,
          tickets: [
            { id: "t_vip_1", name: "VIP", price: "2.000.000 đ", priceValue: 2000000, available: true },
            { id: "t_std_1", name: "TIÊU CHUẨN", price: "1.000.000 đ", priceValue: 1000000, available: true },
          ],
        },
      ];
  }, [event]);

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [expandedShowtimeId, setExpandedShowtimeId] = useState<string>(
    showtimes[0]?.id || "st-1"
  );

  const initialMonth = showtimes[0]?.monthNumber || 10;
  const initialDay = showtimes[0]?.dayNumber || 17;

  const [selectedCalendarMonth, setSelectedCalendarMonth] = useState<number>(initialMonth);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(initialDay);

  const handleToggleShowtime = (id: string) => {
    setExpandedShowtimeId((prev) => (prev === id ? "" : id));
  };

  // Calculate distinct available months from showtimes
  const availableMonths = useMemo(() => {
    const monthsMap = new Map<number, number>();
    showtimes.forEach((st) => {
      monthsMap.set(st.monthNumber, (monthsMap.get(st.monthNumber) || 0) + 1);
    });
    if (monthsMap.size === 0) {
      monthsMap.set(initialMonth, 1);
    }
    return Array.from(monthsMap.entries()).map(([month, count]) => ({
      month,
      count,
      year: showtimes.find((st) => st.monthNumber === month)?.yearNumber || 2026,
    }));
  }, [showtimes, initialMonth]);

  // Calculate calendar grid days for selectedCalendarMonth
  const daysInMonth = useMemo(() => {
    const year = showtimes.find((st) => st.monthNumber === selectedCalendarMonth)?.yearNumber || 2026;
    const count = new Date(year, selectedCalendarMonth, 0).getDate();
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [selectedCalendarMonth, showtimes]);

  const emptyDaysOffset = useMemo(() => {
    const year = showtimes.find((st) => st.monthNumber === selectedCalendarMonth)?.yearNumber || 2026;
    const firstDay = new Date(year, selectedCalendarMonth - 1, 1).getDay(); // 0 is Sun
    const offset = firstDay === 0 ? 6 : firstDay - 1; // Convert Mon=0..Sun=6
    return Array.from({ length: offset }, (_, i) => i);
  }, [selectedCalendarMonth, showtimes]);

  const activeShowtimeDays = useMemo(() => {
    return showtimes
      .filter((st) => st.monthNumber === selectedCalendarMonth)
      .map((st) => st.dayNumber);
  }, [showtimes, selectedCalendarMonth]);

  const activeDayShowtimes = useMemo(() => {
    return showtimes.filter(
      (st) => st.monthNumber === selectedCalendarMonth && st.dayNumber === selectedCalendarDay
    );
  }, [showtimes, selectedCalendarMonth, selectedCalendarDay]);

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
              const hasAvailableTickets = st.tickets.some((t) => t.available);

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

                    {(() => {
                      const now = new Date();
                      const saleStart = event.ticketSaleStartDate ? new Date(event.ticketSaleStartDate) : null;
                      const isUpcoming = saleStart && now < saleStart;

                      if (isUpcoming) {
                        return (
                          <button
                            type="button"
                            disabled
                            className="px-5 py-2.5 bg-slate-200 dark:bg-zinc-800 text-slate-500 font-extrabold text-xs md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 cursor-not-allowed shrink-0"
                          >
                            {translate("Chưa mở bán")}
                          </button>
                        );
                      }

                      if (hasAvailableTickets) {
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectTicket) {
                                onSelectTicket(st, st.tickets[0]);
                              } else {
                                handleToggleShowtime(st.id);
                              }
                            }}
                            className="px-5 py-2.5 gradient-btn text-white font-extrabold text-xs md:text-sm rounded-xl shadow-md cursor-pointer transition-all shrink-0 active:scale-95"
                          >
                            {translate("Mua vé ngay")}
                          </button>
                        );
                      }

                      return (
                        <button
                          type="button"
                          disabled
                          className="px-5 py-2.5 bg-slate-200 dark:bg-zinc-800 text-slate-400 font-extrabold text-xs md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 cursor-not-allowed shrink-0"
                        >
                          {translate("Đã hết vé")}
                        </button>
                      );
                    })()}
                  </div>

                  {/* Expanded Tickets Area */}
                  {isExpanded && (
                    <div className="p-4 md:p-5 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-100/60 dark:bg-zinc-900/80 space-y-3">
                      <h4 className="font-extrabold text-xs md:text-sm app-text-muted uppercase tracking-wider mb-3">
                        {translate("Thông tin vé")}
                      </h4>

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

              <div className="flex items-center gap-4 text-xs md:text-sm font-extrabold whitespace-nowrap overflow-x-auto no-scrollbar">
                {availableMonths.map(({ month, count, year }) => (
                  <button
                    key={month}
                    type="button"
                    onClick={() => {
                      setSelectedCalendarMonth(month);
                      const firstDay = showtimes.find((st) => st.monthNumber === month)?.dayNumber || 1;
                      setSelectedCalendarDay(firstDay);
                    }}
                    className={`py-1 border-b-2 transition-all cursor-pointer ${selectedCalendarMonth === month
                        ? "border-brand-primary app-text-brand font-black"
                        : "border-transparent app-text-muted hover:app-text-main"
                      }`}
                  >
                    {translate("Tháng")} {month}, {year} ({count} {translate("suất diễn")})
                  </button>
                ))}
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
                  <span>
                    {translate("Suất diễn ngày")} {selectedCalendarDay} {translate("Tháng")}{" "}
                    {selectedCalendarMonth}
                  </span>
                </h4>

                {activeDayShowtimes.map((st) => (
                  <div
                    key={st.id}
                    className="p-3.5 rounded-xl app-bg-card border app-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-extrabold text-sm app-text-main">{st.timeStr}</div>
                      <div className="text-xs app-text-muted mt-0.5">
                        {st.tickets.length} {translate("loại vé khả dụng")}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectTicket && st.tickets && st.tickets[0]) {
                          onSelectTicket(st, st.tickets[0]);
                        }
                      }}
                      className="px-4 py-2 gradient-btn text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                    >
                      {translate("Mua vé ngay")}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-zinc-800/50 text-center text-xs md:text-sm app-text-muted">
                {translate("Không có suất diễn nào vào ngày đã chọn")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventSchedule;
