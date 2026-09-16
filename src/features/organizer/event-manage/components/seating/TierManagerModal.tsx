import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiPlus, FiTrash2, FiEdit2, FiTag, FiClock, FiInfo, FiCalendar, FiDollarSign, FiChevronRight } from 'react-icons/fi';
import type { SeatTier, TierManagerModalProps } from '@/types/seating';

export const TierManagerModal: React.FC<TierManagerModalProps> = ({
  isOpen,
  onClose,
  tiers,
  onSaveTiers,
  readOnly = false,
}) => {
  const [localTiers, setLocalTiers] = useState<SeatTier[]>(tiers);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);

  // Form states for adding/editing ticket types
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [isFree, setIsFree] = useState<boolean>(false);
  const [totalQuantity, setTotalQuantity] = useState<number>(100);
  const [minPerOrder, setMinPerOrder] = useState<number>(1);
  const [maxPerOrder, setMaxPerOrder] = useState<number>(5);
  const [startSaleDate, setStartSaleDate] = useState<string>('');
  const [endSaleDate, setEndSaleDate] = useState<string>('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (tiers && tiers.length > 0) {
      setLocalTiers(tiers);
    }
  }, [tiers, isOpen]);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setEditingTierId('NEW');
    setName('');
    setPrice(100000);
    setIsFree(false);
    setTotalQuantity(100);
    setMinPerOrder(1);
    setMaxPerOrder(5);
    setStartSaleDate('');
    setEndSaleDate('');
    setDescription('');
  };

  const formatForDateTimeLocal = (dateVal?: any): string => {
    if (!dateVal) return '';
    if (Array.isArray(dateVal)) {
      const [y, m, d, h = 0, min = 0] = dateVal;
      const pad = (num: number) => String(num).padStart(2, '0');
      return `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}`;
    }
    let str = String(dateVal).trim();
    if (!str) return '';

    str = str.replace(' ', 'T');
    const match = str.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
    if (match) {
      return `${match[1]}T${match[2]}`;
    }
    const dateOnlyMatch = str.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (dateOnlyMatch) {
      return `${dateOnlyMatch[1]}T00:00`;
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const pad = (num: number) => String(num).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    return '';
  };

  const handleStartEdit = (tier: SeatTier) => {
    setEditingTierId(tier.id);
    setName(tier.name);
    setPrice(tier.price || 0);
    setIsFree(tier.isFree ?? tier.price === 0);
    setTotalQuantity(tier.totalQuantity ?? 100);
    setMinPerOrder(tier.minPerOrder ?? 1);
    setMaxPerOrder(tier.maxPerOrder ?? 5);
    setStartSaleDate(formatForDateTimeLocal(tier.startSaleDate));
    setEndSaleDate(formatForDateTimeLocal(tier.endSaleDate));
    setDescription(tier.description || '');
  };

  const handleSaveForm = () => {
    if (!name.trim()) return;

    const finalPrice = isFree ? 0 : Number(price);
    const updatedItem: SeatTier = {
      id: editingTierId === 'NEW' ? `tier_${Date.now()}` : editingTierId!,
      name: name.trim(),
      price: finalPrice,
      color: '#3b82f6', // default color token (visual color is determined by Zone/Seat)
      isFree,
      totalQuantity: Number(totalQuantity) || 100,
      minPerOrder: Number(minPerOrder) || 1,
      maxPerOrder: Number(maxPerOrder) || 5,
      startSaleDate: startSaleDate || undefined,
      endSaleDate: endSaleDate || undefined,
      description: description.trim(),
    };

    if (editingTierId === 'NEW') {
      setLocalTiers((prev) => [...prev, updatedItem]);
    } else {
      setLocalTiers((prev) => prev.map((t) => (t.id === editingTierId ? updatedItem : t)));
    }
    setEditingTierId(null);
  };

  const handleDeleteItem = (id: string) => {
    if (localTiers.length <= 1) {
      alert('Phải giữ ít nhất 1 hạng vé!');
      return;
    }
    if (editingTierId === id) setEditingTierId(null);
    setLocalTiers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSaveAll = () => {
    onSaveTiers?.(localTiers);
    onClose();
  };

  const isFormActive = !readOnly && Boolean(editingTierId);

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full flex flex-col rounded-3xl app-bg-card border app-border shadow-2xl overflow-hidden max-h-[90vh] transition-all duration-300 ${
          isFormActive ? 'max-w-5xl md:max-w-6xl' : 'max-w-2xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b app-border bg-slate-500/5">
          <div className="flex items-center gap-3">
            <div className="w-9.5 h-9.5 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-600 flex items-center justify-center font-bold">
              <FiTag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black app-text-main flex items-center gap-2">
                <span>{readOnly ? 'Danh Sách Hạng Vé Sự Kiện' : 'Quản Lý Hạng Vé & Giá Bán'}</span>
                {isFormActive && (
                  <span className="text-xs font-bold text-blue-500 flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                    <FiChevronRight className="w-3.5 h-3.5" />
                    {editingTierId === 'NEW' ? 'Tạo loại vé mới' : 'Chỉnh sửa loại vé'}
                  </span>
                )}
              </h3>
              <p className="text-xs app-text-muted">
                {readOnly
                  ? 'Chế độ xem thông tin các loại vé mở bán từ CSDL'
                  : 'Thêm, chỉnh sửa thông tin loại vé, số lượng và thời gian mở bán'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center app-text-muted hover:app-text-main hover:bg-slate-500/10 transition-colors cursor-pointer"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className={isFormActive ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start' : 'space-y-4'}>
            {/* Left Column: List of Ticket Tiers */}
            <div className={isFormActive ? 'lg:col-span-5 space-y-4' : 'space-y-4'}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold app-text-muted uppercase tracking-wider">
                  Danh sách Hạng vé ({localTiers.length})
                </span>
                {!readOnly && !editingTierId && (
                  <button
                    type="button"
                    onClick={handleStartAdd}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    <FiPlus className="w-4 h-4" />
                    <span>Thêm loại vé mới</span>
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {localTiers.map((tier) => {
                  const isBeingEdited = editingTierId === tier.id;
                  return (
                    <div
                      key={tier.id}
                      className={`p-4 rounded-2xl app-bg-main border transition-all space-y-2.5 ${
                        isBeingEdited
                          ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/20 dark:bg-blue-950/20 shadow-md'
                          : 'app-border hover:border-blue-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-extrabold app-text-main">{tier.name}</h4>
                          <span className="text-xs font-mono font-bold text-emerald-500">
                            {tier.isFree || tier.price === 0
                              ? 'Vé Miễn Phí (0đ)'
                              : `${tier.price.toLocaleString('vi-VN')} đ`}
                          </span>
                        </div>

                        {!readOnly && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(tier)}
                              className={`p-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                isBeingEdited
                                  ? 'bg-blue-600 text-white border-blue-500'
                                  : 'app-bg-card border-app-border app-text-muted hover:app-text-main'
                              }`}
                              title="Chỉnh sửa hạng vé"
                            >
                              <FiEdit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(tier.id)}
                              className="p-2 text-xs font-bold rounded-xl app-bg-card border app-border text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Xóa hạng vé"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Metadata info */}
                      <div className="grid grid-cols-1 gap-1.5 pt-2 border-t app-border text-[11px] app-text-muted font-medium">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <FiClock className="w-3.5 h-3.5 text-blue-500 shrink-0" /> Số lượng:
                          </span>
                          <strong className="app-text-main font-mono font-bold">{tier.totalQuantity ?? 100} vé</strong>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <FiInfo className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Mua tối thiểu/đơn:
                          </span>
                          <strong className="app-text-main font-mono font-bold">{tier.minPerOrder ?? 1} - {tier.maxPerOrder ?? 5} vé</strong>
                        </div>

                        {(tier.startSaleDate || tier.endSaleDate) && (
                          <div className="flex flex-col gap-0.5 text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200 dark:border-amber-800/60 mt-1">
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                              <FiCalendar className="w-3 h-3 text-amber-500" /> Thời gian mở bán:
                            </span>
                            <span className="font-mono text-[10px] font-bold">
                              {tier.startSaleDate ? tier.startSaleDate.replace('T', ' ') : 'Bắt đầu ngay'} ⟶ {tier.endSaleDate ? tier.endSaleDate.replace('T', ' ') : 'Hết vé'}
                            </span>
                          </div>
                        )}

                        {tier.description && (
                          <div className="app-text-main text-[11px] italic app-bg-card p-2 rounded-xl border app-border mt-1">
                            "{tier.description}"
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Form Panel (Expands to the Right when adding/editing!) */}
            {isFormActive && (
              <div className="lg:col-span-7 app-bg-main border border-blue-500/30 rounded-2xl p-5 space-y-4 shadow-sm animate-in slide-in-from-right-3 duration-200">
                <div className="flex items-center justify-between border-b app-border pb-3">
                  <h4 className="text-sm font-extrabold app-text-main uppercase tracking-wider flex items-center gap-2">
                    <FiTag className="text-blue-600" />
                    <span>{editingTierId === 'NEW' ? 'Tạo Loại Vé Mới' : 'Chỉnh Sửa Thông Tin Loại Vé'}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setEditingTierId(null)}
                    className="p-1 rounded-lg app-text-muted hover:app-text-main hover:bg-slate-500/10 cursor-pointer"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 text-xs font-semibold">
                  {/* Tên loại vé */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold app-text-muted">
                        Tên loại vé <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] app-text-muted font-mono">{name.length} / 50</span>
                    </div>
                    <input
                      type="text"
                      maxLength={50}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ví dụ: Vé VVIP, Vé GA, Early Bird..."
                      className="w-full px-3.5 py-2.5 rounded-xl app-bg-card border app-border text-xs app-text-main font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Giá vé (VNĐ) & Free Checkbox */}
                  <div>
                    <label className="block text-xs font-bold app-text-muted mb-1">
                      Giá vé (VNĐ) <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min={0}
                          step={10000}
                          disabled={isFree}
                          value={isFree ? 0 : price}
                          onChange={(e) => setPrice(Number(e.target.value))}
                          className="w-full pl-8 pr-3 py-2.5 rounded-xl app-bg-card border app-border text-xs font-mono font-bold app-text-main focus:outline-none focus:border-blue-500 disabled:opacity-50"
                        />
                        <FiDollarSign className="w-4 h-4 text-emerald-500 absolute left-2.5 top-3" />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold app-text-main">
                        <input
                          type="checkbox"
                          checked={isFree}
                          onChange={(e) => {
                            setIsFree(e.target.checked);
                            if (e.target.checked) setPrice(0);
                          }}
                          className="w-4 h-4 rounded border-slate-700 app-bg-card text-blue-600 focus:ring-blue-500"
                        />
                        <span>Vé miễn phí (0đ)</span>
                      </label>
                    </div>
                  </div>

                  {/* Quantities Row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold app-text-muted mb-1">Tổng số lượng vé *</label>
                      <input
                        type="number"
                        min={1}
                        value={totalQuantity}
                        onChange={(e) => setTotalQuantity(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl app-bg-card border app-border text-xs font-mono font-bold text-center app-text-main"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold app-text-muted mb-1">Số vé tối thiểu/đơn</label>
                      <input
                        type="number"
                        min={1}
                        value={minPerOrder}
                        onChange={(e) => setMinPerOrder(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl app-bg-card border app-border text-xs font-mono font-bold text-center app-text-main"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold app-text-muted mb-1">Số vé tối đa/đơn</label>
                      <input
                        type="number"
                        min={1}
                        value={maxPerOrder}
                        onChange={(e) => setMaxPerOrder(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl app-bg-card border app-border text-xs font-mono font-bold text-center app-text-main"
                      />
                    </div>
                  </div>

                  {/* Dates Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold app-text-muted mb-1">Ngày bắt đầu bán vé *</label>
                      <input
                        type="datetime-local"
                        value={startSaleDate}
                        onChange={(e) => setStartSaleDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl app-bg-card border app-border text-xs font-mono font-bold app-text-main"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold app-text-muted mb-1">Ngày kết thúc bán vé *</label>
                      <input
                        type="datetime-local"
                        value={endSaleDate}
                        onChange={(e) => setEndSaleDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl app-bg-card border app-border text-xs font-mono font-bold app-text-main"
                      />
                    </div>
                  </div>

                  {/* Quyền lợi */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold app-text-muted">Thông tin quyền lợi vé</label>
                      <span className="text-[11px] app-text-muted font-mono">{description.length} / 1000</span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={1000}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Quyền lợi đi kèm của hạng vé..."
                      className="w-full px-3.5 py-2.5 rounded-xl app-bg-card border app-border text-xs app-text-main focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t app-border">
                  <button
                    type="button"
                    onClick={() => setEditingTierId(null)}
                    className="px-4 py-2 rounded-xl app-bg-card border app-border app-text-muted text-xs font-bold hover:app-text-main cursor-pointer"
                  >
                    Đóng form
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveForm}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm cursor-pointer"
                  >
                    {editingTierId === 'NEW' ? 'Tạo Loại Vé' : 'Cập Nhật Loại Vé'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t app-border bg-slate-500/5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4.5 py-2 text-xs font-bold rounded-xl app-bg-main border app-border app-text-muted hover:app-text-main transition-colors cursor-pointer"
          >
            {readOnly ? 'Đóng' : 'Hủy bỏ'}
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-6 py-2 text-xs font-extrabold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs cursor-pointer"
            >
              Đồng bộ hạng vé
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const portalTarget = typeof document !== 'undefined' ? (document.fullscreenElement || document.body) : null;
  if (!portalTarget) return null;

  return createPortal(modalContent, portalTarget);
};

export default TierManagerModal;
