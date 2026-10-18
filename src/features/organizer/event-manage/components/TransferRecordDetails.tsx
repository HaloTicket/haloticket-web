import type { ReactNode } from "react";
import { FiGift, FiRepeat } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

export interface TransferEventInfo { eventTitle?: string; eventThumbnail?: string }
// eslint-disable-next-line react-refresh/only-export-components -- Shared display formatting belongs with these record components.
export const transferMoney = (amount?: number | null) => amount == null ? i18n.t("Chưa có thông tin") : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
// eslint-disable-next-line react-refresh/only-export-components
export const transferDate = (value?: string | null) => {
  if (!value || Number.isNaN(new Date(value).getTime())) return i18n.t("Chưa có thông tin");
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
};
const statuses: Record<string, [string, string]> = {
  ACTIVE: ["Đang bán", "success"], PENDING_APPROVAL: ["Chờ duyệt", "warning"], RESERVED: ["Đang giữ", "info"], SOLD: ["Đã bán", "neutral"],
  PAUSED_BY_EVENT: ["Tạm dừng", "warning"], CANCELLED: ["Đã gỡ", "neutral"], EXPIRED: ["Hết hạn", "neutral"],
  PENDING: ["Chờ xác nhận", "info"], WAITING_RECIPIENT: ["Chờ xác nhận", "info"], COMPLETED: ["Thành công", "success"],
  FAILED: ["Thất bại", "danger"], DECLINED: ["Đã từ chối", "neutral"],
};
export function TransferStatus({ status, gift = false }: { status: string; gift?: boolean }) {
  const { t } = useTranslation();
  const [label, color] = statuses[status] ?? [status, "neutral"];
  const displayLabel = gift && status === "CANCELLED" ? t("Đã hủy") : t(label);
  return <span className={"transfer-status transfer-status-" + color}>{displayLabel}</span>;
}
export function TransferRecordSummary({ eventTitle, eventThumbnail, type, quantity, ticketIds, gift = false }: TransferEventInfo & { type: string; quantity?: number; ticketIds?: string[]; gift?: boolean }) {
  const { t } = useTranslation();
  return <div className="transfer-record-summary">
    {eventThumbnail ? <img src={eventThumbnail} alt="" /> : <span className="transfer-record-placeholder">{gift ? <FiGift /> : <FiRepeat />}</span>}
    <div><h3>{eventTitle || t("Vé sự kiện")}</h3><p>{type} · {quantity ?? 1} {t("vé")}</p>{ticketIds?.length ? <p className="transfer-ticket-reference">{t("Mã vé:")} {ticketIds.join(", ")}</p> : null}</div>
  </div>;
}
export function TransferDetailRow({ label, children }: { label: string; children: ReactNode }) {
  return <div className="transfer-detail-row"><dt>{label}</dt><dd>{children}</dd></div>;
}

