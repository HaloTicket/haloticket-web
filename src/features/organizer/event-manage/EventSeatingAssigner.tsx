import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { ticketApi } from "@/services/ticketApi";
import { eventApi } from "@/services/eventApi";
import {
  FiTag,
  FiPlus,
  FiCheckCircle,
  FiAlertCircle,
  FiLayers,
  FiSend,
  FiLock,
  FiInfo,
  FiDownload,
  FiEye,
  FiX,
} from "react-icons/fi";
import { FaTicketAlt } from "react-icons/fa";
import { ToastContainer, type ToastMessage } from "./components/seating/SeatingToast";
import ConfirmModal from "@/components/common/ConfirmModal";
import type {
  CanvasSettings,
  Seat,
  SeatMapDocument,
  SeatTier,
  StageElement,
  StructureElement,
  ZoneBlock,
} from "@/types/seating";
import { SeatCanvas } from "./components/seating/SeatCanvas";
import { TierManagerModal } from "./components/seating/TierManagerModal";
import { AttendeePreview } from "./components/seating/AttendeePreview";
import { PRESET_TEMPLATES } from "@/mock/presetTemplates";
import {
  DEFAULT_CANVAS_SETTINGS,
  generateSeatMapSVG,
  safeClone,
} from "@/utils/seatMapHelpers";
import { formatCurrency } from "@/utils/formatters";

