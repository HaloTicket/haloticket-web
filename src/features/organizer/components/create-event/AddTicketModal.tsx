import React, { useState } from "react";
import { FiX } from "react-icons/fi";
import { FaTicketAlt } from "react-icons/fa";
import type { TicketItem } from "@/types/organizer";

interface AddTicketModalProps {
  onClose: () => void;
  onSave: (ticket: TicketItem) => void;
}

export const AddTicketModal: React.FC<AddTicketModalProps> = ({ onClose, onSave }) => {
  const [newTicketName, setNewTicketName] = useState("");
  const [newTicketPrice, setNewTicketPrice] = useState(0);
  const [newTicketIsFree, setNewTicketIsFree] = useState(false);
  const [newTicketTotalQuantity, setNewTicketTotalQuantity] = useState(100);
  const [newTicketMinOrder, setNewTicketMinOrder] = useState(1);
  const [newTicketMaxOrder, setNewTicketMaxOrder] = useState(5);
  const [newTicketStartSale, setNewTicketStartSale] = useState("2026-09-10T08:00");
  const [newTicketEndSale, setNewTicketEndSale] = useState("2026-10-15T12:00");
  const [newTicketDescription, setNewTicketDescription] = useState("");

  const handleSave = () => {
    if (!newTicketName.trim()) {
      alert("Vui lòng nhập tên loại vé!");
      return;
    }
    const created: TicketItem = {
      id: Date.now().toString(),
      name: newTicketName.trim(),
      price: newTicketIsFree ? 0 : Number(newTicketPrice),
      isFree: newTicketIsFree,
      totalQuantity: Number(newTicketTotalQuantity),
      minPerOrder: Number(newTicketMinOrder),
      maxPerOrder: Number(newTicketMaxOrder),
      startSaleDate: newTicketStartSale,
      endSaleDate: newTicketEndSale,
      description: newTicketDescription,
      image: null
    };
    onSave(created);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="app-bg-card border app-border rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b app-border pb-4">
          <h3 className="text-lg font-extrabold app-text-main flex items-center gap-2">
            <FaTicketAlt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Tạo loại vé mới</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg app-text-muted hover:app-text-main cursor-pointer"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold app-text-main">
              <span><span className="text-rose-500">*</span> Tên loại vé</span>
              <span className="text-[11px] app-text-muted">{newTicketName.length} / 50</span>
            </div>
            <input
              type="text"
              maxLength={50}
              value={newTicketName}
              onChange={(e) => setNewTicketName(e.target.value)}
              placeholder="Ví dụ: Vé VVIP, Vé GA, Early Bird..."
              className="w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-2.5 border app-border font-bold"
            />
          </div>

          {/* Price & Free Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="space-y-1">
              <label className="text-xs font-bold app-text-main"><span className="text-rose-500">*</span> Giá vé (VNĐ)</label>
              <input
                type="number"
                disabled={newTicketIsFree}
                value={newTicketPrice}
                onChange={(e) => setNewTicketPrice(Number(e.target.value))}
                className="w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-2.5 border app-border font-extrabold text-blue-600 dark:text-blue-400"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-bold app-text-main cursor-pointer sm:pt-5">
              <input
                type="checkbox"
                checked={newTicketIsFree}
                onChange={(e) => {
                  setNewTicketIsFree(e.target.checked);
                  if (e.target.checked) setNewTicketPrice(0);
                }}
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span>Vé miễn phí (0đ)</span>
            </label>
          </div>

          {/* Quantities */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold app-text-main"><span className="text-rose-500">*</span> Tổng số lượng vé</label>
              <input
                type="number"
                value={newTicketTotalQuantity}
                onChange={(e) => setNewTicketTotalQuantity(Number(e.target.value))}
                className="w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-2.5 border app-border font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold app-text-main">Số vé tối thiểu/đơn</label>
              <input
                type="number"
                value={newTicketMinOrder}
                onChange={(e) => setNewTicketMinOrder(Number(e.target.value))}
                className="w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-2.5 border app-border"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold app-text-main">Số vé tối đa/đơn</label>
              <input
                type="number"
                value={newTicketMaxOrder}
                onChange={(e) => setNewTicketMaxOrder(Number(e.target.value))}
                className="w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-2.5 border app-border"
              />
            </div>
          </div>

          {/* Sale Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold app-text-main"><span className="text-rose-500">*</span> Ngày bắt đầu bán vé</label>
              <input
                type="datetime-local"
                value={newTicketStartSale}
                onChange={(e) => setNewTicketStartSale(e.target.value)}
                className="w-full app-bg-subnav app-text-main text-xs rounded-xl px-3 py-2 border app-border cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold app-text-main"><span className="text-rose-500">*</span> Ngày kết thúc bán vé</label>
              <input
                type="datetime-local"
                value={newTicketEndSale}
                onChange={(e) => setNewTicketEndSale(e.target.value)}
                className="w-full app-bg-subnav app-text-main text-xs rounded-xl px-3 py-2 border app-border cursor-pointer"
              />
            </div>
          </div>

          {/* Ticket Description */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold app-text-main">
              <span>Thông tin quyền lợi vé</span>
              <span className="text-[11px] app-text-muted">{newTicketDescription.length} / 1000</span>
            </div>
            <textarea
              rows={3}
              maxLength={1000}
              value={newTicketDescription}
              onChange={(e) => setNewTicketDescription(e.target.value)}
              placeholder="Quyền lợi đính kèm của hạng vé..."
              className="w-full app-bg-subnav app-text-main text-xs rounded-xl p-3 border app-border"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t app-border">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 app-bg-subnav app-text-main text-xs font-bold rounded-xl border app-border cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-7 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md cursor-pointer"
          >
            Lưu loại vé
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTicketModal;
