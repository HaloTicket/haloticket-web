import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminModal } from '../../../../components/admin/AdminModal';
import { FiMapPin, FiUsers, FiCheckCircle, FiAlertTriangle, FiHome } from 'react-icons/fi';

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
  onSubmit: (data: VenueFormData) => void;
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
  const [prevEditingVenue, setPrevEditingVenue] = useState(editingVenue);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (editingVenue !== prevEditingVenue || isOpen !== prevIsOpen) {
    setPrevEditingVenue(editingVenue);
    setPrevIsOpen(isOpen);
    setFormData(editingVenue || defaultFormData);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.address.trim()) return;
    onSubmit(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AdminModal
      title={editingVenue ? translate('Chỉnh Sửa Địa Điểm') : translate('Thêm Địa Điểm Chính Thức')}
      icon={<FiHome className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
      onClose={onClose}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Venue Name */}
        <div>
          <label className="block text-xs font-semibold text-app-text-muted uppercase tracking-wider mb-1.5">
            {translate("Tên địa điểm")} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <FiHome className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-app-text-muted" />
            <input
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
          <label className="block text-xs font-semibold text-app-text-muted uppercase tracking-wider mb-1.5">
            {translate("Địa chỉ chi tiết")} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <FiMapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-app-text-muted" />
            <input
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
            <label className="block text-xs font-semibold text-app-text-muted uppercase tracking-wider mb-1.5">
              {translate("Tỉnh / Thành phố")}
            </label>
            <input
              type="text"
              required
              placeholder={translate("VD: TP. Hồ Chí Minh, Hà Nội")}
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-app-bg-card border border-app border-app-border text-app-text-main text-xs focus:outline-none focus:border-blue-500 transition-colors font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-app-text-muted uppercase tracking-wider mb-1.5">
              {translate("Sức chứa tối đa (người)")}
            </label>
            <div className="relative">
              <FiUsers className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-app-text-muted" />
              <input
                type="number"
                min="50"
                step="50"
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
            <label className="block text-xs font-semibold text-app-text-muted uppercase tracking-wider mb-1.5">
              {translate("Loại hình địa điểm")}
            </label>
            <select
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
            <label className="block text-xs font-semibold text-app-text-muted uppercase tracking-wider mb-1.5">
              {translate("Trạng thái Xác minh")}
            </label>
            <select
              value={formData.verified ? 'true' : 'false'}
              onChange={(e) => setFormData({ ...formData, verified: e.target.value === 'true' })}
              className="w-full px-4 py-2.5 rounded-xl bg-app-bg-card border border-app border-app-border text-app-text-main text-xs focus:outline-none focus:border-blue-500 transition-colors font-medium cursor-pointer"
            >
              <option value="true" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1.5">{translate("Đã xác minh (Official)")}</option>
              <option value="false" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1.5">{translate("Chờ xác minh (Unverified)")}</option>
            </select>
          </div>
        </div>

        {/* Status Callout Banner */}
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs ${
            formData.verified
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
          }`}
        >
          {formData.verified ? (
            <>
              <FiCheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-500" />
              <span>{translate("Địa điểm này sẽ được đánh dấu Chính thức (Xác minh) và ưu tiên gợi ý khi tạo sự kiện mới.")}</span>
            </>
          ) : (
            <>
              <FiAlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-500" />
              <span>{translate("Địa điểm chưa xác minh sẽ bị giới hạn xuất hiện trong danh sách lựa chọn nhanh.")}</span>
            </>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-app border-app-border">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold rounded-xl border border-app border-app-border text-app-text-muted hover:bg-app-bg-subnav transition-colors cursor-pointer"
          >
            {translate("Hủy bỏ")}
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-extrabold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all active:scale-95 cursor-pointer"
          >
            {editingVenue ? translate('Cập Nhật') : translate('Lưu Địa Điểm')}
          </button>
        </div>
      </form>
    </AdminModal>
  );
};

export default VenueModal;
