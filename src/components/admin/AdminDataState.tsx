import { useTranslation } from "react-i18next";

/** Props của khối trạng thái dữ liệu: trạng thái hiển thị, thông điệp tùy chọn và hàm thử lại hoặc xóa bộ lọc. */
export interface AdminDataStateProps {
  state: "loading" | "error" | "empty" | "no-results" | "refreshing";
  message?: string;
  onRetry?: () => void;
  onReset?: () => void;
}

/** Hiển thị trạng thái tải, đang cập nhật, lỗi (kèm nút Thử lại), rỗng hoặc không có kết quả (kèm nút Xóa bộ lọc). */
export function AdminDataState({ state, message, onRetry, onReset }: AdminDataStateProps) {
  const { t } = useTranslation();
  if (state === "loading") return <div role="status" className="space-y-3 py-6"><p className="text-sm app-text-muted">{t("Đang tải dữ liệu")}</p><div aria-hidden="true" className="h-10 animate-pulse rounded-lg app-bg-subnav" /><div aria-hidden="true" className="h-10 animate-pulse rounded-lg app-bg-subnav" /><div aria-hidden="true" className="h-10 animate-pulse rounded-lg app-bg-subnav" /></div>;
  if (state === "refreshing") return <p role="status" className="text-xs app-text-muted">{t("Đang cập nhật dữ liệu…")}</p>;

  const isError = state === "error";
  const label = isError ? t("Không thể tải dữ liệu") : state === "no-results" ? t("Không tìm thấy kết quả") : t("Chưa có dữ liệu");
  return <div role={isError ? "alert" : "status"} className="rounded-lg border app-border app-bg-card px-4 py-8 text-center">
    <p className="text-sm font-semibold app-text-main">{message || label}</p>
    {isError && onRetry && <button type="button" onClick={onRetry} className="mt-3 min-h-11 rounded-lg border app-border px-4 text-sm font-semibold app-text-brand">{t("Thử lại")}</button>}
    {state === "no-results" && onReset && <button type="button" onClick={onReset} className="mt-3 min-h-11 rounded-lg border app-border px-4 text-sm font-semibold app-text-brand">{t("Xóa bộ lọc")}</button>}
  </div>;
}

export default AdminDataState;
