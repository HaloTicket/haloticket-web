import React from "react";

interface AdminStatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  valueColor?: string;
}

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  title,
  value,
  subtext,
  icon,
  iconBgColor = "bg-blue-600/10 text-blue-600 dark:text-blue-400",
  valueColor = "app-text-main"
}) => {
  return (
    <div className="app-bg-card border app-border rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium app-text-muted">{title}</span>
        {icon && (
          <div className={`w-8 h-8 rounded-lg ${iconBgColor} flex items-center justify-center font-bold shrink-0`}>
            {icon}
          </div>
        )}
      </div>
      <p className={`break-words text-xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      {subtext && <p className="text-[11px] app-text-muted font-medium">{subtext}</p>}
    </div>
  );
};

export default AdminStatCard;
