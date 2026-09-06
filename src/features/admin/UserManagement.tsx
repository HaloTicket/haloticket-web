import React, { useState } from "react";
import {
  FiUsers,
  FiSearch,
  FiEdit,
  FiLock,
  FiUnlock,
  FiX,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiFilter
} from "react-icons/fi";
import { AdminSelect } from "@/components/admin/AdminSelect";

interface UserItem {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: "ADMIN" | "ORGANIZER" | "USER" | "SUPPORT";
  status: "ACTIVE" | "SUSPENDED" | "BLOCKED";
  joinedDate: string;
  eventsCount?: number;
}

export const UserManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const [usersList, setUsersList] = useState<UserItem[]>([
    {
      id: "USR_101",
      fullName: "Trần Long Vũ",
      email: "admin@haloticket.com",
      phone: "0901234567",
      role: "ADMIN",
      status: "ACTIVE",
      joinedDate: "01/01/2026",
      eventsCount: 12
    },
    {
      id: "USR_102",
      fullName: "Saigon Events Group",
      email: "contact@saigonevents.vn",
      phone: "0988776655",
      role: "ORGANIZER",
      status: "ACTIVE",
      joinedDate: "15/02/2026",
      eventsCount: 5
    },
    {
      id: "USR_103",
      fullName: "Nguyễn Văn Nam",
      email: "nam.nguyen@gmail.com",
      phone: "0912345678",
      role: "USER",
      status: "ACTIVE",
      joinedDate: "10/03/2026",
      eventsCount: 0
    },
    {
      id: "USR_104",
      fullName: "Lê Thị Thu",
      email: "thu.le@support.com",
      phone: "0933445566",
      role: "SUPPORT",
      status: "ACTIVE",
      joinedDate: "05/04/2026",
      eventsCount: 0
    },
    {
      id: "USR_105",
      fullName: "Hoàng Văn Tuấn (Scalper Bot)",
      email: "tuan.bot@fake.com",
      phone: "0999999999",
      role: "USER",
      status: "BLOCKED",
      joinedDate: "01/09/2026",
      eventsCount: 0
    }
  ]);

  const handleToggleStatus = (id: string) => {
    setUsersList((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const nextStatus = u.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );
  };

  const handleRoleChange = (newRole: "ADMIN" | "ORGANIZER" | "USER" | "SUPPORT") => {
    if (!selectedUser) return;
    setUsersList((prev) =>
      prev.map((u) => (u.id === selectedUser.id ? { ...u, role: newRole } : u))
    );
    setSelectedUser(null);
  };

  const filteredUsers = usersList.filter((u) => {
    const matchesRole = roleFilter === "ALL" ? true : u.role === roleFilter;
    const matchesQuery =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery);
    return matchesRole && matchesQuery;
  });

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Metric Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Tổng Người dùng", val: "12,450", color: "text-blue-600 dark:text-blue-400" },
          { label: "Ban Tổ Chức (BTC)", val: "142", color: "text-indigo-600 dark:text-indigo-400" },
          { label: "Quản trị viên (Admin)", val: "8", color: "text-purple-600 dark:text-purple-400" },
          { label: "Tài khoản bị khóa", val: "14", color: "text-rose-500" }
        ].map((s, idx) => (
          <div key={idx} className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-medium app-text-muted block">{s.label}</span>
            <span className={`text-xl font-bold ${s.color}`}>{s.val}</span>
          </div>
        ))}
      </div>

      {/* Main Filter & Table Card */}
      <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 shrink-0">
            <FiUsers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold app-text-main">
              Quản lý Danh sách Người dùng & Vai trò
            </h3>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Search Bar */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 flex-1 sm:w-64">
              <FiSearch className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm tên, email, sđt..."
                className="w-full bg-transparent app-text-main text-xs focus:outline-none placeholder-slate-400 font-medium"
              />
            </div>

            {/* Custom Role Filter Selector */}
            <AdminSelect
              value={roleFilter}
              onChange={(val) => {
                setRoleFilter(val);
                setCurrentPage(1);
              }}
              icon={<FiFilter className="w-3.5 h-3.5" />}
              options={[
                { label: "Tất cả vai trò", value: "ALL" },
                { label: "ADMIN", value: "ADMIN" },
                { label: "ORGANIZER", value: "ORGANIZER" },
                { label: "SUPPORT", value: "SUPPORT" },
                { label: "USER", value: "USER" },
              ]}
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 app-text-muted font-bold text-[11px] uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/30">
                <th className="py-2.5 px-3">Mã ID</th>
                <th className="py-2.5 px-3">Họ và Tên</th>
                <th className="py-2.5 px-3">Email & SĐT</th>
                <th className="py-2.5 px-3 text-center">Vai Trò</th>
                <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                <th className="py-2.5 px-3 text-center">Ngày Tham Gia</th>
                <th className="py-2.5 px-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {user.id}
                  </td>
                  <td className="py-3 px-3 font-bold app-text-main">
                    {user.fullName}
                  </td>
                  <td className="py-3 px-3 space-y-0.5">
                    <p className="app-text-main font-medium">{user.email}</p>
                    <p className="text-[11px] app-text-muted font-mono">{user.phone}</p>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        user.role === "ADMIN"
                          ? "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900"
                          : user.role === "ORGANIZER"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900"
                          : user.role === "SUPPORT"
                          ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        user.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                      }`}
                    >
                      {user.status === "ACTIVE" ? "Hoạt động" : "Tạm khóa"}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center app-text-muted">{user.joinedDate}</td>

                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedUser(user)}
                        className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 app-bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 cursor-pointer"
                        title="Phân quyền vai trò"
                      >
                        <FiEdit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user.id)}
                        className={`p-1.5 rounded-md border cursor-pointer ${
                          user.status === "ACTIVE"
                            ? "border-rose-200 dark:border-rose-900/40 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            : "border-emerald-200 dark:border-emerald-900/40 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        }`}
                        title={user.status === "ACTIVE" ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                      >
                        {user.status === "ACTIVE" ? (
                          <FiLock className="w-3.5 h-3.5" />
                        ) : (
                          <FiUnlock className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="app-text-muted font-medium">
              Hiển thị {paginatedUsers.length} / {filteredUsers.length} người dùng
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 app-bg-subnav app-text-main disabled:opacity-40 cursor-pointer"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2.5 py-1 font-bold text-xs app-text-main">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 app-bg-subnav app-text-main disabled:opacity-40 cursor-pointer"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold app-text-main">Phân quyền Vai trò Người dùng</h3>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs app-text-muted">
                Đang thay đổi vai trò cho tài khoản: <strong className="app-text-main">{selectedUser.fullName}</strong>
              </p>

              <div className="space-y-1.5 pt-2">
                {(["ADMIN", "ORGANIZER", "SUPPORT", "USER"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleChange(r)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold border flex items-center justify-between transition-all cursor-pointer ${
                      selectedUser.role === r
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "app-bg-subnav app-text-main border-slate-200 dark:border-slate-700 hover:border-blue-500"
                    }`}
                  >
                    <span>{r}</span>
                    {selectedUser.role === r && <FiCheckCircle className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 app-bg-subnav app-text-main text-xs font-bold rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
