import { getLocale } from "@/i18n";
import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import {
  FiLayout,
  FiImage,
  FiSliders,
  FiPlus,
  FiTrash2,
  FiEye,
  FiArrowUp,
  FiArrowDown,
  FiExternalLink,
  FiX,
  FiMousePointer,
  FiLayers,
  FiMonitor,
  FiSmartphone,
  FiSave,
  FiUploadCloud,
  FiLink
} from "react-icons/fi";

interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  order: number;
  isActive: boolean;
  clicks: number;
}

interface HomepageSection {
  id: string;
  name: string;
  description: string;
  order: number;
  isEnabled: boolean;
  type: "CAROUSEL" | "CATEGORIES" | "FEATURED" | "RESALE" | "BANNER_AD" | "UPCOMING";
}

interface AdPlacement {
  id: string;
  name: string;
  location: "HEADER_LEADERBOARD" | "MID_PAGE_BANNER" | "SIDEBAR_PROMO";
  sponsorName: string;
  imageUrl: string;
  targetUrl: string;
  clicks: number;
  ctr: string;
  isActive: boolean;
}

export const HomepageConfig: React.FC = () => {
  const { t: translate } = useTranslation();
  const [activeTab, setActiveTab] = useState<"BANNERS" | "SECTIONS" | "ADS">("BANNERS");

  // live preview modal state & device switcher
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"DESKTOP" | "MOBILE">("DESKTOP");
  const [publishSuccess, setPublishSuccess] = useState(false);

  // hero banners state
  const [banners, setBanners] = useState<HeroBanner[]>([
    {
      id: "BAN-1",
      title: "Concert Sơn Tùng M-TP Sky Tour 2026",
      subtitle: "Đặt vé sớm nhận quà tặng độc quyền từ BTC Halo",
      imageUrl: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80",
      linkUrl: "/events/EV_1001",
      order: 1,
      isActive: true,
      clicks: 8420
    },
    {
      id: "BAN-2",
      title: "Giải Chạy Đêm Saigon Night Run 2026",
      subtitle: "Chạy đêm xuyên thành phố cùng 5,000 vận động viên",
      imageUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=80",
      linkUrl: "/events/EV_1002",
      order: 2,
      isActive: true,
      clicks: 3950
    },
    {
      id: "BAN-3",
      title: "Kịch Nói: Đêm Cổ Tích Idecaf 2026",
      subtitle: "Vở kịch thiếu nhi được yêu thích nhất mùa hè",
      imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80",
      linkUrl: "/events/EV_1003",
      order: 3,
      isActive: true,
      clicks: 1840
    }
  ]);

  // homepage sections order state
  const [sections, setSections] = useState<HomepageSection[]>([
    {
      id: "SEC-1",
      name: "Hero Banner Carousel (Đầu trang)",
      description: "Banner hình ảnh lớn trượt ngang thu hút sự chú ý đầu tiên",
      order: 1,
      isEnabled: true,
      type: "CAROUSEL"
    },
    {
      id: "SEC-2",
      name: "Thanh Thể loại Danh mục (Category Pills)",
      description: "Lọc nhanh sự kiện theo Thể thao, Âm nhạc, Sân khấu...",
      order: 2,
      isEnabled: true,
      type: "CATEGORIES"
    },
    {
      id: "SEC-3",
      name: "Sự kiện Nổi bật (Featured Highlights)",
      description: "Danh sách 4-8 sự kiện hot nhất tuần do Admin chọn",
      order: 3,
      isEnabled: true,
      type: "FEATURED"
    },
    {
      id: "SEC-4",
      name: "Thị trường Vé Resale Hot",
      description: "Các vé người dùng nhượng lại có giá tốt hoặc sắp diễn ra",
      order: 4,
      isEnabled: true,
      type: "RESALE"
    },
    {
      id: "SEC-5",
      name: "Banner Quảng cáo Khuyến mãi (Middle Ad)",
      description: "Khối quảng cáo tài trợ hiển thị giữa trang chủ",
      order: 5,
      isEnabled: true,
      type: "BANNER_AD"
    },
    {
      id: "SEC-6",
      name: "Sự kiện Sắp diễn ra (Upcoming Events)",
      description: "Toàn bộ danh sách sự kiện xếp theo thời gian khởi tranh",
      order: 6,
      isEnabled: true,
      type: "UPCOMING"
    }
  ]);

  // ad placements state
  const [ads] = useState<AdPlacement[]>([
    {
      id: "AD-101",
      name: "Header Banner Leaderboard",
      location: "HEADER_LEADERBOARD",
      sponsorName: "Cổng Thanh toán PayOS",
      imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&q=80",
      targetUrl: "https://payos.vn",
      clicks: 5420,
      ctr: "4.8%",
      isActive: true
    },
    {
      id: "AD-102",
      name: "Mid-Page Campaign Banner",
      location: "MID_PAGE_BANNER",
      sponsorName: "VinFast Electric Vehicles",
      imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80",
      targetUrl: "https://vinfastauto.com",
      clicks: 3110,
      ctr: "3.2%",
      isActive: true
    }
  ]);

  // modal state for adding banner
  const [showAddBannerModal, setShowAddBannerModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newImgUrl, setNewImgUrl] = useState("");
  const [newTargetUrl, setNewTargetUrl] = useState("");
  const [imageInputMode, setImageInputMode] = useState<"FILE" | "URL">("FILE");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImgUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleBanner = (id: string) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b))
    );
  };

  const handleToggleSection = (id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isEnabled: !s.isEnabled } : s))
    );
  };

  const handleMoveSection = (index: number, direction: "UP" | "DOWN") => {
    const newArr = [...sections];
    const targetIdx = direction === "UP" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newArr.length) return;

    const temp = newArr[index];
    newArr[index] = newArr[targetIdx];
    newArr[targetIdx] = temp;

    // re-assign orders
    const updated = newArr.map((item, idx) => ({ ...item, order: idx + 1 }));
    setSections(updated);
  };

  const handleAddBanner = () => {
    if (!newTitle.trim()) return;
    const newBanner: HeroBanner = {
      id: `BAN-${Date.now().toString().slice(-4)}`,
      title: newTitle,
      subtitle: newSubtitle || "Chương trình sự kiện HaloTicket",
      imageUrl: newImgUrl || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80",
      linkUrl: newTargetUrl || "/events",
      order: banners.length + 1,
      isActive: true,
      clicks: 0
    };
    setBanners((prev) => [...prev, newBanner]);
    setShowAddBannerModal(false);
    setNewTitle("");
    setNewSubtitle("");
    setNewImgUrl("");
    setNewTargetUrl("");
  };

  const handlePublishConfig = () => {
    setPublishSuccess(true);
    setTimeout(() => {
      setPublishSuccess(false);
      setShowLivePreview(false);
    }, 1500);
  };

  const activeBanners = banners.filter((b) => b.isActive).sort((a, b) => a.order - b.order);
  const enabledSections = sections.filter((s) => s.isEnabled).sort((a, b) => a.order - b.order);
  const activeMidAd = ads.find((a) => a.isActive && a.location === "MID_PAGE_BANNER");

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Stats Overview */}
      <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[11px] font-bold border border-blue-200 dark:border-blue-800">
              <FiLayout className="w-3.5 h-3.5" />
              <span>{translate("Homepage Layout & Ads CMS")}</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold app-text-main">
              {translate("Cấu hình Giao diện Trang chủ & Quảng cáo")} </h2>
            <p className="text-xs app-text-muted">
              {translate("Tùy chỉnh các khối hiển thị trang chủ, banner slider sự kiện nổi bật và đặt banner đối tác tài trợ.")} </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Preview Button */}
            <button
              type="button"
              onClick={() => setShowLivePreview(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FiEye className="w-4 h-4" />
              <span>{translate("Xem trước Trang chủ (Live Preview)")}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddBannerModal(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FiPlus className="w-4 h-4" />
              <span>{translate("Thêm Banner Hero mới")}</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">{translate("Banner Hero Đang Chạy")}</span>
              <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                {banners.filter((b) => b.isActive).length} / {banners.length} {translate("Active")} </span>
            </div>
            <FiImage className="w-5 h-5 text-blue-500/50" />
          </div>

          <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">{translate("Khối Section Hiển Thị")}</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {sections.filter((s) => s.isEnabled).length} / {sections.length} {translate("Bật")} </span>
            </div>
            <FiLayers className="w-5 h-5 text-emerald-500/50" />
          </div>

          <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">{translate("Tổng Lượt Click Banner")}</span>
              <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">{translate("14.2k Clicks")}</span>
            </div>
            <FiMousePointer className="w-5 h-5 text-indigo-500/50" />
          </div>

          <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">{translate("Vị trí Quảng cáo (Ads)")}</span>
              <span className="text-base font-bold text-purple-600 dark:text-purple-400">{translate("2 Banner Tài trợ")}</span>
            </div>
            <FiExternalLink className="w-5 h-5 text-purple-500/50" />
          </div>
        </div>

        {/* Tab Buttons Navigation */}
        <div className="flex items-center gap-1.5 border-t border-slate-200 dark:border-slate-800 pt-3">
          {[
            { id: "BANNERS", label: "Hero Banners Carousel (Slider Đầu Trang)" },
            { id: "SECTIONS", label: "Sắp xếp & Bật/Tắt Section Trang Chủ" },
            { id: "ADS", label: "Banner Quảng cáo & Đối tác (Ads Placements)" }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as "BANNERS" | "SECTIONS" | "ADS")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
            >
              {translate(tab.label)}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: HERO BANNERS MANAGEMENT */}
      {activeTab === "BANNERS" && (
        <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold app-text-main flex items-center gap-2">
              <FiImage className="w-4 h-4 text-blue-600" />
              <span>{translate("Danh sách Banner Slider Hero (")}{banners.length})</span>
            </h3>
            <span className="text-xs text-slate-400">{translate("Thứ tự hiển thị từ 1 đến N")}</span>
          </div>

          <div className="space-y-3">
            {banners.map((b) => (
              <div
                key={b.id}
                className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={b.imageUrl}
                      alt={translate(b.title)}
                    className="w-24 h-14 rounded-md object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs"
                  />
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                        {translate("Thứ tự #")}{b.order}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${b.isActive
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900"
                            : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900"
                          }`}
                      >
                        {b.isActive ? translate("ĐANG HIỂN THỊ") : translate("ĐÃ ẨN")}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold app-text-main truncate">{translate(b.title)}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{translate(b.subtitle)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-200 dark:border-slate-800 pt-2.5 md:pt-0">
                  <div className="text-right">
                    <span className="text-[10px] font-semibold text-slate-400 block">{translate("Lượt Click")}</span>
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                      {b.clicks.toLocaleString(getLocale())} {translate("clicks")} </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleBanner(b.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold border cursor-pointer transition-all ${b.isActive
                          ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 border-amber-200 dark:border-amber-900"
                          : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border-emerald-200 dark:border-emerald-900"
                        }`}
                    >
                      {b.isActive ? translate("Ẩn Banner") : translate("Hiện Banner")}
                    </button>

                    <button
                      type="button"
                      onClick={() => setBanners((prev) => prev.filter((item) => item.id !== b.id))}
                      className="p-1.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-900 cursor-pointer"
                      title={translate("Xóa Banner")}
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: SECTIONS ORDER & TOGGLE */}
      {activeTab === "SECTIONS" && (
        <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold app-text-main flex items-center gap-2">
              <FiSliders className="w-4 h-4 text-blue-600" />
              <span>{translate("Quản lý Bật/Tắt & Thứ tự Các Khối Nội dung Trang Chủ")}</span>
            </h3>
            <span className="text-xs text-slate-400">{translate("Sử dụng nút Lên/Xuống để đổi vị trí")}</span>
          </div>

          <div className="space-y-2.5">
            {sections.map((sec, idx) => (
              <div
                key={sec.id}
                className={`p-3.5 rounded-md border transition-all flex items-center justify-between gap-4 ${sec.isEnabled
                    ? "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
                    : "bg-slate-100/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60"
                  }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center border border-blue-200 dark:border-blue-800 shrink-0">
                    #{sec.order}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold app-text-main truncate">{translate(sec.name)}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{translate(sec.description)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Move Up/Down Controls */}
                  <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-2">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveSection(idx, "UP")}
                      className="p-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                      title={translate("Chuyển lên trên")}
                    >
                      <FiArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === sections.length - 1}
                      onClick={() => handleMoveSection(idx, "DOWN")}
                      className="p-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                      title={translate("Chuyển xuống dưới")}
                    >
                      <FiArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Toggle Enable/Disable Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleSection(sec.id)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${sec.isEnabled
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                  >
                    {sec.isEnabled ? translate("ĐANG BẬT") : translate("ĐÃ TẮT")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ADS & SPONSORS MANAGEMENT */}
      {activeTab === "ADS" && (
        <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold app-text-main flex items-center gap-2">
              <FiExternalLink className="w-4 h-4 text-blue-600" />
              <span>{translate("Quản lý Vị trí Banner Quảng cáo & Nhà tài trợ")}</span>
            </h3>
            <span className="text-xs text-slate-400">{translate("Theo dõi tỷ lệ CTR và lượt click tài trợ")}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ads.map((ad) => (
              <div
                key={ad.id}
                className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-[10px] font-bold border border-purple-200 dark:border-purple-800">
                    {ad.location}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {translate("CTR:")} {ad.ctr}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold app-text-main">{ad.name}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {translate("Nhà tài trợ:")} <span className="font-bold app-text-main">{ad.sponsorName}</span>
                  </p>
                </div>

                <img
                  src={ad.imageUrl}
                  alt={ad.name}
                  className="w-full h-24 rounded-md object-cover border border-slate-200 dark:border-slate-700"
                />

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <span className="font-mono text-slate-500">{ad.clicks.toLocaleString(getLocale())} {translate("Clicks")}</span>
                  <a
                    href={ad.targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>{translate("Xem Link đích")}</span>
                    <FiExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Add Hero Banner */}
      {showAddBannerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 max-w-md w-full shadow-xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold app-text-main">{translate("Thêm Banner Hero Mới")}</h3>
              <button
                type="button"
                onClick={() => setShowAddBannerModal(false)}
                className="p-1 rounded-md text-slate-400 cursor-pointer"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold app-text-main block">{translate("Tiêu đề Banner (*)")}</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={translate("Ví dụ: Concert Mùa Thu 2026 - Mua vé ngay")}
                  className="w-full bg-white dark:bg-slate-800 app-text-main text-xs font-medium rounded-md p-2.5 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold app-text-main block">{translate("Mô tả phụ (Subtitle)")}</label>
                <input
                  type="text"
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  placeholder={translate("Ví dụ: Ưu đãi hoàn 10% khi thanh toán qua PayOS")}
                  className="w-full bg-white dark:bg-slate-800 app-text-main text-xs font-medium rounded-md p-2.5 border border-slate-200 dark:border-slate-700"
                />
              </div>

              {/* Image Input Source Switcher */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold app-text-main block">{translate("Hình ảnh Banner (*)")}</label>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setImageInputMode("FILE")}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 transition-all cursor-pointer ${imageInputMode === "FILE"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                    >
                      <FiUploadCloud className="w-3 h-3" />
                      <span>{translate("Tải từ máy")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode("URL")}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 transition-all cursor-pointer ${imageInputMode === "URL"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                    >
                      <FiLink className="w-3 h-3" />
                      <span>{translate("Dán Link URL")}</span>
                    </button>
                  </div>
                </div>

                {imageInputMode === "FILE" ? (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:border-blue-500 transition-colors cursor-pointer text-center space-y-1.5">
                    <FiUploadCloud className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-semibold app-text-main block">
                      {uploadedFileName ? `Đã chọn: ${uploadedFileName}` : translate("Bấm để chọn tệp hình ảnh từ máy tính")}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{translate("Hỗ trợ JPG, PNG, WEBP, GIF (Tối đa 5MB)")}</span>
                    <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                  </label>
                ) : (
                  <input
                    type="text"
                    value={newImgUrl}
                    onChange={(e) => setNewImgUrl(e.target.value)}
                    placeholder={translate("https://images.unsplash.com/...")}
                    className="w-full bg-white dark:bg-slate-800 app-text-main text-xs font-medium rounded-md p-2.5 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                )}

                {/* Real-time Preview Thumbnail */}
                {newImgUrl && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 block">{translate("Xem trước ảnh đã chọn:")}</span>
                    <img
                      src={newImgUrl}
                      alt={translate("Banner Preview")}
                      className="w-full h-24 object-cover rounded-md border border-slate-200 dark:border-slate-700 shadow-xs"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold app-text-main block">{translate("Link điều hướng (Target URL)")}</label>
                <input
                  type="text"
                  value={newTargetUrl}
                  onChange={(e) => setNewTargetUrl(e.target.value)}
                  placeholder={translate("/events/EV_1001 hoặc link ngoài")}
                  className="w-full bg-white dark:bg-slate-800 app-text-main text-xs font-medium rounded-md p-2.5 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddBannerModal(false)}
                className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                {translate("Hủy")} </button>
              <button
                type="button"
                onClick={handleAddBanner}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md shadow-xs cursor-pointer"
              >
                {translate("Lưu Banner")} </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN LIVE HOMEPAGE PREVIEW MODAL */}
      {showLivePreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
          {/* Top Control Bar of Live Preview */}
          <div className="app-bg-card border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-3 flex items-center justify-between gap-4 shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block leading-tight">
                  {translate("Chế độ Xem trước Trực tiếp (Draft Live Preview)")} </span>
                <h3 className="text-sm font-bold app-text-main leading-tight">
                  {translate("Mô phỏng Giao diện Trang chủ HaloTicket Client")} </h3>
              </div>
            </div>

            {/* Device Switcher Controls */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-md border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPreviewDevice("DESKTOP")}
                className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${previewDevice === "DESKTOP"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
              >
                <FiMonitor className="w-3.5 h-3.5" />
                <span>{translate("Máy tính (Desktop)")}</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("MOBILE")}
                className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${previewDevice === "MOBILE"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
              >
                <FiSmartphone className="w-3.5 h-3.5" />
                <span>{translate("Di động (Mobile)")}</span>
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowLivePreview(false)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-md hover:bg-slate-300 cursor-pointer"
              >
                {translate("Đóng Xem trước")} </button>

              <button
                type="button"
                onClick={handlePublishConfig}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <FiSave className="w-3.5 h-3.5" />
                <span>{translate("Lưu & Xuất bản ngay (Publish Live)")}</span>
              </button>
            </div>
          </div>

          {/* Success Banner Overlay when Published */}
          {publishSuccess && (
            <div className="bg-emerald-600 text-white text-center py-2 font-bold text-xs animate-in slide-in-from-top duration-150">
              {translate("Đã lưu và xuất bản cấu hình mới lên Trang chủ Client thành công!")} </div>
          )}

          {/* Simulator Viewport Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 flex justify-center app-bg-page">
            <div
              className={`app-bg-card border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ${previewDevice === "MOBILE" ? "w-[390px] min-h-[750px] my-auto" : "w-full max-w-6xl min-h-[800px]"
                }`}
            >
              {/* Simulated Client Header Bar */}
              <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between bg-slate-900 text-white">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center font-bold text-xs">
                    {translate("HT")} </div>
                  <span className="font-extrabold text-xs tracking-wider">{translate("HALOTICKET")}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">{translate("http://localhost:5173/")}</div>
              </div>

              {/* Dynamic Section Renderer */}
              <div className="space-y-6 p-4 md:p-6">
                {enabledSections.map((sec) => {
                  if (sec.type === "CAROUSEL") {
                    return (
                      <div key={sec.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-blue-600 uppercase">{translate("Khối #1: Hero Banner Carousel")}</span>
                          <span className="text-[10px] text-slate-400">({activeBanners.length} {translate("banners hoạt động)")}</span>
                        </div>
                        {activeBanners.length > 0 ? (
                          <div className="relative rounded-xl overflow-hidden h-48 md:h-64 shadow-md bg-slate-900 group">
                            <img
                              src={activeBanners[0].imageUrl}
                              alt={translate(activeBanners[0].title)}
                              className="w-full h-full object-cover opacity-80"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent p-5 flex flex-col justify-end text-white">
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-600 rounded w-max mb-1">
                                {translate("ĐẶC SẮC")} </span>
                              <h3 className="text-base md:text-xl font-extrabold">{translate(activeBanners[0].title)}</h3>
                              <p className="text-xs text-slate-200 opacity-90">{translate(activeBanners[0].subtitle)}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 text-center bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 text-xs">
                            {translate("Không có Banner Hero nào đang bật")} </div>
                        )}
                      </div>
                    );
                  }

                  if (sec.type === "CATEGORIES") {
                    return (
                      <div key={sec.id} className="space-y-2">
                        <span className="text-[10px] font-bold text-blue-600 uppercase">{translate("Khối: Category Pills")}</span>
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                          {["Tất cả", "Âm nhạc", "Thể thao", "Sân khấu & Nghệ thuật", "Hội thảo", "E-Sports"].map(
                            (cat, i) => (
                              <span
                                key={i}
                                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${i === 0
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-100 dark:bg-slate-800 app-text-muted"
                                  }`}
                              >
                                {translate(cat)}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (sec.type === "FEATURED") {
                    return (
                      <div key={sec.id} className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
                          <span className="text-xs font-bold app-text-main uppercase">{translate("🔥 Sự kiện Nổi bật Hot")}</span>
                          <span className="text-[10px] text-blue-600 font-semibold">{translate("Xem tất cả →")}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { title: "Sơn Tùng M-TP Sky Tour 2026", price: "1.500.000 đ", date: "25/09/2026" },
                            { title: "Saigon Night Run Half Marathon", price: "650.000 đ", date: "10/10/2026" }
                          ].map((item, idx) => (
                            <div key={idx} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 app-bg-subnav space-y-1.5">
                              <span className="text-xs font-bold app-text-main block">{translate(item.title)}</span>
                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span>{translate(item.date)}</span>
                                <span className="font-bold text-blue-600">{translate(item.price)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (sec.type === "RESALE") {
                    return (
                      <div key={sec.id} className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
                          <span className="text-xs font-bold text-emerald-600 uppercase">{translate("Vé Resale Nhượng lại Hot (Khớp lệnh ngay)")}</span>
                          <span className="text-[10px] text-emerald-600 font-semibold">{translate("Khám phá vé →")}</span>
                        </div>
                        <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-xs space-y-1">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">{translate("Vé Resale Sơn Tùng M-TP VIP 088")}</span>
                          <p className="text-[11px] text-slate-500">{translate("Giá nhượng lại: 1.750.000 đ (+16% giá gốc)")}</p>
                        </div>
                      </div>
                    );
                  }

                  if (sec.type === "BANNER_AD") {
                    return (
                      <div key={sec.id} className="space-y-1">
                        <span className="text-[10px] font-bold text-purple-600 uppercase">{translate("Banner Quảng cáo Tài trợ (Mid-Page Ad)")}</span>
                        {activeMidAd ? (
                          <div className="relative rounded-lg overflow-hidden h-20 shadow-xs border border-purple-200 dark:border-purple-900">
                            <img src={activeMidAd.imageUrl} alt={activeMidAd.name} className="w-full h-full object-cover" />
                            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-bold">
                              {translate("TÀI TRỢ BY")} {activeMidAd.sponsorName}
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 text-center bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 text-xs">
                            {translate("Không có Banner Quảng cáo nào đang hiển thị")} </div>
                        )}
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomepageConfig;
