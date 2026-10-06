import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CategoryList } from "./category-config/CategoryList";
import { SystemRulesConfig } from "./category-config/SystemRulesConfig";

export function CategoryConfig() {
 
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Danh mục & Cấu hình"
        description="Quản lý tập trung các thể loại sự kiện trên HaloTicket và các thông số vận hành cốt lõi."
      />

      <div className="flex flex-col gap-6">
        <CategoryList />
        <SystemRulesConfig />
      </div>
    </div>
  );
}

export default CategoryConfig;
