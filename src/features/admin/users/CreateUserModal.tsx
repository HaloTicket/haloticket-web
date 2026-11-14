import { useState } from "react";
import { FiCheck, FiRefreshCw, FiUserPlus } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AdminModal } from "@/components/admin/AdminModal";
import { adminUserApi } from "@/services/adminUserApi";
import { adminUserErrorMessage } from "./adminUserErrors";
import { ASSIGNABLE_ROLES, EMAIL_PATTERN, ROLE_HINT, ROLE_LABEL, VN_PHONE_PATTERN } from "./roleOptions";

interface Props {
  onClose: () => void;
  /** called after the account exists, so the list and the counts can be reloaded */
  onCreated: () => void;
}

interface Fields {
  email: string;
  fullName: string;
  phoneNumber: string;
}

const inputClass = "min-h-10 w-full rounded-md border app-border app-bg-card px-3 text-sm app-text-main placeholder:app-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50";

export function CreateUserModal({ onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const [fields, setFields] = useState<Fields>({ email: "", fullName: "", phoneNumber: "" });
  const [roles, setRoles] = useState<string[]>(["CUSTOMER"]);
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const email = fields.email.trim();
  const name = fields.fullName.trim();
  const phone = fields.phoneNumber.replace(/[\s.\-()]/g, "");
  const errors: Partial<Record<keyof Fields | "roles", string>> = {};
  if (!EMAIL_PATTERN.test(email)) errors.email = t("Email không hợp lệ.");
  if (name.length < 2 || name.length > 100) errors.fullName = t("Họ tên phải từ 2 đến 100 ký tự.");
  if (phone && !VN_PHONE_PATTERN.test(phone)) errors.phoneNumber = t("Số điện thoại không hợp lệ (ví dụ 0912345678).");
  if (roles.length === 0) errors.roles = t("Cần chọn ít nhất một vai trò.");
  const hasErrors = Object.keys(errors).length > 0;

  const set = (key: keyof Fields) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFields((prev) => ({ ...prev, [key]: event.target.value }));
    setServerError(null);
  };

  const toggleRole = (role: string) => {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
    setServerError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (hasErrors) return;
    setPending(true);
    setServerError(null);
    try {
      await adminUserApi.createUser({ email, fullName: name, phoneNumber: phone || undefined, roles });
      toast.success(t("Đã tạo tài khoản. Người dùng đặt mật khẩu bằng chức năng Quên mật khẩu với email này."));
      onCreated();
      onClose();
    } catch (error) {
      setServerError(adminUserErrorMessage(error, t, t("Không thể tạo tài khoản. Vui lòng thử lại.")));
    } finally {
      setPending(false);
    }
  };

  const fieldError = (key: keyof typeof errors) => (touched && errors[key] ? (
    <p className="mt-1 text-[11px] font-medium text-red-600 dark:text-red-400" role="alert">{errors[key]}</p>
  ) : null);

  return (
    <AdminModal
      title={t("Thêm người dùng")}
      subtitle={t("Tạo tài khoản cho một người khác. Hệ thống không đặt mật khẩu hộ.")}
      icon={<FiUserPlus className="h-5 w-5" aria-hidden="true" />}
      onClose={onClose}
      maxWidth="md"
      pending={pending}
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor="new-user-email" className="mb-1 block text-xs font-bold app-text-main">{t("Email")} *</label>
          <input id="new-user-email" type="email" autoComplete="off" value={fields.email} onChange={set("email")} placeholder="ten@congty.vn" className={inputClass} aria-invalid={touched && !!errors.email} />
          {fieldError("email")}
        </div>

        <div>
          <label htmlFor="new-user-name" className="mb-1 block text-xs font-bold app-text-main">{t("Họ và tên")} *</label>
          <input id="new-user-name" type="text" autoComplete="off" value={fields.fullName} onChange={set("fullName")} className={inputClass} aria-invalid={touched && !!errors.fullName} />
          {fieldError("fullName")}
        </div>

        <div>
          <label htmlFor="new-user-phone" className="mb-1 block text-xs font-bold app-text-main">{t("Số điện thoại")} <span className="font-normal app-text-muted">({t("không bắt buộc")})</span></label>
          <input id="new-user-phone" type="tel" autoComplete="off" value={fields.phoneNumber} onChange={set("phoneNumber")} placeholder="0912345678" className={inputClass} aria-invalid={touched && !!errors.phoneNumber} />
          {fieldError("phoneNumber")}
        </div>

        <fieldset>
          <legend className="mb-2 text-xs font-bold app-text-main">{t("Vai trò")} *</legend>
          <div className="space-y-2">
            {ASSIGNABLE_ROLES.map((role) => (
              <label key={role} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${roles.includes(role) ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/10" : "app-border hover:app-bg-subnav"}`}>
                <input type="checkbox" className="h-4 w-4 cursor-pointer rounded app-border" checked={roles.includes(role)} onChange={() => toggleRole(role)} />
                <span className="flex-1">
                  <span className="block text-[13px] font-bold app-text-main">{t(ROLE_LABEL[role])}</span>
                  <span className="block text-[11px] app-text-muted">{t(ROLE_HINT[role])}</span>
                </span>
              </label>
            ))}
          </div>
          {fieldError("roles")}
        </fieldset>

        <p className="rounded-md app-bg-subnav px-3 py-2 text-[11px] leading-relaxed app-text-muted">
          {t("Tài khoản mới chưa có mật khẩu. Người dùng vào trang đăng nhập, chọn Quên mật khẩu và nhập email này để nhận mã xác nhận và tự đặt mật khẩu. Vai trò được lưu trong hệ thống người dùng của HaloTicket.")}
        </p>

        {serverError && (
          <div role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">{serverError}</div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={pending} className="rounded-lg border app-border app-bg-card px-4 py-2 text-xs font-bold app-text-main transition-colors hover:app-bg-subnav disabled:opacity-50">
            {t("Hủy")}
          </button>
          <button type="submit" disabled={pending} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
            {pending ? <FiRefreshCw className="animate-spin" aria-hidden="true" /> : <FiCheck aria-hidden="true" />}
            {t("Tạo tài khoản")}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}

export default CreateUserModal;
