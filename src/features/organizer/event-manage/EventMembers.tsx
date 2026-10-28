import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
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
  FiX,
  FiLoader,
  FiAlertCircle,
  FiSend,
  FiXCircle
} from "react-icons/fi";
import { AddMemberModal } from "./components/AddMemberModal";
import { TablePagination } from "@/components/common/TablePagination";
import ConfirmModal, { type ConfirmModalType } from "@/components/common/ConfirmModal";
import { ToastContainer, type ToastMessage } from "@/features/organizer/event-manage/components/seating/SeatingToast";
import type { MemberItem } from "@/types";

import { eventApi } from "@/services/eventApi";
import { describeInvitationFailure, matchInvitationCode, readApiFailure } from "./memberInvitationErrors";

const avatarOf = (member: MemberItem) => member.avatar || member.avatar_url || member.avatarUrl;

const RESENDABLE_STATUSES = ["PENDING", "EXPIRED", "DECLINED"];
const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
  EXPIRED: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/30",
  DECLINED: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20",
  REVOKED: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/30",
};

export const EventMembers: React.FC = () => {
  const { t } = useTranslation();
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
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  } | null>(null);
  
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastSeq = useRef(0);
  const showToast = (type: "success" | "error" | "warning" | "info", text: string) => {
    const id = `toast_${++toastSeq.current}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setLiveMessage(text);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"resend" | "cancel" | null>(null);
  const inFlight = useRef(false);
  const [liveMessage, setLiveMessage] = useState("");

  const fetchMembers = async () => {
    if (!eventId) return;
    setLoading(true);
    setLoadError(false);
    try {
      const data = await eventApi.getEventMembers(eventId);
      setMembers(data);
    } catch (err) {
      console.error(t("Không thể tải danh sách thành viên"), err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  // first load: state starts as "loading", so nothing is set before the answer arrives
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    eventApi.getEventMembers(eventId)
      .then((data) => { if (!cancelled) { setMembers(data); setLoadError(false); } })
      .catch((err) => { console.error("Failed to load event members", err); if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [eventId]);

  const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : "");

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ACTIVE": return t("members.invitation.status.active");
      case "PENDING": return t("members.invitation.status.pending");
      case "EXPIRED": return t("members.invitation.status.expired");
      case "DECLINED": return t("members.invitation.status.declined");
      case "REVOKED": return t("members.invitation.status.revoked");
      default: return t("members.invitation.status.unknown");
    }
  };

  const handleResend = async (m: MemberItem) => {
    if (!eventId || inFlight.current) return;
    inFlight.current = true;
    setBusyId(m.id);
    setBusyAction("resend");
    try {
      const updated = await eventApi.resendEventMemberInvitation(eventId, m.id);
      setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...updated } : x)));
      showToast("success", m.status === "DECLINED" ? t("members.invitation.reinvite.done") : t("members.invitation.resend.done"));
    } catch (err) {
      const message = describeInvitationFailure(err, "members.invitation.error.resendGeneric");
      showToast("error", t(message.key, message.params));
      if (matchInvitationCode(readApiFailure(err)) === "INVITATION_NOT_RESENDABLE") void fetchMembers();
    } finally {
      inFlight.current = false;
      setBusyId(null);
      setBusyAction(null);
    }
  };

  const handleCancelInvitation = (m: MemberItem) => {
    if (!eventId) return;
    setConfirmModal({
      isOpen: true,
      title: t("members.invitation.cancel.title"),
      message: t("members.invitation.cancel.message", { email: m.email }),
      type: "danger",
      confirmText: t("members.invitation.cancel.confirm"),
      cancelText: t("members.invitation.cancel.keep"),
      onConfirm: async () => {
        if (inFlight.current) return;
        inFlight.current = true;
        setBusyId(m.id);
        setBusyAction("cancel");
        try {
          await eventApi.removeEventMember(eventId, m.id);
          setMembers((prev) => prev.filter((x) => x.id !== m.id));
          showToast("success", t("members.invitation.cancel.done"));
        } catch {
          showToast("error", t("members.invitation.cancel.failed"));
        } finally {
          inFlight.current = false;
          setBusyId(null);
          setBusyAction(null);
          setConfirmModal(null);
        }
      }
    });
  };

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
      title: t("Xóa thành viên"),
      message: t("Bạn có chắc chắn muốn xóa thành viên này khỏi Ban tổ chức?"),
      type: "danger",
      onConfirm: async () => {
        try {
          await eventApi.removeEventMember(eventId, id);
          showToast("success", t("Xóa thành viên thành công"));
          setMembers((prev) => prev.filter((m) => m.id !== id));
        } catch {
          showToast("error", t("Lỗi khi xóa thành viên"));
        }
        setConfirmModal(null);
      }
    });
  };

  const handleTransferOwner = async (id: string) => {
    if (!eventId) return;
    setConfirmModal({
      isOpen: true,
      title: t("Nhượng quyền Chủ sự kiện"),
      message: t("Bạn có chắc chắn muốn nhượng quyền Chủ sự kiện cho người này? Hành động này không thể hoàn tác, bạn sẽ trở thành Quản trị viên."),
      type: "warning",
      onConfirm: async () => {
        try {
          await eventApi.transferOwner(eventId, id);
          showToast("success", t("Nhượng quyền thành công. Đang chuyển hướng..."));
          setTimeout(() => {
            window.location.href = "/organizer/dashboard/events";
          }, 1500);
        } catch (err) {
          showToast("error", readApiFailure(err).code || t("Lỗi khi nhượng quyền"));
        }
        setConfirmModal(null);
      }
    });
  };

  // throw error to AddMemberModal remains and display notification error code
  const handleAddMemberSave = async (email: string, role: "ADMIN" | "MANAGER" | "CHECKIN_STAFF") => {
    if (!eventId) return;
    const res = await eventApi.inviteEventMember(eventId, email, role);
    setMembers((prev) => [res, ...prev.filter((x) => x.id !== res.id)]);
    showToast("success", res.status === "PENDING" ? t("members.invitation.add.sent") : t("members.invitation.add.added"));
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    if (!eventId) return;
    try {
      await eventApi.changeEventMemberRole(eventId, id, newRole);
      setMembers(members.map(m => m.id === id ? { ...m, role: newRole as MemberItem["role"] } : m));
      showToast("success", t("Đã cập nhật vai trò!"));
    } catch (err) {
      showToast("error", readApiFailure(err).code || t("Lỗi khi đổi vai trò"));
    }
  };

  const getRoleBadge = (role: MemberItem["role"]) => {
    switch (role) {
      case "OWNER":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <FiShield className="w-3 h-3" /> {t("Chủ sự kiện")}
          </span>
        );
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <FiKey className="w-3 h-3" /> {t("Quản trị viên")}
          </span>
        );
      case "MANAGER":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <FiUsers className="w-3 h-3" /> {t("Quản lý")}
          </span>
        );
      case "CHECKIN_STAFF":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <FiCheck className="w-3 h-3" /> {t("Nhân viên Check-in")}
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
              placeholder={t("Tìm kiếm thành viên theo tên hoặc email")}
              className="w-full bg-transparent app-text-main text-xs focus:outline-none placeholder-zinc-400 font-medium"
            />
          </div>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
          >
            {t("Tìm kiếm")}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Pills */}
          <div className="inline-flex p-1 app-bg-card border app-border rounded-xl shadow-xs overflow-x-auto no-scrollbar">
            {[
              { id: "ALL", label: `${t("Tất cả")} (${members.length})` },
              { id: "OWNER", label: t("Chủ sự kiện") },
              { id: "ADMIN", label: t("Admin") },
              { id: "MANAGER", label: t("Quản lý") },
              { id: "CHECKIN_STAFF", label: t("Check-in") },
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
              <span>{t("Thêm thành viên")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Members Table with NO row borders */}
      <div className="app-bg-card border app-border rounded-2xl shadow-sm p-4 space-y-4">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-180 text-left border-collapse">
            <thead>
              <tr className="border-b app-border bg-slate-50/50 dark:bg-slate-900/50 text-[11px] font-bold app-text-muted uppercase tracking-wider">
                <th className="py-3.5 px-6 rounded-l-xl">{t("Tên thành viên")}</th>
                <th className="py-3.5 px-6">{t("Vai trò")}</th>
                <th className="py-3.5 px-6">{t("Email hệ thống")}</th>
                <th className="py-3.5 px-6 text-center">{t("Trạng thái")}</th>
                {canEdit && <th className="py-3.5 px-6 text-right rounded-r-xl">{t("Hành động")}</th>}
              </tr>
            </thead>
            <tbody className="text-xs app-text-main">
              {paginatedMembers.map((m) => (
                <tr key={m.id} className="hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors rounded-xl">
                  <td className="py-4 px-6 font-bold rounded-l-xl">
                    <div className="flex items-center gap-3">
                      {avatarOf(m) ? (
                        <img
                          src={avatarOf(m)}
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
                        className={`w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs ${avatarOf(m) ? 'hidden' : ''}`}
                      >
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="app-text-main font-extrabold text-xs block">{m.name}</span>
                        <span className="text-[10px] app-text-muted font-normal">{t("Tham gia")}: {m.addedAt ? new Date(m.addedAt).toLocaleDateString() : ''}</span>
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
                            {m.role === "ADMIN" ? t("Quản trị viên") : m.role === "MANAGER" ? t("Quản lý") : t("Nhân viên Check-in")}
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
                                  {t("Quản trị viên")}
                                </div>
                              )}
                              <div
                                className={`px-3 py-2 text-xs cursor-pointer transition-colors ${m.role === 'MANAGER' ? 'bg-blue-500/10 text-blue-500 font-bold' : 'app-text-main hover:bg-slate-500/10'}`}
                                onClick={() => { handleRoleChange(m.id, 'MANAGER'); setOpenDropdownId(null); }}
                              >
                                {t("Quản lý")}
                              </div>
                              <div
                                className={`px-3 py-2 text-xs cursor-pointer transition-colors ${m.role === 'CHECKIN_STAFF' ? 'bg-blue-500/10 text-blue-500 font-bold' : 'app-text-main hover:bg-slate-500/10'}`}
                                onClick={() => { handleRoleChange(m.id, 'CHECKIN_STAFF'); setOpenDropdownId(null); }}
                              >
                                {t("Nhân viên Check-in")}
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
                        {m.role === "OWNER" && t("Chủ sự kiện: Toàn quyền quản lý, có thể xóa sự kiện và nhượng quyền.")}
                        {m.role === "ADMIN" && t("Quản trị viên: Có thể sửa sự kiện, quản lý vé và xem danh sách người tham gia.")}
                        {m.role === "MANAGER" && t("Quản lý: Có quyền Check-in vé và xem danh sách đăng ký.")}
                        {m.role === "CHECKIN_STAFF" && t("Nhân viên Check-in: Chỉ có quyền quét mã vạch soát vé.")}
                      </div>
                    )}
                  </td>

                  <td className="py-4 px-6 app-text-muted font-mono text-xs">
                    {m.email}
                  </td>

                  <td className="py-4 px-6 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        STATUS_STYLES[m.status] ?? "bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/30"
                      }`}
                    >
                      {getStatusLabel(m.status)}
                    </span>
                    {m.invitationExpiresAt && (m.status === "PENDING" || m.status === "EXPIRED") && (
                      <span className="block mt-1 text-[10px] app-text-muted font-normal">
                        {t(m.status === "EXPIRED" ? "members.invitation.expiredAt" : "members.invitation.expiresAt", { date: formatDateTime(m.invitationExpiresAt) })}
                      </span>
                    )}
                  </td>

                  {canEdit && (
                    <td className="py-4 px-6 text-right rounded-r-xl space-x-2">
                      <button
                        type="button"
                        onClick={() => setSelectedMember(m)}
                        className="p-2 app-text-muted hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer inline-flex"
                        title={t("Xem chi tiết")}
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                      
                      {myRole === "OWNER" && (m.role === "ADMIN" || m.role === "MANAGER") && (
                        <button
                          type="button"
                          onClick={() => handleTransferOwner(m.id)}
                          className="p-2 app-text-muted hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer inline-flex"
                          title={t("Nhượng quyền Chủ sự kiện")}
                        >
                          <FiRepeat className="w-4 h-4" />
                        </button>
                      )}

                      {m.role !== "OWNER" && RESENDABLE_STATUSES.includes(m.status) && (
                        <>
                          <button
                            type="button"
                            disabled={busyId !== null}
                            onClick={() => handleResend(m)}
                            aria-label={t(m.status === "DECLINED" ? "members.invitation.action.reinviteFor" : "members.invitation.action.resendFor", { email: m.email })}
                            title={t(m.status === "DECLINED" ? "members.invitation.action.reinvite" : "members.invitation.action.resend")}
                            className="p-2 app-text-muted hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer inline-flex disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {busyId === m.id && busyAction === "resend" ? <FiLoader className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" /> : <FiSend className="w-4 h-4" aria-hidden="true" />}
                          </button>
                          <button
                            type="button"
                            disabled={busyId !== null}
                            onClick={() => handleCancelInvitation(m)}
                            aria-label={t("members.invitation.action.cancelFor", { email: m.email })}
                            title={t("members.invitation.action.cancel")}
                            className="p-2 app-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer inline-flex disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {busyId === m.id && busyAction === "cancel" ? <FiLoader className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" /> : <FiXCircle className="w-4 h-4" aria-hidden="true" />}
                          </button>
                        </>
                      )}

                      {m.role !== "OWNER" && !RESENDABLE_STATUSES.includes(m.status) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(m.id)}
                          className="p-2 app-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer inline-flex"
                          title={t("Xóa khỏi sự kiện")}
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

        {loading ? (
          <div role="status" className="p-12 text-center">
            <FiLoader className="w-8 h-8 app-text-muted mx-auto mb-2 motion-safe:animate-spin" aria-hidden="true" />
            <p className="text-xs font-bold app-text-muted">{t("members.invitation.list.loading")}</p>
          </div>
        ) : loadError ? (
          <div role="alert" className="p-12 text-center">
            <FiAlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" aria-hidden="true" />
            <p className="text-xs font-bold text-rose-600 dark:text-rose-300">{t("members.invitation.list.loadError")}</p>
            <button
              type="button"
              onClick={() => void fetchMembers()}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
            >
              {t("members.invitation.list.retry")}
            </button>
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center">
            <FiUsers className="w-10 h-10 app-text-muted mx-auto mb-2 opacity-40" />
            <p className="text-xs font-bold app-text-muted">{t("members.invitation.list.empty")}</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-12 text-center">
            <FiUsers className="w-10 h-10 app-text-muted mx-auto mb-2 opacity-40" />
            <p className="text-xs font-bold app-text-muted">{t("Không tìm thấy thành viên nào")}</p>
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
              <h3 className="font-bold app-text-main">{t("Chi tiết thành viên")}</h3>
              <button 
                onClick={() => setSelectedMember(null)}
                className="p-1 rounded-lg app-text-muted hover:app-text-main hover:bg-slate-500/10 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-center mb-6">
                {avatarOf(selectedMember) ? (
                  <img
                    src={avatarOf(selectedMember)}
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
                  className={`w-24 h-24 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-4xl shadow-md ${avatarOf(selectedMember) ? 'hidden' : ''}`}
                >
                  {selectedMember.name.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm border-b app-border pb-3">
                <span className="app-text-muted font-bold col-span-1">{t("Tên")}</span>
                <span className="app-text-main col-span-2 font-medium">{selectedMember.name}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm border-b app-border pb-3">
                <span className="app-text-muted font-bold col-span-1">Email</span>
                <span className="app-text-main col-span-2 font-mono text-xs font-medium">{selectedMember.email}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm border-b app-border pb-3">
                <span className="app-text-muted font-bold col-span-1">{t("Vai trò")}</span>
                <span className="col-span-2">{getRoleBadge(selectedMember.role)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm border-b app-border pb-3">
                <span className="app-text-muted font-bold col-span-1">{t("Ngày tham gia")}</span>
                <span className="app-text-main col-span-2 font-medium">{selectedMember.addedAt ? new Date(selectedMember.addedAt).toLocaleString() : ''}</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t app-border flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold app-text-muted hover:app-text-main app-bg-main border app-border transition-all"
              >
                {t("Đóng")}
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
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      <div className="sr-only" role="status" aria-live="polite">{liveMessage}</div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};

export default EventMembers;
