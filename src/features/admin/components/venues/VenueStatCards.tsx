import { useTranslation } from "react-i18next";
import type { SystemVenue } from "@/types";

/** Props của các thẻ thống kê địa điểm: danh sách địa điểm cần tổng hợp. */
interface VenueStatCardsProps {
  venues: SystemVenue[];
}

/** Dải thẻ thống kê tổng số địa điểm, đã xác minh, chưa xác minh và tổng sự kiện (hiện dấu gạch khi chưa biết số sự kiện). */
export function VenueStatCards({ venues }: VenueStatCardsProps) {
  const { t } = useTranslation();
  const hostedKnown = venues.every((venue) => !("eventsHostedKnown" in venue && venue.eventsHostedKnown === false));
  const counts = [
    { label: t("Địa điểm"), value: venues.length, description: t("Tổng địa điểm") },
    { label: t("Đã xác minh"), value: venues.filter((venue) => venue.verified).length, description: t("Đã xác minh") },
    { label: t("Chưa xác minh"), value: venues.filter((venue) => !venue.verified).length, description: t("Chưa xác minh") },
    { label: t("Sự kiện"), value: hostedKnown ? venues.reduce((total, venue) => total + venue.eventsHosted, 0) : "—", description: t("Tổng sự kiện đã tổ chức") },
  ];

  return <div className="flex flex-wrap items-center gap-2 sm:justify-end">
    {counts.map(({ label, value, description }) => <span key={label} title={description} aria-label={`${description}: ${value}`} className="inline-flex min-h-9 items-baseline gap-2 whitespace-nowrap rounded-xl border app-border app-bg-card px-3 py-1.5 text-xs app-text-muted">
      <span>{label}:</span> <strong className="text-sm font-bold app-text-main">{value}</strong>
    </span>)}
  </div>;
}

export default VenueStatCards;
