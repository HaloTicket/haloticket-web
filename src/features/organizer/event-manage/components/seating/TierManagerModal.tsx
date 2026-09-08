import React, { useState } from 'react';
import { FiX, FiPlus, FiTrash2, FiEdit2, FiCheck, FiDollarSign, FiTag } from 'react-icons/fi';
import type { SeatTier, TierManagerModalProps } from '@/types/seating';

const PRESET_COLORS = [
  { name: 'Khung Kim Cương', color: 'bg-amber-500 text-amber-950 border-amber-400', hex: '#f59e0b' },
  { name: 'Tím Vàng (Gold)', color: 'bg-purple-600 text-white border-purple-400', hex: '#9333ea' },
  { name: 'Xanh Lam (VIP)', color: 'bg-blue-600 text-white border-blue-400', hex: '#2563eb' },
  { name: 'Xanh Ngọc (Silver)', color: 'bg-emerald-500 text-emerald-950 border-emerald-400', hex: '#10b981' },
  { name: 'Cam Lửa (Zone A)', color: 'bg-orange-500 text-white border-orange-400', hex: '#f97316' },
  { name: 'Hồng Phấn (VIP Special)', color: 'bg-pink-500 text-white border-pink-400', hex: '#ec4899' },
  { name: 'Xám Chuẩn (Standard)', color: 'bg-slate-600 text-white border-slate-400', hex: '#475569' },
  { name: 'Xanh Cyan (Cat 1)', color: 'bg-cyan-500 text-cyan-950 border-cyan-400', hex: '#06b6d4' },
];

// ticket tier manager modal component
export const TierManagerModal: React.FC<TierManagerModalProps> = ({
  isOpen,
  onClose,
  tiers,
  onSaveTiers,
}) => {
  // local ticket tiers state
  const [localTiers, setLocalTiers] = useState<SeatTier[]>(tiers);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(500000);
  const [color, setColor] = useState(PRESET_COLORS[0].color);
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  // start adding tier handler
  const handleStartAdd = () => {
    setEditingTierId('NEW');
    setName('');
    setPrice(500000);
    setColor(PRESET_COLORS[0].color);
    setDescription('');
  };

  // start editing tier handler
  const handleStartEdit = (tier: SeatTier) => {

    setEditingTierId(tier.id);
    setName(tier.name);
    setPrice(tier.price);
    setColor(tier.color);
    setDescription(tier.description || '');
  };

  const handleSaveItem = () => {
    if (!name.trim()) return;

    if (editingTierId === 'NEW') {
      const newTier: SeatTier = {
        id: `tier-${Date.now()}`,
        name: name.trim(),
        price: Number(price),
        color,
        description: description.trim(),
      };
      setLocalTiers((prev) => [...prev, newTier]);
    } else if (editingTierId) {
      setLocalTiers((prev) =>
        prev.map((t) =>
          t.id === editingTierId
            ? { ...t, name: name.trim(), price: Number(price), color, description: description.trim() }
            : t
        )
      );
    }
    setEditingTierId(null);
  };

  const handleDeleteItem = (id: string) => {
    if (localTiers.length <= 1) {
      alert('Phải giữ ít nhất 1 hạng vé trong sơ đồ!');
      return;
    }
    setLocalTiers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSaveAll = () => {
    onSaveTiers?.(localTiers);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl flex flex-col rounded-2xl app-bg-card border app-border shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b app-border bg-slate-500/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-600 flex items-center justify-center font-bold">
              <FiTag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold app-text-main">
                Quản Lý Hạng Vé & Giá Vé
              </h3>
              <p className="text-xs app-text-muted">
                Thêm, sửa giá tiền và màu hiển thị phân biệt các hạng vé trên sơ đồ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center app-text-muted hover:app-text-main hover:bg-slate-500/10 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* List of Tiers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold app-text-muted uppercase tracking-wider">
                Danh sách Hạng vé hiện tại ({localTiers.length})
              </span>
              <button
                type="button"
                onClick={handleStartAdd}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <FiPlus className="w-4 h-4" />
                <span>Thêm hạng vé mới</span>
              </button>
            </div>

            <div className="space-y-2">
              {localTiers.map((tier) => (
                <div
                  key={tier.id}
                  className="flex items-center justify-between p-3.5 rounded-xl app-bg-main border app-border hover:border-blue-500/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center ${tier.color} shadow-xs`}>
                      ★
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold app-text-main">
                          {tier.name}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-500">
                        {tier.price.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(tier)}
                      className="p-2 text-xs font-bold rounded-lg app-bg-card border app-border app-text-muted hover:app-text-main transition-colors cursor-pointer"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(tier.id)}
                      className="p-2 text-xs font-bold rounded-lg app-bg-card border app-border text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit / Add Drawer */}
          {editingTierId && (
            <div className="p-4 rounded-xl app-bg-main border border-blue-500/40 space-y-4 animate-in slide-in-from-top-2 duration-200">
              <h4 className="text-xs font-extrabold app-text-main uppercase tracking-wider flex items-center gap-2">
                <FiTag className="text-blue-600" />
                <span>{editingTierId === 'NEW' ? 'Thêm Hạng Vé Mới' : 'Chỉnh Sửa Hạng Vé'}</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold app-text-muted mb-1">
                    Tên hạng vé *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: VIP Diamond, Zone A, Vé Standard..."
                    className="w-full px-3 py-2 rounded-xl app-bg-card border app-border text-xs app-text-main font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold app-text-muted mb-1">
                    Giá vé (VNĐ) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      step={50000}
                      className="w-full pl-8 pr-3 py-2 rounded-xl app-bg-card border app-border text-xs font-mono font-bold app-text-main focus:outline-none focus:border-blue-500"
                    />
                    <FiDollarSign className="w-4 h-4 text-emerald-500 absolute left-2.5 top-2.5" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold app-text-muted mb-1.5">
                  Màu sắc đại diện trên sơ đồ ghế
                </label>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setColor(preset.color)}
                      className={`h-9 rounded-xl ${preset.color} flex items-center justify-center font-bold text-xs transition-transform hover:scale-105 cursor-pointer relative ${color === preset.color ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900 scale-105' : ''
                        }`}
                      title={preset.name}
                    >
                      {color === preset.color && <FiCheck className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTierId(null)}
                  className="px-3.5 py-1.5 rounded-xl app-bg-card border app-border app-text-muted text-xs font-bold hover:app-text-main cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveItem}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Lưu Hạng Vé
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t app-border bg-slate-500/5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl app-bg-main border app-border app-text-muted hover:app-text-main transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSaveAll}
            className="px-5 py-2 text-xs font-extrabold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs cursor-pointer"
          >
            Đồng bộ hạng vé
          </button>
        </div>
      </div>
    </div>
  );
};
