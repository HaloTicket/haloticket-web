import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { FiEye, FiLock, FiUnlock, FiRefreshCw, FiUser, FiUsers, FiShield, FiX, FiCheck } from "react-icons/fi";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminDataState } from "@/components/admin/AdminDataState";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { useTranslation } from "react-i18next";
import { adminUserApi } from "@/services/adminUserApi";
import type { AdminUserListItem } from "@/types";
import { PATHS } from "@/routes/paths";
import { toast } from "sonner";
import { format } from "date-fns";

import { CustomSelect } from "@/components/common/CustomSelect";

const getTabStyle = (isActive: boolean) => {
  return isActive 
    ? "bg-slate-200 dark:bg-slate-700/80 app-text-main shadow-sm"
    : "app-text-muted hover:bg-slate-100 dark:hover:bg-slate-800/50";
};

const getBadgeStyle = (tab: string) => {
  switch (tab) {
    case "CUSTOMER": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400";
    case "ORGANIZER": return "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400";
    case "ADMIN": return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400";
    default: return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400";
  }
};

export default function AdminUserManagement() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [sortParam, setSortParam] = useState("newest");

  // counts for tabs
  const [counts, setCounts] = useState({ ALL: 0, CUSTOMER: 0, ORGANIZER: 0, ADMIN: 0 });

  // role assigning state
  const [editingRolesFor, setEditingRolesFor] = useState<AdminUserListItem | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isUpdatingRoles, setIsUpdatingRoles] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminUserApi.getUsers({
        query: query.trim() || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        role: roleFilter !== "ALL" ? roleFilter : undefined,
        sort: sortParam,
        page,
        size: pageSize,
      });
      setUsers(res.content || []);
      setTotalPages(res.totalPages || 1);
      setTotalItems(res.totalElements || 0);

      // fetch counts for all tabs concurrently
      if (page === 1) {
        const countPromises = (["ALL", "CUSTOMER", "ORGANIZER", "ADMIN"] as const).map(async (r) => {
          try {
            const cRes = await adminUserApi.getUsers({
              query: query.trim() || undefined,
              status: statusFilter !== "ALL" ? statusFilter : undefined,
              role: r !== "ALL" ? r : undefined,
              size: 1
            });
            return { role: r, count: cRes.totalElements || 0 };
          } catch {
            return { role: r, count: 0 };
          }
        });
        const countsArray = await Promise.all(countPromises);
        const newCounts = { ALL: 0, CUSTOMER: 0, ORGANIZER: 0, ADMIN: 0 };
        countsArray.forEach(c => newCounts[c.role as keyof typeof newCounts] = c.count);
        setCounts(newCounts);
      }

      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(t("Lỗi tải danh sách người dùng."));
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter, roleFilter, sortParam, page, pageSize, t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await adminUserApi.updateUserStatus(id, newStatus);
      toast.success(t(`Đã ${newStatus === "ACTIVE" ? "mở khóa" : "khóa"} tài khoản thành công!`));
      fetchUsers();
    } catch (err) {
      toast.error(t("Không thể cập nhật trạng thái tài khoản."));
    }
  };

  const handleSaveRoles = async () => {
    if (!editingRolesFor) return;
    setIsUpdatingRoles(true);
    try {
      await adminUserApi.updateUserRoles(editingRolesFor.id, selectedRoles);
      toast.success(t("Phân quyền tài khoản thành công!"));
      setEditingRolesFor(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error(t("Lỗi khi phân quyền tài khoản."));
    } finally {
      setIsUpdatingRoles(false);
    }
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <AdminPageHeader 
        title={t("Quản lý người dùng")}
        description={t("Danh sách tài khoản khách hàng, ban tổ chức và ban quản trị.")}
      />

      {/* Overview & Filter Bar */}
      <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold app-text-main flex items-center gap-2">
              <FiUsers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{t("Tổng quan & Lọc người dùng")}</span>
            </h2>
            <p className="text-xs app-text-muted mt-0.5">
              {t("Quản lý tất cả tài khoản trên hệ thống, phân quyền và trạng thái.")}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchUsers}
            className="p-2 bg-slate-50 dark:bg-slate-800/80 text-app-text-main rounded-md border border-slate-200 dark:border-slate-700 hover:border-blue-500 cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
            title={t("Tải lại dữ liệu")}
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span>{t("Làm mới")}</span>
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 app-bg-subnav p-1 rounded-lg border border-slate-200 dark:border-slate-800 w-full xl:w-auto flex-wrap overflow-x-auto no-scrollbar">
            {(["ALL", "CUSTOMER", "ORGANIZER", "ADMIN"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setRoleFilter(tab);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${getTabStyle(roleFilter === tab)}`}
              >
                {tab === "ALL" ? t("Tất cả") : tab === "CUSTOMER" ? t("Khách hàng") : tab === "ORGANIZER" ? t("Ban tổ chức") : t("Admin")}
                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black ${getBadgeStyle(tab)}`}>
                  {counts[tab]}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Select */}
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder={t("Tìm theo tên, email, sđt...")}
              className="min-h-9 min-w-[200px] flex-1 rounded-md border app-border app-bg-card px-3 text-xs font-medium app-text-main placeholder:app-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
            />
            
            <div className="w-[140px] flex-shrink-0">
              <CustomSelect
                value={statusFilter}
                onChange={(val) => { setStatusFilter(val); setPage(1); }}
                options={[
                  { value: "ALL", label: t("Trạng thái") },
                  { value: "ACTIVE", label: t("Hoạt động") },
                  { value: "INACTIVE", label: t("Bị khóa") }
                ]}
              />
            </div>

            <div className="w-[130px] flex-shrink-0">
              <CustomSelect
                value={sortParam}
                onChange={(val) => { setSortParam(val); setPage(1); }}
                options={[
                  { value: "newest", label: t("Mới nhất") },
                  { value: "oldest", label: t("Cũ nhất") },
                  { value: "name", label: t("Tên A-Z") }
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
        {loading && users.length === 0 ? (
          <div className="p-10"><AdminDataState state="loading" /></div>
        ) : error ? (
          <div className="p-10"><AdminDataState state="error" message={error} onRetry={fetchUsers} /></div>
        ) : users.length === 0 ? (
          <div className="p-10"><AdminDataState state="empty" message={t("Không tìm thấy người dùng nào phù hợp.")} /></div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs table-fixed min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 app-text-muted font-bold text-[11px] uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/30">
                  <th className="py-3 px-4 w-[28%]">{t("Người dùng")}</th>
                  <th className="py-3 px-4 w-[20%]">{t("Liên hệ")}</th>
                  <th className="py-3 px-4 w-[18%]">{t("Vai trò")}</th>
                  <th className="py-3 px-4 w-[12%] text-center">{t("Trạng thái")}</th>
                  <th className="py-3 px-4 w-[12%]">{t("Tham gia")}</th>
                  <th className="py-3 px-4 w-[10%] text-right">{t("Thao tác")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4 align-top">
                      <div className="flex items-center gap-3">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover border app-border" />
                        ) : (
                          <div className="w-9 h-9 rounded-full app-bg-subnav flex items-center justify-center text-slate-400">
                            <FiUser className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-[13px] app-text-main truncate">{user.fullName || t("Người dùng")}</div>
                          <div className="text-[11px] app-text-muted mt-0.5 font-mono">ID: {user.id?.substring(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top">
                      <div className="app-text-main font-medium truncate">{user.email}</div>
                      <div className="app-text-muted text-[11px] mt-0.5">{user.phoneNumber || "-"}</div>
                    </td>
                    <td className="py-3 px-4 align-top">
                      <div className="flex flex-wrap gap-1">
                        {user.roles && user.roles.map(role => (
                          <span key={role} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            role === "ADMIN" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" :
                            role === "ORGANIZER" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                            "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top text-center">
                      <span className={`inline-flex items-center justify-center min-w-[70px] rounded border px-1.5 py-0.5 text-[11px] font-semibold ${user.status === "ACTIVE" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400" : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"}`}>
                        {user.status === "ACTIVE" ? t("Hoạt động") : t("Bị khóa")}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-top app-text-muted text-[11px]">
                      {user.createdAt ? format(new Date(user.createdAt), "dd/MM/yyyy HH:mm") : "-"}
                    </td>
                    <td className="py-3 px-4 align-top text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link to={`${PATHS.ADMIN_USER_MANAGEMENT}/${user.id}`} title={t("Chi tiết")} className="inline-flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors">
                          <FiEye className="w-3.5 h-3.5" />
                        </Link>
                        <button title={t("Phân quyền")} onClick={() => { setEditingRolesFor(user); setSelectedRoles(user.roles || []); }} className="inline-flex h-7 w-7 items-center justify-center rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 transition-colors">
                          <FiShield className="w-3.5 h-3.5" />
                        </button>
                        {user.status === "ACTIVE" ? (
                          <button title={t("Khóa")} onClick={() => handleUpdateStatus(user.id, "INACTIVE")} className="inline-flex h-7 w-7 items-center justify-center rounded bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 transition-colors">
                            <FiLock className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button title={t("Mở khóa")} onClick={() => handleUpdateStatus(user.id, "ACTIVE")} className="inline-flex h-7 w-7 items-center justify-center rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 transition-colors">
                            <FiUnlock className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalItems > 0 && (
          <AdminPagination 
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
            pageSizeOptions={[15, 30, 50, 100]}
          />
        )}
      </div>

      {/* Role Assignment Modal */}
      {editingRolesFor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="app-bg-card border app-border rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b app-border bg-slate-50/50 dark:bg-slate-900/30">
              <h3 className="font-bold text-sm app-text-main flex items-center gap-2"><FiShield className="text-blue-500"/> {t("Phân quyền tài khoản")}</h3>
              <button onClick={() => setEditingRolesFor(null)} className="app-text-muted hover:app-text-main transition-colors"><FiX className="w-5 h-5"/></button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                 {editingRolesFor.avatarUrl ? (
                    <img src={editingRolesFor.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border app-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-full app-bg-subnav flex items-center justify-center text-slate-400">
                      <FiUser className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-[13px] app-text-main truncate">{editingRolesFor.fullName || t("Người dùng")}</div>
                    <div className="text-[11px] app-text-muted mt-0.5">{editingRolesFor.email}</div>
                  </div>
              </div>

              <div className="pt-2">
                <p className="text-xs font-semibold app-text-muted mb-3 uppercase tracking-wider">{t("Chọn vai trò")}</p>
                <div className="space-y-2">
                  {(["CUSTOMER", "ORGANIZER", "ADMIN"] as const).map(role => (
                    <label key={role} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedRoles.includes(role) ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/10" : "app-border hover:app-bg-subnav"}`}>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 app-bg-card app-border cursor-pointer"
                        checked={selectedRoles.includes(role)}
                        onChange={() => toggleRole(role)}
                      />
                      <div className="flex-1">
                        <div className={`text-[13px] font-bold ${selectedRoles.includes(role) ? 'text-blue-600 dark:text-blue-400' : 'app-text-main'}`}>
                          {role === "CUSTOMER" ? t("Khách hàng") : role === "ORGANIZER" ? t("Ban tổ chức") : t("Admin quản trị")}
                        </div>
                        <div className={`text-[11px] mt-0.5 ${selectedRoles.includes(role) ? 'text-blue-600/80 dark:text-blue-400/80' : 'app-text-muted'}`}>
                          {role === "CUSTOMER" ? t("Mua vé, tham gia sự kiện.") : role === "ORGANIZER" ? t("Tạo và quản lý sự kiện.") : t("Toàn quyền quản trị hệ thống.")}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t app-border bg-slate-50/50 dark:bg-slate-900/30 flex justify-end gap-2">
              <button onClick={() => setEditingRolesFor(null)} className="px-4 py-2 text-xs font-bold rounded-lg app-bg-card border app-border app-text-main hover:app-bg-subnav transition-colors">
                {t("Hủy")}
              </button>
              <button 
                onClick={handleSaveRoles} 
                disabled={isUpdatingRoles || selectedRoles.length === 0}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isUpdatingRoles ? <FiRefreshCw className="animate-spin" /> : <FiCheck />}
                {t("Lưu thay đổi")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}