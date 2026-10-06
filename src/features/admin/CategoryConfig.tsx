import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FiList, FiSettings, FiActivity, FiShield } from "react-icons/fi";
import { CategoryList } from "./category-config/CategoryList";
import { SystemRulesConfig } from "./category-config/SystemRulesConfig";

export function CategoryConfig() {
 
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Danh mục & Cấu hình"
        description="Quản lý tập trung các thể loại sự kiện trên HaloTicket và các thông số vận hành cốt lõi."
      />
      
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
        <div className="app-bg-card p-3 rounded-md border app-border shadow-xs flex items-center gap-3 transition-all hover:-translate-y-0.5">
          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-md flex items-center justify-center">
            <FiList className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold app-text-main leading-tight">12</div>
            <div className="text-[10px] font-medium app-text-muted uppercase tracking-wider mt-0.5">Danh Mục (Active)</div>
          </div>
        </div>
        <div className="app-bg-card p-3 rounded-md border app-border shadow-xs flex items-center gap-3 transition-all hover:-translate-y-0.5">
          <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-md flex items-center justify-center">
            <FiSettings className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold app-text-main leading-tight">34</div>
            <div className="text-[10px] font-medium app-text-muted uppercase tracking-wider mt-0.5">Rules & Configs</div>
          </div>
        </div>
        <div className="app-bg-card p-3 rounded-md border app-border shadow-xs flex items-center gap-3 transition-all hover:-translate-y-0.5">
          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-md flex items-center justify-center">
            <FiActivity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold app-text-main leading-tight">Tối ưu</div>
            <div className="text-[10px] font-medium app-text-muted uppercase tracking-wider mt-0.5">Trạng thái phí</div>
          </div>
        </div>
        <div className="app-bg-card p-3 rounded-md border app-border shadow-xs flex items-center gap-3 transition-all hover:-translate-y-0.5">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-md flex items-center justify-center">
            <FiShield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold app-text-main leading-tight">Bảo mật</div>
            <div className="text-[10px] font-medium app-text-muted uppercase tracking-wider mt-0.5">Chính sách</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <CategoryList />
        <SystemRulesConfig />
      </div>
    </div>
  );
}

export default CategoryConfig;
