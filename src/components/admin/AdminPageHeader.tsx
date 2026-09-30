import type { ReactNode } from "react";

export interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
  return <header className="flex flex-col items-start justify-between gap-3 border-b app-border pb-4 sm:flex-row">
    <div className="min-w-0 flex-1"><h1 className="text-xl font-bold app-text-main">{title}</h1>{description && <p className="mt-1 text-sm app-text-muted">{description}</p>}</div>
    {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div>}
  </header>;
}

export default AdminPageHeader;
