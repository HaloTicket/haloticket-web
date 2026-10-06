import { FiImage, FiPlus, FiTrash2, FiMove, FiToggleLeft, FiToggleRight, FiEdit2, FiLink, FiUploadCloud, FiList } from "react-icons/fi";
import { useState, useRef } from "react";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
import { CustomSelect } from "@/components/common/CustomSelect";
import type { Banner } from "@/types/adminConfig";
import { mediaApi } from "@/services/mediaApi";
import { toast } from "sonner";

interface Props {
  banners: Banner[];
  onChange: (banners: Banner[]) => void;
  onCollapse?: () => void;
}

export function BannerConfig({ banners, onChange, onCollapse }: Props) {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Banner>>({});
  const [uploadMode, setUploadMode] = useState<"url" | "upload">("url");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleBanner = (id: string) => {
    onChange(banners.map((b) => (b.id === id ? { ...b, active: !b.active } : b)));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    const items = [...banners];
    const draggedItem = items[draggedIdx];
    items.splice(draggedIdx, 1);
    items.splice(index, 0, draggedItem);
    setDraggedIdx(index);
    onChange(items);
  };

  const handleOpenModal = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({ ...banner });
      setUploadMode("url");
    } else {
      setEditingBanner(null);
      setFormData({
        title: "",
        active: true,
        sourceType: "manual",
        imageUrl: ""
      });
      setUploadMode("url");
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const res = (await mediaApi.uploadImage(file, "banners")) as any;
      setFormData(prev => ({ ...prev, imageUrl: res.url || res.data?.url || "" }));
      toast.success("Tải ảnh lên thành công");
    } catch (error) {
      toast.error("Lỗi tải ảnh lên");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveBanner = () => {
    if (!formData.title) {
      toast.error("Vui lòng nhập tên/tiêu đề banner");
      return;
    }
    
    let newBanners = [...banners];
    if (editingBanner) {
      newBanners = newBanners.map(b => b.id === editingBanner.id ? { ...b, ...formData } as Banner : b);
    } else {
      newBanners.push({ ...formData, id: `BN_${Date.now()}` } as Banner);
    }
    onChange(newBanners);
    setIsModalOpen(false);
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setIsConfirmOpen(true);
  };

  const handleDeleteBanner = () => {
    if (deletingId) {
      onChange(banners.filter(b => b.id !== deletingId));
      setIsConfirmOpen(false);
      setDeletingId(null);
    }
  };

  return (
    <div className="app-bg-card border app-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm app-text-main flex items-center gap-2">
          <FiImage className="w-4 h-4 text-slate-400" />
          Quản lý Banner (Hero Slider)
        </h3>
        <div className="flex items-center gap-2">
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="inline-flex items-center justify-center w-8 h-8 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
              title="Thu gọn cột"
            >
              <FiToggleLeft className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
          >
            <FiPlus className="w-3.5 h-3.5" />
            Thêm cấu hình
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={() => setDraggedIdx(null)}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
              draggedIdx === index
                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 opacity-80"
                : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-blue-500/30"
            } cursor-move group`}
          >
            <div className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors px-1">
              <FiMove className="w-4 h-4" />
            </div>
            
            <div className="relative overflow-hidden rounded bg-slate-200 dark:bg-slate-700">
              {banner.sourceType === "auto_events" ? (
                <div className="w-20 h-10 flex items-center justify-center bg-blue-500/10 text-blue-500">
                  <FiList className="w-5 h-5" />
                </div>
              ) : (
                <img src={banner.imageUrl} alt={banner.title} className="w-20 h-10 object-cover" />
              )}
              {!banner.active && <div className="absolute inset-0 bg-black/50" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className={`font-medium text-xs truncate ${banner.active ? "app-text-main" : "text-slate-400"}`}>
                {banner.title}
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {banner.sourceType === "auto_events" ? "Tự động lấy sự kiện mới nhất" : "Ảnh thủ công"}
              </p>
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => handleOpenModal(banner)}
                className="p-1.5 text-slate-400 hover:text-blue-500 rounded hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
              >
                <FiEdit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => toggleBanner(banner.id)}
                className={`transition-colors p-1.5 rounded ${
                  banner.active ? "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10" : "text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {banner.active ? <FiToggleRight className="w-5 h-5" /> : <FiToggleLeft className="w-5 h-5" />}
              </button>
              <button onClick={() => confirmDelete(banner.id)} className="p-1.5 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100">
                <FiTrash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {isModalOpen && (
        <AdminModal 
          title={editingBanner ? "Cấu hình Banner" : "Thêm cấu hình Banner"} 
          onClose={() => setIsModalOpen(false)}
          maxWidth="2xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium app-text-main">Tên / Tiêu đề gợi nhớ</label>
                <input 
                  type="text" 
                  value={formData.title || ""}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full pl-3 pr-3 min-h-9 text-xs rounded-md border app-border bg-slate-50 dark:bg-[#1E1E20] focus:bg-white dark:focus:bg-[#171719] outline-none focus:border-blue-500 transition-colors app-text-main" 
                  placeholder="Ví dụ: Banner Khuyến mãi, Auto Sự kiện..."
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium app-text-main">Nguồn dữ liệu Slider</label>
                <CustomSelect
                  value={formData.sourceType || "manual"}
                  onChange={(val: string) => setFormData({ ...formData, sourceType: val as "manual" | "auto_events" })}
                  options={[
                    { value: "auto_events", label: "Tự động lấy Sự kiện mới/nổi bật" },
                    { value: "manual", label: "Thêm ảnh thủ công (Custom)" }
                  ]}
                  placeholder="Chọn nguồn dữ liệu"
                />
              </div>

              {formData.sourceType === "auto_events" && (
                <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-4 border border-blue-100 dark:border-blue-500/20 text-blue-800 dark:text-blue-300">
                  <FiList className="w-5 h-5 mb-2" />
                  <h4 className="text-xs font-semibold mb-1">Tự động hóa</h4>
                  <p className="text-[11px] leading-relaxed opacity-80">Hệ thống sẽ tự động lấy tối đa 5 sự kiện mới nhất, đang hot hoặc sắp diễn ra để làm ảnh slider. Tiết kiệm thời gian thay vì tải ảnh lên.</p>
                </div>
              )}
              
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="activeBanner" 
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })} 
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                />
                <label htmlFor="activeBanner" className="text-xs font-medium app-text-main">Hiển thị ra trang chủ ngay</label>
              </div>
            </div>

            <div className="space-y-4 border-l app-border pl-6">
              {formData.sourceType === "manual" ? (
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-blue-500">Hình ảnh Custom</h4>
                  <div className="space-y-3">
                    <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-md">
                      <button
                        type="button"
                        onClick={() => setUploadMode("url")}
                        className={`flex-1 flex items-center justify-center gap-2 py-1 text-xs font-medium rounded-md transition-all ${
                          uploadMode === "url" ? "bg-white dark:bg-[#1E1E20] shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        }`}
                      >
                        <FiLink className="w-3.5 h-3.5" />
                        Nhập URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMode("upload")}
                        className={`flex-1 flex items-center justify-center gap-2 py-1 text-xs font-medium rounded-md transition-all ${
                          uploadMode === "upload" ? "bg-white dark:bg-[#1E1E20] shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        }`}
                      >
                        <FiUploadCloud className="w-3.5 h-3.5" />
                        Upload
                      </button>
                    </div>

                    {uploadMode === "url" ? (
                      <input 
                        type="text" 
                        value={formData.imageUrl || ""}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        className="w-full pl-3 pr-3 min-h-9 text-xs rounded-md border app-border bg-slate-50 dark:bg-[#1E1E20] focus:bg-white dark:focus:bg-[#171719] outline-none focus:border-blue-500 transition-colors app-text-main" 
                        placeholder="https://... (URL ảnh nền quảng cáo)"
                      />
                    ) : (
                      <div className="border border-dashed app-border rounded-lg p-3 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors relative overflow-hidden group">
                        {formData.imageUrl ? (
                           <>
                             <img src={formData.imageUrl} alt="Ads banner" className="w-full h-16 object-cover rounded" />
                             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <span className="text-white text-xs font-medium">{isUploading ? "Đang tải..." : "Thay đổi ảnh"}</span>
                             </div>
                           </>
                        ) : (
                          <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center cursor-pointer">
                            <FiUploadCloud className="w-5 h-5 text-blue-500 mb-1" />
                            <p className="text-[10px] font-medium">{isUploading ? "Đang tải..." : "Click hoặc thả ảnh banner"}</p>
                          </div>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium app-text-main">URL khi nhấn vào ảnh (Tùy chọn)</label>
                    <input 
                      type="text" 
                      value={formData.linkUrl || ""}
                      onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                      className="w-full pl-3 pr-3 min-h-8 text-[11px] rounded-md border app-border bg-white dark:bg-[#1E1E20] outline-none focus:border-blue-500 app-text-main" 
                      placeholder="https://..."
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col justify-center items-center text-center p-6 bg-slate-50 dark:bg-slate-800/30 rounded-lg border app-border">
                  <FiImage className="w-8 h-8 text-slate-300 mb-3" />
                  <p className="text-xs text-slate-500 font-medium">Chế độ tự động không cần upload ảnh.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t app-border">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="min-h-9 px-4 text-xs font-medium rounded-md border app-border hover:bg-slate-50 dark:hover:bg-[#1E1E20] text-slate-600 dark:text-slate-300 transition-colors"
            >
              Hủy bỏ
            </button>
            <button 
              onClick={handleSaveBanner}
              className="min-h-9 px-4 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Lưu cấu hình
            </button>
          </div>
        </AdminModal>
      )}

      {isConfirmOpen && (
        <AdminConfirmModal
          title="Xóa Banner"
          subtitle="Banner này sẽ bị gỡ khỏi hệ thống. Bạn có chắc chắn muốn xóa?"
          onConfirm={handleDeleteBanner}
          onClose={() => setIsConfirmOpen(false)}
          confirmText="Xóa banner"
          cancelText="Hủy"
        />
      )}
    </div>
  );
}
