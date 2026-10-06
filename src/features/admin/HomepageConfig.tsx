import { useState } from "react";
import { FiSave, FiEye, FiImage, FiMonitor, FiSmartphone } from "react-icons/fi";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BannerConfig } from "./homepage-config/BannerConfig";
import { EventAreasConfig } from "./homepage-config/EventAreasConfig";
import type { Banner, EventSection } from "@/types/adminConfig";
import { adminConfigApi } from "@/services/adminConfigApi";
import { useEffect } from "react";

function HomepageLivePreview({ banners, sections }: { banners: Banner[], sections: EventSection[] }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const activeBanners = banners.filter(b => b.active);
  const topBanner = activeBanners.length > 0 ? activeBanners[0] : null;

  return (
    <div className="app-bg-card border app-border rounded-lg overflow-hidden flex flex-col shadow-sm" style={{ height: "calc(100vh - 120px)" }}>
      {/* Browser Chrome */}
      <div className="bg-[#565656] dark:bg-[#1E1E20] border-b app-border p-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 ml-2 w-16">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
        </div>
        <div className="flex items-center gap-2 bg-[#565656] dark:bg-[#1E1E20] rounded px-3 py-1 text-[10px] text-slate-400 border app-border flex-1 max-w-sm justify-center shadow-sm">
          halo-ticket.vn
        </div>
        <div className="flex items-center gap-1 w-16 justify-end mr-2">
          <button onClick={() => setDevice("desktop")} className={`p-1.5 rounded ${device === "desktop" ? "bg-white dark:bg-slate-800 shadow-sm text-blue-500" : "text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"}`}>
            <FiMonitor className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setDevice("mobile")} className={`p-1.5 rounded ${device === "mobile" ? "bg-white dark:bg-slate-800 shadow-sm text-blue-500" : "text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"}`}>
            <FiSmartphone className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {/* Viewport container */}
      <div className="flex-1 app-bg-main overflow-hidden flex justify-center py-4">
        {/* Actual screen wrapper */}
        <div 
          className={`bg-white dark:bg-[#1E1E20] overflow-y-auto custom-scrollbar transition-all duration-300 ease-in-out shadow-lg ${
            device === "mobile" 
              ? "w-[375px] rounded-3xl border-[6px] border-slate-800" 
              : "w-full mx-4 rounded border app-border"
          }`}
        >
          <div className="p-4 md:p-6">
            {/* Mock Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800/50">
              <div className="text-sm font-bold text-blue-600 dark:text-blue-500">HALOTICKET</div>
              <div className="flex gap-2">
                <div className="w-8 h-2 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                <div className="w-8 h-2 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
              </div>
            </div>

            {/* Hero Banner Preview */}
            {topBanner ? (
              <div className="w-full h-32 md:h-48 rounded-lg bg-slate-100 dark:bg-slate-800 mb-6 overflow-hidden relative group">
                <img src={topBanner.imageUrl} alt="banner" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
                   <h3 className="text-white font-semibold text-sm truncate">{topBanner.title}</h3>
                </div>
              </div>
            ) : (
              <div className="w-full h-32 md:h-48 rounded-lg bg-slate-50 dark:bg-slate-800/30 mb-6 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-700">
                <FiImage className="w-5 h-5 mb-1 opacity-50" />
                <span className="text-[10px] font-medium">Trống</span>
              </div>
            )}

            {/* Sections Preview */}
            <div className="space-y-6">
              {sections.map(section => (
                 <div key={section.id}>
                   <div className="flex items-center justify-between mb-3">
                     <h4 className="font-semibold text-sm app-text-main">{section.title}</h4>
                     <span className="text-[10px] text-blue-500">Xem thêm</span>
                   </div>
                   <div className={`grid gap-3 ${device === "mobile" ? "grid-cols-2" : "grid-cols-4"}`}>
                     {[1, 2, 3, 4, 5, 6, 7, 8].slice(0, Math.min(device === "mobile" ? 4 : 8, section.limit)).map(i => (
                       <div key={i} className="flex flex-col gap-2">
                         <div className="w-full aspect-[4/3] rounded bg-slate-100 dark:bg-slate-800/50 border app-border"></div>
                         <div className="w-10/12 h-2 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                         <div className="w-1/2 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                       </div>
                     ))}
                   </div>
                 </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomepageConfig() {
  const [isSaving, setIsSaving] = useState(false);
  
  const [banners, setBanners] = useState<Banner[]>([
    { id: "BN_1", title: "Khuyến mãi Hè Rực Rỡ", imageUrl: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800", active: true },
    { id: "BN_2", title: "Live Concert The Eras Tour", imageUrl: "https://images.unsplash.com/photo-1470229722913-7c092fb13809?w=800", active: true },
  ]);

  const [sections, setSections] = useState<EventSection[]>([
    { id: "SEC_1", title: "Sự kiện nổi bật", type: "featured", limit: 8 },
    { id: "SEC_2", title: "Resale / Pass vé an toàn", type: "resale", limit: 4 },
    { id: "SEC_3", title: "Sự kiện sắp diễn ra", type: "upcoming", limit: 8 },
    { id: "SEC_4", title: "Theo thể loại: Nhạc kịch", type: "category", limit: 4 },
  ]);

  useEffect(() => {
    adminConfigApi.getBanners().then(res => {
      const data = Array.isArray(res) ? res : res?.data;
      if (data?.length) setBanners(data);
    }).catch(() => {});
    
    adminConfigApi.getEventSections().then(res => {
      const data = Array.isArray(res) ? res : res?.data;
      if (data?.length) setSections(data);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await adminConfigApi.updateBanners(banners).catch(() => {});
      await adminConfigApi.updateEventSections(sections).catch(() => {});
      toast.success("Xuất bản cấu hình trang chủ thành công", {
        description: "Giao diện trang chủ đã được cập nhật."
      });
    } catch (error) {
      toast.error("Có lỗi xảy ra khi lưu cấu hình");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Nội dung & Quảng cáo"
        description="Quản lý cấu trúc giao diện trang chủ, banner quảng cáo và các khu vực hiển thị sự kiện."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => toast.info("Xem trước toàn bộ giao diện...")}
              className="inline-flex items-center min-h-9 gap-2 px-3.5 text-xs font-semibold rounded-md border app-border bg-white dark:bg-[#1E1E20] hover:bg-slate-50 dark:hover:bg-slate-800 app-text-main transition-colors shadow-sm"
            >
              <FiEye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center min-h-9 gap-2 px-3.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm disabled:opacity-50"
            >
              <FiSave className="w-3.5 h-3.5" />
              <span>{isSaving ? "Đang xử lý..." : "Xuất bản"}</span>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-6">
          <BannerConfig banners={banners} onChange={setBanners} />
          <EventAreasConfig sections={sections} onChange={setSections} />
        </div>
        <div className="lg:col-span-7 hidden lg:block sticky top-20">
          <HomepageLivePreview banners={banners} sections={sections} />
        </div>
      </div>
    </div>
  );
}

export default HomepageConfig;