export const EventSeatingAssigner: React.FC = () => {
  const { t } = useTranslation();
  const { eventId: urlEventId } = useParams<{ eventId: string }>();
  const activeEventId = urlEventId || "e045ea48-2a1b-4914-8d90-3e29ff7cce03";

  const [eventName, setEventName] = useState<string>(() => t("Sự kiện"));
  const [backendTiers, setBackendTiers] = useState<SeatTier[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [stages, setStages] = useState<StageElement[]>([]);
  const [structures, setStructures] = useState<StructureElement[]>([]);
  const [zones, setZones] = useState<Record<string, ZoneBlock>>({});
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>(DEFAULT_CANVAS_SETTINGS);

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [isTierModalOpen, setIsTierModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isAttendeePreviewMode, setIsAttendeePreviewMode] = useState<boolean>(false);
  const [attendeeCart, setAttendeeCart] = useState<Seat[]>([]);
  const studioRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [selectedZoneModal, setSelectedZoneModal] = useState<ZoneBlock | null>(null);
  const [zoneTicketQuantity, setZoneTicketQuantity] = useState<number>(1);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      studioRef.current?.requestFullscreen?.().catch(() => { });
    } else {
      document.exitFullscreen?.().catch(() => { });
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  } | null>(null);

  const showToast = (type: "success" | "error" | "warning" | "info", text: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // fetch Event, Draft SeatMap, and Tiers
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const eventRes = await eventApi.getEventById(activeEventId);
        if (isMounted && eventRes) {
          setEventName(((eventRes as any).title as string) || t("Sự kiện"));
        }

        // fetch ticket tiers first
        let mappedTiers: SeatTier[] = [];
        const tiersRes = await ticketApi.getTicketTypesByEventId(activeEventId);
        if (tiersRes && tiersRes.length > 0) {
          const colors = ['#f59e0b', '#9333ea', '#2563eb', '#10b981', '#f97316', '#ec4899', '#475569', '#06b6d4'];
          mappedTiers = tiersRes.map((t: any, idx: number) => ({
            id: t.id || `tier_${Date.now()}_${idx}`,
            name: t.name || t("Vé Thường"),
            price: t.price || 0,
            color: t.color || colors[idx % colors.length],
            isFree: t.isFree ?? t.price === 0,
            totalQuantity: t.totalQuantity ?? 100,
            minPerOrder: t.minPerOrder ?? 1,
            maxPerOrder: t.maxPerOrder ?? 5,
            description: t.description || "",
          }));

          // deduplicate by name 
          mappedTiers = mappedTiers.filter((t, index, self) =>
            index === self.findIndex((tc) => tc.name.trim().toLowerCase() === t.name.trim().toLowerCase())
          );
        }

        // fallback to eventRes tickets if tiersRes was empty
        if (mappedTiers.length === 0 && eventRes) {
          const rawEvTickets = (eventRes as any)?.tickets || (eventRes as any)?.ticketsData;
          let parsedTickets: any[] = [];
          if (Array.isArray(rawEvTickets)) {
            parsedTickets = rawEvTickets;
          } else if (typeof rawEvTickets === "string") {
            try { parsedTickets = JSON.parse(rawEvTickets); } catch {}
          }
          const showtimeNames = ((eventRes as any).showtimes || []).map((s: any) => (s.name || "").trim().toLowerCase());
          const validEvTickets = parsedTickets.filter((t: any) => {
            const tName = (t.name || "").trim().toLowerCase();
            const looksLikeShowtime = t.startTime && !t.price && !t.minPerOrder;
            const matchesShowtime = showtimeNames.length > 0 && showtimeNames.includes(tName) && !t.minPerOrder && !t.description;
            return !looksLikeShowtime && !matchesShowtime;
          });
          if (validEvTickets.length > 0) {
            const colors = ['#f59e0b', '#9333ea', '#2563eb', '#10b981', '#f97316', '#ec4899', '#475569', '#06b6d4'];
            mappedTiers = validEvTickets.map((t: any, idx: number) => ({
              id: t.id || `tier_${Date.now()}_${idx}`,
              name: t.name || t("Vé Thường"),
              price: t.price || 0,
              color: t.color || colors[idx % colors.length],
              isFree: t.isFree ?? t.price === 0,
              totalQuantity: t.totalQuantity ?? 100,
              minPerOrder: t.minPerOrder ?? 1,
              maxPerOrder: t.maxPerOrder ?? 5,
              description: t.description || "",
            }));
            mappedTiers = mappedTiers.filter((t, index, self) =>
              index === self.findIndex((tc) => tc.name.trim().toLowerCase() === t.name.trim().toLowerCase())
            );
          }
        }

        if (isMounted && mappedTiers.length > 0) {
          setBackendTiers(mappedTiers);
        }

        const effectiveLoadedTiers = mappedTiers.length > 0 ? mappedTiers : [];

        // fetch draft layout
        let doc: SeatMapDocument | null = null;
        const draftRes = await ticketApi.getSeatLayoutByEventId(activeEventId);

        if (draftRes?.draftJson) {
          try {
            doc = JSON.parse(draftRes.draftJson) as SeatMapDocument;
          } catch (e) {
            console.warn("Failed to parse backend draft layout json:", e);
          }
        }

        // if backend draft is missing or empty, check localStorage draft
        if (!doc || (!doc.zones && !doc.seats) || (Object.keys(doc.zones || {}).length === 0 && (doc.seats || []).length === 0)) {
          const loadedEventTitle = ((eventRes as any)?.title as string) || eventName;
          const localStr =
            localStorage.getItem(`haloticket_seatmap_draft_${activeEventId}`) ||
            localStorage.getItem(`haloticket_seatmap_draft_${loadedEventTitle}`) ||
            localStorage.getItem(`haloticket_seatmap_draft_${eventName}`);
          if (localStr) {
            try {
              doc = JSON.parse(localStr) as SeatMapDocument;
            } catch (e) {
              console.warn("Failed to parse localStorage seatmap draft:", e);
            }
          }
        }

        if (isMounted) {
          if (doc) {
            const rawZones = safeClone(doc.zones || {});

            // pair zone.tierId with DB ticket type IDs (by ID match or Tier Name match)
            const syncedZones: Record<string, ZoneBlock> = {};
            Object.entries(rawZones).forEach(([zId, z]) => {
              let tierId = z.tierId;
              if (tierId) {
                const matched = effectiveLoadedTiers.find(
                  (t) => t.id === tierId || t.name.toLowerCase().trim() === z.name.toLowerCase().trim()
                );
                if (matched) {
                  tierId = matched.id;
                }
              }
              syncedZones[zId] = {
                ...z,
                tierId,
              };
            });

            // if draftRes returns seatZones array from DB, use backend ticketTypeId if present
            if (draftRes?.zones && Array.isArray(draftRes.zones)) {
              draftRes.zones.forEach((sz: any) => {
                if (sz.id && syncedZones[sz.id] && sz.ticketTypeId) {
                  syncedZones[sz.id].tierId = sz.ticketTypeId;
                }
              });
            }

            setZones(syncedZones);
            setSeats(safeClone(doc.seats || []));
            setStages(safeClone(doc.stages || []));
            setStructures(safeClone(doc.structures || []));
            if (doc.canvasSettings) {
              setCanvasSettings(doc.canvasSettings);
            }
          } else if (draftRes?.zones && Array.isArray(draftRes.zones) && draftRes.zones.length > 0) {
            // construct zones from backend draftRes.zones array
            const syncedZones: Record<string, ZoneBlock> = {};
            draftRes.zones.forEach((z: any) => {
              let parsedPoints = undefined;
              if (z.points) {
                if (typeof z.points === 'string') {
                  try { parsedPoints = JSON.parse(z.points); } catch { parsedPoints = undefined; }
                } else {
                  parsedPoints = z.points;
                }
              }
              syncedZones[z.id || `zone_${Date.now()}`] = {
                id: z.id || `zone_${Date.now()}`,
                name: z.name || t('Khu vực'),
                tierId: z.ticketTypeId || undefined,
                shape: (z.shapeType || 'rectangle').toString().toLowerCase() as any,
                color: z.colorCode || z.fillColor || '#3b82f6',
                fillColor: z.fillColor || z.colorCode || '#3b82f6',
                strokeColor: z.strokeColor || '#2563eb',
                curvature: z.curvature ?? 16,
                x: z.x ?? 100,
                y: z.y ?? 100,
                width: z.width ?? 300,
                height: z.height ?? 180,
                rotation: z.rotation ?? 0,
                points: parsedPoints,
                capacity: z.capacity,
              };
            });
            setZones(syncedZones);
          } else {
            // fallback template layout only if no draft exists anywhere
            const sample = PRESET_TEMPLATES[0];
            setZones(safeClone(sample.zones || {}));
            setSeats(safeClone(sample.seats || []));
            setStages(safeClone(sample.stages || []));
            setStructures(safeClone(sample.structures || []));
          }
        }
      } catch (err) {
        console.error("Error loading seating assigner data:", err);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [activeEventId]);

  const effectiveTiers = useMemo(
    () => (backendTiers.length ? backendTiers : []),
    [backendTiers]
  );

  const applyZoneTier = (zoneId: string, tierId: string) => {
    const currentZone = zones[zoneId];
    if (!currentZone) return;

    const updatedZone: ZoneBlock = {
      ...currentZone,
      tierId: tierId || undefined,
      color: currentZone.color,
    };

    setZones((prev) => ({
      ...prev,
      [zoneId]: updatedZone,
    }));
  };

  const handleUpdateZoneTier = (zoneId: string, tierId: string) => {
    const currentZone = zones[zoneId];
    if (!currentZone) return;

    // clear tier assignment
    if (!tierId) {
      applyZoneTier(zoneId, '');
      return;
    }

    // seat count vs ticket totalQuantity Warning Check across all zones sharing this tier
    const targetTier = effectiveTiers.find((t) => t.id === tierId);
    const otherZonesWithTier = Object.values(zones).filter(
      (z) => z.id !== zoneId && z.tierId === tierId
    );
    const currentZoneSeatCount = seats.filter((s) => s.zoneId === zoneId).length || currentZone.capacity || 0;
    const otherZonesSeatCount = otherZonesWithTier.reduce((sum, z) => {
      const zSeats = seats.filter((s) => s.zoneId === z.id).length || z.capacity || 0;
      return sum + zSeats;
    }, 0);
    const totalAssignedSeats = currentZoneSeatCount + otherZonesSeatCount;
    const tierTotalQty = targetTier ? (targetTier.totalQuantity ?? (targetTier as any).quantity ?? 100) : 0;

    if (targetTier) {
      if (currentZoneSeatCount > tierTotalQty) {
        showToast(
          'error',
          `${t('Không thể gán')}: ${t('Số vé trong hạng vé')} "${targetTier.name}" (${tierTotalQty} ${t('vé')}) < ${t('số ghế bên trong khu vực')} "${currentZone.name}" (${currentZoneSeatCount} ${t('ghế')}).`
        );
        return;
      }
      if (totalAssignedSeats > tierTotalQty) {
        showToast(
          'error',
          `${t('Không thể gán')}: ${t('Tổng số ghế các khu vực gán hạng vé')} "${targetTier.name}" (${totalAssignedSeats} ${t('ghế')}) > ${t('số lượng vé mở bán')} (${tierTotalQty} ${t('vé')}).`
        );
        return;
      }
    }

    applyZoneTier(zoneId, tierId);
  };

  // export Seat Map as PNG Image (White background + centered large title)
  const handleExportPNG = () => {
    const payload: SeatMapDocument = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      name: eventName,
      venueTemplateId: 'default',
      canvasSettings,
      zones,
      stages,
      structures,
      seats,
      ticketTiers: effectiveTiers,
    };
    const svgString = generateSeatMapSVG(payload);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = canvasSettings?.width || 1500;
      const h = canvasSettings?.height || 1050;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `${t('Sơ_đồ_ghế')}_${eventName.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
        showToast('success', t('Đã xuất ảnh sơ đồ ghế thành công!'));
      }
    };
    img.src = url;
  };

  const handleSaveAssignments = async () => {
    try {
      setIsSaving(true);

      // 1. dync ticket tiers (types) to backend DB
      let syncedTiers: SeatTier[] = effectiveTiers;
      if (effectiveTiers && effectiveTiers.length > 0) {
        const requests = effectiveTiers.map((t) => ({
          id: t.id.startsWith("tier_") ? undefined : t.id,
          eventId: activeEventId,
          name: t.name,
          price: t.price,
          isFree: t.isFree ?? t.price === 0,
          totalQuantity: t.totalQuantity ?? 100,
          minPerOrder: t.minPerOrder ?? 1,
          maxPerOrder: t.maxPerOrder ?? 5,
          description: t.description,
        }));
        const responseTiers = await ticketApi.syncTicketTypesForEvent(activeEventId, requests);
        if (responseTiers && responseTiers.length > 0) {
          const colors = ['#f59e0b', '#9333ea', '#2563eb', '#10b981', '#f97316', '#ec4899', '#475569', '#06b6d4'];
          syncedTiers = responseTiers.map((t: any, idx: number) => ({
            id: t.id || `tier_${Date.now()}_${idx}`,
            name: t.name || t("Vé Thường"),
            price: t.price || 0,
            color: t.color || colors[idx % colors.length],
            isFree: t.isFree ?? t.price === 0,
            totalQuantity: t.totalQuantity ?? 100,
            minPerOrder: t.minPerOrder ?? 1,
            maxPerOrder: t.maxPerOrder ?? 5,
            description: t.description || "",
          }));
          setBackendTiers(syncedTiers);
        }
      }

      // map old tier IDs to real synced DB tier IDs
      const tierIdMap = new Map<string, string>();
      effectiveTiers.forEach((oldTier) => {
        const matchedNewTier = syncedTiers.find(
          (st) => st.id === oldTier.id || st.name.toLowerCase().trim() === oldTier.name.toLowerCase().trim()
        );
        if (matchedNewTier) {
          tierIdMap.set(oldTier.id, matchedNewTier.id);
        }
      });

      // update zones with real synced DB tier IDs
      const updatedZones: Record<string, ZoneBlock> = {};
      Object.entries(zones).forEach(([zId, z]) => {
        const mappedTierId = z.tierId ? (tierIdMap.get(z.tierId) || z.tierId) : undefined;
        updatedZones[zId] = {
          ...z,
          tierId: mappedTierId,
        };
      });

      // update seats with real synced DB tier IDs
      const updatedSeats = seats.map((s) => {
        const zone = updatedZones[s.zoneId];
        const mappedTierId = s.tierId
          ? (tierIdMap.get(s.tierId) || s.tierId)
          : zone?.tierId;
        return {
          ...s,
          tierId: mappedTierId,
        };
      });

      setZones(updatedZones);
      setSeats(updatedSeats);

      // 2. publish seat layout
      const payload: SeatMapDocument = {
        version: "2.0",
        timestamp: new Date().toISOString(),
        name: eventName,
        venueTemplateId: "default",
        canvasSettings,
        zones: updatedZones,
        stages,
        structures,
        seats: updatedSeats,
        ticketTiers: syncedTiers,
      };

      const zonesPayload = Object.entries(updatedZones).map(([zId, z]) => ({
        id: zId,
        name: z.name,
        ticketTypeId: z.tierId || null,
        shapeType: String(z.shape || "RECTANGLE").toUpperCase(),
        colorCode: z.color,
        fillColor: z.fillColor || z.color,
        strokeColor: z.strokeColor || z.color,
        curvature: z.curvature ?? 16,
        x: z.x ?? 100,
        y: z.y ?? 100,
        width: z.width ?? 300,
        height: z.height ?? 180,
        rotation: z.rotation ?? 0,
        capacity: z.capacity || (updatedSeats.filter((s) => s.zoneId === zId).length || 100),
      }));

      await ticketApi.publishSeatLayout(activeEventId, {
        eventId: activeEventId,
        draftJson: JSON.stringify(payload),
        svgData: generateSeatMapSVG(payload),
        imageUrl: null,
        status: "PUBLISHED",
        zones: zonesPayload,
      });

      showToast("success", t("Đã lưu & đồng bộ gán Hạng vé vào sơ đồ ghế thành công!"));
    } catch (err) {
      console.error(t("Lỗi khi lưu gán hạng vé:"), err);
      showToast("error", t("Lỗi kết nối CSDL khi lưu gán hạng vé!"));
    } finally {
      setIsSaving(false);
    }
  };

  const assignedZoneCount = Object.values(zones).filter((z) => z.tierId).length;
  const totalZones = Object.keys(zones).length;

  return (
    <div ref={studioRef} className={`space-y-6 animate-in fade-in duration-300 ${isFullscreen ? 'seat-studio-root is-fullscreen' : ''}`}>
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />

      {/* Top Header Card */}
      <div className="app-bg-card border app-border rounded-2xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1">
              <FiTag className="w-3 h-3" /> {t("Gán Hạng Vé Sơ Đồ Ghế")}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold">
              {t("Đã gán")} {assignedZoneCount}/{totalZones} {t("khu vực")}
            </span>
          </div>
          <h1 className="text-xl font-extrabold app-text-main">{eventName}</h1>
          <p className="text-xs app-text-muted mt-1 flex items-center gap-1">
            <FiLock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{t("Khung sơ đồ layout đã được khóa. Vui lòng chọn từng khu vực để gán hạng vé & thiết lập giá bán.")}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
          {/* Attendee Preview Toggle */}
          <button
            type="button"
            onClick={() => setIsAttendeePreviewMode((prev) => !prev)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer shadow-xs ${isAttendeePreviewMode
                ? "bg-purple-600 text-white border-purple-500 shadow-purple-600/30"
                : "app-bg-subnav app-text-main hover:border-purple-500 border app-border"
              }`}
          >
            <FiEye className="w-4 h-4 text-purple-400" />
            <span>{isAttendeePreviewMode ? t("Chế độ Gán Vé") : t("Xem Trực Quan Mua Vé")}</span>
          </button>

          {/* Export PNG Image Button */}
          <button
            type="button"
            onClick={handleExportPNG}
            className="px-3.5 py-2 app-bg-subnav app-text-main hover:border-blue-500 border app-border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title={t("Tải ảnh sơ đồ 2D dạng PNG")}
          >
            <FiDownload className="w-4 h-4 text-blue-500" />
            <span>{t("Xuất ảnh sơ đồ")}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTierModalOpen(true)}
            className="px-4 py-2 app-bg-subnav app-text-main hover:border-indigo-500 border app-border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FiPlus className="w-4 h-4 text-indigo-500" />
            <span>{t("Quản lý hạng vé")}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAssignments}
            disabled={isSaving}
            className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <FiSend className="w-4 h-4" />
            <span>{isSaving ? t("Đang lưu...") : t("Lưu & Đồng bộ sơ đồ")}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Assigner Inspector / Attendee Preview + Canvas Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {!isAttendeePreviewMode ? (
          <>
            {/* Left Canvas: Read-Only Locked SeatMap Preview */}
            <div className="lg:col-span-8 app-bg-card border app-border rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b app-border pb-3 px-1">
                <h3 className="text-xs font-extrabold app-text-main flex items-center gap-2">
                  <FiLayers className="w-4 h-4 text-blue-600" />
                  <span>{t("Xem trực quan sơ đồ (Nhấp vào khu vực để chọn & gán Hạng vé)")}</span>
                </h3>
                <span className="text-[10px] font-bold app-text-muted">
                  {seats.length} {t("ghế tổng cộng")}
                </span>
              </div>

              <div className="w-full min-h-[550px] overflow-hidden rounded-xl border app-border">
                <SeatCanvas
                  seats={seats}
                  stages={stages}
                  structures={structures}
                  zones={zones}
                  tiers={effectiveTiers}
                  canvasSettings={canvasSettings}
                  selectedSeatIds={[]}
                  setSelectedSeatIds={() => { }}
                  selectedStageId={null}
                  setSelectedStageId={() => { }}
                  selectedStructureId={null}
                  setSelectedStructureId={() => { }}
                  selectedZoneId={selectedZoneId}
                  setSelectedZoneId={setSelectedZoneId}
                  onUpdateSeats={() => { }}
                  onUpdateStages={() => { }}
                  onUpdateStructures={() => { }}
                  onUpdateZones={() => { }}
                  onUpdateCanvasSettings={() => { }}
                  onDeleteSelected={() => { }}
                  onUndo={() => { }}
                  onRedo={() => { }}
                  canUndo={false}
                  canRedo={false}
                  onCommitHistory={() => { }}
                  isAttendeeMode={false}
                  attendeeCart={attendeeCart}
                  onToggleAttendeeSeat={() => { }}
                  onSelectZoneAttendee={(z) => setSelectedZoneId(z.id)}
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={handleToggleFullscreen}
                  onCanvasClickPosition={() => { }}
                />
              </div>
            </div>

            {/* Right Inspector: Zone & Tier Assignment Panel (Fixed/Sticky Under Header) */}
            <div className="lg:col-span-4 app-bg-card border app-border rounded-2xl p-5 shadow-sm space-y-5 sticky top-4 z-20">
              <div className="flex items-center justify-between border-b app-border pb-3">
                <h3 className="text-sm font-extrabold app-text-main flex items-center gap-2">
                  <FaTicketAlt className="w-4 h-4 text-indigo-500" />
                  <span>{t("Danh sách Khu vực")} ({totalZones})</span>
                </h3>
                <span className="text-[11px] font-semibold text-indigo-500">
                  {assignedZoneCount}/{totalZones} {t("đã gán")}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-300">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <FiInfo className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{t("Hướng dẫn gán hạng vé")}</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  {t("Chọn hạng vé phù hợp cho từng khu vực (một hạng vé có thể gán cho nhiều khu vực). Các ghế trong khu vực sẽ tự động kế thừa giá và hạng vé tương ứng.")}
                </p>
              </div>

              {/* Zones List */}
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                {totalZones === 0 ? (
                  <div className="p-6 text-center text-xs app-text-muted">
                    {t("Chưa có khu vực nào được tạo trên sơ đồ ghế. Vui lòng sang trang \"Thiết kế sơ đồ ghế\" để vẽ khu vực trước.")}
                  </div>
                ) : (
                  Object.values(zones).map((zone) => {
                    const assignedTier = effectiveTiers.find((t) => t.id === zone.tierId);
                    const zoneSeatCount = seats.filter((s) => s.zoneId === zone.id).length;
                    const isSelected = selectedZoneId === zone.id;

                    return (
                      <div
                        key={zone.id}
                        onClick={() => setSelectedZoneId(zone.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${isSelected
                            ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40 shadow-sm"
                            : "app-bg-subnav border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3.5 h-3.5 rounded-full border border-black/20"
                              style={{ backgroundColor: zone.color || "#3b82f6" }}
                            />
                            <span className="text-xs font-bold app-text-main">{zone.name}</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md app-bg-card border app-border text-slate-600 dark:text-slate-300">
                            {zoneSeatCount} {t("ghế")}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold app-text-muted">
                            {t("Hạng vé áp dụng")}:
                          </label>
                          <select
                            value={zone.tierId || ""}
                            onChange={(e) => handleUpdateZoneTier(zone.id, e.target.value)}
                            className="w-full app-bg-card app-text-main text-xs font-bold rounded-lg px-3 py-2.5 border app-border focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                          >
                            <option value="">-- {t("Chưa gán hạng vé")} --</option>
                            {effectiveTiers.map((tier) => (
                              <option key={tier.id} value={tier.id}>
                                {tier.name} ({formatCurrency(tier.price)})
                              </option>
                            ))}
                          </select>
                        </div>

                        {assignedTier ? (
                          <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                            <span className="flex items-center gap-1">
                              <FiCheckCircle className="w-3.5 h-3.5" /> {t("Giá vé mở bán")}:
                            </span>
                            <span className="font-black text-xs">{formatCurrency(assignedTier.price)}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800/60 flex items-center gap-1">
                            <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{t("Khu vực này chưa có hạng vé")}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Left: Canvas Studio in Preview Mode */}
            <div className="lg:col-span-8 app-bg-card border app-border rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b app-border pb-3 px-1">
                <h3 className="text-xs font-extrabold app-text-main flex items-center gap-2">
                  <FiEye className="w-4 h-4 text-purple-500" />
                  <span>{t("Xem Trước Trực Quan Khán Giả Mua Vé (Nhấp chọn ghế hoặc chọn khu vực)")}</span>
                </h3>
                <span className="text-[10px] font-bold app-text-muted">
                  {seats.length} {t("ghế tổng cộng")}
                </span>
              </div>

              <div className="w-full min-h-[550px] overflow-hidden rounded-xl border app-border">
                <SeatCanvas
                  seats={seats}
                  stages={stages}
                  structures={structures}
                  zones={zones}
                  tiers={effectiveTiers}
                  canvasSettings={canvasSettings}
                  selectedSeatIds={[]}
                  setSelectedSeatIds={() => { }}
                  selectedStageId={null}
                  setSelectedStageId={() => { }}
                  selectedStructureId={null}
                  setSelectedStructureId={() => { }}
                  selectedZoneId={selectedZoneId}
                  setSelectedZoneId={setSelectedZoneId}
                  onUpdateSeats={() => { }}
                  onUpdateStages={() => { }}
                  onUpdateStructures={() => { }}
                  onUpdateZones={() => { }}
                  onUpdateCanvasSettings={() => { }}
                  onDeleteSelected={() => { }}
                  onUndo={() => { }}
                  onRedo={() => { }}
                  canUndo={false}
                  canRedo={false}
                  onCommitHistory={() => { }}
                  isAttendeeMode={true}
                  attendeeCart={attendeeCart}
                  onToggleAttendeeSeat={(seat) => {
                    const inCart = attendeeCart.some((s) => s.id === seat.id);
                    if (inCart) {
                      setAttendeeCart((prev) => prev.filter((s) => s.id !== seat.id));
                    } else {
                      setAttendeeCart((prev) => [...prev, seat]);
                    }
                  }}
                  onSelectZoneAttendee={(z) => {
                    setSelectedZoneModal(z);
                    setZoneTicketQuantity(1);
                  }}
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={handleToggleFullscreen}
                  onCanvasClickPosition={() => { }}
                />
              </div>
            </div>

            {/* Right: Attendee Preview Inspector Panel */}
            <div className="lg:col-span-4 sticky top-4 z-20">
              <AttendeePreview
                cart={attendeeCart}
                tiers={effectiveTiers}
                zones={zones}
                onRemoveCartSeat={(seatId) =>
                  setAttendeeCart((prev) => prev.filter((seat) => seat.id !== seatId))
                }
                onClearCart={() => setAttendeeCart([])}
              />
            </div>
          </>
        )}
      </div>

      {/* Zone Ticket Selector Modal for Preview Mode */}
      {selectedZoneModal && (
        <div className="seat-studio-modal-backdrop" onMouseDown={() => setSelectedZoneModal(null)}>
          <div className="seat-studio-modal max-w-md p-6 space-y-4" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b app-border pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-500">{t("Khán giả chọn mua vé theo Zone")}</span>
                <h3 className="text-base font-black app-text-main mt-0.5">{selectedZoneModal.name}</h3>
              </div>
              <button type="button" onClick={() => setSelectedZoneModal(null)} className="seat-studio-icon-button"><FiX /></button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="app-text-muted font-bold">{t("Số lượng vé muốn mua")}:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoneTicketQuantity((prev) => Math.max(1, prev - 1))}
                    className="w-7 h-7 rounded-lg app-bg-main border app-border font-bold flex items-center justify-center app-text-main hover:border-blue-500"
                  >
                    -
                  </button>
                  <span className="font-mono text-sm font-black w-6 text-center app-text-main">{zoneTicketQuantity}</span>
                  <button
                    type="button"
                    onClick={() => setZoneTicketQuantity((prev) => Math.min(10, prev + 1))}
                    className="w-7 h-7 rounded-lg app-bg-main border app-border font-bold flex items-center justify-center app-text-main hover:border-blue-500"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t app-border text-sm font-black">
                <span className="app-text-main">{t("Tổng giá trị")}:</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono">
                  {((selectedZoneModal.price ?? effectiveTiers.find((t) => t.id === selectedZoneModal.tierId)?.price ?? 0) * zoneTicketQuantity).toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const zoneSeats = seats.filter((s) => s.zoneId === selectedZoneModal.id);
                const availableSeats = zoneSeats.filter((s) => s.status === 'available');
                const seatsToAdd = availableSeats.slice(0, zoneTicketQuantity);

                if (seatsToAdd.length > 0) {
                  setAttendeeCart((prev) => {
                    const existingIds = new Set(prev.map((s) => s.id));
                    const newSeats = seatsToAdd.filter((s) => !existingIds.has(s.id));
                    return [...prev, ...newSeats];
                  });
                  showToast('success', `${t('Đã thêm')} ${seatsToAdd.length} ${t('vé khu vực')} ${selectedZoneModal.name} ${t('vào giỏ!')}`);
                } else {
                  const pseudoSeat: Seat = {
                    id: `zone-standing-${selectedZoneModal.id}-${Date.now()}`,
                    number: 1,
                    row: `${selectedZoneModal.name} (x${zoneTicketQuantity})`,
                    x: selectedZoneModal.x || 0,
                    y: selectedZoneModal.y || 0,
                    status: 'available',
                    zoneId: selectedZoneModal.id,
                    tierId: selectedZoneModal.tierId,
                  };
                  setAttendeeCart((prev) => [...prev, pseudoSeat]);
                  showToast('success', `${t('Đã thêm')} ${zoneTicketQuantity} ${t('vé tự do khu vực')} ${selectedZoneModal.name} ${t('vào giỏ!')}`);
                }
                setSelectedZoneModal(null);
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
            >
              {t("Thêm vào giỏ hàng mô phỏng")}
            </button>
          </div>
        </div>
      )}

      {/* Tier Manager Modal */}
      <TierManagerModal
        isOpen={isTierModalOpen}
        onClose={() => setIsTierModalOpen(false)}
        tiers={effectiveTiers}
        onSaveTiers={async (newTiers) => {
          try {
            const requests = newTiers.map((t) => ({
              id: t.id.startsWith("tier_") ? undefined : t.id,
              eventId: activeEventId,
              name: t.name,
              price: t.price,
              isFree: t.isFree ?? t.price === 0,
              totalQuantity: t.totalQuantity ?? 100,
              minPerOrder: t.minPerOrder ?? 1,
              maxPerOrder: t.maxPerOrder ?? 5,
              description: t.description,
            }));
            const responseTiers = await ticketApi.syncTicketTypesForEvent(activeEventId, requests);
            if (responseTiers && responseTiers.length > 0) {
              const colors = ['#f59e0b', '#9333ea', '#2563eb', '#10b981', '#f97316', '#ec4899', '#475569', '#06b6d4'];
              const mapped: SeatTier[] = responseTiers.map((t: any, idx: number) => ({
                id: t.id || `tier_${Date.now()}_${idx}`,
                name: t.name || t("Vé Thường"),
                price: t.price || 0,
                color: t.color || colors[idx % colors.length],
                isFree: t.isFree ?? t.price === 0,
                totalQuantity: t.totalQuantity ?? 100,
                minPerOrder: t.minPerOrder ?? 1,
                maxPerOrder: t.maxPerOrder ?? 5,
                description: t.description || "",
              }));
              setBackendTiers(mapped);
              showToast("success", t("Đã lưu và đồng bộ danh sách Hạng vé xuống CSDL!"));
            } else {
              setBackendTiers(newTiers);
              showToast("success", t("Đã cập nhật danh sách Hạng vé!"));
            }
          } catch (err) {
            console.error(t("Lỗi đồng bộ hạng vé:"), err);
            setBackendTiers(newTiers);
            showToast("error", t("Lỗi kết nối CSDL khi đồng bộ hạng vé!"));
          }
        }}
      />

      {/* Custom Confirmation Modal */}
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
};

export default EventSeatingAssigner;
