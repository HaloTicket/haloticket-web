import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SeatCanvas } from "@/features/organizer/event-manage/components/seating/SeatCanvas";
import { DEFAULT_CANVAS_SETTINGS } from "@/utils/seatMapHelpers";
import type { ZoneBlock, StageElement, StructureElement, Seat, CanvasSettings } from "@/types/seating";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiCalendar,
  FiMapPin,
  FiRefreshCw,
  FiShield,
  FiBriefcase,
  FiTag,
  FiAlertTriangle,
  FiCheckCircle,
  FiLayers,
  FiX
} from "react-icons/fi";

import { AdminDataState } from "@/components/admin/AdminDataState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { eventApi } from "@/services/eventApi";
import { aiApi } from "@/services/aiApi";
import { ticketApi } from "@/services/ticketApi";
import type { SeatLayoutApiResponse } from "@/types";
import { EventApprovalActions } from "./EventApprovalActions";
import { approvalListUrl, displayApprovalStatus, normalizeApprovalEvents } from "@/utils/approvalModel";
import type { ApprovalEventRecord } from "@/utils/approvalModel";

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
  const [riskScore, setRiskScore] = useState<{ risk_level: string, risk_score: number, reasons: string[] } | null>(null);
  const [isAnalyzingRisk, setIsAnalyzingRisk] = useState(false);
  const [collisionInfo, setCollisionInfo] = useState<{ hasCollision: boolean; conflictingEvent?: string; timeSlot?: string } | null>(null);
  const [seatLayout, setSeatLayout] = useState<SeatLayoutApiResponse | null>(null);
  const [showSeatMapModal, setShowSeatMapModal] = useState(false);
  const requestVersion = useRef(0);

  const loadEvent = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      // the approval list is the only confirmed admin source
      const data = await eventApi.getApprovalEvents("ALL");
      const normalized = normalizeApprovalEvents(data);
      const found = normalized.find((item) => item.id === eventId) ?? null;
      if (version === requestVersion.current) {
        setEvent(found);
        setResolvedId(eventId);
        setState(found ? "ready" : "missing");

        // automatically check venue schedule collision with other events
        if (found) {
          checkVenueCollision(found, normalized);
          loadSeatLayout(found.id);
        }
      }
    } catch {
      if (version === requestVersion.current) {
        setResolvedId(eventId);
        setState("error");
      }
    }
  }, [eventId]);

  const checkVenueCollision = (currentEvent: ApprovalEventRecord, allEvents: ApprovalEventRecord[]) => {
    const venueName = (currentEvent.locationName || currentEvent.address || "").toLowerCase().trim();
    if (!venueName) {
      setCollisionInfo({ hasCollision: false, message: t("Sự kiện chưa thiết lập địa điểm cụ thể.") } as any);
      return;
    }

    const curStart = new Date(currentEvent.startTime || currentEvent.submittedAt || Date.now()).getTime();
    const curEnd = new Date(currentEvent.endTime || curStart + 4 * 3600000).getTime();

    const conflicts = allEvents.filter((ev) => {
      if (ev.id === currentEvent.id) return false;
      const evLoc = (ev.locationName || ev.address || "").toLowerCase().trim();
      if (!evLoc) return false;
      if (!evLoc.includes(venueName) && !venueName.includes(evLoc)) return false;

      const evStatus = String(ev.eventApprovalStatus || ev.eventStatus || "").toUpperCase();
      if (evStatus === "REJECTED") return false;

      const evStart = new Date(ev.startTime || ev.submittedAt || Date.now()).getTime();
      const evEnd = new Date(ev.endTime || evStart + 4 * 3600000).getTime();

      // check overlap
      return curStart < evEnd && curEnd > evStart;
    });

    if (conflicts.length > 0) {
      const topConflict = conflicts[0];
      setCollisionInfo({
        hasCollision: true,
        conflictingEvent: topConflict.title,
        timeSlot: displayDate(topConflict.startTime) || t("Thời gian đã được đăng ký"),
      });
    } else {
      setCollisionInfo({
        hasCollision: false,
      });
    }
  };

  const loadSeatLayout = async (targetId: string) => {
    try {
      const layout = await ticketApi.getSeatLayoutByEventId(targetId);
      if (layout && (layout.draftJson || layout.zones?.length)) {
        setSeatLayout(layout);
      } else {
        setSeatLayout(null);
      }
    } catch {
      setSeatLayout(null);
    }
  };

  // Parse seat layout into interactive Canvas document
  const parsedCanvasDoc = useMemo<{
    stages: StageElement[];
    structures: StructureElement[];
    seats: Seat[];
    zones: Record<string, ZoneBlock>;
    canvasSettings: CanvasSettings;
  } | null>(() => {
    if (!seatLayout) return null;
    if (seatLayout.draftJson) {
      try {
        const parsed = JSON.parse(seatLayout.draftJson);
        return {
          stages: parsed.stages || [],
          structures: parsed.structures || [],
          seats: parsed.seats || [],
          zones: parsed.zones || {},
          canvasSettings: parsed.canvasSettings || DEFAULT_CANVAS_SETTINGS,
        };
      } catch (e) {
        console.warn("Failed to parse seatLayout draftJson", e);
      }
    }
    if (seatLayout.zones && seatLayout.zones.length > 0) {
      const zMap: Record<string, ZoneBlock> = {};
      seatLayout.zones.forEach((z, idx) => {
        const id = z.id || `zone_${idx}`;
        zMap[id] = {
          id,
          name: z.name || (z as any).zoneName || `${t("Khu")} ${idx + 1}`,
          color: z.colorCode || z.fillColor || "#3b82f6",
          fillColor: z.fillColor || z.colorCode || "#3b82f6",
          strokeColor: z.strokeColor || "#2563eb",
          x: z.x ?? (100 + (idx % 3) * 220),
          y: z.y ?? (180 + Math.floor(idx / 3) * 160),
          width: z.width || 200,
          height: z.height || 140,
          capacity: z.capacity || 100,
          rotation: z.rotation || 0,
          curvature: z.curvature || 12,
        };
      });
      return {
        stages: [{
          id: "stage_main",
          type: "stage",
          label: t("SÂN KHẤU CHÍNH"),
          x: 220,
          y: 40,
          width: 360,
          height: 80,
          color: "#1e293b",
          rotation: 0
        }],
        structures: [],
        seats: [],
        zones: zMap,
        canvasSettings: DEFAULT_CANVAS_SETTINGS,
      };
    }
    return null;
  }, [seatLayout]);

  // Format description text preserving linebreaks and paragraphs
  const rawDesc = event?.description || event?.descriptionText || "";
  const formattedDescription = useMemo(() => {
    if (!rawDesc) return "";
    if (/<[a-z][\s\S]*>/i.test(rawDesc)) {
      return rawDesc.replace(/\n/g, "<br />");
    }
    return rawDesc
      .split(/\n{2,}/)
      .map((para) => `<p class="mb-3">${para.replace(/\n/g, "<br />")}</p>`)
      .join("");
  }, [rawDesc]);

  // ai risk scoring with persistent caching per event
  const runRiskAssessment = useCallback(async (targetEvent: ApprovalEventRecord, forceRefresh: boolean = false) => {
    const cacheKey = `admin_risk_score_${targetEvent.id}`;
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setRiskScore(parsed);
          setIsAnalyzingRisk(false);
          return;
        } catch {
          // ignore error and proceed
        }
      }
    }

    setIsAnalyzingRisk(true);
    try {
      const score = await aiApi.analyzeRiskScore(
        targetEvent.id,
        targetEvent.title || "",
        targetEvent.description || "",
        targetEvent.organizerName || ""
      );
      setRiskScore(score);
      if (score) {
        localStorage.setItem(cacheKey, JSON.stringify(score));
      }
    } catch (error) {
      console.error("Risk assessment failed:", error);
      setRiskScore(null);
    } finally {
      setIsAnalyzingRisk(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void loadEvent(); });
    return () => { cancelled = true; requestVersion.current += 1; };
  }, [loadEvent]);

  useEffect(() => {
    if (event && event.id) {
      runRiskAssessment(event, false);
    }
  }, [event?.id, runRiskAssessment]);

  const back = <Link to={listUrl} className="inline-flex min-h-9 items-center gap-2 rounded-md border app-border app-bg-card px-4 text-sm font-semibold app-text-main transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"><FiArrowLeft aria-hidden="true" />{t("Quay lại danh sách")}</Link>;

  if (state === "loading" || resolvedId !== eventId) return <div className="space-y-5"><AdminPageHeader title={t("Hồ sơ duyệt sự kiện")} actions={back} /><AdminDataState state="loading" /></div>;
  if (state === "error") return <div className="space-y-5"><AdminPageHeader title={t("Hồ sơ duyệt sự kiện")} actions={back} /><AdminDataState state="error" onRetry={() => { setState("loading"); void loadEvent(); }} message={t("Không thể tải hồ sơ duyệt sự kiện. Vui lòng thử lại.")} /></div>;
  if (!event) return <div className="space-y-5"><AdminPageHeader title={t("Hồ sơ duyệt sự kiện")} actions={back} /><AdminDataState state="empty" message={t("Không tìm thấy hồ sơ này hoặc bạn không có quyền xem.")} /></div>;

  return (
    <div className="space-y-5">
      <AdminPageHeader title={event.title} description={`${t("Mã hồ sơ")}: ${event.id}`} actions={<div className="flex flex-wrap gap-2">{back}<button type="button" onClick={() => { setState("loading"); void loadEvent(); }} className="inline-flex min-h-9 items-center gap-2 rounded-md border app-border app-bg-card px-4 text-sm font-semibold app-text-main transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"><FiRefreshCw aria-hidden="true" />{t("Làm mới")}</button></div>} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <main className="space-y-5 min-w-0">
          {(event.bannerUrl || event.posterImage) && <div className="overflow-hidden rounded-lg shadow-xs border app-border app-bg-card"><img src={event.bannerUrl || event.posterImage} alt="" className="h-52 w-full object-cover sm:h-64" /></div>}
          
          {/* AI Risk Scoring Banner */}
          <div className={`p-4 rounded-lg shadow-xs border flex flex-col sm:flex-row gap-4 items-start ${
            isAnalyzingRisk ? "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" :
            riskScore?.risk_level === "HIGH" ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50" :
            riskScore?.risk_level === "MEDIUM" ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50" :
            "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50"
          }`}>
            <div className="flex items-center justify-center w-14 h-14 rounded-full shrink-0 shadow-inner bg-white dark:bg-zinc-800 border border-slate-100 dark:border-slate-700">
              {isAnalyzingRisk ? (
                <FiRefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
              ) : (
                <span className={`text-xl font-black ${
                  riskScore?.risk_level === "HIGH" ? "text-rose-600" :
                  riskScore?.risk_level === "MEDIUM" ? "text-amber-600" :
                  "text-emerald-600"
                }`}>
                  {riskScore?.risk_score || 0}
                </span>
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <FiShield className={`w-4 h-4 ${
                    isAnalyzingRisk ? "text-blue-500" :
                    riskScore?.risk_level === "HIGH" ? "text-rose-600" :
                    riskScore?.risk_level === "MEDIUM" ? "text-amber-600" :
                    "text-emerald-600"
                  }`} />
                  <span className="app-text-main">{t("AI Phân Tích Rủi Ro (Risk Scoring)")}</span>
                  {!isAnalyzingRisk && riskScore && (
                    <span className={`px-2 py-0.5 text-[10px] uppercase font-black rounded ${
                      riskScore.risk_level === "HIGH" ? "bg-rose-600 text-white" :
                      riskScore.risk_level === "MEDIUM" ? "bg-amber-500 text-white" :
                      riskScore.risk_level === "UNKNOWN" ? "bg-slate-500 text-white" :
                      "bg-emerald-500 text-white"
                    }`}>
                      {riskScore.risk_level}
                    </span>
                  )}
                </h4>

                {/* Refresh AI Analysis Button */}
                <button
                  type="button"
                  onClick={() => event && runRiskAssessment(event, true)}
                  disabled={isAnalyzingRisk}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border app-border app-bg-card hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title={t("Chạy lại phân tích rủi ro bằng AI")}
                >
                  <FiRefreshCw className={`w-3 h-3 ${isAnalyzingRisk ? "animate-spin" : ""}`} />
                  <span>{t("Làm mới phân tích")}</span>
                </button>
              </div>

              {isAnalyzingRisk ? (
                <p className="text-xs app-text-muted">{t("Đang đánh giá theo tiêu chuẩn quy định nghiêm ngặt của HaloTicket...")}</p>
              ) : (
                <ul className="text-xs app-text-muted list-disc list-inside space-y-0.5 pl-1">
                  {riskScore?.reasons.map((reason, idx) => (
                    <li key={idx} className="leading-tight">{reason}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <section className="rounded-lg shadow-xs border app-border app-bg-card p-5 space-y-4">
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

          {/* Venue Collision Card */}
          {collisionInfo && (
            <section className={`rounded-lg p-4 border flex items-start gap-3 shadow-xs ${
              collisionInfo.hasCollision 
                ? "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50 text-rose-800 dark:text-rose-200" 
                : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200"
            }`}>
              <div className={`p-2 rounded-full shrink-0 ${
                collisionInfo.hasCollision ? "bg-rose-100 text-rose-600 dark:bg-rose-900/50" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50"
              }`}>
                {collisionInfo.hasCollision ? <FiAlertTriangle className="w-5 h-5" /> : <FiCheckCircle className="w-5 h-5" />}
              </div>
              <div className="flex-1 text-sm space-y-1">
                <h3 className="font-bold flex items-center gap-2">
                  {collisionInfo.hasCollision ? t("Phát hiện trùng lịch tại địa điểm này!") : t("Không phát hiện trùng lịch tại địa điểm này")}
                </h3>
                {collisionInfo.hasCollision ? (
                  <p className="text-xs leading-relaxed">
                    {t("Địa điểm")} <strong className="underline">{event.locationName || event.address}</strong> {t("đang bị trùng thời gian với sự kiện")} <strong className="underline font-bold text-rose-700 dark:text-rose-300">"{collisionInfo.conflictingEvent}"</strong> ({collisionInfo.timeSlot}). {t("Vui lòng kiểm tra kỹ trước khi duyệt.")}
                  </p>
                ) : (
                  <p className="text-xs opacity-90">
                    {t("Địa điểm")} {event.locationName || event.address} {t("khả dụng và không có xung đột lịch với sự kiện nào khác trong hệ thống.")}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* SeatMap Preview Section */}
          <section className="rounded-lg shadow-xs border app-border app-bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FiLayers className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold app-text-main">{t("Sơ đồ chỗ ngồi (SeatMap)")}</h2>
                  <p className="text-xs app-text-muted">{seatLayout ? t("Sự kiện có thiết kế sơ đồ ghế ngồi phân khu") : t("Sự kiện không sử dụng sơ đồ ghế ngồi (Vé tự do)")}</p>
                </div>
              </div>
              {seatLayout && (
                <button
                  type="button"
                  onClick={() => setShowSeatMapModal(true)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border app-border app-bg-card hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FiLayers className="w-3.5 h-3.5" />
                  <span>{t("Xem Sơ đồ ghế")}</span>
                </button>
              )}
            </div>

            {seatLayout ? (
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap gap-2">
                  {seatLayout.zones?.map((zone, idx) => (
                    <div
                      key={zone.id || idx}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium"
                      style={{
                        borderColor: zone.colorCode || zone.strokeColor || "#3b82f6",
                        backgroundColor: (zone.fillColor || zone.colorCode || "#3b82f6") + "15",
                      }}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: zone.colorCode || zone.fillColor || "#3b82f6" }}
                      />
                      <span className="font-bold app-text-main">{zone.name || (zone as any).zoneName || t("Khu vực")}</span>
                      <span className="text-slate-500 font-mono">({zone.capacity || 0} {t("chỗ")})</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-xs app-text-muted pt-2 border-t app-border">
                  <span>{t("Tổng số khu vực:")} <strong className="app-text-main font-semibold">{seatLayout.zones?.length || 0}</strong></span>
                  <span>{t("Tổng sức chứa sơ đồ:")} <strong className="app-text-main font-semibold">{seatLayout.zones?.reduce((sum, z) => sum + (z.capacity || 0), 0) || 0} {t("ghế")}</strong></span>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed app-border p-4 text-center text-xs text-slate-400">
                {t("Không có sơ đồ ghế phân khu cho sự kiện này.")}
              </div>
            )}
          </section>

          {/* SeatMap Modal with Real Interactive Canvas */}
          {showSeatMapModal && seatLayout && createPortal(
            <div className="fixed inset-0 min-h-screen w-screen z-[99999] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="relative w-full max-w-5xl h-[85vh] flex flex-col rounded-2xl border app-border app-bg-card shadow-2xl overflow-hidden">
                <div className="p-4 border-b app-border flex items-center justify-between app-bg-subnav">
                  <div className="flex items-center gap-2">
                    <FiLayers className="w-5 h-5 text-blue-500" />
                    <div>
                      <h3 className="font-bold text-base app-text-main">{t("Sơ đồ ghế (Interactive Canvas):")} {event.title}</h3>
                      <p className="text-xs app-text-muted">{t("Xem trực tiếp phân khu và ghế ngồi dưới dạng Canvas 2D")}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSeatMapModal(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 w-full relative overflow-hidden bg-slate-950">
                  {parsedCanvasDoc ? (
                    <SeatCanvas
                      seats={parsedCanvasDoc.seats}
                      stages={parsedCanvasDoc.stages}
                      structures={parsedCanvasDoc.structures}
                      zones={parsedCanvasDoc.zones}
                      canvasSettings={parsedCanvasDoc.canvasSettings}
                      isAttendeeMode={true}
                      selectedSeatIds={[]}
                      setSelectedSeatIds={() => {}}
                      selectedStageId={null}
                      setSelectedStageId={() => {}}
                      selectedStructureId={null}
                      setSelectedStructureId={() => {}}
                      selectedZoneId={null}
                      setSelectedZoneId={() => {}}
                      onUpdateSeats={() => {}}
                      onUpdateStages={() => {}}
                      onUpdateStructures={() => {}}
                      onUpdateZones={() => {}}
                      onDeleteSelected={() => {}}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                      {t("Không thể tải sơ đồ ghế dạng Canvas")}
                    </div>
                  )}
                </div>

                <div className="p-4 border-t app-border flex items-center justify-between text-xs app-text-muted app-bg-subnav">
                  <span>{t("Khu vực:")} {seatLayout.zones?.length || 0} | {t("Tổng chỗ:")} {seatLayout.zones?.reduce((sum, z) => sum + (z.capacity || 0), 0) || 0}</span>
                  <button
                    type="button"
                    onClick={() => setShowSeatMapModal(false)}
                    className="px-4 py-2 font-bold rounded-lg border app-border app-bg-card hover:bg-slate-100 dark:hover:bg-slate-800 app-text-main transition-colors cursor-pointer"
                  >
                    {t("Đóng")}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {Boolean(event.showtimes?.length) && (
            <section className="rounded-lg shadow-xs border app-border app-bg-card p-5 space-y-4">
              <h2 className="text-lg font-bold app-text-main">{t("Thông tin Suất diễn & Hạng vé")}</h2>
              <div className="space-y-6">
                {event.showtimes?.map((showtime, index) => {
                  const stTickets = event.tickets?.filter(t => t.showtimeId === showtime.id) || [];
                  const displayTickets = stTickets.length > 0 ? stTickets : (event.showtimes?.length === 1 ? event.tickets || [] : []);

                  const now = new Date();
                  const saleStart = showtime.saleStartTime ? new Date(showtime.saleStartTime) : null;
                  const saleEnd = showtime.saleEndTime ? new Date(showtime.saleEndTime) : null;

                  let hasAvailableTickets = false;
                  if (displayTickets.length > 0) {
                      displayTickets.forEach(t => {
                        const total = typeof t.totalQuantity === "number" ? t.totalQuantity : (typeof t.quantity === "number" ? t.quantity : Infinity);
                        const sold = typeof t.soldQuantity === "number" ? t.soldQuantity : 0;
                        if (total - sold > 0) hasAvailableTickets = true;
                      });
                  } else {
                      hasAvailableTickets = true;
                  }

                  let statusLabel = "";
                  let statusClass = "";
                  if (!hasAvailableTickets && displayTickets.length > 0) {
                      statusLabel = t("Hết vé");
                      statusClass = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700";
                  } else if (saleEnd && now > saleEnd) {
                      statusLabel = t("Ngừng bán online");
                      statusClass = "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50";
                  } else if (saleStart && now < saleStart) {
                      statusLabel = t("Sắp mở bán");
                      statusClass = "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50";
                  } else {
                      statusLabel = t("Đang bán vé");
                      statusClass = "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50";
                  }

                  return (
                    <div key={showtime.id || index} className="space-y-4 rounded-lg border app-border p-4 app-bg-subnav shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b app-border pb-4">
                        <div>
                          <p className="font-bold text-base app-text-main flex flex-wrap items-center gap-2">
                            {showtime.name || `${t("Suất diễn")} ${index + 1}`}
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${statusClass}`}>{statusLabel}</span>
                          </p>
                          <div className="mt-2 space-y-1 text-sm app-text-muted">
                            <p className="flex items-center gap-1.5"><FiCalendar className="w-4 h-4 opacity-70" /> <span className="font-medium text-slate-700 dark:text-slate-300">{t("Lịch diễn:")}</span> {[displayDate(showtime.startTime), displayDate(showtime.endTime)].filter(Boolean).join(" – ")}</p>
                            {(showtime.saleStartTime || showtime.saleEndTime) && (
                              <p className="flex items-center gap-1.5"><FiTag className="w-4 h-4 opacity-70" /> <span className="font-medium text-slate-700 dark:text-slate-300">{t("Mở bán:")}</span> {[displayDate(showtime.saleStartTime), displayDate(showtime.saleEndTime)].filter(Boolean).join(" – ")}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {displayTickets.length > 0 ? (
                        <div className="space-y-3 pt-1">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("Các hạng vé thuộc suất diễn")}</h4>
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {displayTickets.map((ticket, tIdx) => (
                              <div key={tIdx} className="relative rounded-md border app-border app-bg-card p-4 shadow-sm flex flex-col gap-1.5 transition-all hover:border-blue-300 dark:hover:border-blue-700">
                                <div className="flex justify-between items-start gap-2">
                                  <span className="font-bold text-sm app-text-main line-clamp-2 leading-tight">{String(ticket.name || t("Hạng vé"))}</span>
                                  {Boolean(ticket.status || ticket.statusText) && (
                                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm app-bg-subnav text-slate-600 dark:text-slate-300 shrink-0">
                                      {String(ticket.statusText || ticket.status)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-base font-black text-blue-600 dark:text-blue-400 mt-1">
                                  {typeof ticket.price === "number" ? `${ticket.price.toLocaleString("vi-VN")} đ` : (ticket.price === 0 ? t("Miễn phí") : t("Chưa cập nhật"))}
                                </div>
                                <div className="text-xs app-text-muted mt-2 pt-2 border-t app-border flex justify-between items-center">
                                  <span>{t("Số lượng")}</span>
                                  <span className="font-bold text-slate-700 dark:text-slate-200 app-bg-subnav px-2 py-0.5 rounded-full">
                                    {typeof ticket.totalQuantity === "number" ? ticket.totalQuantity : typeof ticket.quantity === "number" ? ticket.quantity : "∞"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm italic app-text-muted">{t("Chưa có thông tin hạng vé cho suất diễn này.")}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="rounded-lg shadow-xs border app-border app-bg-card p-5 space-y-3">
            <h2 className="text-lg font-bold app-text-main">{t("Nội dung mô tả chi tiết sự kiện")}</h2>
            <div
              className="prose dark:prose-invert max-w-none text-sm leading-relaxed app-text-main break-words whitespace-pre-line [&_img]:rounded-lg [&_img]:max-h-[500px] [&_img]:w-auto [&_img]:my-3 [&_video]:rounded-lg [&_video]:max-w-full [&_p]:mb-3"
              dangerouslySetInnerHTML={{ __html: formattedDescription || t("Chưa cập nhật") }}
            />
          </section>

          {Boolean(event.customQuestions?.length) && <section className="rounded-lg shadow-xs border app-border app-bg-card p-5 space-y-3"><h2 className="text-lg font-bold app-text-main">{t("Câu hỏi đăng ký")}</h2><div className="divide-y divide-slate-100 dark:divide-slate-800/50">{event.customQuestions?.map((question, index) => <div key={typeof question.id === "string" ? question.id : index} className="py-3 text-sm"><p className="font-semibold app-text-main">{typeof question.title === "string" && question.title.trim() ? question.title : `${t("Câu hỏi")} ${index + 1}`}{question.isRequired === true ? ` · ${t("Bắt buộc")}` : ""}</p>{typeof question.description === "string" && question.description.trim() && <p className="app-text-muted">{question.description}</p>}</div>)}</div></section>}
        </main>

        <aside className="min-w-0 space-y-5">
          <section className="rounded-lg shadow-xs border app-border app-bg-card overflow-hidden">
            <div className="app-bg-subnav border-b app-border p-4 flex items-center justify-between">
              <h2 className="text-base font-bold app-text-main">{t("Quyết định phê duyệt")}</h2>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${displayApprovalStatus(event.eventApprovalStatus).className}`}>
                {t(displayApprovalStatus(event.eventApprovalStatus).label)}
              </span>
            </div>
            <div className="p-5">
              <EventApprovalActions key={event.id} event={event} onSuccess={() => navigate(listUrl)} />
            </div>
          </section>

          {event.eventApprovalStatus === "REJECTED" && (event.rejectionReason || event.rejectionNotes) && (
            <section className="rounded-lg shadow-xs border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-5 text-sm text-rose-800 dark:text-rose-300">
              <h2 className="font-bold flex items-center gap-2 mb-3"><FiShield className="w-4 h-4" />{t("Lý do từ chối phê duyệt")}</h2>
              <div className="space-y-3 bg-white/60 dark:bg-black/20 p-4 rounded-md border border-rose-100 dark:border-rose-900/30">
                {event.rejectionReason && <div><span className="font-semibold block text-[11px] uppercase tracking-wider opacity-70 mb-1">{t("Lý do chính")}</span><p className="font-medium">{event.rejectionReason}</p></div>}
                {event.rejectionNotes && <div><span className="font-semibold block text-[11px] uppercase tracking-wider opacity-70 mb-1">{t("Chi tiết bổ sung")}</span><p className="whitespace-pre-wrap">{event.rejectionNotes}</p></div>}
              </div>
            </section>
          )}

          {(event.taxName || event.taxCode || event.taxAddress || event.businessType || event.accountHolder || event.accountNumber || event.bankName || event.bankBranch) && (
            <section className="rounded-lg shadow-xs border app-border app-bg-card p-5 space-y-4">
              <h2 className="text-base font-bold app-text-main flex items-center gap-2">
                <div className="w-8 h-8 rounded-full app-bg-subnav flex items-center justify-center app-text-main"><FiBriefcase className="w-4 h-4" /></div>
                {t("Hồ Sơ Tổ Chức")}
              </h2>
              <div className="rounded-lg border app-border app-bg-subnav divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                {[
                  [t("Đơn vị / Cá nhân"), event.taxName], 
                  [t("Mã số thuế"), event.taxCode], 
                  [t("Địa chỉ"), event.taxAddress], 
                  [t("Loại hình"), event.businessType], 
                  [t("Chủ tài khoản"), event.accountHolder], 
                  [t("Số tài khoản"), event.accountNumber], 
                  [t("Ngân hàng"), [event.bankName, event.bankBranch].filter(Boolean).join(" · ")]
                ].filter((entry) => entry[1]).map(([label, value]) => (
                  <div key={label} className="p-3 flex flex-col gap-1 transition-colors">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
                    <span className="font-medium app-text-main break-words">{value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

export default EventApprovalDetail;
