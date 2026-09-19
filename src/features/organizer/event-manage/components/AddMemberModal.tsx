import React, { useState } from "react";
import { FiX } from "react-icons/fi";
import type { MemberItem } from "@/types";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newMember: MemberItem) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onAdd
}) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MANAGER" | "CHECKIN_STAFF">("ADMIN");

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const newMember: MemberItem = {
      id: `mem-${Date.now()}`,
      name: email.split("@")[0],
      email,
      role,
      status: "PENDING",
      addedAt: new Date().toISOString().replace("T", " ").substring(0, 16)
    };

    onAdd(newMember);
    setEmail("");
    onClose();
  };

  const roles = [
    { value: "ADMIN", label: "Quản trị viên" },
    { value: "MANAGER", label: "Quản lý" },
    { value: "CHECKIN_STAFF", label: "Nhân viên - Checkin" }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md app-bg-card border app-border rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b app-border flex items-center justify-between app-bg-subnav rounded-t-2xl">
          <h2 className="text-base font-bold app-text-main flex items-center gap-2">
            Thêm thành viên
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg app-text-muted hover:app-text-main hover:bg-slate-500/10 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold app-text-main mb-1.5">
              Nhập email *
            </label>
            <input
              type="email"
              required
              placeholder="nhanvien@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="relative">
            <label className="block text-xs font-semibold app-text-main mb-1.5">
              Thêm vai trò *
            </label>
            <div 
              className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs cursor-pointer flex justify-between items-center hover:border-blue-500 transition-colors"
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            >
              <span>{roles.find(r => r.value === role)?.label}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isRoleDropdownOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            
            {isRoleDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsRoleDropdownOpen(false)}></div>
                <div className="absolute top-full mt-2 w-full app-bg-card border app-border rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {roles.map((r) => (
                    <div
                      key={r.value}
                      className={`px-4 py-3 text-xs cursor-pointer transition-colors ${role === r.value ? 'bg-blue-500/10 text-blue-500 font-bold' : 'app-text-main hover:bg-slate-500/10'}`}
                      onClick={() => {
                        setRole(r.value as "ADMIN" | "MANAGER" | "CHECKIN_STAFF");
                        setIsRoleDropdownOpen(false);
                      }}
                    >
                      {r.label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="pt-4 border-t app-border flex items-center justify-end gap-3 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold app-text-muted hover:app-text-main app-bg-main border app-border transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all w-full sm:w-auto"
            >
              Thêm thành viên
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberModal;
