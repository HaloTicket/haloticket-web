import React, { useEffect, useRef, useState } from "react";
import { FiLoader, FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import type { MemberRole } from "@/types";
import { describeInvitationFailure } from "../memberInvitationErrors";

type InvitableRole = Exclude<MemberRole, "OWNER">;

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (email: string, role: InvitableRole) => Promise<void>;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose, onAdd }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("ADMIN");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => {
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !sending) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, sending, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError("");
    try {
      await onAdd(trimmed, role);
      setEmail("");
      onClose();
    } catch (cause) {
      const message = describeInvitationFailure(cause, "members.invitation.error.generic");
      setError(t(message.key, message.params));
    } finally {
      setSending(false);
    }
  };

  const roles: { value: InvitableRole; label: string }[] = [
    { value: "ADMIN", label: t("Quản trị viên") },
    { value: "MANAGER", label: t("Quản lý") },
    { value: "CHECKIN_STAFF", label: t("Nhân viên - Checkin") },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-member-title"
        className="w-full max-w-md app-bg-card border app-border rounded-2xl shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200"
      >
        <div className="p-4 border-b app-border flex items-center justify-between app-bg-subnav rounded-t-2xl">
          <h2 id="add-member-title" className="text-base font-bold app-text-main flex items-center gap-2">
            {t("Thêm thành viên")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            aria-label={t("members.invitation.add.close")}
            className="p-1 rounded-lg app-text-muted hover:app-text-main hover:bg-slate-500/10 transition-colors disabled:opacity-50"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="add-member-email" className="block text-xs font-semibold app-text-main mb-1.5">
              {t("Nhập email *")}
            </label>
            <input
              id="add-member-email"
              ref={inputRef}
              type="email"
              required
              placeholder="nhanvien@domain.com"
              value={email}
              disabled={sending}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-sm focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/40"
            />
          </div>

          <div>
            <label htmlFor="add-member-role" className="block text-xs font-semibold app-text-main mb-1.5">
              {t("Thêm vai trò *")}
            </label>
            <select
              id="add-member-role"
              value={role}
              disabled={sending}
              onChange={(e) => setRole(e.target.value as InvitableRole)}
              className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-sm focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div role="alert" aria-live="assertive">
            {error && (
              <p className="rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/60 px-3 py-2 text-xs font-semibold text-rose-800 dark:text-rose-200">
                {error}
              </p>
            )}
          </div>

          <div className="pt-4 border-t app-border flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="px-4 py-2 rounded-xl text-xs font-bold app-text-muted hover:app-text-main app-bg-main border app-border transition-all disabled:opacity-50"
            >
              {t("Hủy")}
            </button>
            <button
              type="submit"
              disabled={sending}
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {sending && <FiLoader className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" />}
              {sending ? t("members.invitation.add.sending") : t("members.invitation.add.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberModal;
