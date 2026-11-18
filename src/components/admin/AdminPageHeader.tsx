import type { ReactNode } from "react";

/** Props của đầu trang admin; `title` và `description` hiện chưa được hiển thị. */
export interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

/** Thanh đầu trang chỉ chứa nhóm nút thao tác căn phải; không có `actions` thì không dựng gì. */
export function AdminPageHeader({ actions }: AdminPageHeaderProps) {
  if (!actions) return null;
  return <header className="flex flex-col items-start justify-end gap-4 sm:flex-row sm:items-center w-full">
    {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end ml-auto">{actions}</div>}
  </header>;
}

export default AdminPageHeader;
