import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminModal } from '../../../../components/admin/AdminModal';
import { FiMapPin, FiUsers, FiHome } from 'react-icons/fi';

export interface VenueFormData {
  id?: string;
  name: string;
  address: string;
  city: string;
  ward?: string;
  capacity: number;
  type?: 'indoor' | 'outdoor' | 'hybrid';
  verified: boolean;
}

interface VenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: VenueFormData) => Promise<boolean>;
  editingVenue?: VenueFormData | null;
}

export const VenueModal: React.FC<VenueModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingVenue,
}) => {
  const { t: translate } = useTranslation();
  const defaultFormData: VenueFormData = {
    name: '',
    address: '',
    city: 'TP. Hồ Chí Minh',
    ward: '',
    capacity: 1000,
    type: 'indoor',
    verified: true,
  };

  const [formData, setFormData] = useState<VenueFormData>(editingVenue || defaultFormData);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submitLock = useRef(false);
  const [prevEditingVenue, setPrevEditingVenue] = useState(editingVenue);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (editingVenue !== prevEditingVenue || isOpen !== prevIsOpen) {
    setPrevEditingVenue(editingVenue);
    setPrevIsOpen(isOpen);
    setFormData(editingVenue || defaultFormData);
    setError("");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLock.current) return;
    if (!formData.name.trim() || !formData.address.trim() || !formData.city.trim() ||
      !Number.isFinite(formData.capacity) || formData.capacity < 0 || !Number.isInteger(formData.capacity)) {
      setError(translate("Vui lòng nhập tên, địa chỉ, thành phố và sức chứa hợp lệ."));
      return;
    }
    submitLock.current = true;
    setPending(true);
    setError("");
    try {
      if (await onSubmit(formData)) onClose();
      else setError(translate("Không thể lưu địa điểm. Vui lòng thử lại."));
    } catch {
      setError(translate("Không thể lưu địa điểm. Vui lòng thử lại."));
    } finally {
      submitLock.current = false;
      setPending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AdminModal
      title={editingVenue ? translate('Chỉnh Sửa Địa Điểm') : translate('Thêm Địa Điểm Chính Thức')}
      icon={<FiHome className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
      onClose={() => { if (!submitLock.current) onClose(); }}
      pending={pending}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Venue Name */}
        <div>
          <label htmlFor="venue-name" className="block text-xs font-semibold text-app-text-muted uppercase tracking-wider mb-1.5">
            {translate("Tên địa điểm")} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <FiHome className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-app-text-muted" />
            <input
              id="venue-name"
              type="text"
              required
              placeholder={translate("VD: Trung Tâm Hội Nghị Gem Center")}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-app-bg-card border border-app border-app-border text-app-text-main text-xs focus:outline-none focus:border-blue-500 transition-colors font-medium"
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label htmlFor="venue-address" className="block text-xs font-semibold text-app-text-muted uppercase tracking-wider mb-1.5">
            {translate("Địa chỉ chi tiết")} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <FiMapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-app-text-muted" />
            <input
              id="venue-address"
              type="text"
              required
              placeholder={translate("VD: 8 Nguyễn Bỉnh Khiêm, Đa Kao, Quận 1")}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-app-bg-card border border-app border-app-border text-app-text-main text-xs focus:outline-none focus:border-blue-500 transition-colors font-medium"
            />
          </div>
        </div>

        {/* City & Capacity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="venue-city" className="block text-xs font-semibold text-app-text-muted uppercase tracking-wider mb-1.5">
              {translate("Tỉnh / Thành phố")}
            </label>
            <input
              id="venue-city"
              type="text"
              required
              placeholder={translate("VD: TP. Hồ Chí Minh, Hà Nội")}
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-app-bg-card border border-app border-app-border text-app-text-main text-xs focus:outline-none focus:border-blue-500 transition-colors font-medium"
            />
          </div>

          <div>
            <label htmlFor="venue-capacity" className="block text-xs font-semibold text-app-text-muted uppercase tracking-wider mb-1.5">
              {translate("Sức chứa tối đa (người)")}
            </label>
            <div className="relative">
              <FiUsers className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-app-text-muted" />
              <input
                id="venue-capacity"
                type="number"
                min="0"
                step="1"
                required
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-app-bg-card border border-app border-app-border text-app-text-main text-xs focus:outline-none focus:border-blue-500 transition-colors font-medium"
              />
            </div>
          </div>
        </div>

        {/* Venue Type & Verification Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="venue-type" className="block text-xs font-semibold text-app-text-muted uppercase tracking-wider mb-1.5">
              {translate("Loại hình địa điểm")}
            </label>
            <select
              id="venue-type"
              value={formData.type || 'indoor'}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'indoor' | 'outdoor' | 'hybrid' })}
              className="w-full px-4 py-2.5 rounded-xl bg-app-bg-card border border-app border-app-border text-app-text-main text-xs focus:outline-none focus:border-blue-500 transition-colors font-medium cursor-pointer"
            >
              <option value="indoor" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1.5">{translate("Trong nhà (Indoor)")}</option>
              <option value="outdoor" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1.5">{translate("Ngoài trời (Outdoor)")}</option>
              <option value="hybrid" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1.5">{translate("Phức hợp (Hybrid)")}</option>
            </select>
          </div>

          <div>
            <label htmlFor="venue-verified" className="block text-xs font-semibold text-app-text-muted uppercase tracking-wider mb-1.5">
              {translate("Trạng thái Xác minh")}
            </label>
            <select
              id="venue-verified"
              value={formData.verified ? 'true' : 'false'}
              onChange={(e) => setFormData({ ...formData, verified: e.target.value === 'true' })}
              className="w-full px-4 py-2.5 rounded-xl bg-app-bg-card border border-app border-app-border text-app-text-main text-xs focus:outline-none focus:border-blue-500 transition-colors font-medium cursor-pointer"
            >
              <option value="true" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1.5">{translate("Đã xác minh (Official)")}</option>
              <option value="false" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1.5">{translate("Chờ xác minh (Unverified)")}</option>
            </select>
          </div>
        </div>

        {error && <p role="alert" aria-label={translate("Không thể lưu địa điểm")} className="rounded-lg border border-red-500/30 p-3 text-sm text-red-600">{error}</p>}

        {/* Modal Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-app border-app-border">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="px-5 py-2.5 text-xs font-bold rounded-xl border border-app border-app-border text-app-text-muted hover:bg-app-bg-subnav transition-colors cursor-pointer"
          >
            {translate("Hủy bỏ")}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="px-5 py-2.5 text-xs font-extrabold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all active:scale-95 cursor-pointer"
          >
            {pending ? translate("Đang lưu...") : editingVenue ? translate('Cập Nhật') : translate('Lưu Địa Điểm')}
          </button>
        </div>
      </form>
    </AdminModal>
  );
};

export default VenueModal;
