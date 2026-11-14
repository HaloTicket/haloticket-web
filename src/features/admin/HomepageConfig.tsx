import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiSave, FiMonitor, FiSmartphone, FiChevronLeft, FiChevronRight, FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BannerConfig } from "./homepage-config/BannerConfig";
import { EventAreasConfig } from "./homepage-config/EventAreasConfig";
import type { Banner, EventSection } from "@/types/adminConfig";
import { adminConfigApi } from "@/services/adminConfigApi";
import { useEffect } from "react";
import Home from "@/features/events/Home";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createPortal } from "react-dom";
import { useRef } from "react";

function IframePreview({ children, className }: { children: React.ReactNode; className?: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    
    // Inject styles and meta
    const head = doc.head;
    
    // Add viewport meta tag so mobile media queries work correctly
    const meta = doc.createElement("meta");
    meta.name = "viewport";
    meta.content = "width=device-width, initial-scale=1.0";
    head.appendChild(meta);

    Array.from(document.head.querySelectorAll("style, link[rel='stylesheet']")).forEach(el => {
      head.appendChild(el.cloneNode(true));
    });
    
    // Setup html and body classes
    doc.documentElement.className = document.documentElement.className;
    doc.body.className = document.body.className;
    
    const rootDiv = doc.createElement("div");
    rootDiv.className = "min-h-screen flex flex-col app-bg-page transition-colors duration-300 font-sans antialiased selection:bg-brand-primary selection:text-white relative bg-white dark:bg-[#1E1E20]";
    doc.body.appendChild(rootDiv);
    
    setMountNode(rootDiv);
    
    return () => {
      rootDiv.remove();
    };
  }, []);

  return (
    <iframe ref={iframeRef} className={className} style={{ border: 'none', backgroundColor: 'transparent' }}>
      {mountNode && createPortal(children, mountNode)}
    </iframe>
  );
}

