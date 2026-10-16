import React, { useEffect, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { venueApi } from "@/services/venueApi";
import { PATHS } from "@/routes/paths";
import {
  FiArrowLeft,
  FiSave,
  FiLayers,
  FiCheckCircle,
  FiDownload,
  FiTrash2,
  FiCamera,
  FiSend,
  FiCopy,
  FiX,
  FiCalendar,
  FiUser,
} from "react-icons/fi";
import type {
  CanvasSettings,
  HistoryState,
  Seat,
  SeatMapDocument,
  StageElement,
  StructureElement,
  ZoneBlock,
  AddArcConfig,
  AddMatrixConfig,
  AddRowConfig,
  AddZoneConfig,
} from "@/types/seating";
import type { VenueOrganizerSeatmap, VenueSeatmapsResponse } from "@/types/venue";
import { SeatCanvas } from "@/features/organizer/event-manage/components/seating/SeatCanvas";
import { ToolBar } from "@/features/organizer/event-manage/components/seating/ToolBar";
import { PropertyPanel } from "@/features/organizer/event-manage/components/seating/PropertyPanel";
import { SeatMapStats } from "@/features/organizer/event-manage/components/seating/SeatMapStats";
import { ToastContainer, type ToastMessage } from "@/features/organizer/event-manage/components/seating/SeatingToast";
import ConfirmModal from "@/components/common/ConfirmModal";
import {
  DEFAULT_CANVAS_SETTINGS,
  generateSeatMapSVG,
  isSeatInsideZone,
  safeClone,
} from "@/utils/seatMapHelpers";

const INITIAL_STAGES: StageElement[] = [];

const INITIAL_ZONES: Record<string, ZoneBlock> = {};

export const AdminVenueSeatmapDesigner: React.FC = () => {
  const { t } = useTranslation();
  const { venueId } = useParams<{ venueId: string }>();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get("newTemplate") === "1" || searchParams.get("isNew") === "1";
  const studioRef = useRef<HTMLDivElement>(null);

  // venue data
  const [venueInfo, setVenueInfo] = useState<VenueSeatmapsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState("Đang khởi tạo...");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPropertyPanelCollapsed, setIsPropertyPanelCollapsed] = useState(false);

  // organizer maps modal
  const [showOrgMapsModal, setShowOrgMapsModal] = useState(false);

  // toast
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (type: ToastMessage["type"], text: string) => {
    setToasts((prev) => [...prev, { id: Date.now().toString(), text, type }]);
  };
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // studio elements state
  const [stages, setStages] = useState<StageElement[]>(INITIAL_STAGES);
  const [structures, setStructures] = useState<StructureElement[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [zones, setZones] = useState<Record<string, ZoneBlock>>(INITIAL_ZONES);
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>(DEFAULT_CANVAS_SETTINGS);
  const [lastClickedPos, setLastClickedPos] = useState<{ x: number; y: number } | null>(null);

  // selection state
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // history state
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isHistoryActionRef = useRef(false);

  // confirm modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // fullscreen sync
  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      studioRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const hasInitialLoadedRef = useRef(false);

  // load venue template from backend
  useEffect(() => {
    if (!venueId) return;
    setLoading(true);

    if (isNew) {
      localStorage.removeItem(`admin_venue_seatmap_draft_${venueId}`);
      setStages([]);
      setStructures([]);
      setSeats([]);
      setZones({});
      setAutoSaveStatus("Sơ đồ mới trống");
      setLoading(false);
      try {
        window.history.replaceState({}, '', window.location.pathname);
      } catch {}
      venueApi.getVenueSeatmaps(venueId).then((res) => { if (res) setVenueInfo(res); }).catch(() => {});
      return;
    }

    venueApi
      .getVenueSeatmaps(venueId)
      .then((res) => {
        if (!res) return;
        setVenueInfo(res);

        // check if there is an admin template
        if (res.adminTemplate) {
          try {
            const parsed = JSON.parse(res.adminTemplate);
            setStages(parsed.stages || []);
            setStructures(parsed.structures || []);
            setSeats(parsed.seats || []);
            setZones(parsed.zones || {});
            if (parsed.canvasSettings) setCanvasSettings(parsed.canvasSettings);
            setAutoSaveStatus("Đã tải Sơ đồ mẫu chính thức");
            if (!hasInitialLoadedRef.current) {
              hasInitialLoadedRef.current = true;
              showToast("success", "Đã tải Sơ đồ mẫu chính thức của Địa điểm thành công!");
            }
            return;
          } catch (e) {
            console.warn("Failed to parse adminTemplate", e);
          }
        }

        // check local draft
        const localDraft = localStorage.getItem(`admin_venue_seatmap_draft_${venueId}`);
        if (localDraft) {
          try {
            const parsed = JSON.parse(localDraft);
            setStages(parsed.stages || []);
            setStructures(parsed.structures || []);
            setSeats(parsed.seats || []);
            setZones(parsed.zones || {});
            if (parsed.canvasSettings) setCanvasSettings(parsed.canvasSettings);
            setAutoSaveStatus("Đã khôi phục bản nháp");
            if (!hasInitialLoadedRef.current) {
              hasInitialLoadedRef.current = true;
              showToast("info", "Đã khôi phục bản nháp chưa lưu từ trình duyệt");
            }
            return;
          } catch {
            // fallback
          }
        }

        // check local templates
        try {
          const localTemplatesStr = localStorage.getItem(`admin_venue_templates_${venueId}`);
          if (localTemplatesStr) {
            const tpls = JSON.parse(localTemplatesStr);
            const activeTpl = tpls.find((t: any) => t.isPublished) || tpls[0];
            if (activeTpl?.data) {
              setStages(activeTpl.data.stages || []);
              setStructures(activeTpl.data.structures || []);
              setSeats(activeTpl.data.seats || []);
              setZones(activeTpl.data.zones || {});
              if (activeTpl.data.canvasSettings) setCanvasSettings(activeTpl.data.canvasSettings);
              setAutoSaveStatus("Đã tải Sơ đồ mẫu");
              return;
            }
          }
        } catch {}

        hasInitialLoadedRef.current = true;
        setStages([]);
        setStructures([]);
        setSeats([]);
        setZones({});
        setAutoSaveStatus("Sẵn sàng thiết kế");
      })
      .catch((err) => {
        console.error("Failed to load venue seatmaps:", err);
        showToast("error", "Không thể kết nối đến máy chủ lấy thông tin địa điểm");
      })
      .finally(() => setLoading(false));
  }, [venueId, isNew]);

  // commit history snapshot
  const commitHistory = (nextState?: HistoryState) => {
    if (isHistoryActionRef.current) return;
    const currentState: HistoryState = nextState || {
      seats: safeClone(seats),
      stages: safeClone(stages),
      structures: safeClone(structures),
      zones: safeClone(zones),
    };
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), currentState]);
    setHistoryIndex((prev) => prev + 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      isHistoryActionRef.current = true;
      const targetState = history[historyIndex - 1];
      setSeats(safeClone(targetState.seats));
      setStages(safeClone(targetState.stages));
      setStructures(safeClone(targetState.structures));
      setZones(safeClone(targetState.zones));
      setHistoryIndex((prev) => prev - 1);
      setTimeout(() => {
        isHistoryActionRef.current = false;
      }, 50);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isHistoryActionRef.current = true;
      const targetState = history[historyIndex + 1];
      setSeats(safeClone(targetState.seats));
      setStages(safeClone(targetState.stages));
      setStructures(safeClone(targetState.structures));
      setZones(safeClone(targetState.zones));
      setHistoryIndex((prev) => prev + 1);
      setTimeout(() => {
        isHistoryActionRef.current = false;
      }, 50);
    }
  };

  // auto-save draft locally
  useEffect(() => {
    if (!venueId || loading) return;
    const payload: SeatMapDocument = {
      version: "2.0",
      timestamp: new Date().toISOString(),
      name: venueInfo?.venueName || "Sơ đồ mẫu địa điểm",
      stages,
      structures,
      seats,
      zones,
      ticketTiers: [],
      canvasSettings,
    };
    localStorage.setItem(`admin_venue_seatmap_draft_${venueId}`, JSON.stringify(payload));
  }, [stages, structures, seats, zones, canvasSettings, venueId, loading, venueInfo?.venueName]);

  // save local draft
  const handleSaveDraft = () => {
    if (!venueId) return;
    const payload: SeatMapDocument = {
      version: "2.0",
      timestamp: new Date().toISOString(),
      name: venueInfo?.venueName || "Sơ đồ mẫu địa điểm",
      stages,
      structures,
      seats,
      zones,
      ticketTiers: [],
      canvasSettings,
    };
    localStorage.setItem(`admin_venue_seatmap_draft_${venueId}`, JSON.stringify(payload));
    setAutoSaveStatus("Đã lưu bản nháp vào trình duyệt!");
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    showToast("info", "Đã lưu bản nháp sơ đồ mẫu thành công!");
  };

  // save official template to backend
  const handleSaveOfficialTemplate = async () => {
    if (!venueId) return;
    setIsSaving(true);
    try {
      const templateName = venueInfo?.venueName ? `Sơ đồ chuẩn - ${venueInfo.venueName}` : "Sơ đồ mẫu Admin";
      const payload: SeatMapDocument = {
        version: "2.0",
        timestamp: new Date().toISOString(),
        name: templateName,
        stages,
        structures,
        seats,
        zones,
        ticketTiers: [],
        canvasSettings,
      };

      const payloadStr = JSON.stringify(payload);

      // immediately persist draft
      localStorage.setItem(`admin_venue_seatmap_draft_${venueId}`, payloadStr);

      // also persist to admin_venue_templates_${venueId} for instant multi-template visibility
      const localKey = `admin_venue_templates_${venueId}`;
      let localList: any[] = [];
      try {
        const saved = localStorage.getItem(localKey);
        if (saved) localList = JSON.parse(saved);
      } catch {}

      const zoneList: ZoneBlock[] = zones
        ? Array.isArray(zones)
          ? (zones as ZoneBlock[])
          : Object.values(zones)
        : [];
      const totalSeatsCount = seats.length;
      const standingCap = zoneList
        .filter((z) => !seats.some((s) => s.zoneId === z.id))
        .reduce((acc: number, z: ZoneBlock): number => acc + (z.tierId ? (Number(z?.capacity) || 0) : 0), 0);
      const capacity = totalSeatsCount + standingCap || totalSeatsCount || 0;

      const newTemplateItem = {
        id: `official_tpl_${venueId}`,
        name: templateName,
        isPublished: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: payload,
        capacity,
        totalSeats: seats.length,
        totalZones: zoneList.length,
      };

      const updatedList = [
        newTemplateItem,
        ...localList.filter((t: any) => t.id !== newTemplateItem.id).map((t: any) => ({ ...t, isPublished: false })),
      ];
      localStorage.setItem(localKey, JSON.stringify(updatedList));

      // remove isNew from URL so reloading loads saved state
      try {
        window.history.replaceState({}, '', window.location.pathname);
      } catch {}

      // save to backend API
      try {
        await venueApi.saveVenueSeatmapTemplate(venueId, payloadStr);
      } catch (backendErr) {
        console.warn("Backend save failed or unavailable, template saved locally:", backendErr);
      }

      setAutoSaveStatus(`Đã lưu mẫu lúc ${new Date().toLocaleTimeString("vi-VN")}`);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      showToast("success", "ĐÃ LƯU VÀ XUẤT BẢN SƠ ĐỒ MẪU THÀNH CÔNG!");
    } catch (error) {
      console.error("Failed to save admin template:", error);
      showToast("error", "Lưu sơ đồ mẫu thất bại. Vui lòng thử lại!");
    } finally {
      setIsSaving(false);
    }
  };

  // export seatMap png image
  const handleExportImage = () => {
    const payload: SeatMapDocument = {
      version: "2.0",
      timestamp: new Date().toISOString(),
      name: venueInfo?.venueName || "Venue_Seatmap",
      canvasSettings,
      zones,
      stages,
      structures,
      seats,
      ticketTiers: [],
    };
    const svgString = generateSeatMapSVG(payload);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const w = canvasSettings?.width || 1500;
      const h = canvasSettings?.height || 1050;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `Sơ_đồ_mẫu_${(venueInfo?.venueName || "DiaDiem").replace(/\s+/g, "_")}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    };
    img.src = url;
  };

  // clear canvas
  const handleClearCanvas = () => {
    setConfirmModal({
      isOpen: true,
      title: "Xác nhận xóa trắng Studio",
      message: "Hành động này sẽ xóa toàn bộ sân khấu, phân khu và ghế trên sơ đồ mẫu hiện tại. Tiếp tục?",
      onConfirm: () => {
        setSeats([]);
        setStages([]);
        setStructures([]);
        setZones({});
        setSelectedSeatIds([]);
        setSelectedStageId(null);
        setSelectedStructureId(null);
        setSelectedZoneId(null);
        commitHistory({ seats: [], stages: [], structures: [], zones: {} });
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast("info", "Đã xóa toàn bộ nội dung Canvas");
      },
    });
  };

  // apply an organizer's seatmap as the template
  const handleApplyOrganizerMap = (orgMap: VenueOrganizerSeatmap) => {
    setConfirmModal({
      isOpen: true,
      title: "Áp dụng sơ đồ của Ban Tổ Chức",
      message: `Bạn có chắc muốn sao chép toàn bộ phân khu và sơ đồ ghế từ sự kiện "${orgMap.eventTitle}" làm Sơ đồ mẫu cho địa điểm này?`,
      onConfirm: () => {
        try {
          if (!orgMap.draftJson) {
            showToast("warning", "Sơ đồ này chưa có dữ liệu chi tiết");
            return;
          }
          const parsed = JSON.parse(orgMap.draftJson);
          const nextStages = parsed.stages || INITIAL_STAGES;
          const nextStructures = parsed.structures || [];
          const nextSeats = parsed.seats || [];
          const nextZones = parsed.zones || INITIAL_ZONES;

          setStages(nextStages);
          setStructures(nextStructures);
          setSeats(nextSeats);
          setZones(nextZones);
          if (parsed.canvasSettings) setCanvasSettings(parsed.canvasSettings);

          commitHistory({
            seats: nextSeats,
            stages: nextStages,
            structures: nextStructures,
            zones: nextZones,
          });

          setShowOrgMapsModal(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          showToast("success", `Đã áp dụng sơ đồ từ sự kiện "${orgMap.eventTitle}"!`);
        } catch (e) {
          console.error("Failed to parse organizer seatmap data", e);
          showToast("error", "Không thể giải mã dữ liệu sơ đồ của Ban Tổ Chức");
        }
      },
    });
  };

  // toolbar & creation actions
  const handleAddStage = (kindOrLabel: any, labelVal?: string) => {
    let label = "SÂN KHẤU CHÍNH (MAIN STAGE)";
    if (typeof kindOrLabel === "string") {
      label = labelVal || kindOrLabel;
    }
    const width = Math.min(620, canvasSettings.width - 200);
    const height = 100;
    const newStage: StageElement = {
      id: `stage_${Date.now()}`,
      type: "stage",
      label,
      x: lastClickedPos ? Math.round(lastClickedPos.x - width / 2) : Math.round((canvasSettings.width - width) / 2),
      y: lastClickedPos ? Math.round(lastClickedPos.y - height / 2) : 70,
      width,
      height,
      color: "#1e293b",
      rotation: 0,
    };
    const nextStages = [...stages, newStage];
    setStages(nextStages);
    setSelectedStageId(newStage.id);
    commitHistory({ seats, stages: nextStages, structures, zones });
    showToast("info", "Đã thêm sân khấu mới");
  };

  const handleAddZoneBlock = (
    configOrName: AddZoneConfig | string,
    priceVal?: number,
    colorVal?: string,
    widthVal?: number,
    heightVal?: number,
    borderStyleVal?: "dashed" | "solid",
    rowsVal?: number,
    colsVal?: number
  ) => {
    const id = `zone_${Date.now()}`;
    const index = Object.keys(zones).length;
    let name = `Khu Vực ${index + 1}`;
    let tierId: string | undefined = undefined;
    let price: number | undefined = priceVal;
    let color = colorVal || ["#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"][index % 5];
    let width = widthVal || 520;
    let height = heightVal || 220;
    let borderStyle: "dashed" | "solid" = borderStyleVal || "dashed";
    let shape: any = undefined;
    let type: any = undefined;
    let layoutType: string = "STANDING";
    let rowPrefix = "A";
    let rowCount = rowsVal ?? 0;
    let seatsPerRow = colsVal ?? 0;
    let arcCount = 0;
    let arcRadius = 240;
    let tableCount = 0;
    let seatsPerTable = 8;
    let capacityVal: number | undefined = undefined;

    if (typeof configOrName === "object" && configOrName !== null) {
      name = configOrName.name || name;
      tierId = configOrName.tierId;
      price = configOrName.price;
      color = configOrName.color || color;
      width = configOrName.width || width;
      height = configOrName.height || height;
      borderStyle = configOrName.borderStyle || borderStyle;
      shape = configOrName.shape;
      type = configOrName.type;
      layoutType = configOrName.layoutType || (rowCount > 0 && seatsPerRow > 0 ? "MATRIX" : "STANDING");
      rowPrefix = configOrName.rowPrefix || "A";
      rowCount = configOrName.rowCount || rowCount;
      seatsPerRow = configOrName.seatsPerRow || seatsPerRow;
      arcCount = configOrName.arcCount || 0;
      arcRadius = configOrName.arcRadius || 240;
      tableCount = configOrName.tableCount || 0;
      seatsPerTable = configOrName.seatsPerTable || 8;
      capacityVal = configOrName.capacity;
    } else if (typeof configOrName === "string") {
      name = configOrName || name;
      if (rowCount > 0 && seatsPerRow > 0) layoutType = "MATRIX";
    }

    const zoneX = lastClickedPos ? lastClickedPos.x : 120 + (index % 5) * 28;
    const zoneY = lastClickedPos ? lastClickedPos.y : 220 + (index % 5) * 28;

    const newZone: ZoneBlock = {
      id,
      name,
      tierId,
      price: price ?? 0,
      color,
      fillColor: color,
      strokeColor: color,
      shape,
      type,
      borderStyle,
      fillOpacity: 0.15,
      x: zoneX,
      y: zoneY,
      width,
      height,
      rotation: 0,
      capacity: capacityVal || (rowCount > 0 && seatsPerRow > 0 ? rowCount * seatsPerRow : (layoutType === "STANDING" ? 100 : undefined)),
    };

    const baseId = Date.now();
    const generatedSeats: Seat[] = [];

    if (layoutType === "ROW" && seatsPerRow > 0) {
      const spacingX = 38;
      const totalW = seatsPerRow * spacingX;
      const startX = Math.round(zoneX + (width - totalW) / 2 + spacingX / 2);
      const startY = Math.round(zoneY + height / 2);

      for (let c = 0; c < seatsPerRow; c++) {
        generatedSeats.push({
          id: `seat_${baseId}_${c}`,
          row: rowPrefix,
          number: c + 1,
          col: c + 1,
          x: startX + c * spacingX,
          y: startY,
          zoneId: id,
          status: "available",
          shape: "rounded",
          rotation: 0,
        });
      }
    } else if (layoutType === "MATRIX" && rowCount > 0 && seatsPerRow > 0) {
      const spacingX = 38;
      const spacingY = 38;
      const totalW = seatsPerRow * spacingX;
      const startX = Math.round(zoneX + (width - totalW) / 2 + spacingX / 2);
      const startY = Math.round(zoneY + 45);
      const startChar = rowPrefix.charCodeAt(0);

      for (let r = 0; r < rowCount; r++) {
        const rowName = String.fromCharCode(startChar + r);
        for (let c = 0; c < seatsPerRow; c++) {
          generatedSeats.push({
            id: `seat_${baseId}_${r}_${c}`,
            row: rowName,
            number: c + 1,
            col: c + 1,
            x: startX + c * spacingX,
            y: startY + r * spacingY,
            zoneId: id,
            status: "available",
            shape: "rounded",
            rotation: 0,
          });
        }
      }
    } else if (layoutType === "ARC" && arcCount > 0) {
      const centerX = Math.round(zoneX + width / 2);
      const centerY = Math.round(zoneY + height - 35);
      const startAngle = -150;
      const endAngle = -30;
      const stepAngle = (endAngle - startAngle) / Math.max(1, arcCount - 1);

      for (let i = 0; i < arcCount; i++) {
        const currentAngleDeg = startAngle + i * stepAngle;
        const angleRad = (currentAngleDeg * Math.PI) / 180;
        const x = Math.round(centerX + arcRadius * Math.cos(angleRad));
        const y = Math.round(centerY + arcRadius * Math.sin(angleRad));
        const rot = Math.round(currentAngleDeg + 90);

        generatedSeats.push({
          id: `seat_${baseId}_arc_${i}`,
          row: rowPrefix,
          number: i + 1,
          x,
          y,
          zoneId: id,
          status: "available",
          shape: "rounded",
          rotation: rot,
        });
      }
    } else if (layoutType === "GALA" && tableCount > 0 && seatsPerTable > 0) {
      const tableRadius = 55;
      for (let t = 0; t < tableCount; t++) {
        const tableCenterX = Math.round(zoneX + (width / (tableCount + 1)) * (t + 1));
        const tableCenterY = Math.round(zoneY + height / 2 + 10);

        for (let s = 0; s < seatsPerTable; s++) {
          const angleDeg = s * (360 / seatsPerTable);
          const angleRad = (angleDeg * Math.PI) / 180;
          const x = Math.round(tableCenterX + tableRadius * Math.cos(angleRad));
          const y = Math.round(tableCenterY + tableRadius * Math.sin(angleRad));

          generatedSeats.push({
            id: `seat_${baseId}_gala_${t}_${s}`,
            row: `B${t + 1}`,
            number: s + 1,
            x,
            y,
            zoneId: id,
            status: "available",
            shape: "circle",
            rotation: Math.round(angleDeg),
          });
        }
      }
    }

    const nextZones = { ...zones, [id]: newZone };
    const nextSeats = generatedSeats.length > 0 ? [...seats, ...generatedSeats] : seats;
    setZones(nextZones);
    setSeats(nextSeats);
    setSelectedZoneId(id);
    if (generatedSeats.length > 0) {
      setSelectedSeatIds(generatedSeats.map((s) => s.id));
    }
    commitHistory({ seats: nextSeats, stages, structures, zones: nextZones });
    showToast("info", `Đã thêm phân khu ${newZone.name}${generatedSeats.length > 0 ? ` (${generatedSeats.length} ghế)` : ""}`);
  };

  const handleAddMatrix = (
    configOrRows: AddMatrixConfig | number,
    colsVal?: number,
    startRowLetterVal?: string,
    zoneIdVal?: string
  ) => {
    let rowCount = 4;
    let cols = 10;
    let startRowLetter = "A";
    let zoneId = "";
    let spacingX = 48;
    let spacingY = 48;
    let aisleAfter = 0;
    let aisleGap = 0;

    if (typeof configOrRows === "object" && configOrRows !== null) {
      rowCount = configOrRows.rows || 4;
      cols = configOrRows.cols || 10;
      startRowLetter = configOrRows.startRowLetter || "A";
      zoneId = configOrRows.zoneId || "";
      spacingX = configOrRows.spacingX || 48;
      spacingY = configOrRows.spacingY || 48;
      aisleAfter = configOrRows.aisleAfter || 0;
      aisleGap = configOrRows.aisleGap || 0;
    } else {
      rowCount = typeof configOrRows === "number" ? configOrRows : 4;
      cols = colsVal || 10;
      startRowLetter = startRowLetterVal || "A";
      zoneId = zoneIdVal || "";
    }

    const targetZoneId = zoneId && zones[zoneId] ? zoneId : Object.keys(zones)[0];
    if (!targetZoneId || !zones[targetZoneId]) {
      showToast("warning", "Hãy tạo/chọn phân khu trước khi tạo ghế.");
      return;
    }

    const zone = zones[targetZoneId];
    const startX = lastClickedPos ? lastClickedPos.x : (zone.x || 100) + 34;
    const startY = lastClickedPos ? lastClickedPos.y : (zone.y || 180) + 68;
    const startChar = (startRowLetter || "A").charCodeAt(0);
    const baseId = Date.now();
    const newSeats: Seat[] = [];

    for (let r = 0; r < rowCount; r++) {
      const rowName = String.fromCharCode(startChar + r);
      for (let c = 0; c < cols; c++) {
        const aisleOffset = aisleAfter > 0 && c >= aisleAfter ? aisleGap : 0;
        newSeats.push({
          id: `seat_${baseId}_${r}_${c}`,
          row: rowName,
          number: c + 1,
          col: c + 1,
          x: startX + c * spacingX + aisleOffset,
          y: startY + r * spacingY,
          zoneId: targetZoneId,
          status: "available",
          shape: "rounded",
          rotation: 0,
        });
      }
    }

    const nextSeats = [...seats, ...newSeats];
    setSeats(nextSeats);
    setSelectedSeatIds(newSeats.map((s) => s.id));
    commitHistory({ seats: nextSeats, stages, structures, zones });
    showToast("info", `Đã thêm ma trận ${newSeats.length} ghế`);
  };

  const handleAddRow = (
    configOrLetter: AddRowConfig | string,
    countVal?: number,
    zoneIdVal?: string
  ) => {
    let rowLetter = "A";
    let count = 12;
    let zoneId = "";
    let spacing = 48;

    if (typeof configOrLetter === "object" && configOrLetter !== null) {
      rowLetter = configOrLetter.rowLetter || "A";
      count = configOrLetter.count || 12;
      zoneId = configOrLetter.zoneId || "";
      spacing = configOrLetter.spacing || 48;
    } else {
      rowLetter = (configOrLetter as string) || "A";
      count = countVal || 12;
      zoneId = zoneIdVal || "";
    }

    const targetZoneId = zoneId && zones[zoneId] ? zoneId : Object.keys(zones)[0];
    if (!targetZoneId || !zones[targetZoneId]) {
      showToast("warning", "Hãy tạo/chọn phân khu trước khi tạo hàng ghế.");
      return;
    }

    const zone = zones[targetZoneId];
    const startX = lastClickedPos ? lastClickedPos.x : (zone.x || 120) + 32;
    const startY = lastClickedPos ? lastClickedPos.y : (zone.y || 180) + 70;
    const baseId = Date.now();
    const newSeats: Seat[] = Array.from({ length: count }, (_, index): Seat => ({
      id: `seat_${baseId}_${index}`,
      row: rowLetter,
      number: index + 1,
      col: index + 1,
      x: startX + index * spacing,
      y: startY,
      zoneId: targetZoneId,
      status: "available",
      rotation: 0,
      shape: "rounded",
    }));

    const nextSeats = [...seats, ...newSeats];
    setSeats(nextSeats);
    setSelectedSeatIds(newSeats.map((s) => s.id));
    commitHistory({ seats: nextSeats, stages, structures, zones });
    showToast("info", `Đã thêm hàng ghế ${rowLetter} (${count} ghế)`);
  };

  const handleAddArc = (
    configOrLetter: AddArcConfig | string,
    countVal?: number,
    radiusVal?: number,
    zoneIdVal?: string
  ) => {
    let rowLetter = "A";
    let count = 16;
    let radius = 280;
    let zoneId = "";
    let spanDegrees = 140;

    if (typeof configOrLetter === "object" && configOrLetter !== null) {
      rowLetter = configOrLetter.rowLetter || "A";
      count = configOrLetter.count || 16;
      radius = configOrLetter.radius || 280;
      zoneId = configOrLetter.zoneId || "";
      spanDegrees = configOrLetter.spanDegrees || 140;
    } else {
      rowLetter = (configOrLetter as string) || "A";
      count = countVal || 16;
      radius = radiusVal || 280;
      zoneId = zoneIdVal || "";
    }

    const targetZoneId = zoneId && zones[zoneId] ? zoneId : Object.keys(zones)[0];
    if (!targetZoneId || !zones[targetZoneId]) {
      showToast("warning", "Hãy tạo/chọn phân khu trước khi tạo hàng ghế cánh cung.");
      return;
    }

    const zone = zones[targetZoneId];
    const centerX = lastClickedPos ? lastClickedPos.x : (zone.x || 0) + (zone.width || 600) / 2;
    const centerY = lastClickedPos ? lastClickedPos.y : (zone.y || 0) + 20;
    const startAngle = ((90 - spanDegrees / 2) * Math.PI) / 180;
    const endAngle = ((90 + spanDegrees / 2) * Math.PI) / 180;
    const step = count > 1 ? (endAngle - startAngle) / (count - 1) : 0;
    const baseId = Date.now();
    const newSeats: Seat[] = [];

    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * step;
      newSeats.push({
        id: `seat_${baseId}_arc_${i}`,
        row: rowLetter,
        number: i + 1,
        col: i + 1,
        x: Math.round(centerX + Math.cos(angle) * radius),
        y: Math.round(centerY + Math.sin(angle) * radius),
        rotation: Math.round(((angle - Math.PI / 2) * 180) / Math.PI),
        zoneId: targetZoneId,
        status: "available",
        shape: "rounded",
      });
    }

    const nextSeats = [...seats, ...newSeats];
    setSeats(nextSeats);
    setSelectedSeatIds(newSeats.map((s) => s.id));
    commitHistory({ seats: nextSeats, stages, structures, zones });
    showToast("info", `Đã tạo hàng ghế cánh cung (${count} ghế)`);
  };

  const handleAddTable = (zoneIdVal?: string, seatsPerTableVal?: number, radiusVal?: number) => {
    const targetZoneId = zoneIdVal && zones[zoneIdVal] ? zoneIdVal : Object.keys(zones)[0];
    if (!targetZoneId || !zones[targetZoneId]) {
      showToast("warning", "Hãy tạo/chọn phân khu trước khi tạo bàn.");
      return;
    }

    const seatsPerTable = seatsPerTableVal || 8;
    const radius = radiusVal || 50;
    const zone = zones[targetZoneId];
    const existingTables = new Set(seats.filter((seat) => seat.row.startsWith("Bàn ")).map((seat) => seat.row));
    const tableNumber = existingTables.size + 1;
    const centerX = lastClickedPos ? lastClickedPos.x : (zone.x || 0) + (zone.width || 500) / 2;
    const centerY = lastClickedPos ? lastClickedPos.y : (zone.y || 0) + (zone.height || 300) / 2;
    const baseId = Date.now();
    const newSeats: Seat[] = [];

    for (let i = 0; i < seatsPerTable; i++) {
      const angle = (i * 2 * Math.PI) / seatsPerTable;
      newSeats.push({
        id: `seat_${baseId}_table_${i}`,
        row: `Bàn ${tableNumber}`,
        number: i + 1,
        col: i + 1,
        x: Math.round(centerX + Math.cos(angle) * radius),
        y: Math.round(centerY + Math.sin(angle) * radius),
        rotation: Math.round((angle * 180) / Math.PI + 90),
        zoneId: targetZoneId,
        status: "available",
        shape: "circle",
      });
    }

    const nextSeats = [...seats, ...newSeats];
    setSeats(nextSeats);
    setSelectedSeatIds(newSeats.map((s) => s.id));
    commitHistory({ seats: nextSeats, stages, structures, zones });
    showToast("info", `Đã thêm bàn tròn (${seatsPerTable} ghế)`);
  };

  const handleAddStructure = (type: any, label?: string) => {
    const colorMap: Record<string, string> = {
      exit: "#dc2626",
      gate: "#059669",
      control_booth: "#475569",
      wc_food: "#0891b2",
      structure: "#64748b",
    };
    const newStructure: StructureElement = {
      id: `structure_${Date.now()}`,
      type,
      label: label || "CẤU TRÚC PHỤ",
      x: lastClickedPos ? Math.round(lastClickedPos.x - 75) : 70,
      y: lastClickedPos ? Math.round(lastClickedPos.y - 22) : 80 + structures.length * 55,
      width: type === "control_booth" ? 220 : 150,
      height: 44,
      color: colorMap[type] || "#64748b",
      rotation: 0,
      shape: "rounded",
    };
    const nextStructures = [...structures, newStructure];
    setStructures(nextStructures);
    setSelectedStructureId(newStructure.id);
    commitHistory({ seats, stages, structures: nextStructures, zones });
    showToast("info", `Đã thêm cấu trúc ${label || ""}`);
  };

  const handleResizeCanvas = (width: number, height: number, gridSize?: number) => {
    const nextSettings = { ...canvasSettings, width, height, gridSize: gridSize || canvasSettings.gridSize };
    setCanvasSettings(nextSettings);
  };

  const handleSelectAll = () => {
    setSelectedSeatIds(seats.filter((s) => !s.hidden).map((s) => s.id));
    setSelectedStageId(null);
    setSelectedStructureId(null);
    setSelectedZoneId(null);
  };

  const handleDuplicateSelected = () => {
    if (!selectedSeatIds.length) return;
    const baseId = Date.now();
    const duplicated = seats
      .filter((seat) => selectedSeatIds.includes(seat.id))
      .map((seat, index) => ({
        ...seat,
        id: `seat_dup_${baseId}_${index}`,
        x: seat.x + 32,
        y: seat.y + 32,
      }));
    const nextSeats = [...seats, ...duplicated];
    setSeats(nextSeats);
    setSelectedSeatIds(duplicated.map((s) => s.id));
    commitHistory({ seats: nextSeats, stages, structures, zones });
  };

  const handleDeleteSelected = () => {
    let hasChanges = false;
    let nextSeats = seats;
    let nextStages = stages;
    let nextStructures = structures;
    let nextZones = { ...zones };

    if (selectedSeatIds.length > 0) {
      nextSeats = seats.filter((s) => !selectedSeatIds.includes(s.id));
      setSelectedSeatIds([]);
      hasChanges = true;
    } else if (selectedStageId) {
      nextStages = stages.filter((st) => st.id !== selectedStageId);
      setSelectedStageId(null);
      hasChanges = true;
    } else if (selectedStructureId) {
      nextStructures = structures.filter((st) => st.id !== selectedStructureId);
      setSelectedStructureId(null);
      hasChanges = true;
    } else if (selectedZoneId) {
      delete nextZones[selectedZoneId];
      setSelectedZoneId(null);
      hasChanges = true;
    }

    if (hasChanges) {
      setSeats(nextSeats);
      setStages(nextStages);
      setStructures(nextStructures);
      setZones(nextZones);
      commitHistory({ seats: nextSeats, stages: nextStages, structures: nextStructures, zones: nextZones });
      showToast("info", "Đã xóa đối tượng được chọn");
    }
  };

  // property inspector handlers
  const handleUpdateSeatProps = (props: Partial<Seat>) => {
    const nextSeats = seats.map((seat) =>
      selectedSeatIds.includes(seat.id) ? { ...seat, ...props } : seat
    );
    setSeats(nextSeats);
    commitHistory({ seats: nextSeats, stages, structures, zones });
  };

  const handleUpdateStageProps = (stageId: string, props: Partial<StageElement>) => {
    const nextStages = stages.map((st) => (st.id === stageId ? { ...st, ...props } : st));
    setStages(nextStages);
    commitHistory({ seats, stages: nextStages, structures, zones });
  };

  const handleUpdateStructureProps = (structId: string, props: Partial<StructureElement>) => {
    const nextStructures = structures.map((st) => (st.id === structId ? { ...st, ...props } : st));
    setStructures(nextStructures);
    commitHistory({ seats, stages, structures: nextStructures, zones });
  };

  const handleUpdateZoneProps = (zoneId: string, props: Partial<ZoneBlock>) => {
    const currentZone = zones[zoneId];
    if (!currentZone) return;
    const nextZone = { ...currentZone, ...props };
    let nextSeats = seats;

    if (props.rotation !== undefined && props.rotation !== (currentZone.rotation || 0)) {
      const oldRot = currentZone.rotation || 0;
      const deltaDeg = props.rotation - oldRot;
      const cx = (currentZone.x || 0) + (currentZone.width || 800) / 2;
      const cy = (currentZone.y || 0) + (currentZone.height || 180) / 2;
      const rad = (deltaDeg * Math.PI) / 180;
      const cosVal = Math.cos(rad);
      const sinVal = Math.sin(rad);

      nextSeats = nextSeats.map((s) => {
        if (s.zoneId === zoneId || isSeatInsideZone(s, currentZone)) {
          const dx = s.x - cx;
          const dy = s.y - cy;
          return {
            ...s,
            x: Math.round(cx + dx * cosVal - dy * sinVal),
            y: Math.round(cy + dx * sinVal + dy * cosVal),
            rotation: Math.round((((s.rotation || 0) + deltaDeg) % 360 + 360) % 360),
            zoneId,
          };
        }
        return s;
      });
    }

    const nextZones = { ...zones, [zoneId]: nextZone };
    setZones(nextZones);
    setSeats(nextSeats);
    commitHistory({ seats: nextSeats, stages, structures, zones: nextZones });
  };

  const handleMoveSeatsToZone = (zoneId: string) => {
    if (!zones[zoneId]) return;
    const nextSeats = seats.map((seat) => (selectedSeatIds.includes(seat.id) ? { ...seat, zoneId } : seat));
    setSeats(nextSeats);
    commitHistory({ seats: nextSeats, stages, structures, zones });
  };

  const handleArrangeSeats = (action: string) => {
    if (!selectedSeatIds.length) return;
    const selected = seats.filter((s) => selectedSeatIds.includes(s.id));
    if (action === "align-top") {
      const minY = Math.min(...selected.map((s) => s.y));
      const nextSeats = seats.map((s) => (selectedSeatIds.includes(s.id) ? { ...s, y: minY } : s));
      setSeats(nextSeats);
      commitHistory({ seats: nextSeats, stages, structures, zones });
    } else if (action === "align-left") {
      const minX = Math.min(...selected.map((s) => s.x));
      const nextSeats = seats.map((s) => (selectedSeatIds.includes(s.id) ? { ...s, x: minX } : s));
      setSeats(nextSeats);
      commitHistory({ seats: nextSeats, stages, structures, zones });
    }
  };

  return (
    <div className="min-h-screen app-bg-page p-4 md:p-6 text-[var(--text-main)] transition-colors duration-300">
      <div ref={studioRef} className={`seat-studio-root ${isFullscreen ? "is-fullscreen" : ""}`}>
        <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Header matching EventSeatingMap */}
      <div className="seat-studio-header">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="seat-studio-badge">HALOTICKET</span>
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.16em]">
              {t("SƠ ĐỒ MẪU ĐỊA ĐIỂM (ADMIN TEMPLATE)")}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold">
              {t(autoSaveStatus)}
            </span>
          </div>
          <h2 className="text-base font-black app-text-main truncate mt-1">
            {venueInfo?.venueName || t("Địa điểm")}
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Link to={PATHS.ADMIN_VENUES_MANAGEMENT} className="seat-studio-secondary-button">
            <FiArrowLeft className="w-4 h-4" />
            <span>{t("Quay lại")}</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowOrgMapsModal(true)}
            className="seat-studio-secondary-button"
          >
            <FiLayers className="w-4 h-4" />
            <span>{t("Danh sách sơ đồ")}</span>
            <span className="seat-studio-badge ml-1">{venueInfo?.organizerSeatmaps?.length || 0}</span>
          </button>

          <button
            type="button"
            onClick={handleExportImage}
            className="seat-studio-secondary-button border-teal-500/30 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10"
            title={t("Xuất file ảnh PNG sơ đồ")}
          >
            <FiCamera className="w-4 h-4" />
            <span>{t("Xuất ảnh sơ đồ")}</span>
          </button>

          <button
            type="button"
            onClick={handleClearCanvas}
            className="seat-studio-icon-button text-rose-500"
            title={t("Xóa canvas")}
          >
            <FiTrash2 />
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="seat-studio-secondary-button border-amber-500/40 text-amber-500 hover:bg-amber-500/10 font-bold"
            title={t("Lưu tạm sơ đồ dưới dạng Bản nháp")}
          >
            <FiSave className="w-4 h-4" />
            <span>{isSaving ? t("Đang lưu...") : t("Lưu nháp")}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveOfficialTemplate}
            disabled={isSaving}
            className="seat-studio-primary-button bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md"
            title={t("Lưu mẫu chính thức cho Địa điểm này")}
          >
            <FiSend className="w-4 h-4" />
            <span>{isSaving ? t("Đang lưu...") : t("Lưu Sơ Đồ Mẫu")}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="seat-studio-save-toast">
          <FiCheckCircle className="w-4 h-4" />
          <span>{t("Đã lưu Seat Map thành công.")}</span>
        </div>
      )}

      {/* Stats bar above Canvas, compact without tiers */}
      <SeatMapStats seats={seats} zones={zones} stages={stages} structures={structures} compact />

      {/* Main Studio Body: Left Toolbar + Center Canvas + Right Property Inspector */}
      <div className={`flex flex-row gap-3 items-start w-full ${isFullscreen ? "flex-1 min-h-0" : ""}`}>
        {/* Left Toolbar */}
        <div className="w-12 flex-shrink-0 sticky top-4 z-20">
          <ToolBar
            zones={zones}
            selectedSeatIds={selectedSeatIds}
            canvasSettings={canvasSettings}
            onAddRow={handleAddRow}
            onAddMatrix={handleAddMatrix}
            onAddArc={handleAddArc}
            onAddTable={handleAddTable}
            onAddStage={handleAddStage}
            onAddStructure={handleAddStructure}
            onAddZoneBlock={handleAddZoneBlock}
            onResizeCanvas={handleResizeCanvas}
            onDeleteSelected={handleDeleteSelected}
            onDuplicateSelected={handleDuplicateSelected}
            onSelectAll={handleSelectAll}
          />
        </div>

        {/* Center Canvas */}
        <div className={`flex-1 min-w-0 ${isFullscreen ? "h-full flex flex-col" : ""}`}>
          <SeatCanvas
            seats={seats}
            stages={stages}
            structures={structures}
            zones={zones}
            canvasSettings={canvasSettings}
            selectedSeatIds={selectedSeatIds}
            setSelectedSeatIds={setSelectedSeatIds}
            selectedStageId={selectedStageId}
            setSelectedStageId={setSelectedStageId}
            selectedStructureId={selectedStructureId}
            setSelectedStructureId={setSelectedStructureId}
            selectedZoneId={selectedZoneId}
            setSelectedZoneId={setSelectedZoneId}
            onUpdateSeats={setSeats}
            onUpdateStages={setStages}
            onUpdateStructures={setStructures}
            onUpdateZones={setZones}
            onUpdateCanvasSettings={setCanvasSettings}
            onDeleteSelected={handleDeleteSelected}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            onCommitHistory={() => window.requestAnimationFrame(() => commitHistory())}
            isAttendeeMode={false}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            onCanvasClickPosition={setLastClickedPos}
          />
        </div>

        {/* Right Inspector Column */}
        <div
          className={`transition-all duration-200 flex-shrink-0 sticky top-4 z-20 ${
            isPropertyPanelCollapsed ? "w-12" : "w-full lg:w-80"
          }`}
        >
          <PropertyPanel
            isCollapsed={isPropertyPanelCollapsed}
            onToggleCollapse={() => setIsPropertyPanelCollapsed((prev) => !prev)}
            selectedSeatIds={selectedSeatIds}
            selectedStageId={selectedStageId}
            selectedStructureId={selectedStructureId}
            selectedZoneId={selectedZoneId}
            seats={seats}
            stages={stages}
            structures={structures}
            zones={zones}
            onUpdateSeatProps={handleUpdateSeatProps}
            onUpdateStageProps={handleUpdateStageProps}
            onUpdateStructureProps={handleUpdateStructureProps}
            onUpdateZoneProps={handleUpdateZoneProps}
            onMoveSeatsToZone={handleMoveSeatsToZone}
            onArrangeSeats={handleArrangeSeats}
            onDeleteSelected={handleDeleteSelected}
          />
        </div>
      </div>

      {/* Organizer SeatMaps Modal (Portaled to body, fully styled for dark & light mode) */}
      {showOrgMapsModal &&
        createPortal(
          <div className="fixed inset-0 min-h-screen w-screen z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-3xl rounded-2xl app-bg-card border app-border app-text-main shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-4 border-b app-border flex items-center justify-between app-bg-subnav">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center">
                    <FiLayers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm app-text-main">
                      {t("Danh sách sơ đồ ghế tại địa điểm:")} {venueInfo?.venueName}
                    </h3>
                    <p className="text-[11px] app-text-muted">
                      {t("Chọn sơ đồ của Ban Tổ Chức đã thiết kế hoặc khôi phục sơ đồ mẫu")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOrgMapsModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto space-y-3">
                {/* Admin official template card if present */}
                {venueInfo?.adminTemplate && (
                  <div className="p-4 rounded-xl border border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/20 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm app-text-main">{t("Sơ đồ mẫu chính thức của Địa điểm")}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold">
                          Admin Template
                        </span>
                      </div>
                      <p className="text-xs app-text-muted">
                        {t("Bản thiết kế mẫu chính thức đang được cung cấp cho các Ban Tổ Chức khi tạo sự kiện.")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const parsed = JSON.parse(venueInfo.adminTemplate!);
                          setStages(parsed.stages || INITIAL_STAGES);
                          setStructures(parsed.structures || []);
                          setSeats(parsed.seats || []);
                          setZones(parsed.zones || INITIAL_ZONES);
                          if (parsed.canvasSettings) setCanvasSettings(parsed.canvasSettings);
                          setShowOrgMapsModal(false);
                          showToast("success", t("Đã nạp lại Sơ đồ mẫu chính thức vào Studio"));
                        } catch {
                          showToast("error", t("Không thể nạp dữ liệu sơ đồ mẫu"));
                        }
                      }}
                      className="seat-studio-secondary-button border-blue-500/50 text-blue-600 dark:text-blue-400"
                    >
                      <FiDownload className="w-3.5 h-3.5" />
                      <span>{t("Nạp sơ đồ")}</span>
                    </button>
                  </div>
                )}

                {/* Organizer seatmaps list */}
                {(!venueInfo?.organizerSeatmaps || venueInfo.organizerSeatmaps.length === 0) ? (
                  <div className="text-center py-12 space-y-2">
                    <FiLayers className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                    <p className="text-xs app-text-muted">
                      {t("Chưa có Ban Tổ Chức nào tạo sơ đồ ghế cho địa điểm này.")}
                    </p>
                  </div>
                ) : (
                  venueInfo.organizerSeatmaps.map((orgMap) => (
                    <div
                      key={orgMap.eventId}
                      className="p-4 rounded-xl app-bg-card border app-border hover:border-blue-500/40 transition-all flex items-center justify-between gap-4 shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm app-text-main">{orgMap.eventTitle}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-bold flex items-center gap-1">
                            <FiUser className="w-2.5 h-2.5" />
                            {orgMap.organizerName || t("Ban Tổ Chức")}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs app-text-muted flex-wrap">
                          <span>
                            {t("Sức chứa:")} <strong className="app-text-main">{orgMap.capacity || "N/A"} {t("ghế")}</strong>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <FiCalendar className="w-3 h-3" />
                            {orgMap.updatedAt ? new Date(orgMap.updatedAt).toLocaleDateString("vi-VN") : t("Gần đây")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApplyOrganizerMap(orgMap)}
                          className="seat-studio-primary-button bg-blue-600 hover:bg-blue-500 text-xs flex items-center gap-1.5 shadow-xs"
                        >
                          <FiCopy className="w-3.5 h-3.5" />
                          <span>{t("Áp dụng vào Template")}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t app-border app-bg-subnav flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowOrgMapsModal(false)}
                  className="px-4 py-2 rounded-xl border app-border app-text-main text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {t("Đóng")}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  </div>
  );
};

export default AdminVenueSeatmapDesigner;
