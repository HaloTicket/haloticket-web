import React, { useState } from 'react';
import { FiShoppingCart, FiTag, FiTrash2, FiCreditCard, FiCheckCircle } from 'react-icons/fi';
import type { Seat, AttendeePreviewProps } from '@/types/seating';

// attendee cart preview component
export const AttendeePreview: React.FC<AttendeePreviewProps> = ({
  cart,
  tiers = [],
  zones,
  onRemoveCartSeat,
  onClearCart,
}) => {
  // checkout state
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
      alert(
        `🎉 GIẢ LẬP ĐẶT VÉ THÀNH CÔNG!\n\nBạn đã chọn mua thành công ${cart.length} vé.\nTỔNG SỐ TIỀN: ${totalPrice.toLocaleString(
          'vi-VN'
        )} VNĐ\n\nMã vé điện tử QR Code đã được đồng bộ trực tiếp vào hệ thống vé!`
      );
      onClearCart();
      setIsSuccess(false);
    }, 500);
  };

  return (
    <aside className="p-5 rounded-2xl app-bg-card border app-border flex flex-col justify-between w-full shadow-xs space-y-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b app-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center font-bold">
            <FiShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold app-text-main uppercase tracking-wider">
              Giỏ Hàng Vé Chọn (Khán Giả)
            </h3>
            <p className="text-[10px] app-text-muted">Góc nhìn trải nghiệm thực tế của người mua vé</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[11px] font-bold font-mono border border-emerald-500/20">
          {cart.length} vé
        </span>
      </div>

      {/* Cart Item List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 min-h-[220px]">
        {cart.length > 0 ? (
          cart.map((seat) => {
            const tier = getSeatTier(seat);
            const price = tier?.price ?? (zones && seat.zoneId ? zones[seat.zoneId]?.price : undefined) ?? 0;
            return (
              <div
                key={seat.id}
                className="p-3 rounded-xl app-bg-main border app-border flex items-center justify-between shadow-2xs hover:border-blue-500/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-8 rounded-full ${tier?.color || 'bg-blue-600'}`} />
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-extrabold app-text-main">
                      <FiTag className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Ghế {seat.row}-{seat.col}</span>
                    </div>
                    <span className="text-[11px] app-text-muted block">
                      {tier?.name || 'Vé Standard'}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-500">
                      {price.toLocaleString('vi-VN')} đ
                    </span>
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
          <div className="p-6 rounded-xl app-bg-main border border-dashed app-border text-center space-y-2 flex flex-col items-center justify-center my-auto">
            <FiTag className="w-8 h-8 text-slate-400 opacity-50" />
            <p className="text-xs app-text-muted font-medium">Giỏ hàng thử nghiệm đang trống.</p>
            <p className="text-[11px] app-text-muted opacity-80">
              Nhấp trực tiếp vào ghế khả dụng trên sơ đồ để thử nghiệm luồng mua vé của khán giả.
            </p>
          </div>
        )}
      </div>

      {/* Total & Checkout Section */}
      <div className="pt-3 border-t app-border space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="app-text-muted uppercase">Tổng Tiền Vé Dự Kiến:</span>
          <span className="font-mono text-base font-extrabold text-emerald-500">
            {totalPrice.toLocaleString('vi-VN')} đ
          </span>
        </div>

        <button
          type="button"
          onClick={handleSimulateCheckout}
          disabled={cart.length === 0 || isSuccess}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSuccess ? (
            <FiCheckCircle className="w-4 h-4 animate-bounce" />
          ) : (
            <FiCreditCard className="w-4 h-4" />
          )}
          <span>Giả Lập Thanh Toán Vé ({cart.length})</span>
        </button>
      </div>
    </aside>
  );
};
