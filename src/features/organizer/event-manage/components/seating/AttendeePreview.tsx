import React, { useState } from 'react';
import { FiShoppingCart, FiTag, FiTrash2, FiCreditCard, FiCheckCircle, FiShield, FiInfo } from 'react-icons/fi';
import type { Seat, AttendeePreviewProps } from '@/types/seating';

// high-end buyer simulation attendee cart preview component
export const AttendeePreview: React.FC<AttendeePreviewProps> = ({
  cart,
  tiers = [],
  zones,
  onRemoveCartSeat,
  onClearCart,
}) => {
  const [isSuccess, setIsSuccess] = useState(false);

  // get ticket tier for seat
  const getSeatTier = (seat: Seat) => {
    const tierId = seat.tierId || (zones && seat.zoneId ? zones[seat.zoneId]?.tierId : undefined);
    return (tiers || []).find((t) => t.id === tierId || t.id === seat.tierId || t.id === seat.zoneId);
  };

  // calculate total price
  const totalPrice = cart.reduce((sum, seat) => {
    const tier = getSeatTier(seat);
    const price = tier?.price ?? (zones && seat.zoneId ? zones[seat.zoneId]?.price : undefined) ?? 0;
    return sum + price;
  }, 0);

  // simulate checkout handler
  const handleSimulateCheckout = () => {
    setIsSuccess(true);
    setTimeout(() => {
      onClearCart();
      setIsSuccess(false);
    }, 1800);
  };

  return (
    <aside className="p-5 rounded-2xl app-bg-card border app-border flex flex-col justify-between w-full shadow-lg space-y-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b app-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold shadow-xs">
            <FiShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black app-text-main uppercase tracking-wider">
              Khán Giả Mô Phỏng Mua Vé
            </h3>
            <p className="text-[10px] app-text-muted mt-0.5">Trải nghiệm đặt vé trực quan như giao diện khán giả</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-extrabold font-mono border border-emerald-500/20">
          {cart.length} vé đã chọn
        </span>
      </div>

      {/* Available Ticket Tier Legend Badge Filters */}
      {tiers && tiers.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-extrabold app-text-muted uppercase tracking-wider block">
            Bảng Giá Các Hạng Vé Sự Kiện:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {tiers.map((t) => (
              <span
                key={t.id}
                className="px-2.5 py-1 rounded-lg app-bg-main border app-border text-[10px] font-bold flex items-center gap-1.5 shadow-2xs"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color || '#3b82f6' }} />
                <span className="app-text-main">{t.name}:</span>
                <span className="font-mono text-emerald-400">{t.price.toLocaleString('vi-VN')}đ</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cart Item List */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] min-h-[160px] pr-1">
        {cart.length > 0 ? (
          cart.map((seat) => {
            const tier = getSeatTier(seat);
            const price = tier?.price ?? (zones && seat.zoneId ? zones[seat.zoneId]?.price : undefined) ?? 0;
            const zone = zones && seat.zoneId ? zones[seat.zoneId] : null;

            return (
              <div
                key={seat.id}
                className="p-3 rounded-xl app-bg-main border app-border flex items-center justify-between shadow-2xs hover:border-emerald-500/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-10 rounded-full shadow-xs"
                    style={{ backgroundColor: tier?.color || zone?.color || '#3b82f6' }}
                  />
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-extrabold app-text-main">
                      <FiTag className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{seat.number ? `Ghế ${seat.row}-${seat.number}` : `Vé ${seat.row}`}</span>
                      {zone && <span className="text-[10px] font-bold app-text-muted">({zone.name})</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-bold text-slate-300">
                        {tier?.name || 'Vé Thường'}
                      </span>
                      <span className="text-xs font-mono font-black text-emerald-400">
                        {price.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveCartSeat(seat.id)}
                  className="p-1.5 rounded-lg app-bg-card border app-border text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors cursor-pointer"
                  title="Xóa vé này khỏi giỏ"
                >
                  <FiTrash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        ) : (
          <div className="p-6 rounded-2xl app-bg-main border border-dashed app-border text-center space-y-2 flex flex-col items-center justify-center my-auto">
            <FiInfo className="w-7 h-7 text-emerald-500 opacity-60" />
            <p className="text-xs app-text-muted font-extrabold">Giỏ hàng mô phỏng đang trống.</p>
            <p className="text-[11px] app-text-muted opacity-80 leading-relaxed">
              Nhấp trực tiếp vào bất kỳ chiếc ghế nào trên sơ đồ 2D để trải nghiệm quá trình chọn mua vé trực tuyến của khán giả.
            </p>
          </div>
        )}
      </div>

      {/* Total & Checkout Section */}
      <div className="pt-3 border-t app-border space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="app-text-muted uppercase flex items-center gap-1.5">
            <FiShield className="w-3.5 h-3.5 text-blue-400" /> Tổng Tiền Vé:
          </span>
          <span className="font-mono text-lg font-black text-emerald-400">
            {totalPrice.toLocaleString('vi-VN')} đ
          </span>
        </div>

        {isSuccess ? (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in fade-in">
            <FiCheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Mô phỏng thanh toán thành công ({cart.length} vé)!</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSimulateCheckout}
            disabled={cart.length === 0}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <FiCreditCard className="w-4 h-4" />
            <span>Tiến Hành Đặt Vé Mô Phỏng ({cart.length})</span>
          </button>
        )}
      </div>
    </aside>
  );
};
