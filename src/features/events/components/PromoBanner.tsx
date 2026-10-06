import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import React from "react";

interface PromoBannerProps {
  type?: "vib" | "shopee" | "greensm";
  className?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
}

export const PromoBanner: React.FC<PromoBannerProps> = ({
  type = "vib",
  className = "my-10",
  title,
  subtitle,
  description,
  imageUrl,
  buttonText,
  buttonUrl
}) => {
  useTranslation();
  const bannerConfigs = {
    vib: {
      bg: "bg-slate-900 dark:bg-slate-900/90",
      partnerColor: "text-blue-400",
      partner: "VIB | HALOTICKET",
      title: "MỞ THẺ MỚI - NHẬN LIÊN ƯU ĐÃI 500K",
      subtitle: "Mua vé Idol cực hời khi thanh toán bằng thẻ VIB Platinum",
      cta: "Mở thẻ ngay"
    },
    shopee: {
      bg: "bg-slate-900 dark:bg-slate-900/90",
      partnerColor: "text-amber-400",
      partner: "SPayLater | ShopeePay",
      title: "SĂN VÉ TẠI HALOTICKET - GIẢM ĐẾN 100.000 ĐỒNG",
      subtitle: "Khi thanh toán bằng Ví ShopeePay hoặc SPayLater - Mua Trước Trả Sau",
      cta: "Nhận voucher"
    },
    greensm: {
      bg: "bg-slate-900 dark:bg-slate-900/90",
      partnerColor: "text-emerald-400",
      partner: "GREEN SM | HaloTicket",
      title: "MUA VÉ SỰ KIỆN - NHẬN ƯU ĐÃI GREEN SM DEAL 50K",
      subtitle: "Áp dụng cho dịch vụ Taxi Xanh khi di chuyển đến các sự kiện",
      cta: "Nhận ưu đãi"
    }
  };

  const config = bannerConfigs[type];
  const displayTitle = title || config.title;
  const displaySubtitle = subtitle || config.partner;
  const displayDescription = description || config.subtitle;
  const displayCta = buttonText || config.cta;
  const bgImage = imageUrl ? `url(${imageUrl})` : undefined;

  return (
    <div
      className={`relative w-full rounded-2xl ${imageUrl ? 'bg-slate-900 bg-cover bg-center' : config.bg} border border-slate-200/80 dark:border-slate-800/80 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 overflow-hidden shadow-sm ${className}`}
      style={bgImage ? { backgroundImage: bgImage } : {}}
    >
      {imageUrl && <div className="absolute inset-0 bg-slate-900/70" />}
      <div className="z-10 max-w-2xl text-center md:text-left">
        {/* Crisp Subtitle */}
        <div className={`text-xs md:text-sm font-black tracking-widest uppercase mb-1.5 ${imageUrl ? 'text-amber-400' : config.partnerColor}`}>
          {translate(displaySubtitle)}
        </div>
        {/* Title */}
        <h3 className="text-lg md:text-2xl font-black text-white leading-tight mb-2 tracking-tight">
          {translate(displayTitle)}
        </h3>
        {/* Description */}
        <p className="text-xs md:text-sm text-slate-300 font-medium">
          {translate(displayDescription)}
        </p>
      </div>

      <div className="z-10 shrink-0 mt-2 md:mt-0">
        <a 
          href={buttonUrl || "#"}
          className="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-extrabold text-xs md:text-sm rounded-xl shadow-sm transition-all shrink-0 active:scale-95 cursor-pointer"
        >
          {translate(displayCta)}
        </a>
      </div>

      {/* Decorative Blur Elements */}
      {!imageUrl && (
        <div className="absolute right-0 top-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
      )}
    </div>
  );
};

export default PromoBanner;
