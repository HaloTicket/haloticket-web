import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ticketApi } from '@/services/ticketApi';
import { venueApi } from '@/services/venueApi';
import { eventApi } from '@/services/eventApi';
import {
  FiCamera,
  FiCheck,
  FiCheckCircle,
  FiCopy,
  FiDownload,
  FiLayers,
  FiRefreshCw,
  FiSave,
  FiSend,
  FiTag,
  FiTrash2,
  FiUpload,
  FiX,
} from 'react-icons/fi';
import { ToastContainer, type ToastMessage } from './components/seating/SeatingToast';
import ConfirmModal from '@/components/common/ConfirmModal';
import type {
  CanvasSettings,
  HistoryState,
  Seat,
  SeatMapDocument,
  SeatTier,
  StageElement,
  StructureElement,
  VenueTemplate,
  ZoneBlock,
  AddArcConfig,
  AddMatrixConfig,
  AddRowConfig,
  AddZoneConfig,
} from '@/types/seating';
import { SeatCanvas } from './components/seating/SeatCanvas';
import { ToolBar } from './components/seating/ToolBar';
import { PropertyPanel } from './components/seating/PropertyPanel';
import { AttendeePreview } from './components/seating/AttendeePreview';
import { VenueTemplateModal } from './components/seating/VenueTemplateModal';
import { TierManagerModal } from './components/seating/TierManagerModal';
import { SeatMapStats } from './components/seating/SeatMapStats';
import { PRESET_TEMPLATES } from '@/mock/presetTemplates';
import {
  buildSeatMapDocument,
  cloneTemplateForCurrentEvent,
  DEFAULT_CANVAS_SETTINGS,
  DEFAULT_EVENT_TICKET_TIERS,
  generateSeatMapSVG,
  isSeatInsideZone,
  safeClone,
} from '@/utils/seatMapHelpers';

interface EventSeatingMapProps {
  eventName?: string;
  ticketTiers?: SeatTier[];
  initialMap?: SeatMapDocument | null;
  onSave?: (payload: SeatMapDocument) => Promise<void> | void;
}

interface StudioSnapshot extends HistoryState {
  canvasSettings: CanvasSettings;
}

// normalize imported tier ids
const normalizeImportedTierIds = (
  zones: Record<string, ZoneBlock>,
  tiers: SeatTier[]
): Record<string, ZoneBlock> => {
  const validIds = new Set(tiers.map((tier) => tier.id));
  return Object.fromEntries(
    Object.entries(zones).map(([id, zone]) => {
      let matchedTierId: string | undefined = undefined;
      if (zone.tierId) {
        if (validIds.has(zone.tierId)) {
          matchedTierId = zone.tierId;
        } else {
          const matchByName = tiers.find(
            (t) => t.name.toLowerCase().trim() === zone.name.toLowerCase().trim()
          );
          if (matchByName) {
            matchedTierId = matchByName.id;
          } else {
            matchedTierId = zone.tierId;
          }
        }
      }
      return [
        id,
        {
          ...zone,
          tierId: matchedTierId,
          price: undefined,
        },
      ];
    })
  );
};

