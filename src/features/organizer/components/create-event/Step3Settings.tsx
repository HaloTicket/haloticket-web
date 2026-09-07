import { useTranslation } from "react-i18next";
import React from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface Step3SettingsProps {
  isPrivate: boolean;
  setIsPrivate: (v: boolean) => void;
  confirmationMessage: string;
  setConfirmationMessage: (v: string) => void;
  enableCustomQuestions: boolean;
  setEnableCustomQuestions: (v: boolean) => void;
  onBack: () => void;
  onNext: () => void;
}

export const Step3Settings: React.FC<Step3SettingsProps> = ({
  isPrivate,
  setIsPrivate,
  confirmationMessage,
  setConfirmationMessage,
  enableCustomQuestions,
  setEnableCustomQuestions,
  onBack,
  onNext
}) => {
  const { t: translate } = useTranslation();
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="app-bg-card border app-border rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
        <h3 className="text-lg font-extrabold app-text-main border-b app-border pb-4">
          {translate("Cài đặt quyền riêng tư & Tin nhắn xác nhận")} </h3>

        {/* Private link setting */}
        <label className="flex items-start gap-3 p-4 rounded-xl app-bg-subnav border app-border cursor-pointer">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="mt-1 w-4 h-4 rounded accent-blue-600 cursor-pointer"
          />
          <div>
            <span className="text-sm font-extrabold app-text-main block">
              {translate("Chỉ người có link trực tiếp mới đặt được vé (Sự kiện riêng tư)")} </span>
            <span className="text-xs app-text-muted">
              {translate("Sự kiện sẽ không hiển thị trên trang tìm kiếm công khai của HaloTicket.")} </span>
          </div>
        </label>

        {/* Confirmation Message */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold app-text-main">
            <span>{translate("Tin nhắn xác nhận cho người tham gia sau khi đặt vé thành công")}</span>
            <span className="text-[11px] app-text-muted">{confirmationMessage.length} / 500</span>
          </div>
          <textarea
            rows={4}
            maxLength={500}
            value={confirmationMessage}
            onChange={(e) => setConfirmationMessage(e.target.value)}
            placeholder={translate("Nhập lời cảm ơn hoặc hướng dẫn lưu ý check-in...")}
            className="w-full app-bg-subnav app-text-main text-sm rounded-xl p-4 border app-border"
          />
        </div>

        {/* Custom Questions Toggle Switch */}
        <div className="p-4 rounded-xl border border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-extrabold app-text-main">
              {translate("Tạo bảng câu hỏi khảo sát cho người mua vé")} </h4>
            <p className="text-xs app-text-muted mt-0.5">
              {translate("Hệ thống sẽ thêm bước \"Thông tin đăng ký\" để thu thập thông tin CCCD, kích cỡ áo, công ty...")} </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={enableCustomQuestions}
              onChange={(e) => setEnableCustomQuestions(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Stepper Nav Buttons */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 app-bg-subnav app-text-main font-extrabold text-sm rounded-xl border app-border flex items-center gap-2 cursor-pointer"
        >
          <FiChevronLeft className="w-4 h-4" />
          <span>{translate("Quay lại")}</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
        >
          <span>{enableCustomQuestions ? translate("Tiếp tục: Thông tin đăng ký") : translate("Tiếp tục: Thông tin thanh toán")}</span>
          <FiChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Step3Settings;
