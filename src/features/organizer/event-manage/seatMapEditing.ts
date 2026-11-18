// Các hàm chỉnh sửa thuần túy của studio sơ đồ ghế: sao chép/dán/nhân đôi, dịch chuyển, zoom và các điều kiện bàn phím.
// Chúng nhận một bố cục và trả về bố cục mới, nên có thể kiểm thử mà không cần vẽ canvas.
import type { Seat, StageElement, StructureElement, ZoneBlock } from '@/types/seating';

export const MIN_ZOOM = 20;
export const MAX_ZOOM = 200;

/** Làm tròn và kẹp mức zoom vào khoảng {@code MIN_ZOOM} đến {@code MAX_ZOOM} (20% đến 200%). */
export const clampZoom = (value: number): number => Math.min(Math.max(Math.round(value), MIN_ZOOM), MAX_ZOOM);

/** Bố cục sơ đồ ghế: ghế, sân khấu, cấu trúc và các khu (theo id). */
export interface SeatMapLayout {
  seats: Seat[];
  stages: StageElement[];
  structures: StructureElement[];
  zones: Record<string, ZoneBlock>;
}

/** Phần tử đang được chọn: các ghế, sân khấu, cấu trúc hoặc khu (id, hoặc {@code null} nếu không chọn). */
export interface SeatMapSelection {
  seatIds: string[];
  stageId: string | null;
  structureId: string | null;
  zoneId: string | null;
}

/** Nội dung bộ nhớ tạm khi sao chép: các phần tử đã chọn kèm ghế của khu được chọn. */
export interface SeatMapClipboard {
  seats: Seat[];
  stages: StageElement[];
  structures: StructureElement[];
  zones: ZoneBlock[];
}

/** Cho biết phím bấm có đến từ ô người dùng đang gõ chữ hay không: phím tắt không được kích hoạt ở đó. */
export const isTypingTarget = (element: Element | null): boolean => {
  if (!element) return false;
  const tag = element.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  const editable = (element as HTMLElement).isContentEditable;
  if (editable) return true;
  return element.getAttribute?.('role') === 'textbox';
};

/** Cho biết có phần tử nào đang được chọn không. */
export const hasSelection = (selection: SeatMapSelection): boolean =>
  selection.seatIds.length > 0 || Boolean(selection.stageId || selection.structureId || selection.zoneId);

/** Các ghế mà một khu được chọn kéo theo (cùng quy tắc canvas dùng khi kéo khu). */
const seatsOfZone = (seats: Seat[], zoneId: string | null): Seat[] =>
  zoneId ? seats.filter((seat) => seat.zoneId === zoneId) : [];

/** Dựng bộ nhớ tạm từ phần đang chọn (khu được chọn kéo theo mọi ghế của nó); trả về {@code null} nếu không có gì để sao chép. */
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

/** Kết quả dán: bố cục mới và vùng chọn mới (chính các bản sao vừa dán). */
export interface PasteResult {
  layout: SeatMapLayout;
  selection: SeatMapSelection;
}

/**
 * Dán bộ nhớ tạm vào bố cục. Các bản sao được dịch đi {@code offset} để không che bản gốc; khu sao chép được thêm hậu tố tên;
 * ghế của khu sao chép được gắn sang khu mới. Danh sách không đổi thì giữ nguyên tham chiếu.
 * @param layout - bố cục hiện tại
 * @param clipboard - nội dung đã sao chép
 * @param offset - độ dịch của bản sao theo cả hai trục
 * @param makeId - sinh id mới cho mỗi bản sao theo loại phần tử (được truyền vào để kiểm thử cho kết quả xác định)
 * @param copySuffix - hậu tố thêm vào tên khu sao chép, mặc định " (bản sao)"
 */
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
      // khu vừa dán được chọn nguyên khối; nếu không thì các ghế mới là vùng chọn
      seatIds: pastedZoneId ? [] : newSeats.map((seat) => seat.id),
      stageId: newStages[0]?.id ?? null,
      structureId: newStructures[0]?.id ?? null,
      zoneId: pastedZoneId,
    },
  };
};

/**
 * Dịch phần đang chọn đi (dx, dy). Phần tử bị khóa thì đứng yên; danh sách không đổi giữ nguyên tham chiếu.
 * Chọn một khu (không bị khóa) thì ghế của khu cũng dịch theo.
 */
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

/**
 * Tính vị trí cuộn giữ cố định điểm nội dung dưới con trỏ khi mức zoom đổi.
 * @param args - zoom hiện tại, zoom mới, vị trí con trỏ trong khung nhìn và vị trí cuộn hiện tại
 * @returns vị trí cuộn mới (không âm)
 */
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

/** Mức zoom để toàn bộ nội dung (cộng lề, mặc định 60) vừa khung nhìn, đã kẹp trong khoảng cho phép. */
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

/** Hướng của phím mũi tên. */
export type ArrowDirection = 'left' | 'right' | 'up' | 'down';

/** Tìm ghế hiển thị gần nhất theo hướng mũi tên (điều hướng bàn phím giữa các ghế); ưu tiên ghế thẳng hàng hơn ghế gần nhưng lệch sang bên. Trả về {@code null} nếu không có. */
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

/** Cử chỉ chụm: tính mức zoom mới từ thay đổi khoảng cách giữa hai ngón tay; giữ nguyên zoom nếu khoảng cách ban đầu bằng 0. */
export const pinchZoom = (startZoom: number, startDistance: number, distance: number): number =>
  startDistance > 0 ? clampZoom((startZoom * distance) / startDistance) : startZoom;
