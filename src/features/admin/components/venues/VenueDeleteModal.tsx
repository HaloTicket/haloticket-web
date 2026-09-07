import React from "react";
import { useTranslation } from "react-i18next";
import { AdminConfirmModal } from "../../../../components/admin/AdminConfirmModal";
import type { SystemVenue } from "@/utils/venueUtils";

interface VenueDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  venue: SystemVenue | null;
}

export const VenueDeleteModal: React.FC<VenueDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  venue
}) => {
  const { t: translate } = useTranslation();
  if (!isOpen || !venue) return null;

  return (
    <AdminConfirmModal
      title={translate("Xác Nhận Xóa Địa Điểm")}
      subtitle={`${translate("Bạn có chắc chắn muốn xóa địa điểm")} "${venue.name}"?`}
      confirmText={translate("Xóa Địa Điểm")}
      cancelText={translate("Hủy bỏ")}
      isDanger={true}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      {venue.eventsHosted > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
          ⚠️ {translate("Lưu ý: Địa điểm này đang được liên kết với")} {venue.eventsHosted} {translate("sự kiện trong hệ thống.")}
        </p>
      )}
    </AdminConfirmModal>
  );
};

export default VenueDeleteModal;
