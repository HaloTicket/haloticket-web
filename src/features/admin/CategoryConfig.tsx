import { useTranslation } from "react-i18next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CategoryList } from "./category-config/CategoryList";

export function CategoryConfig() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("Danh mục sự kiện")}
        description={t("Thêm, sắp xếp thứ tự và ẩn hiện các danh mục sự kiện trên HaloTicket.")}
      />
      <CategoryList />
    </div>
  );
}

export default CategoryConfig;
