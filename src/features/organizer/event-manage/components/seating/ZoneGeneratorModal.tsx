import React, { useState } from 'react';
import { FiX, FiGrid, FiPlus } from 'react-icons/fi';
import type { SeatTier, ZoneGeneratorModalProps } from '@/types/seating';

// zone area block generator modal component
export const ZoneGeneratorModal: React.FC<ZoneGeneratorModalProps> = ({
  isOpen,
  onClose,
  tiers,
  onGenerateZone,
}) => {
  // zone generator form state
  const [zoneName, setZoneName] = useState('Khán đài A');
  const [rowPrefix, setRowPrefix] = useState('A');
  const [rowCount, setRowCount] = useState(4);
  const [seatsPerRow, setSeatsPerRow] = useState(10);
  const [tierId, setTierId] = useState(tiers[0]?.id || '');

  if (!isOpen) return null;

  // submit form handler for zone creation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim()) return;

    onGenerateZone(
      zoneName.trim(),
      rowPrefix.toUpperCase().trim(),
      Number(rowCount),
      Number(seatsPerRow),
      tierId || tiers[0]?.id
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg flex flex-col rounded-2xl app-bg-card border app-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b app-border bg-slate-500/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-600 flex items-center justify-center font-bold">
              <FiGrid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold app-text-main">
                Tạo Khối Khu Vực Ghế Mới
              </h3>
              <p className="text-xs app-text-muted">
                Tự động sinh ma trận hàng ghế và vị trí theo cấu hình mong muốn
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

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold app-text-muted mb-1">
              Tên Khu Vực (Zone) *
            </label>
            <input
              type="text"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              placeholder="VD: Khán đài A1, Khu VIP Tầng 1..."
              required
              className="w-full px-3 py-2 rounded-xl app-bg-main border app-border text-xs app-text-main font-bold focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold app-text-muted mb-1">
                Ký hiệu hàng *
              </label>
              <input
                type="text"
                value={rowPrefix}
                onChange={(e) => setRowPrefix(e.target.value)}
                maxLength={3}
                placeholder="A"
                required
                className="w-full px-3 py-2 rounded-xl app-bg-main border app-border text-xs font-mono font-bold text-center uppercase app-text-main focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] app-text-muted mt-0.5 block">Bắt đầu (VD: A)</span>
            </div>

            <div>
              <label className="block text-xs font-bold app-text-muted mb-1">
                Số hàng ghế *
              </label>
              <input
                type="number"
                min={1}
                max={26}
                value={rowCount}
                onChange={(e) => setRowCount(Number(e.target.value))}
                required
                className="w-full px-3 py-2 rounded-xl app-bg-main border app-border text-xs font-mono font-bold text-center app-text-main focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] app-text-muted mt-0.5 block">(Tối đa 26)</span>
            </div>

            <div>
              <label className="block text-xs font-bold app-text-muted mb-1">
                Ghế / Hàng *
              </label>
              <input
                type="number"
                min={1}
                max={40}
                value={seatsPerRow}
                onChange={(e) => setSeatsPerRow(Number(e.target.value))}
                required
                className="w-full px-3 py-2 rounded-xl app-bg-main border app-border text-xs font-mono font-bold text-center app-text-main focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] app-text-muted mt-0.5 block">(Tối đa 40)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold app-text-muted mb-1">
              Mặc định Hạng vé cho khu vực này
            </label>
            <select
              value={tierId}
              onChange={(e) => setTierId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl app-bg-main border app-border text-xs app-text-main font-bold focus:outline-none focus:border-blue-500"
            >
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.price.toLocaleString('vi-VN')} đ)
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold flex justify-between">
            <span>Tổng số ghế sẽ tạo:</span>
            <span className="font-mono text-sm font-extrabold">{rowCount * seatsPerRow} ghế</span>
          </div>

          {/* Footer */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl app-bg-main border app-border app-text-muted hover:app-text-main transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs cursor-pointer"
            >
              <FiPlus className="w-4 h-4" />
              <span>Tạo Khu Vực</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
