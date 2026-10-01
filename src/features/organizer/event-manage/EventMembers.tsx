import React, { useState, useEffect } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import {
  FiUsers,
  FiUserPlus,
  FiSearch,
  FiTrash2,
  FiShield,
  FiKey,
  FiCheck,
  FiEye,
  FiRepeat,
  FiX
} from "react-icons/fi";
import { AddMemberModal } from "./components/AddMemberModal";
import { TablePagination } from "@/components/common/TablePagination";
import ConfirmModal, { type ConfirmModalType } from "@/components/common/ConfirmModal";
import { ToastContainer, type ToastMessage } from "@/features/organizer/event-manage/components/seating/SeatingToast";
import type { MemberItem } from "@/types";

import { eventApi } from "@/services/eventApi";

export const EventMembers: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { myRole } = useOutletContext<{ myRole: string | null }>();
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberItem | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: ConfirmModalType;
    onConfirm: () => void;
  } | null>(null);
  
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (type: "success" | "error" | "warning" | "info", text: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchMembers = async () => {
    if (!eventId) return;
    try {
      const data = await eventApi.getEventMembers(eventId);
      setMembers(data);
    } catch (err) {
      console.error("Không thể tải danh sách thành viên", err);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [eventId]);

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "ALL" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDeleteMember = async (id: string) => {
    if (!eventId) return;
    setConfirmModal({
      isOpen: true,
      title: "Xóa thành viên",
      message: "Bạn có chắc chắn muốn xóa thành viên này khỏi Ban tổ chức?",
      type: "danger",
      onConfirm: async () => {
        try {
          await eventApi.removeEventMember(eventId, id);
          showToast("success", "Xóa thành viên thành công");
          setMembers(members.filter((m) => m.id !== id));
        } catch (err) {
          showToast("error", "Lỗi khi xóa thành viên");
        }
        setConfirmModal(null);
      }
    });
  };

  const handleTransferOwner = async (id: string) => {
    if (!eventId) return;
    setConfirmModal({
      isOpen: true,
      title: "Nhượng quyền Chủ sự kiện",
      message: "Bạn có chắc chắn muốn nhượng quyền Chủ sự kiện cho người này? Hành động này không thể hoàn tác, bạn sẽ trở thành Quản trị viên.",
      type: "warning",
      onConfirm: async () => {
        try {
          await eventApi.transferOwner(eventId, id);
          showToast("success", "Nhượng quyền thành công. Đang chuyển hướng...");
          setTimeout(() => {
            window.location.href = "/organizer/dashboard/events";
          }, 1500);
        } catch (err: any) {
          showToast("error", err?.response?.data?.message || "Lỗi khi nhượng quyền");
        }
        setConfirmModal(null);
      }
    });
  };

  const handleAddMemberSave = async (newMember: MemberItem) => {
    if (!eventId) return;
    try {
      const res = await eventApi.inviteEventMember(eventId, newMember.email, newMember.role);
      showToast("success", "Đã mời thành viên tham gia!");
      setMembers([res, ...members]);
    } catch (err: any) {
      showToast("error", err?.response?.data?.message || "Lỗi khi mời thành viên");
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    if (!eventId) return;
    try {
      await eventApi.changeEventMemberRole(eventId, id, newRole);
      setMembers(members.map(m => m.id === id ? { ...m, role: newRole as any } : m));
      showToast("success", "Đã cập nhật vai trò!");
    } catch (err: any) {
      showToast("error", err?.response?.data?.message || "Lỗi khi đổi vai trò");
    }
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

  const canEdit = myRole === "OWNER" || myRole === "ADMIN";

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
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <FiUserPlus className="w-4 h-4" />
              <span>Thêm thành viên</span>
            </button>
          )}
        </div>
      </div>

      {/* Members Table with NO row borders */}
      <div className="app-bg-card border app-border rounded-2xl shadow-sm p-4 space-y-4">
        <div className="w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b app-border bg-slate-50/50 dark:bg-slate-900/50 text-[11px] font-bold app-text-muted uppercase tracking-wider">
                <th className="py-3.5 px-6 rounded-l-xl">Tên thành viên</th>
                <th className="py-3.5 px-6">Vai trò</th>
                <th className="py-3.5 px-6">Email hệ thống</th>
                <th className="py-3.5 px-6 text-center">Trạng thái</th>
                {canEdit && <th className="py-3.5 px-6 text-right rounded-r-xl">Hành động</th>}
              </tr>
            </thead>
            <tbody className="text-xs app-text-main">
              {paginatedMembers.map((m) => (
                <tr key={m.id} className="hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors rounded-xl">
                  <td className="py-4 px-6 font-bold rounded-l-xl">
                    <div className="flex items-center gap-3">
                      {m.avatar || (m as any).avatar_url || (m as any).avatarUrl ? (
                        <img
                          src={m.avatar || (m as any).avatar_url || (m as any).avatarUrl}
                          alt={m.name}
                          className="w-9 h-9 rounded-full object-cover border border-blue-500/20"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs ${m.avatar || (m as any).avatar_url || (m as any).avatarUrl ? 'hidden' : ''}`}
                      >
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="app-text-main font-extrabold text-xs block">{m.name}</span>
                        <span className="text-[10px] app-text-muted font-normal">Tham gia: {m.addedAt ? new Date(m.addedAt).toLocaleDateString() : ''}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-6 relative group">
                    {(myRole === "OWNER" && m.role !== "OWNER") || (myRole === "ADMIN" && m.role !== "OWNER" && m.role !== "ADMIN") ? (
                      <div className="relative inline-block w-36">
                        <div 
                          className="px-2.5 py-1.5 rounded-lg app-bg-main border app-border app-text-main text-xs font-bold cursor-pointer flex justify-between items-center hover:border-blue-500 transition-colors"
                          onClick={() => setOpenDropdownId(openDropdownId === m.id ? null : m.id)}
                        >
                          <span>
                            {m.role === "ADMIN" ? "Quản trị viên" : m.role === "MANAGER" ? "Quản lý" : "Nhân viên Check-in"}
                          </span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${openDropdownId === m.id ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                        
                        {openDropdownId === m.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenDropdownId(null)}></div>
                            <div className="absolute top-full mt-1 w-40 max-h-48 overflow-y-auto app-bg-card border app-border rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 left-0">
                              {myRole === "OWNER" && (
                                <div
                                  className={`px-3 py-2 text-xs cursor-pointer transition-colors ${m.role === 'ADMIN' ? 'bg-blue-500/10 text-blue-500 font-bold' : 'app-text-main hover:bg-slate-500/10'}`}
                                  onClick={() => { handleRoleChange(m.id, 'ADMIN'); setOpenDropdownId(null); }}
                                >
                                  Quản trị viên
                                </div>
                              )}
                              <div
                                className={`px-3 py-2 text-xs cursor-pointer transition-colors ${m.role === 'MANAGER' ? 'bg-blue-500/10 text-blue-500 font-bold' : 'app-text-main hover:bg-slate-500/10'}`}
                                onClick={() => { handleRoleChange(m.id, 'MANAGER'); setOpenDropdownId(null); }}
                              >
                                Quản lý
                              </div>
                              <div
                                className={`px-3 py-2 text-xs cursor-pointer transition-colors ${m.role === 'CHECKIN_STAFF' ? 'bg-blue-500/10 text-blue-500 font-bold' : 'app-text-main hover:bg-slate-500/10'}`}
                                onClick={() => { handleRoleChange(m.id, 'CHECKIN_STAFF'); setOpenDropdownId(null); }}
                              >
                                Nhân viên Check-in
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      getRoleBadge(m.role)
                    )}
                    {openDropdownId !== m.id && (
                      <div className="absolute left-6 top-12 hidden group-hover:block z-30 w-48 bg-slate-900 text-white text-[10px] p-2 rounded shadow-lg">
                        {m.role === "OWNER" && "Chủ sự kiện: Toàn quyền quản lý, có thể xóa sự kiện và nhượng quyền."}
                        {m.role === "ADMIN" && "Quản trị viên: Có thể sửa sự kiện, quản lý vé và xem danh sách người tham gia."}
                        {m.role === "MANAGER" && "Quản lý: Có quyền Check-in vé và xem danh sách đăng ký."}
                        {m.role === "CHECKIN_STAFF" && "Nhân viên Check-in: Chỉ có quyền quét mã vạch soát vé."}
                      </div>
                    )}
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

                  {canEdit && (
                    <td className="py-4 px-6 text-right rounded-r-xl space-x-2">
                      <button
                        type="button"
                        onClick={() => setSelectedMember(m)}
                        className="p-2 app-text-muted hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer inline-flex"
                        title="Xem chi tiết"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                      
                      {myRole === "OWNER" && (m.role === "ADMIN" || m.role === "MANAGER") && (
                        <button
                          type="button"
                          onClick={() => handleTransferOwner(m.id)}
                          className="p-2 app-text-muted hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer inline-flex"
                          title="Nhượng quyền Chủ sự kiện"
                        >
                          <FiRepeat className="w-4 h-4" />
                        </button>
                      )}

                      {m.role !== "OWNER" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(m.id)}
                          className="p-2 app-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer inline-flex"
                          title="Xóa khỏi sự kiện"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  )}
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
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        )}
      </div>

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddMemberSave}
      />

      {/* View Details Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="app-bg-card border app-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b app-border flex items-center justify-between app-bg-subnav">
              <h3 className="font-bold app-text-main">Chi tiết thành viên</h3>
              <button 
                onClick={() => setSelectedMember(null)}
                className="p-1 rounded-lg app-text-muted hover:app-text-main hover:bg-slate-500/10 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-center mb-6">
                {selectedMember.avatar || (selectedMember as any).avatar_url || (selectedMember as any).avatarUrl ? (
                  <img
                    src={selectedMember.avatar || (selectedMember as any).avatar_url || (selectedMember as any).avatarUrl}
                    alt={selectedMember.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-blue-500/20"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className={`w-24 h-24 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-4xl shadow-md ${selectedMember.avatar || (selectedMember as any).avatar_url || (selectedMember as any).avatarUrl ? 'hidden' : ''}`}
                >
                  {selectedMember.name.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm border-b app-border pb-3">
                <span className="app-text-muted font-bold col-span-1">Tên</span>
                <span className="app-text-main col-span-2 font-medium">{selectedMember.name}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm border-b app-border pb-3">
                <span className="app-text-muted font-bold col-span-1">Email</span>
                <span className="app-text-main col-span-2 font-mono text-xs font-medium">{selectedMember.email}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm border-b app-border pb-3">
                <span className="app-text-muted font-bold col-span-1">Vai trò</span>
                <span className="col-span-2">{getRoleBadge(selectedMember.role)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm border-b app-border pb-3">
                <span className="app-text-muted font-bold col-span-1">Ngày tham gia</span>
                <span className="app-text-main col-span-2 font-medium">{selectedMember.addedAt ? new Date(selectedMember.addedAt).toLocaleString() : ''}</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t app-border flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold app-text-muted hover:app-text-main app-bg-main border app-border transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};

export default EventMembers;
