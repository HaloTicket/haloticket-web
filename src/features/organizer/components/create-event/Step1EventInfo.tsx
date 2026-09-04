import React, { useRef } from "react";
import {
  FiUploadCloud,
  FiMapPin,
  FiGlobe,
  FiBold,
  FiItalic,
  FiUnderline,
  FiList,
  FiImage,
  FiChevronRight,
  FiCheckCircle,
  FiAlertCircle,
  FiTrash2,
  FiBookmark
} from "react-icons/fi";
import type { Step1Errors } from "@/types/organizer";

interface Step1EventInfoProps {
  title: string;
  setTitle: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  locationType: "offline" | "online";
  setLocationType: (v: "offline" | "online") => void;
  locationName: string;
  setLocationName: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  ward: string;
  setWard: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  posterImage: string | null;
  setPosterImage: (v: string | null) => void;
  bannerImage: string | null;
  setBannerImage: (v: string | null) => void;
  description: string;
  setDescription: (v: string) => void;
  organizerName: string;
  setOrganizerName: (v: string) => void;
  organizerInfo: string;
  setOrganizerInfo: (v: string) => void;
  organizerLogo: string | null;
  setOrganizerLogo: (v: string | null) => void;
  errors: Step1Errors;
  isOrganizerPreFilled?: boolean;
  onSaveDraft?: () => void;
  onNext: () => void;
}

