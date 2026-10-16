import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { FiArrowLeft, FiUser, FiCheckCircle, FiXCircle, FiLock, FiUnlock, FiRefreshCw, FiClock, FiShield } from "react-icons/fi";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminDataState } from "@/components/admin/AdminDataState";
import { useTranslation } from "react-i18next";
import { adminUserApi } from "@/services/adminUserApi";
import type { AdminUserDetailResponse } from "@/types";
import { PATHS } from "@/routes/paths";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminUserDetail() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<AdminUserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const backUrl = PATHS.ADMIN_USER_MANAGEMENT;

  const fetchUser = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await adminUserApi.getUserDetail(userId);
      setUser(res);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(t("Lỗi tải thông tin người dùng."));
    } finally {
      setLoading(false);
    }
  }, [userId, t]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!userId) return;
    try {
      await adminUserApi.updateUserStatus(userId, newStatus);
      toast.success(newStatus === "ACTIVE" ? t("Đã mở khóa tài khoản thành công!") : t("Đã khóa tài khoản thành công!"));
      fetchUser();
    } catch (err) {
      toast.error(t("Không thể cập nhật trạng thái tài khoản."));
    }
  };

  const backBtn = (
    <Link to={backUrl} className="inline-flex min-h-9 items-center gap-2 rounded-md border app-border app-bg-card px-4 text-sm font-semibold app-text-main transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
      <FiArrowLeft /> {t("Quay lại")}
    </Link>
  );

  if (loading && !user) return <div className="space-y-6"><AdminPageHeader title={t("Chi tiết người dùng")} actions={backBtn} /><AdminDataState state="loading" /></div>;
  if (error) return <div className="space-y-6"><AdminPageHeader title={t("Chi tiết người dùng")} actions={backBtn} /><AdminDataState state="error" message={error} onRetry={fetchUser} /></div>;
  if (!user) return <div className="space-y-6"><AdminPageHeader title={t("Chi tiết người dùng")} actions={backBtn} /><AdminDataState state="empty" message={t("Không tìm thấy người dùng này.")} /></div>;

  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title={t("Chi tiết người dùng")}
        description={`ID: ${user.id}`}
        actions={
          <div className="flex items-center gap-2">
            {backBtn}
            <button onClick={() => fetchUser()} className="inline-flex min-h-9 items-center gap-2 rounded-md border app-border app-bg-card px-4 text-sm font-semibold app-text-main transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
              <FiRefreshCw /> {t("Làm mới")}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          {/* Main Info Card */}
          <section className="rounded-xl shadow-xs border app-border app-bg-card p-6 flex flex-col items-center text-center">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-24 h-24 rounded-full object-cover border-4 app-border mb-4" />
            ) : (
              <div className="w-24 h-24 rounded-full app-bg-subnav flex items-center justify-center text-slate-400 mb-4 border-4 app-border">
                <FiUser className="w-10 h-10" />
              </div>
            )}
            <h2 className="text-xl font-bold app-text-main">{user.fullName || t("Người dùng")}</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{user.email}</p>
            
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${user.status === "ACTIVE" ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400" : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"}`}>
                {user.status === "ACTIVE" ? t("Đang hoạt động") : t("Đã bị khóa")}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${user.ekycStatus === "VERIFIED" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400" : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"}`}>
                <FiShield className="w-3 h-3" />
                {user.ekycStatus === "VERIFIED" ? t("Đã xác minh KYC") : user.ekycStatus === "PENDING" ? t("KYC Chờ duyệt") : t("Chưa có KYC")}
              </span>
            </div>

            <div className="w-full mt-6 pt-6 border-t app-border flex justify-center gap-3">
              {user.status === "ACTIVE" ? (
                <button onClick={() => handleUpdateStatus("INACTIVE")} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-900/50 cursor-pointer w-full justify-center">
                  <FiLock /> {t("Khóa tài khoản")}
                </button>
              ) : (
                <button onClick={() => handleUpdateStatus("ACTIVE")} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 cursor-pointer w-full justify-center">
                  <FiUnlock /> {t("Mở khóa")}
                </button>
              )}
            </div>
          </section>

          {/* Additional Info */}
          <section className="rounded-xl shadow-xs border app-border app-bg-card p-5 space-y-4">
            <h3 className="font-bold app-text-main text-sm uppercase tracking-wider">{t("Thông tin tài khoản")}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b app-border pb-2">
                <span className="app-text-muted">{t("Vai trò")}</span>
                <div className="flex flex-col items-end gap-1">
                  {user.roles?.map(r => <span key={r} className="font-medium app-text-main">{r}</span>)}
                </div>
              </div>
              <div className="flex justify-between border-b app-border pb-2">
                <span className="app-text-muted">{t("Tham gia lúc")}</span>
                <span className="font-medium app-text-main flex items-center gap-1">
                  <FiClock className="w-3 h-3" />
                  {user.createdAt ? format(new Date(user.createdAt), "dd/MM/yyyy HH:mm") : "-"}
                </span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="app-text-muted">{t("Lần đăng nhập cuối")}</span>
                <span className="font-medium app-text-main">
                  {user.lastLoginAt ? format(new Date(user.lastLoginAt), "dd/MM/yyyy HH:mm") : "-"}
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* General Information */}
          <section className="rounded-xl shadow-xs border app-border app-bg-card overflow-hidden">
            <div className="app-bg-subnav border-b app-border p-4">
              <h3 className="font-bold app-text-main">{t("Thông tin liên hệ & Cá nhân")}</h3>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Email")}</span>
                <p className="font-medium app-text-main">{user.email || "-"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Số điện thoại")}</span>
                <p className="font-medium app-text-main">{user.phoneNumber || "-"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Giới tính")}</span>
                <p className="font-medium app-text-main">
                  {user.gender === "MALE" ? t("Nam") : user.gender === "FEMALE" ? t("Nữ") : t("Khác")}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Keycloak ID")}</span>
                <p className="font-medium app-text-main font-mono text-xs">{user.keycloakId}</p>
              </div>
            </div>
          </section>

          {/* eKYC Information */}
          <section className="rounded-xl shadow-xs border app-border app-bg-card overflow-hidden">
            <div className="app-bg-subnav border-b app-border p-4 flex items-center justify-between">
              <h3 className="font-bold app-text-main flex items-center gap-2">
                <FiShield /> {t("Hồ sơ eKYC")}
              </h3>
              {user.ekycStatus === "VERIFIED" && (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <FiCheckCircle className="w-3 h-3" /> {t("Đã duyệt")}
                </span>
              )}
            </div>
            {user.ekycStatus && user.ekycStatus !== "UNVERIFIED" ? (
              <div className="p-5 space-y-6 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Tên hợp pháp (Legal Name)")}</span>
                    <p className="font-medium app-text-main">{user.ekycLegalName || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Ngày sinh")}</span>
                    <p className="font-medium app-text-main">{user.ekycBirthDate || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Loại giấy tờ")}</span>
                    <p className="font-medium app-text-main">{user.ekycDocumentType || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Số giấy tờ")}</span>
                    <p className="font-medium app-text-main font-mono">{user.ekycDocumentNumber || "-"}</p>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Địa chỉ thường trú")}</span>
                    <p className="font-medium app-text-main">{user.ekycAddress || "-"}</p>
                  </div>
                  {user.ekycApprovedAt && (
                    <div className="space-y-1 sm:col-span-2 border-t app-border pt-4 mt-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Thời gian duyệt KYC")}</span>
                      <p className="font-medium app-text-main flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <FiCheckCircle className="w-4 h-4" />
                        {format(new Date(user.ekycApprovedAt), "dd/MM/yyyy HH:mm:ss")}
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t app-border pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">{t("Ảnh mặt trước")}</span>
                    {user.ekycFrontImageUrl ? (
                      <div className="aspect-[3/2] w-full max-w-[300px] rounded-lg border app-border overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <img src={user.ekycFrontImageUrl} alt="Front" className="w-full h-full object-cover" />
                      </div>
                    ) : <span className="app-text-muted italic">{t("Không có dữ liệu")}</span>}
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">{t("Ảnh mặt sau")}</span>
                    {user.ekycBackImageUrl ? (
                      <div className="aspect-[3/2] w-full max-w-[300px] rounded-lg border app-border overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <img src={user.ekycBackImageUrl} alt="Back" className="w-full h-full object-cover" />
                      </div>
                    ) : <span className="app-text-muted italic">{t("Không có dữ liệu")}</span>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                <FiXCircle className="w-8 h-8 mb-3 opacity-20" />
                <p>{t("Người dùng này chưa thực hiện định danh KYC.")}</p>
              </div>
            )}
          </section>

          {/* Financial & Business Information (if applicable) */}
          {(user.bankAccountNumber || user.taxCode) && (
            <section className="rounded-xl shadow-xs border app-border app-bg-card overflow-hidden">
              <div className="app-bg-subnav border-b app-border p-4">
                <h3 className="font-bold app-text-main">{t("Thông tin tài chính & Doanh nghiệp")}</h3>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                {user.bankName && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Ngân hàng")}</span>
                    <p className="font-medium app-text-main">{user.bankName} {user.bankBranch ? `- ${user.bankBranch}` : ""}</p>
                  </div>
                )}
                {user.bankAccountNumber && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Số tài khoản")}</span>
                    <p className="font-medium app-text-main font-mono">{user.bankAccountNumber}</p>
                  </div>
                )}
                {user.bankAccountName && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Chủ tài khoản")}</span>
                    <p className="font-medium app-text-main">{user.bankAccountName}</p>
                  </div>
                )}
                <div className="sm:col-span-2 border-t app-border my-2"></div>
                {user.businessType && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Loại hình kinh doanh")}</span>
                    <p className="font-medium app-text-main">{user.businessType}</p>
                  </div>
                )}
                {user.taxCode && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Mã số thuế")}</span>
                    <p className="font-medium app-text-main font-mono">{user.taxCode}</p>
                  </div>
                )}
                {user.taxName && (
                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Tên đơn vị nộp thuế")}</span>
                    <p className="font-medium app-text-main">{user.taxName}</p>
                  </div>
                )}
                {user.taxAddress && (
                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Địa chỉ đăng ký kinh doanh")}</span>
                    <p className="font-medium app-text-main">{user.taxAddress}</p>
                  </div>
                )}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
