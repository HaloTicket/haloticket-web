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
      bg: "bg-gradient-to-r from-[#121629] via-[#1E1B4B] to-[#121629]",
      partnerColor: "text-cyan-400 dark:text-cyan-300",
      partner: "VIB | HaloTicket",
      title: "MỞ THẺ MỚI - NHẬN LIÊN ƯU ĐÃI 500K",
      subtitle: "Mua vé Idol cực hời khi thanh toán bằng thẻ VIB Platinum",
      cta: "Mở thẻ ngay"
    },
    shopee: {
      bg: "bg-gradient-to-r from-[#1E1B4B] via-[#0F172A] to-[#1E1B4B]",
      partnerColor: "text-amber-400 dark:text-amber-300",
      partner: "SPayLater | ShopeePay",
      title: "SĂN VÉ TẠI HALOTICKET - GIẢM ĐẾN 100.000 ĐỒNG",
      subtitle: "Khi thanh toán bằng Ví ShopeePay hoặc SPayLater - Mua Trước Trả Sau",
      cta: "Nhận voucher"
    },
    greensm: {
      bg: "bg-gradient-to-r from-[#0F172A] via-[#064E3B] to-[#0F172A]",
      partnerColor: "text-emerald-400 dark:text-emerald-300",
      partner: "GREEN SM | HaloTicket",
      title: "MUA VÉ SỰ KIỆN - NHẬN ƯU ĐÃI GREEN SM DEAL 50K",
      subtitle: "Áp dụng cho dịch vụ Taxi Xanh khi di chuyển đến các sự kiện",
      cta: "Nhận ưu đãi"
    }
  };

  const config = bannerConfigs[type];

  return (
    <div
      className={`relative w-full rounded-2xl ${config.bg} border border-slate-200/80 dark:border-slate-800/80 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 overflow-hidden shadow-lg ${className}`}
    >
      <div className="z-10 max-w-2xl text-center md:text-left">
        {/* Crisp Subtitle */}
        <div className={`text-xs md:text-sm font-black tracking-widest uppercase mb-1.5 ${config.partnerColor}`}>
          {config.partner}
        </div>
        {/* Title */}
        <h3 className="text-lg md:text-2xl font-black text-white leading-tight mb-2 tracking-tight">
          {config.title}
        </h3>
        {/* Description */}
        <p className="text-xs md:text-sm text-slate-300 font-medium">
          {config.subtitle}
        </p>
      </div>

      <button
        type="button"
        className="z-10 px-6 py-2.5 gradient-btn text-white font-extrabold text-xs md:text-sm rounded-xl shadow-md transition-all shrink-0 active:scale-95 cursor-pointer"
      >
        {config.cta}
      </button>

      {/* Decorative Glow Spheres */}
      <div className="absolute right-0 top-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};

export default PromoBanner;
