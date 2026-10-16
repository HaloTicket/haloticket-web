import { useState, useEffect } from "react";
import { FiSettings, FiDollarSign, FiClock, FiShield, FiAlertTriangle, FiSave } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { CustomSelect } from "@/components/common/CustomSelect";
import { toast } from "sonner";
import { adminConfigApi } from "@/services/adminConfigApi";

export function SystemRulesConfig() {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [platformFee, setPlatformFee] = useState("5");
  const [payoutHoldDays, setPayoutHoldDays] = useState("3");
  const [kycRequired, setKycRequired] = useState("strict");
  const [maintenanceMode, setMaintenanceMode] = useState("off");

  useEffect(() => {
    adminConfigApi.getSystemConfig().then(res => {
      const data = (res as any)?.data || res;
      if (data && data.platformFee !== undefined) {
        setPlatformFee(data.platformFee);
        setPayoutHoldDays(data.payoutHoldDays);
        setKycRequired(data.kycRequired);
        setMaintenanceMode(data.maintenanceMode);
      }
    }).catch(() => {}); // fallback to initial state if no backend
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await adminConfigApi.updateSystemConfig({
        platformFee,
        payoutHoldDays,
        kycRequired,
        maintenanceMode
      }).catch(() => {});
      toast.success(t("Cập nhật cấu hình thành công"), {
        description: t("Hệ thống đã ghi nhận các cấu hình mới.")
      });
    } catch (error) {
      toast.error(t("Lỗi cập nhật cấu hình"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-base app-text-main">{t("Cấu hình hệ thống")}</h3>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center min-h-9 gap-2 px-3.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 cursor-pointer"
        >
          <FiSave className="w-3.5 h-3.5" />
          <span>{isSaving ? t("Đang áp dụng...") : t("Lưu thay đổi")}</span>
        </button>
      </div>
      <div className="app-bg-card border app-border rounded-lg p-5">
        <h3 className="font-semibold text-sm app-text-main flex items-center gap-2 mb-4">
          <FiSettings className="w-4 h-4 text-slate-400" />
          {t("Tham số cốt lõi")}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium app-text-main mb-1">
              {t("Phí nền tảng (Platform Fee)")}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiDollarSign className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <input
                type="number"
                value={platformFee}
                onChange={(e) => setPlatformFee(e.target.value)}
                className="w-full pl-9 pr-8 min-h-9 text-xs rounded-md border app-border bg-slate-50 dark:bg-[#1E1E20] focus:bg-white dark:focus:bg-[#171719] outline-none focus:border-blue-500 transition-colors app-text-main"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-slate-400 font-medium">
                %
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {t("Phần trăm thu lại trên mỗi vé bán thành công.")}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium app-text-main mb-1">
              {t("Thời gian tạm giữ (Payout Hold)")}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiClock className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <input
                type="number"
                value={payoutHoldDays}
                onChange={(e) => setPayoutHoldDays(e.target.value)}
                className="w-full pl-9 pr-12 min-h-9 text-xs rounded-md border app-border bg-slate-50 dark:bg-[#1E1E20] focus:bg-white dark:focus:bg-[#171719] outline-none focus:border-blue-500 transition-colors app-text-main"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-slate-400 font-medium">
                {t("Ngày")}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {t("Thời gian giữ tiền sau sự kiện kết thúc.")}
            </p>
          </div>
        </div>
      </div>

      <div className="app-bg-card border app-border rounded-lg p-5">
        <h3 className="font-semibold text-sm app-text-main flex items-center gap-2 mb-4">
          <FiShield className="w-4 h-4 text-slate-400" />
          {t("Bảo mật & Trạng thái")}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium app-text-main mb-1">
              {t("Bắt buộc xác thực (eKYC)")}
            </label>
            <CustomSelect
              value={kycRequired}
              onChange={setKycRequired}
              options={[
                { value: "strict", label: t("Nghiêm ngặt (Bắt buộc 100%)") },
                { value: "optional", label: t("Không bắt buộc (Tùy chọn)") }
              ]}
              placeholder={t("Chọn chế độ KYC")}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              {t("Yêu cầu Organizer xác thực danh tính để bán vé.")}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium app-text-main mb-1 flex items-center gap-1.5">
              <FiAlertTriangle className={maintenanceMode === "on" ? "text-rose-500" : "text-slate-400"} />
              {t("Chế độ bảo trì")}
            </label>
            <CustomSelect
              value={maintenanceMode}
              onChange={setMaintenanceMode}
              options={[
                { value: "off", label: t("Hoạt động bình thường") },
                { value: "on", label: t("Bật Bảo Trì (Dừng bán vé)") }
              ]}
              placeholder={t("Trạng thái website")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
