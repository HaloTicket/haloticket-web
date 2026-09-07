import React, { useState } from "react";
import { FiX, FiPlus } from "react-icons/fi";

interface CreateVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newVoucherData: any) => void;
}

export const CreateVoucherModal: React.FC<CreateVoucherModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [creationMode, setCreationMode] = useState<"SINGLE" | "BULK">("SINGLE");

  // Section 1: Thông tin cơ bản
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [startDate, setStartDate] = useState("2026-09-01T00:00");
  const [endDate, setEndDate] = useState("2026-10-01T23:59");
  const [terms, setTerms] = useState("");

  // Section 2: Thiết lập mã voucher
  const [discountType, setDiscountType] = useState<"FIXED_AMOUNT" | "PERCENTAGE">("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [applyTicketLimitType, setApplyTicketLimitType] = useState<"LIMITED" | "UNLIMITED">("LIMITED");
  const [ticketLimitCount, setTicketLimitCount] = useState<number>(100);
  const [maxOrdersPerBuyer, setMaxOrdersPerBuyer] = useState<number>(1);
  const [minTicketsPerOrder, setMinTicketsPerOrder] = useState<number>(1);
  const [maxTicketsPerOrder, setMaxTicketsPerOrder] = useState<number>(5);

  // Section 3: Phạm vi áp dụng
  const [applyScope, setApplyScope] = useState<"ALL" | "LIMITED_SHOWTIMES">("ALL");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !code) return alert("Vui lòng điền tên chương trình và mã voucher!");

    const newVoucher = {
      id: `v-${Date.now()}`,
      title,
      code: code.toUpperCase().trim(),
      type: discountType,
      value: Number(discountValue),
      minOrderValue: 0,
      usedCount: 0,
      maxUses: applyTicketLimitType === "LIMITED" ? Number(ticketLimitCount) : 9999,
      startDate: startDate.replace("T", " "),
      endDate: endDate.replace("T", " "),
      isActive: true,
      terms,
      applyScope
    };

    onSave(newVoucher);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl app-bg-card border app-border rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 border-b app-border flex items-center justify-between app-bg-subnav">
          <h2 className="text-base font-bold app-text-main flex items-center gap-2">
            Tạo voucher mới
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg app-text-muted hover:app-text-main hover:bg-slate-500/10 transition-colors cursor-pointer"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8 max-h-[80vh] overflow-y-auto no-scrollbar">
          {/* Top Options: Single vs Bulk */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => setCreationMode("SINGLE")}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                creationMode === "SINGLE"
                  ? "border-blue-600 bg-blue-600/5 dark:bg-blue-950/20"
                  : "app-border app-bg-main hover:border-slate-400"
              }`}
            >
              <div>
                <h3 className="font-extrabold app-text-main text-sm">Tạo 1 mã</h3>
                <p className="text-xs app-text-muted mt-1">
                  Tạo một mã voucher duy nhất cho sự kiện của bạn
                </p>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    creationMode === "SINGLE"
                      ? "bg-blue-600 text-white"
                      : "app-bg-card border app-border app-text-muted"
                  }`}
                >
                  {creationMode === "SINGLE" ? "Đã chọn" : "Chọn"}
                </button>
              </div>
            </div>

            <div
              onClick={() => setCreationMode("BULK")}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                creationMode === "BULK"
                  ? "border-blue-600 bg-blue-600/5 dark:bg-blue-950/20"
                  : "app-border app-bg-main hover:border-slate-400"
              }`}
            >
              <div>
                <h3 className="font-extrabold app-text-main text-sm">Tạo nhiều mã</h3>
                <p className="text-xs app-text-muted mt-1">
                  Mã voucher sẽ được tạo ngẫu nhiên hàng loạt và các thiết lập bên dưới sẽ áp dụng cho tất cả các mã voucher
                </p>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    creationMode === "BULK"
                      ? "bg-blue-600 text-white"
                      : "app-bg-card border app-border app-text-muted"
                  }`}
                >
                  {creationMode === "BULK" ? "Đã chọn" : "Chọn"}
                </button>
              </div>
            </div>
          </div>

          {/* Section 1: Thông tin cơ bản */}
          <div className="space-y-4 pt-2 border-t app-border">
            <h3 className="text-xs font-extrabold app-text-main uppercase tracking-wider">
              Thông tin cơ bản
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold app-text-main">
                    Tên chương trình khuyến mãi :
                  </label>
                  <span className="text-[11px] app-text-muted font-mono">{title.length} / 80</span>
                </div>
                <input
                  type="text"
                  maxLength={80}
                  required
                  placeholder="Nhập tên chương trình khuyến mãi"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs focus:outline-none focus:border-blue-500 font-medium"
                />
                <p className="text-[11px] app-text-muted mt-1">Tên chương trình sẽ không hiển thị cho người mua</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold app-text-main">
                    Mã voucher:
                  </label>
                  <span className="text-[11px] app-text-muted font-mono">{code.length} / 12</span>
                </div>
                <input
                  type="text"
                  maxLength={12}
                  required
                  placeholder="Nhập mã voucher"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs font-mono uppercase focus:outline-none focus:border-blue-500 font-bold"
                />
                <p className="text-[11px] app-text-muted mt-1">
                  Chỉ cho phép những giá trị sau (A-Z và 0-9), tối thiểu 6 và tối đa 12 ký tự
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold app-text-main mb-1.5">
                    Thời gian bắt đầu sử dụng mã:
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold app-text-main mb-1.5">
                    Thời gian kết thúc:
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold app-text-main mb-1.5">
                  Nội dung:
                </label>
                <textarea
                  rows={3}
                  placeholder="Điều khoản và quy định của chương trình khuyến mại này"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Thiết lập mã voucher */}
          <div className="space-y-4 pt-4 border-t app-border">
            <h3 className="text-xs font-extrabold app-text-main uppercase tracking-wider">
              Thiết lập mã voucher
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <label className="text-xs font-semibold app-text-main">Loại khuyến mãi:</label>
                <div className="sm:col-span-2 flex items-center gap-3">
                  <select
                    value={discountType}
                    onChange={(e: any) => setDiscountType(e.target.value)}
                    className="px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs font-bold focus:outline-none"
                  >
                    <option value="PERCENTAGE">Theo phần trăm (%)</option>
                    <option value="FIXED_AMOUNT">Theo số tiền (VNĐ)</option>
                  </select>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs focus:outline-none font-bold"
                      placeholder="Nhập mức giảm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold app-text-muted">
                      {discountType === "PERCENTAGE" ? "%" : "đ"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <label className="text-xs font-semibold app-text-main">Tổng số vé được áp dụng:</label>
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex items-center gap-6 text-xs app-text-main font-semibold">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="ticketLimit"
                        checked={applyTicketLimitType === "LIMITED"}
                        onChange={() => setApplyTicketLimitType("LIMITED")}
                        className="accent-blue-600"
                      />
                      <span>Giới hạn</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="ticketLimit"
                        checked={applyTicketLimitType === "UNLIMITED"}
                        onChange={() => setApplyTicketLimitType("UNLIMITED")}
                        className="accent-blue-600"
                      />
                      <span>Không giới hạn</span>
                    </label>
                  </div>

                  {applyTicketLimitType === "LIMITED" && (
                    <input
                      type="number"
                      value={ticketLimitCount}
                      onChange={(e) => setTicketLimitCount(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs focus:outline-none font-medium"
                      placeholder="Nhập số lượng vé"
                    />
                  )}
                  <p className="text-[11px] app-text-muted">Số vé được khuyến mãi mỗi voucher</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <label className="text-xs font-semibold app-text-main">Số đơn hàng tối đa/Người mua:</label>
                <div className="sm:col-span-2">
                  <input
                    type="number"
                    value={maxOrdersPerBuyer}
                    onChange={(e) => setMaxOrdersPerBuyer(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs focus:outline-none font-medium"
                    placeholder="Nhập số đơn hàng tối đa"
                  />
                  <p className="text-[11px] app-text-muted mt-1">
                    Tổng số đơn hàng mà người mua có thể áp dụng voucher
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <label className="text-xs font-semibold app-text-main">Số lượng vé tối thiểu:</label>
                <div className="sm:col-span-2">
                  <input
                    type="number"
                    value={minTicketsPerOrder}
                    onChange={(e) => setMinTicketsPerOrder(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs focus:outline-none font-medium"
                    placeholder="Nhập số lượng vé tối thiểu"
                  />
                  <p className="text-[11px] app-text-muted mt-1">
                    Số lượng vé tối thiểu trong đơn hàng để có thể áp dụng mã voucher
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <label className="text-xs font-semibold app-text-main">Số lượng vé tối đa:</label>
                <div className="sm:col-span-2">
                  <input
                    type="number"
                    value={maxTicketsPerOrder}
                    onChange={(e) => setMaxTicketsPerOrder(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs focus:outline-none font-medium"
                    placeholder="Nhập số lượng vé tối đa"
                  />
                  <p className="text-[11px] app-text-muted mt-1">
                    Số lượng vé tối đa trong đơn hàng có thể áp dụng mã voucher
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Phạm vi áp dụng */}
          <div className="space-y-4 pt-4 border-t app-border">
            <h3 className="text-xs font-extrabold app-text-main uppercase tracking-wider">
              Phạm vi áp dụng
            </h3>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-6 text-xs app-text-main font-semibold">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={applyScope === "ALL"}
                    onChange={() => setApplyScope("ALL")}
                    className="accent-blue-600"
                  />
                  <span>Toàn bộ suất diễn</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={applyScope === "LIMITED_SHOWTIMES"}
                    onChange={() => setApplyScope("LIMITED_SHOWTIMES")}
                    className="accent-blue-600"
                  />
                  <span>Giới hạn suất diễn</span>
                </label>
              </div>

              {applyScope === "LIMITED_SHOWTIMES" && (
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FiPlus className="w-4 h-4" />
                  <span>Thêm suất diễn</span>
                </button>
              )}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-6 border-t app-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold app-text-muted hover:app-text-main app-bg-main border app-border transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              Tạo voucher
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateVoucherModal;
