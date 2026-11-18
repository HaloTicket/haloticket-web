import type React from 'react';

/** Trạng thái của một ghế trên sơ đồ. */
export type SeatStatus =
  | 'available'
  | 'reserved'
  | 'sold'
  | 'blocked'
  | 'maintenance'
  | 'accessible';

/** Hình dạng hiển thị của ghế. */
export type SeatShape = 'circle' | 'square' | 'rounded';

/** Hình dạng của một khu vực (zone) trên sơ đồ. */
export type ZoneShape =
  | 'rectangle'
  | 'rounded'
  | 'ellipse'
  | 'trapezoid'
  | 'trapezoid_reverse'
  | 'diamond'
  | 'fan'
  | 'polygon';

/** Hình dạng của các phần tử sân khấu và cấu trúc. */
export type ElementShape = 'rectangle' | 'rounded' | 'ellipse' | 'trapezoid' | 'runway';

/** Hạng vé gắn với ghế hoặc khu vực: giá, màu hiển thị và số lượng (tổng, đã bán, đang giữ, còn lại). */
export interface SeatTier {
  id: string;
  name: string;
  price: number;
  color: string;
  textColor?: string;
  borderColor?: string;
  description?: string;
  code?: string;
  isActive?: boolean;
  isFree?: boolean;
  totalQuantity?: number;
  minPerOrder?: number;
  maxPerOrder?: number;
  initialQuantity?: number;
  remainingQuantity?: number;
  heldQuantity?: number;
  soldQuantity?: number;
  availableQuantity?: number;
}

/** Một ghế trên sơ đồ: hàng, số ghế, tọa độ, khu vực, hạng vé và trạng thái. */
export interface Seat {
  id: string;
  row: string;
  number: number;
  col?: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  shape?: SeatShape;
  zoneId: string;
  tierId?: string;
  status: SeatStatus;
  maintenanceNote?: string;
  color?: string;
  locked?: boolean;
  hidden?: boolean;
}

/** Sân khấu trên sơ đồ (sân khấu thường hoặc chữ T). */
export interface StageElement {
  id: string;
  type: 'stage' | 't_stage';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  rotation?: number;
  shape?: ElementShape;
  locked?: boolean;
  hidden?: boolean;
  zIndex?: number;
}

/** Phần tử cấu trúc trên sơ đồ như lối ra, cổng, bàn điều khiển hay khu vệ sinh/ăn uống. */
export interface StructureElement {
  id: string;
  type: 'exit' | 'structure' | 'gate' | 'control_booth' | 'wc_food';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  rotation?: number;
  shape?: ElementShape;
  locked?: boolean;
  hidden?: boolean;
  zIndex?: number;
}

/** Một khu vực (zone) trên sơ đồ: ghế ngồi, đứng, cung cong hoặc bàn tiệc, kèm vị trí, giá và kiểu hiển thị. */
export interface ZoneBlock {
  id: string;
  name: string;
  price?: number;
  tierId?: string;
  minPerOrder?: number;
  maxPerOrder?: number;
  color: string;
  fillColor?: string;
  strokeColor?: string;
  curvature?: number; // 0-100, hoặc bán kính bo góc / độ cong của cung
  shape?: ZoneShape | SeatShape;
  shapeType?: string;
  points?: any;
  customClipPath?: string;
  rows?: string[];
  seatsPerRow?: number;
  type?: 'SEATED' | 'STANDING' | 'CURVED_ARC' | 'GALA_TABLES';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  borderStyle?: 'dashed' | 'solid';
  fillOpacity?: number;
  centerText?: string;
  textColor?: string;
  locked?: boolean;
  hidden?: boolean;
  zIndex?: number;
  capacity?: number;
  note?: string;
}

/** Cài đặt của canvas vẽ sơ đồ: kích thước, lưới và chế độ bắt dính. */
export interface CanvasSettings {
  width: number;
  height: number;
  gridSize: number;
  snapEnabled: boolean;
  showGrid: boolean;
  backgroundLabel?: string;
}

/** Mẫu sơ đồ của một địa điểm: sân khấu, cấu trúc, ghế và các khu vực dựng sẵn. */
export interface VenueTemplate {
  id: string;
  name: string;
  address?: string;
  city?: string;
  capacity?: number;
  eventsHosted?: number;
  pastEvents?: string[];
  rating?: number;
  thumbnail?: string;
  description: string;
  stages: StageElement[];
  structures: StructureElement[];
  seats: Seat[];
  zones?: Record<string, ZoneBlock>;
  source?: 'system' | 'community' | 'organizer';
  layoutType?: 'stadium' | 'theater' | 'conference' | 'gala' | 'custom';
  updatedAt?: string;
  canvasSettings?: Partial<CanvasSettings>;
}

