import React, { useState } from "react";
import {
  FiCheckCircle,
  FiSearch,
  FiXCircle,
  FiClock
} from "react-icons/fi";
import { TablePagination } from "@/components/common/TablePagination";
import type { AttendeeItem } from "@/types";

export const EventCheckin: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const [attendees, setAttendees] = useState<AttendeeItem[]>([
    {
      id: "att-1",
      ticketCode: "TK-99210-A",
      attendeeName: "Nguyễn Văn An",
      attendeeEmail: "nguyenvanan@gmail.com",
      ticketType: "Vé VIP - Khán đài A",
      showtime: "20:00 - 25/09/2026",
      checkinStatus: true,
      checkinTime: "19:42:10"
    },
    {
      id: "att-2",
      ticketCode: "TK-99211-B",
      attendeeName: "Trần Thị Mai",
      attendeeEmail: "tranmai92@gmail.com",
      ticketType: "Vé GA - Thường",
      showtime: "20:00 - 25/09/2026",
      checkinStatus: false
    },
    {
      id: "att-3",
      ticketCode: "TK-99212-C",
      attendeeName: "Phạm Hoàng Dũng",
      attendeeEmail: "hoangdung99@gmail.com",
      ticketType: "Vé Standard",
      showtime: "20:00 - 25/09/2026",
      checkinStatus: false
    }
  ]);

  const handleToggleCheckin = (id: string) => {
    setAttendees((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const newStatus = !a.checkinStatus;
          const time = newStatus ? new Date().toLocaleTimeString("vi-VN") : undefined;
          setToast(newStatus ? `Đã Check-in thành công cho "${a.attendeeName}"!` : `Đã hủy Check-in cho "${a.attendeeName}".`);
          setTimeout(() => setToast(null), 3000);
          return { ...a, checkinStatus: newStatus, checkinTime: time };
        }
        return a;
      })
    );
  };

  const checkedCount = attendees.filter((a) => a.checkinStatus).length;
  const filteredAttendees = attendees.filter(
    (a) =>
      a.ticketCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.attendeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.attendeeEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredAttendees.length / pageSize));
  const paginatedAttendees = filteredAttendees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-blue-600 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-3">
          <FiCheckCircle className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header & Checkin Stats Bar */}
      <div className="app-bg-card border app-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b app-border pb-3">
          <p className="text-xs app-text-muted">
            Quét mã QR, tìm kiếm thông tin vé khán giả và xác thực vào cổng trực tiếp.
          </p>

          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-3 py-1.5 rounded-xl shrink-0">
            <FiCheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              Đã Check-in: <strong>{checkedCount}</strong> / {attendees.length} vé
            </span>
          </div>
        </div>

        {/* Unified Search Bar matching MyEvents style */}
        <div className="flex items-center gap-2 app-bg-card border app-border rounded-xl p-1.5 shadow-xs max-w-xl w-full">
          <div className="flex items-center gap-2 flex-1 pl-3">
            <FiSearch className="w-4 h-4 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Nhập mã vé, tên khán giả hoặc email để Check-in nhanh..."
              className="w-full bg-transparent app-text-main text-xs focus:outline-none placeholder-zinc-400 font-medium"
            />
          </div>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
          >
            Tìm kiếm
          </button>
        </div>
      </div>

      {/* Attendees Table with NO row borders */}
      <div className="app-bg-card border app-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs table-fixed min-w-[950px] border-collapse">
            <thead>
              <tr className="border-b app-border app-text-muted font-bold text-[11px] uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/30">
                <th className="py-3 px-4 w-[16%] rounded-l-xl">Mã vé</th>
                <th className="py-3 px-4 w-[24%]">Họ tên khán giả</th>
                <th className="py-3 px-4 w-[20%]">Hạng vé</th>
                <th className="py-3 px-4 w-[18%]">Giờ Check-in</th>
                <th className="py-3 px-4 w-[22%] text-right rounded-r-xl">Xác thực Check-in</th>
              </tr>
            </thead>
            <tbody className="text-xs app-text-main">
              {paginatedAttendees.map((att) => (
                <tr key={att.id} className="hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors rounded-xl">
                  <td className="py-3.5 px-4 font-black text-blue-600 dark:text-blue-400 rounded-l-xl">
                    {att.ticketCode}
                  </td>
                  <td className="py-3.5 px-4">
                    <div>
                      <p className="font-bold app-text-main">{att.attendeeName}</p>
                      <p className="text-[11px] app-text-muted truncate">{att.attendeeEmail}</p>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold app-text-main">
                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold border border-blue-200 dark:border-blue-900 inline-block">
                      {att.ticketType}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium app-text-muted">
                    {att.checkinTime ? (
                      <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                        <FiClock className="w-3.5 h-3.5" />
                        {att.checkinTime}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Chưa vào cổng</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right rounded-r-xl">
                    <button
                      type="button"
                      onClick={() => handleToggleCheckin(att.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95 whitespace-nowrap ${
                        att.checkinStatus
                          ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      {att.checkinStatus ? (
                        <>
                          <FiXCircle className="w-3.5 h-3.5" />
                          <span>Hủy Check-in</span>
                        </>
                      ) : (
                        <>
                          <FiCheckCircle className="w-3.5 h-3.5" />
                          <span>Xác nhận Check-in</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAttendees.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>
    </div>
  );
};

export default EventCheckin;
