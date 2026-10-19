import { getLocale } from "@/i18n";
import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { FiFileText, FiInbox, FiX, FiDollarSign, FiRefreshCw } from "react-icons/fi";
import { TablePagination } from "@/components/common/TablePagination";
import { payoutApi } from "@/services/payoutApi";
import { toast } from "react-hot-toast";
import { useEffect } from "react";

import type { PayoutResponse } from "@/types";

export const OrganizerFinance: React.FC = () => {
  const { t } = useTranslation();
  const { t: translate } = useTranslation();
  const [payouts, setPayouts] = useState<PayoutResponse[]>([]);
  
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const [eligibleEvents, setEligibleEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const sortedPayouts = [...payouts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const paginatedPayouts = sortedPayouts.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const totalPages = Math.ceil(payouts.length / rowsPerPage);

  const fetchPayouts = async () => {
    try {
      const data = await payoutApi.getOrganizerPayouts();
      setPayouts(data || []);
    } catch (err) {
      console.error("Failed to fetch payouts", err);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  useEffect(() => {
    if (showPayoutModal) {
      fetchEligibleEvents();
    }
  }, [showPayoutModal]);

  const fetchEligibleEvents = async () => {
    try {
      const events = await payoutApi.getEligibleEvents();
      setEligibleEvents(events || []);
      if (events && events.length > 0) {
        setSelectedEventId(events[0].eventId);
      }
    } catch (err) {
      console.error("Failed to fetch eligible events", err);
    }
  };

  const selectedEvent = eligibleEvents.find(e => e.eventId === selectedEventId);

  const handleRequestPayout = async () => {
    if (!selectedEventId || !selectedEvent) {
      toast.error(t("Vui lòng chọn sự kiện!"));
      return;
    }
    setIsSubmittingPayout(true);
    try {
      await payoutApi.requestPayout(selectedEvent.eventId, selectedEvent.totalRevenue, selectedEvent.platformFeeRate);
      toast.success(t("Yêu cầu rút tiền thành công, đang chờ Admin duyệt!"));
      fetchPayouts();
      setShowPayoutModal(false);
      setSelectedEventId("");
    } catch (err) {
      toast.error(t("Có lỗi xảy ra khi gửi yêu cầu."));
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  return (
    <div className="w-full min-h-screen app-bg-page p-4 md:p-8 space-y-6">
      {/* Top Quick Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={fetchPayouts}
          className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 app-text-main text-xs font-extrabold rounded-xl shadow-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0 border border-zinc-200/60 dark:border-zinc-700/60"
        >
          <FiRefreshCw className="w-4 h-4" />
          <span>{translate("Làm mới")}</span>
        </button>
        <button
          type="button"
          onClick={() => setShowPayoutModal(true)}
          className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full app-text-main text-xs font-bold shadow-md transition-all duration-300 bg-blue-600 text-white hover:bg-blue-700 active:scale-95 cursor-pointer"
        >
          <FiDollarSign className="w-4 h-4" />
          <span>{translate("Yêu cầu rút tiền (Payout)")}</span>
        </button>
      </div>

      {/* Reports Table Container */}
      <div className="w-full app-bg-card border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-zinc-900/40 border-b border-zinc-200/80 dark:border-zinc-800/80 text-[11px] font-bold app-text-muted uppercase tracking-wider">
                <th className="px-5 py-3.5">{translate("Mã đối soát")}</th>
                <th className="px-5 py-3.5">{translate("Sự kiện")}</th>
                <th className="px-5 py-3.5">{translate("Doanh thu")}</th>
                <th className="px-5 py-3.5">{translate("Thực nhận")}</th>
                <th className="px-5 py-3.5">{translate("Trạng thái")}</th>
                <th className="px-5 py-3.5">{translate("Ngày tạo")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40 text-xs font-medium app-text-main">
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-zinc-400 flex items-center justify-center">
                        <FiInbox className="w-8 h-8 stroke-[1.5]" />
                      </div>
                      <span className="text-xs font-extrabold app-text-muted">{translate("No data")}</span>
                      <p className="text-[11px] app-text-muted max-w-xs">
                        {translate("Chưa có lịch sử đối soát nào.")} </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPayouts.map((p) => {
                  const displayCode = p.id.includes('-') ? p.id.split('-')[0] : p.id.slice(0, 8);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-blue-600 dark:text-blue-400" title={p.id}>
                        {displayCode}
                      </td>
                      <td className="px-5 py-4 font-bold">
                        {p.eventId}
                      </td>
                      <td className="px-5 py-4">{p.grossAmount.toLocaleString('vi-VN')} đ</td>
                      <td className="px-5 py-4 font-bold text-emerald-600 dark:text-emerald-400">{p.netAmount.toLocaleString('vi-VN')} đ</td>
                      <td className="px-5 py-4">
                        {p.status === "PENDING" ? (
                          <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold rounded-md text-[11px]">
                            {t("Chờ duyệt")}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold rounded-md text-[11px]">
                            {t("Đã thanh toán")}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 app-text-muted">
                        {new Date(p.createdAt).toLocaleDateString(getLocale())}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-zinc-200/80 dark:border-zinc-800/80">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={payouts.length}
            pageSize={rowsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => { setRowsPerPage(size); setCurrentPage(1); }}
          />
        </div>
      </div>

      {/* Payout Request Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="app-bg-card rounded-3xl shadow-2xl w-full max-w-4xl border app-border overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col md:flex-row">
            {/* Left Column: Event Selection */}
            <div className="w-full md:w-1/2 p-6 md:p-8 border-b md:border-b-0 md:border-r app-border app-bg-page">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl app-text-main flex items-center gap-2">
                  <FiDollarSign className="w-6 h-6 app-text-brand" />
                  {t("Chọn sự kiện rút tiền")}
                </h3>
                <button onClick={() => setShowPayoutModal(false)} className="md:hidden p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
                  <FiX className="w-5 h-5 app-text-muted" />
                </button>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-bold app-text-main">
                  {t("Sự kiện đã kết thúc & có doanh thu")}
                </label>
                
                {eligibleEvents.length === 0 ? (
                  <div className="p-6 text-center app-bg-card border app-border rounded-xl">
                    <p className="app-text-muted text-sm font-medium">{t("Không có sự kiện nào đủ điều kiện rút tiền lúc này.")}</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {eligibleEvents.map(evt => (
                      <div 
                        key={evt.eventId}
                        onClick={() => setSelectedEventId(evt.eventId)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-4 ${selectedEventId === evt.eventId ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500 shadow-sm' : 'app-border hover:border-blue-300'}`}
                      >
                        <img src={evt.image} alt={evt.eventName} className="w-14 h-14 object-cover rounded-lg shrink-0 shadow-sm" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold app-text-main text-sm truncate" title={evt.eventName}>{evt.eventName}</h4>
                          <p className="text-xs app-text-muted mt-1 font-medium">{evt.eventId}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="w-4 h-4 rounded-full border-2 border-blue-500 flex items-center justify-center">
                            {selectedEventId === evt.eventId && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Payout Details & Action */}
            <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6 hidden md:flex">
                  <h3 className="font-bold text-xl app-text-main">{t("Chi tiết giao dịch")}</h3>
                  <button onClick={() => setShowPayoutModal(false)} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
                    <FiX className="w-5 h-5 app-text-muted" />
                  </button>
                </div>

                {selectedEvent ? (
                  <div className="space-y-6">
                    <div className="p-5 app-bg-subnav rounded-2xl border app-border space-y-4">
                      <div className="flex justify-between items-center pb-4 border-b app-border">
                        <span className="app-text-muted font-medium text-sm">{t("Tổng doanh thu vé")}</span>
                        <span className="font-bold app-text-main">{selectedEvent.totalRevenue.toLocaleString()} VND</span>
                      </div>
                      <div className="flex justify-between items-center pb-4 border-b app-border">
                        <span className="app-text-muted font-medium text-sm">{t("Phí nền tảng")} ({selectedEvent.platformFeeRate * 100}%)</span>
                        <span className="font-bold text-red-500">
                          - {(selectedEvent.totalRevenue * selectedEvent.platformFeeRate).toLocaleString()} VND
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="app-text-main font-bold">{t("Số tiền nhận được")}</span>
                        <span className="font-black text-xl text-emerald-600 dark:text-emerald-400">
                          {selectedEvent.netAmount.toLocaleString()} VND
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                      <p className="text-sm text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
                        <strong className="block mb-1">{t("Lưu ý")}:</strong>
                        {t("Mức phí nền tảng được áp dụng dựa trên thỏa thuận dịch vụ. Số tiền sẽ được chuyển vào tài khoản ngân hàng bạn đã đăng ký trong vòng 3-5 ngày làm việc sau khi yêu cầu được duyệt.")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-10">
                    <FiFileText className="w-16 h-16 app-text-muted mb-4" />
                    <p className="app-text-muted font-medium">{t("Vui lòng chọn sự kiện bên trái")}<br/>{t("để xem chi tiết đối soát.")}</p>
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-6 border-t app-border">
                <button 
                  onClick={() => setShowPayoutModal(false)}
                  className="px-6 py-2.5 text-sm font-bold app-text-main hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
                >
                  {t("Hủy")}
                </button>
                <button 
                  onClick={handleRequestPayout}
                  disabled={isSubmittingPayout || !selectedEventId || payouts.some(p => p.eventId === selectedEventId)}
                  className="px-6 py-2.5 gradient-btn rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed min-w-[140px] font-bold text-sm"
                >
                  {payouts.some(p => p.eventId === selectedEventId) 
                    ? t("Đã gửi yêu cầu") 
                    : (isSubmittingPayout ? t("Đang gửi...") : t("Gửi yêu cầu"))}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerFinance;
