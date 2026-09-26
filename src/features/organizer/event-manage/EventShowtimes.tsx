import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { eventApi } from "@/services/eventApi";
import { FiClock, FiCalendar, FiActivity, FiTag, FiPauseCircle, FiPlayCircle } from "react-icons/fi";
import { formatDatetimeLocal } from "@/utils/formatters";

export const EventShowtimes: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  
  const [eventData, setEventData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const fetchEvent = () => {
    if (!eventId) return;
    setIsLoading(true);
    eventApi.getEventById(eventId).then((data) => {
      setEventData(data);
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });
  };

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const handleUpdateShowtimeStatus = async (showtimeId: string, action: 'STOP' | 'RESUME') => {
    if (!eventData || !eventId) return;
    setIsUpdating(showtimeId);
    
    try {
      // find the showtime and modify its saleEndTime
      const updatedShowtimes = eventData.showtimes.map((st: any) => {
        if (st.id === showtimeId) {
          const now = new Date();
          if (action === 'STOP') {
            // set saleEndTime to 1 minute ago to stop sales immediately
            now.setMinutes(now.getMinutes() - 1);
            return { ...st, saleEndTime: formatDatetimeLocal(now.toISOString()) };
          } else {
            // set saleEndTime to event end time to resume
            return { ...st, saleEndTime: formatDatetimeLocal(st.endTime) };
          }
        }
        return st;
      });
      
      const updatePayload = {
        title: eventData.title,
        showtimes: updatedShowtimes,
        tickets: eventData.tickets,
        categoryId: eventData.categoryId,
        description: eventData.description,
      };
      
      await eventApi.updateEvent(eventId, updatePayload);
      alert(action === 'STOP' ? "Đã ngừng bán vé cho suất diễn này" : "Đã mở bán lại vé cho suất diễn này");
      fetchEvent();
    } catch (error) {
      alert("Lỗi khi cập nhật trạng thái suất diễn");
    } finally {
      setIsUpdating(null);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center app-text-muted text-sm font-bold">Đang tải dữ liệu...</div>;
  }

  if (!eventData || !eventData.showtimes || eventData.showtimes.length === 0) {
    return (
      <div className="p-8 text-center border app-border rounded-2xl app-bg-card">
        <FiClock className="w-10 h-10 app-text-muted mx-auto mb-3" />
        <p className="text-sm font-bold app-text-main">Sự kiện này không có suất diễn nào.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b app-border pb-4">
        <div>
          <h2 className="text-lg font-black app-text-main flex items-center gap-2">
            <FiActivity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Quản lý Suất diễn &amp; Hạng vé</span>
          </h2>
          <p className="text-xs app-text-muted font-medium mt-1">
            Theo dõi trạng thái, số lượng vé còn lại của từng suất diễn.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {eventData.showtimes.map((st: any) => {
          // find tickets for this showtime
          const stTickets = Array.isArray(eventData.tickets) 
            ? eventData.tickets.filter((t: any) => t.showtimeId === st.id)
            : [];
            
          let hasAvailableTickets = false;
          let totalInitial = 0;
          let totalRemaining = 0;
          
          stTickets.forEach((t: any) => {
             const remaining = t.totalQuantity || 0;
             const initial = t.initialQuantity || t.totalQuantity || 0;
             totalInitial += initial;
             totalRemaining += remaining;
             if (remaining > 0) hasAvailableTickets = true;
          });
          
          const now = new Date();
          const saleStart = st.saleStartTime ? new Date(st.saleStartTime) : null;
          const saleEnd = st.saleEndTime ? new Date(st.saleEndTime) : null;
          
          let statusLabel = "";
          let statusClass = "";
          let canStop = false;
          let canResume = false;
          
          if (!hasAvailableTickets && stTickets.length > 0) {
             statusLabel = "HẾT VÉ";
             statusClass = "bg-slate-100 text-slate-500 border-slate-300 dark:bg-zinc-800 dark:text-slate-400 dark:border-zinc-700";
          } else if (saleEnd && now > saleEnd) {
             statusLabel = "NGƯNG BÁN ONLINE";
             statusClass = "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50";
             canResume = true;
          } else if (saleStart && now < saleStart) {
             statusLabel = "SẮP MỞ BÁN";
             statusClass = "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50";
          } else {
             statusLabel = "ĐANG BÁN VÉ";
             statusClass = "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50";
             canStop = true;
          }

          return (
            <div key={st.id} className="app-bg-card border app-border rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 md:p-5 border-b app-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-zinc-900/30">
                <div>
                  <h3 className="font-black text-base app-text-main text-blue-600 dark:text-blue-400">
                    {st.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-bold app-text-muted">
                    <span className="flex items-center gap-1.5">
                      <FiCalendar className="w-3.5 h-3.5" />
                      {formatDatetimeLocal(st.startTime)} - {formatDatetimeLocal(st.endTime)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1.5 rounded-lg border text-xs font-extrabold tracking-wide ${statusClass}`}>
                    {statusLabel}
                  </div>
                  
                  {canStop && (
                    <button
                      onClick={() => handleUpdateShowtimeStatus(st.id, 'STOP')}
                      disabled={isUpdating === st.id}
                      className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <FiPauseCircle className="w-4 h-4" />
                      <span>Ngừng bán</span>
                    </button>
                  )}
                  {canResume && (
                    <button
                      onClick={() => handleUpdateShowtimeStatus(st.id, 'RESUME')}
                      disabled={isUpdating === st.id}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <FiPlayCircle className="w-4 h-4" />
                      <span>Mở bán lại</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 md:p-5">
                <h4 className="text-xs font-extrabold app-text-main uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FiTag className="w-4 h-4 text-purple-500" />
                  Danh sách hạng vé
                </h4>
                
                {stTickets.length === 0 ? (
                  <p className="text-xs font-medium app-text-muted italic">Chưa có hạng vé nào cho suất diễn này.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                        <tr className="border-b app-border text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-zinc-800/50">
                          <th className="px-4 py-3 font-extrabold rounded-tl-xl">Tên hạng vé</th>
                          <th className="px-4 py-3 font-extrabold">Giá vé</th>
                          <th className="px-4 py-3 font-extrabold text-right">Tổng vé phát hành</th>
                          <th className="px-4 py-3 font-extrabold text-right">Đã bán</th>
                          <th className="px-4 py-3 font-extrabold text-right rounded-tr-xl">Còn lại</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y app-divide">
                        {stTickets.map((t: any) => {
                          const initial = t.initialQuantity || t.totalQuantity || 0;
                          const remaining = t.totalQuantity || 0;
                          const sold = initial - remaining;
                          const isSoldOut = remaining <= 0;
                          
                          return (
                            <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors border-b app-border">
                              <td className="px-4 py-3 font-bold app-text-main">
                                {t.name}
                                {isSoldOut && (
                                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-slate-400">
                                    Hết vé
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-medium app-text-muted">
                                {t.isFree ? "Miễn phí" : `${t.price?.toLocaleString("vi-VN")} đ`}
                              </td>
                              <td className="px-4 py-3 text-right font-medium app-text-muted">
                                {initial}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                {sold}
                              </td>
                              <td className={`px-4 py-3 text-right font-black ${isSoldOut ? 'text-rose-500' : 'text-blue-600 dark:text-blue-400'}`}>
                                {remaining}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EventShowtimes;
