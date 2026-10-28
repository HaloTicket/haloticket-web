import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext, useParams } from "react-router-dom";
import {
  FiCheckCircle,
  FiSearch,
  FiClock
} from "react-icons/fi";
import { TablePagination } from "@/components/common/TablePagination";
import { eventApi } from "@/services/eventApi";
import { isForbiddenError } from "@/utils/httpError";

interface CheckinRow {
  checkinId?: string;
  ticketId?: string;
  qrCodeHash?: string;
  ticketTypeName?: string;
  seatName?: string;
  checkedInAt: string;
}

export const EventCheckin: React.FC = () => {
  const { t } = useTranslation();
  const { eventId } = useParams<{ eventId: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [totalSold, setTotalSold] = useState(0);
  const { myRole, myRoleLoaded } = useOutletContext<{ myRole?: string | null; myRoleLoaded?: boolean } | null>() ?? {};
  // check-in staff may scan and see the check-in list
  const canViewStats = myRole !== "CHECKIN_STAFF";

  useEffect(() => {
    if (eventId) {
      eventApi.getEventCheckins(eventId).then((data) => setCheckins(data));
    }
  }, [eventId]);

  useEffect(() => {
    if (!eventId || !myRoleLoaded || !canViewStats) return;
    eventApi.getEventAnalytics(eventId, "30d")
      .then((analytics) => setTotalSold(analytics?.currentTicketsSold || 0))
      .catch(() => { /* statistics are optional here: the check-in page works without them */ });
  }, [eventId, myRoleLoaded, canViewStats]);

  const handleManualCheckin = async () => {
    if (!searchQuery) return;
    try {
      await eventApi.checkinTicket(eventId!, searchQuery);
      setToast(`${t("Đã Check-in thành công mã vé")} "${searchQuery}"!`);
      setTimeout(() => setToast(null), 3000);
      setSearchQuery("");
      // refresh checkins
      const data = await eventApi.getEventCheckins(eventId!);
      setCheckins(data);
    } catch (e) {
      setToast(isForbiddenError(e) ? t("Bạn không có quyền quét vé của sự kiện này") : t("Vé không hợp lệ hoặc đã được sử dụng!"));
      setTimeout(() => setToast(null), 3000);
    }
  };

  const filteredCheckins = checkins.filter(
    (c) =>
      c.ticketId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.qrCodeHash?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ticketTypeName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredCheckins.length / pageSize));
  const paginatedCheckins = filteredCheckins.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {toast && (
        <div className="fixed bottom-6 right-6 z-9999 bg-blue-600 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-3">
          <FiCheckCircle className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      <div className="app-bg-card border app-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b app-border pb-3">
          <p className="text-xs app-text-muted">
            {t("Quản lý danh sách khán giả đã xác thực mã QR vào cổng.")}
          </p>

          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-3 py-1.5 rounded-xl shrink-0">
            <FiCheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {t("Đã Check-in")}: <strong>{checkins.length}</strong>{canViewStats ? <> / {totalSold} {t("vé")}</> : null}
            </span>
          </div>
        </div>

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
              placeholder={t("Nhập mã hash vé để Check-in thủ công hoặc tìm kiếm...")}
              className="w-full bg-transparent app-text-main text-xs focus:outline-none placeholder-zinc-400 font-medium"
            />
          </div>
          <button
            type="button"
            onClick={handleManualCheckin}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
          >
            {t("Check-in thủ công")}
          </button>
        </div>
      </div>

      <div className="app-bg-card border app-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs table-fixed min-w-237.5 border-collapse">
            <thead>
              <tr className="border-b app-border app-text-muted font-bold text-[11px] uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/30">
                <th className="py-3 px-4 w-[25%] rounded-l-xl">{t("Mã vé (Hash)")}</th>
                <th className="py-3 px-4 w-[25%]">{t("Hạng vé")}</th>
                <th className="py-3 px-4 w-[15%]">{t("Vị trí ghế")}</th>
                <th className="py-3 px-4 w-[20%]">{t("Giờ Check-in")}</th>
                <th className="py-3 px-4 w-[15%] text-right rounded-r-xl">{t("Trạng thái")}</th>
              </tr>
            </thead>
            <tbody className="text-xs app-text-main">
              {paginatedCheckins.map((c) => (
                <tr key={c.checkinId} className="hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors rounded-xl">
                  <td className="py-3.5 px-4 font-black text-blue-600 dark:text-blue-400 rounded-l-xl truncate" title={c.qrCodeHash}>
                    {c.qrCodeHash?.substring(0, 15)}...
                  </td>
                  <td className="py-3.5 px-4 font-bold app-text-main">
                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold border border-blue-200 dark:border-blue-900 inline-block">
                      {c.ticketTypeName}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium app-text-muted">
                    {c.seatName || t("Không có")}
                  </td>
                  <td className="py-3.5 px-4 font-medium app-text-muted">
                    <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                      <FiClock className="w-3.5 h-3.5" />
                      {new Date(c.checkedInAt).toLocaleString('vi-VN')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right rounded-r-xl">
                    <span className="px-3 py-1.5 rounded-xl font-bold text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 inline-flex items-center gap-1.5">
                      <FiCheckCircle className="w-3.5 h-3.5" />
                      {t("Đã Check-in")}
                    </span>
                  </td>
                </tr>
              ))}
              {paginatedCheckins.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center app-text-muted italic">
                    {t("Chưa có lượt check-in nào phù hợp.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredCheckins.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        />
      </div>
    </div>
  );
};

export default EventCheckin;
