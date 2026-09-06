import React from "react";
import { FiX } from "react-icons/fi";

interface AdminModalProps {
  title: string;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export const AdminModal: React.FC<AdminModalProps> = ({
  title,
  icon,
  onClose,
  children,
  maxWidth = "lg"
}) => {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl"
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div
        className={`app-bg-card border app-border rounded-3xl p-6 md:p-8 ${maxWidthClasses[maxWidth]} w-full shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200`}
      >
        <div className="flex items-center justify-between border-b app-border pb-4">
          <h3 className="text-lg font-extrabold app-text-main flex items-center gap-2">
            {icon}
            <span>{title}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg app-text-muted hover:app-text-main cursor-pointer transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
};

export default AdminModal;
