import React, { useState } from "react";
import {
  FiUsers,
  FiUserPlus,
  FiSearch,
  FiTrash2,
  FiShield,
  FiKey,
  FiCheck
} from "react-icons/fi";
import { AddMemberModal } from "./components/AddMemberModal";
import { TablePagination } from "@/components/common/TablePagination";
import type { MemberItem } from "@/types";

const INITIAL_MEMBERS: MemberItem[] = [
  {
    id: "mem-1",
    name: "Mai Văn An",
    email: "anmai.ftu2@gmail.com",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
    role: "OWNER",
    status: "ACTIVE",
    addedAt: "2026-08-01 10:00",
  },
  {
    id: "mem-2",
    name: "Huy Trần Gia",
    email: "huytg@ticketbox.vn",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    role: "ADMIN",
    status: "ACTIVE",
    addedAt: "2026-08-05 14:30",
  },
  {
    id: "mem-3",
    name: "Phương Nguyễn Thị Linh",
    email: "phuongntl@ticketbox.vn",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
    role: "ADMIN",
    status: "ACTIVE",
    addedAt: "2026-08-10 09:15",
  },
  {
    id: "mem-4",
    name: "Viên Trần Thị Nguyệt",
    email: "vienttn@ticketbox.vn",
    role: "ADMIN",
    status: "ACTIVE",
    addedAt: "2026-08-12 11:20",
  },
  {
    id: "mem-5",
    name: "Minh Nguyễn",
    email: "minhnvb@ticketbox.vn",
    role: "MANAGER",
    status: "ACTIVE",
    addedAt: "2026-08-15 16:45",
  },
  {
    id: "mem-6",
    name: "Phúc Nguyễn Huỳnh",
    email: "phucnh@ticketbox.vn",
    role: "CHECKIN_STAFF",
    status: "PENDING",
    addedAt: "2026-09-01 09:00",
  },
];

export const EventMembers: React.FC = () => {
  const [members, setMembers] = useState<MemberItem[]>(INITIAL_MEMBERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "ALL" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDeleteMember = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa thành viên này khỏi Ban tổ chức?")) {
      setMembers(members.filter((m) => m.id !== id));
    }
  };

  const handleAddMemberSave = (newMember: MemberItem) => {
    setMembers([newMember, ...members]);
  };

  const getRoleBadge = (role: MemberItem["role"]) => {
    switch (role) {
      case "OWNER":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <FiShield className="w-3 h-3" /> Chủ sự kiện
          </span>
        );
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <FiKey className="w-3 h-3" /> Quản trị viên
          </span>
        );
      case "MANAGER":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <FiUsers className="w-3 h-3" /> Quản lý
          </span>
        );
      case "CHECKIN_STAFF":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <FiCheck className="w-3 h-3" /> Nhân viên Check-in
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Toolbar matching OrganizerLayout style */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Input Box matching MyEvents style */}
        <div className="flex items-center gap-2 app-bg-card border app-border rounded-xl p-1.5 shadow-xs flex-1 max-w-md">
          <div className="flex items-center gap-2 flex-1 pl-3">
            <FiSearch className="w-4 h-4 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm kiếm thành viên theo tên hoặc email"
              className="w-full bg-transparent app-text-main text-xs focus:outline-none placeholder-zinc-400 font-medium"
            />
          </div>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
          >
            Tìm kiếm
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Pills */}
          <div className="inline-flex p-1 app-bg-card border app-border rounded-xl shadow-xs overflow-x-auto no-scrollbar">
            {[
              { id: "ALL", label: `Tất cả (${members.length})` },
              { id: "OWNER", label: "Chủ sự kiện" },
              { id: "ADMIN", label: "Admin" },
              { id: "MANAGER", label: "Quản lý" },
              { id: "CHECKIN_STAFF", label: "Check-in" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setRoleFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  roleFilter === tab.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "app-text-muted hover:app-text-main"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Add Member CTA */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <FiUserPlus className="w-4 h-4" />
            <span>Thêm thành viên</span>
          </button>
        </div>
      </div>

      {/* Members Table with NO row borders */}
      <div className="app-bg-card border app-border rounded-2xl overflow-hidden shadow-sm p-4 space-y-4">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b app-border bg-slate-50/50 dark:bg-slate-900/50 text-[11px] font-bold app-text-muted uppercase tracking-wider">
                <th className="py-3.5 px-6 rounded-l-xl">Tên thành viên</th>
                <th className="py-3.5 px-6">Vai trò</th>
                <th className="py-3.5 px-6">Email hệ thống</th>
                <th className="py-3.5 px-6 text-center">Trạng thái</th>
                <th className="py-3.5 px-6 text-right rounded-r-xl">Hành động</th>
              </tr>
            </thead>
            <tbody className="text-xs app-text-main">
              {paginatedMembers.map((m) => (
                <tr key={m.id} className="hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors rounded-xl">
                  <td className="py-4 px-6 font-bold rounded-l-xl">
                    <div className="flex items-center gap-3">
                      {m.avatar ? (
                        <img
                          src={m.avatar}
                          alt={m.name}
                          className="w-9 h-9 rounded-full object-cover border border-blue-500/20"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="app-text-main font-extrabold text-xs block">{m.name}</span>
                        <span className="text-[10px] app-text-muted font-normal">Tham gia: {m.addedAt}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-6">
                    {getRoleBadge(m.role)}
                  </td>

                  <td className="py-4 px-6 app-text-muted font-mono text-xs">
                    {m.email}
                  </td>

                  <td className="py-4 px-6 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        m.status === "ACTIVE"
                          ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                          : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      }`}
                    >
                      {m.status === "ACTIVE" ? "Đã kích hoạt" : "Chờ chấp nhận"}
                    </span>
                  </td>

                  <td className="py-4 px-6 text-right rounded-r-xl">
                    <div className="inline-flex items-center gap-3">
                      <button
                        type="button"
                        className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-bold cursor-pointer"
                      >
                        Xem chi tiết
                      </button>
                      {m.role !== "OWNER" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(m.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Xóa thành viên"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="p-12 text-center">
            <FiUsers className="w-10 h-10 app-text-muted mx-auto mb-2 opacity-40" />
            <p className="text-xs font-bold app-text-muted">Không tìm thấy thành viên nào</p>
          </div>
        ) : (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredMembers.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
          />
        )}
      </div>

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddMemberSave}
      />
    </div>
  );
};

export default EventMembers;
