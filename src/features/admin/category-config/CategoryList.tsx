import { useState, useEffect, useRef } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiUploadCloud, FiLink, FiLock, FiUnlock } from "react-icons/fi";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
import type { Category } from "@/types/adminConfig";
import { adminConfigApi } from "@/services/adminConfigApi";
import { mediaApi } from "@/services/mediaApi";
import { toast } from "sonner";

export function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadMode, setUploadMode] = useState<"url" | "upload">("url");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Category>>({
    name: "",
    slug: "",
    imageUrl: "",
    active: true
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const res = await adminConfigApi.getCategories().catch(() => ([] as Category[]));
      
      const data = Array.isArray(res) ? res : (res?.data || []);
      setCategories(data);
    } catch (error) {
      toast.error("Lỗi tải danh mục");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setFormData({ ...cat });
      setUploadMode("url");
    } else {
      setEditingCategory(null);
      setFormData({ name: "", slug: "", imageUrl: "", active: true });
      setUploadMode("url");
    }
    setIsModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Preview immediately
    const tempUrl = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, imageUrl: tempUrl }));
    
    try {
      setUploadingImage(true);
      const res = (await mediaApi.uploadImage(file, "categories")) as any;
      setFormData(prev => {
        if (prev.imageUrl === tempUrl) {
          return { ...prev, imageUrl: res?.imageUrl || res?.data?.imageUrl || "" };
        }
        return prev;
      });
    } catch (error) {
      toast.error("Lỗi tải ảnh lên");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      if (editingCategory) {
        await adminConfigApi.updateCategory(editingCategory.id, formData);
        setCategories(categories.map(c => c.id === editingCategory.id ? { ...c, ...formData } : c));
        toast.success("Cập nhật danh mục thành công");
      } else {
        const response: any = await adminConfigApi.addCategory(formData);
        const newCatData = response?.data || response;
        const newCat: Category = { ...formData, id: newCatData?.id || `C${Date.now()}`, eventCount: 0 } as Category;
        setCategories([...categories, newCat]);
        toast.success("Thêm danh mục thành công");
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmToggleStatus = (id: string) => {
    setTogglingId(id);
    setIsConfirmOpen(true);
  };

  const handleToggleStatus = async () => {
    if (!togglingId) return;
    const cat = categories.find(c => c.id === togglingId);
    if (!cat) return;
    try {
      const newStatus = cat.status === "INACTIVE" ? "ACTIVE" : "INACTIVE";
      await adminConfigApi.updateCategory(cat.id, { ...cat, status: newStatus });
      setCategories(categories.map(c => c.id === cat.id ? { ...c, status: newStatus } : c));
      toast.success(newStatus === "ACTIVE" ? "Đã mở khóa danh mục" : "Đã khóa danh mục");
    } catch (error) {
      toast.error("Có lỗi xảy ra khi cập nhật trạng thái");
    } finally {
      setIsConfirmOpen(false);
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-base app-text-main">Danh sách thể loại</h3>
        <button 
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-9 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          <FiPlus className="w-3.5 h-3.5" />
          Thêm mới
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-40 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="relative flex flex-col rounded-lg border app-border app-bg-card overflow-hidden hover:border-slate-400 dark:hover:border-slate-500 transition-colors group">
              {/* Card Header (Image) */}
              <div className="h-40 w-full relative app-bg-subnav border-b app-border">
                {cat.imageUrl ? (
                  <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <span className="text-xs font-medium">Không có ảnh</span>
                  </div>
                )}
                
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${cat.active ? "bg-emerald-500/90 text-white" : "bg-slate-800/90 text-slate-300"}`}>
                    {cat.active ? "Hiển thị" : "Đã ẩn"}
                  </span>
                  {cat.status === "INACTIVE" && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-rose-500/90 text-white">
                      Đã khóa
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="px-4 py-2 flex flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-sm app-text-main">{cat.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">/{cat.slug}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-xs font-medium app-text-main">{cat.eventCount}</span>
                  <span className="text-xs text-slate-500 ml-1">sự kiện</span>
                </div>
              </div>
              
              {/* Quick Actions Hover */}
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button onClick={() => handleOpenModal(cat)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-black/60 text-white text-xs font-medium hover:bg-black/80 transition-colors">
                  <FiEdit2 className="w-3.5 h-3.5" /> Sửa
                </button>
                <button onClick={() => confirmToggleStatus(cat.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white text-xs font-medium transition-colors ${cat.status === 'INACTIVE' ? 'bg-emerald-600/80 hover:bg-emerald-600' : 'bg-rose-600/80 hover:bg-rose-600'}`}>
                  {cat.status === 'INACTIVE' ? <FiUnlock className="w-3.5 h-3.5" /> : <FiLock className="w-3.5 h-3.5" />}
                  {cat.status === 'INACTIVE' ? 'Mở khóa' : 'Khóa'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <AdminModal 
          title={editingCategory ? "Sửa danh mục" : "Thêm danh mục mới"} 
          onClose={() => setIsModalOpen(false)}
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium app-text-main">Tên danh mục</label>
              <input 
                type="text" 
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-3 pr-3 min-h-9 text-xs rounded-md border app-border bg-slate-50 dark:bg-[#1E1E20] focus:bg-white dark:focus:bg-[#171719] outline-none focus:border-blue-500 transition-colors app-text-main" 
                placeholder="Ví dụ: Nhạc kịch"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium app-text-main">Đường dẫn (Slug)</label>
              <input 
                type="text" 
                value={formData.slug || ""}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full pl-3 pr-3 min-h-9 text-xs rounded-md border app-border bg-slate-50 dark:bg-[#1E1E20] focus:bg-white dark:focus:bg-[#171719] outline-none focus:border-blue-500 transition-colors app-text-main" 
                placeholder="Ví dụ: nhac-kich"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium app-text-main">Hình ảnh đại diện</label>
              
              <div className="space-y-3 mt-2">
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
                    placeholder="https://... (URL ảnh đại diện)"
                  />
                ) : (
                  <div className="border border-dashed app-border rounded-lg p-3 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors relative overflow-hidden group">
                    {formData.imageUrl ? (
                       <>
                         <img src={formData.imageUrl} alt="Category image" className="w-full h-24 object-cover rounded" />
                         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <span className="text-white text-xs font-medium">{uploadingImage ? "Đang tải..." : "Thay đổi ảnh"}</span>
                         </div>
                       </>
                    ) : (
                      <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center cursor-pointer py-4">
                        <FiUploadCloud className="w-5 h-5 text-blue-500 mb-1" />
                        <p className="text-[10px] font-medium">{uploadingImage ? "Đang tải..." : "Click hoặc thả ảnh lên đây"}</p>
                        <p className="text-[9px] text-slate-400 mt-1">Kích thước khuyến nghị: 400x400 (Vuông)</p>
                      </div>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                id="activeStatus" 
                checked={formData.active} 
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
              />
              <label htmlFor="activeStatus" className="text-xs font-medium app-text-main">Hiển thị trên trang chủ</label>
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
              onClick={handleSave}
              disabled={isSubmitting || uploadingImage}
              className="min-h-9 px-4 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Đang lưu..." : "Xác nhận"}
            </button>
          </div>
        </AdminModal>
      )}

      {isConfirmOpen && togglingId && (
        <AdminConfirmModal
          title={categories.find(c => c.id === togglingId)?.status === "INACTIVE" ? "Mở khóa thể loại" : "Khóa thể loại"}
          subtitle={categories.find(c => c.id === togglingId)?.status === "INACTIVE" 
            ? "Bạn có chắc chắn muốn mở khóa thể loại này? Các sự kiện sẽ có thể sử dụng lại danh mục này."
            : "Bạn có chắc chắn muốn khóa thể loại này? Các sự kiện hiện tại sẽ giữ nguyên danh mục nhưng không thể chọn mới."}
          onConfirm={handleToggleStatus}
          onClose={() => { setIsConfirmOpen(false); setTogglingId(null); }}
          confirmText="Xác nhận"
          cancelText="Hủy"
        />
      )}
    </div>
  );
}
