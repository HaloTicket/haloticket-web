import React from "react";
import { useTranslation } from "react-i18next";
import { FiMapPin, FiCheckCircle, FiAlertCircle, FiCalendar } from "react-icons/fi";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import type { SystemVenue } from "@/types"

interface VenueStatCardsProps {
  venues: SystemVenue[];
}

export const VenueStatCards: React.FC<VenueStatCardsProps> = ({ venues }) => {
  const { t: translate } = useTranslation();
  const totalVenuesCount = venues.length;
  const verifiedCount = venues.filter((v) => v.verified).length;
  const unverifiedCount = venues.filter((v) => !v.verified).length;
  const totalEventsHostedCount = venues.every((v) => !("eventsHostedKnown" in v && v.eventsHostedKnown === false))
    ? venues.reduce((acc, v) => acc + v.eventsHosted, 0)
    : "—";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <AdminStatCard
        title={translate("Tổng địa điểm")}
        value={totalVenuesCount}
        subtext={translate("Hệ thống đang ghi nhận")}
        icon={<FiMapPin className="w-5 h-5" />}
        iconBgColor="bg-blue-600/10 text-blue-600 dark:text-blue-400"
      />

      <AdminStatCard
        title={translate("Đã xác minh")}
        value={verifiedCount}
        subtext={translate("Địa điểm đã xác minh")}
        icon={<FiCheckCircle className="w-5 h-5" />}
        iconBgColor="bg-emerald-600/10 text-emerald-600 dark:text-emerald-400"
        valueColor="text-emerald-600 dark:text-emerald-400"
      />

      <AdminStatCard
        title={translate("Chưa xác minh")}
        value={unverifiedCount}
        subtext={translate("Địa điểm cần xác minh")}
        icon={<FiAlertCircle className="w-5 h-5" />}
        iconBgColor="bg-amber-600/10 text-amber-600 dark:text-amber-400"
        valueColor="text-amber-600 dark:text-amber-400"
      />

      <AdminStatCard
        title={translate("Tổng sự kiện đã tổ chức")}
        value={totalEventsHostedCount}
        subtext={translate("Theo dữ liệu máy chủ")}
        icon={<FiCalendar className="w-5 h-5" />}
        iconBgColor="bg-purple-600/10 text-purple-600 dark:text-purple-400"
        valueColor="text-purple-600 dark:text-purple-400"
      />
    </div>
  );
};

export default VenueStatCards;
