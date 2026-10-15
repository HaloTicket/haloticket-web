import React, { useState, useRef, useEffect } from 'react';
import {
  FiZoomIn,
  FiZoomOut,
  FiRotateCcw,
  FiRotateCw,
  FiMove,
  FiTool,
  FiLock,
  FiShield,
  FiUserCheck,
  FiMaximize2,
  FiMinimize2,
  FiGrid,
  FiRotateCcw as FiUndo,
  FiRotateCw as FiRedo,
} from 'react-icons/fi';
import type { Seat, StageElement, StructureElement, ZoneBlock, SeatCanvasProps } from '@/types/seating';
import { isSeatInsideZone, reassignSeatZones } from '@/utils/seatMapHelpers';

// studio canvas interactive seating map component
export const SeatCanvas: React.FC<SeatCanvasProps> = ({
  seats,
  stages,
  structures,
  zones,
  tiers,
  canvasSettings: _canvasSettings,
  selectedSeatIds,
  setSelectedSeatIds,
  selectedStageId,
  setSelectedStageId,
  selectedStructureId,
  setSelectedStructureId,
  selectedZoneId,
  setSelectedZoneId,
  onUpdateSeats,
  onUpdateStages,
  onUpdateStructures,
  onUpdateZones,
  onUpdateCanvasSettings: _onUpdateCanvasSettings,
  onDeleteSelected,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onCommitHistory: _onCommitHistory,
  isAttendeeMode = false,
  attendeeCart = [],
  onToggleAttendeeSeat,
  onSelectZoneAttendee,
  isFullscreen = false,
  onToggleFullscreen,
  onCanvasClickPosition,
  seatStatusMap = {},
}) => {
  const getZonePrice = (zone?: ZoneBlock | Partial<ZoneBlock>) => zone?.price ?? tiers?.find((t) => t.id === zone?.tierId)?.price ?? 0;
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [gridSnap, setGridSnap] = useState<boolean>(true);

  const canvasRef = useRef<HTMLDivElement | null>(null);

  // marquee selection box state
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const selectionBoxRef = useRef<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  const isSelectingMarquee = useRef<boolean>(false);

  // pointer capture dragging state for single/multi elements & rotations
  const draggingRef = useRef<{
    type:
    | 'ELEMENTS'
    | 'RESIZE_STAGE'
    | 'RESIZE_STRUCTURE'
    | 'RESIZE_ZONE'
    | 'ROTATE_ZONE'
    | 'ROTATE_STAGE'
    | 'ROTATE_STRUCTURE';
    id?: string;
    handleDir?: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
    startMouseX: number;
    startMouseY: number;
    centerX?: number;
    centerY?: number;
    initialRotation?: number;
    initialSeats: Map<string, { x: number; y: number; rotation?: number }>;
    initialStages: Map<string, { x: number; y: number; width: number; height: number }>;
    initialStructures: Map<string, { x: number; y: number; width: number; height: number }>;
    initialZones: Map<string, { x: number; y: number; width: number; height: number }>;
  } | null>(null);

  const getBoundingBox = () => {
    const zoneList = !zones ? [] : Array.isArray(zones) ? (zones as ZoneBlock[]) : Object.values(zones as Record<string, ZoneBlock>);
    const stageList = stages || [];
    const structureList = structures || [];
    const seatList = seats || [];

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    zoneList.forEach((z) => {
      if (z.x != null && z.y != null) {
        minX = Math.min(minX, z.x);
        minY = Math.min(minY, z.y);
        maxX = Math.max(maxX, z.x + (z.width || 200));
        maxY = Math.max(maxY, z.y + (z.height || 150));
      }
    });

    stageList.forEach((s) => {
      if (s.x != null && s.y != null) {
        minX = Math.min(minX, s.x);
        minY = Math.min(minY, s.y);
        maxX = Math.max(maxX, s.x + (s.width || 300));
        maxY = Math.max(maxY, s.y + (s.height || 100));
      }
    });

    structureList.forEach((st) => {
      if (st.x != null && st.y != null) {
        minX = Math.min(minX, st.x);
        minY = Math.min(minY, st.y);
        maxX = Math.max(maxX, st.x + (st.width || 100));
        maxY = Math.max(maxY, st.y + (st.height || 100));
      }
    });

    seatList.forEach((st) => {
      if (st.x != null && st.y != null) {
        minX = Math.min(minX, st.x);
        minY = Math.min(minY, st.y);
        maxX = Math.max(maxX, st.x + 30);
        maxY = Math.max(maxY, st.y + 30);
      }
    });

    if (minX === Infinity) {
      minX = 0;
      maxX = 1200;
      minY = 0;
      maxY = 800;
    }

    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
  };

  // Auto-fit zoom calculation for Attendee Mode based on tight content bounding box
  useEffect(() => {
    if (isAttendeeMode && canvasRef.current) {
      const bbox = getBoundingBox();
      const el = canvasRef.current;
      const padding = 50;
      const contentW = bbox.width + padding * 2;
      const contentH = bbox.height + padding * 2;

      const fitZoomW = Math.floor((el.clientWidth / contentW) * 100);
      const fitZoomH = Math.floor((el.clientHeight / contentH) * 100);
      const fitZoom = Math.min(fitZoomW, fitZoomH);
      const clampedZoom = Math.min(Math.max(fitZoom, 35), 85);

      setZoomLevel(clampedZoom);

      setTimeout(() => {
        if (canvasRef.current) {
          const scale = clampedZoom / 100;
          const targetX = Math.max(0, (bbox.minX - padding) * scale);
          const targetY = Math.max(0, (bbox.minY - padding) * scale);
          canvasRef.current.scrollLeft = targetX;
          canvasRef.current.scrollTop = targetY;
        }
      }, 60);
    } else if (canvasRef.current) {
      const el = canvasRef.current;
      el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
    }
  }, [isAttendeeMode, zones, seats, stages, structures]);

  // Mouse wheel interaction: Ctrl+Wheel to Zoom, Shift+Wheel to Scroll Horizontally
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    let rafId: number | null = null;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 10 : -10;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          setZoomLevel((prev) => Math.min(Math.max(prev + delta, 40), 200));
        });
      } else if (e.shiftKey) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Global window listeners for marquee selection to ensure smooth, decisive drag selection & release
  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent) => {
      if (!isSelectingMarquee.current || !canvasRef.current || !selectionBoxRef.current) return;
      const scale = zoomLevel / 100;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left + canvasRef.current.scrollLeft) / scale;
      const y = (e.clientY - rect.top + canvasRef.current.scrollTop) / scale;

      const prev = selectionBoxRef.current;
      const nextBox = { ...prev, currentX: x, currentY: y };
      selectionBoxRef.current = nextBox;
      setSelectionBox(nextBox);

      const boxMinX = Math.min(prev.startX, x);
      const boxMaxX = Math.max(prev.startX, x);
      const boxMinY = Math.min(prev.startY, y);
      const boxMaxY = Math.max(prev.startY, y);

      // Intersect Seats
      const selectedInBox = seats
        .filter((s) => s.x >= boxMinX && s.x <= boxMaxX && s.y >= boxMinY && s.y <= boxMaxY)
        .map((s) => s.id);
      setSelectedSeatIds(selectedInBox);

      // Intersect Stage
      const intersectedStage = stages.find(
        (stg) =>
          stg.x + stg.width >= boxMinX &&
          stg.x <= boxMaxX &&
          stg.y + stg.height >= boxMinY &&
          stg.y <= boxMaxY
      );
      setSelectedStageId(intersectedStage ? intersectedStage.id : null);

      // Intersect Structure
      const intersectedStruct = structures.find(
        (st) =>
          st.x + st.width >= boxMinX &&
          st.x <= boxMaxX &&
          st.y + st.height >= boxMinY &&
          st.y <= boxMaxY
      );
      setSelectedStructureId(intersectedStruct ? intersectedStruct.id : null);

      // Intersect Zone
      if (setSelectedZoneId) {
        const zoneList = !zones ? [] : Array.isArray(zones) ? (zones as ZoneBlock[]) : Object.values(zones as Record<string, ZoneBlock>);
        const intersectedZone = zoneList.find(
          (z) =>
            z.x &&
            z.y &&
            z.width &&
            z.height &&
            z.x + z.width >= boxMinX &&
            z.x <= boxMaxX &&
            z.y + z.height >= boxMinY &&
            z.y <= boxMaxY
        );
        setSelectedZoneId(intersectedZone ? intersectedZone.id : null);
      }
    };

    const handleWindowPointerUp = () => {
      if (isSelectingMarquee.current) {
        isSelectingMarquee.current = false;
        selectionBoxRef.current = null;
        setSelectionBox(null);
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [zoomLevel, seats, stages, structures, zones, setSelectedSeatIds, setSelectedStageId, setSelectedStructureId, setSelectedZoneId]);

  // global keyboard listener for Ctrl+Z, Ctrl+Y, Delete, Backspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      // Ctrl + Z (Undo)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo && onUndo) onUndo();
      }

      // Ctrl + Y or Ctrl + Shift + Z (Redo)
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        if (canRedo && onRedo) onRedo();
      }

      // delete or backspace (Delete selected)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedSeatIds.length > 0 || selectedStageId || selectedStructureId || selectedZoneId) {
          e.preventDefault();
          onDeleteSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSeatIds, selectedStageId, selectedStructureId, selectedZoneId, onDeleteSelected, onUndo, onRedo, canUndo, canRedo]);

  // zoom handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 15, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 15, 40));
  const handleResetZoom = () => setZoomLevel(100);

  // helper to store initial positions for unified dragging
  const createInitialMap = (
    activeSeatIds: string[],
    activeStageId: string | null,
    activeStructId: string | null,
    activeZoneId: string | null
  ) => {
    const seatMap = new Map<string, { x: number; y: number; rotation?: number }>();

    (seats || []).forEach((s) => {
      const isTargetSeat =
        (activeSeatIds || []).includes(s.id) ||
        (activeZoneId ? s.zoneId === activeZoneId : false);
      if (isTargetSeat) {
        seatMap.set(s.id, { x: s.x, y: s.y, rotation: s.rotation || 0 });
      }
    });

    const stageMap = new Map<string, { x: number; y: number; width: number; height: number }>();
    if (activeStageId && stages) {
      const stg = stages.find((s) => s.id === activeStageId);
      if (stg) stageMap.set(stg.id, { x: stg.x, y: stg.y, width: stg.width, height: stg.height });
    }

    const structMap = new Map<string, { x: number; y: number; width: number; height: number }>();
    if (activeStructId && structures) {
      const st = structures.find((s) => s.id === activeStructId);
      if (st) structMap.set(st.id, { x: st.x, y: st.y, width: st.width, height: st.height });
    }

    const zoneMap = new Map<string, { x: number; y: number; width: number; height: number }>();
    if (activeZoneId && zones) {
      const z = Array.isArray(zones)
        ? (zones as ZoneBlock[]).find((zn) => zn.id === activeZoneId)
        : (zones as Record<string, ZoneBlock>)?.[activeZoneId];
      if (z) {
        zoneMap.set(z.id, { x: z.x || 100, y: z.y || 100, width: z.width || 800, height: z.height || 180 });
      }
    }

    return { seatMap, stageMap, structMap, zoneMap };
  };

  // marquee selection box pointer down anywhere on canvas or zone background
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (isAttendeeMode || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scale = zoomLevel / 100;
    const x = (e.clientX - rect.left + canvasRef.current.scrollLeft) / scale;
    const y = (e.clientY - rect.top + canvasRef.current.scrollTop) / scale;

    onCanvasClickPosition?.({ x: Math.round(x), y: Math.round(y) });

    isSelectingMarquee.current = true;
    const startBox = { startX: x, startY: y, currentX: x, currentY: y };
    selectionBoxRef.current = startBox;
    setSelectionBox(startBox);

    if (!e.shiftKey && !e.ctrlKey) {
      setSelectedSeatIds([]);
      setSelectedStageId(null);
      setSelectedStructureId(null);
      if (setSelectedZoneId) setSelectedZoneId(null);
    }
  };

  // pointer down for seats
  const handlePointerDownSeat = (e: React.PointerEvent, seat: Seat) => {
    if (isAttendeeMode) {
      e.stopPropagation();
      const statusFromMap = seatStatusMap ? seatStatusMap[seat.id] : undefined;
      const isSold = seat.status === 'sold' || statusFromMap === 'SOLD';
      const isHolding = seat.status === 'reserved' || statusFromMap === 'HELD' || statusFromMap === 'HOLDING';
      const isBlocked = seat.status === 'blocked' || seat.status === 'maintenance';

      if (isSold) {
        alert("Ghế này đã được bán.");
      } else if (isHolding) {
        alert("Ghế này đang được người khác giữ hoặc chờ thanh toán, vui lòng thử lại sau ít phút.");
      } else if (isBlocked) {
        alert("Ghế này hiện đang bị khóa.");
      } else if (onToggleAttendeeSeat) {
        onToggleAttendeeSeat(seat);
      }
      return;
    }

    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    let activeSelectedSeats = selectedSeatIds;
    if (e.shiftKey || e.ctrlKey) {
      activeSelectedSeats = selectedSeatIds.includes(seat.id)
        ? selectedSeatIds.filter((id) => id !== seat.id)
        : [...selectedSeatIds, seat.id];
      setSelectedSeatIds(activeSelectedSeats);
    } else {
      if (!selectedSeatIds.includes(seat.id)) {
        activeSelectedSeats = [seat.id];
        setSelectedSeatIds(activeSelectedSeats);
      }
    }

    const { seatMap, stageMap, structMap, zoneMap } = createInitialMap(
      activeSelectedSeats,
      selectedStageId,
      selectedStructureId,
      selectedZoneId || null
    );

    draggingRef.current = {
      type: 'ELEMENTS',
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      initialSeats: seatMap,
      initialStages: stageMap,
      initialStructures: structMap,
      initialZones: zoneMap,
    };
  };

  // pointer down for Stage
  const handlePointerDownStage = (e: React.PointerEvent, stage: StageElement) => {
    if (isAttendeeMode) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    setSelectedStageId(stage.id);

    const { seatMap, stageMap, structMap, zoneMap } = createInitialMap(
      selectedSeatIds,
      stage.id,
      selectedStructureId,
      selectedZoneId || null
    );

    draggingRef.current = {
      type: 'ELEMENTS',
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      initialSeats: seatMap,
      initialStages: stageMap,
      initialStructures: structMap,
      initialZones: zoneMap,
    };
  };

  // pointer down for Structure
  const handlePointerDownStructure = (e: React.PointerEvent, struct: StructureElement) => {
    if (isAttendeeMode) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    setSelectedStructureId(struct.id);

    const { seatMap, stageMap, structMap, zoneMap } = createInitialMap(
      selectedSeatIds,
      selectedStageId,
      struct.id,
      selectedZoneId || null
    );

    draggingRef.current = {
      type: 'ELEMENTS',
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      initialSeats: seatMap,
      initialStages: stageMap,
      initialStructures: structMap,
      initialZones: zoneMap,
    };
  };

  // pointer down for zone block container area
  const handlePointerDownZone = (e: React.PointerEvent, zone: ZoneBlock) => {
    if (isAttendeeMode) {
      e.stopPropagation();
      const zoneSeatsCount = seats.filter((s) => s.zoneId === zone.id || isSeatInsideZone(s, zone)).length;
      if (zoneSeatsCount > 0) {
        // Seated zone: Do NOT open zone modal on container click! Seats must be clicked directly.
        return;
      }
      onSelectZoneAttendee?.(zone);
      return;
    }
    const target = e.target as HTMLElement;
    const isHeaderTag = target.closest('[data-zone-header="true"]');

    if (!isHeaderTag && !e.shiftKey && !e.ctrlKey) {
      handleCanvasPointerDown(e);
      return;
    }

    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    if (setSelectedZoneId) setSelectedZoneId(zone.id);

    const { seatMap, stageMap, structMap, zoneMap } = createInitialMap(
      selectedSeatIds,
      selectedStageId,
      selectedStructureId,
      zone.id
    );

    draggingRef.current = {
      type: 'ELEMENTS',
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      initialSeats: seatMap,
      initialStages: stageMap,
      initialStructures: structMap,
      initialZones: zoneMap,
    };
  };

  // resize handlers
  const handlePointerDownResizeStage = (e: React.PointerEvent, stage: StageElement) => {
    if (isAttendeeMode) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const { seatMap, stageMap, structMap, zoneMap } = createInitialMap([], stage.id, null, null);
    draggingRef.current = {
      type: 'RESIZE_STAGE',
      id: stage.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      initialSeats: seatMap,
      initialStages: stageMap,
      initialStructures: structMap,
      initialZones: zoneMap,
    };
  };

  const handlePointerDownResizeStructure = (e: React.PointerEvent, struct: StructureElement) => {
    if (isAttendeeMode) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const { seatMap, stageMap, structMap, zoneMap } = createInitialMap([], null, struct.id, null);
    draggingRef.current = {
      type: 'RESIZE_STRUCTURE',
      id: struct.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      initialSeats: seatMap,
      initialStages: stageMap,
      initialStructures: structMap,
      initialZones: zoneMap,
    };
  };

  const handlePointerDownResizeZone = (
    e: React.PointerEvent,
    zone: ZoneBlock,
    dir: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' = 'se'
  ) => {
    if (isAttendeeMode) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const { seatMap, stageMap, structMap, zoneMap } = createInitialMap([], null, null, zone.id);
    draggingRef.current = {
      type: 'RESIZE_ZONE',
      id: zone.id,
      handleDir: dir,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      initialSeats: seatMap,
      initialStages: stageMap,
      initialStructures: structMap,
      initialZones: zoneMap,
    };
  };

  // rotation handlers
  const handlePointerDownRotateZone = (e: React.PointerEvent, zone: ZoneBlock) => {
    if (isAttendeeMode) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const cx = (zone.x || 0) + (zone.width || 800) / 2;
    const cy = (zone.y || 0) + (zone.height || 180) / 2;
    const { seatMap, stageMap, structMap, zoneMap } = createInitialMap([], null, null, zone.id);

    draggingRef.current = {
      type: 'ROTATE_ZONE',
      id: zone.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      centerX: cx,
      centerY: cy,
      initialRotation: zone.rotation || 0,
      initialSeats: seatMap,
      initialStages: stageMap,
      initialStructures: structMap,
      initialZones: zoneMap,
    };
  };

  const handlePointerDownRotateStage = (e: React.PointerEvent, stage: StageElement) => {
    if (isAttendeeMode) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const cx = stage.x + stage.width / 2;
    const cy = stage.y + stage.height / 2;
    const { seatMap, stageMap, structMap, zoneMap } = createInitialMap([], stage.id, null, null);

    draggingRef.current = {
      type: 'ROTATE_STAGE',
      id: stage.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      centerX: cx,
      centerY: cy,
      initialRotation: stage.rotation || 0,
      initialSeats: seatMap,
      initialStages: stageMap,
      initialStructures: structMap,
      initialZones: zoneMap,
    };
  };

  const handlePointerDownRotateStructure = (e: React.PointerEvent, struct: StructureElement) => {
    if (isAttendeeMode) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const cx = struct.x + struct.width / 2;
    const cy = struct.y + struct.height / 2;
    const { seatMap, stageMap, structMap, zoneMap } = createInitialMap([], null, struct.id, null);

    draggingRef.current = {
      type: 'ROTATE_STRUCTURE',
      id: struct.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      centerX: cx,
      centerY: cy,
      initialRotation: struct.rotation || 0,
      initialSeats: seatMap,
      initialStages: stageMap,
      initialStructures: structMap,
      initialZones: zoneMap,
    };
  };

  // ultra-smooth pointer move
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isAttendeeMode) return;
    const scale = zoomLevel / 100;
    const snap = (val: number) => (gridSnap ? Math.round(val / 5) * 5 : Math.round(val));

    // handle marquee box selection calculation across all elements
    if (isSelectingMarquee.current && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left + canvasRef.current.scrollLeft) / scale;
      const y = (e.clientY - rect.top + canvasRef.current.scrollTop) / scale;

      setSelectionBox((prev) => (prev ? { ...prev, currentX: x, currentY: y } : null));

      if (selectionBox) {
        const boxMinX = Math.min(selectionBox.startX, x);
        const boxMaxX = Math.max(selectionBox.startX, x);
        const boxMinY = Math.min(selectionBox.startY, y);
        const boxMaxY = Math.max(selectionBox.startY, y);

        // Intersect Seats
        const selectedInBox = seats
          .filter((s) => s.x >= boxMinX && s.x <= boxMaxX && s.y >= boxMinY && s.y <= boxMaxY)
          .map((s) => s.id);
        setSelectedSeatIds(selectedInBox);

        // intersect Stage
        const intersectedStage = stages.find(
          (stg) =>
            stg.x + stg.width >= boxMinX &&
            stg.x <= boxMaxX &&
            stg.y + stg.height >= boxMinY &&
            stg.y <= boxMaxY
        );
        setSelectedStageId(intersectedStage ? intersectedStage.id : null);

        // intersect Structure
        const intersectedStruct = structures.find(
          (st) =>
            st.x + st.width >= boxMinX &&
            st.x <= boxMaxX &&
            st.y + st.height >= boxMinY &&
            st.y <= boxMaxY
        );
        setSelectedStructureId(intersectedStruct ? intersectedStruct.id : null);

        // intersect Zone
        if (setSelectedZoneId) {
          const zoneList = !zones ? [] : Array.isArray(zones) ? (zones as ZoneBlock[]) : Object.values(zones as Record<string, ZoneBlock>);
          const intersectedZone = zoneList.find(
            (z) =>
              z.x &&
              z.y &&
              z.width &&
              z.height &&
              z.x + z.width >= boxMinX &&
              z.x <= boxMaxX &&
              z.y + z.height >= boxMinY &&
              z.y <= boxMaxY
          );
          setSelectedZoneId(intersectedZone ? intersectedZone.id : null);
        }
      }
      return;
    }

    if (!draggingRef.current) return;

    // rotation dragging calculation
    if (
      draggingRef.current.type === 'ROTATE_ZONE' ||
      draggingRef.current.type === 'ROTATE_STAGE' ||
      draggingRef.current.type === 'ROTATE_STRUCTURE'
    ) {
      const { type, id, centerX = 0, centerY = 0 } = draggingRef.current;
      if (!canvasRef.current || !id) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseCanvasX = (e.clientX - rect.left + canvasRef.current.scrollLeft) / scale;
      const mouseCanvasY = (e.clientY - rect.top + canvasRef.current.scrollTop) / scale;

      const dx = mouseCanvasX - centerX;
      const dy = mouseCanvasY - centerY;
      let angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI + 90);
      if (e.shiftKey) {
        angle = Math.round(angle / 15) * 15;
      }
      angle = ((angle % 360) + 360) % 360;

      if (type === 'ROTATE_ZONE' && onUpdateZones) {
        const initialRot = draggingRef.current.initialRotation || 0;
        const deltaDeg = angle - initialRot;
        const rad = (deltaDeg * Math.PI) / 180;
        const cosVal = Math.cos(rad);
        const sinVal = Math.sin(rad);

        onUpdateZones((prev) => ({
          ...prev,
          [id]: { ...prev[id], rotation: angle },
        }));

        const { initialSeats } = draggingRef.current;
        if (initialSeats && initialSeats.size > 0) {
          onUpdateSeats((prev) =>
            prev.map((s) => {
              const init = initialSeats.get(s.id);
              if (init) {
                const dx = init.x - centerX;
                const dy = init.y - centerY;
                const newX = Math.round(centerX + dx * cosVal - dy * sinVal);
                const newY = Math.round(centerY + dx * sinVal + dy * cosVal);
                const newRot = Math.round((((init.rotation || 0) + deltaDeg) % 360 + 360) % 360);
                return { ...s, x: newX, y: newY, rotation: newRot, zoneId: id };
              }
              return s;
            })
          );
        }
      } else if (type === 'ROTATE_STAGE') {
        onUpdateStages((prev) =>
          prev.map((s) => (s.id === id ? { ...s, rotation: angle } : s))
        );
      } else if (type === 'ROTATE_STRUCTURE') {
        onUpdateStructures((prev) =>
          prev.map((st) => (st.id === id ? { ...st, rotation: angle } : st))
        );
      }
      return;
    }

    const deltaX = (e.clientX - draggingRef.current.startMouseX) / scale;
    const deltaY = (e.clientY - draggingRef.current.startMouseY) / scale;

    if (draggingRef.current.type === 'ELEMENTS') {
      const { initialSeats, initialStages, initialStructures, initialZones } = draggingRef.current;

      if (initialSeats.size > 0) {
        onUpdateSeats((prev) =>
          prev.map((s) => {
            const init = initialSeats.get(s.id);
            if (init) {
              return { ...s, x: Math.max(10, snap(init.x + deltaX)), y: Math.max(10, snap(init.y + deltaY)) };
            }
            return s;
          })
        );
      }

      if (initialStages.size > 0) {
        onUpdateStages((prev) =>
          prev.map((stg) => {
            const init = initialStages.get(stg.id);
            if (init) {
              return { ...stg, x: Math.max(10, snap(init.x + deltaX)), y: Math.max(10, snap(init.y + deltaY)) };
            }
            return stg;
          })
        );
      }

      if (initialStructures.size > 0) {
        onUpdateStructures((prev) =>
          prev.map((st) => {
            const init = initialStructures.get(st.id);
            if (init) {
              return { ...st, x: Math.max(10, snap(init.x + deltaX)), y: Math.max(10, snap(init.y + deltaY)) };
            }
            return st;
          })
        );
      }

      if (initialZones.size > 0 && onUpdateZones) {
        onUpdateZones((prev) => {
          const next = { ...prev };
          initialZones.forEach((init, zoneId) => {
            if (next[zoneId]) {
              next[zoneId] = {
                ...next[zoneId],
                x: Math.max(10, snap(init.x + deltaX)),
                y: Math.max(10, snap(init.y + deltaY)),
              };
            }
          });
          return next;
        });
      }
    } else if (draggingRef.current.type === 'RESIZE_STAGE') {
      const init = draggingRef.current.initialStages.get(draggingRef.current.id!);
      if (init) {
        onUpdateStages((prev) =>
          prev.map((stg) =>
            stg.id === draggingRef.current?.id
              ? { ...stg, width: Math.max(100, snap(init.width + deltaX)), height: Math.max(40, snap(init.height + deltaY)) }
              : stg
          )
        );
      }
    } else if (draggingRef.current.type === 'RESIZE_STRUCTURE') {
      const init = draggingRef.current.initialStructures.get(draggingRef.current.id!);
      if (init) {
        onUpdateStructures((prev) =>
          prev.map((st) =>
            st.id === draggingRef.current?.id
              ? { ...st, width: Math.max(80, snap(init.width + deltaX)), height: Math.max(30, snap(init.height + deltaY)) }
              : st
          )
        );
      }
    } else if (draggingRef.current.type === 'RESIZE_ZONE' && onUpdateZones) {
      const init = draggingRef.current.initialZones.get(draggingRef.current.id!);
      const dir = draggingRef.current.handleDir || 'se';
      if (init) {
        let nextX = init.x;
        let nextY = init.y;
        let nextW = init.width;
        let nextH = init.height;

        if (dir.includes('e')) nextW = Math.max(150, snap(init.width + deltaX));
        if (dir.includes('s')) nextH = Math.max(80, snap(init.height + deltaY));

        if (dir.includes('w')) {
          const possibleW = init.width - deltaX;
          if (possibleW >= 150) {
            nextW = snap(possibleW);
            nextX = snap(init.x + deltaX);
          }
        }

        if (dir.includes('n')) {
          const possibleH = init.height - deltaY;
          if (possibleH >= 80) {
            nextH = snap(possibleH);
            nextY = snap(init.y + deltaY);
          }
        }

        onUpdateZones((prev) => ({
          ...prev,
          [draggingRef.current!.id!]: {
            ...prev[draggingRef.current!.id!],
            x: nextX,
            y: nextY,
            width: nextW,
            height: nextH,
          },
        }));
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isSelectingMarquee.current = false;
    setSelectionBox(null);

    if (draggingRef.current) {
      if (draggingRef.current.type === 'ELEMENTS') {
        onUpdateSeats((prevSeats) => reassignSeatZones(prevSeats, zones));
      }
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      draggingRef.current = null;
    }
  };

  return (
    <div
      className={`relative flex-1 w-full app-bg-card border app-border rounded-2xl flex flex-col justify-between overflow-hidden shadow-xs transition-all ${isFullscreen ? 'h-full min-h-[calc(100vh-140px)] rounded-xl border-none' : 'h-full min-h-[500px]'
        }`}
    >
      {/* Top Floating Viewport Control Bar with z-10 (below header z-30) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b app-border bg-slate-500/5 z-10">
        <div className="flex items-center gap-3">
          <span className="text-xs font-extrabold app-text-main uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            {isAttendeeMode ? 'Sơ Đồ Chọn Vé Khán Giả' : 'Studio Canvas 2D Kéo Quét Chuột & Undo/Redo'}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold font-mono border border-blue-500/20">
            {seats.length} Ghế | {stages.length} Sân khấu
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo / Redo Controls */}
          {!isAttendeeMode && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className="p-2 rounded-xl app-bg-main border app-border app-text-muted hover:app-text-main disabled:opacity-30 transition-colors cursor-pointer"
                title="Hoàn tác thao tác (Ctrl + Z)"
              >
                <FiUndo className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className="p-2 rounded-xl app-bg-main border app-border app-text-muted hover:app-text-main disabled:opacity-30 transition-colors cursor-pointer"
                title="Lặp lại thao tác (Ctrl + Y)"
              >
                <FiRedo className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="w-px h-5 app-border bg-slate-700 mx-1" />

          {/* Grid Snap Toggle */}
          {!isAttendeeMode && (
            <button
              type="button"
              onClick={() => setGridSnap((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${gridSnap
                ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                : 'app-bg-main border app-border app-text-muted hover:app-text-main'
                }`}
              title="Bật/Tắt hít lưới tọa độ"
            >
              <FiGrid className="w-3.5 h-3.5" />
              <span>Hít lưới ({gridSnap ? 'Bật' : 'Tắt'})</span>
            </button>
          )}

          <div className="w-px h-5 app-border bg-slate-700 mx-1" />

          {/* Zoom Controls */}
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 rounded-xl app-bg-main border app-border app-text-muted hover:app-text-main transition-colors cursor-pointer"
            title="Thu nhỏ"
          >
            <FiZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-extrabold app-text-main px-2">
            {zoomLevel}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 rounded-xl app-bg-main border app-border app-text-muted hover:app-text-main transition-colors cursor-pointer"
            title="Phóng to"
          >
            <FiZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-2 rounded-xl app-bg-main border app-border app-text-muted hover:app-text-main transition-colors cursor-pointer"
            title="100%"
          >
            <FiRotateCcw className="w-4 h-4" />
          </button>

          {/* Full-Screen Studio Expand Toggle */}
          {!isAttendeeMode && (
            <>
              <div className="w-px h-5 app-border bg-slate-700 mx-1" />
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 text-xs font-bold transition-all cursor-pointer"
                title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình Studio'}
              >
                {isFullscreen ? <FiMinimize2 className="w-4 h-4" /> : <FiMaximize2 className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Top Legend Bar */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b app-border bg-slate-500/5 text-xs app-text-muted font-semibold z-10">
        <span className="text-[11px] font-black uppercase app-text-sub tracking-wider">Khu vực:</span>
        {(!zones ? [] : Array.isArray(zones) ? (zones as ZoneBlock[]) : Object.values(zones as Record<string, ZoneBlock>)).map((z) => (
          <div
            key={z.id}
            onClick={() => onSelectZoneAttendee?.(z)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg app-bg-main border app-border cursor-pointer hover:border-blue-500/50 transition-colors"
          >
            <span className="w-3 h-3 rounded-full shrink-0 border border-black/20" style={{ backgroundColor: z.color }} />
            <span className="font-extrabold app-text-main text-[11px]">{z.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto text-[11px]">
          <span className="w-3.5 h-3.5 rounded bg-rose-500/20 border border-rose-500 text-rose-400 flex items-center justify-center text-[9px]">
            <FiTool className="w-2.5 h-2.5" />
          </span>
          <span>Bảo trì / Hư hỏng</span>
        </div>
      </div>

      {/* Main 2D Workspace Container with Pointer Events */}
      <div
        id="canvas-workspace"
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative flex-1 w-full min-h-[620px] overflow-auto app-bg-main p-8 transition-all select-none touch-none"
        style={{
          backgroundImage: gridSnap
            ? 'radial-gradient(circle, rgba(148, 163, 184, 0.22) 1px, transparent 1px)'
            : 'none',
          backgroundSize: '24px 24px',
        }}
      >
        <div
          className="relative min-w-[1300px] min-h-[900px] mx-auto transition-transform origin-top-left duration-75"
          style={{ transform: `scale(${zoomLevel / 100})` }}
        >
          {/* Marquee Box Selection Rectangle */}
          {selectionBox && (
            <div
              className="absolute border-2 border-blue-500 bg-blue-500/15 pointer-events-none z-40 rounded-md shadow-xs"
              style={{
                left: `${Math.min(selectionBox.startX, selectionBox.currentX)}px`,
                top: `${Math.min(selectionBox.startY, selectionBox.currentY)}px`,
                width: `${Math.abs(selectionBox.currentX - selectionBox.startX)}px`,
                height: `${Math.abs(selectionBox.currentY - selectionBox.startY)}px`,
              }}
            />
          )}

          {/* 0. Zone Area Container Boxes (Interactive & Draggable/Resizable/Rotatable) */}
          {(!zones ? [] : Array.isArray(zones) ? (zones as ZoneBlock[]) : Object.values(zones as Record<string, ZoneBlock>)).map((zone) => {
            if (!zone.x || !zone.y || !zone.width || !zone.height) return null;
            const isSelected = selectedZoneId === zone.id;

            // Calculate zone styling based on shape & curvature
            const curvatureVal = zone.curvature ?? 16;
            const shapeType = zone.shape || 'rounded';
            let borderRadius = `${curvatureVal}px`;
            let clipPath: string | undefined = undefined;

            if (shapeType === 'ellipse' || shapeType === 'circle') {
              borderRadius = '50%';
            } else if (shapeType === 'fan') {
              borderRadius = `${curvatureVal * 2}px ${curvatureVal * 2}px 0 0`;
            } else if (shapeType === 'trapezoid') {
              clipPath = 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)';
              borderRadius = '0px';
            } else if (shapeType === 'rectangle') {
              borderRadius = `${curvatureVal}px`;
            }

            // Fill Opacity
            const fillOpacity = zone.fillOpacity ?? 0.25;
            const zoneSeats = seats.filter((s) => s.zoneId === zone.id || isSeatInsideZone(s, zone));
            const zoneSeatsCount = zoneSeats.length;

            let isZoneSoldOut = false;
            if (isAttendeeMode) {
              if (zoneSeatsCount > 0) {
                const soldOrHeld = zoneSeats.filter((s) => {
                  const st = seatStatusMap[s.id] || s.status;
                  return st === 'sold' || st === 'SOLD' || st === 'HELD' || st === 'HOLDING';
                }).length;
                if (soldOrHeld === zoneSeatsCount) {
                  isZoneSoldOut = true;
                }
              } else {
                const totalCap = zone.capacity || 100;
                const soldOrHeldCount = Object.entries(seatStatusMap).filter(
                  ([k, v]) => (k === zone.id || k.startsWith(zone.id + "_") || k.includes(zone.id)) && (v === 'SOLD' || v === 'HELD' || v === 'HOLDING')
                ).length;
                if (totalCap - soldOrHeldCount <= 0 && soldOrHeldCount > 0) {
                  isZoneSoldOut = true;
                }
              }
            }

            const activeColor = isZoneSoldOut ? '#475569' : zone.color;

            return (
              <div
                key={zone.id}
                onPointerDown={(e) => handlePointerDownZone(e, zone)}
                className={`absolute border-2 transition-all ${zone.borderStyle === 'dashed' ? 'border-dashed' : 'border-solid'
                  } ${isSelected
                    ? 'ring-4 ring-teal-400 ring-offset-2 ring-offset-slate-900 z-20 shadow-xl'
                    : 'z-0'
                  } ${!isAttendeeMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                style={{
                  left: `${zone.x}px`,
                  top: `${zone.y}px`,
                  width: `${zone.width}px`,
                  height: `${zone.height}px`,
                  borderColor: activeColor,
                  backgroundColor: activeColor,
                  opacity: isZoneSoldOut ? 0.6 : 1,
                  borderRadius: borderRadius,
                  clipPath: clipPath,
                  transform: zone.rotation ? `rotate(${zone.rotation}deg)` : undefined,
                  transformOrigin: 'center center',
                  boxShadow: `inset 0 0 0 1000px rgba(15, 23, 42, ${1 - fillOpacity})`,
                }}
              >
                <div
                  data-zone-header="true"
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-br-xl rounded-tl-xl text-[11px] font-extrabold uppercase shadow-xs tracking-wider cursor-grab active:cursor-grabbing backdrop-blur-xs relative z-10"
                  style={{ backgroundColor: activeColor, color: '#ffffff' }}
                >
                  <span>{zone.name}</span>
                  {isZoneSoldOut && (
                    <span className="bg-rose-600 text-white text-[9px] px-1.5 py-0.2 rounded font-mono">HẾT VÉ</span>
                  )}
                </div>

                {/* Center Label & Info inside Zone */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 text-center z-10">
                  <span className="text-sm md:text-base font-black uppercase tracking-widest drop-shadow-md text-white">
                    {isZoneSoldOut ? `${zone.name} (ĐÃ HẾT VÉ)` : (zone.centerText || zone.name)}
                  </span>
                  {zone.tierId ? (
                    <span className="text-xs font-extrabold font-mono text-white/90 drop-shadow-sm mt-0.5">
                      {tiers?.find((t) => t.id === zone.tierId)?.name || 'Hạng vé'} • {getZonePrice(zone).toLocaleString('vi-VN')} đ
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-white/80 drop-shadow-sm mt-0.5">
                      {zoneSeatsCount > 0 ? `${zoneSeatsCount} ghế` : 'Chưa gán hạng vé'}
                    </span>
                  )}
                  {zoneSeatsCount === 0 && zone.capacity ? (
                    <span className="text-[10px] font-bold text-white/90 bg-black/40 px-2.5 py-0.5 rounded-full mt-1 border border-white/20 font-mono">
                      Khối đứng: {zone.capacity} {zone.tierId ? 'vé' : 'chỗ'} {isZoneSoldOut ? '(Hết vé)' : ''}
                    </span>
                  ) : null}
                </div>

                {/* 8 Directional Resizable Handles */}
                {!isAttendeeMode && isSelected && (
                  <>
                    <div
                      onPointerDown={(e) => handlePointerDownRotateZone(e, zone)}
                      className="absolute -top-7 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg z-50 hover:scale-125 transition-transform"
                      title="Kéo để xoay Khu Vực (Giữ Shift để hít góc 15°)"
                    >
                      <FiRotateCw className="w-3.5 h-3.5" />
                    </div>

                    {[
                      { dir: 'nw', class: '-top-1.5 -left-1.5 cursor-nwse-resize' },
                      { dir: 'n', class: '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
                      { dir: 'ne', class: '-top-1.5 -right-1.5 cursor-nesw-resize' },
                      { dir: 'e', class: 'top-1/2 -translate-y-1/2 -right-1.5 cursor-ew-resize' },
                      { dir: 'se', class: '-bottom-1.5 -right-1.5 cursor-nwse-resize' },
                      { dir: 's', class: '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
                      { dir: 'sw', class: '-bottom-1.5 -left-1.5 cursor-nesw-resize' },
                      { dir: 'w', class: 'top-1/2 -translate-y-1/2 -left-1.5 cursor-ew-resize' },
                    ].map((h) => (
                      <div
                        key={h.dir}
                        onPointerDown={(e) => handlePointerDownResizeZone(e, zone, h.dir as any)}
                        className={`absolute w-3.5 h-3.5 rounded-full bg-white border-2 border-teal-600 z-50 shadow-md hover:scale-125 transition-transform ${h.class}`}
                        title={`Kéo để thay đổi kích thước Zone (${h.dir.toUpperCase()})`}
                      />
                    ))}
                  </>
                )}
              </div>
            );
          })}

          {/* 1. Stages */}
          {stages.map((stage) => {
            const isSelected = selectedStageId === stage.id;
            return (
              <div
                key={stage.id}
                onPointerDown={(e) => handlePointerDownStage(e, stage)}
                className={`absolute rounded-2xl border-2 flex items-center justify-center font-extrabold text-xs shadow-xl transition-shadow group ${isSelected ? 'ring-4 ring-indigo-500 ring-offset-2 ring-offset-slate-900 z-30' : 'z-10'
                  } ${!isAttendeeMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
                style={{
                  left: `${stage.x}px`,
                  top: `${stage.y}px`,
                  width: `${stage.width}px`,
                  height: `${stage.height}px`,
                  backgroundColor: stage.color || '#6366f1',
                  color: '#ffffff',
                  transform: stage.rotation ? `rotate(${stage.rotation}deg)` : undefined,
                  transformOrigin: 'center center',
                }}
              >
                <div className="flex items-center gap-2 px-4 text-center">
                  {!isAttendeeMode && <FiMove className="w-4 h-4 opacity-70" />}
                  <span className="uppercase tracking-widest text-xs font-black">
                    {stage.label}
                  </span>
                </div>

                {/* Rotation Handle (Top Center) */}
                {!isAttendeeMode && isSelected && (
                  <div
                    onPointerDown={(e) => handlePointerDownRotateStage(e, stage)}
                    className="absolute -top-7 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg z-50 hover:scale-125 transition-transform"
                    title="Kéo để xoay Sân khấu (Giữ Shift để hít góc 15°)"
                  >
                    <FiRotateCw className="w-3.5 h-3.5" />
                  </div>
                )}

                {/* Resizable Corner Handle */}
                {!isAttendeeMode && isSelected && (
                  <div
                    onPointerDown={(e) => handlePointerDownResizeStage(e, stage)}
                    className="absolute -right-2 -bottom-2 w-5 h-5 rounded-full bg-white text-indigo-600 border-2 border-indigo-600 flex items-center justify-center cursor-nwse-resize z-50 shadow-md"
                    title="Kéo để đổi kích thước Sân khấu"
                  >
                    <span className="text-[9px] font-bold">↘</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* 2. Structures (Exits, Booths) */}
          {structures.map((struct) => {
            const isSelected = selectedStructureId === struct.id;
            const isExit = struct.type === 'exit';
            return (
              <div
                key={struct.id}
                onPointerDown={(e) => handlePointerDownStructure(e, struct)}
                className={`absolute rounded-xl border flex items-center justify-center font-bold text-xs shadow-md transition-shadow group ${isSelected ? 'ring-4 ring-rose-500 ring-offset-2 ring-offset-slate-900 z-30' : 'z-10'
                  } ${!isAttendeeMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
                style={{
                  left: `${struct.x}px`,
                  top: `${struct.y}px`,
                  width: `${struct.width}px`,
                  height: `${struct.height}px`,
                  backgroundColor: struct.color || (isExit ? '#ef4444' : '#64748b'),
                  color: '#ffffff',
                  transform: struct.rotation ? `rotate(${struct.rotation}deg)` : undefined,
                  transformOrigin: 'center center',
                }}
              >
                <div className="flex items-center gap-1.5 px-2 text-center text-[11px]">
                  {isExit && <FiShield className="w-3.5 h-3.5" />}
                  <span className="truncate">{struct.label}</span>
                </div>

                {/* Rotation Handle (Top Center) */}
                {!isAttendeeMode && isSelected && (
                  <div
                    onPointerDown={(e) => handlePointerDownRotateStructure(e, struct)}
                    className="absolute -top-7 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg z-50 hover:scale-125 transition-transform"
                    title="Kéo để xoay Cấu trúc (Giữ Shift để hít góc 15°)"
                  >
                    <FiRotateCw className="w-3.5 h-3.5" />
                  </div>
                )}

                {/* Resizable Corner Handle */}
                {!isAttendeeMode && isSelected && (
                  <div
                    onPointerDown={(e) => handlePointerDownResizeStructure(e, struct)}
                    className="absolute -right-2 -bottom-2 w-5 h-5 rounded-full bg-white text-rose-600 border-2 border-rose-600 flex items-center justify-center cursor-nwse-resize z-50 shadow-md"
                    title="Kéo để đổi kích thước Lối thoát hiểm"
                  >
                    <span className="text-[9px] font-bold">↘</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* 3. Seats (Supporting Circle / Square / Rounded Shapes) */}
          {seats.map((seat) => {
            const zone: ZoneBlock = zones[seat.zoneId] || {
              id: seat.zoneId || 'standard',
              name: 'Standard',
              color: '#3b82f6',
              price: 0,
              shape: 'rounded',
            };
            const isSelected = selectedSeatIds.includes(seat.id);
            const isCartItem = attendeeCart.some((s) => s.id === seat.id);

            const statusFromMap = seatStatusMap ? seatStatusMap[seat.id] : undefined;
            let isMaintenance = seat.status === 'maintenance';
            let isBlocked = seat.status === 'blocked';
            let isSold = seat.status === 'sold' || statusFromMap === 'SOLD';
            let isHolding = seat.status === 'reserved' || statusFromMap === 'HELD' || statusFromMap === 'HOLDING';
            let isAccessible = seat.status === 'accessible';

            // Shape Styling
            const rawShape = seat.shape || zone.shape || 'rounded';
            const seatShape = rawShape === 'circle' || rawShape === 'square' ? rawShape : 'rounded';
            const shapeClass =
              seatShape === 'circle'
                ? 'rounded-full'
                : seatShape === 'square'
                  ? 'rounded-xs'
                  : 'rounded-lg';

            return (
              <div
                key={seat.id}
                onPointerDown={(e) => handlePointerDownSeat(e, seat)}
                className={`absolute w-8.5 h-8.5 ${shapeClass} font-mono text-[11px] font-extrabold flex items-center justify-center transition-transform duration-75 group shadow-xs ${!isAttendeeMode ? 'cursor-grab active:cursor-grabbing' : (isSold || isHolding) ? 'cursor-not-allowed' : 'cursor-pointer'
                  } ${isCartItem
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-400 scale-125 z-40 shadow-xl'
                    : isMaintenance
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/80 ring-1 ring-rose-500/40'
                      : isSold
                        ? 'bg-slate-700 text-slate-400 border border-slate-600 opacity-60 cursor-not-allowed'
                        : isBlocked
                          ? 'bg-slate-800 text-slate-500 border border-slate-700'
                          : isHolding
                            ? 'bg-amber-500 text-white border-2 border-amber-300 ring-2 ring-amber-400/80 animate-pulse'
                            : isAccessible
                              ? 'bg-purple-600/30 text-purple-300 border border-purple-500 shadow-sm'
                              : 'text-white border-2 border-white/90 shadow-md'
                  } ${isSelected
                    ? 'ring-4 ring-white ring-offset-2 ring-offset-slate-900 scale-125 z-30 shadow-2xl'
                    : ''
                  }`}
                style={{
                  left: `${seat.x}px`,
                  top: `${seat.y}px`,
                  backgroundColor:
                    !isCartItem && !isMaintenance && !isSold && !isBlocked && !isHolding && !isAccessible
                      ? (seat.color || zone.color || '#3b82f6')
                      : undefined,
                  transform: seat.rotation ? `rotate(${seat.rotation}deg)` : undefined,
                }}
              >
                {isCartItem ? (
                  <FiUserCheck className="w-4 h-4 text-white" />
                ) : isMaintenance ? (
                  <FiTool className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                ) : isBlocked ? (
                  <FiLock className="w-3.5 h-3.5 text-slate-400" />
                ) : isHolding ? (
                  <span className="text-[9px] font-black">GIỮ</span>
                ) : isSold ? (
                  'X'
                ) : (
                  seat.number
                )}

                {/* Tooltip Hover */}
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-50 pointer-events-none">
                  <div className="px-3 py-1.5 bg-slate-950 text-white text-[11px] rounded-xl shadow-2xl border border-slate-700 whitespace-nowrap space-y-0.5">
                    <div className="font-extrabold flex items-center gap-1.5">
                      <span>Ghế {seat.row}-{seat.number}</span>
                      {isHolding && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500 text-white text-[9px] font-mono">
                          ĐANG GIỮ VÉ (15p)
                        </span>
                      )}
                      {isSold && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-600 text-white text-[9px] font-mono">
                          ĐÃ BÁN
                        </span>
                      )}
                    </div>
                    <div className="text-slate-300">
                      {zone.name} -{' '}
                      <span className="font-mono text-emerald-400 font-bold">
                        {getZonePrice(zone).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      X: {seat.x}px | Y: {seat.y}px ({seat.rotation || 0}°)
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
