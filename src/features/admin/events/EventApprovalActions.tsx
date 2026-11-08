import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
import { eventApi } from "@/services/eventApi";
import { aiApi } from "@/services/aiApi";
import { getAiErrorMessage } from "@/utils/aiErrors";
import { FiZap, FiRefreshCw } from "react-icons/fi";
import type { ApprovalEventItem } from "@/types";

interface EventApprovalActionsProps {
  event: ApprovalEventItem;
  onSuccess: () => void;
}

const FLAG_FIELDS = [
  { id: "posterImage", label: "Poster & Banner" },
  { id: "title", label: "Tên & Mô tả sự kiện" },
  { id: "dates", label: "Thời gian diễn ra" },
  { id: "tickets", label: "Danh sách Hạng vé" },
  { id: "location", label: "Địa điểm sự kiện" },
  { id: "paymentInfo", label: "Thông tin thanh toán / MST" },
] as const;

export function EventApprovalActions({ event, onSuccess }: EventApprovalActionsProps) {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [flaggedFields, setFlaggedFields] = useState<string[]>(["posterImage"]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const pendingRef = useRef(false);
  const actionable = event.eventApprovalStatus === "PENDING" || event.eventApprovalStatus === "UPDATE_PENDING";

  const close = () => {
    if (pendingRef.current) return;
    setDialog(null);
    setError(false);
  };

  const confirm = async () => {
    if (!dialog || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(false);
    const action = dialog;
    try {
      if (action === "approve") {
        await eventApi.approveEvent(event.id);
      } else {
        await eventApi.rejectEvent(event.id, reason, JSON.stringify({ flaggedFields, noteText: notes }));
      }
      window.dispatchEvent(new CustomEvent("approval-events-updated"));
      toast.success(action === "approve" ? t("Đã phê duyệt sự kiện") : t("Đã từ chối sự kiện"));
      setDialog(null);
      onSuccess();
    } catch {
      setError(true);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={!actionable} onClick={() => { setError(false); setDialog("reject"); }} className="min-h-11 rounded-lg border app-border px-4 text-sm font-semibold text-rose-600 disabled:opacity-50 dark:text-rose-400">
          {t("Từ chối duyệt")}
        </button>
        <button type="button" disabled={!actionable} onClick={() => { setError(false); setDialog("approve"); }} className="min-h-11 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {event.eventApprovalStatus === "UPDATE_PENDING" ? t("Phê duyệt cập nhật") : t("Phê duyệt sự kiện")}
        </button>
        {!actionable && <span className="text-sm app-text-muted">{t("Hồ sơ này không còn chờ duyệt.")}</span>}
      </div>

      {dialog && (
        <AdminConfirmModal
          title={dialog === "approve" ? t("Xác nhận phê duyệt sự kiện") : t("Từ chối duyệt sự kiện")}
          subtitle={event.title}
          confirmText={dialog === "approve" ? t("Xác nhận phê duyệt") : t("Xác nhận từ chối")}
          isDanger={false}
          pending={pending}
          dismissible={!pending}
          onClose={close}
          onConfirm={confirm}
        >
          {dialog === "reject" && (
            <div className="space-y-4">
              <label className="block space-y-2 text-sm font-medium app-text-main">
                <div className="flex items-center justify-between">
                  <span>{t("Lý do chính từ chối")} <span className="text-rose-500">*</span></span>
                  <button type="button" onClick={async () => {
                    setIsGeneratingAI(true);
                    try {
                      const score = await aiApi.analyzeRiskScore(event.id, event.title || "", event.description || "", event.organizerName || "");
                      if (score.reasons && score.reasons.length > 0) {
                        setReason(score.reasons.join("\n"));
                      } else {
                        setReason(t("Sự kiện có một số thông tin chưa đạt chuẩn theo quy định hệ thống. Vui lòng kiểm tra lại."));
                      }
                    } catch (error) {
                      toast.error(t("Không thể tạo lý do bằng AI"), { description: getAiErrorMessage(error) });
                    } finally {
                      setIsGeneratingAI(false);
                    }
                  }} disabled={pending || isGeneratingAI} className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                    {isGeneratingAI ? <FiRefreshCw className="w-3.5 h-3.5 motion-safe:animate-spin" /> : <FiZap className="w-3.5 h-3.5" />}
                    {t("Để AI tự động viết")}
                  </button>
                </div>
                <textarea required value={reason} onChange={(event) => setReason(event.target.value)} disabled={pending || isGeneratingAI} rows={3} placeholder={t("Nhập lý do từ chối (bắt buộc)...")} className="min-h-11 w-full rounded-lg border app-border app-bg-card p-3 text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500" />
              </label>
              <fieldset disabled={pending} className="space-y-2">
                <legend className="text-sm font-medium app-text-main">{t("Đánh dấu các mục không chấp nhận")}</legend>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {FLAG_FIELDS.map((field) => (
                    <label key={field.id} className="flex min-h-11 items-center gap-2 text-sm app-text-main">
                      <input type="checkbox" checked={flaggedFields.includes(field.id)} onChange={(event) => setFlaggedFields((current) => event.target.checked ? [...current, field.id] : current.filter((id) => id !== field.id))} />
                      {t(field.label)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="block space-y-1 text-sm font-medium app-text-main">
                <span>{t("Ghi chú cho Ban Tổ Chức")}</span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={pending} rows={3} className="w-full rounded-lg border app-border app-bg-card p-3 text-sm" />
              </label>
            </div>
          )}
          {error && <p role="alert" aria-label={dialog === "approve" ? t("Không thể phê duyệt sự kiện") : t("Không thể từ chối sự kiện")} className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
            {dialog === "approve" ? t("Không thể phê duyệt sự kiện. Vui lòng thử lại.") : t("Không thể từ chối sự kiện. Ghi chú của bạn vẫn được giữ; vui lòng thử lại.")}
          </p>}
        </AdminConfirmModal>
      )}
    </>
  );
}
