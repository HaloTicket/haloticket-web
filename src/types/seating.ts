import type React from 'react';

export type SeatStatus =
  | 'available'
  | 'reserved'
  | 'sold'
  | 'blocked'
  | 'maintenance'
  | 'accessible';

export type SeatShape = 'circle' | 'square' | 'rounded';

export type ZoneShape =
  | 'rectangle'
  | 'rounded'
  | 'ellipse'
  | 'trapezoid'
  | 'trapezoid_reverse'
  | 'diamond'
  | 'fan'
  | 'polygon';

export type ElementShape = 'rectangle' | 'rounded' | 'ellipse' | 'trapezoid' | 'runway';

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
}

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
  curvature?: number; // 0-100 or corner radius / arc curvature
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

export interface CanvasSettings {
  width: number;
  height: number;
  gridSize: number;
  snapEnabled: boolean;
  showGrid: boolean;
  backgroundLabel?: string;
}

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

export interface HistoryState {
  seats: Seat[];
  stages: StageElement[];
  structures: StructureElement[];
  zones: Record<string, ZoneBlock>;
  canvasSettings?: CanvasSettings;
}

/** Compatibility model for the older SeatMapCanvas component. */
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

export interface AddRowConfig {
  rowLetter: string;
  count: number;
  zoneId: string;
  spacing?: number;
}

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

export interface AddArcConfig {
  rowLetter: string;
  count: number;
  radius: number;
  zoneId: string;
  spanDegrees?: number;
}

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

export interface AttendeePreviewProps {
  cart: Seat[];
  tiers?: SeatTier[];
  zones?: Record<string, ZoneBlock>;
  onRemoveCartSeat: (seatId: string) => void;
  onClearCart: () => void;
}

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

export interface SeatMapStatsProps {
  seats: Seat[];
  tiers?: SeatTier[];
  zones?: Record<string, ZoneBlock>;
  stages?: StageElement[];
  structures?: StructureElement[];
  compact?: boolean;
}

export interface TierManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tiers: SeatTier[];
  onSaveTiers?: (tiers: SeatTier[]) => void;
  readOnly?: boolean;
}

export interface VenueTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: VenueTemplate[];
  selectedTemplateId?: string;
  onSelectTemplate: (template: VenueTemplate) => void;
}

export interface ZoneGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tiers?: SeatTier[];
  onGenerateZone: (
    config: AddZoneConfig | (string & any)
  ) => void;
}

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