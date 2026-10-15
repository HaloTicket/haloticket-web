import { useEffect, useState } from "react";
import { FiAlertCircle, FiCheckCircle, FiClock, FiTrash2 } from "react-icons/fi";
import { AdminModal } from "@/components/admin/AdminModal";
import type { OrganizerGiftItem } from "@/types/eventTransfer";
import { TransferDetailRow as Row, TransferRecordSummary, TransferStatus, transferDate, type TransferEventInfo } from "./TransferRecordDetails";

interface GiftDetailModalProps extends TransferEventInfo {
  isOpen: boolean; onClose: () => void; gift: OrganizerGiftItem | null; onCancelGift?: (sagaId: string) => Promise<void> | void;
}
export function GiftDetailModal({ isOpen, onClose, gift, eventTitle, eventThumbnail, onCancelGift }: GiftDetailModalProps) {
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
  const countdown = Number.isFinite(remaining) ? remaining ? "Còn " + pad(Math.floor(remaining / 3600)) + ":" + pad(Math.floor(remaining % 3600 / 60)) + ":" + pad(remaining % 60) : "Đã hết hạn xác nhận" : "Chưa có thông tin";
  const cancel = async () => {
    if (!onCancelGift || busy) return;
    setBusy(true); setError("");
    try { await onCancelGift(gift.sagaId); onClose(); }
    catch (cause) { setError((cause as { response?: { data?: { message?: string } } })?.response?.data?.message || "Chưa gửi được yêu cầu hủy. Vui lòng thử lại."); }
    finally { setBusy(false); }
  };
  return <AdminModal title={pending ? "Giao dịch tặng vé — Chờ xác nhận" : "Chi tiết giao dịch tặng vé"} onClose={onClose} pending={busy} maxWidth="lg">
    <div className="transfer-detail">
      <TransferRecordSummary gift eventTitle={eventTitle} eventThumbnail={eventThumbnail} type={gift.ticketTypeName} quantity={gift.quantity} ticketIds={gift.ticketIds} />
      <dl>
        <Row label="Mã giao dịch"><strong>{gift.sagaId.startsWith("GFT-") ? gift.sagaId : "GFT-" + gift.sagaId.slice(0, 8).toUpperCase()}</strong></Row>
        <Row label="Người tặng">{gift.senderEmailMasked}</Row>
        <Row label="Người nhận">{gift.recipientEmailMasked}</Row>
        <Row label="Yêu cầu eKYC">{gift.requireEkyc == null ? "Chưa có thông tin" : gift.requireEkyc ? "Có" : "Không"}</Row>
        <Row label="Xác minh người nhận (eKYC)">{gift.isRecipientEkycVerified == null ? "Chưa có thông tin" : gift.isRecipientEkycVerified ? <span className="transfer-verified"><FiCheckCircle />Đã xác minh</span> : "Chưa xác minh"}</Row>
        <Row label="Thời gian gửi">{transferDate(gift.sentAt)}</Row>
        {pending ? <Row label="Thời hạn xác nhận"><span className="transfer-countdown"><FiClock />{countdown}</span><small>Hết hạn {transferDate(gift.expiresAt)}</small></Row>
          : gift.status === "COMPLETED" ? <Row label="Thời gian nhận">{transferDate(gift.receivedAt)}</Row> : null}
        <Row label="Trạng thái"><TransferStatus status={gift.status} gift /></Row>
      </dl>
      {confirm && <div className="transfer-confirm"><strong>Hủy lời mời tặng vé này?</strong><p>Người nhận sẽ không thể chấp nhận lời mời. Hệ thống xử lý mở khóa vé cho người gửi.</p>
        <div className="flex gap-2"><button type="button" className="transfer-button" disabled={busy} onClick={() => setConfirm(false)}>Quay lại</button><button type="button" className="transfer-button transfer-button-danger" disabled={busy} onClick={cancel}>{busy ? "Đang xử lý…" : "Xác nhận hủy"}</button></div>
      </div>}
      {error && <p role="alert" className="transfer-error"><FiAlertCircle />{error}</p>}
      <footer className="transfer-detail-footer">
        {pending && remaining > 0 && onCancelGift && <button type="button" className="transfer-button transfer-button-danger" disabled={busy} onClick={() => setConfirm(true)}><FiTrash2 />Hủy giao dịch</button>}
        <button type="button" className="transfer-button ml-auto" disabled={busy} onClick={onClose}>Đóng</button>
      </footer>
    </div>
  </AdminModal>;
}