function HomepageLivePreview({ 
  banners, 
  sections,
  isExpanded,
}: { 
  banners: Banner[], 
  sections: EventSection[],
  isExpanded: boolean,
  onToggleExpand: () => void
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      if (device === "mobile") {
        setZoom(1);
      } else {
        if (isExpanded) {
          setZoom(Math.min(1, (window.innerWidth - 80) / 1280));
        } else {
          setZoom(Math.min(0.7, (window.innerWidth * 0.6 - 80) / 1280));
        }
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [device, isExpanded]);

  return (
    <div className="app-bg-card border app-border rounded-md overflow-hidden flex flex-col shadow-sm transition-all duration-300" style={{ height: "calc(100vh - 110px)" }}>
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
      <div className="flex-1 app-bg-main overflow-hidden flex justify-center py-4 relative">
        <div className="absolute inset-0 overflow-y-auto custom-scrollbar flex justify-center py-4">
          <div 
            className={`bg-white dark:bg-[#1E1E20] transition-all duration-300 ease-in-out shadow-lg transform origin-top ${
              device === "mobile" 
                ? "w-[620px] h-[932px] rounded-[3rem] border-[14px] border-slate-800 scale-[0.7] overflow-hidden shrink-0 mx-auto" 
                : "w-[1280px] rounded border app-border"
            }`}
            style={device === "desktop" ? { zoom } : undefined}
          >
            {device === "mobile" ? (
              <IframePreview className="w-full h-full border-0">
                <Header />
                <Home previewBanners={banners} previewSections={sections} />
                <Footer />
              </IframePreview>
            ) : (
              <>
                <div className="w-full">
                  <Header />
                </div>
                <div className="w-full">
                  <Home previewBanners={banners} previewSections={sections} />
                </div>
                <div className="w-full">
                  <Footer />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_SECTIONS: EventSection[] = [
  { id: "SEC_1", title: "Nghệ sĩ nổi bật", type: "featured", limit: 8 },
  { id: "SEC_2", title: "Sự kiện đặc biệt", type: "upcoming", limit: 8 },
  { id: "SEC_3", title: "Sự kiện xu hướng", type: "trending", limit: 8 },
  { id: "SEC_4", title: "Sàn Nhượng Vé Chính Thức", type: "resale", limit: 4 },
  { id: "SEC_5", title: "Theo thể loại: Nhạc sống", type: "categories", limit: 4 },
  { id: "SEC_6", title: "Theo thể loại: Sân khấu & Nghệ thuật", type: "categories", limit: 4 },
  { id: "SEC_7", title: "Theo thể loại: Hội thảo & Workshop", type: "categories", limit: 4 },
  { id: "SEC_8", title: "Theo thể loại: Tham quan & Trải nghiệm", type: "categories", limit: 4 },
  { id: "SEC_9", title: "Theo thể loại: Thể thao & Thể loại khác", type: "categories", limit: 4 },
  { id: "SEC_10", title: "Điểm đến thú vị", type: "locations", limit: 4 },
];

/** The message the backend sent, so a failed save says why. */
function apiErrorMessage(error: unknown, fallback: string): string {
  const e = error as { response?: { status?: number; data?: { message?: string; error?: string; detail?: string } } };
  const body = e.response?.data;
  const text = body?.message || body?.detail || body?.error;
  if (text) return text;
  if (e.response?.status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  return fallback;
}

export function HomepageConfig() {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const [banners, setBanners] = useState<Banner[]>([]);
  const [sections, setSections] = useState<EventSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usingTemplate, setUsingTemplate] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([adminConfigApi.getBanners(), adminConfigApi.getEventSections()])
      .then(([bannerRes, sectionRes]) => {
        if (!alive) return;
        const bannerData = Array.isArray(bannerRes) ? bannerRes : (bannerRes as { data?: Banner[] } | null)?.data;
        const sectionData = Array.isArray(sectionRes) ? sectionRes : (sectionRes as { data?: EventSection[] } | null)?.data;
        setBanners(Array.isArray(bannerData) ? bannerData : []);
        if (Array.isArray(sectionData) && sectionData.length > 0) {
          setSections(sectionData); // whatever is saved is shown as it is, however few sections
          setUsingTemplate(false);
        } else {
          setSections(DEFAULT_SECTIONS); // nothing saved yet: start from the template, published only when the admin saves
          setUsingTemplate(true);
        }
        setLoadError(null);
      })
      .catch((error) => {
        if (alive) setLoadError(apiErrorMessage(error, "Không tải được cấu hình trang chủ."));
      })
      .finally(() => {
        if (alive) setIsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const retry = () => {
    setIsLoading(true);
    setLoadError(null);
    setReloadKey((k) => k + 1);
  };

  const handleSave = async () => {
    const missingImage = banners.find((b) => !b.imageUrl);
    if (missingImage) {
      toast.error(t("Banner \"{{title}}\" chưa có ảnh.", { title: missingImage.title }));
      return;
    }
    setIsSaving(true);
    let savedBanners = false;
    try {
      await adminConfigApi.updateBanners(banners);
      savedBanners = true;
      await adminConfigApi.updateEventSections(sections);
      setUsingTemplate(false);
      toast.success(t("Xuất bản cấu hình trang chủ thành công"), {
        description: t("Giao diện trang chủ đã được cập nhật.")
      });
    } catch (error) {
      const reason = t(apiErrorMessage(error, "Có lỗi xảy ra khi lưu cấu hình"));
      toast.error(savedBanners ? t("Đã lưu banner nhưng chưa lưu được các khối nội dung.") : t("Chưa lưu được cấu hình trang chủ."), { description: reason });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("Nội dung & Quảng cáo")}
        description={t("Quản lý cấu trúc giao diện trang chủ, banner quảng cáo và các khu vực hiển thị sự kiện.")}
      />
      
      {loadError && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300" role="alert">
          <span className="flex items-center gap-2"><FiAlertCircle className="w-4 h-4 shrink-0" /> {t(loadError)}</span>
          <button type="button" onClick={retry} className="inline-flex items-center gap-1.5 px-3 min-h-8 text-xs font-semibold rounded-md border border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/30 cursor-pointer">
            <FiRefreshCw className="w-3.5 h-3.5" /> {t("Thử lại")}
          </button>
        </div>
      )}
      {usingTemplate && !loadError && !isLoading && (
        <p className="rounded-md border app-border app-bg-card px-4 py-3 text-xs app-text-muted">
          {t("Chưa có cấu hình trang chủ được lưu. Đang hiển thị bố cục mẫu; bấm Xuất bản để lưu.")}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleSave}
          disabled={isSaving || isLoading || !!loadError}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-9 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
        >
          <FiSave className="w-4 h-4" />
          <span>{isSaving ? t("Đang xử lý...") : t("Xuất bản")}</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start relative">
        <div className={`transition-all duration-500 ease-in-out shrink-0 overflow-hidden ${
          isSidebarCollapsed ? "w-0 opacity-0 m-0" : "w-full lg:w-[45%] xl:w-[40%] opacity-100"
        }`}>
          <div className="w-[100%] min-w-[300px] space-y-6">
            <BannerConfig banners={banners} onChange={setBanners} />
            <EventAreasConfig sections={sections} onChange={setSections} />
          </div>
        </div>
        
        {/* Sticky floating expand/collapse button */}
        <div className="absolute -left-3 top-6 z-10">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-8 h-8 rounded-full bg-white dark:bg-[#1E1E20] border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center text-slate-500 hover:text-blue-600 hover:scale-105 transition-all duration-300"
            title={isSidebarCollapsed ? t("Hiện thanh cài đặt") : t("Thu gọn thanh cài đặt")}
          >
            {isSidebarCollapsed ? <FiChevronRight className="w-4 h-4" /> : <FiChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <div className={`w-full ${isSidebarCollapsed ? "lg:w-full" : "lg:w-[55%] xl:w-[60%]"} hidden lg:block sticky top-6 transition-all duration-300`}>
          <HomepageLivePreview 
            banners={banners} 
            sections={sections} 
            isExpanded={isSidebarCollapsed}
            onToggleExpand={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>
      </div>
    </div>
  );
}

export default HomepageConfig;