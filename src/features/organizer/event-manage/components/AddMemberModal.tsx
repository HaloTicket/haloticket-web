import React, { useState } from "react";
import { FiX } from "react-icons/fi";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newMember: any) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onAdd
}) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MANAGER" | "CHECKIN_STAFF">("ADMIN");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const newMember = {
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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md app-bg-card border app-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b app-border flex items-center justify-between app-bg-subnav">
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

          <div>
            <label className="block text-xs font-semibold app-text-main mb-1.5">
              Thêm vai trò *
            </label>
            <select
              value={role}
              onChange={(e: any) => setRole(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="ADMIN">Quản trị viên</option>
              <option value="MANAGER">Quản lý</option>
              <option value="CHECKIN_STAFF">Nhân viên - Checkin</option>
            </select>
          </div>

          <div className="pt-4 border-t app-border flex items-center justify-end gap-3">
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