export const Step1EventInfo: React.FC<Step1EventInfoProps> = ({
  title,
  setTitle,
  category,
  setCategory,
  locationType,
  setLocationType,
  locationName,
  setLocationName,
  city,
  setCity,
  ward,
  setWard,
  address,
  setAddress,
  posterImage,
  setPosterImage,
  bannerImage,
  setBannerImage,
  description,
  setDescription,
  organizerName,
  setOrganizerName,
  organizerInfo,
  setOrganizerInfo,
  organizerLogo,
  setOrganizerLogo,
  errors,
  isOrganizerPreFilled = false,
  onSaveDraft,
  onNext
}) => {
  const posterInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setter(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    // reset input value so selecting the same file again triggers onChange
    e.target.value = "";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Upload Images Section */}
      <div className="app-bg-card border app-border rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b app-border pb-4">
          <h3 className="text-lg font-extrabold app-text-main flex items-center gap-2">
            <span className="text-blue-600 dark:text-blue-400 font-black">*</span>
            <span>Upload hình ảnh sự kiện</span>
          </h3>
          <span className="text-xs app-text-muted">Định dạng JPG, PNG (Tối đa 5MB)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Poster 3:4 Upload Box */}
          <div className="md:col-span-5 flex flex-col space-y-2">
            <label className="text-xs font-bold app-text-main">
              Ảnh sự kiện dọc (Khuyên dùng: 720 x 958 px)
            </label>
            <input
              type="file"
              ref={posterInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, setPosterImage)}
            />
            <div
              onClick={() => posterInputRef.current?.click()}
              className="relative aspect-[3/4] w-full rounded-2xl border-2 border-dashed app-border hover:border-blue-500 transition-colors app-bg-subnav flex flex-col items-center justify-center p-4 text-center cursor-pointer group overflow-hidden"
            >
              {posterImage ? (
                <div className="relative w-full h-full group">
                  <img src={posterImage} alt="Poster" className="w-full h-full object-cover rounded-xl" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        posterInputRef.current?.click();
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md hover:bg-blue-700"
                    >
                      <FiUploadCloud className="w-3.5 h-3.5" />
                      <span>Đổi ảnh</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPosterImage(null);
                      }}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md hover:bg-rose-700"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FiUploadCloud className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-extrabold app-text-main mb-1">
                    Thêm ảnh poster sự kiện
                  </span>
                  <span className="text-[11px] app-text-muted">Kéo thả hoặc bấm để chọn ảnh</span>
                </>
              )}
            </div>
          </div>

          {/* Banner 16:9 Upload Box */}
          <div className="md:col-span-7 flex flex-col space-y-2">
            <label className="text-xs font-bold app-text-main">
              Ảnh nền / Banner ngang (Khuyên dùng: 1280 x 720 px)
            </label>
            <input
              type="file"
              ref={bannerInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, setBannerImage)}
            />
            <div
              onClick={() => bannerInputRef.current?.click()}
              className="relative aspect-[16/9] w-full rounded-2xl border-2 border-dashed app-border hover:border-blue-500 transition-colors app-bg-subnav flex flex-col items-center justify-center p-6 text-center cursor-pointer group overflow-hidden"
            >
              {bannerImage ? (
                <div className="relative w-full h-full group">
                  <img src={bannerImage} alt="Banner" className="w-full h-full object-cover rounded-xl" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        bannerInputRef.current?.click();
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md hover:bg-blue-700"
                    >
                      <FiUploadCloud className="w-3.5 h-3.5" />
                      <span>Đổi ảnh</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBannerImage(null);
                      }}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md hover:bg-rose-700"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FiUploadCloud className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-extrabold app-text-main mb-1">
                    Thêm ảnh nền Banner ngang
                  </span>
                  <span className="text-[11px] app-text-muted">Hiển thị ở trang chi tiết & carousel chính</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* General Info Form Section */}
      <div className="app-bg-card border app-border rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
        <h3 className="text-lg font-extrabold app-text-main border-b app-border pb-4">
          Thông tin chung sự kiện
        </h3>

        {/* Event Title */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold app-text-main">
              <span className="text-rose-500 font-bold">*</span> Tên sự kiện
            </label>
            <span className="text-[11px] app-text-muted">{title.length} / 100</span>
          </div>
          <input
            type="text"
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nhập tên sự kiện nổi bật..."
            className={`w-full app-bg-subnav app-text-main placeholder-zinc-400 text-sm rounded-xl px-4 py-3 border ${errors.title ? "border-rose-500 ring-1 ring-rose-500" : "app-border"
              } focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium`}
          />
          {errors.title && (
            <p className="text-xs text-rose-500 font-bold mt-1 flex items-center gap-1">
              <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.title}</span>
            </p>
          )}
        </div>

        {/* Category Dropdown */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold app-text-main">
            <span className="text-rose-500 font-bold">*</span> Thể loại sự kiện
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-3 border ${errors.category ? "border-rose-500 ring-1 ring-rose-500" : "app-border"
              } focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold cursor-pointer`}
          >
            <option value="Nhạc sống">Nhạc sống</option>
            <option value="Sân khấu & Nghệ thuật">Sân khấu & Nghệ thuật</option>
            <option value="Thể thao">Thể thao</option>
            <option value="Hội thảo & Workshop">Hội thảo & Workshop</option>
            <option value="Tham quan & Trải nghiệm">Tham quan & Trải nghiệm</option>
            <option value="Khác">Khác</option>
          </select>
          {errors.category && (
            <p className="text-xs text-rose-500 font-bold mt-1 flex items-center gap-1">
              <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.category}</span>
            </p>
          )}
        </div>

        {/* Event Location */}
        <div className="space-y-4 pt-2">
          <label className="text-xs font-bold app-text-main block">
            <span className="text-rose-500 font-bold">*</span> Hình thức tổ chức địa điểm
          </label>

          {/* Offline / Online Selector */}
          <div className="inline-flex p-1 app-bg-subnav rounded-xl border app-border">
            <button
              type="button"
              onClick={() => setLocationType("offline")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${locationType === "offline"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "app-text-muted hover:app-text-main"
                }`}
            >
              <FiMapPin className="w-4 h-4" />
              <span>Sự kiện Offline</span>
            </button>
            <button
              type="button"
              onClick={() => setLocationType("online")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${locationType === "online"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "app-text-muted hover:app-text-main"
                }`}
            >
              <FiGlobe className="w-4 h-4" />
              <span>Sự kiện Online (Trực tuyến)</span>
            </button>
          </div>

          {locationType === "offline" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1 md:col-span-2">
                <div className="flex justify-between text-xs font-bold app-text-main">
                  <span><span className="text-rose-500">*</span> Tên địa điểm</span>
                  <span className="text-[11px] app-text-muted">{locationName.length} / 80</span>
                </div>
                <input
                  type="text"
                  maxLength={80}
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Ví dụ: Nhà hát Hòa Bình, Sân vận động Mỹ Đình..."
                  className={`w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-3 border ${errors.locationName ? "border-rose-500 ring-1 ring-rose-500" : "app-border"
                    } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                />
                {errors.locationName && (
                  <p className="text-xs text-rose-500 font-bold mt-1 flex items-center gap-1">
                    <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.locationName}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold app-text-main"><span className="text-rose-500">*</span> Tỉnh/Thành phố</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={`w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-3 border ${errors.city ? "border-rose-500 ring-1 ring-rose-500" : "app-border"
                    } cursor-pointer`}
                >
                  <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                  <option value="Hà Nội">Hà Nội</option>
                  <option value="Đà Nẵng">Đà Nẵng</option>
                  <option value="Cần Thơ">Cần Thơ</option>
                  <option value="Hải Phòng">Hải Phòng</option>
                </select>
                {errors.city && (
                  <p className="text-xs text-rose-500 font-bold mt-1 flex items-center gap-1">
                    <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.city}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold app-text-main">Phường/Xã</label>
                <input
                  type="text"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  placeholder="Nhập Phường/Xã..."
                  className="w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-3 border app-border"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <div className="flex justify-between text-xs font-bold app-text-main">
                  <span><span className="text-rose-500">*</span> Số nhà, tên đường</span>
                  <span className="text-[11px] app-text-muted">{address.length} / 80</span>
                </div>
                <input
                  type="text"
                  maxLength={80}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ví dụ: 240 Đường 3/2, Phường 12..."
                  className={`w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-3 border ${errors.address ? "border-rose-500 ring-1 ring-rose-500" : "app-border"
                    }`}
                />
                {errors.address && (
                  <p className="text-xs text-rose-500 font-bold mt-1 flex items-center gap-1">
                    <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.address}</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event Description Rich Text Section */}
      <div className="app-bg-card border app-border rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
        <h3 className="text-lg font-extrabold app-text-main border-b app-border pb-3">
          <span className="text-rose-500 font-bold">*</span> Mô tả chi tiết nội dung sự kiện
        </h3>

        {/* Rich Text Formatting Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-2 app-bg-subnav border app-border rounded-xl">
          <button type="button" className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold app-text-main cursor-pointer" title="Bold">
            <FiBold className="w-4 h-4" />
          </button>
          <button type="button" className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold app-text-main cursor-pointer" title="Italic">
            <FiItalic className="w-4 h-4" />
          </button>
          <button type="button" className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold app-text-main cursor-pointer" title="Underline">
            <FiUnderline className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
          <button type="button" className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold app-text-main cursor-pointer" title="List">
            <FiList className="w-4 h-4" />
          </button>
          <button type="button" className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold app-text-main cursor-pointer" title="Image">
            <FiImage className="w-4 h-4" />
          </button>
        </div>

        <textarea
          rows={10}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`w-full app-bg-subnav app-text-main text-sm rounded-xl p-4 border ${errors.description ? "border-rose-500 ring-1 ring-rose-500" : "app-border"
            } focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono leading-relaxed`}
        />
        {errors.description && (
          <p className="text-xs text-rose-500 font-bold mt-1 flex items-center gap-1">
            <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errors.description}</span>
          </p>
        )}
      </div>

      {/* Organizer Info Section */}
      <div className="app-bg-card border app-border rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b app-border pb-4">
          <h3 className="text-lg font-extrabold app-text-main">
            Thông tin Ban Tổ Chức (BTC)
          </h3>
          {isOrganizerPreFilled && (
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-full border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
              <FiCheckCircle className="w-3.5 h-3.5" />
              <span>Đã tự động tải từ hồ sơ Ban tổ chức của bạn</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Logo Upload */}
          <div className="md:col-span-4 space-y-2">
            <label className="text-xs font-bold app-text-main">Logo Ban Tổ Chức (275 x 275 px)</label>
            <input
              type="file"
              ref={logoInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, setOrganizerLogo)}
            />
            <div
              onClick={() => logoInputRef.current?.click()}
              className="relative w-36 h-36 rounded-2xl border-2 border-dashed app-border hover:border-blue-500 app-bg-subnav flex flex-col items-center justify-center p-3 text-center cursor-pointer overflow-hidden group"
            >
              {organizerLogo ? (
                <div className="relative w-full h-full group">
                  <img src={organizerLogo} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        logoInputRef.current?.click();
                      }}
                      className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
                      title="Đổi logo"
                    >
                      <FiUploadCloud className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrganizerLogo(null);
                      }}
                      className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-sm"
                      title="Xóa logo"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <FiUploadCloud className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold app-text-main">Thêm logo BTC</span>
                </>
              )}
            </div>
          </div>

          {/* Organizer Name & Description */}
          <div className="md:col-span-8 space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold app-text-main">
                <span><span className="text-rose-500">*</span> Tên Ban Tổ Chức</span>
                <span className="text-[11px] app-text-muted">{organizerName.length} / 80</span>
              </div>
              <input
                type="text"
                maxLength={80}
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                placeholder="Nhập tên công ty hoặc thương hiệu BTC..."
                className={`w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-3 border ${errors.organizerName ? "border-rose-500 ring-1 ring-rose-500" : "app-border"
                  }`}
              />
              {errors.organizerName && (
                <p className="text-xs text-rose-500 font-bold mt-1 flex items-center gap-1">
                  <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.organizerName}</span>
                </p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold app-text-main">
                <span>Thông tin mô tả Ban Tổ Chức</span>
                <span className="text-[11px] app-text-muted">{organizerInfo.length} / 500</span>
              </div>
              <textarea
                rows={3}
                maxLength={500}
                value={organizerInfo}
                onChange={(e) => setOrganizerInfo(e.target.value)}
                placeholder="Giới thiệu uy tín & kinh nghiệm của Ban tổ chức..."
                className={`w-full app-bg-subnav app-text-main text-sm rounded-xl p-4 border ${
                  errors.organizerInfo ? "border-rose-500 ring-1 ring-rose-500" : "app-border"
                }`}
              />
              {errors.organizerInfo && (
                <p className="text-xs text-rose-500 font-bold mt-1 flex items-center gap-1">
                  <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.organizerInfo}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Next Step Action Button & Save Draft */}
      <div className="flex items-center justify-between pt-4">
        {onSaveDraft && (
          <button
            type="button"
            onClick={onSaveDraft}
            className="px-6 py-3 app-bg-subnav app-text-main font-bold text-sm rounded-xl border app-border hover:border-blue-500 flex items-center gap-2 cursor-pointer transition-all"
          >
            <FiBookmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Lưu bản nháp</span>
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95 ml-auto"
        >
          <span>Tiếp tục: Thời gian & Loại vé</span>
          <FiChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Step1EventInfo;
