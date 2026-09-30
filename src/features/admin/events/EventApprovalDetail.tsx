import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCalendar, FiMapPin, FiRefreshCw } from "react-icons/fi";

import { AdminDataState } from "@/components/admin/AdminDataState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { eventApi } from "@/services/eventApi";
import { EventApprovalActions } from "./EventApprovalActions";
import { approvalListUrl, displayApprovalStatus, normalizeApprovalEvents } from "./approvalModel";
import type { ApprovalEventRecord } from "./approvalModel";

function displayDate(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : value;
}

export function EventApprovalDetail() {
  const { t } = useTranslation();
  const { eventId } = useParams<{ eventId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const listUrl = approvalListUrl(location.search);
  const [event, setEvent] = useState<ApprovalEventRecord | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "missing">("loading");
  const [resolvedId, setResolvedId] = useState<string | undefined>();
  const requestVersion = useRef(0);

  const loadEvent = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      // The approval list is the only confirmed admin source. It includes records outside the active list filter.
      const data = await eventApi.getApprovalEvents("ALL");
      const found = normalizeApprovalEvents(data).find((item) => item.id === eventId) ?? null;
      if (version === requestVersion.current) {
        setEvent(found);
        setResolvedId(eventId);
        setState(found ? "ready" : "missing");
      }
    } catch {
      if (version === requestVersion.current) {
        setResolvedId(eventId);
        setState("error");
      }
    }
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void loadEvent(); });
    return () => { cancelled = true; requestVersion.current += 1; };
  }, [loadEvent]);

  const back = <Link to={listUrl} className="inline-flex min-h-11 items-center gap-2 rounded-lg border app-border app-bg-card px-4 text-sm font-semibold app-text-main"><FiArrowLeft aria-hidden="true" />{t("Quay lại danh sách")}</Link>;

  if (state === "loading" || resolvedId !== eventId) return <div className="space-y-5"><AdminPageHeader title={t("Hồ sơ duyệt sự kiện")} actions={back} /><AdminDataState state="loading" /></div>;
  if (state === "error") return <div className="space-y-5"><AdminPageHeader title={t("Hồ sơ duyệt sự kiện")} actions={back} /><AdminDataState state="error" onRetry={() => { setState("loading"); void loadEvent(); }} message={t("Không thể tải hồ sơ duyệt sự kiện. Vui lòng thử lại.")} /></div>;
  if (!event) return <div className="space-y-5"><AdminPageHeader title={t("Hồ sơ duyệt sự kiện")} actions={back} /><AdminDataState state="empty" message={t("Không tìm thấy hồ sơ này hoặc bạn không có quyền xem.")} /></div>;

  return (
    <div className="space-y-5">
      <AdminPageHeader title={event.title} description={`${t("Mã hồ sơ")}: ${event.id}`} actions={<div className="flex flex-wrap gap-2">{back}<button type="button" onClick={() => { setState("loading"); void loadEvent(); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg border app-border app-bg-card px-4 text-sm font-semibold app-text-main"><FiRefreshCw aria-hidden="true" />{t("Làm mới")}</button></div>} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <main className="space-y-5 min-w-0">
          {(event.bannerUrl || event.posterImage) && <div className="overflow-hidden rounded-xl border app-border app-bg-card"><img src={event.bannerUrl || event.posterImage} alt="" className="h-52 w-full object-cover sm:h-64" /></div>}
          <section className="rounded-xl border app-border app-bg-card p-5 space-y-4">
            <h2 className="text-lg font-bold app-text-main">{t("Thông tin sự kiện")}</h2>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="app-text-muted">{t("Ban Tổ Chức")}</dt><dd className="font-semibold app-text-main">{event.organizerName || t("Chưa cập nhật")}</dd></div>
              <div><dt className="app-text-muted">{t("Thể loại")}</dt><dd className="font-semibold app-text-main">{event.categoryName || t("Chưa cập nhật")}</dd></div>
              <div><dt className="flex items-center gap-1 app-text-muted"><FiMapPin aria-hidden="true" />{t("Địa điểm diễn ra")}</dt><dd className="font-semibold app-text-main">{event.locationName || event.address || t("Chưa cập nhật")}</dd>{event.address && event.address !== event.locationName && <dd className="app-text-muted">{event.address}</dd>}</div>
              <div><dt className="flex items-center gap-1 app-text-muted"><FiCalendar aria-hidden="true" />{t("Thời gian diễn ra sự kiện")}</dt><dd className="font-semibold app-text-main">{event.datesSummary || event.startTime || t("Chưa cập nhật")}</dd></div>
              <div><dt className="app-text-muted">{t("Gửi lúc")}</dt><dd className="font-semibold app-text-main">{displayDate(event.submittedAt || event.createdAt) || t("Chưa cập nhật")}</dd></div>
              <div><dt className="app-text-muted">{t("Giá vé từ")}</dt><dd className="font-semibold app-text-main">{typeof event.minPrice === "number" ? `${event.minPrice.toLocaleString("vi-VN")} đ` : t("Chưa cập nhật")}</dd></div>
            </dl>
          </section>

          {Boolean(event.showtimes?.length) && <section className="rounded-xl border app-border app-bg-card p-5 space-y-3"><h2 className="text-lg font-bold app-text-main">{t("Suất diễn")}</h2><div className="divide-y app-border">{event.showtimes?.map((showtime, index) => <div key={showtime.id || index} className="py-3 text-sm"><p className="font-semibold app-text-main">{showtime.name || `${t("Suất diễn")} ${index + 1}`}</p><p className="app-text-muted">{[displayDate(showtime.startTime), displayDate(showtime.endTime)].filter(Boolean).join(" – ")}</p>{(showtime.saleStartTime || showtime.saleEndTime) && <p className="app-text-muted">{t("Thời gian mở bán")}: {[displayDate(showtime.saleStartTime), displayDate(showtime.saleEndTime)].filter(Boolean).join(" – ")}</p>}</div>)}</div></section>}

          <section className="rounded-xl border app-border app-bg-card p-5 space-y-3">
            <h2 className="text-lg font-bold app-text-main">{t("Nội dung mô tả chi tiết sự kiện")}</h2>
            <p className="whitespace-pre-wrap break-words text-sm leading-6 app-text-main">{event.descriptionText || event.description || t("Chưa cập nhật")}</p>
          </section>

          {Boolean(event.tickets?.length) && <section className="rounded-xl border app-border app-bg-card p-5 space-y-3"><h2 className="text-lg font-bold app-text-main">{t("Cấu hình các loại vé đăng ký")}</h2><div className="divide-y app-border">{event.tickets?.map((ticket, index) => <div key={index} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="font-semibold app-text-main">{String(ticket.name || t("Hạng vé"))}</span><span className="app-text-muted">{typeof ticket.price === "number" ? `${ticket.price.toLocaleString("vi-VN")} đ` : t("Chưa cập nhật")}{typeof ticket.totalQuantity === "number" ? ` · ${ticket.totalQuantity} ${t("vé")}` : ""}</span></div>)}</div></section>}

          {Boolean(event.customQuestions?.length) && <section className="rounded-xl border app-border app-bg-card p-5 space-y-3"><h2 className="text-lg font-bold app-text-main">{t("Câu hỏi đăng ký")}</h2><div className="divide-y app-border">{event.customQuestions?.map((question, index) => <div key={typeof question.id === "string" ? question.id : index} className="py-3 text-sm"><p className="font-semibold app-text-main">{typeof question.title === "string" && question.title.trim() ? question.title : `${t("Câu hỏi")} ${index + 1}`}{question.isRequired === true ? ` · ${t("Bắt buộc")}` : ""}</p>{typeof question.description === "string" && question.description.trim() && <p className="app-text-muted">{question.description}</p>}</div>)}</div></section>}

          {Boolean(event.galleryImages?.length) && <section className="rounded-xl border app-border app-bg-card p-5 space-y-3"><h2 className="text-lg font-bold app-text-main">{t("Bộ sưu tập hình ảnh sự kiện")}</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{event.galleryImages?.map((image, index) => <img key={`${image}-${index}`} src={image} alt="" className="aspect-square w-full rounded-lg object-cover" />)}</div></section>}
        </main>

        <aside className="min-w-0 space-y-5">
          <section className="rounded-xl border app-border app-bg-card p-5 space-y-4">
            <div><h2 className="text-base font-bold app-text-main">{t("Trạng thái duyệt")}</h2><p className={`mt-2 inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${displayApprovalStatus(event.eventApprovalStatus).className}`}>{t(displayApprovalStatus(event.eventApprovalStatus).label)}</p></div>
            <EventApprovalActions key={event.id} event={event} onSuccess={() => navigate(listUrl)} />
          </section>
          {(event.taxName || event.taxCode || event.taxAddress || event.businessType || event.accountHolder || event.accountNumber || event.bankName || event.bankBranch) && <section className="rounded-xl border app-border app-bg-card p-5 space-y-3"><h2 className="text-base font-bold app-text-main">{t("Hồ Sơ Pháp Lý & Thanh Toán Ban Tổ Chức")}</h2><dl className="space-y-2 text-sm">{[[t("Đơn vị đăng ký (Tax Name)"), event.taxName], [t("Mã số thuế (Tax Code)"), event.taxCode], [t("Địa chỉ đăng ký"), event.taxAddress], [t("Loại hình kinh doanh"), event.businessType], [t("Chủ tài khoản nhận tiền"), event.accountHolder], [t("Số tài khoản ngân hàng"), event.accountNumber], [t("Ngân hàng & Chi nhánh"), [event.bankName, event.bankBranch].filter(Boolean).join(" · ")]].filter((entry) => entry[1]).map(([label, value]) => <div key={label}><dt className="app-text-muted">{label}</dt><dd className="break-words font-semibold app-text-main">{value}</dd></div>)}</dl></section>}
          {event.eventApprovalStatus === "REJECTED" && (event.rejectionReason || event.rejectionNotes) && <section className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-700 dark:text-rose-300"><h2 className="font-bold">{t("Sự kiện này đã bị từ chối phê duyệt")}</h2>{event.rejectionReason && <p className="mt-2">{t("Lý do")}: {event.rejectionReason}</p>}{event.rejectionNotes && <p className="mt-2 whitespace-pre-wrap">{t("Ghi chú")}: {event.rejectionNotes}</p>}</section>}
        </aside>
      </div>
    </div>
  );
}

export default EventApprovalDetail;
