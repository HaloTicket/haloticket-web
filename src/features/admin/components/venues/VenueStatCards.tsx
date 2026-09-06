import React from "react";
import { FiMapPin, FiCheckCircle, FiAlertCircle, FiCalendar } from "react-icons/fi";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import type { SystemVenue } from "@/utils/venueUtils";

interface VenueStatCardsProps {
  venues: SystemVenue[];
}

export const VenueStatCards: React.FC<VenueStatCardsProps> = ({ venues }) => {
  const totalVenuesCount = venues.length;
  const verifiedCount = venues.filter((v) => v.verified).length;
  const unverifiedCount = venues.filter((v) => !v.verified).length;
  const totalEventsHostedCount = venues.reduce((acc, v) => acc + (v.eventsHosted || 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <AdminStatCard
        title="Tổng địa điểm"
        value={totalVenuesCount}
        subtext="Hệ thống đang ghi nhận"
        icon={<FiMapPin className="w-5 h-5" />}
        iconBgColor="bg-blue-600/10 text-blue-600 dark:text-blue-400"
      />

      <AdminStatCard
        title="Đã xác minh"
        value={verifiedCount}
        subtext="Được phép đưa vào tạo sự kiện"
        icon={<FiCheckCircle className="w-5 h-5" />}
        iconBgColor="bg-emerald-600/10 text-emerald-600 dark:text-emerald-400"
        valueColor="text-emerald-600 dark:text-emerald-400"
      />

      <AdminStatCard
        title="Chưa xác minh"
        value={unverifiedCount}
        subtext="Do người dùng tự khai báo"
        icon={<FiAlertCircle className="w-5 h-5" />}
        iconBgColor="bg-amber-600/10 text-amber-600 dark:text-amber-400"
        valueColor="text-amber-600 dark:text-amber-400"
      />

      <AdminStatCard
        title="Tổng sự kiện đã tổ chức"
        value={totalEventsHostedCount}
        subtext="Tổng lịch đặt chỗ sự kiện"
        icon={<FiCalendar className="w-5 h-5" />}
        iconBgColor="bg-purple-600/10 text-purple-600 dark:text-purple-400"
        valueColor="text-purple-600 dark:text-purple-400"
      />
    </div>
  );
};

export default VenueStatCards;
