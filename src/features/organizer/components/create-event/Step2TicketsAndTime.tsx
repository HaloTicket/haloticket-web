import React from "react";
import { FiClock, FiCalendar, FiPlus, FiTrash2, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { FaTicketAlt } from "react-icons/fa";
import type { TicketItem } from "@/types/organizer";

interface Step2TicketsAndTimeProps {
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  tickets: TicketItem[];
  onOpenAddTicketModal: () => void;
  onDeleteTicket: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export const Step2TicketsAndTime: React.FC<Step2TicketsAndTimeProps> = ({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  tickets,
  onOpenAddTicketModal,
  onDeleteTicket,
  onBack,
  onNext
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Event Time Schedule */}
      <div className="app-bg-card border app-border rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
        <h3 className="text-lg font-extrabold app-text-main border-b app-border pb-4 flex items-center gap-2">
          <FiClock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>Thời gian diễn ra sự kiện</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold app-text-main flex items-center gap-1.5">
              <FiCalendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span><span className="text-rose-500">*</span> Thời gian bắt đầu sự kiện</span>
            </label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-3 border app-border font-bold cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold app-text-main flex items-center gap-1.5">
              <FiCalendar className="w-4 h-4 text-rose-500" />
              <span><span className="text-rose-500">*</span> Thời gian kết thúc sự kiện</span>
            </label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-3 border app-border font-bold cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Ticket Categories List */}
      <div className="app-bg-card border app-border rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b app-border pb-4">
          <div>
            <h3 className="text-lg font-extrabold app-text-main flex items-center gap-2">
              <FaTicketAlt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Danh sách Loại vé mở bán</span>
            </h3>
            <p className="text-xs app-text-muted mt-0.5">Tạo các hạng vé khác nhau (VIP, GA, Early Bird, Vé miễn phí...)</p>
          </div>

          <button
            type="button"
            onClick={onOpenAddTicketModal}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <FiPlus className="w-4 h-4" />
            <span>Tạo loại vé mới</span>
          </button>
        </div>

        {tickets.length === 0 ? (
          <div className="text-center py-10 app-bg-subnav rounded-2xl border app-border space-y-3">
            <FaTicketAlt className="w-10 h-10 text-zinc-400 mx-auto" />
            <p className="text-xs font-bold app-text-muted">Chưa có loại vé nào được tạo.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl app-bg-subnav border app-border gap-4 hover:border-blue-500/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                    <FaTicketAlt className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold app-text-main">{t.name}</h4>
                    <div className="flex items-center gap-3 text-xs app-text-muted mt-0.5">
                      <span className="font-extrabold text-blue-600 dark:text-blue-400">
                        {t.isFree ? "MIỄN PHÍ" : `${t.price.toLocaleString("vi-VN")} đ`}
                      </span>
                      <span>•</span>
                      <span>Số lượng: {t.totalQuantity} vé</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => onDeleteTicket(t.id)}
                    className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                    title="Xóa vé"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stepper Nav Buttons */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 app-bg-subnav app-text-main font-extrabold text-sm rounded-xl border app-border flex items-center gap-2 cursor-pointer"
        >
          <FiChevronLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
        >
          <span>Tiếp tục: Cài đặt</span>
          <FiChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Step2TicketsAndTime;
