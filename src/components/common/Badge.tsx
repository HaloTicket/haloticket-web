import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "success" | "resale" | "warning" | "danger" | "dark";
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "primary",
  className = "",
  icon
}) => {
  const variantStyles = {
    primary: "bg-brand-500/20 text-brand-600 dark:text-brand-300 border border-brand-500/30",
    secondary: "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700",
    success: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
    resale: "bg-gradient-to-r from-rose-500 to-amber-500 text-white font-extrabold shadow-md shadow-rose-500/30",
    warning: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30",
    danger: "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30",
    dark: "bg-slate-900/80 text-white border border-slate-700/80 backdrop-blur-md"
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold tracking-wide ${variantStyles[variant]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;
