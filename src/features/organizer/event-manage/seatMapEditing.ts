// Pure editing helpers of the seat map studio: copy/paste/duplicate, nudge, zoom and keyboard guards.
// They take a layout and return a new one, so they can be tested without rendering the canvas.
import type { Seat, StageElement, StructureElement, ZoneBlock } from '@/types/seating';

export const MIN_ZOOM = 20;
export const MAX_ZOOM = 200;

export const clampZoom = (value: number): number => Math.min(Math.max(Math.round(value), MIN_ZOOM), MAX_ZOOM);

export interface SeatMapLayout {
  seats: Seat[];
  stages: StageElement[];
  structures: StructureElement[];
  zones: Record<string, ZoneBlock>;
}

export interface SeatMapSelection {
  seatIds: string[];
  stageId: string | null;
  structureId: string | null;
  zoneId: string | null;
}

export interface SeatMapClipboard {
  seats: Seat[];
  stages: StageElement[];
  structures: StructureElement[];
  zones: ZoneBlock[];
}

// true when the key press comes from a field the user is typing in: shortcuts must not fire there
export const isTypingTarget = (element: Element | null): boolean => {
  if (!element) return false;
  const tag = element.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  const editable = (element as HTMLElement).isContentEditable;
  if (editable) return true;
  return element.getAttribute?.('role') === 'textbox';
};

export const hasSelection = (selection: SeatMapSelection): boolean =>
  selection.seatIds.length > 0 || Boolean(selection.stageId || selection.structureId || selection.zoneId);

// the seats a selected zone carries along (same rule the canvas uses when it drags a zone)
const seatsOfZone = (seats: Seat[], zoneId: string | null): Seat[] =>
  zoneId ? seats.filter((seat) => seat.zoneId === zoneId) : [];

export const buildClipboard = (layout: SeatMapLayout, selection: SeatMapSelection): SeatMapClipboard | null => {
  const seatIds = new Set(selection.seatIds);
  seatsOfZone(layout.seats, selection.zoneId).forEach((seat) => seatIds.add(seat.id));
  const seats = layout.seats.filter((seat) => seatIds.has(seat.id));
  const stages = layout.stages.filter((stage) => stage.id === selection.stageId);
  const structures = layout.structures.filter((item) => item.id === selection.structureId);
  const zone = selection.zoneId ? layout.zones[selection.zoneId] : undefined;
  const zones = zone ? [zone] : [];
  if (!seats.length && !stages.length && !structures.length && !zones.length) return null;
  return { seats, stages, structures, zones };
};

export interface PasteResult {
  layout: SeatMapLayout;
  selection: SeatMapSelection;
}

// pastes a clipboard into a layout. `offset` shifts the copies so they do not hide the originals;
// `makeId(kind)` gives every copy a fresh id (inject it so tests stay deterministic).
export const pasteClipboard = (
  layout: SeatMapLayout,
  clipboard: SeatMapClipboard,
  offset: number,
  makeId: (kind: 'seat' | 'stage' | 'structure' | 'zone') => string,
  copySuffix = ' (bản sao)'
): PasteResult => {
  const zoneIdMap = new Map<string, string>();
  const newZones: Record<string, ZoneBlock> = {};
  clipboard.zones.forEach((zone) => {
    const id = makeId('zone');
    zoneIdMap.set(zone.id, id);
    newZones[id] = {
      ...zone,
      id,
      name: `${zone.name}${copySuffix}`,
      x: zone.x === undefined ? zone.x : zone.x + offset,
      y: zone.y === undefined ? zone.y : zone.y + offset,
    };
  });

  const newSeats = clipboard.seats.map((seat) => ({
    ...seat,
    id: makeId('seat'),
    x: seat.x + offset,
    y: seat.y + offset,
    zoneId: zoneIdMap.get(seat.zoneId) ?? seat.zoneId,
  }));
  const newStages = clipboard.stages.map((stage) => ({ ...stage, id: makeId('stage'), x: stage.x + offset, y: stage.y + offset }));
  const newStructures = clipboard.structures.map((item) => ({ ...item, id: makeId('structure'), x: item.x + offset, y: item.y + offset }));

  const nextLayout: SeatMapLayout = {
    seats: newSeats.length ? [...layout.seats, ...newSeats] : layout.seats,
    stages: newStages.length ? [...layout.stages, ...newStages] : layout.stages,
    structures: newStructures.length ? [...layout.structures, ...newStructures] : layout.structures,
    zones: clipboard.zones.length ? { ...layout.zones, ...newZones } : layout.zones,
  };

  const pastedZoneId = Object.keys(newZones)[0] ?? null;
  return {
    layout: nextLayout,
    selection: {
      // a pasted zone is selected as a whole; otherwise the new seats are the selection
      seatIds: pastedZoneId ? [] : newSeats.map((seat) => seat.id),
      stageId: newStages[0]?.id ?? null,
      structureId: newStructures[0]?.id ?? null,
      zoneId: pastedZoneId,
    },
  };
};

