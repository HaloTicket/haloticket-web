import React from "react";
import { FiDollarSign, FiChevronLeft, FiCheckCircle } from "react-icons/fi";

interface Step5PaymentInfoProps {
  accountHolder: string;
  setAccountHolder: (v: string) => void;
  accountNumber: string;
  setAccountNumber: (v: string) => void;
  bankName: string;
  setBankName: (v: string) => void;
  bankBranch: string;
  setBankBranch: (v: string) => void;
  businessType: "individual" | "company";
  setBusinessType: (v: "individual" | "company") => void;
  taxName: string;
  setTaxName: (v: string) => void;
  taxAddress: string;
  setTaxAddress: (v: string) => void;
  taxCode: string;
  setTaxCode: (v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export const Step5PaymentInfo: React.FC<Step5PaymentInfoProps> = ({
  accountHolder,
  setAccountHolder,
  accountNumber,
  setAccountNumber,
  bankName,
  setBankName,
  bankBranch,
  setBankBranch,
  businessType,
  setBusinessType,
  taxName,
  setTaxName,
  taxAddress,
  setTaxAddress,
  taxCode,
  setTaxCode,
  onBack,
  onSubmit
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Bank Info Section */}
      <div className="app-bg-card border app-border rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-extrabold app-text-main flex items-center gap-2">
            <FiDollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Thông tin tài khoản ngân hàng nhận tiền</span>
          </h3>
          <p className="text-xs app-text-muted mt-1 leading-relaxed">
            HaloTicket sẽ chuyển tiền bán vé trực tiếp đến tài khoản này. Tiền bán vé (sau khi trừ phí dịch vụ) sẽ được đối soát và chuyển vào tài khoản của bạn trong 7 - 10 ngày làm việc sau khi kết thúc sự kiện.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold app-text-main">
              <span><span className="text-rose-500">*</span> Tên chủ tài khoản (Viết hoa không dấu)</span>
              <span className="text-[11px] app-text-muted">{accountHolder.length} / 100</span>
            </div>
            <input
              type="text"
              maxLength={100}
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
              placeholder="NGUYEN VAN A"
              className="w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-3 border app-border font-bold uppercase"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold app-text-main"><span className="text-rose-500">*</span> Số tài khoản ngân hàng</label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="1900xxxxxxxxx"
              className="w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-3 border app-border font-mono font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold app-text-main"><span className="text-rose-500">*</span> Tên Ngân Hàng</label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-3 border app-border font-semibold cursor-pointer"
            >
              <option value="Vietcombank">Vietcombank (VCB)</option>
              <option value="Techcombank">Techcombank (TCB)</option>
              <option value="MBBank">MBBank (MB)</option>
              <option value="BIDV">BIDV</option>
              <option value="VietinBank">VietinBank</option>
              <option value="ACB">ACB</option>
              <option value="VPBank">VPBank</option>
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold app-text-main">
              <span>Chi nhánh ngân hàng</span>
              <span className="text-[11px] app-text-muted">{bankBranch.length} / 100</span>
            </div>
            <input
              type="text"
              maxLength={100}
              value={bankBranch}
              onChange={(e) => setBankBranch(e.target.value)}
              placeholder="Chi nhánh TP.HCM, Quận 1..."
              className="w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-3 border app-border"
            />
          </div>
        </div>
      </div>

      {/* VAT Invoice Section */}
      <div className="app-bg-card border app-border rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
        <h3 className="text-lg font-extrabold app-text-main border-b app-border pb-4">
          Thông tin xuất hóa đơn đỏ (VAT)
        </h3>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold app-text-main">Loại hình kinh doanh</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as "individual" | "company")}
              className="w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-3 border app-border font-bold cursor-pointer"
            >
              <option value="individual">Cá nhân</option>
              <option value="company">Doanh nghiệp / Tổ chức</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold app-text-main">
                <span>{businessType === "company" ? "* Tên công ty / Tổ chức" : "* Họ và tên cá nhân"}</span>
                <span className="text-[11px] app-text-muted">{taxName.length} / 100</span>
              </div>
              <input
                type="text"
                maxLength={100}
                value={taxName}
                onChange={(e) => setTaxName(e.target.value)}
                placeholder={businessType === "company" ? "Công ty TNHH Sự Kiện..." : "Nguyễn Văn A"}
                className="w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-3 border app-border"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold app-text-main">Mã số thuế</label>
              <input
                type="text"
                value={taxCode}
                onChange={(e) => setTaxCode(e.target.value)}
                placeholder="0312345678"
                className="w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-3 border app-border font-mono"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <div className="flex justify-between text-xs font-bold app-text-main">
                <span>Địa chỉ xuất hóa đơn</span>
                <span className="text-[11px] app-text-muted">{taxAddress.length} / 100</span>
              </div>
              <input
                type="text"
                maxLength={100}
                value={taxAddress}
                onChange={(e) => setTaxAddress(e.target.value)}
                placeholder="Nhập địa chỉ đăng ký thuế..."
                className="w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-3 border app-border"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Final Submit & Back Buttons */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 app-bg-subnav app-text-main font-extrabold text-sm rounded-xl border app-border flex items-center gap-2 cursor-pointer"
        >
          <FiChevronLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>

        <button
          type="button"
          onClick={onSubmit}
          className="px-10 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm md:text-base rounded-xl shadow-xl flex items-center gap-2 cursor-pointer transition-all active:scale-95"
        >
          <FiCheckCircle className="w-5 h-5" />
          <span>Gửi yêu cầu duyệt sự kiện</span>
        </button>
      </div>
    </div>
  );
};

export default Step5PaymentInfo;
