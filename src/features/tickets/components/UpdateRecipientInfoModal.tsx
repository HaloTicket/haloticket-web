import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiCheck } from 'react-icons/fi';

export interface RecipientInfoData {
  recipientName: string;
  phone: string;
  email: string;
  city: string;
  ward: string;
  address: string;
  note: string;
}

export interface UpdateRecipientInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: RecipientInfoData) => void;
  initialData?: {
    fullName?: string;
    phone?: string;
    email?: string;
  };
  isLoading?: boolean;
}

const CITIES = [
  'TP. Hồ Chí Minh',
  'Hà Nội',
  'Đà Nẵng',
  'Cần Thơ',
  'Hải Phòng',
  'Bình Dương',
  'Đồng Nai',
  'Quảng Ninh',
  'Khánh Hòa',
  'Lâm Đồng',
];

const WARDS = [
  'Phường Bến Nghé',
  'Phường Bến Thành',
  'Phường Thảo Điền',
  'Phường 1',
  'Phường 2',
  'Phường 3',
  'Phường Hoàn Kiếm',
  'Phường Dịch Vọng',
  'Phường Hải Châu 1',
];

export const UpdateRecipientInfoModal: React.FC<UpdateRecipientInfoModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialData,
  isLoading = false,
}) => {
  const [recipientName, setRecipientName] = useState(initialData?.fullName || '');
  const [countryCode, setCountryCode] = useState('+84');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [city, setCity] = useState('TP. Hồ Chí Minh');
  const [ward, setWard] = useState('Phường Bến Nghé');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');

  React.useEffect(() => {
    if (initialData && isOpen) {
      if (initialData.fullName) setRecipientName(initialData.fullName);
      if (initialData.phone) {
        const rawPhone = initialData.phone.replace(/^\+84\s*/, '');
        setPhone(rawPhone);
      }
      if (initialData.email) setEmail(initialData.email);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      recipientName: recipientName.trim(),
      phone: `${countryCode} ${phone.trim()}`,
      email: email.trim(),
      city,
      ward,
      address: address.trim(),
      note: note.trim(),
    });
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl app-bg-card border app-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b app-border bg-slate-500/5">
          <h3 className="text-base font-black app-text-main">Cập nhật thông tin nhận vé</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-9 h-9 rounded-xl flex items-center justify-center app-text-muted hover:app-text-main hover:bg-slate-500/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs font-semibold flex-1">
          {/* Tên người nhận */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold app-text-main">
              Tên người nhận <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Điền tên người nhận vé"
              className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs font-bold focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Số điện thoại */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold app-text-main">
              Số điện thoại <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="px-3 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="+84">🇻🇳 +84</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+81">🇯🇵 +81</option>
                <option value="+82">🇰🇷 +82</option>
                <option value="+65">🇸🇬 +65</option>
              </select>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại"
                className="flex-1 px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs font-bold focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold app-text-main">
              Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs font-bold focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Shipping Address Section */}
          <div className="pt-3 border-t app-border space-y-3">
            <span className="block text-[11px] font-bold app-text-muted italic">
              Địa chỉ nhận hàng (vui lòng cập nhật khi mua vé cứng)
            </span>

            {/* Tỉnh / Thành Phố */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold app-text-main">Tỉnh/Thành Phố</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Phường / Xã */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold app-text-main">Phường/Xã</label>
              <select
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {WARDS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>

            {/* Địa chỉ */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold app-text-main">Địa chỉ</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Nhập địa chỉ nhà, số đường..."
                className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs font-bold focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Lưu ý */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold app-text-main">Lưu ý</label>
              <span className="text-[10px] app-text-muted font-mono">{note.length} / 50</span>
            </div>
            <input
              type="text"
              maxLength={50}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú thêm (tối đa 50 ký tự)"
              className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs font-bold focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t app-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl app-bg-main border app-border app-text-muted hover:app-text-main text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Huỷ bỏ
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <span>Đang kết nối VNPay...</span>
              ) : (
                <>
                  <FiCheck className="w-4 h-4" />
                  <span>Xác nhận</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const portalTarget = typeof document !== 'undefined' ? (document.fullscreenElement || document.body) : null;
  if (!portalTarget) return null;

  return createPortal(modalContent, portalTarget);
};

export default UpdateRecipientInfoModal;