// moves the selection by (dx, dy). Locked elements stay; unchanged lists keep their reference.
export const nudgeSelection = (
  layout: SeatMapLayout,
  selection: SeatMapSelection,
  dx: number,
  dy: number
): SeatMapLayout => {
  if (!dx && !dy) return layout;
  const seatIds = new Set(selection.seatIds);
  const zone = selection.zoneId ? layout.zones[selection.zoneId] : undefined;
  if (zone && !zone.locked) seatsOfZone(layout.seats, zone.id).forEach((seat) => seatIds.add(seat.id));

  const seats = seatIds.size
    ? layout.seats.map((seat) => (seatIds.has(seat.id) && !seat.locked ? { ...seat, x: seat.x + dx, y: seat.y + dy } : seat))
    : layout.seats;
  const stages = selection.stageId
    ? layout.stages.map((stage) => (stage.id === selection.stageId && !stage.locked ? { ...stage, x: stage.x + dx, y: stage.y + dy } : stage))
    : layout.stages;
  const structures = selection.structureId
    ? layout.structures.map((item) => (item.id === selection.structureId && !item.locked ? { ...item, x: item.x + dx, y: item.y + dy } : item))
    : layout.structures;
  const zones =
    zone && !zone.locked
      ? { ...layout.zones, [zone.id]: { ...zone, x: (zone.x ?? 0) + dx, y: (zone.y ?? 0) + dy } }
      : layout.zones;

  return { seats, stages, structures, zones };
};

// scroll position that keeps the content point under the pointer fixed while the zoom changes
export const zoomAtPoint = (args: {
  zoom: number;
  nextZoom: number;
  pointer: { x: number; y: number }; // relative to the scroll container's visible box
  scroll: { left: number; top: number };
}): { left: number; top: number } => {
  const scale = args.zoom / 100;
  const nextScale = args.nextZoom / 100;
  const contentX = (args.scroll.left + args.pointer.x) / scale;
  const contentY = (args.scroll.top + args.pointer.y) / scale;
  return {
    left: Math.max(0, contentX * nextScale - args.pointer.x),
    top: Math.max(0, contentY * nextScale - args.pointer.y),
  };
};

// the zoom at which the whole content (plus padding) fits the visible box
export const fitZoom = (args: {
  viewport: { width: number; height: number };
  content: { width: number; height: number };
  padding?: number;
}): number => {
  const padding = args.padding ?? 60;
  const contentW = Math.max(100, args.content.width + padding * 2);
  const contentH = Math.max(100, args.content.height + padding * 2);
  const fit = Math.floor(Math.min(args.viewport.width / contentW, args.viewport.height / contentH) * 100);
  return clampZoom(fit);
};

export type ArrowDirection = 'left' | 'right' | 'up' | 'down';

// nearest visible seat in the arrow direction (keyboard navigation between seats)
export const neighborSeatId = (seats: Seat[], fromId: string, direction: ArrowDirection): string | null => {
  const from = seats.find((seat) => seat.id === fromId);
  if (!from) return null;
  let best: { id: string; cost: number } | null = null;
  for (const seat of seats) {
    if (seat.id === fromId || seat.hidden) continue;
    const dx = seat.x - from.x;
    const dy = seat.y - from.y;
    const along = direction === 'right' ? dx : direction === 'left' ? -dx : direction === 'down' ? dy : -dy;
    if (along <= 1) continue;
    const across = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
    const cost = along + across * 2.5; // prefer the seat that is in line over a nearer one off to the side
    if (!best || cost < best.cost) best = { id: seat.id, cost };
  }
  return best?.id ?? null;
};

// pinch gesture: new zoom from the change of distance between two fingers
export const pinchZoom = (startZoom: number, startDistance: number, distance: number): number =>
  startDistance > 0 ? clampZoom((startZoom * distance) / startDistance) : startZoom;
