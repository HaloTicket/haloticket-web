import type { ReactNode } from "react";

export interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function AdminPageHeader({ actions }: AdminPageHeaderProps) {
  if (!actions) return null;
  return <header className="flex flex-col items-start justify-end gap-4 sm:flex-row sm:items-center w-full">
    {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end ml-auto">{actions}</div>}
  </header>;
}

export default AdminPageHeader;
