import React from "react";

interface PromoBannerProps {
  type?: "vib" | "shopee" | "greensm";
  className?: string;
}

export const PromoBanner: React.FC<PromoBannerProps> = ({
  type = "vib",
  className = "my-10"
}) => {
  const bannerConfigs = {
    vib: {
      bg: "bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900",
      border: "border-brand-500/40",
      partner: "VIB | HaloTicket",
      title: "MỞ THẺ MỚI - NHẬN LIÊN ƯU ĐÃI 500K",
      subtitle: "Mua vé Idol cực hời khi thanh toán thẻ VIB Platinum",
      cta: "Mở thẻ ngay"
    },
    shopee: {
      bg: "bg-gradient-to-r from-slate-900 via-brand-950 to-indigo-900",
      border: "border-cyan-500/40",
      partner: "SPayLater | ShopeePay",
      title: "SĂN VÉ TẠI HALOTICKET - GIẢM ĐẾN 100.000 ĐỒNG",
      subtitle: "Khi thanh toán bằng Ví ShopeePay hoặc SPayLater - Mua Trước Trả Sau",
      cta: "Nhận voucher"
    },
    greensm: {
      bg: "bg-gradient-to-r from-indigo-950 via-slate-900 to-brand-900",
      border: "border-brand-500/40",
      partner: "GREEN SM | HaloTicket",
      title: "MUA VÉ SỰ KIỆN - NHẬN ƯU ĐÃI GREEN SM DEAL 50K",
      subtitle: "Áp dụng cho dịch vụ Taxi Xanh khi di chuyển đến sự kiện",
      cta: "Nhận ưu đãi"
    }
  };

  const config = bannerConfigs[type];

  return (
    <div
      className={`relative w-full rounded-2xl ${config.bg} border ${config.border} p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 overflow-hidden shadow-xl ${className}`}
    >
      <div className="z-10 max-w-2xl text-center md:text-left">
        <div className="text-xs font-bold text-accent-cyan tracking-wider uppercase mb-1">
          {config.partner}
        </div>
        <h3 className="text-lg md:text-2xl font-black text-white leading-tight mb-2">
          {config.title}
        </h3>
        <p className="text-xs md:text-sm text-slate-300 font-medium">
          {config.subtitle}
        </p>
      </div>

      <button
        type="button"
        className="z-10 px-6 py-2.5 gradient-btn text-white font-black text-xs md:text-sm rounded-xl shadow-lg shadow-brand-500/25 transition-all shrink-0 active:scale-95"
      >
        {config.cta}
      </button>

      {/* Decorative Glow */}
      <div className="absolute right-0 top-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};

export default PromoBanner;
