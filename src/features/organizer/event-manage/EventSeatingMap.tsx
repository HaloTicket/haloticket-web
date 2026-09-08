import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiCheck,
  FiCheckCircle,
  FiCopy,
  FiDownload,
  FiEdit3,
  FiEye,
  FiLayers,
  FiSave,
  FiTag,
  FiTrash2,
  FiUpload,
  FiX,
} from 'react-icons/fi';
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
    Object.entries(zones).map(([id, zone]) => [
      id,
      {
        ...zone,
        tierId: zone.tierId && validIds.has(zone.tierId) ? zone.tierId : undefined,
        price: undefined,
      },
    ])
  );
};

// event seating map studio component
export const EventSeatingMap: React.FC<EventSeatingMapProps> = ({
  eventName = 'Sự kiện mới',
  ticketTiers,
  initialMap,
  onSave,
}) => {
  const effectiveTiers = useMemo(
    () => (ticketTiers?.length ? ticketTiers : DEFAULT_EVENT_TICKET_TIERS),
    [ticketTiers]
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
      seats: safeClone(defaultLayout.seats),
      stages: safeClone(defaultLayout.stages),
      structures: safeClone(defaultLayout.structures),
      zones: safeClone(defaultLayout.zones),
      canvasSettings: safeClone(defaultLayout.canvasSettings),
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

  const [isAttendeeMode, setIsAttendeeMode] = useState(false);
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
  const [isPropertyPanelCollapsed, setIsPropertyPanelCollapsed] = useState(false);
  const [lastClickedPos, setLastClickedPos] = useState<{ x: number; y: number } | null>(null);

  const latestRef = useRef<StudioSnapshot>(initialSnapshot);
  useEffect(() => {
    latestRef.current = { seats, stages, structures, zones, canvasSettings };
  }, [canvasSettings, seats, stages, structures, zones]);

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
      spacing = configOrLetter.spacing || 32;
    } else {
      rowLetter = (configOrLetter as string) || 'A';
      count = countVal || 12;
      zoneId = zoneIdVal || '';
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
      spacingX = configOrRows.spacingX || 32;
      spacingY = configOrRows.spacingY || 32;
      aisleAfter = configOrRows.aisleAfter || 0;
      aisleGap = configOrRows.aisleGap || 0;
    } else {
      rowCount = typeof configOrRows === 'number' ? configOrRows : 4;
      cols = colsVal || 10;
      startRowLetter = startRowLetterVal || 'A';
      zoneId = zoneIdVal || '';
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
    let color = colorVal || ['#2563eb', '#7c3aed', '#0891b2', '#0f766e', '#d97706'][index % 5];
    let width = widthVal || 820;
    let height = heightVal || 180;
    let borderStyle: 'dashed' | 'solid' = borderStyleVal || 'dashed';
    let shape: any = undefined;
    let type: any = undefined;
    let rows = rowsVal ?? 0;
    let cols = colsVal ?? 0;

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
    } else if (typeof configOrName === 'string') {
      name = configOrName || name;
    }

    const tier = effectiveTiers.find((item) => item.id === tierId);
    const zoneX = lastClickedPos ? lastClickedPos.x : 120 + (index % 5) * 28;
    const zoneY = lastClickedPos ? lastClickedPos.y : 220 + (index % 5) * 28;

    const newZone: ZoneBlock = {
      id,
      name,
      tierId,
      price: price ?? tier?.price,
      color: tier?.color || color,
      shape,
      type,
      x: zoneX,
      y: zoneY,
      width,
      height,
      borderStyle,
      fillOpacity: 0.12,
      rotation: 0,
    };

    const baseId = Date.now();
    const generatedSeats: Seat[] = [];

    if (rows > 0 && cols > 0) {
      const spacingX = Math.min(36, Math.max(24, Math.floor((width - 60) / Math.max(1, cols))));
      const spacingY = Math.min(36, Math.max(24, Math.floor((height - 60) / Math.max(1, rows))));
      const startX = Math.round(zoneX + (width - cols * spacingX) / 2 + spacingX / 2);
      const startY = Math.round(zoneY + 45);

      for (let r = 0; r < rows; r++) {
        const rowName = String.fromCharCode(65 + r);
        for (let c = 0; c < cols; c++) {
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
    let nextZones = zones;

    if (selectedSeatIds.length) {
      nextSeats = seats.filter((seat) => !selectedSeatIds.includes(seat.id));
    } else if (selectedStageId) {
      nextStages = stages.filter((stage) => stage.id !== selectedStageId);
    } else if (selectedStructureId) {
      nextStructures = structures.filter((item) => item.id !== selectedStructureId);
    } else if (selectedZoneId) {
      const seatCount = seats.filter((seat) => seat.zoneId === selectedZoneId).length;
      if (seatCount && !window.confirm(`Khu vực này đang chứa ${seatCount} ghế. Xóa khu vực sẽ xóa luôn các ghế đó. Tiếp tục?`)) return;
      nextSeats = seats.filter((seat) => seat.zoneId !== selectedZoneId);
      const { [selectedZoneId]: _removed, ...rest } = zones;
      nextZones = rest;
    } else {
      return;
    }

    setSeats(nextSeats);
    setStages(nextStages);
    setStructures(nextStructures);
    setZones(nextZones);
    resetSelection();
    commitWith({ seats: nextSeats, stages: nextStages, structures: nextStructures, zones: nextZones });
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
  };

  const handleSaveAsTemplate = () => {
    const name = window.prompt('Tên mẫu địa điểm / bố cục muốn lưu:');
    if (!name?.trim()) return;
    const template: VenueTemplate = {
      id: `organizer_${Date.now()}`,
      name: name.trim(),
      description: 'Mẫu được sao chép từ Seat Map Studio. Hạng vé và giá không được lưu theo template.',
      source: 'organizer',
      updatedAt: new Date().toISOString(),
      capacity: seats.length,
      eventsHosted: 1,
      rating: 5,
      stages: safeClone(stages),
      structures: safeClone(structures),
      seats: seats.map((seat) => ({ ...safeClone(seat), tierId: undefined, status: seat.status === 'accessible' ? 'accessible' : 'available' })),
      zones: Object.fromEntries(Object.entries(zones).map(([id, zone]) => [id, { ...safeClone(zone), tierId: undefined, price: undefined }])),
      canvasSettings: safeClone(canvasSettings),
    };
    setTemplates((prev) => [template, ...prev]);
    setSelectedTemplateId(template.id);
    window.alert('Đã lưu mẫu trong phiên làm việc hiện tại. Khi nối backend, hãy thay bằng API lưu template của địa điểm.');
  };

  const handleClearCanvas = () => {
    if (!window.confirm('Xóa toàn bộ ghế, khu vực, sân khấu và tiện ích trên canvas?')) return;
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
    } catch {
      window.alert('JSON không đúng định dạng Seat Map v2.0.');
    }
  };

  const handleSave = async () => {
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

    const unassignedZones = Object.values(zones).filter((zone) => !zone.tierId);
    if (unassignedZones.length && !window.confirm(`Có ${unassignedZones.length} khu vực chưa gán hạng vé. Vẫn lưu bản nháp?`)) return;

    try {
      setIsSaving(true);
      await onSave?.(payload);
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 2500);
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
          </div>
          <h2 className="text-base font-black app-text-main truncate mt-1">{eventName}</h2>
          <p className="text-[11px] app-text-muted mt-0.5">Thiết kế mặt bằng kéo thả · gán hạng vé theo khu vực · preview người mua vé</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button type="button" onClick={() => setIsTemplateModalOpen(true)} className="seat-studio-secondary-button"><FiLayers className="w-4 h-4" />Mẫu địa điểm <span className="seat-studio-badge ml-1">{templates.length}</span></button>
          <button type="button" onClick={() => setIsTierModalOpen(true)} className="seat-studio-secondary-button"><FiTag className="w-4 h-4" />Hạng vé <span className="seat-studio-badge ml-1">{assignedZoneCount}/{Object.keys(zones).length}</span></button>
          <button type="button" onClick={handleSaveAsTemplate} className="seat-studio-secondary-button"><FiCopy className="w-4 h-4" />Lưu làm mẫu</button>

          <div className="seat-studio-mode-switch">
            <button type="button" onClick={() => setIsAttendeeMode(false)} className={!isAttendeeMode ? 'is-active' : ''}><FiEdit3 />Thiết kế</button>
            <button type="button" onClick={() => setIsAttendeeMode(true)} className={isAttendeeMode ? 'is-active is-preview' : ''}><FiEye />Preview</button>
          </div>

          <button type="button" onClick={handleOpenJSONModal} className="seat-studio-icon-button" title="Import/Export JSON"><FiDownload /></button>
          <button type="button" onClick={handleClearCanvas} className="seat-studio-icon-button text-rose-500" title="Xóa canvas"><FiTrash2 /></button>
          {!isAttendeeMode && <button type="button" onClick={handleSave} disabled={isSaving} className="seat-studio-primary-button"><FiSave className="w-4 h-4" />{isSaving ? 'Đang lưu...' : 'Lưu sơ đồ'}</button>}
        </div>
      </div>

      {saveSuccess && (
        <div className="seat-studio-save-toast"><FiCheckCircle className="w-4 h-4" />Đã lưu Seat Map thành công.</div>
      )}

      <SeatMapStats seats={seats} tiers={effectiveTiers} zones={zones} stages={stages} structures={structures} compact />

      <div className="flex flex-row gap-3 items-start w-full">
        {/* Left Toolbar Column (ToolBar) - Compact vertical strip */}
        {!isAttendeeMode && (
          <div className="w-12 flex-shrink-0">
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
        <div className="flex-1 min-w-0">
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
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            onCanvasClickPosition={setLastClickedPos}
          />
        </div>

        {/* Right Inspector Column (PropertyPanel / AttendeePreview) */}
        <div
          className={`transition-all duration-200 flex-shrink-0 ${isPropertyPanelCollapsed ? 'w-12' : 'w-full lg:w-80'
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
      />

      <TierManagerModal
        isOpen={isTierModalOpen}
        onClose={() => setIsTierModalOpen(false)}
        tiers={effectiveTiers}
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
    </div>
  );
};

export default EventSeatingMap;
