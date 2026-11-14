import { useState, useRef } from "react";
import { FiLayout, FiPlus, FiTrash2, FiMove, FiEdit2, FiUploadCloud, FiLink } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
import { CustomSelect } from "@/components/common/CustomSelect";
import type { EventSection } from "@/types/adminConfig";
import { mediaApi } from "@/services/mediaApi";
import { toast } from "sonner";

interface Props {
  sections: EventSection[];
  onChange: (sections: EventSection[]) => void;
}

export function EventAreasConfig({ sections, onChange }: Props) {
  const { t } = useTranslation();
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<EventSection | null>(null);
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<EventSection>>({});
  const [uploadMode, setUploadMode] = useState<"url" | "upload">("url");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    const items = [...sections];
    const draggedItem = items[draggedIdx];
    items.splice(draggedIdx, 1);
    items.splice(index, 0, draggedItem);
    setDraggedIdx(index);
    onChange(items);
  };

  const handleOpenModal = (sec?: EventSection) => {
    if (sec) {
      setEditingSection(sec);
      setFormData({ ...sec });
    } else {
      setEditingSection(null);
      setFormData({ 
        title: "", 
        type: "featured", 
        limit: 8,
        artistDisplayType: "auto"
      });
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const res = (await mediaApi.uploadImage(file, "sections")) as { url?: string; data?: { url?: string } };
      setFormData(prev => ({ ...prev, adsImageUrl: res.url || res.data?.url || "" }));
      toast.success(t("Tải ảnh lên thành công"));
    } catch {
      toast.error(t("Lỗi tải ảnh lên"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveSection = () => {
    if (!formData.title || !formData.type) {
      toast.error(t("Vui lòng nhập tên và chọn loại hiển thị"));
      return;
    }
    
    let newSections = [...sections];
    if (editingSection) {
      newSections = newSections.map(s => s.id === editingSection.id ? { ...s, ...formData } as EventSection : s);
    } else {
      newSections.push({ ...formData, id: `SEC_${crypto.randomUUID()}` } as EventSection);
    }
    onChange(newSections);
    setIsModalOpen(false);
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setIsConfirmOpen(true);
  };

  const handleDeleteSection = () => {
    if (deletingId) {
      onChange(sections.filter(s => s.id !== deletingId));
      setIsConfirmOpen(false);
      setDeletingId(null);
    }
  };

  return (
    <div className="app-bg-card border app-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm app-text-main flex items-center gap-2">
          <FiLayout className="w-4 h-4 text-blue-500" />
          {t("Các Khu Vực Nội Dung")}
        </h3>
        <button 
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors cursor-pointer"
        >
          <FiPlus className="w-3.5 h-3.5" />
          {t("Thêm khu vực")}
        </button>
      </div>

      <div className="space-y-3">
        {sections.map((section, index) => (
          <div
            key={section.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={() => setDraggedIdx(null)}
            className={`flex flex-col gap-2 p-3 rounded-lg border transition-all ${
              draggedIdx === index
                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 opacity-80"
                : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-blue-500/30"
            } cursor-move group`}
          >
            <div className="flex items-center gap-3">
              <div className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors px-1">
                <FiMove className="w-4 h-4" />
              </div>
              
              <div className="flex-1">
                <div className="font-semibold app-text-main text-xs flex items-center gap-2">
                  {t(section.title)}
                  {section.type === "ads" && <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 text-[9px] font-bold">ADS</span>}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{t("Dữ liệu:")} <span className="uppercase text-blue-500 font-medium">{section.type}</span> • {t("Giới hạn:")} {section.limit} {t("mục")}</div>
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleOpenModal(section)}
                  className="p-1.5 text-slate-400 hover:text-blue-500 rounded hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors cursor-pointer"
                >
                  <FiEdit2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => confirmDelete(section.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <FiTrash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <AdminModal 
          title={editingSection ? t("Sửa khu vực") : t("Thêm khu vực mới")} 
          onClose={() => setIsModalOpen(false)}
          maxWidth="2xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium app-text-main">{t("Tên / Tiêu đề hiển thị")}</label>
                <input 
                  type="text" 
                  value={formData.title || ""}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full pl-3 pr-3 min-h-9 text-xs rounded-md border app-border bg-slate-50 dark:bg-[#1E1E20] focus:bg-white dark:focus:bg-[#171719] outline-none focus:border-blue-500 transition-colors app-text-main" 
                  placeholder={t("Ví dụ: Sự kiện nổi bật, Deal 50K...")}
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium app-text-main">{t("Nguồn dữ liệu / Loại Block")}</label>
                <CustomSelect 
                  value={formData.type || "featured"}
                  onChange={(val: string) => setFormData({ ...formData, type: val })}
                  options={[
                    { value: "featured", label: t("Sự kiện nổi bật (Feature Stars)") },
                    { value: "ads", label: t("Banner Quảng cáo (Ads Block)") },
                    { value: "resale", label: t("Thị trường vé bán lại (Resale)") },
                    { value: "locations", label: t("Danh sách địa điểm") },
                    { value: "featured_artists", label: t("Nghệ sĩ nổi bật") },
                    { value: "trending", label: t("Sự kiện xu hướng (Top Trending)") },
                    { value: "weekend_events", label: t("Sự kiện cuối tuần") },
                    { value: "month_events", label: t("Sự kiện cuối tháng") },
                    { value: "categories", label: t("Danh sách thể loại") },
                    { value: "upcoming", label: t("Sự kiện sắp diễn ra") }
                  ]}
                  placeholder={t("Chọn nguồn dữ liệu")}
                />
              </div>

              {formData.type !== "ads" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium app-text-main">{t("Giới hạn hiển thị tối đa")}</label>
                  <CustomSelect 
                    value={String(formData.limit || 8)}
                    onChange={(val) => setFormData({ ...formData, limit: parseInt(val) })}
                    options={[
                      { value: "4", label: "4 items" },
                      { value: "8", label: "8 items" },
                      { value: "12", label: "12 items" }
                    ]}
                    placeholder={t("Chọn giới hạn")}
                  />
                </div>
              )}
            </div>

            <div className="space-y-4 border-l app-border pl-6">
              {formData.type === "ads" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-blue-500">{t("Tùy chỉnh Block Quảng Cáo")}</h4>
                  <div className="space-y-3">
                    <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-md">
                      <button
                        type="button"
                        onClick={() => setUploadMode("url")}
                        className={`flex-1 flex items-center justify-center gap-2 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                          uploadMode === "url" ? "bg-white dark:bg-[#1E1E20] shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        }`}
                      >
                        <FiLink className="w-3.5 h-3.5" />
                        {t("Nhập URL")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMode("upload")}
                        className={`flex-1 flex items-center justify-center gap-2 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                          uploadMode === "upload" ? "bg-white dark:bg-[#1E1E20] shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        }`}
                      >
                        <FiUploadCloud className="w-3.5 h-3.5" />
                        {t("Upload")}
                      </button>
                    </div>

                    {uploadMode === "url" ? (
                      <input 
                        type="text" 
                        value={formData.adsImageUrl || ""}
                        onChange={(e) => setFormData({ ...formData, adsImageUrl: e.target.value })}
                        className="w-full pl-3 pr-3 min-h-9 text-xs rounded-md border app-border bg-slate-50 dark:bg-[#1E1E20] focus:bg-white dark:focus:bg-[#171719] outline-none focus:border-blue-500 transition-colors app-text-main" 
                        placeholder="https://... (URL)"
                      />
                    ) : (
                      <div className="border border-dashed app-border rounded-lg p-3 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors relative overflow-hidden group">
                        {formData.adsImageUrl ? (
                           <>
                             <img src={formData.adsImageUrl} alt="Ads banner" className="w-full h-16 object-cover rounded" />
                             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <span className="text-white text-xs font-medium">{isUploading ? t("Đang tải...") : t("Thay đổi ảnh")}</span>
                             </div>
                           </>
                        ) : (
                          <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center cursor-pointer">
                            <FiUploadCloud className="w-5 h-5 text-blue-500 mb-1" />
                            <p className="text-[10px] font-medium">{isUploading ? t("Đang tải...") : t("Click hoặc thả ảnh quảng cáo")}</p>
                          </div>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium app-text-main">{t("Tiêu đề phụ (Màu xanh)")}</label>
                    <input 
                      type="text" 
                      value={formData.adsSubtitle || ""}
                      onChange={(e) => setFormData({ ...formData, adsSubtitle: e.target.value })}
                      className="w-full pl-3 pr-3 min-h-8 text-[11px] rounded-md border app-border bg-white dark:bg-[#1E1E20] outline-none focus:border-blue-500 app-text-main" 
                      placeholder="GREEN SM | HALOTICKET"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium app-text-main">{t("Mô tả ngắn")}</label>
                    <input 
                      type="text" 
                      value={formData.adsDescription || ""}
                      onChange={(e) => setFormData({ ...formData, adsDescription: e.target.value })}
                      className="w-full pl-3 pr-3 min-h-8 text-[11px] rounded-md border app-border bg-white dark:bg-[#1E1E20] outline-none focus:border-blue-500 app-text-main" 
                      placeholder={t("Áp dụng cho dịch vụ Taxi Xanh...")}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium app-text-main">{t("Tên nút bấm")}</label>
                      <input 
                        type="text" 
                        value={formData.adsButtonText || ""}
                        onChange={(e) => setFormData({ ...formData, adsButtonText: e.target.value })}
                        className="w-full pl-3 pr-3 min-h-8 text-[11px] rounded-md border app-border bg-white dark:bg-[#1E1E20] outline-none focus:border-blue-500 app-text-main" 
                        placeholder={t("Nhận ưu đãi")}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium app-text-main">{t("URL chuyển hướng")}</label>
                      <input 
                        type="text" 
                        value={formData.adsButtonUrl || ""}
                        onChange={(e) => setFormData({ ...formData, adsButtonUrl: e.target.value })}
                        className="w-full pl-3 pr-3 min-h-8 text-[11px] rounded-md border app-border bg-white dark:bg-[#1E1E20] outline-none focus:border-blue-500 app-text-main" 
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {["featured", "upcoming", "weekend_events", "month_events", "resale"].includes(formData.type || "") && (
                <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-4 border app-border text-center">
                  <FiLayout className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <h4 className="text-xs font-semibold app-text-main mb-1">{t("Dữ liệu tự động")}</h4>
                  <p className="text-[11px] text-slate-500">
                    {t("Khối này sẽ tự động truy xuất các sự kiện từ hệ thống theo thuật toán và hiển thị ở dạng thẻ sự kiện chuẩn.")}
                  </p>
                </div>
              )}

              {formData.type === "featured_artists" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-blue-500">{t("Tùy chọn Nghệ sĩ nổi bật")}</h4>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium app-text-main">{t("Kiểu hiển thị")}</label>
                    <CustomSelect 
                      value={formData.artistDisplayType || "auto"}
                      onChange={(val: string) => setFormData({ ...formData, artistDisplayType: val as EventSection["artistDisplayType"] })}
                      options={[
                        { value: "auto", label: t("Tự động lấy nghệ sĩ có nhiều người hâm mộ nhất") },
                        { value: "manual", label: t("Chỉ định danh sách nghệ sĩ") }
                      ]}
                      placeholder=""
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t app-border">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="min-h-9 px-4 text-xs font-medium rounded-md border app-border hover:bg-slate-50 dark:hover:bg-[#1E1E20] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              {t("Hủy bỏ")}
            </button>
            <button 
              onClick={handleSaveSection}
              className="min-h-9 px-4 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
            >
              {t("Lưu khối")}
            </button>
          </div>
        </AdminModal>
      )}

      {isConfirmOpen && (
        <AdminConfirmModal
          title={t("Xóa Khu vực")}
          subtitle={t("Khu vực này sẽ bị gỡ khỏi trang chủ. Bạn có chắc chắn muốn xóa?")}
          onConfirm={handleDeleteSection}
          onClose={() => setIsConfirmOpen(false)}
          confirmText={t("Xóa khu vực")}
          cancelText={t("Hủy")}
        />
      )}
    </div>
  );
}