/** Tài liệu sơ đồ chỗ ngồi (phiên bản 2.0) được lưu hoặc nạp: canvas, khu vực, phần tử, ghế và hạng vé. */
export interface SeatMapDocument {
  version: '2.0';
  timestamp: string;
  name?: string;
  venueTemplateId?: string;
  canvasSettings: CanvasSettings;
  zones: Record<string, ZoneBlock>;
  stages: StageElement[];
  structures: StructureElement[];
  seats: Seat[];
  ticketTiers: SeatTier[];
}

/** Ảnh chụp trạng thái sơ đồ dùng cho chức năng hoàn tác và làm lại. */
export interface HistoryState {
  seats: Seat[];
  stages: StageElement[];
  structures: StructureElement[];
  zones: Record<string, ZoneBlock>;
  canvasSettings?: CanvasSettings;
}

/** Mô hình tương thích cho thành phần SeatMapCanvas cũ. */
export interface CustomElement {
  id: string;
  type: 'STAGE' | 'T_STAGE' | 'EXIT' | 'GATE' | 'CONTROL_BOOTH' | 'WC_FOOD';
  name: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  color?: string;
}

/** Cấu hình thêm một hàng ghế: ký tự hàng, số ghế, khu vực và khoảng cách. */
export interface AddRowConfig {
  rowLetter: string;
  count: number;
  zoneId: string;
  spacing?: number;
}

/** Cấu hình thêm một ma trận ghế (số hàng, số cột, lối đi) vào một khu vực. */
export interface AddMatrixConfig {
  rows: number;
  cols: number;
  startRowLetter: string;
  zoneId: string;
  spacingX?: number;
  spacingY?: number;
  aisleAfter?: number;
  aisleGap?: number;
}

/** Cấu hình thêm một hàng ghế xếp theo cung tròn. */
export interface AddArcConfig {
  rowLetter: string;
  count: number;
  radius: number;
  zoneId: string;
  spanDegrees?: number;
}

/** Cấu hình tạo một khu vực mới: kích thước, giá, kiểu bố trí và số ghế hoặc số bàn. */
export interface AddZoneConfig {
  name: string;
  tierId?: string;
  price?: number;
  color: string;
  width: number;
  height: number;
  borderStyle: 'dashed' | 'solid';
  shape?: 'rectangle' | 'rounded' | 'ellipse' | 'trapezoid' | 'diamond' | 'fan';
  type?: 'SEATED' | 'STANDING' | 'CURVED_ARC' | 'GALA_TABLES';
  layoutType?: 'STANDING' | 'ROW' | 'MATRIX' | 'ARC' | 'GALA';
  rowPrefix?: string;
  rowCount?: number;
  seatsPerRow?: number;
  arcCount?: number;
  arcRadius?: number;
  tableCount?: number;
  seatsPerTable?: number;
  capacity?: number;
}

/** Props của thanh công cụ trình soạn sơ đồ: các hàm thêm hàng, ma trận, cung, bàn, sân khấu, cấu trúc, khu vực và thao tác trên vùng chọn. */
export interface ToolBarProps {
  zones: Record<string, ZoneBlock>;
  tiers?: SeatTier[];
  selectedSeatIds: string[];
  canvasSettings?: CanvasSettings;
  onAddRow: (configOrRowLetter: any, count?: number, zoneId?: string) => void;
  onAddMatrix: (configOrRows: any, cols?: number, startRowLetter?: string, zoneId?: string) => void;
  onAddArc: (configOrRowLetter: any, count?: number, radius?: number, zoneId?: string) => void;
  onAddTable: (zoneId?: string, seatsPerTable?: number, radius?: number) => void;
  onAddStage: (kindOrLabel: any, label?: string) => void;
  onAddStructure: (type: any, label?: string) => void;
  onAddZoneBlock?: (configOrName: any, price?: number, color?: string, width?: number, height?: number, borderStyle?: 'dashed' | 'solid', rows?: number, cols?: number) => void;
  onResizeCanvas?: (width: number, height: number, gridSize?: number) => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onSelectAll: () => void;
}

/** Props của bảng thuộc tính: hiển thị và cập nhật thuộc tính của ghế, sân khấu, cấu trúc hoặc khu vực đang chọn. */
export interface PropertyPanelProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  selectedSeatIds: string[];
  selectedStageId: string | null;
  selectedStructureId: string | null;
  selectedZoneId?: string | null;
  seats: Seat[];
  stages: StageElement[];
  structures: StructureElement[];
  zones: Record<string, ZoneBlock>;
  tiers?: SeatTier[];
  availableTiers?: SeatTier[];
  onUpdateSeatProps: (props: Partial<Seat>) => void;
  onUpdateStageProps: (stageId: string, props: Partial<StageElement>) => void;
  onUpdateStructureProps: (structId: string, props: Partial<StructureElement>) => void;
  onUpdateZoneProps: (zoneId: string, props: Partial<ZoneBlock>) => void;
  onMoveSeatsToZone?: (zoneIdOrSeatIds: any, zoneIdVal?: string) => void;
  onArrangeSeats?: (actionOrSpacing: any) => void;
  onDeleteSelected: () => void;
}

