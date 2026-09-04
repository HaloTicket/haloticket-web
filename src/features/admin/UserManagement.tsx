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
  FiChevronRight
} from "react-icons/fi";

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
          { label: "Tổng Người dùng", val: "12,450", color: "text-blue-600" },
          { label: "Ban Tổ Chức (BTC)", val: "142", color: "text-indigo-600" },
          { label: "Quản trị viên (Admin)", val: "8", color: "text-purple-600" },
          { label: "Tài khoản bị khóa", val: "14", color: "text-rose-500" }
        ].map((s, idx) => (
          <div key={idx} className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-md p-4 space-y-1">
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

            {/* Role Filter Selector */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-md px-3 py-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shrink-0"
            >
              <option value="ALL" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Tất cả vai trò</option>
              <option value="ADMIN" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">ADMIN</option>
              <option value="ORGANIZER" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">ORGANIZER</option>
              <option value="SUPPORT" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">SUPPORT</option>
              <option value="USER" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">USER</option>
            </select>
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
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${user.role === "ADMIN"
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
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${user.status === "ACTIVE"
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
                        className={`p-1.5 rounded-md border cursor-pointer ${user.status === "ACTIVE"
                            ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-200 dark:border-rose-900"
                            : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200 dark:border-emerald-900"
                          }`}
                        title={user.status === "ACTIVE" ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                      >
                        {user.status === "ACTIVE" ? <FiLock className="w-3.5 h-3.5" /> : <FiUnlock className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredUsers.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            <span>
              Hiển thị <span className="font-bold text-slate-900 dark:text-slate-100">{paginatedUsers.length}</span> trên tổng số <span className="font-bold text-slate-900 dark:text-slate-100">{filteredUsers.length}</span> người dùng
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 app-bg-card disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 font-semibold text-slate-700 dark:text-slate-300">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 app-bg-card disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Role Assignment Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 max-w-md w-full shadow-xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold app-text-main">Phân quyền Vai trò (RBAC)</h3>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs app-text-muted">
              Đang chỉnh sửa quyền cho <span className="font-bold app-text-main">{selectedUser.fullName}</span> ({selectedUser.email}).
            </p>

            <div className="space-y-2">
              {[
                { id: "ADMIN", label: "SUPER ADMIN (Toàn quyền hệ thống)" },
                { id: "ORGANIZER", label: "ORGANIZER (Ban Tổ Chức sự kiện)" },
                { id: "SUPPORT", label: "SUPPORT (Nhân viên CSKH & Hỗ trợ)" },
                { id: "USER", label: "USER (Khách hàng mua vé)" }
              ].map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleRoleChange(role.id as any)}
                  className={`w-full p-2.5 rounded-md border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${selectedUser.role === role.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "app-bg-subnav app-text-main border-slate-200 dark:border-slate-800 hover:border-blue-500"
                    }`}
                >
                  <span>{role.label}</span>
                  {selectedUser.role === role.id && <FiCheckCircle className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
