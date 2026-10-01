import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { LuCamera, LuCheck, LuInfo, LuShieldCheck, LuUser } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { userApi } from "@/services/userApi";
import { mediaApi } from "@/services/mediaApi";
import { ekycApi } from "@/services/ekycApi";
import type { EkycStatusResponse } from "@/types/ekyc";
import type { UserProfile, UserProfileUpdateRequest } from "@/types";

interface ProfileSettingsSectionProps {
  profile: UserProfile | null;
  hideEmail: boolean;
}

const fieldClass = "w-full h-10 px-3.5 bg-muted/40 focus:bg-card rounded-xl border border-border focus:border-primary text-xs sm:text-sm text-foreground outline-none transition-all admin-form-input";
const splitName = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return { familyName: parts.slice(0, -1).join(" "), givenName: parts.at(-1) || "" };
};

export default function ProfileSettingsSection({ profile, hideEmail }: ProfileSettingsSectionProps) {
  const { i18n } = useTranslation();
  const en = i18n.resolvedLanguage === "en";
  const copy = (vi: string, english: string) => en ? english : vi;
  const [current, setCurrent] = useState<UserProfile | null>(profile);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState<UserProfileUpdateRequest>({ fullName: "", phoneNumber: "", gender: "OTHER", avatarUrl: "" });
  const [nameParts, setNameParts] = useState({ familyName: "", givenName: "" });
  const [identity, setIdentity] = useState<EkycStatusResponse | null>(null);

  useEffect(() => {
    let active = true;
    userApi.syncCurrentUser().then((value) => {
      if (!active) return;
      setCurrent(value);
      setForm({ fullName: value.fullName || "", phoneNumber: value.phoneNumber || "", gender: value.gender || "OTHER", avatarUrl: value.avatarUrl || "" });
      setNameParts(splitName(value.fullName || ""));
      setVerified(true);
      setError("");
    }).catch(() => {
      if (active) setError(en ? "Could not load your profile from the server. Please try again later." : "Không thể tải hồ sơ từ máy chủ. Vui lòng thử lại sau.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [en]);

  useEffect(() => {
    let active = true;
    ekycApi.getStatus().then((value) => { if (active) setIdentity(value); }).catch(() => {});
    return () => { active = false; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!verified || saving || uploading) return;
    setMessage("");
    setError("");
    const payload = { ...form, fullName: [nameParts.familyName.trim(), nameParts.givenName.trim()].filter(Boolean).join(" "), phoneNumber: form.phoneNumber?.trim() || "", avatarUrl: form.avatarUrl?.trim() || "" };
    if (!payload.fullName) {
      setError(copy("Vui lòng nhập họ tên.", "Please enter your name."));
      return;
    }
    setSaving(true);
    try {
      const updated = await userApi.updateProfile(payload);
      setCurrent(updated);
      setForm({ fullName: updated.fullName || "", phoneNumber: updated.phoneNumber || "", gender: updated.gender || "OTHER", avatarUrl: updated.avatarUrl || "" });
      setNameParts(splitName(updated.fullName || ""));
      setMessage(copy("Đã lưu thông tin hồ sơ.", "Profile saved."));
      toast.success(copy("Đã lưu thông tin hồ sơ.", "Profile saved."));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy("Không thể lưu hồ sơ.", "Could not save profile."));
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !verified || uploading) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError(copy("Vui lòng chọn ảnh JPG, PNG hoặc WebP tối đa 5 MB.", "Choose a JPG, PNG or WebP image up to 5 MB."));
      return;
    }
    setError("");
    setMessage("");
    setUploading(true);
    try {
      const result = await mediaApi.uploadImage(file, "avatars");
      if (!result?.imageUrl) throw new Error(copy("Không thể tải ảnh lên.", "Could not upload image."));
      setForm((previous) => ({ ...previous, avatarUrl: result.imageUrl }));
      setMessage(copy("Ảnh đã tải lên. Chọn Lưu thay đổi để đặt làm ảnh đại diện.", "Image uploaded. Select Save changes to set it as your avatar."));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy("Không thể tải ảnh lên.", "Could not upload image."));
    } finally {
      setUploading(false);
    }
  }

  const name = current?.fullName || copy("Tài khoản quản trị", "Admin account");
  const email = hideEmail ? "••••••" : current?.email || "—";
  const isVerified = identity?.status === "APPROVED";
  const labelAdmin = copy("QUẢN TRỊ VIÊN", "ADMINISTRATOR");

  return (
    <div className="space-y-6 text-sm max-w-2xl">
      {/* 1. Profile Header Card */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 shadow-2xs">
        <div className="relative group">
          <input
            ref={avatarInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void uploadAvatar(event)}
            className="sr-only"
            aria-label={copy("Chọn ảnh đại diện", "Choose avatar image")}
          />
          <div className="relative h-18 w-18 sm:h-20 sm:w-20 rounded-full border border-border bg-[color-mix(in_srgb,var(--color-brand-primary)_12%,var(--bg-card))] flex items-center justify-center overflow-hidden text-2xl font-bold text-[var(--color-brand-primary)]">
            {form.avatarUrl ? (
              <img src={form.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              name[0]?.toUpperCase() || <LuUser />
            )}
          </div>
          <button
            type="button"
            onClick={() => avatarInput.current?.click()}
            disabled={!verified || uploading || saving}
            aria-label={copy("Thay ảnh đại diện", "Change avatar")}
            className="absolute bottom-0 right-0 p-1.5 rounded-full bg-card border border-border text-foreground hover:text-[var(--color-brand-primary)] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <LuCamera className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1 min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h3 className="font-bold text-base text-foreground">{name}</h3>
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-brand-primary)] bg-[color-mix(in_srgb,var(--color-brand-primary)_10%,transparent)] border border-[color-mix(in_srgb,var(--color-brand-primary)_25%,transparent)] px-2 py-0.5 rounded-full">
              {labelAdmin}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{email}</p>
          {uploading && (
            <p role="status" className="text-xs text-muted-foreground">
              {copy("Đang tải ảnh…", "Uploading…")}
            </p>
          )}
          {isVerified && (
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-800 dark:text-emerald-200">
              <LuShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{copy("Tài khoản này đã xác minh danh tính", "This account is identity verified")}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Form Card */}
      <form onSubmit={save} className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-4 shadow-2xs">
        <div>
          <h3 className="font-bold text-foreground">{copy("Thông tin cá nhân", "Personal information")}</h3>
          <p className="text-xs text-muted-foreground">
            {copy(
              "Các trường có thể chỉnh sửa được lưu vào tài khoản HaloTicket.",
              "Editable fields are saved to your HaloTicket account."
            )}
          </p>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <label className="grid gap-1.5 font-medium text-foreground text-xs sm:text-sm">
            {copy("Tên", "Given name")}
            <input
              className={fieldClass}
              value={nameParts.givenName}
              onChange={(e) => setNameParts({ ...nameParts, givenName: e.target.value })}
              maxLength={120}
              disabled={!verified || saving}
              required
            />
          </label>
          <label className="grid gap-1.5 font-medium text-foreground text-xs sm:text-sm">
            {copy("Họ và tên đệm", "Family and middle name")}
            <input
              className={fieldClass}
              value={nameParts.familyName}
              onChange={(e) => setNameParts({ ...nameParts, familyName: e.target.value })}
              maxLength={120}
              disabled={!verified || saving}
            />
          </label>
          <label className="grid gap-1.5 font-medium text-foreground text-xs sm:text-sm">
            {copy("Tên đăng nhập", "Username")}
            <input
              className={fieldClass}
              value=""
              placeholder={copy("Không được API cung cấp", "Not provided by API")}
              readOnly
            />
          </label>
          <label className="grid gap-1.5 font-medium text-foreground text-xs sm:text-sm">
            {copy("Số điện thoại", "Phone number")}
            <input
              className={fieldClass}
              type="tel"
              value={form.phoneNumber || ""}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              maxLength={30}
              disabled={!verified || saving}
            />
          </label>
          <label className="grid gap-1.5 font-medium text-foreground text-xs sm:text-sm">
            Email
            <input className={fieldClass} value={email} readOnly />
          </label>
          <label className="grid gap-1.5 font-medium text-foreground text-xs sm:text-sm">
            {copy("Ngày sinh", "Birth date")}
            <input
              className={fieldClass}
              value={identity?.birthDate || ""}
              placeholder={copy("Chưa xác minh", "Not verified")}
              readOnly
            />
          </label>
          <label className="grid gap-1.5 font-medium text-foreground text-xs sm:text-sm">
            {copy("Giới tính", "Gender")}
            <select
              className={fieldClass}
              value={form.gender || "OTHER"}
              onChange={(e) =>
                setForm({ ...form, gender: e.target.value as UserProfileUpdateRequest["gender"] })
              }
              disabled={!verified || saving}
            >
              <option value="OTHER">{copy("Khác / chưa chọn", "Other / unspecified")}</option>
              <option value="MALE">{copy("Nam", "Male")}</option>
              <option value="FEMALE">{copy("Nữ", "Female")}</option>
            </select>
          </label>
          <label className="grid gap-1.5 font-medium text-foreground text-xs sm:text-sm">
            {copy("Số CCCD", "Identity document number")}
            <input
              className={fieldClass}
              value={identity?.documentNumber || ""}
              placeholder={copy("Chưa xác minh", "Not verified")}
              readOnly
            />
          </label>
        </div>

        {error && <p role="alert" className="admin-settings-error">{error}</p>}
        {message && (
          <p role="status" className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
            <LuCheck className="w-4 h-4" />
            {message}
          </p>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={!verified || saving || loading || uploading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all shadow-md shadow-primary/25 cursor-pointer disabled:opacity-50"
          >
            <LuCheck className="w-4 h-4" />
            <span>{saving ? copy("Đang lưu…", "Saving…") : copy("Cập nhật thông tin", "Update information")}</span>
          </button>
        </div>
      </form>

      {/* 3. System Info Card */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-2xs">
        <h3 className="font-bold text-foreground">{copy("Thông tin hệ thống", "System information")}</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          {copy("Những thông tin này do hệ thống danh tính quản lý.", "These details are managed by the identity system.")}
        </p>
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            [copy("Tên đăng nhập", "Username"), "—"],
            ["Email", email],
            [copy("Mã tài khoản", "Account ID"), current?.id || "—"],
            [copy("Trạng thái", "Status"), current?.status || "—"],
            [copy("Vai trò", "Roles"), current?.roles?.join(", ") || "—"],
            [
              copy("Ngày tạo", "Created"),
              current?.createdAt
                ? new Date(current.createdAt).toLocaleDateString(en ? "en-US" : "vi-VN")
                : "—",
            ],
          ].map(([fieldLabel, value]) => (
            <div key={fieldLabel} className="min-w-0 rounded-xl border border-border/60 bg-muted/20 p-3">
              <dt className="text-xs text-muted-foreground">{fieldLabel}</dt>
              <dd className="mt-1 break-all font-semibold text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* 4. Address Card */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-2xs">
        <h3 className="font-bold text-foreground">{copy("Địa chỉ", "Address")}</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          {copy("Địa chỉ được trích xuất từ giấy tờ eKYC đã xác minh.", "Address is extracted from your verified eKYC document.")}
        </p>
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 font-medium text-foreground text-xs sm:text-sm">
          {identity?.address || copy("Chưa có địa chỉ xác minh", "No verified address available")}
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <LuInfo className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
          {copy(
            "HaloTicket chưa hỗ trợ chỉnh sửa địa chỉ trong hồ sơ.",
            "HaloTicket does not yet support editing profile addresses."
          )}
        </p>
      </div>
    </div>
  );
}
