import React, { useState } from "react";
import {
  FiSliders,
  FiPlus,
  FiEdit2,
  FiPercent,
  FiClock,
  FiLock,
  FiX,
  FiSave,
  FiChevronLeft,
  FiChevronRight
} from "react-icons/fi";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  eventsCount: number;
  status: "ACTIVE" | "INACTIVE";
}

export const CategoryConfig: React.FC = () => {
  const [platformFee, setPlatformFee] = useState<number>(5.0); // 5%
  const [escrowHoldDays, setEscrowHoldDays] = useState<number>(3); // 3 days post event
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const [categories, setCategories] = useState<CategoryItem[]>([
    { id: "CAT_1", name: "Nhạc sống", slug: "nhac-song", eventsCount: 45, status: "ACTIVE" },
    { id: "CAT_2", name: "Sân khấu & Nghệ thuật", slug: "san-khau", eventsCount: 22, status: "ACTIVE" },
    { id: "CAT_3", name: "Thể thao", slug: "the-thao", eventsCount: 18, status: "ACTIVE" },
    { id: "CAT_4", name: "Hội thảo & Workshop", slug: "workshop", eventsCount: 12, status: "ACTIVE" },
    { id: "CAT_5", name: "Tham quan & Trải nghiệm", slug: "trai-nghiem", eventsCount: 9, status: "ACTIVE" },
    { id: "CAT_6", name: "Hài kịch & Gala", slug: "hai-kich", eventsCount: 6, status: "ACTIVE" },
    { id: "CAT_7", name: "Đêm nhạc EDM", slug: "edm-party", eventsCount: 14, status: "ACTIVE" }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const newCat: CategoryItem = {
      id: `CAT_${Date.now()}`,
      name: newCatName.trim(),
      slug: newCatName.trim().toLowerCase().replace(/\s+/g, "-"),
      eventsCount: 0,
      status: "ACTIVE"
    };
    setCategories((prev) => [...prev, newCat]);
    setNewCatName("");
    setShowAddModal(false);
  };

  const handleSaveSystemConfig = () => {
    alert(`Đã lưu thành công cấu hình hệ thống: Phí nền tảng ${platformFee}%, Tạm giữ Payout ${escrowHoldDays} ngày.`);
  };

  const totalPages = Math.ceil(categories.length / pageSize) || 1;
  const paginatedCategories = categories.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Global System Settings Card */}
      <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold app-text-main flex items-center gap-2">
              <FiSliders className="w-4 h-4 text-blue-600" />
              <span>Cấu hình Phí & Vận hành Hệ thống</span>
            </h2>
            <p className="text-xs app-text-muted mt-0.5">Thiết lập tỷ lệ chiết khấu sàn, tạm giữ Escrow Payout và chế độ bảo trì.</p>
          </div>

          <button
            type="button"
            onClick={handleSaveSystemConfig}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <FiSave className="w-3.5 h-3.5" />
            <span>Lưu thay đổi cấu hình</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Platform Fee % */}
          <div className="p-4 rounded-md app-bg-subnav border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="text-xs font-semibold app-text-main flex items-center gap-1.5">
              <FiPercent className="w-3.5 h-3.5 text-blue-600" />
              <span>Phí dịch vụ Sàn HaloTicket (%)</span>
            </label>
            <input
              type="number"
              step="0.5"
              value={platformFee}
              onChange={(e) => setPlatformFee(Number(e.target.value))}
              className="w-full app-bg-card app-text-main font-bold text-xs rounded-md px-3 py-2 border border-slate-200 dark:border-slate-800"
            />
            <p className="text-[11px] app-text-muted">Áp dụng trực tiếp trên mỗi vé mở bán của Ban Tổ Chức.</p>
          </div>

          {/* Payout Delay Days */}
          <div className="p-4 rounded-md app-bg-subnav border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="text-xs font-semibold app-text-main flex items-center gap-1.5">
              <FiClock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Tạm giữ tiền vé Escrow (ngày)</span>
            </label>
            <input
              type="number"
              value={escrowHoldDays}
              onChange={(e) => setEscrowHoldDays(Number(e.target.value))}
              className="w-full app-bg-card app-text-main font-bold text-xs rounded-md px-3 py-2 border border-slate-200 dark:border-slate-800"
            />
            <p className="text-[11px] app-text-muted">Số ngày tạm giữ doanh thu sau khi sự kiện kết thúc thành công.</p>
          </div>

          {/* Maintenance Mode */}
          <div className="p-4 rounded-md app-bg-subnav border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between">
            <label className="text-xs font-semibold app-text-main flex items-center gap-1.5">
              <FiLock className="w-3.5 h-3.5 text-amber-500" />
              <span>Chế độ Bảo trì Hệ thống</span>
            </label>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold app-text-muted">
                {maintenanceMode ? "ĐANG BẢO TRÌ" : "HOẠT ĐỘNG BÌNH THƯỜNG"}
              </span>
              <button
                type="button"
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${maintenanceMode ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"
                  }`}
              >
                {maintenanceMode ? "Tắt Bảo trì" : "Bật Bảo trì"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Category Management Grid */}
      <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold app-text-main">Danh mục Thể loại Sự kiện ({categories.length})</h3>
            <p className="text-xs app-text-muted">Quản lý hiển thị các danh mục sự kiện trên trang chủ và bộ lọc tìm kiếm.</p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FiPlus className="w-3.5 h-3.5" />
            <span>Thêm thể loại mới</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {paginatedCategories.map((cat) => (
            <div
              key={cat.id}
              className="p-4 rounded-md app-bg-subnav border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-all space-y-2.5 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold app-text-main">{cat.name}</h4>
                  <span className="text-[10px] font-mono app-text-muted">/category/{cat.slug}</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-semibold border border-blue-200 dark:border-blue-800">
                  {cat.eventsCount} sự kiện
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-emerald-500">Hoạt động</span>
                <button
                  type="button"
                  onClick={() => alert(`Chỉnh sửa danh mục ${cat.name}`)}
                  className="p-1 rounded-md app-bg-card border border-slate-200 dark:border-slate-800 text-blue-600 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <FiEdit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Controls */}
        {categories.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            <span>
              Hiển thị <span className="font-bold text-slate-900 dark:text-slate-100">{paginatedCategories.length}</span> trên tổng số <span className="font-bold text-slate-900 dark:text-slate-100">{categories.length}</span> thể loại
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 app-bg-card disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 font-semibold text-slate-700 dark:text-slate-300">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 app-bg-card disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Add Category */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 max-w-md w-full shadow-xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold app-text-main">Thêm Thể loại Sự kiện</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-1 rounded-md text-slate-400 cursor-pointer">
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold app-text-main block">Tên thể loại mới</label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Ví dụ: Triển lãm Art, E-Sports Gaming..."
                className="w-full app-bg-subnav app-text-main text-xs font-medium rounded-md p-2.5 border border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-3.5 py-1.5 app-bg-subnav app-text-main text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-800 cursor-pointer">
                Hủy
              </button>
              <button type="button" onClick={handleAddCategory} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md shadow-xs cursor-pointer">
                Lưu danh mục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryConfig;