// event seating map studio component
export const EventSeatingMap: React.FC<EventSeatingMapProps> = ({
  eventName = 'Sự kiện mới',
  ticketTiers,
  initialMap,
  onSave,
}) => {
  const { eventId: urlEventId } = useParams<{ eventId: string }>();
  const activeEventId = urlEventId || 'e045ea48-2a1b-4914-8d90-3e29ff7cce03';

  const [backendTiers, setBackendTiers] = useState<SeatTier[]>([]);

  const effectiveTiers = useMemo(
    () => (backendTiers.length ? backendTiers : (ticketTiers?.length ? ticketTiers : DEFAULT_EVENT_TICKET_TIERS)),
    [backendTiers, ticketTiers]
  );
  const defaultTemplate = PRESET_TEMPLATES[0];
  const defaultLayout = useMemo(
    () => cloneTemplateForCurrentEvent(defaultTemplate, effectiveTiers),
    [defaultTemplate, effectiveTiers]
  );

  // initialize snapshot
  const initialSnapshot = useMemo<StudioSnapshot>(() => {
    if (initialMap) {
      return {
        seats: safeClone(initialMap.seats || []),
        stages: safeClone(initialMap.stages || []),
        structures: safeClone(initialMap.structures || []),
        zones: normalizeImportedTierIds(safeClone(initialMap.zones || {}), effectiveTiers),
        canvasSettings: { ...DEFAULT_CANVAS_SETTINGS, ...(initialMap.canvasSettings || {}) },
      };
    }
    return {
      seats: [],
      stages: [],
      structures: [],
      zones: {},
      canvasSettings: safeClone(DEFAULT_CANVAS_SETTINGS),
    };
  }, [defaultLayout, effectiveTiers, initialMap]);

  // declare studio states
  const [seats, setSeats] = useState<Seat[]>(initialSnapshot.seats);
  const [stages, setStages] = useState<StageElement[]>(initialSnapshot.stages);
  const [structures, setStructures] = useState<StructureElement[]>(initialSnapshot.structures);
  const [zones, setZones] = useState<Record<string, ZoneBlock>>(initialSnapshot.zones);
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>(initialSnapshot.canvasSettings);

  const [history, setHistory] = useState<StudioSnapshot[]>([safeClone(initialSnapshot)]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const [isAttendeeMode, _setIsAttendeeMode] = useState(false);
  const [attendeeCart, setAttendeeCart] = useState<Seat[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const studioRef = useRef<HTMLDivElement | null>(null);

  const [templates, setTemplates] = useState<VenueTemplate[]>(PRESET_TEMPLATES);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplate.id);

  const [isJSONModalOpen, setIsJSONModalOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('Đã tự động lưu nháp');
  const [layoutStatus, setLayoutStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  } | null>(null);

  const [eventVenue, setEventVenue] = useState<{ id?: string; name?: string; address?: string } | null>(null);
  const [previousSnapshotBeforePreset, setPreviousSnapshotBeforePreset] = useState<StudioSnapshot | null>(null);

  const handleRevertToPreviousVersion = () => {
    if (!previousSnapshotBeforePreset) return;
    applySnapshot(previousSnapshotBeforePreset);
    latestRef.current = previousSnapshotBeforePreset;
    pushHistory(previousSnapshotBeforePreset);
    setPreviousSnapshotBeforePreset(null);
    showToast('info', 'Đã khôi phục lại phiên bản sơ đồ trước khi áp dụng mẫu.');
  };

  const showToast = (type: 'success' | 'error' | 'warning' | 'info', text: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const [isPropertyPanelCollapsed, setIsPropertyPanelCollapsed] = useState(false);
  const [lastClickedPos, setLastClickedPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedZoneModal, setSelectedZoneModal] = useState<ZoneBlock | null>(null);
  const [zoneTicketQuantity, setZoneTicketQuantity] = useState<number>(1);

  const latestRef = useRef<StudioSnapshot>(initialSnapshot);
  useEffect(() => {
    latestRef.current = { seats, stages, structures, zones, canvasSettings };
  }, [canvasSettings, seats, stages, structures, zones]);

  // load current event's venue from DB
  useEffect(() => {
    const fetchEventVenue = async () => {
      try {
        const ev = await eventApi.getEventById(activeEventId);
        if (ev) {
          const locName = (ev.locationName as string) || (ev.address as string) || '';
          const venues = await venueApi.getVenues();
          const matched = venues.find(v => 
            (locName && v.name && v.name.toLowerCase().includes(locName.toLowerCase())) ||
            (locName && v.name && locName.toLowerCase().includes(v.name.toLowerCase()))
          );
          if (matched) {
            setEventVenue({ id: String(matched.id), name: matched.name, address: matched.address });
          } else if (locName) {
            setEventVenue({ name: locName, address: ev.address as string });
          }
        }
      } catch (e) {
        console.warn("Could not load event venue for seating map", e);
      }
    };
    fetchEventVenue();
  }, [activeEventId]);

  // load Real Venues from Backend API via venueApi service
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const venues = await venueApi.getVenues();
        if (venues && venues.length > 0) {
          const venueTemplates: VenueTemplate[] = [];
          venues.forEach((v: any, idx: number) => {
            if (v.verified === false) return; // Only public verified venues

            // layout variant 1: concert & music stage
            const preset1 = PRESET_TEMPLATES[idx % PRESET_TEMPLATES.length] || PRESET_TEMPLATES[0];
            venueTemplates.push({
              id: `venue_${v.id}_concert`,
              name: `${v.name} - Sơ đồ Concert & Âm Nhạc`,
              address: v.address,
              city: v.city,
              capacity: v.capacity || preset1.capacity || 5000,
              description: `Địa điểm công cộng: ${v.name} (${v.address || ''}, ${v.city || ''}). Sơ đồ bố cục biểu diễn Concert Sân khấu chính.`,
              source: 'system',
              stages: safeClone(preset1.stages || []),
              structures: safeClone(preset1.structures || []),
              seats: safeClone(preset1.seats || []),
              zones: safeClone(preset1.zones || {}),
              canvasSettings: safeClone(preset1.canvasSettings || DEFAULT_CANVAS_SETTINGS),
            });

            // Layout Variant 2: Sports & Arena Stand
            const preset2 = PRESET_TEMPLATES[(idx + 1) % PRESET_TEMPLATES.length] || PRESET_TEMPLATES[1];
            if (preset2) {
              venueTemplates.push({
                id: `venue_${v.id}_sports`,
                name: `${v.name} - Sơ đồ Thể Thao & Khán Đài`,
                address: v.address,
                city: v.city,
                capacity: v.capacity ? Math.round(v.capacity * 0.9) : 4500,
                description: `Địa điểm công cộng: ${v.name} (${v.address || ''}, ${v.city || ''}). Sơ đồ bố cục Giải đấu thể thao & Khán đài.`,
                source: 'system',
                stages: safeClone(preset2.stages || []),
                structures: safeClone(preset2.structures || []),
                seats: safeClone(preset2.seats || []),
                zones: safeClone(preset2.zones || {}),
                canvasSettings: safeClone(preset2.canvasSettings || DEFAULT_CANVAS_SETTINGS),
              });
            }

            // Layout Variant 3: 360 Arena Center Stage
            const preset3 = PRESET_TEMPLATES[(idx + 2) % PRESET_TEMPLATES.length] || PRESET_TEMPLATES[2];
            if (preset3) {
              venueTemplates.push({
                id: `venue_${v.id}_arena360`,
                name: `${v.name} - Sơ đồ Sân Khấu Tròn 360°`,
                address: v.address,
                city: v.city,
                capacity: v.capacity ? Math.round(v.capacity * 1.1) : 6000,
                description: `Địa điểm công cộng: ${v.name} (${v.address || ''}, ${v.city || ''}). Sơ đồ bố cục Sân khấu trung tâm 360 độ góc nhìn đa chiều.`,
                source: 'system',
                stages: safeClone(preset3.stages || []),
                structures: safeClone(preset3.structures || []),
                seats: safeClone(preset3.seats || []),
                zones: safeClone(preset3.zones || {}),
                canvasSettings: safeClone(preset3.canvasSettings || DEFAULT_CANVAS_SETTINGS),
              });
            }
          });

          setTemplates((prev) => [...venueTemplates, ...prev.filter((t) => !t.id.startsWith('venue_'))]);
        }
      } catch {
        // fallback to presets if backend endpoint offline
      }
    };
    fetchVenues();
  }, []);

  // fetch ticket types & existing seat layout from Backend API via ticketApi service
  useEffect(() => {
    if (!activeEventId) return;
    const fetchLayoutAndTypes = async () => {
      try {
        // fetch ticket types via ticketApi
        const typesList = await ticketApi.getTicketTypesByEventId(activeEventId);
        if (typesList && typesList.length > 0) {
          const colors = ['#f59e0b', '#9333ea', '#2563eb', '#10b981', '#f97316', '#ec4899', '#475569', '#06b6d4'];
          const mappedTiers: SeatTier[] = typesList.map((t: any, idx: number) => ({
            id: t.id,
            name: t.name,
            price: t.price || 0,
            color: colors[idx % colors.length],
            isFree: t.isFree ?? t.price === 0,
            totalQuantity: t.totalQuantity ?? 100,
            minPerOrder: t.minPerOrder ?? 1,
            maxPerOrder: t.maxPerOrder ?? 5,
            startSaleDate: t.startSaleDate || undefined,
            endSaleDate: t.endSaleDate || undefined,
            description: t.description || undefined,
          }));
          setBackendTiers(mappedTiers);
        }

        // fetch layout via ticketApi
        const layoutData = await ticketApi.getSeatLayoutByEventId(activeEventId);
        if (layoutData) {
          if (layoutData.status) {
            setLayoutStatus((layoutData.status as any) === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT');
          }
          if (layoutData.draftJson) {
            try {
              const parsedDoc = JSON.parse(layoutData.draftJson) as SeatMapDocument;
              const snapshot: StudioSnapshot = {
                seats: safeClone(parsedDoc.seats || []),
                stages: safeClone(parsedDoc.stages || []),
                structures: safeClone(parsedDoc.structures || []),
                zones: safeClone(parsedDoc.zones || {}),
                canvasSettings: { ...DEFAULT_CANVAS_SETTINGS, ...(parsedDoc.canvasSettings || {}) },
              };
              applySnapshot(snapshot);
              latestRef.current = snapshot;
              setHistory([safeClone(snapshot)]);
              setHistoryIndex(0);
              return;
            } catch (e) {
              console.warn('Failed to parse draftJson', e);
            }
          }

          if (layoutData.zones && Array.isArray(layoutData.zones) && layoutData.zones.length > 0) {
            const zonesMap: Record<string, ZoneBlock> = {};
            layoutData.zones.forEach((z: any) => {
              let parsedPoints = undefined;
              if (z.points) {
                if (typeof z.points === 'string') {
                  try { parsedPoints = JSON.parse(z.points); } catch { parsedPoints = undefined; }
                } else {
                  parsedPoints = z.points;
                }
              }
              zonesMap[z.id || `zone_${Date.now()}`] = {
                id: z.id || `zone_${Date.now()}`,
                name: z.name || 'Khu vực',
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
            setZones(zonesMap);
          }
        }
      } catch (err) {
        console.error('Error fetching seat layout or ticket types:', err);
      }
    };

    fetchLayoutAndTypes();
  }, [activeEventId]);

  // realtime auto-save (LocalStorage + Debounced Backend Draft Save)
  const autoSaveTimerRef = useRef<any>(null);
  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    setAutoSaveStatus('Đang tự động lưu nháp...');
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const payload = buildSeatMapDocument({
          name: eventName,
          venueTemplateId: selectedTemplateId,
          canvasSettings,
          zones,
          stages,
          structures,
          seats,
          ticketTiers: effectiveTiers,
        });

        // save locally for instant recovery
        localStorage.setItem(`haloticket_seatmap_draft_${activeEventId}`, JSON.stringify(payload));
        localStorage.setItem(`haloticket_seatmap_draft_${eventName}`, JSON.stringify(payload));

        const zonesPayload = Object.entries(zones).map(([zId, z]) => {
          const rawZone = z as any;
          const shapeVal = rawZone.shape || rawZone.shapeType || 'RECTANGLE';
          const pointsVal = rawZone.points;
          return {
            id: zId,
            name: z.name,
            ticketTypeId: z.tierId || null,
            shapeType: String(shapeVal).toUpperCase(),
            colorCode: z.color,
            fillColor: z.fillColor || z.color,
            strokeColor: z.strokeColor || z.color,
            curvature: z.curvature ?? 16,
            x: z.x ?? 100,
            y: z.y ?? 100,
            width: z.width ?? 300,
            height: z.height ?? 180,
            rotation: z.rotation ?? 0,
            points: pointsVal ? (typeof pointsVal === 'string' ? pointsVal : JSON.stringify(pointsVal)) : null,
            capacity: z.capacity || (seats.filter((s) => s.zoneId === zId).length || 100),
          };
        });

        await ticketApi.saveSeatLayoutDraft(activeEventId, {
          eventId: activeEventId,
          draftJson: JSON.stringify(payload),
          svgData: generateSeatMapSVG(payload),
          imageUrl: null,
          status: 'DRAFT',
          zones: zonesPayload,
        });

        const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        setAutoSaveStatus(`Đã tự động lưu nháp lúc ${timeStr}`);
      } catch {
        setAutoSaveStatus('Lỗi tự động lưu nháp');
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [seats, stages, structures, zones, canvasSettings, eventName, effectiveTiers, selectedTemplateId, activeEventId]);

  // export seatMap image function
  const handleExportImage = () => {
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
        downloadLink.download = `Sơ_đồ_ghế_${eventName.replace(/\s+/g, '_')}.png`;
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

  // push history snapshot
  const pushHistory = (snapshot?: StudioSnapshot) => {
    const nextSnapshot = safeClone(snapshot || latestRef.current);
    setHistory((prev) => {
      const base = prev.slice(0, historyIndex + 1);
      const last = base[base.length - 1];
      if (last && JSON.stringify(last) === JSON.stringify(nextSnapshot)) return prev;
      const next = [...base, nextSnapshot].slice(-80);
      setHistoryIndex(next.length - 1);
      return next;
    });
  };

  // apply snapshot to state
  const applySnapshot = (snapshot: StudioSnapshot) => {
    setSeats(safeClone(snapshot.seats));
    setStages(safeClone(snapshot.stages));
    setStructures(safeClone(snapshot.structures));
    setZones(safeClone(snapshot.zones));
    setCanvasSettings(safeClone(snapshot.canvasSettings));
    setSelectedSeatIds([]);
    setSelectedStageId(null);
    setSelectedStructureId(null);
    setSelectedZoneId(null);
  };

  // handle undo action
  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    applySnapshot(history[nextIndex]);
    setHistoryIndex(nextIndex);
  };

  // handle redo action
  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    applySnapshot(history[nextIndex]);
    setHistoryIndex(nextIndex);
  };

  // commit new state change
  const commitWith = (partial: Partial<StudioSnapshot>) => {
    const current = latestRef.current;
    const next: StudioSnapshot = {
      seats: partial.seats ?? current.seats,
      stages: partial.stages ?? current.stages,
      structures: partial.structures ?? current.structures,
      zones: partial.zones ?? current.zones,
      canvasSettings: partial.canvasSettings ?? current.canvasSettings,
    };
    latestRef.current = next;
    pushHistory(next);
  };

  // reset current selection
  const resetSelection = () => {
    setSelectedSeatIds([]);
    setSelectedStageId(null);
    setSelectedStructureId(null);
    setSelectedZoneId(null);
  };

  // handle add seat row
  const handleAddRow = (

    configOrLetter: AddRowConfig | string,
    countVal?: number,
    zoneIdVal?: string
  ) => {
    let rowLetter = 'A';
    let count = 12;
    let zoneId = '';
    let spacing = 32;

    if (typeof configOrLetter === 'object' && configOrLetter !== null) {
      rowLetter = configOrLetter.rowLetter || 'A';
      count = configOrLetter.count || 12;
      zoneId = configOrLetter.zoneId || '';
      spacing = configOrLetter.spacing || 48;
    } else {
      rowLetter = (configOrLetter as string) || 'A';
      count = countVal || 12;
      zoneId = zoneIdVal || '';
      spacing = 48;
    }

    const targetZoneId = zoneId && zones[zoneId] ? zoneId : Object.keys(zones)[0];
    if (!targetZoneId || !zones[targetZoneId]) return window.alert('Hãy tạo/chọn khu vực trước khi tạo ghế.');
    const zone = zones[targetZoneId];
    const startX = lastClickedPos ? lastClickedPos.x : (zone.x || 120) + 32;
    const startY = lastClickedPos ? lastClickedPos.y : (zone.y || 180) + 70;
    const baseId = Date.now();
    const newSeats = Array.from({ length: count }, (_, index): Seat => ({
      id: `seat_${baseId}_${index}`,
      row: rowLetter,
      number: index + 1,
      col: index + 1,
      x: startX + index * spacing,
      y: startY,
      zoneId: targetZoneId,
      status: 'available',
      rotation: 0,
      shape: 'rounded',
    }));
    const nextSeats = [...seats, ...newSeats];
    setSeats(nextSeats);
    setSelectedSeatIds(newSeats.map((seat) => seat.id));
    setSelectedZoneId(null);
    commitWith({ seats: nextSeats });
  };

  const handleAddMatrix = (
    configOrRows: AddMatrixConfig | number,
    colsVal?: number,
    startRowLetterVal?: string,
    zoneIdVal?: string
  ) => {
    let rowCount = 4;
    let cols = 10;
    let startRowLetter = 'A';
    let zoneId = '';
    let spacingX = 32;
    let spacingY = 32;
    let aisleAfter = 0;
    let aisleGap = 0;

    if (typeof configOrRows === 'object' && configOrRows !== null) {
      rowCount = configOrRows.rows || 4;
      cols = configOrRows.cols || 10;
      startRowLetter = configOrRows.startRowLetter || 'A';
      zoneId = configOrRows.zoneId || '';
      spacingX = configOrRows.spacingX || 48;
      spacingY = configOrRows.spacingY || 48;
      aisleAfter = configOrRows.aisleAfter || 0;
      aisleGap = configOrRows.aisleGap || 0;
    } else {
      rowCount = typeof configOrRows === 'number' ? configOrRows : 4;
      cols = colsVal || 10;
      startRowLetter = startRowLetterVal || 'A';
      zoneId = zoneIdVal || '';
      spacingX = 48;
      spacingY = 48;
    }

    const targetZoneId = zoneId && zones[zoneId] ? zoneId : Object.keys(zones)[0];
    if (!targetZoneId || !zones[targetZoneId]) return window.alert('Hãy tạo/chọn khu vực trước khi tạo ghế.');
    const zone = zones[targetZoneId];
    const startX = lastClickedPos ? lastClickedPos.x : (zone.x || 100) + 34;
    const startY = lastClickedPos ? lastClickedPos.y : (zone.y || 180) + 68;
    const startChar = (startRowLetter || 'A').charCodeAt(0);
    const baseId = Date.now();
    const newSeats: Seat[] = [];

    for (let r = 0; r < rowCount; r += 1) {
      const rowName = String.fromCharCode(startChar + r);
      for (let c = 0; c < cols; c += 1) {
        const aisleOffset = aisleAfter > 0 && c >= aisleAfter ? aisleGap : 0;
        newSeats.push({
          id: `seat_${baseId}_${r}_${c}`,
          row: rowName,
          number: c + 1,
          col: c + 1,
          x: startX + c * spacingX + aisleOffset,
          y: startY + r * spacingY,
          zoneId: targetZoneId,
          status: 'available',
          shape: 'rounded',
          rotation: 0,
        });
      }
    }

    const nextSeats = [...seats, ...newSeats];
    setSeats(nextSeats);
    setSelectedSeatIds(newSeats.map((seat) => seat.id));
    setSelectedZoneId(null);
    commitWith({ seats: nextSeats });
  };

  const handleAddArc = (
    configOrLetter: AddArcConfig | string,
    countVal?: number,
    radiusVal?: number,
    zoneIdVal?: string
  ) => {
    let rowLetter = 'A';
    let count = 16;
    let radius = 280;
    let zoneId = '';
    let spanDegrees = 140;

    if (typeof configOrLetter === 'object' && configOrLetter !== null) {
      rowLetter = configOrLetter.rowLetter || 'A';
      count = configOrLetter.count || 16;
      radius = configOrLetter.radius || 280;
      zoneId = configOrLetter.zoneId || '';
      spanDegrees = configOrLetter.spanDegrees || 140;
    } else {
      rowLetter = (configOrLetter as string) || 'A';
      count = countVal || 16;
      radius = radiusVal || 280;
      zoneId = zoneIdVal || '';
    }

    const targetZoneId = zoneId && zones[zoneId] ? zoneId : Object.keys(zones)[0];
    if (!targetZoneId || !zones[targetZoneId]) return window.alert('Hãy tạo/chọn khu vực trước khi tạo ghế.');
    const zone = zones[targetZoneId];
    const centerX = lastClickedPos ? lastClickedPos.x : (zone.x || 0) + (zone.width || 600) / 2;
    const centerY = lastClickedPos ? lastClickedPos.y : (zone.y || 0) + 20;
    const startAngle = ((90 - spanDegrees / 2) * Math.PI) / 180;
    const endAngle = ((90 + spanDegrees / 2) * Math.PI) / 180;
    const step = count > 1 ? (endAngle - startAngle) / (count - 1) : 0;
    const baseId = Date.now();
    const newSeats: Seat[] = [];

    for (let i = 0; i < count; i += 1) {
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
        status: 'available',
        shape: 'rounded',
      });
    }

    const nextSeats = [...seats, ...newSeats];
    setSeats(nextSeats);
    setSelectedSeatIds(newSeats.map((seat) => seat.id));
    commitWith({ seats: nextSeats });
  };

  const handleAddTable = (zoneIdVal?: string, seatsPerTableVal?: number, radiusVal?: number) => {
    const targetZoneId = (zoneIdVal && zones[zoneIdVal]) ? zoneIdVal : Object.keys(zones)[0];
    if (!targetZoneId || !zones[targetZoneId]) return window.alert('Hãy tạo/chọn khu vực trước khi tạo bàn.');
    const seatsPerTable = seatsPerTableVal || 8;
    const radius = radiusVal || 50;
    const zone = zones[targetZoneId];
    const existingTables = new Set(seats.filter((seat) => seat.row.startsWith('Bàn ')).map((seat) => seat.row));
    const tableNumber = existingTables.size + 1;
    const centerX = lastClickedPos ? lastClickedPos.x : (zone.x || 0) + (zone.width || 500) / 2;
    const centerY = lastClickedPos ? lastClickedPos.y : (zone.y || 0) + (zone.height || 300) / 2;
    const baseId = Date.now();
    const newSeats: Seat[] = [];

    for (let i = 0; i < seatsPerTable; i += 1) {
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
        status: 'available',
        shape: 'circle',
      });
    }

    const nextSeats = [...seats, ...newSeats];
    setSeats(nextSeats);
    setSelectedSeatIds(newSeats.map((seat) => seat.id));
    commitWith({ seats: nextSeats });
  };

  const handleAddStage = (kindOrLabel: 'stage' | 't_stage' | string, labelVal?: string) => {
    let kind: 'stage' | 't_stage' = 'stage';
    let label = 'SÂN KHẤU CHÍNH (MAIN STAGE)';

    if (kindOrLabel === 't_stage' || kindOrLabel === 'stage') {
      kind = kindOrLabel;
      label = labelVal || (kind === 't_stage' ? 'SÂN KHẤU T-STAGE' : 'SÂN KHẤU CHÍNH (MAIN STAGE)');
    } else {
      label = kindOrLabel;
    }

    const width = kind === 't_stage' ? 140 : Math.min(620, canvasSettings.width - 200);
    const height = kind === 't_stage' ? 260 : 100;
    const newStage: StageElement = {
      id: `stage_${Date.now()}`,
      type: kind,
      label,
      x: lastClickedPos ? Math.round(lastClickedPos.x - width / 2) : Math.round((canvasSettings.width - width) / 2),
      y: lastClickedPos ? Math.round(lastClickedPos.y - height / 2) : 70,
      width,
      height,
      color: kind === 't_stage' ? '#1d4ed8' : '#1e293b',
      rotation: 0,
      shape: kind === 't_stage' ? 'runway' : 'rounded',
    };
    const nextStages = [...stages, newStage];
    setStages(nextStages);
    resetSelection();
    setSelectedStageId(newStage.id);
    commitWith({ stages: nextStages });
  };

  const handleAddStructure = (type: StructureElement['type'], label?: string) => {
    const colorMap: Record<StructureElement['type'], string> = {
      exit: '#dc2626',
      gate: '#059669',
      control_booth: '#475569',
      wc_food: '#0891b2',
      structure: '#64748b',
    };
    const newStructure: StructureElement = {
      id: `structure_${Date.now()}`,
      type,
      label: label || 'CẤU TRÚC PHỤ',
      x: lastClickedPos ? Math.round(lastClickedPos.x - (type === 'control_booth' ? 110 : 75)) : 70,
      y: lastClickedPos ? Math.round(lastClickedPos.y - 22) : 80 + structures.length * 55,
      width: type === 'control_booth' ? 220 : 150,
      height: 44,
      color: colorMap[type] || '#64748b',
      rotation: 0,
      shape: 'rounded',
    };
    const nextStructures = [...structures, newStructure];
    setStructures(nextStructures);
    resetSelection();
    setSelectedStructureId(newStructure.id);
    commitWith({ structures: nextStructures });
  };

  const handleAddZoneBlock = (
    configOrName: AddZoneConfig | string,
    priceVal?: number,
    colorVal?: string,
    widthVal?: number,
    heightVal?: number,
    borderStyleVal?: 'dashed' | 'solid',
    rowsVal?: number,
    colsVal?: number
  ) => {
    const id = `zone_${Date.now()}`;
    const index = Object.keys(zones).length;
    let name = `Khu Vực Ghế ${index + 1}`;
    let tierId: string | undefined = undefined;
    let price: number | undefined = priceVal;
    let color = colorVal || ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'][index % 5];
    let width = widthVal || 520;
    let height = heightVal || 220;
    let borderStyle: 'dashed' | 'solid' = borderStyleVal || 'dashed';
    let shape: any = undefined;
    let type: any = undefined;
    let layoutType: string = 'STANDING';
    let rowPrefix = 'A';
    let rowCount = rowsVal ?? 0;
    let seatsPerRow = colsVal ?? 0;
    let arcCount = 0;
    let arcRadius = 240;
    let tableCount = 0;
    let seatsPerTable = 8;
    let capacityVal: number | undefined = undefined;

    if (typeof configOrName === 'object' && configOrName !== null) {
      name = configOrName.name || name;
      tierId = configOrName.tierId;
      price = configOrName.price;
      color = configOrName.color || color;
      width = configOrName.width || width;
      height = configOrName.height || height;
      borderStyle = configOrName.borderStyle || borderStyle;
      shape = configOrName.shape;
      type = configOrName.type;
      layoutType = configOrName.layoutType || (rowCount > 0 && seatsPerRow > 0 ? 'MATRIX' : 'STANDING');
      rowPrefix = configOrName.rowPrefix || 'A';
      rowCount = configOrName.rowCount || rowCount;
      seatsPerRow = configOrName.seatsPerRow || seatsPerRow;
      arcCount = configOrName.arcCount || 0;
      arcRadius = configOrName.arcRadius || 240;
      tableCount = configOrName.tableCount || 0;
      seatsPerTable = configOrName.seatsPerTable || 8;
      capacityVal = configOrName.capacity;
    } else if (typeof configOrName === 'string') {
      name = configOrName || name;
      if (rowCount > 0 && seatsPerRow > 0) layoutType = 'MATRIX';
    }

    const tier = effectiveTiers.find((item) => item.id === tierId);
    const zoneX = lastClickedPos ? lastClickedPos.x : 120 + (index % 5) * 28;
    const zoneY = lastClickedPos ? lastClickedPos.y : 220 + (index % 5) * 28;

    const newZone: ZoneBlock = {
      id,
      name,
      tierId,
      price: price ?? tier?.price,
      color: color,
      shape,
      type,
      x: zoneX,
      y: zoneY,
      width,
      height,
      borderStyle,
      fillOpacity: 0.15,
      rotation: 0,
      capacity: capacityVal,
    };

    const baseId = Date.now();
    const generatedSeats: Seat[] = [];

    if (layoutType === 'ROW' && seatsPerRow > 0) {
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
          status: 'available',
          shape: 'rounded',
          rotation: 0,
        });
      }
    } else if (layoutType === 'MATRIX' && rowCount > 0 && seatsPerRow > 0) {
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
            status: 'available',
            shape: 'rounded',
            rotation: 0,
          });
        }
      }
    } else if (layoutType === 'ARC' && arcCount > 0) {
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
          status: 'available',
          shape: 'rounded',
          rotation: rot,
        });
      }
    } else if (layoutType === 'GALA' && tableCount > 0 && seatsPerTable > 0) {
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
            status: 'available',
            shape: 'circle',
            rotation: Math.round(angleDeg),
          });
        }
      }
    }

    const nextZones = { ...zones, [id]: newZone };
    const nextSeats = generatedSeats.length > 0 ? [...seats, ...generatedSeats] : seats;
    setZones(nextZones);
    setSeats(nextSeats);
    resetSelection();
    setSelectedZoneId(id);
    commitWith({ zones: nextZones, seats: nextSeats });
  };

  // handle delete selected elements
  const handleDeleteSelected = () => {
    let nextSeats = seats;
    let nextStages = stages;
    let nextStructures = structures;

    if (selectedSeatIds.length) {
      nextSeats = seats.filter((seat) => !selectedSeatIds.includes(seat.id));
      setSeats(nextSeats);
      resetSelection();
      commitWith({ seats: nextSeats });
    } else if (selectedStageId) {
      nextStages = stages.filter((stage) => stage.id !== selectedStageId);
      setStages(nextStages);
      resetSelection();
      commitWith({ stages: nextStages });
    } else if (selectedStructureId) {
      nextStructures = structures.filter((item) => item.id !== selectedStructureId);
      setStructures(nextStructures);
      resetSelection();
      commitWith({ structures: nextStructures });
    } else if (selectedZoneId) {
      const seatCount = seats.filter((seat) => seat.zoneId === selectedZoneId).length;
      if (seatCount > 0) {
        setConfirmModal({
          isOpen: true,
          title: 'Xác Nhận Xóa Khu Vực',
          message: `Khu vực này đang chứa ${seatCount} ghế. Xóa khu vực sẽ xóa luôn các ghế đó. Tiếp tục?`,
          type: 'danger',
          onConfirm: () => {
            const filteredSeats = seats.filter((seat) => seat.zoneId !== selectedZoneId);
            const { [selectedZoneId]: _removed, ...rest } = zones;
            setSeats(filteredSeats);
            setZones(rest);
            resetSelection();
            commitWith({ seats: filteredSeats, zones: rest });
            setConfirmModal(null);
          },
        });
        return;
      }
      const { [selectedZoneId]: _removed, ...rest } = zones;
      setZones(rest);
      resetSelection();
      commitWith({ zones: rest });
    }
  };

  // handle duplicate selected elements
  const handleDuplicateSelected = () => {
    if (!selectedSeatIds.length) return;
    const baseId = Date.now();
    const duplicated = seats
      .filter((seat) => selectedSeatIds.includes(seat.id))
      .map((seat, index) => ({ ...seat, id: `seat_dup_${baseId}_${index}`, x: seat.x + 32, y: seat.y + 32 }));
    const nextSeats = [...seats, ...duplicated];
    setSeats(nextSeats);
    setSelectedSeatIds(duplicated.map((seat) => seat.id));
    commitWith({ seats: nextSeats });
  };

  // handle select all seats
  const handleSelectAll = () => {
    setSelectedSeatIds(seats.filter((seat) => !seat.hidden).map((seat) => seat.id));
    setSelectedStageId(null);
    setSelectedStructureId(null);
    setSelectedZoneId(null);
  };

  // handle update seat props
  const handleUpdateSeatProps = (props: Partial<Seat>) => {
    const nextSeats = seats.map((seat) => selectedSeatIds.includes(seat.id) ? { ...seat, ...props } : seat);
    setSeats(nextSeats);
    commitWith({ seats: nextSeats });
  };

  // handle move seats to zone
  const handleMoveSeatsToZone = (zoneId: string) => {
    if (!zones[zoneId]) return;
    const nextSeats = seats.map((seat) => selectedSeatIds.includes(seat.id) ? { ...seat, zoneId, tierId: undefined } : seat);
    setSeats(nextSeats);
    commitWith({ seats: nextSeats });
  };

  // handle update stage props
  const handleUpdateStageProps = (stageId: string, props: Partial<StageElement>) => {
    const nextStages = stages.map((stage) => stage.id === stageId ? { ...stage, ...props } : stage);
    setStages(nextStages);
    commitWith({ stages: nextStages });
  };

  // handle update structure props
  const handleUpdateStructureProps = (structureId: string, props: Partial<StructureElement>) => {
    const nextStructures = structures.map((item) => item.id === structureId ? { ...item, ...props } : item);
    setStructures(nextStructures);
    commitWith({ structures: nextStructures });
  };

  // handle update zone props
  const handleUpdateZoneProps = (zoneId: string, props: Partial<ZoneBlock>) => {
    const currentZone = zones[zoneId];
    if (!currentZone) return;
    const nextZone = { ...currentZone, ...props };
    if (props.tierId !== undefined) {
      const tier = effectiveTiers.find((item) => item.id === props.tierId);
      if (tier) nextZone.color = tier.color;
      nextZone.price = undefined;
    }

    let nextSeats = props.tierId !== undefined
      ? seats.map((seat) => seat.zoneId === zoneId ? { ...seat, tierId: undefined } : seat)
      : seats;

    if (props.rotation !== undefined && props.rotation !== (currentZone.rotation || 0)) {
      const oldRot = currentZone.rotation || 0;
      const deltaDeg = props.rotation - oldRot;
      const cx = (currentZone.x || 0) + (currentZone.width || 800) / 2;
      const cy = (currentZone.y || 0) + (currentZone.height || 180) / 2;
      const rad = (deltaDeg * Math.PI) / 180;
      const cosVal = Math.cos(rad);
      const sinVal = Math.sin(rad);

      nextSeats = nextSeats.map((s) => {
        const isBelongingSeat = s.zoneId === zoneId || isSeatInsideZone(s, currentZone);
        if (isBelongingSeat) {
          const dx = s.x - cx;
          const dy = s.y - cy;
          const newX = Math.round(cx + dx * cosVal - dy * sinVal);
          const newY = Math.round(cy + dx * sinVal + dy * cosVal);
          const newRot = Math.round((((s.rotation || 0) + deltaDeg) % 360 + 360) % 360);
          return { ...s, x: newX, y: newY, rotation: newRot, zoneId };
        }
        return s;
      });
    }

    const nextZones = { ...zones, [zoneId]: nextZone };
    setZones(nextZones);
    setSeats(nextSeats);
    commitWith({ zones: nextZones, seats: nextSeats });
  };

  // handle arrange seats
  const handleArrangeSeats = (
    action: 'align-left' | 'align-center' | 'align-right' | 'align-top' | 'align-middle' | 'align-bottom' | 'distribute-x' | 'distribute-y'
  ) => {
    const selected = seats.filter((seat) => selectedSeatIds.includes(seat.id));
    if (selected.length < 2) return;
    const xs = selected.map((seat) => seat.x);
    const ys = selected.map((seat) => seat.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const xSorted = [...selected].sort((a, b) => a.x - b.x);
    const ySorted = [...selected].sort((a, b) => a.y - b.y);
    const xStep = selected.length > 1 ? (maxX - minX) / (selected.length - 1) : 0;
    const yStep = selected.length > 1 ? (maxY - minY) / (selected.length - 1) : 0;
    const xOrder = new Map(xSorted.map((seat, index) => [seat.id, index]));
    const yOrder = new Map(ySorted.map((seat, index) => [seat.id, index]));

    const nextSeats = seats.map((seat) => {
      if (!selectedSeatIds.includes(seat.id) || seat.locked) return seat;
      if (action === 'align-left') return { ...seat, x: minX };
      if (action === 'align-center') return { ...seat, x: centerX };
      if (action === 'align-right') return { ...seat, x: maxX };
      if (action === 'align-top') return { ...seat, y: minY };
      if (action === 'align-middle') return { ...seat, y: centerY };
      if (action === 'align-bottom') return { ...seat, y: maxY };
      if (action === 'distribute-x') return { ...seat, x: minX + (xOrder.get(seat.id) || 0) * xStep };
      if (action === 'distribute-y') return { ...seat, y: minY + (yOrder.get(seat.id) || 0) * yStep };
      return seat;
    });
    setSeats(nextSeats);
    commitWith({ seats: nextSeats });
  };

  // handle resize canvas
  const handleResizeCanvas = (width: number, height: number, gridSize?: number) => {
    const next = { ...canvasSettings, width, height, gridSize: gridSize ?? canvasSettings.gridSize };
    setCanvasSettings(next);
    commitWith({ canvasSettings: next });
  };

  // handle load preset template
  const handleLoadPreset = (template: VenueTemplate) => {
    const current = latestRef.current;
    if (current.seats.length > 0 || current.stages.length > 0 || Object.keys(current.zones).length > 0) {
      setPreviousSnapshotBeforePreset(safeClone(current));
    }

    const cloned = cloneTemplateForCurrentEvent(template, effectiveTiers);
    const snapshot: StudioSnapshot = {
      seats: safeClone(cloned.seats),
      stages: safeClone(cloned.stages),
      structures: safeClone(cloned.structures),
      zones: safeClone(cloned.zones),
      canvasSettings: safeClone(cloned.canvasSettings),
    };
    applySnapshot(snapshot);
    latestRef.current = snapshot;
    setHistory([safeClone(snapshot)]);
    setHistoryIndex(0);
    setSelectedTemplateId(template.id);
    setAttendeeCart([]);
    setIsTemplateModalOpen(false);
    showToast('success', `Đã áp dụng mẫu "${template.name}". Bạn có thể bấm "Khôi phục bản trước" nếu muốn hoàn tác.`);
  };

  const handleClearCanvas = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa Canvas',
      message: 'Bạn có chắc chắn muốn xóa toàn bộ ghế, khu vực, sân khấu và tiện ích trên canvas không?',
      type: 'danger',
      onConfirm: () => {
        const snapshot: StudioSnapshot = {
          seats: [],
          stages: [],
          structures: [],
          zones: {},
          canvasSettings,
        };
        applySnapshot(snapshot);
        latestRef.current = snapshot;
        pushHistory(snapshot);
        setAttendeeCart([]);
        setConfirmModal(null);
        showToast('info', 'Đã xóa toàn bộ nội dung canvas.');
      },
    });
  };

  const handleToggleAttendeeSeat = (seat: Seat) => {
    setAttendeeCart((prev) => prev.some((item) => item.id === seat.id) ? prev.filter((item) => item.id !== seat.id) : [...prev, seat]);
  };

  const handleOpenJSONModal = () => {
    const payload = buildSeatMapDocument({
      name: eventName,
      venueTemplateId: selectedTemplateId,
      canvasSettings,
      zones,
      stages,
      structures,
      seats,
      ticketTiers: effectiveTiers,
    });
    setJsonText(JSON.stringify(payload, null, 2));
    setIsJSONModalOpen(true);
  };

  const handleImportJSON = () => {
    try {
      const parsed = JSON.parse(jsonText) as Partial<SeatMapDocument>;
      const nextZones = normalizeImportedTierIds(parsed.zones || {}, effectiveTiers);
      const nextSeats = (parsed.seats || []).map((seat) => ({
        ...seat,
        tierId: seat.tierId && effectiveTiers.some((tier) => tier.id === seat.tierId) ? seat.tierId : undefined,
      }));
      const snapshot: StudioSnapshot = {
        seats: nextSeats,
        stages: parsed.stages || [],
        structures: parsed.structures || [],
        zones: nextZones,
        canvasSettings: { ...DEFAULT_CANVAS_SETTINGS, ...(parsed.canvasSettings || {}) },
      };
      applySnapshot(snapshot);
      latestRef.current = snapshot;
      pushHistory(snapshot);
      setIsJSONModalOpen(false);
      showToast('success', 'Đã nạp bản đồ từ JSON thành công.');
    } catch {
      showToast('error', 'JSON không đúng định dạng Seat Map v2.0.');
    }
  };

  const syncTiersAndGetUpdatedData = async () => {
    let syncedTiers = effectiveTiers;
    if (effectiveTiers && effectiveTiers.length > 0) {
      try {
        const requests = effectiveTiers.map((t) => ({
          id: t.id.startsWith("tier_") ? undefined : t.id,
          eventId: activeEventId,
          name: t.name,
          price: t.price,
          isFree: t.price === 0,
          totalQuantity: t.totalQuantity ?? 500,
          minPerOrder: 1,
          maxPerOrder: 10,
          description: t.description || `Hạng vé ${t.name}`,
        }));
        const res = await ticketApi.syncTicketTypesForEvent(activeEventId, requests);
        if (res && res.length > 0) {
          const colors = ['#f59e0b', '#9333ea', '#2563eb', '#10b981', '#f97316', '#ec4899', '#475569', '#06b6d4'];
          syncedTiers = res.map((t: any, idx: number) => ({
            id: t.id,
            name: t.name,
            price: t.price || 0,
            color: colors[idx % colors.length],
            totalQuantity: t.totalQuantity ?? 500,
            description: t.description || undefined,
          }));
          setBackendTiers(syncedTiers);
        }
      } catch (e) {
        console.warn('Sync ticket types warning:', e);
      }
    }

    const tierIdMap = new Map<string, string>();
    effectiveTiers.forEach((oldTier) => {
      const matched = syncedTiers.find(
        (st) => st.id === oldTier.id || st.name.toLowerCase().trim() === oldTier.name.toLowerCase().trim()
      );
      if (matched) tierIdMap.set(oldTier.id, matched.id);
    });

    const updatedZones: Record<string, ZoneBlock> = {};
    Object.entries(zones).forEach(([zId, z]) => {
      const mappedTierId = z.tierId ? (tierIdMap.get(z.tierId) || z.tierId) : undefined;
      updatedZones[zId] = { ...z, tierId: mappedTierId };
    });

    setZones(updatedZones);
    return { syncedTiers, updatedZones };
  };

  const buildZonesPayload = (targetZones: Record<string, ZoneBlock> = zones) => {
    return Object.entries(targetZones).map(([zId, z]) => {
      const rawZone = z as any;
      const shapeVal = rawZone.shape || rawZone.shapeType || 'RECTANGLE';
      const pointsVal = rawZone.points;
      return {
        id: zId,
        name: z.name,
        ticketTypeId: z.tierId || null,
        shapeType: String(shapeVal).toUpperCase(),
        colorCode: z.color,
        fillColor: z.fillColor || z.color,
        strokeColor: z.strokeColor || z.color,
        curvature: z.curvature ?? 16,
        x: z.x ?? 100,
        y: z.y ?? 100,
        width: z.width ?? 300,
        height: z.height ?? 180,
        rotation: z.rotation ?? 0,
        points: pointsVal ? (typeof pointsVal === 'string' ? pointsVal : JSON.stringify(pointsVal)) : null,
        capacity: z.capacity || (seats.filter((s) => s.zoneId === zId).length || 100),
      };
    });
  };

  // 1. Save as Draft
  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      const { syncedTiers, updatedZones } = await syncTiersAndGetUpdatedData();

      const payload = buildSeatMapDocument({
        name: eventName,
        venueTemplateId: selectedTemplateId,
        canvasSettings,
        zones: updatedZones,
        stages,
        structures,
        seats,
        ticketTiers: syncedTiers,
      });

      await ticketApi.saveSeatLayoutDraft(activeEventId, {
        eventId: activeEventId,
        draftJson: JSON.stringify(payload),
        svgData: generateSeatMapSVG(payload),
        imageUrl: null,
        status: 'DRAFT',
        zones: buildZonesPayload(updatedZones),
      });

      await onSave?.(payload);
      setLayoutStatus('DRAFT');
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 2500);
      setAutoSaveStatus('Đã lưu bản nháp vào CSDL!');
      showToast('info', 'Đã lưu bản nháp sơ đồ ghế (DRAFT) thành công!');
    } catch (err) {
      console.error('Error saving seat layout draft:', err);
      showToast('error', 'Đã xảy ra lỗi khi kết nối tới backend để lưu bản nháp!');
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Save Official (Publish Layout)
  const handlePublishOfficial = async () => {
    const unassignedZones = Object.values(zones).filter((zone) => !zone.tierId);
    if (unassignedZones.length > 0) {
      showToast('warning', `Có ${unassignedZones.length} khu vực chưa gán Hạng vé! Vui lòng kiểm tra lại.`);
    }

    try {
      setIsSaving(true);
      const { syncedTiers, updatedZones } = await syncTiersAndGetUpdatedData();

      const payload = buildSeatMapDocument({
        name: eventName,
        venueTemplateId: selectedTemplateId,
        canvasSettings,
        zones: updatedZones,
        stages,
        structures,
        seats,
        ticketTiers: syncedTiers,
      });

      await ticketApi.publishSeatLayout(activeEventId, {
        eventId: activeEventId,
        draftJson: JSON.stringify(payload),
        svgData: generateSeatMapSVG(payload),
        imageUrl: null,
        status: 'PUBLISHED',
        zones: buildZonesPayload(updatedZones),
      });

      await onSave?.(payload);
      setLayoutStatus('PUBLISHED');
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 2500);
      setAutoSaveStatus('Đã xuất bản sơ đồ chính thức!');
      showToast('success', 'ĐÃ LƯU CHÍNH THỨC & XUẤT BẢN (PUBLISHED) SƠ ĐỒ GHẾ THÀNH CÔNG!');
    } catch (err) {
      console.error('Error publishing seat layout:', err);
      showToast('error', 'Đã xảy ra lỗi khi xuất bản sơ đồ ghế lên CSDL!');
    } finally {
      setIsSaving(false);
    }
  };

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

  const assignedZoneCount = Object.values(zones).filter((zone) => zone.tierId).length;

  return (
    <div ref={studioRef} className={`seat-studio-root ${isFullscreen ? 'is-fullscreen' : ''}`}>
      <div className="seat-studio-header">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="seat-studio-badge">HALOTICKET</span>
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.16em]">Seat Map Studio</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold">
              {autoSaveStatus}
            </span>
            {layoutStatus === 'PUBLISHED' ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold tracking-wide flex items-center gap-1">
                <FiCheckCircle className="w-3 h-3" /> CHÍNH THỨC (PUBLISHED)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-extrabold tracking-wide">
                BẢN NHÁP (DRAFT)
              </span>
            )}
          </div>
          <h2 className="text-base font-black app-text-main truncate mt-1">{eventName}</h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {previousSnapshotBeforePreset && (
            <button
              type="button"
              onClick={handleRevertToPreviousVersion}
              className="seat-studio-secondary-button border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 font-bold flex items-center gap-1.5"
              title="Khôi phục lại sơ đồ trước khi áp dụng mẫu địa điểm"
            >
              <FiRefreshCw className="w-3.5 h-3.5" />
              <span>Khôi phục bản trước</span>
            </button>
          )}
          <button type="button" onClick={() => setIsTemplateModalOpen(true)} className="seat-studio-secondary-button"><FiLayers className="w-4 h-4" />Mẫu địa điểm <span className="seat-studio-badge ml-1">{templates.length}</span></button>
          <button type="button" onClick={() => setIsTierModalOpen(true)} className="seat-studio-secondary-button"><FiTag className="w-4 h-4" />Hạng vé <span className="seat-studio-badge ml-1">{assignedZoneCount}/{Object.keys(zones).length}</span></button>
          <button type="button" onClick={handleExportImage} className="seat-studio-secondary-button border-teal-500/30 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10" title="Xuất file ảnh PNG sơ đồ sự kiện"><FiCamera className="w-4 h-4" />Xuất ảnh sơ đồ</button>

          <button type="button" onClick={handleOpenJSONModal} className="seat-studio-icon-button" title="Import/Export JSON"><FiDownload /></button>
          <button type="button" onClick={handleClearCanvas} className="seat-studio-icon-button text-rose-500" title="Xóa canvas"><FiTrash2 /></button>
          
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="seat-studio-secondary-button border-amber-500/40 text-amber-500 hover:bg-amber-500/10 font-bold"
            title="Lưu tạm sơ đồ dưới dạng Bản nháp"
          >
            <FiSave className="w-4 h-4" />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu nháp'}</span>
          </button>
          <button
            type="button"
            onClick={handlePublishOfficial}
            disabled={isSaving}
            className="seat-studio-primary-button bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md"
            title="Xuất bản chính thức sơ đồ ghế cho khán giả mua vé"
          >
            <FiSend className="w-4 h-4" />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu chính thức'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="seat-studio-save-toast"><FiCheckCircle className="w-4 h-4" />Đã lưu Seat Map thành công.</div>
      )}

      <SeatMapStats seats={seats} tiers={effectiveTiers} zones={zones} stages={stages} structures={structures} compact />

      <div className={`flex flex-row gap-3 items-start w-full ${isFullscreen ? 'flex-1 min-h-0' : ''}`}>
        {/* Left Toolbar Column (ToolBar) - Compact vertical strip */}
        {!isAttendeeMode && (
          <div className="w-12 flex-shrink-0 sticky top-4 z-20">
            <ToolBar
              zones={zones}
              tiers={effectiveTiers}
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
        )}

        {/* Center Canvas Column (SeatCanvas) - Expands to fill available space */}
        <div className={`flex-1 min-w-0 ${isFullscreen ? 'h-full flex flex-col' : ''}`}>
          <SeatCanvas
            seats={seats}
            stages={stages}
            structures={structures}
            zones={zones}
            tiers={effectiveTiers}
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
            onCommitHistory={() => window.requestAnimationFrame(() => pushHistory())}
            isAttendeeMode={isAttendeeMode}
            attendeeCart={attendeeCart}
            onToggleAttendeeSeat={handleToggleAttendeeSeat}
            onSelectZoneAttendee={(zone) => {
              setSelectedZoneModal(zone);
              setZoneTicketQuantity(1);
            }}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            onCanvasClickPosition={setLastClickedPos}
          />
        </div>

        {/* Right Inspector Column (PropertyPanel / AttendeePreview) */}
        <div
          className={`transition-all duration-200 flex-shrink-0 sticky top-4 z-20 ${isPropertyPanelCollapsed ? 'w-12' : 'w-full lg:w-80'
            }`}
        >
          {!isAttendeeMode ? (
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
              tiers={effectiveTiers}
              onUpdateSeatProps={handleUpdateSeatProps}
              onUpdateStageProps={handleUpdateStageProps}
              onUpdateStructureProps={handleUpdateStructureProps}
              onUpdateZoneProps={handleUpdateZoneProps}
              onMoveSeatsToZone={handleMoveSeatsToZone}
              onArrangeSeats={handleArrangeSeats}
              onDeleteSelected={handleDeleteSelected}
            />
          ) : (
            <AttendeePreview
              cart={attendeeCart}
              tiers={effectiveTiers}
              zones={zones}
              onRemoveCartSeat={(seatId) => setAttendeeCart((prev) => prev.filter((seat) => seat.id !== seatId))}
              onClearCart={() => setAttendeeCart([])}
            />
          )}
        </div>
      </div>

      <VenueTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        onSelectTemplate={handleLoadPreset}
        venueId={eventVenue?.id}
        venueName={eventVenue?.name}
      />

      <TierManagerModal
        isOpen={isTierModalOpen}
        onClose={() => setIsTierModalOpen(false)}
        tiers={effectiveTiers}
        readOnly={true}
      />

      {isJSONModalOpen && (
        <div className="seat-studio-modal-backdrop" onMouseDown={() => setIsJSONModalOpen(false)}>
          <div className="seat-studio-modal max-w-3xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="h-14 px-5 border-b app-border flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black app-text-main">Import / Export Seat Map JSON v2.0</h3>
                <p className="text-[10px] app-text-muted">Import không ghi đè danh sách giá vé của sự kiện hiện tại.</p>
              </div>
              <button type="button" onClick={() => setIsJSONModalOpen(false)} className="seat-studio-icon-button"><FiX /></button>
            </div>
            <div className="p-5 space-y-4">
              <textarea rows={18} value={jsonText} onChange={(e) => setJsonText(e.target.value)} className="seat-studio-input font-mono text-[11px] resize-y" />
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(jsonText);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1600);
                  }}
                  className="seat-studio-secondary-button"
                >
                  {copied ? <FiCheck /> : <FiCopy />} {copied ? 'Đã sao chép' : 'Sao chép JSON'}
                </button>
                <button type="button" onClick={handleImportJSON} className="seat-studio-primary-button"><FiUpload />Nạp JSON vào Studio</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zone Ticket Selector Modal for Preview Mode */}
      {selectedZoneModal && (
        <div className="seat-studio-modal-backdrop" onMouseDown={() => setSelectedZoneModal(null)}>
          <div className="seat-studio-modal max-w-md p-6 space-y-4" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b app-border pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">Khán giả chọn mua vé theo Zone</span>
                <h3 className="text-base font-black app-text-main mt-0.5">{selectedZoneModal.name}</h3>
              </div>
              <button type="button" onClick={() => setSelectedZoneModal(null)} className="seat-studio-icon-button"><FiX /></button>
            </div>

            <div className="p-4 rounded-xl app-bg-main border app-border space-y-2 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="app-text-muted">Hạng vé đính kèm:</span>
                <span className="font-bold text-blue-500">
                  {effectiveTiers.find((t) => t.id === selectedZoneModal.tierId)?.name || 'Vé Tiêu Chuẩn'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="app-text-muted">Đơn giá:</span>
                <span className="font-bold text-emerald-500">
                  {(selectedZoneModal.price ?? effectiveTiers.find((t) => t.id === selectedZoneModal.tierId)?.price ?? 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
              {selectedZoneModal.capacity && (
                <div className="flex items-center justify-between text-xs">
                  <span className="app-text-muted">Sức chứa tối đa:</span>
                  <span className="font-bold app-text-main">{selectedZoneModal.capacity} vé</span>
                </div>
              )}
            </div>

            {/* Quantity Counter */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold app-text-muted uppercase">Chọn Số Lượng Vé</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setZoneTicketQuantity((prev) => Math.max(1, prev - 1))}
                  className="w-10 h-10 rounded-xl app-bg-main border app-border font-bold text-lg hover:border-emerald-500/40 transition-colors cursor-pointer"
                >
                  -
                </button>
                <span className="flex-1 text-center font-mono font-extrabold text-lg app-text-main">
                  {zoneTicketQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => setZoneTicketQuantity((prev) => Math.min(10, prev + 1))}
                  className="w-10 h-10 rounded-xl app-bg-main border app-border font-bold text-lg hover:border-emerald-500/40 transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Total Calculation */}
            <div className="flex items-center justify-between pt-2 border-t app-border">
              <span className="text-xs font-bold app-text-muted">Tổng tiền tạm tính:</span>
              <span className="font-mono text-lg font-black text-emerald-500">
                {((selectedZoneModal.price ?? effectiveTiers.find((t) => t.id === selectedZoneModal.tierId)?.price ?? 0) * zoneTicketQuantity).toLocaleString('vi-VN')} đ
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                const baseId = Date.now();
                const newZoneCartSeats: Seat[] = Array.from({ length: zoneTicketQuantity }, (_, idx) => ({
                  id: `cart_zone_${selectedZoneModal.id}_${baseId}_${idx}`,
                  row: selectedZoneModal.name,
                  number: idx + 1,
                  x: 0,
                  y: 0,
                  zoneId: selectedZoneModal.id,
                  tierId: selectedZoneModal.tierId,
                  status: 'available',
                }));

                setAttendeeCart((prev) => [...prev, ...newZoneCartSeats]);
                setSelectedZoneModal(null);
                setZoneTicketQuantity(1);
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Thêm {zoneTicketQuantity} Vé Vào Giỏ Hàng</span>
            </button>
          </div>
        </div>
      )}

      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

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

export default EventSeatingMap;