/** Props của canvas sơ đồ chỗ ngồi: dữ liệu, trạng thái chọn, hoàn tác, chế độ người mua và trạng thái ghế thời gian thực. */
export interface SeatCanvasProps {
  seats: Seat[];
  stages: StageElement[];
  structures: StructureElement[];
  zones: Record<string, ZoneBlock>;
  tiers?: SeatTier[];
  canvasSettings?: CanvasSettings;
  selectedSeatIds: string[];
  setSelectedSeatIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedStageId: string | null;
  setSelectedStageId: (id: string | null) => void;
  selectedStructureId: string | null;
  setSelectedStructureId: (id: string | null) => void;
  selectedZoneId?: string | null;
  setSelectedZoneId?: (id: string | null) => void;
  onUpdateSeats: React.Dispatch<React.SetStateAction<Seat[]>>;
  onUpdateStages: React.Dispatch<React.SetStateAction<StageElement[]>>;
  onUpdateStructures: React.Dispatch<React.SetStateAction<StructureElement[]>>;
  onUpdateZones?: React.Dispatch<React.SetStateAction<Record<string, ZoneBlock>>>;
  onUpdateCanvasSettings?: React.Dispatch<React.SetStateAction<CanvasSettings>>;
  onDeleteSelected: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onCommitHistory?: () => void;
  isAttendeeMode?: boolean;
  attendeeCart?: Seat[];
  onToggleAttendeeSeat?: (seat: Seat) => void;
  onSelectZoneAttendee?: (zone: ZoneBlock) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onCanvasClickPosition?: (pos: { x: number; y: number }) => void;
  seatStatusMap?: Record<string, string>;
}

/** Props của khung xem trước phía người mua: giỏ ghế đã chọn và các thao tác bỏ chọn. */
export interface AttendeePreviewProps {
  cart: Seat[];
  tiers?: SeatTier[];
  zones?: Record<string, ZoneBlock>;
  onRemoveCartSeat: (seatId: string) => void;
  onClearCart: () => void;
}

/** Props của bản đồ thu nhỏ: kích thước khung nhìn, vị trí cuộn, mức phóng và hàm điều hướng. */
export interface MiniMapProps {
  seats: Seat[];
  stages: StageElement[];
  zones: Record<string, ZoneBlock>;
  viewportWidth: number;
  viewportHeight: number;
  scrollLeft: number;
  scrollTop: number;
  canvasWidth: number;
  canvasHeight: number;
  zoomLevel: number;
  onNavigate: (left: number, top: number) => void;
}

/** Props của bảng thống kê sơ đồ (ghế theo hạng vé, khu vực, phần tử). */
export interface SeatMapStatsProps {
  seats: Seat[];
  tiers?: SeatTier[];
  zones?: Record<string, ZoneBlock>;
  stages?: StageElement[];
  structures?: StructureElement[];
  compact?: boolean;
}

/** Props của hộp thoại quản lý hạng vé. */
export interface TierManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tiers: SeatTier[];
  onSaveTiers?: (tiers: SeatTier[]) => void;
  readOnly?: boolean;
}

/** Props của hộp thoại chọn mẫu sơ đồ theo địa điểm. */
export interface VenueTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: VenueTemplate[];
  selectedTemplateId?: string;
  onSelectTemplate: (template: VenueTemplate) => void;
  venueId?: string;
  venueName?: string;
}

/** Props của hộp thoại tạo khu vực mới. */
export interface ZoneGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tiers?: SeatTier[];
  onGenerateZone: (
    config: AddZoneConfig | (string & any)
  ) => void;
}

/** Props của thành phần SeatMapCanvas cũ: ghế, phần tử tùy chỉnh, công cụ đang dùng và các callback thay đổi. */
export interface SeatMapCanvasProps {
  seats: Seat[];
  tiers?: SeatTier[];
  customElements?: CustomElement[];
  elements?: CustomElement[];
  zones?: ZoneBlock[] | Record<string, ZoneBlock>;
  selectedSeatIds?: string[];
  activeTool?: 'SELECT' | 'CHANGE_TIER' | 'SET_MAINTENANCE' | 'SET_RESERVE' | 'SET_BLOCK' | 'DRAG_ELEMENT';
  selectedTierId?: string;
  isAttendeeMode?: boolean;
  attendeeCart?: Seat[];
  onSeatClick?: (seat: Seat) => void;
  onUpdateElementPosition?: (id: string, x: number, y: number) => void;
  onDeleteElement?: (id: string) => void;
  onSelectRowSeats?: (rowName: string) => void;
  onSelectZoneSeats?: (zoneId: string) => void;
  onSeatsChange?: (seats: Seat[]) => void;
  onElementsChange?: (elements: CustomElement[]) => void;
  isEditable?: boolean;
}