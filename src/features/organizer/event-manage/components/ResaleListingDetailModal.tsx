import { useState } from "react";
import { FiAlertCircle, FiTrash2 } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { AdminModal } from "@/components/admin/AdminModal";
import type { OrganizerListingItem } from "@/types/eventTransfer";
import { TransferDetailRow as Row, TransferRecordSummary, TransferStatus, transferDate, transferMoney, type TransferEventInfo } from "./TransferRecordDetails";

interface ResaleListingDetailModalProps extends TransferEventInfo {
  isOpen: boolean; onClose: () => void; listing: OrganizerListingItem | null;
  serviceFeePercent?: number; maxPricePercent?: number; isModerationMode?: boolean;
  onDelist?: (listingId: string) => Promise<void> | void;
  onModerate?: (listingId: string, action: "APPROVE" | "REJECT", reason?: string) => Promise<void> | void;
}
export function ResaleListingDetailModal({ isOpen, onClose, listing, eventTitle, eventThumbnail, serviceFeePercent, maxPricePercent, onDelist, onModerate, isModerationMode }: ResaleListingDetailModalProps) {
  const { t } = useTranslation();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [reason, setReason] = useState("");
  if (!isOpen || !listing) return null;
  const original = listing.originalPrice;
  const percentage = original && original > 0 ? Math.round(listing.price / original * 1000) / 10 : null;
  const ceiling = listing.maxPriceSnapshot ?? (original != null && maxPricePercent != null ? Math.floor(original * maxPricePercent / 100) : null);
  const over = ceiling != null && listing.price > ceiling;
  const feePercent = listing.serviceFeePercent ?? serviceFeePercent ?? 5;
  const fee = Math.round(listing.price * feePercent / 100);
  const moderate = Boolean(isModerationMode && onModerate && listing.status === "PENDING_APPROVAL");
  const submit = async () => {
    if (busy || (moderate && decision === "REJECT" && !reason.trim())) return;
    setBusy(true); setError("");
    try {
      if (moderate) await onModerate!(listing.listingId, decision, reason.trim());
      else if (onDelist) await onDelist(listing.listingId);
      onClose();
    } catch (cause) { setError((cause as { response?: { data?: { message?: string } } })?.response?.data?.message || t("Chưa gửi được yêu cầu. Vui lòng thử lại.")); }
    finally { setBusy(false); }
  };
  return <AdminModal title={moderate ? t("Duyệt tin đăng bán lại") : t("Chi tiết tin đăng bán lại")} onClose={onClose} pending={busy} maxWidth="lg">
    <div className="transfer-detail">
      <TransferRecordSummary eventTitle={eventTitle} eventThumbnail={eventThumbnail} type={listing.ticketTypeName} quantity={listing.quantity} ticketIds={listing.ticketIds} />
      <dl>
        <Row label={t("Mã tin đăng")}><strong>{listing.refCode}</strong></Row>
        <Row label={t("Giá gốc")}>{transferMoney(original)}</Row>
        <Row label={t("Giá đăng bán")}><strong className="app-text-brand">{transferMoney(listing.price)}{percentage != null ? " (" + percentage + "%)" : ""}</strong></Row>
        {ceiling != null && <Row label={t("Giá trần cho phép")}>{transferMoney(ceiling)}{over && <span className="transfer-status transfer-status-danger">{t("Vượt giá trần")}</span>}</Row>}
        <Row label={t("Phí dịch vụ (cho người bán)")}>{feePercent + "% (" + transferMoney(fee) + ")"}</Row>
        <Row label={t("Số tiền nhận được (ước tính / vé)")}><strong>{transferMoney(listing.price - fee)}</strong></Row>
        {listing.seatCode && <Row label={t("Khu vực / Ghế")}>{listing.seatCode}</Row>}
        <Row label={t("Người đăng")}>{listing.sellerEmailMasked}</Row>
        <Row label={t("Thời gian đăng")}>{transferDate(listing.createdAt)}</Row>
        <Row label={t("Trạng thái")}><TransferStatus status={listing.status} /></Row>
        {listing.moderationReason && <Row label={t("Lý do duyệt / từ chối")}>{listing.moderationReason}</Row>}
      </dl>
      {moderate && <fieldset className="transfer-moderation"><legend>{t("Hành động")}</legend>
        <label><input type="radio" checked={decision === "APPROVE"} onChange={() => setDecision("APPROVE")} />{t("Phê duyệt")}</label>
        <label><input type="radio" checked={decision === "REJECT"} onChange={() => setDecision("REJECT")} />{t("Từ chối")}</label>
        {decision === "REJECT" && <textarea aria-label={t("Lý do từ chối")} placeholder={t("Nhập lý do từ chối (bắt buộc)")} value={reason} onChange={e => setReason(e.target.value)} />}
      </fieldset>}
      {confirm && <div className="transfer-confirm"><strong>{t("Gỡ tin đăng {{code}}?", { code: listing.refCode })}</strong><p>{t("Tin đăng sẽ dừng bán và hệ thống xử lý mở khóa vé cho người bán.")}</p>
        <div className="flex gap-2"><button type="button" className="transfer-button" disabled={busy} onClick={() => setConfirm(false)}>{t("Hủy")}</button><button type="button" className="transfer-button transfer-button-danger" disabled={busy} onClick={submit}>{busy ? t("Đang xử lý…") : t("Xác nhận gỡ")}</button></div>
      </div>}
      {error && <p role="alert" className="transfer-error"><FiAlertCircle />{error}</p>}
      <footer className="transfer-detail-footer">
        {!moderate && onDelist && ["ACTIVE", "PAUSED_BY_EVENT"].includes(listing.status) && <button type="button" className="transfer-button transfer-button-danger" disabled={busy} onClick={() => setConfirm(true)}><FiTrash2 />{t("Gỡ tin đăng")}</button>}
        <button type="button" className="transfer-button ml-auto" disabled={busy} onClick={onClose}>{moderate ? t("Hủy") : t("Đóng")}</button>
        {moderate && <button type="button" className="transfer-button transfer-button-primary" disabled={busy || (decision === "REJECT" && !reason.trim())} onClick={submit}>{busy ? t("Đang xử lý…") : t("Xác nhận")}</button>}
      </footer>
    </div>
  </AdminModal>;
}
export default ResaleListingDetailModal;
