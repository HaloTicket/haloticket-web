import React from "react";
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
  if (!isOpen || !venue) return null;

  return (
    <AdminConfirmModal
      title="Xác Nhận Xóa Địa Điểm"
      subtitle={`Bạn có chắc chắn muốn xóa địa điểm "${venue.name}"?`}
      confirmText="Xóa Địa Điểm"
      cancelText="Hủy bỏ"
      isDanger={true}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      {venue.eventsHosted > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
          ⚠️ Lưu ý: Địa điểm này đang được liên kết với {venue.eventsHosted} sự kiện trong hệ thống.
        </p>
      )}
    </AdminConfirmModal>
  );
};

export default VenueDeleteModal;
