import { useEffect, useState } from "react";
import { FiAlertCircle, FiCheckCircle, FiClock, FiTrash2 } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { AdminModal } from "@/components/admin/AdminModal";
import type { OrganizerGiftItem } from "@/types/eventTransfer";
import { TransferDetailRow as Row, TransferRecordSummary, TransferStatus, transferDate, type TransferEventInfo } from "./TransferRecordDetails";

interface GiftDetailModalProps extends TransferEventInfo {
  isOpen: boolean; onClose: () => void; gift: OrganizerGiftItem | null; onCancelGift?: (sagaId: string) => Promise<void> | void;
}
export function GiftDetailModal({ isOpen, onClose, gift, eventTitle, eventThumbnail, onCancelGift }: GiftDetailModalProps) {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = gift?.status === "PENDING" || gift?.status === "WAITING_RECIPIENT";
  useEffect(() => {
    if (!isOpen || !pending) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isOpen, pending]);
  if (!isOpen || !gift) return null;
  const remaining = Math.max(0, Math.ceil((new Date(gift.expiresAt).getTime() - now) / 1000));
  const pad = (value: number) => String(value).padStart(2, "0");
  const countdown = Number.isFinite(remaining) ? remaining ? t("Còn") + " " + pad(Math.floor(remaining / 3600)) + ":" + pad(Math.floor(remaining % 3600 / 60)) + ":" + pad(remaining % 60) : t("Đã hết hạn xác nhận") : t("Chưa có thông tin");
  const cancel = async () => {
    if (!onCancelGift || busy) return;
    setBusy(true); setError("");
    try { await onCancelGift(gift.sagaId); onClose(); }
    catch (cause) { setError((cause as { response?: { data?: { message?: string } } })?.response?.data?.message || t("Chưa gửi được yêu cầu hủy. Vui lòng thử lại.")); }
    finally { setBusy(false); }
  };
  return <AdminModal title={pending ? t("Giao dịch tặng vé — Chờ xác nhận") : t("Chi tiết giao dịch tặng vé")} onClose={onClose} pending={busy} maxWidth="lg">
    <div className="transfer-detail">
      <TransferRecordSummary gift eventTitle={eventTitle} eventThumbnail={eventThumbnail} type={gift.ticketTypeName} quantity={gift.quantity} ticketIds={gift.ticketIds} />
      <dl>
        <Row label={t("Mã giao dịch")}><strong>{gift.sagaId.startsWith("GFT-") ? gift.sagaId : "GFT-" + gift.sagaId.slice(0, 8).toUpperCase()}</strong></Row>
        <Row label={t("Người tặng")}>{gift.senderEmailMasked}</Row>
        <Row label={t("Người nhận")}>{gift.recipientEmailMasked}</Row>
        <Row label={t("Yêu cầu eKYC")}>{gift.requireEkyc == null ? t("Chưa có thông tin") : gift.requireEkyc ? t("Có") : t("Không")}</Row>
        <Row label={t("Xác minh người nhận (eKYC)")}>{gift.isRecipientEkycVerified == null ? t("Chưa có thông tin") : gift.isRecipientEkycVerified ? <span className="transfer-verified"><FiCheckCircle />{t("Đã xác minh")}</span> : t("Chưa xác minh")}</Row>
        <Row label={t("Thời gian gửi")}>{transferDate(gift.sentAt)}</Row>
        {pending ? <Row label={t("Thời hạn xác nhận")}><span className="transfer-countdown"><FiClock />{countdown}</span><small>{t("Hết hạn")} {transferDate(gift.expiresAt)}</small></Row>
          : gift.status === "COMPLETED" ? <Row label={t("Thời gian nhận")}>{transferDate(gift.receivedAt)}</Row> : null}
        <Row label={t("Trạng thái")}><TransferStatus status={gift.status} gift /></Row>
      </dl>
      {confirm && <div className="transfer-confirm"><strong>{t("Hủy lời mời tặng vé này?")}</strong><p>{t("Người nhận sẽ không thể chấp nhận lời mời. Hệ thống xử lý mở khóa vé cho người gửi.")}</p>
        <div className="flex gap-2"><button type="button" className="transfer-button" disabled={busy} onClick={() => setConfirm(false)}>{t("Quay lại")}</button><button type="button" className="transfer-button transfer-button-danger" disabled={busy} onClick={cancel}>{busy ? t("Đang xử lý…") : t("Xác nhận hủy")}</button></div>
      </div>}
      {error && <p role="alert" className="transfer-error"><FiAlertCircle />{error}</p>}
      <footer className="transfer-detail-footer">
        {pending && remaining > 0 && onCancelGift && <button type="button" className="transfer-button transfer-button-danger" disabled={busy} onClick={() => setConfirm(true)}><FiTrash2 />{t("Hủy giao dịch")}</button>}
        <button type="button" className="transfer-button ml-auto" disabled={busy} onClick={onClose}>{t("Đóng")}</button>
      </footer>
    </div>
  </AdminModal>;
}
export default GiftDetailModal;
