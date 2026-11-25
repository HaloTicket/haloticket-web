import { useTranslation } from "react-i18next";
import React, { useState, useMemo, useEffect } from "react";
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
import { isTicketInStock } from "@/utils/ticketQuantities";

/** Props của phần lịch diễn: dữ liệu sự kiện và hàm gọi khi chọn một loại vé của một suất. */
interface EventScheduleProps {
  buyScrollRequest?: number;
  event: EventDetailData;
  onSelectTicket?: (showtime: Showtime, ticket: TicketTier) => void;
}

/** Phần lịch diễn và vé: hiển thị các suất theo dạng danh sách (mở rộng để xem vé) hoặc dạng lịch tháng, kèm trạng thái mở bán và còn vé. */
export const EventSchedule: React.FC<EventScheduleProps> = ({
  event,
  onSelectTicket,
  buyScrollRequest = 0,
}) => {
  const { t: translate } = useTranslation();

  // đảm bảo danh sách suất diễn được tính động từ startTime và endTime của sự kiện
  const showtimes: Showtime[] = useMemo(() => {
    const eventAny = event as any;
    let rawTickets = eventAny.tickets || eventAny.ticketTypes;
    
    if (typeof rawTickets === "string") {
      try {
        const parsed = JSON.parse(rawTickets);
        if (Array.isArray(parsed)) rawTickets = parsed;
      } catch {
        // ignore
      }
    }

    if (Array.isArray(rawTickets)) {
      const showtimeNames = (event.showtimes || []).map((s: any) => (s.name || "").trim().toLowerCase());
      rawTickets = rawTickets
        .filter((tc: any) => {
          const tcName = (tc.name || "").trim().toLowerCase();
          const looksLikeShowtime = tc.startTime && !tc.price;
          const matchesShowtime = showtimeNames.length > 0 && showtimeNames.includes(tcName) && (!tc.price || tc.price === 0) && !tc.minPerOrder;
          return !looksLikeShowtime && !matchesShowtime;
        })
        .filter((tc: any, index: number, self: any[]) =>
          index === self.findIndex((t: any) => (t.name || "").trim().toLowerCase() === (tc.name || "").trim().toLowerCase())
        );
    }

    const defaultTickets: TicketTier[] = Array.isArray(rawTickets) && rawTickets.length > 0
      ? rawTickets.map((t: any, tIdx: number) => ({
          id: `t_raw_${tIdx}`,
          name: t.name || translate("Vé Thường"),
          price: typeof t.price === "number" ? `${t.price.toLocaleString("vi-VN")} đ` : String(t.price || "0 đ"),
          priceValue: typeof t.price === "number" ? t.price : (parseFloat(String(t.price).replace(/[^0-9]/g, "")) || 1000000),
          available: isTicketInStock(t),
        }))
      : [
          { id: `t_vip`, name: "VIP", price: "2.000.000 đ", priceValue: 2000000, available: true },
          { id: `t_std`, name: translate("TIÊU CHUẨN"), price: "1.000.000 đ", priceValue: 1000000, available: true },
        ];

    if (event.showtimes && event.showtimes.length > 0) {
      return event.showtimes.map((st: any) => {
        const start = st.startTime ? new Date(st.startTime) : new Date();
        const end = st.endTime ? new Date(st.endTime) : new Date(start.getTime() + 4 * 60 * 60 * 1000);
        
        const startHours = String(start.getHours()).padStart(2, "0");
        const startMins = String(start.getMinutes()).padStart(2, "0");
        const endHours = String(end.getHours()).padStart(2, "0");
        const endMins = String(end.getMinutes()).padStart(2, "0");
        const timeRangeStr = `${startHours}:${startMins} - ${endHours}:${endMins}`;
        
        const dayNum = start.getDate();
        const monthNum = start.getMonth() + 1;
        const yearNum = start.getFullYear();
        const dateStr = `${dayNum} ${translate("Tháng")} ${monthNum < 10 ? "0" + monthNum : monthNum}, ${yearNum}`;
        const fullDateTime = `${timeRangeStr}, ${dateStr}`;

        return {
          id: st.id,
          name: st.name,
          dateStr,
          timeStr: timeRangeStr,
          fullDateTime,
          dayNumber: dayNum,
          monthNumber: monthNum,
          yearNumber: yearNum,
          isOpen: true,
          tickets: defaultTickets,
          saleStartTime: st.saleStartTime,
          saleEndTime: st.saleEndTime,
        };
      });
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
      const dateStr = `${dayNum} ${translate("Tháng")} ${monthNum < 10 ? "0" + monthNum : monthNum}, ${yearNum}`;
      const fullDateTime = `${timeRangeStr}, ${dateStr}`;

      const tickets: TicketTier[] = defaultTickets;

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
          dateStr: `17 ${translate("Tháng")} 10, 2026`,
          timeStr: "19:00 - 23:59",
          fullDateTime: `19:00 - 23:59, 17 ${translate("Tháng")} 10, 2026`,
          dayNumber: 17,
          monthNumber: 10,
          yearNumber: 2026,
          isOpen: true,
          tickets: [
            { id: "t_vip_1", name: "VIP", price: "2.000.000 đ", priceValue: 2000000, available: true },
            { id: "t_std_1", name: translate("TIÊU CHUẨN"), price: "1.000.000 đ", priceValue: 1000000, available: true },
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

  /** Mở hoặc thu gọn vé của một suất diễn (chỉ một suất được mở tại một thời điểm). */
  const isShowtimeOnSale = (showtime: Showtime) => {
    const parseDate = (value: unknown): number | null => {
      if (!value) return null;
      const date = Array.isArray(value)
        ? new Date(value[0], value[1] - 1, value[2], value[3] || 0, value[4] || 0, value[5] || 0)
        : new Date(value as string);
      return Number.isNaN(date.getTime()) ? null : date.getTime();
    };
    const sale = showtime as Showtime & { saleStartTime?: unknown; saleEndTime?: unknown };
    const start = parseDate(sale.saleStartTime) ?? parseDate(event.ticketSaleStartDate);
    const end = parseDate(sale.saleEndTime) ?? parseDate(event.ticketSaleEndDate);
    const now = Date.now();
    return (start === null || now >= start) && (end === null || now <= end);
  };

  const handleToggleShowtime = (id: string) => {
    const showtime = showtimes.find((item) => item.id === id);
    if (!showtime || !isShowtimeOnSale(showtime)) return;
    setExpandedShowtimeId((prev) => (prev === id ? "" : id));
  };

  const selectTicket = (showtime: Showtime, ticket: TicketTier) => {
    if (isShowtimeOnSale(showtime)) onSelectTicket?.(showtime, ticket);
  };

  useEffect(() => {
    if (!buyScrollRequest) return;
    if (viewMode !== "list") {
      setViewMode("list");
      return;
    }
    const row = document.querySelector<HTMLElement>("#schedule-section [data-bookable='true']");
    const target = row ?? document.getElementById("schedule-section");
    if (!target) return;
    const headerHeight = document.getElementById("site-header")?.getBoundingClientRect().height ?? 0;
    window.scrollTo({ top: Math.max(0, window.scrollY + target.getBoundingClientRect().top - headerHeight - 88), behavior: "instant" });
  }, [buyScrollRequest, viewMode]);

  // Tính các tháng riêng biệt có suất diễn
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

  // Tính các ngày trong lưới lịch của tháng đang chọn
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
      {/* Đầu phần kèm nút đổi kiểu xem */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-extrabold app-text-main flex items-center gap-2 tracking-tight">
          <FiCalendar className="w-5 h-5 app-text-brand" />
          <span>{translate("Lịch diễn")}</span>
        </h2>

        {/* Bộ chuyển kiểu xem */}
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

      {/* Khung chính */}
      <div className="app-bg-card border app-border rounded-3xl p-4 md:p-6 shadow-lg">
        {/* Kiểu danh sách */}
        {viewMode === "list" && (
          <div className="space-y-4">
            {showtimes.map((st) => {
              const isExpanded = expandedShowtimeId === st.id && isShowtimeOnSale(st);
              const hasAvailableTickets = st.tickets ? st.tickets.some((t) => t.available) : true;

              return (
                <div
                  key={st.id}
                  data-bookable={isShowtimeOnSale(st) && hasAvailableTickets}
                  className="rounded-2xl border app-border overflow-hidden transition-all duration-300 bg-slate-50/50 dark:bg-zinc-900/50"
                >
                  {/* Đầu mục suất diễn dạng accordion */}
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
                      /** Chuyển giá trị ngày (mảng số hoặc chuỗi) thành {@code Date}; không hợp lệ thì trả về {@code null}. */
                      const parseSafeDate = (dateVal: any): Date | null => {
                        if (!dateVal) return null;
                        if (Array.isArray(dateVal)) {
                          const [y, m, d, h = 0, min = 0, s = 0] = dateVal;
                          return new Date(y, m - 1, d, h, min, s);
                        }
                        const d = new Date(dateVal);
                        if (isNaN(d.getTime())) return null;
                        return d;
                      };
                      const now = new Date();
                      const saleStart = parseSafeDate((st as any).saleStartTime) || parseSafeDate(event.ticketSaleStartDate);
                      const saleEnd = parseSafeDate((st as any).saleEndTime) || parseSafeDate(event.ticketSaleEndDate);
                      const isUpcoming = saleStart && now < saleStart;
                      const isEnded = saleEnd && now > saleEnd;

                      if (isEnded) {
                        return (
                          <button
                            type="button"
                            disabled
                            className="px-5 py-2.5 bg-slate-200 dark:bg-zinc-800 text-slate-400 font-extrabold text-xs md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 cursor-not-allowed shrink-0"
                          >
                            {translate("NGƯNG BÁN ONLINE")}
                          </button>
                        );
                      }

                      if (isUpcoming) {
                        return (
                          <button
                            type="button"
                            disabled
                            className="px-5 py-2.5 bg-slate-200 dark:bg-zinc-800 text-slate-500 font-extrabold text-xs md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 cursor-not-allowed shrink-0"
                          >
                            {translate("SẮP MỞ BÁN")}
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
                                selectTicket(st, st.tickets ? st.tickets[0] : ({} as any));
                              } else {
                                handleToggleShowtime(st.id);
                              }
                            }}
                            className="px-5 py-2.5 gradient-btn text-white font-extrabold text-xs md:text-sm rounded-xl shadow-md cursor-pointer transition-all shrink-0 active:scale-95"
                          >
                            {translate("ĐANG BÁN VÉ")}
                          </button>
                        );
                      }

                      return (
                        <button
                          type="button"
                          disabled
                          className="px-5 py-2.5 bg-slate-200 dark:bg-zinc-800 text-slate-400 font-extrabold text-xs md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 cursor-not-allowed shrink-0"
                        >
                          {translate("HẾT VÉ")}
                        </button>
                      );
                    })()}
                  </div>

                  {/* Khu vực vé khi mở rộng */}
                  {isExpanded && (
                    <div className="p-4 md:p-5 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-100/60 dark:bg-zinc-900/80 space-y-3">
                      <h4 className="font-extrabold text-xs md:text-sm app-text-muted uppercase tracking-wider mb-3">
                        {translate("Thông tin vé")}
                      </h4>

                      <div className="grid grid-cols-1 gap-2.5">
                        {st.tickets?.map((t) => (
                          <div
                            key={t.id}
                            className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${t.available
                                ? "app-bg-card border-slate-200/80 dark:border-zinc-700/80 hover:border-brand-primary cursor-pointer shadow-xs"
                                : "bg-slate-200/50 dark:bg-zinc-800/40 border-slate-200/40 dark:border-zinc-800/40 opacity-70"
                              }`}
                            onClick={() => t.available && selectTicket(st, t)}
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

        {/* Kiểu lịch */}
        {viewMode === "calendar" && (
          <div>
            {/* Thanh chọn tháng */}
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

            {/* Hàng tiêu đề 7 ngày */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold app-text-muted mb-3 py-2 border-b border-slate-200/40 dark:border-slate-800/40">
              <div>{translate("Thứ 2")}</div>
              <div>{translate("Thứ 3")}</div>
              <div>{translate("Thứ 4")}</div>
              <div>{translate("Thứ 5")}</div>
              <div>{translate("Thứ 6")}</div>
              <div>{translate("Thứ 7")}</div>
              <div>{translate("Chủ nhật")}</div>
            </div>

            {/* Lưới các ngày trong lịch */}
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

            {/* Thông tin các suất của ngày được chọn bên dưới lịch */}
            {activeDayShowtimes.length > 0 ? (
              <div className="p-4 md:p-5 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border app-border space-y-3">
                <h4 className="font-extrabold text-sm md:text-base app-text-main flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4 app-text-brand" />
                  <span>
                    {translate("Suất diễn ngày")} {selectedCalendarDay} {translate("Tháng")}{" "}
                    {selectedCalendarMonth}
                  </span>
                </h4>

                {activeDayShowtimes.map((st) => {
                  /** Chuyển giá trị ngày (mảng số hoặc chuỗi) thành {@code Date}; không hợp lệ thì trả về {@code null}. */
                  const parseSafeDate = (dateVal: any): Date | null => {
                    if (!dateVal) return null;
                    if (Array.isArray(dateVal)) {
                      const [y, m, d, h = 0, min = 0, s = 0] = dateVal;
                      return new Date(y, m - 1, d, h, min, s);
                    }
                    const d = new Date(dateVal);
                    if (isNaN(d.getTime())) return null;
                    return d;
                  };
                  const now = new Date();
                  const saleStart = parseSafeDate((st as any).saleStartTime) || parseSafeDate(event.ticketSaleStartDate);
                  const saleEnd = parseSafeDate((st as any).saleEndTime) || parseSafeDate(event.ticketSaleEndDate);
                  const isUpcoming = saleStart && now < saleStart;
                  const isEnded = saleEnd && now > saleEnd;
                  const hasAvailableTickets = st.tickets ? st.tickets.some((t) => t.available) : true;
                  
                  return (
                    <div
                      key={st.id}
                      className="p-3.5 rounded-xl app-bg-card border app-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-extrabold text-sm app-text-main">{st.timeStr}</div>
                        <div className="text-xs app-text-muted mt-0.5">
                          {st.tickets?.length || 0} {translate("loại vé khả dụng")}
                        </div>
                      </div>

                      {isEnded ? (
                        <button
                          type="button"
                          disabled
                          className="px-4 py-2 bg-slate-200 dark:bg-zinc-800 text-slate-400 font-extrabold text-xs rounded-xl shadow-none cursor-not-allowed border border-slate-300 dark:border-zinc-700"
                        >
                          {translate("Ngừng Bán vé")}
                        </button>
                      ) : isUpcoming ? (
                        <button
                          type="button"
                          disabled
                          className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-brand-primary font-extrabold text-xs rounded-xl border border-brand-primary/30 cursor-not-allowed"
                        >
                          {translate("Sắp mở bán")}
                        </button>
                      ) : hasAvailableTickets ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectTicket) {
                              selectTicket(st, (st.tickets && st.tickets[0]) ? st.tickets[0] : ({} as any));
                            }
                          }}
                          className="px-4 py-2 gradient-btn text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                        >
                          {translate("Mua vé ngay")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="px-4 py-2 bg-slate-200 dark:bg-zinc-800 text-slate-400 font-extrabold text-xs rounded-xl shadow-none cursor-not-allowed border border-slate-300 dark:border-zinc-700"
                        >
                          {translate("HẾT VÉ")}
                        </button>
                      )}
                    </div>
                  );
                })}
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
